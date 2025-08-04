import { query } from '../config/database.js';
import { sendTemplateEmail } from './emailService.js';
import { EMAIL_TEMPLATES } from './emailTemplates.js';
import cron from 'node-cron';

// Weekly summary job - runs every Monday at 9:00 AM
export const weeklyProjectSummaryJob = cron.schedule('0 9 * * MON', async () => {
  console.log('[CRON] Starting weekly project summary job...');
  
  try {
    // Get all active clients who have weekly summaries enabled
    const clientsResult = await query(`
      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
      FROM users u
      JOIN projects p ON p.client_id = u.id
      LEFT JOIN user_email_preferences pref ON pref.user_id = u.id
      WHERE u.role = 'client'
      AND u.is_active = true
      AND p.status IN ('active', 'in_progress')
      AND (pref.weekly_summary = true OR pref.weekly_summary IS NULL)
    `);
    
    console.log(`[CRON] Found ${clientsResult.rows.length} clients to send weekly summaries to`);
    
    for (const client of clientsResult.rows) {
      try {
        // Get active projects for this client
        const projectsResult = await query(`
          SELECT 
            p.id,
            p.name,
            p.status,
            p.progress,
            pt.current_phase_index,
            ph.name as current_phase_name,
            ph.requires_client_action
          FROM projects p
          LEFT JOIN project_phase_tracking pt ON pt.project_id = p.id
          LEFT JOIN project_phases ph ON ph.id = pt.current_phase_id
          WHERE p.client_id = $1
          AND p.status IN ('active', 'in_progress')
        `, [client.id]);
        
        if (projectsResult.rows.length === 0) {
          continue;
        }
        
        // Get recent activity for all projects
        const activityResult = await query(`
          SELECT 
            al.action,
            al.entity_type,
            al.entity_id,
            al.description,
            al.created_at,
            p.name as project_name
          FROM activity_log al
          JOIN projects p ON 
            (al.entity_type = 'project' AND al.entity_id = p.id) OR
            (al.entity_type = 'phase' AND al.entity_id = p.id) OR
            (al.entity_type = 'file' AND al.entity_id IN (
              SELECT id FROM project_files WHERE project_id = p.id
            ))
          WHERE p.client_id = $1
          AND al.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY al.created_at DESC
          LIMIT 10
        `, [client.id]);
        
        // Get upcoming deadlines from projects
        const deadlinesResult = await query(`
          SELECT 
            p.name as project_name,
            p.due_date,
            EXTRACT(DAY FROM p.due_date - CURRENT_DATE) as days_until_deadline
          FROM projects p
          WHERE p.client_id = $1
          AND p.status IN ('active', 'in_progress')
          AND p.due_date IS NOT NULL
          AND p.due_date >= CURRENT_DATE
          AND p.due_date <= CURRENT_DATE + INTERVAL '14 days'
          ORDER BY p.due_date
          LIMIT 5
        `, [client.id]);
        
        // Calculate summary statistics
        const totalProjects = projectsResult.rows.length;
        const projectsNeedingAttention = projectsResult.rows.filter(p => p.requires_client_action).length;
        const completedThisWeek = activityResult.rows.filter(a => 
          a.action === 'phase_advanced' || (a.action === 'updated' && a.entity_type === 'project')
        ).length;
        
        // Prepare email data
        const clientName = `${client.first_name} ${client.last_name || ''}`.trim();
        
        await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WEEKLY_SUMMARY, {
          to: client.email,
          userId: client.id,
          clientName: clientName,
          weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          weekEndDate: new Date(),
          projects: projectsResult.rows.map(project => ({
            name: project.name,
            progress: project.progress || 0,
            currentPhase: project.current_phase_name,
            phaseIndex: project.current_phase_index,
            needsApproval: project.requires_client_action
          })),
          totalProjects: totalProjects,
          projectsNeedingAttention: projectsNeedingAttention,
          completedThisWeek: completedThisWeek,
          recentActivity: activityResult.rows.map(activity => ({
            description: activity.description,
            date: activity.created_at,
            projectName: activity.project_name
          })),
          upcomingDeadlines: deadlinesResult.rows.map(deadline => ({
            projectName: deadline.project_name,
            date: deadline.due_date,
            daysRemaining: deadline.days_until_deadline
          })),
          hasUpcomingDeadlines: deadlinesResult.rows.length > 0,
          hasRecentActivity: activityResult.rows.length > 0,
          portalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal`,
          context: 'summary',
          type: 'summary'
        });
        
        console.log(`[CRON] Sent weekly summary to ${client.email}`);
        
        // Log activity
        await query(
          `INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, description)
           VALUES (gen_random_uuid(), $1, 'email_sent', 'user', $2, $3)`,
          [
            null, // System action
            client.id,
            `Weekly project summary sent to ${client.email}`
          ]
        );
        
      } catch (error) {
        console.error(`[CRON] Error sending weekly summary to ${client.email}:`, error);
      }
    }
    
    console.log('[CRON] Weekly project summary job completed');
  } catch (error) {
    console.error('[CRON] Error in weekly project summary job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Invoice reminder job - runs daily at 10:00 AM
export const invoiceReminderJob = cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Starting invoice reminder job...');
  
  try {
    // Get invoices that are due soon (3 days) or overdue
    const invoicesResult = await query(`
      SELECT 
        i.*,
        u.email,
        u.first_name,
        u.last_name,
        EXTRACT(DAY FROM i.due_date - CURRENT_DATE) as days_until_due,
        EXTRACT(DAY FROM CURRENT_DATE - i.due_date) as days_overdue
      FROM invoices i
      JOIN users u ON u.id = i.client_id
      WHERE i.status IN ('sent', 'viewed')
      AND (
        (i.due_date = CURRENT_DATE + INTERVAL '3 days') OR -- 3 days before due
        (i.due_date = CURRENT_DATE) OR -- Due today
        (i.due_date < CURRENT_DATE AND MOD(EXTRACT(DAY FROM CURRENT_DATE - i.due_date)::integer, 7) = 0) -- Weekly for overdue
      )
    `);
    
    console.log(`[CRON] Found ${invoicesResult.rows.length} invoices to send reminders for`);
    
    for (const invoice of invoicesResult.rows) {
      try {
        const clientName = `${invoice.first_name} ${invoice.last_name || ''}`.trim();
        
        if (invoice.days_overdue > 0) {
          // Send overdue notice
          await sendTemplateEmail(EMAIL_TEMPLATES.INVOICE_OVERDUE, {
            to: invoice.email,
            userId: invoice.client_id,
            clientName: clientName,
            invoiceNumber: invoice.invoice_number,
            projectName: invoice.title,
            dueDate: invoice.due_date,
            daysOverdue: invoice.days_overdue,
            amountDue: invoice.total_amount,
            lateFee: invoice.days_overdue > 30 ? invoice.total_amount * 0.015 : 0, // 1.5% after 30 days
            paymentUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}`,
            context: 'invoice',
            type: 'invoice'
          });
          
          console.log(`[CRON] Sent overdue notice for invoice ${invoice.invoice_number} to ${invoice.email}`);
        } else {
          // Send reminder
          await sendTemplateEmail(EMAIL_TEMPLATES.INVOICE_REMINDER, {
            to: invoice.email,
            userId: invoice.client_id,
            clientName: clientName,
            invoiceNumber: invoice.invoice_number,
            projectName: invoice.title,
            dueDate: invoice.due_date,
            daysUntilDue: invoice.days_until_due,
            amountDue: invoice.total_amount,
            paymentUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}`,
            isLastReminder: invoice.days_until_due === 0,
            context: 'invoice',
            type: 'invoice'
          });
          
          console.log(`[CRON] Sent reminder for invoice ${invoice.invoice_number} to ${invoice.email}`);
        }
        
        // Log activity
        await query(
          `INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, description)
           VALUES (gen_random_uuid(), $1, 'reminder_sent', 'invoice', $2, $3)`,
          [
            null, // System action
            invoice.id,
            invoice.days_overdue > 0 
              ? `Overdue notice sent for invoice ${invoice.invoice_number}`
              : `Reminder sent for invoice ${invoice.invoice_number}`
          ]
        );
        
      } catch (error) {
        console.error(`[CRON] Error sending invoice reminder for ${invoice.invoice_number}:`, error);
      }
    }
    
    console.log('[CRON] Invoice reminder job completed');
  } catch (error) {
    console.error('[CRON] Error in invoice reminder job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Project deadline reminder job - runs daily at 9:30 AM
export const projectDeadlineReminderJob = cron.schedule('30 9 * * *', async () => {
  console.log('[CRON] Starting project deadline reminder job...');
  
  try {
    // Get projects with upcoming deadlines
    const projectsResult = await query(`
      SELECT 
        p.*,
        pt.current_phase_index,
        ph.name as current_phase_name,
        ph.requires_client_action,
        u.email,
        u.first_name,
        u.last_name,
        EXTRACT(DAY FROM p.due_date - CURRENT_DATE) as days_until_deadline
      FROM projects p
      JOIN users u ON u.id = p.client_id
      LEFT JOIN project_phase_tracking pt ON pt.project_id = p.id
      LEFT JOIN project_phases ph ON ph.id = pt.current_phase_id
      LEFT JOIN user_email_preferences pref ON pref.user_id = u.id
      WHERE p.status IN ('active', 'in_progress')
      AND p.due_date IS NOT NULL
      AND p.due_date > CURRENT_DATE
      AND p.due_date <= CURRENT_DATE + INTERVAL '7 days'
      AND (
        (p.due_date = CURRENT_DATE + INTERVAL '7 days') OR -- 1 week before
        (p.due_date = CURRENT_DATE + INTERVAL '3 days') OR -- 3 days before
        (p.due_date = CURRENT_DATE + INTERVAL '1 day')     -- 1 day before
      )
      AND (pref.deadline_reminders = true OR pref.deadline_reminders IS NULL)
    `);
    
    console.log(`[CRON] Found ${projectsResult.rows.length} projects with upcoming deadlines`);
    
    for (const project of projectsResult.rows) {
      try {
        const clientName = `${project.first_name} ${project.last_name || ''}`.trim();
        
        // Check if there are any pending actions
        const actionRequired = project.requires_client_action;
        const requiredActions = [];
        
        if (actionRequired) {
          requiredActions.push('Review and approve the current phase deliverables');
        }
        
        await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_DEADLINE_REMINDER, {
          to: project.email,
          userId: project.client_id,
          clientName: clientName,
          projectName: project.name,
          currentPhase: project.current_phase_name || 'In Progress',
          deadline: project.due_date,
          daysRemaining: project.days_until_deadline,
          actionRequired: actionRequired,
          requiredActions: requiredActions,
          awaitingApproval: project.requires_client_action,
          projectProgress: project.progress || 0,
          upcomingMilestones: [],
          projectUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal/projects/${project.id}`,
          context: 'project',
          type: 'reminder'
        });
        
        console.log(`[CRON] Sent deadline reminder for ${project.name} to ${project.email}`);
        
        // Log activity
        await query(
          `INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, description)
           VALUES (gen_random_uuid(), $1, 'reminder_sent', 'project', $2, $3)`,
          [
            null, // System action
            project.id,
            `Deadline reminder sent for project "${project.name}" (${project.days_until_deadline} days remaining)`
          ]
        );
        
      } catch (error) {
        console.error(`[CRON] Error sending deadline reminder for project ${project.id}:`, error);
      }
    }
    
    console.log('[CRON] Project deadline reminder job completed');
  } catch (error) {
    console.error('[CRON] Error in project deadline reminder job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Start all cron jobs
export function startCronJobs() {
  console.log('[CRON] Starting all cron jobs...');
  
  weeklyProjectSummaryJob.start();
  invoiceReminderJob.start();
  projectDeadlineReminderJob.start();
  
  console.log('[CRON] All cron jobs started');
}

// Stop all cron jobs
export function stopCronJobs() {
  console.log('[CRON] Stopping all cron jobs...');
  
  weeklyProjectSummaryJob.stop();
  invoiceReminderJob.stop();
  projectDeadlineReminderJob.stop();
  
  console.log('[CRON] All cron jobs stopped');
}

// Export individual jobs for testing
export default {
  startCronJobs,
  stopCronJobs,
  weeklyProjectSummaryJob,
  invoiceReminderJob,
  projectDeadlineReminderJob
};