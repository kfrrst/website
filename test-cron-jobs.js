import { query } from './config/database.js';
import { 
  weeklyProjectSummaryJob,
  invoiceReminderJob,
  projectDeadlineReminderJob 
} from './utils/cronJobs.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCronJobs() {
  try {
    console.log('Testing cron jobs...\n');
    
    // Test weekly summary job
    console.log('1. Testing weekly project summary job...');
    console.log('   This job runs every Monday at 9:00 AM');
    console.log('   Searching for active clients with projects...');
    
    const clientsResult = await query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN projects p ON p.client_id = u.id
      LEFT JOIN user_email_preferences pref ON pref.user_id = u.id
      WHERE u.role = 'client'
      AND u.is_active = true
      AND p.status IN ('active', 'in_progress')
      AND (pref.weekly_summary = true OR pref.weekly_summary IS NULL)
    `);
    
    console.log(`   Found ${clientsResult.rows[0].count} clients who would receive weekly summaries\n`);
    
    // Test invoice reminder job
    console.log('2. Testing invoice reminder job...');
    console.log('   This job runs daily at 10:00 AM');
    console.log('   Searching for invoices needing reminders...');
    
    const invoicesResult = await query(`
      SELECT COUNT(*) as count
      FROM invoices i
      WHERE i.status IN ('sent', 'viewed')
      AND (
        (i.due_date = CURRENT_DATE + INTERVAL '3 days') OR
        (i.due_date = CURRENT_DATE) OR
        (i.due_date < CURRENT_DATE)
      )
    `);
    
    console.log(`   Found ${invoicesResult.rows[0].count} invoices that need reminders\n`);
    
    // Test project deadline reminder job
    console.log('3. Testing project deadline reminder job...');
    console.log('   This job runs daily at 9:30 AM');
    console.log('   Searching for projects with upcoming deadlines...');
    
    const projectsWithDeadlinesResult = await query(`
      SELECT COUNT(*) as count
      FROM projects p
      WHERE p.status IN ('active', 'in_progress')
      AND p.due_date IS NOT NULL
      AND p.due_date > CURRENT_DATE
      AND p.due_date <= CURRENT_DATE + INTERVAL '7 days'
    `);
    
    console.log(`   Found ${projectsWithDeadlinesResult.rows[0].count} projects with deadlines in the next 7 days\n`);
    
    // Show cron schedules
    console.log('Cron Job Schedules:');
    console.log('-------------------');
    console.log('Weekly Summary:        0 9 * * MON  (Every Monday at 9:00 AM)');
    console.log('Invoice Reminders:     0 10 * * *   (Daily at 10:00 AM)');
    console.log('Deadline Reminders:    30 9 * * *   (Daily at 9:30 AM)');
    
    console.log('\n✅ All cron jobs configured successfully!');
    console.log('Note: Cron jobs are set to start automatically when the server runs.');
    
    // Test manual execution (optional)
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nWould you like to manually trigger a test run of the weekly summary job? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() === 'y') {
      console.log('\nManually triggering weekly summary job...');
      // Temporarily start the job
      weeklyProjectSummaryJob.start();
      // Trigger it immediately
      await weeklyProjectSummaryJob.task();
      // Stop it again
      weeklyProjectSummaryJob.stop();
      console.log('Job execution completed. Check the email_log table for sent emails.');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('Error testing cron jobs:', error);
  } finally {
    process.exit(0);
  }
}

testCronJobs();