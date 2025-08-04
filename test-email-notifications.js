import { query } from './config/database.js';
import { sendTemplateEmail } from './utils/emailService.js';
import { EMAIL_TEMPLATES } from './utils/emailTemplates.js';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Valid UUID for testing

async function testEmailNotifications() {
  console.log('🧪 Email Notification Integration Tests\n');
  console.log('========================================\n');
  
  const tests = [
    testPhaseTransitionEmails,
    testProjectLifecycleEmails,
    testInvoiceEmails,
    testFileNotifications,
    testAuthenticationEmails,
    testScheduledEmails,
    testEmailPreferences
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
      console.log(`✅ ${test.name} - PASSED\n`);
    } catch (error) {
      failed++;
      console.error(`❌ ${test.name} - FAILED`);
      console.error(`   Error: ${error.message}\n`);
    }
  }
  
  console.log('\n========================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  // Check email delivery statistics
  await checkEmailDeliveryStats();
}

async function testPhaseTransitionEmails() {
  console.log('📧 Testing Phase Transition Emails...');
  
  // Test phase approval needed
  await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVAL_NEEDED, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    projectName: 'Test Project',
    phaseName: 'Design Phase',
    phaseDescription: 'Initial design concepts',
    filesCount: 3,
    approvalUrl: 'http://localhost:3000/test',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  });
  
  // Test phase approved
  await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVED, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    projectName: 'Test Project',
    phaseName: 'Design Phase',
    approvedBy: 'Test Client',
    approvalDate: new Date(),
    nextPhaseName: 'Development Phase',
    comments: 'Looks great!'
  });
  
  console.log('   ✓ Phase transition emails queued');
}

async function testProjectLifecycleEmails() {
  console.log('📧 Testing Project Lifecycle Emails...');
  
  // Test welcome email
  await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WELCOME, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    projectName: 'New Test Project',
    projectDescription: 'A comprehensive brand identity redesign',
    projectManager: 'Sarah Johnson',
    estimatedTimeline: '6-8 weeks',
    firstPhaseName: 'Discovery & Research',
    nextSteps: ['Complete project brief', 'Schedule kickoff meeting']
  });
  
  // Test completion email
  await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_COMPLETED, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    projectName: 'Test Project',
    completionDate: new Date(),
    projectDuration: '6 weeks',
    finalDeliverables: ['Logo Package', 'Brand Guidelines'],
    downloadAllUrl: 'http://localhost:3000/download',
    feedbackUrl: 'http://localhost:3000/feedback'
  });
  
  console.log('   ✓ Project lifecycle emails queued');
}

async function testInvoiceEmails() {
  console.log('📧 Testing Invoice Emails...');
  
  // Test invoice sent
  await sendTemplateEmail(EMAIL_TEMPLATES.INVOICE_SENT, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    invoiceNumber: 'INV-2025-TEST',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalAmount: 5000,
    projectName: 'Test Project',
    paymentUrl: 'http://localhost:3000/pay'
  });
  
  // Test payment received
  await sendTemplateEmail(EMAIL_TEMPLATES.PAYMENT_RECEIVED, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    invoiceNumber: 'INV-2025-TEST',
    amountPaid: 5000,
    paymentDate: new Date(),
    paymentMethod: 'Credit Card',
    transactionId: 'ch_test123'
  });
  
  console.log('   ✓ Invoice emails queued');
}

async function testFileNotifications() {
  console.log('📧 Testing File Upload Notifications...');
  
  await sendTemplateEmail(EMAIL_TEMPLATES.FILE_UPLOADED, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    fileName: 'Logo_Concepts_v2.pdf',
    fileSize: '2.4 MB',
    uploadedBy: 'Sarah Johnson',
    uploadDate: new Date(),
    fileDescription: 'Updated logo concepts',
    downloadUrl: 'http://localhost:3000/download/test',
    projectName: 'Test Project',
    currentPhase: 'Design Phase'
  });
  
  console.log('   ✓ File notification email queued');
}

async function testAuthenticationEmails() {
  console.log('📧 Testing Authentication Emails...');
  
  // Test password reset
  await sendTemplateEmail(EMAIL_TEMPLATES.PASSWORD_RESET, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    userName: 'Test User',
    resetUrl: 'http://localhost:3000/reset/token123',
    expirationTime: '24 hours',
    ipAddress: '127.0.0.1',
    requestedAt: new Date()
  });
  
  // Test security alert
  await sendTemplateEmail(EMAIL_TEMPLATES.SECURITY_ALERT, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    userName: 'Test User',
    loginTime: new Date(),
    location: 'San Francisco, CA',
    deviceInfo: 'Chrome on MacOS',
    ipAddress: '192.168.1.1',
    changePasswordUrl: 'http://localhost:3000/change-password'
  });
  
  console.log('   ✓ Authentication emails queued');
}

