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
          ar.*,
          fp.phase_key AS from_phase_key,
          tp.phase_key AS to_phase_key
        FROM phase_automation_rules ar
        LEFT JOIN project_phases fp ON ar.from_phase_id = fp.id
        JOIN project_phases tp ON ar.to_phase_id = tp.id
        WHERE ar.is_active = true
      `);
      
      this.automationRules.clear();
      result.rows.forEach(rule => {
        const key = `${rule.from_phase_key || 'any'}->${rule.to_phase_key}`;
        this.automationRules.set(key, rule);
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
      // Get projects with completed actions
      const result = await dbQuery(`
        SELECT DISTINCT
          pt.project_id,
          pt.current_phase_id,
          pp.phase_key,
          pp.name AS phase_name,
          p.name AS project_name,
          p.client_id
        FROM project_phase_tracking pt
        JOIN project_phases pp ON pt.current_phase_id = pp.id
        JOIN projects p ON pt.project_id = p.id
        WHERE pt.is_completed = false
          AND pp.requires_client_action = true
          AND NOT EXISTS (
            SELECT 1 
            FROM phase_client_actions pca
            LEFT JOIN project_phase_action_status pas 
              ON pca.id = pas.action_id 
              AND pas.project_id = pt.project_id
            WHERE pca.phase_id = pt.current_phase_id
              AND pca.is_required = true
              AND (pas.is_completed IS NULL OR pas.is_completed = false)
          )
      `);
      
      for (const project of result.rows) {
        const ruleKey = `${project.phase_key}->*`;
        const rule = this.findMatchingRule(ruleKey);
        
        if (rule && rule.rule_config?.auto_advance) {
          await this.advanceProjectPhase(project.project_id, 'Automated: All required actions completed');
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
        SELECT 
          pt.project_id,
          pt.phase_started_at,
          pp.phase_key,
          pp.name AS phase_name,
          p.name AS project_name,
          p.client_id,
          u.email AS client_email,
          u.first_name AS client_name,
          EXTRACT(DAY FROM NOW() - pt.phase_started_at) AS days_in_phase
        FROM project_phase_tracking pt
        JOIN project_phases pp ON pt.current_phase_id = pp.id
        JOIN projects p ON pt.project_id = p.id
        JOIN users u ON p.client_id = u.id
        WHERE pt.is_completed = false
          AND pt.phase_started_at < NOW() - INTERVAL '${stuckThreshold} days'
          AND pp.phase_key NOT IN ('delivery') -- Don't notify for final phase
      `);
      
      for (const project of result.rows) {
        // Check if we've already notified recently
        const notificationKey = `stuck-${project.project_id}-${project.phase_key}`;
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
        SELECT 
          pt.project_id,
          i.id AS invoice_id,
          i.invoice_number,
          p.name AS project_name,
          p.client_id
        FROM project_phase_tracking pt
        JOIN project_phases pp ON pt.current_phase_id = pp.id
        JOIN projects p ON pt.project_id = p.id
        JOIN invoices i ON i.project_id = p.id
        WHERE pt.is_completed = false
          AND pp.phase_key = 'payment'
          AND i.status = 'paid'
          AND i.paid_date > pt.phase_started_at
      `);
      
      for (const project of result.rows) {
        // Auto-advance to sign-off phase
        await this.advanceProjectPhase(project.project_id, 
          `Automated: Payment received for invoice ${project.invoice_number}`);
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
          pt.project_id,
          pt.phase_started_at,
          pp.phase_key,
          pp.name AS phase_name,
          p.name AS project_name,
          p.client_id,
          u.email AS client_email,
          u.first_name AS client_name,
          COUNT(pca.id) AS pending_actions
        FROM project_phase_tracking pt
        JOIN project_phases pp ON pt.current_phase_id = pp.id
        JOIN projects p ON pt.project_id = p.id
        JOIN users u ON p.client_id = u.id
        JOIN phase_client_actions pca ON pca.phase_id = pp.id
        LEFT JOIN project_phase_action_status pas 
          ON pca.id = pas.action_id 
          AND pas.project_id = pt.project_id
        WHERE pt.is_completed = false
          AND pp.requires_client_action = true
          AND pca.is_required = true
          AND (pas.is_completed IS NULL OR pas.is_completed = false)
          AND pt.phase_started_at < NOW() - INTERVAL '${reminderThreshold} days'
        GROUP BY pt.project_id, pt.phase_started_at, pp.phase_key, pp.name, 
                 p.name, p.client_id, u.email, u.first_name
      `);
      
      for (const project of result.rows) {
        const notificationKey = `action-reminder-${project.project_id}-${project.phase_key}`;
        const recentNotification = await this.hasRecentNotification(notificationKey, 2); // 2 days
        
        if (!recentNotification) {
          await this.sendActionReminderNotification(project);
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
  async advanceProjectPhase(projectId, reason) {
    try {
      // Get system user ID for automation
      const systemUserId = await this.getSystemUserId();
      
      // Call the database function to advance phase
      const result = await dbQuery(
        'SELECT advance_project_phase($1, $2, $3) AS success',
        [projectId, systemUserId, reason]
      );
      
      if (result.rows[0].success) {
        // Get updated phase info
        const phaseResult = await dbQuery(`
          SELECT 
            pt.*,
            pp.phase_key,
            pp.name AS phase_name,
            pp.icon AS phase_icon,
            p.name AS project_name,
            p.client_id
          FROM project_phase_tracking pt
          JOIN project_phases pp ON pt.current_phase_id = pp.id
          JOIN projects p ON pt.project_id = p.id
          WHERE pt.project_id = $1
        `, [projectId]);
        
        if (phaseResult.rows.length > 0) {
          const phaseData = phaseResult.rows[0];
          
          // Send real-time update
          if (this.io) {
            this.io.to(`user-${phaseData.client_id}`).emit('phase:updated', {
              projectId,
              newPhase: phaseData.phase_key,
              phaseName: phaseData.phase_name,
              phaseIcon: phaseData.phase_icon
            });
          }
          
          // Create notification
          await createNotification({
            user_id: phaseData.client_id,
            type: 'phase_advanced',
            title: 'Project Phase Updated',
            message: `Your project "${phaseData.project_name}" has moved to the ${phaseData.phase_name} phase.`,
            link: `/portal#projects`,
            metadata: {
              project_id: projectId,
              phase_key: phaseData.phase_key
            }
          });
          
          // Send email notification
          await this.sendPhaseAdvancedNotification(phaseData);
        }
      }
    } catch (error) {
      console.error('Error advancing project phase:', error);
    }
  }

  /**
   * Send stuck project notification
   */
  async sendStuckProjectNotification(project) {
    try {
      // Create in-app notification
      await createNotification({
        user_id: project.client_id,
        type: 'project_stuck',
        title: 'Action Required on Your Project',
        message: `Your project "${project.project_name}" has been in the ${project.phase_name} phase for ${project.days_in_phase} days. Please check if any action is needed.`,
        link: `/portal#projects`,
        metadata: {
          project_id: project.project_id,
          phase_key: project.phase_key,
          days_in_phase: project.days_in_phase
        }
      });
      
      // Send email
      await sendPhaseNotificationEmail('stuck_project', {
        to: project.client_email,
        clientName: project.client_name,
        projectName: project.project_name,
        phaseName: project.phase_name,
        daysInPhase: project.days_in_phase,
        portalLink: `${process.env.FRONTEND_URL}/portal#projects`
      });
    } catch (error) {
      console.error('Error sending stuck project notification:', error);
    }
  }

  /**
   * Send action reminder notification
   */
  async sendActionReminderNotification(project) {
    try {
      // Create in-app notification
      await createNotification({
        user_id: project.client_id,
        type: 'action_reminder',
        title: 'Pending Actions on Your Project',
        message: `You have ${project.pending_actions} pending action(s) for "${project.project_name}" in the ${project.phase_name} phase.`,
        link: `/portal#projects`,
        metadata: {
          project_id: project.project_id,
          phase_key: project.phase_key,
          pending_actions: project.pending_actions
        }
      });
      
      // Send email
      await sendPhaseNotificationEmail('action_reminder', {
        to: project.client_email,
        clientName: project.client_name,
        projectName: project.project_name,
        phaseName: project.phase_name,
        pendingActions: project.pending_actions,
        portalLink: `${process.env.FRONTEND_URL}/portal#projects`
      });
    } catch (error) {
      console.error('Error sending action reminder notification:', error);
    }
  }

  /**
   * Send phase advanced notification
   */
  async sendPhaseAdvancedNotification(phaseData) {
    try {
      // Get client info
      const clientResult = await dbQuery(
        'SELECT email, first_name FROM users WHERE id = $1',
        [phaseData.client_id]
      );
      
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        
        await sendPhaseNotificationEmail('phase_advanced', {
          to: client.email,
          clientName: client.first_name,
          projectName: phaseData.project_name,
          newPhaseName: phaseData.phase_name,
          phaseIcon: phaseData.phase_icon,
          portalLink: `${process.env.FRONTEND_URL}/portal#projects`
        });
      }
    } catch (error) {
      console.error('Error sending phase advanced notification:', error);
    }
  }

  /**
   * Helper functions
   */
  
  findMatchingRule(key) {
    // Direct match
    if (this.automationRules.has(key)) {
      return this.automationRules.get(key);
    }
    
    // Wildcard match (any->phase)
    const wildcardKey = key.replace(/^[^-]+/, 'any');
    return this.automationRules.get(wildcardKey);
  }

  async getSystemUserId() {
    const result = await dbQuery(
      "SELECT id FROM users WHERE email = 'system@reprintstudios.com' LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      // Create system user if it doesn't exist
      const createResult = await dbQuery(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ('system@reprintstudios.com', 'no-login', 'System', 'Automation', 'admin', false)
        RETURNING id
      `);
      return createResult.rows[0].id;
    }
    
    return result.rows[0].id;
  }

  async hasRecentNotification(key, dayThreshold) {
    const result = await dbQuery(`
      SELECT COUNT(*) AS count
      FROM automation_notifications
      WHERE notification_key = $1
        AND created_at > NOW() - INTERVAL '${dayThreshold} days'
    `, [key]);
    
    return result.rows[0].count > 0;
  }

  async recordNotification(key) {
    await dbQuery(`
      INSERT INTO automation_notifications (notification_key, created_at)
      VALUES ($1, NOW())
      ON CONFLICT (notification_key) 
      DO UPDATE SET created_at = NOW()
    `, [key]);
  }
}

// Create notification tracking table if it doesn't exist
export async function createAutomationTables() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS automation_notifications (
        notification_key VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Automation tables created successfully');
  } catch (error) {
    console.error('Error creating automation tables:', error);
  }
}

export default PhaseAutomationService;