/**
 * Phase Automation Service for [RE]Print Studios
 * Handles automatic phase transitions and notifications
 */

import { query as dbQuery } from '../config/database.js';
import { sendPhaseNotificationEmail } from './emailService.js';
import { createNotification } from './notificationService.js';

export class PhaseAutomationService {
  constructor(io = null) {
    this.io = io; // Socket.io instance for real-time updates
    this.automationRules = new Map();
    this.checkInterval = 60000; // Check every minute
    this.intervalId = null;
  }

  /**
   * Start the automation service
   */
  async start() {
    console.log('Starting Phase Automation Service...');
    
    // Load automation rules
    await this.loadAutomationRules();
    
    // Start periodic checks
    this.intervalId = setInterval(() => {
      this.runAutomationChecks();
    }, this.checkInterval);
    
    // Run initial check
    await this.runAutomationChecks();
  }

  /**
   * Stop the automation service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Phase Automation Service stopped');
  }

  /**
   * Load automation rules from database
   */
  async loadAutomationRules() {
    try {
      const result = await dbQuery(`
        SELECT 
          id,
          rule_name,
          trigger_condition,
          action_type,
          action_config,
          is_active
        FROM phase_automation_rules
        WHERE is_active = true
      `);
      
      this.automationRules.clear();
      result.rows.forEach(rule => {
        this.automationRules.set(rule.id, rule);
      });
      
      console.log(`Loaded ${this.automationRules.size} automation rules`);
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  }

  /**
   * Run automation checks for all projects
   */
  async runAutomationChecks() {
    try {
      // Check for projects that need auto-advancement
      await this.checkAutoAdvance();
      
      // Check for stuck projects
      await this.checkStuckProjects();
      
      // Check for payment completions
      await this.checkPaymentCompletions();
      
      // Check for overdue actions
      await this.checkOverdueActions();
    } catch (error) {
      console.error('Error in automation checks:', error);
    }
  }

  /**
   * Check for projects ready to auto-advance
   */
  async checkAutoAdvance() {
    try {
      // Get projects with their current phase tracking
      const result = await dbQuery(`
        SELECT DISTINCT
          p.id as project_id,
          p.name as project_name,
          p.client_id,
          pt.id as tracking_id,
          pt.phase_number,
          pt.phase_name,
          pt.status,
          pt.started_at,
          COALESCE(
            (SELECT COUNT(*) 
             FROM client_actions ca 
             WHERE ca.project_id = p.id 
               AND ca.phase_id = pt.id
               AND ca.status != 'completed'
               AND ca.is_required = true), 
            0
          ) as pending_required_actions
        FROM projects p
        JOIN project_phase_tracking pt ON pt.project_id = p.id
        WHERE pt.status IN ('in_progress', 'waiting_client')
          AND pt.completed_at IS NULL
        ORDER BY p.id, pt.phase_number DESC
      `);
      
      // Group by project to get latest phase
      const projectPhases = new Map();
      for (const row of result.rows) {
        if (!projectPhases.has(row.project_id) || 
            projectPhases.get(row.project_id).phase_number < row.phase_number) {
          projectPhases.set(row.project_id, row);
        }
      }
      
      // Check each project for auto-advance conditions
      for (const project of projectPhases.values()) {
        if (project.pending_required_actions === 0 && project.phase_number < 8) {
          await this.advanceProjectPhase(
            project.project_id, 
            project.phase_number + 1,
            'Automated: All required actions completed'
          );
        }
      }
    } catch (error) {
      console.error('Error checking auto-advance:', error);
    }
  }

  /**
   * Check for stuck projects
   */
  async checkStuckProjects() {
    try {
      const stuckThreshold = 7; // Days
      
      const result = await dbQuery(`
        SELECT DISTINCT ON (p.id)
          p.id as project_id,
          p.name as project_name,
          p.client_id,
          pt.phase_number,
          pt.phase_name,
          pt.started_at,
          u.email as client_email,
          u.first_name as client_name,
          EXTRACT(DAY FROM NOW() - pt.started_at) as days_in_phase
        FROM projects p
        JOIN project_phase_tracking pt ON pt.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON u.client_id = c.id AND u.role = 'client'
        WHERE pt.status IN ('in_progress', 'waiting_client')
          AND pt.completed_at IS NULL
          AND pt.started_at < NOW() - INTERVAL '${stuckThreshold} days'
          AND pt.phase_number < 8
        ORDER BY p.id, pt.phase_number DESC
      `);
      
      for (const project of result.rows) {
        // Check if we've already notified recently
        const notificationKey = `stuck-${project.project_id}-${project.phase_number}`;
        const recentNotification = await this.hasRecentNotification(notificationKey, 3); // 3 days
        
        if (!recentNotification) {
          await this.sendStuckProjectNotification(project);
          await this.recordNotification(notificationKey);
        }
      }
    } catch (error) {
      console.error('Error checking stuck projects:', error);
    }
  }

  /**
   * Check for payment completions
   */
  async checkPaymentCompletions() {
    try {
      const result = await dbQuery(`
        SELECT DISTINCT
          p.id as project_id,
          p.name as project_name,
          p.client_id,
          pt.phase_number,
          i.id as invoice_id,
          i.invoice_number
        FROM projects p
        JOIN project_phase_tracking pt ON pt.project_id = p.id
        JOIN invoices i ON i.project_id = p.id
        WHERE pt.phase_number = 6  -- Payment phase
          AND pt.status IN ('in_progress', 'waiting_client')
          AND pt.completed_at IS NULL
          AND i.status = 'paid'
          AND i.paid_date > pt.started_at
      `);
      
      for (const project of result.rows) {
        // Auto-advance to sign-off phase
        await this.advanceProjectPhase(
          project.project_id,
          7, // Sign-off & Docs phase
          `Automated: Payment received for invoice ${project.invoice_number}`
        );
      }
    } catch (error) {
      console.error('Error checking payment completions:', error);
    }
  }

  /**
   * Check for overdue actions
   */
  async checkOverdueActions() {
    try {
      const reminderThreshold = 3; // Days
      
      const result = await dbQuery(`
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.client_id,
          pt.phase_number,
          pt.phase_name,
          pt.started_at,
          u.email as client_email,
          u.first_name as client_name,
          COUNT(ca.id) as pending_actions
        FROM projects p
        JOIN project_phase_tracking pt ON pt.project_id = p.id
        JOIN client_actions ca ON ca.project_id = p.id AND ca.phase_id = pt.id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON u.client_id = c.id AND u.role = 'client'
        WHERE pt.status IN ('waiting_client', 'needs_approval')
          AND pt.completed_at IS NULL
          AND ca.status != 'completed'
          AND ca.is_required = true
          AND pt.started_at < NOW() - INTERVAL '${reminderThreshold} days'
        GROUP BY p.id, p.name, p.client_id, pt.phase_number, 
                 pt.phase_name, pt.started_at, u.email, u.first_name
        HAVING COUNT(ca.id) > 0
      `);
      
      for (const project of result.rows) {
        // Check if we've already sent a reminder recently
        const notificationKey = `overdue-${project.project_id}-${project.phase_number}`;
        const recentNotification = await this.hasRecentNotification(notificationKey, 2); // 2 days
        
        if (!recentNotification) {
          await this.sendOverdueActionReminder(project);
          await this.recordNotification(notificationKey);
        }
      }
    } catch (error) {
      console.error('Error checking overdue actions:', error);
    }
  }

  /**
   * Advance project to next phase
   */
  async advanceProjectPhase(projectId, nextPhaseNumber, reason) {
    try {
      // Check if next phase tracking already exists
      const existing = await dbQuery(
        `SELECT id FROM project_phase_tracking 
         WHERE project_id = $1 AND phase_number = $2`,
        [projectId, nextPhaseNumber]
      );

      if (existing.rows.length > 0) {
        // Update existing phase tracking
        await dbQuery(
          `UPDATE project_phase_tracking 
           SET status = 'in_progress', 
               started_at = NOW(),
               notes = $3,
               updated_at = NOW()
           WHERE project_id = $1 AND phase_number = $2`,
          [projectId, nextPhaseNumber, reason]
        );
      } else {
        // Get phase name from our phase definitions
        const phaseNames = [
          'Onboarding',
          'Ideation',
          'Design',
          'Review & Feedback',
          'Production/Print',
          'Payment',
          'Sign-off & Docs',
          'Delivery'
        ];
        
        // Create new phase tracking
        await dbQuery(
          `INSERT INTO project_phase_tracking 
           (project_id, phase_number, phase_name, status, started_at, notes)
           VALUES ($1, $2, $3, 'in_progress', NOW(), $4)`,
          [projectId, nextPhaseNumber, phaseNames[nextPhaseNumber - 1], reason]
        );
      }

      // Complete previous phase
      await dbQuery(
        `UPDATE project_phase_tracking 
         SET status = 'completed', 
             completed_at = NOW(),
             updated_at = NOW()
         WHERE project_id = $1 AND phase_number = $2`,
        [projectId, nextPhaseNumber - 1]
      );

      // Update project progress
      const progressPercentage = Math.round((nextPhaseNumber / 8) * 100);
      await dbQuery(
        `UPDATE projects 
         SET progress_percentage = $2, updated_at = NOW()
         WHERE id = $1`,
        [projectId, progressPercentage]
      );

      // Send notification
      await this.sendPhaseAdvancementNotification(projectId, nextPhaseNumber);
      
      // Emit socket event
      if (this.io) {
        this.io.to(`project-${projectId}`).emit('phase-advanced', {
          projectId,
          phaseNumber: nextPhaseNumber,
          reason
        });
      }

      console.log(`Advanced project ${projectId} to phase ${nextPhaseNumber}: ${reason}`);
    } catch (error) {
      console.error('Error advancing project phase:', error);
    }
  }

  /**
   * Check if notification was sent recently
   */
  async hasRecentNotification(notificationKey, daysThreshold) {
    try {
      const result = await dbQuery(
        `SELECT created_at 
         FROM automation_notifications 
         WHERE notification_key = $1 
           AND created_at > NOW() - INTERVAL '${daysThreshold} days'`,
        [notificationKey]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking recent notification:', error);
      return false;
    }
  }

  /**
   * Record that a notification was sent
   */
  async recordNotification(notificationKey) {
    try {
      await dbQuery(
        `INSERT INTO automation_notifications (notification_key) 
         VALUES ($1) 
         ON CONFLICT (notification_key) 
         DO UPDATE SET created_at = NOW()`,
        [notificationKey]
      );
    } catch (error) {
      console.error('Error recording notification:', error);
    }
  }

  /**
   * Send stuck project notification
   */
  async sendStuckProjectNotification(project) {
    try {
      const message = `Project "${project.project_name}" has been in the ${project.phase_name} phase for ${project.days_in_phase} days.`;
      
      // Create in-app notification
      await createNotification({
        recipientId: project.client_id,
        type: 'phase_stuck',
        title: 'Project Update Needed',
        message,
        projectId: project.project_id,
        priority: 'high'
      });

      // Send email
      if (project.client_email) {
        await sendPhaseNotificationEmail(
          project.client_email,
          project.client_name,
          project.project_name,
          'stuck',
          { phaseName: project.phase_name, daysInPhase: project.days_in_phase }
        );
      }

      console.log(`Sent stuck project notification for project ${project.project_id}`);
    } catch (error) {
      console.error('Error sending stuck project notification:', error);
    }
  }

  /**
   * Send overdue action reminder
   */
  async sendOverdueActionReminder(project) {
    try {
      const message = `You have ${project.pending_actions} pending action(s) for project "${project.project_name}" in the ${project.phase_name} phase.`;
      
      // Create in-app notification
      await createNotification({
        recipientId: project.client_id,
        type: 'actions_overdue',
        title: 'Action Required',
        message,
        projectId: project.project_id,
        priority: 'high'
      });

      // Send email
      if (project.client_email) {
        await sendPhaseNotificationEmail(
          project.client_email,
          project.client_name,
          project.project_name,
          'reminder',
          { 
            phaseName: project.phase_name, 
            pendingActions: project.pending_actions 
          }
        );
      }

      console.log(`Sent overdue action reminder for project ${project.project_id}`);
    } catch (error) {
      console.error('Error sending overdue action reminder:', error);
    }
  }

  /**
   * Send phase advancement notification
   */
  async sendPhaseAdvancementNotification(projectId, phaseNumber) {
    try {
      const phaseNames = [
        'Onboarding',
        'Ideation',
        'Design',
        'Review & Feedback',
        'Production/Print',
        'Payment',
        'Sign-off & Docs',
        'Delivery'
      ];

      const result = await dbQuery(
        `SELECT p.name as project_name, p.client_id,
                u.email as client_email, u.first_name as client_name
         FROM projects p
         JOIN clients c ON p.client_id = c.id
         JOIN users u ON u.client_id = c.id AND u.role = 'client'
         WHERE p.id = $1
         LIMIT 1`,
        [projectId]
      );

      if (result.rows.length === 0) return;

      const project = result.rows[0];
      const phaseName = phaseNames[phaseNumber - 1];
      const message = `Project "${project.project_name}" has advanced to the ${phaseName} phase.`;

      // Create in-app notification
      await createNotification({
        recipientId: project.client_id,
        type: 'phase_advanced',
        title: 'Project Phase Updated',
        message,
        projectId,
        priority: 'medium'
      });

      // Send email
      if (project.client_email) {
        await sendPhaseNotificationEmail(
          project.client_email,
          project.client_name,
          project.project_name,
          'advancement',
          { newPhase: phaseName }
        );
      }

      console.log(`Sent phase advancement notification for project ${projectId}`);
    } catch (error) {
      console.error('Error sending phase advancement notification:', error);
    }
  }

  /**
   * Find matching automation rule
   */
  findMatchingRule(ruleKey) {
    for (const rule of this.automationRules.values()) {
      if (rule.trigger_condition?.ruleKey === ruleKey) {
        return rule;
      }
    }
    return null;
  }
}

// Export singleton instance
const phaseAutomationService = new PhaseAutomationService();
export default phaseAutomationService;