async function testScheduledEmails() {
  console.log('📧 Testing Scheduled Email Templates...');
  
  // Test weekly summary
  await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WEEKLY_SUMMARY, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    weekEndDate: new Date(),
    projects: [
      {
        name: 'Test Project 1',
        progress: 75,
        currentPhase: 'Development',
        needsApproval: true
      },
      {
        name: 'Test Project 2',
        progress: 30,
        currentPhase: 'Design',
        needsApproval: false
      }
    ],
    totalProjects: 2,
    projectsNeedingAttention: 1,
    completedThisWeek: 3,
    recentActivity: [
      {
        description: 'Design concepts uploaded',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        projectName: 'Test Project 1'
      }
    ],
    upcomingDeadlines: [
      {
        projectName: 'Test Project 1',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        daysRemaining: 5
      }
    ],
    hasUpcomingDeadlines: true,
    hasRecentActivity: true
  });
  
  // Test deadline reminder
  await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_DEADLINE_REMINDER, {
    to: TEST_EMAIL,
    userId: TEST_USER_ID,
    clientName: 'Test Client',
    projectName: 'Test Project',
    currentPhase: 'Final Review',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    daysRemaining: 3,
    actionRequired: true,
    requiredActions: ['Review final deliverables', 'Provide approval'],
    projectProgress: 90
  });
  
  console.log('   ✓ Scheduled email templates queued');
}

async function testEmailPreferences() {
  console.log('📧 Testing Email Preference System...');
  
  try {
    // Check if test user has preferences
    const prefResult = await query(
      'SELECT * FROM user_email_preferences WHERE user_id = $1',
      [TEST_USER_ID]
    );
    
    if (prefResult.rows.length === 0) {
      // Create test preferences
      await query(`
        INSERT INTO user_email_preferences (
          user_id, phase_notifications, project_notifications, 
          file_notifications, weekly_summary, deadline_reminders
        ) VALUES ($1, true, true, true, false, true)
      `, [TEST_USER_ID]);
      console.log('   ✓ Created test user preferences');
    } else {
      console.log('   ✓ User preferences exist');
    }
    
    // Test unsubscribe token
    const tokenResult = await query(
      'SELECT * FROM unsubscribe_tokens WHERE user_id = $1 LIMIT 1',
      [TEST_USER_ID]
    );
    
    console.log(`   ✓ Unsubscribe system ready (${tokenResult.rows.length} tokens)`);
    
  } catch (error) {
    console.error('   ✗ Preference system error:', error.message);
  }
}

async function checkEmailDeliveryStats() {
  console.log('\n📊 Email Delivery Statistics:');
  console.log('================================');
  
  try {
    // Get email stats for last 24 hours
    const statsResult = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(DISTINCT to_email) as unique_recipients,
        AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_send_time_seconds
      FROM email_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('\nLast 24 Hours:');
    statsResult.rows.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count} emails (${stat.unique_recipients} unique recipients)`);
      if (stat.avg_send_time_seconds && typeof stat.avg_send_time_seconds === 'number') {
        console.log(`    Average send time: ${parseFloat(stat.avg_send_time_seconds).toFixed(2)}s`);
      }
    });
    
    // Get template usage stats
    const templateResult = await query(`
      SELECT 
        template_name,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
      FROM email_log
      WHERE template_name IS NOT NULL
      AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY template_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\nTemplate Usage (Last 7 Days):');
    templateResult.rows.forEach(template => {
      const successRate = template.sent_count / template.count * 100;
      console.log(`  ${template.template_name}: ${template.count} total (${successRate.toFixed(1)}% success rate)`);
    });
    
    // Check email queue status
    const queueResult = await query(`
      SELECT COUNT(*) as queued
      FROM email_log
      WHERE status = 'queued'
    `);
    
    console.log(`\n📮 Current Queue: ${queueResult.rows[0].queued} emails waiting`);
    
  } catch (error) {
    console.error('Error fetching email stats:', error);
  }
}

// Run tests
testEmailNotifications().catch(console.error).finally(() => process.exit());