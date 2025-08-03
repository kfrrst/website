import { query } from '../config/database.js';
import { sendOverdueReminderEmail } from './emailService.js';
import { logInvoiceActivity } from './invoiceHelpers.js';

/**
 * Overdue Invoice Checker
 * Utility to check for overdue invoices and send reminders
 */

/**
 * Check for overdue invoices and update their status
 */
export const checkOverdueInvoices = async () => {
  try {
    console.log('🔍 Checking for overdue invoices...');
    
    // Find invoices that should be marked as overdue
    const overdueResult = await query(
      `SELECT 
        i.*,
        u.first_name, u.last_name, u.email, u.company_name
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      WHERE i.status = 'sent' 
        AND i.due_date < CURRENT_DATE
      ORDER BY i.due_date ASC`,
      []
    );
    
    if (overdueResult.rows.length === 0) {
      console.log('✅ No overdue invoices found');
      return { updated: 0, reminders_sent: 0 };
    }
    
    console.log(`📋 Found ${overdueResult.rows.length} overdue invoices`);
    
    let updated = 0;
    let remindersSent = 0;
    
    for (const invoice of overdueResult.rows) {
      try {
        // Update invoice status to overdue
        await query(
          'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['overdue', invoice.id]
        );
        
        updated++;
        
        // Log activity
        await logInvoiceActivity(
          null, // System action
          invoice.id,
          'status_changed',
          `Invoice ${invoice.invoice_number} marked as overdue`,
          { 
            previous_status: 'sent',
            new_status: 'overdue',
            days_overdue: Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))
          }
        );
        
        // Send overdue reminder email
        try {
          await sendOverdueReminderEmail(invoice, invoice);
          remindersSent++;
          console.log(`📧 Overdue reminder sent for invoice ${invoice.invoice_number}`);
        } catch (emailError) {
          console.error(`❌ Failed to send overdue reminder for invoice ${invoice.invoice_number}:`, emailError.message);
        }
        
      } catch (error) {
        console.error(`❌ Error processing overdue invoice ${invoice.invoice_number}:`, error.message);
      }
    }
    
    console.log(`✅ Updated ${updated} invoices, sent ${remindersSent} reminder emails`);
    
    return {
      updated,
      reminders_sent: remindersSent,
      total_checked: overdueResult.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error checking overdue invoices:', error);
    throw error;
  }
};

/**
 * Send reminder emails for invoices that are X days overdue
 */
export const sendOverdueReminders = async (daysOverdue = 7) => {
  try {
    console.log(`🔍 Checking for invoices ${daysOverdue} days overdue...`);
    
    const reminderResult = await query(
      `SELECT 
        i.*,
        u.first_name, u.last_name, u.email, u.company_name
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      WHERE i.status = 'overdue' 
        AND i.due_date = CURRENT_DATE - INTERVAL '${daysOverdue} days'
      ORDER BY i.due_date ASC`,
      []
    );
    
    if (reminderResult.rows.length === 0) {
      console.log(`✅ No invoices found that are exactly ${daysOverdue} days overdue`);
      return { reminders_sent: 0 };
    }
    
    console.log(`📋 Found ${reminderResult.rows.length} invoices ${daysOverdue} days overdue`);
    
    let remindersSent = 0;
    
    for (const invoice of reminderResult.rows) {
      try {
        await sendOverdueReminderEmail(invoice, invoice);
        remindersSent++;
        
        // Log activity
        await logInvoiceActivity(
          null, // System action
          invoice.id,
          'reminder_sent',
          `Overdue reminder sent for invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`,
          { 
            days_overdue: daysOverdue,
            client_email: invoice.email
          }
        );
        
        console.log(`📧 Overdue reminder sent for invoice ${invoice.invoice_number} (${daysOverdue} days overdue)`);
        
      } catch (error) {
        console.error(`❌ Failed to send reminder for invoice ${invoice.invoice_number}:`, error.message);
      }
    }
    
    console.log(`✅ Sent ${remindersSent} overdue reminder emails`);
    
    return {
      reminders_sent: remindersSent,
      total_checked: reminderResult.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error sending overdue reminders:', error);
    throw error;
  }
};

/**
 * Get overdue invoice statistics
 */
export const getOverdueStats = async () => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_overdue,
        SUM(total_amount) as total_overdue_amount,
        AVG(CURRENT_DATE - due_date) as avg_days_overdue,
        MAX(CURRENT_DATE - due_date) as max_days_overdue
      FROM invoices
      WHERE status = 'overdue'`,
      []
    );
    
    return {
      total_overdue: parseInt(result.rows[0].total_overdue),
      total_overdue_amount: parseFloat(result.rows[0].total_overdue_amount) || 0,
      avg_days_overdue: parseFloat(result.rows[0].avg_days_overdue) || 0,
      max_days_overdue: parseInt(result.rows[0].max_days_overdue) || 0
    };
    
  } catch (error) {
    console.error('❌ Error getting overdue stats:', error);
    throw error;
  }
};

/**
 * Run daily overdue check (can be called from a cron job)
 */
export const dailyOverdueCheck = async () => {
  console.log('🏃‍♂️ Running daily overdue invoice check...');
  
  try {
    // Check and update overdue invoices
    const overdueResults = await checkOverdueInvoices();
    
    // Send reminders for invoices 7 days overdue
    const reminderResults = await sendOverdueReminders(7);
    
    // Send additional reminders for invoices 30 days overdue
    const urgentReminderResults = await sendOverdueReminders(30);
    
    // Get current stats
    const stats = await getOverdueStats();
    
    const summary = {
      timestamp: new Date().toISOString(),
      overdue_updates: overdueResults,
      reminder_7_days: reminderResults,
      reminder_30_days: urgentReminderResults,
      current_stats: stats
    };
    
    console.log('✅ Daily overdue check completed:', summary);
    
    return summary;
    
  } catch (error) {
    console.error('❌ Daily overdue check failed:', error);
    throw error;
  }
};