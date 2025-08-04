import dotenv from 'dotenv';
import { sendTemplateEmail } from './utils/emailService.js';
import { EMAIL_TEMPLATES, preloadTemplates } from './utils/emailTemplates.js';

dotenv.config();

/**
 * Test script for email notification system
 * Usage: node test-email-system.js
 */

async function testEmailSystem() {
  console.log('Testing [RE]Print Studios Email System...\n');

  try {
    // Preload all templates
    console.log('1. Preloading email templates...');
    await preloadTemplates();
    console.log('✓ Templates loaded successfully\n');

    // Test 1: Phase Approval Needed Email
    console.log('2. Testing Phase Approval Needed email...');
    const approvalEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVAL_NEEDED, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      clientName: 'Test Client',
      projectName: 'Test Project',
      phaseName: 'Design Phase',
      phaseDescription: 'Initial design concepts and mockups',
      deliverableCount: 3,
      keyDeliverables: [
        'Logo design concepts',
        'Brand color palette',
        'Typography guidelines'
      ],
      reviewUrl: 'http://localhost:3000/portal#projects',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
    console.log(`✓ Phase approval email queued: ${approvalEmailId}\n`);

    // Test 2: Phase Approved Email
    console.log('3. Testing Phase Approved email...');
    const approvedEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVED, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      clientName: 'Admin User',
      projectName: 'Test Project',
      phaseName: 'Design Phase',
      approvedAt: new Date(),
      approvalNotes: 'Looks great! Ready to move forward.',
      nextPhase: {
        name: 'Development Phase',
        description: 'Building the approved designs',
        estimatedDuration: '2 weeks'
      },
      projectUrl: 'http://localhost:3000/admin#projects/123'
    });
    console.log(`✓ Phase approved email queued: ${approvedEmailId}\n`);

    // Test 3: File Upload Email
    console.log('4. Testing File Upload email...');
    const fileEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.FILE_UPLOADED, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      clientName: 'Test Client',
      projectName: 'Test Project',
      fileName: 'final-design-v2.pdf',
      fileSize: '2.4 MB',
      fileType: 'document',
      uploaderName: '[RE]Print Studios Admin',
      uploadDate: new Date(),
      phaseName: 'Design Phase',
      downloadUrl: 'http://localhost:3000/portal#files/123',
      description: 'Final design document with all revisions incorporated'
    });
    console.log(`✓ File upload email queued: ${fileEmailId}\n`);

    // Test 4: Project Welcome Email
    console.log('5. Testing Project Welcome email...');
    const welcomeEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WELCOME, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      clientName: 'New Client',
      projectName: 'Exciting New Project',
      projectDescription: 'Complete brand identity and website design',
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      totalPhases: 8,
      phases: [
        { name: 'Onboarding', description: 'Project kickoff and requirements gathering' },
        { name: 'Ideation', description: 'Creative exploration and concepts' },
        { name: 'Design', description: 'Visual design and prototyping' },
        { name: 'Review', description: 'Client feedback and revisions' },
        { name: 'Production', description: 'Final asset creation' },
        { name: 'Payment', description: 'Invoice and payment processing' },
        { name: 'Sign-off', description: 'Final approval and handoff' },
        { name: 'Delivery', description: 'Asset delivery and project closure' }
      ],
      portalUrl: 'http://localhost:3000/portal',
      projectManager: {
        name: 'Kendrick Forrest',
        email: 'kendrick@reprintstudios.com'
      }
    });
    console.log(`✓ Welcome email queued: ${welcomeEmailId}\n`);

    // Test 5: Password Reset Email
    console.log('6. Testing Password Reset email...');
    const resetEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.PASSWORD_RESET, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      userName: 'Test User',
      resetUrl: 'http://localhost:3000/reset-password?token=test-token-123',
      expirationHours: 24
    });
    console.log(`✓ Password reset email queued: ${resetEmailId}\n`);

    // Test 6: Weekly Summary Email
    console.log('7. Testing Weekly Summary email...');
    const summaryEmailId = await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WEEKLY_SUMMARY, {
      to: process.env.TEST_EMAIL || 'test@example.com',
      clientName: 'Test Client',
      weekOf: 'January 23-29, 2025',
      projects: [
        {
          name: 'Website Redesign',
          currentPhase: { name: 'Design', status: 'In Progress' },
          progress: 45,
          weeklyActivity: [
            'Completed homepage mockups',
            'Started product page designs',
            'Gathered feedback on color schemes'
          ],
          upcomingDeadlines: [
            { item: 'Design review', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
            { item: 'Final mockups', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
          ],
          actionRequired: 'Please review and approve homepage mockups'
        },
        {
          name: 'Brand Identity',
          currentPhase: { name: 'Review', status: 'Awaiting Approval' },
          progress: 75,
          weeklyActivity: [
            'Finalized logo variations',
            'Created brand guidelines document'
          ],
          actionRequired: 'Logo approval needed to proceed'
        }
      ],
      overallStats: {
        filesUploaded: 12,
        phasesCompleted: 2,
        messagesExchanged: 8
      },
      portalUrl: 'http://localhost:3000/portal'
    });
    console.log(`✓ Weekly summary email queued: ${summaryEmailId}\n`);

    console.log('All test emails queued successfully!');
    console.log('\nNote: In development mode, emails will be logged to console.');
    console.log('Configure SMTP settings in .env to send real emails.');
    
    // Give time for emails to process
    console.log('\nWaiting for email queue to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\nTest complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error testing email system:', error);
    process.exit(1);
  }
}

// Run the test
testEmailSystem();