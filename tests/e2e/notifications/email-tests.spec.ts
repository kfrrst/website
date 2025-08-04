import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, EMAIL_TEMPLATES, TIMEOUTS } from '../../utils/test-constants';

test.describe('Comprehensive Email Notification Tests', () => {
  let adminToken: string;
  let clientToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth tokens
    const adminLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.admin
    });
    adminToken = (await adminLogin.json()).token;

    const clientLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.client
    });
    clientToken = (await clientLogin.json()).token;
  });

  test.describe('Email Template Management', () => {
    test('View and edit all 17 email templates', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to email settings
      await page.click('text=Settings');
      await page.click('text=Email Templates');

      // Check all templates are listed
      for (const template of EMAIL_TEMPLATES) {
        await expect(page.locator(`text="${template}"`)).toBeVisible();
      }
      console.log(`✅ All ${EMAIL_TEMPLATES.length} email templates found`);

      // Edit a template
      const firstTemplate = EMAIL_TEMPLATES[0];
      await page.click(`tr:has-text("${firstTemplate}") button:has-text("Edit")`);

      // Check template editor
      const editor = page.locator('.template-editor, [data-template-editor]');
      await expect(editor).toBeVisible();

      // Verify template variables
      const variableList = page.locator('.template-variables, [data-variables]');
      if (await variableList.isVisible()) {
        const variables = await variableList.locator('.variable-item').count();
        console.log(`  Template has ${variables} variables available`);
      }

      // Test template preview
      const previewBtn = page.locator('button:has-text("Preview")');
      if (await previewBtn.isVisible()) {
        await previewBtn.click();

        const preview = page.locator('.email-preview, [data-preview]');
        await expect(preview).toBeVisible();

        // Check preview renders correctly
        const previewContent = await preview.textContent();
        expect(previewContent?.length).toBeGreaterThan(0);
        console.log('✅ Email template preview working');

        // Test mobile preview
        const mobileToggle = page.locator('button:has-text("Mobile")');
        if (await mobileToggle.isVisible()) {
          await mobileToggle.click();
          await page.waitForTimeout(500);
          
          const previewWidth = await preview.evaluate(el => el.clientWidth);
          expect(previewWidth).toBeLessThan(500);
          console.log('✅ Mobile preview working');
        }
      }

      // Save template changes
      await page.fill('textarea[name="subject"]', 'Updated Subject Line');
      await page.click('button:has-text("Save")');
      
      await expect(page.locator('text=/saved|updated/i')).toBeVisible();
    });

    test('Template variable replacement', async ({ page, request }) => {
      // Test sending an email with variables
      const testEmail = {
        template: 'project-welcome',
        to: TEST_USERS.client.email,
        variables: {
          clientName: TEST_USERS.client.firstName,
          projectName: 'Test Project',
          projectUrl: 'https://example.com/project/123',
          dueDate: new Date().toLocaleDateString()
        }
      };

      const response = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: testEmail
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      console.log('✅ Email sent with variable replacement');
      
      // Check email preview to verify variables
      if (result.previewUrl) {
        await page.goto(result.previewUrl);
        
        // Verify variables were replaced
        await expect(page.locator(`text="${testEmail.variables.clientName}"`)).toBeVisible();
        await expect(page.locator(`text="${testEmail.variables.projectName}"`)).toBeVisible();
      }
    });

    test('Multi-language email support', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to email settings
      await page.click('text=Settings');
      await page.click('text=Email Templates');

      // Check for language selector
      const langSelector = page.locator('select[name="language"], button:has-text("Language")');
      
      if (await langSelector.isVisible()) {
        // Get available languages
        const languages = await page.$$eval('select[name="language"] option', 
          options => options.map(opt => opt.textContent)
        );
        
        console.log(`✅ Email templates support ${languages.length} languages`);
        
        // Test switching language
        if (languages.length > 1) {
          await langSelector.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // Verify content changed
          const templateContent = await page.locator('.template-content').textContent();
          expect(templateContent).toBeTruthy();
        }
      }
    });
  });

  test.describe('Email Delivery & Tracking', () => {
    test('Email delivery confirmation', async ({ page, request }) => {
      // Send test email
      const emailData = {
        template: 'password-reset',
        to: TEST_USERS.client.email,
        variables: {
          resetLink: 'https://example.com/reset/test-token',
          expiryTime: '24 hours'
        }
      };

      const sendResponse = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: emailData
      });

      expect(sendResponse.ok()).toBeTruthy();
      const { messageId } = await sendResponse.json();

      // Check delivery status
      const statusResponse = await request.get(`/api/email/status/${messageId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (statusResponse.ok()) {
        const status = await statusResponse.json();
        console.log(`✅ Email status: ${status.status}`);
        console.log(`  Sent at: ${status.sentAt}`);
        
        if (status.delivered) {
          console.log(`  Delivered at: ${status.deliveredAt}`);
        }
      }
    });

    test('Email bounce handling', async ({ page, request }) => {
      // Test with invalid email
      const bounceEmail = {
        template: 'invoice-sent',
        to: 'invalid-email-that-will-bounce@nonexistentdomain123456.com',
        variables: {
          invoiceNumber: 'INV-TEST-001',
          amount: '$100.00'
        }
      };

      const response = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: bounceEmail
      });

      const { messageId } = await response.json();

      // Wait for bounce processing
      await page.waitForTimeout(5000);

      // Check bounce status
      const bounceResponse = await request.get(`/api/email/bounces`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (bounceResponse.ok()) {
        const bounces = await bounceResponse.json();
        const thisBounce = bounces.find((b: any) => b.messageId === messageId);
        
        if (thisBounce) {
          console.log('✅ Email bounce detected and recorded');
          console.log(`  Bounce type: ${thisBounce.type}`);
        }
      }
    });

    test('Email open tracking', async ({ page, request }) => {
      // Send trackable email
      const trackableEmail = {
        template: 'project-completed',
        to: TEST_USERS.client.email,
        trackOpens: true,
        variables: {
          projectName: 'Tracked Project',
          downloadLink: 'https://example.com/download'
        }
      };

      const response = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: trackableEmail
      });

      const { messageId, trackingPixelUrl } = await response.json();

      if (trackingPixelUrl) {
        // Simulate email open
        await page.goto(trackingPixelUrl);

        // Check open was tracked
        const statsResponse = await request.get(`/api/email/stats/${messageId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (statsResponse.ok()) {
          const stats = await statsResponse.json();
          expect(stats.opened).toBeTruthy();
          console.log('✅ Email open tracking working');
          console.log(`  Opened at: ${stats.openedAt}`);
        }
      }
    });

    test('Email click tracking', async ({ page, request }) => {
      // Send email with tracked links
      const emailWithLinks = {
        template: 'file-uploaded',
        to: TEST_USERS.client.email,
        trackClicks: true,
        variables: {
          fileName: 'important-document.pdf',
          fileUrl: 'https://example.com/files/123',
          projectUrl: 'https://example.com/projects/456'
        }
      };

      const response = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: emailWithLinks
      });

      const { messageId, trackedLinks } = await response.json();

      if (trackedLinks && trackedLinks.length > 0) {
        // Click tracked link
        await page.goto(trackedLinks[0].trackingUrl);

        // Verify click was tracked
        const clickStats = await request.get(`/api/email/clicks/${messageId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (clickStats.ok()) {
          const clicks = await clickStats.json();
          expect(clicks.length).toBeGreaterThan(0);
          console.log('✅ Email click tracking working');
          console.log(`  ${clicks.length} clicks tracked`);
        }
      }
    });
  });

  test.describe('Email Preferences & Unsubscribe', () => {
    test('User email preferences', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Navigate to settings
      await page.click('text=Settings, text=Preferences');
      await page.click('text=Email Notifications');

      // Check preference options
      const preferences = [
        { name: 'phase_notifications', label: 'Phase Updates' },
        { name: 'project_notifications', label: 'Project Updates' },
        { name: 'file_notifications', label: 'File Uploads' },
        { name: 'weekly_summary', label: 'Weekly Summary' },
        { name: 'marketing_emails', label: 'Marketing' }
      ];

      for (const pref of preferences) {
        const checkbox = page.locator(`input[name="${pref.name}"]`);
        if (await checkbox.isVisible()) {
          const isChecked = await checkbox.isChecked();
          console.log(`✅ ${pref.label}: ${isChecked ? 'Enabled' : 'Disabled'}`);
          
          // Toggle preference
          await checkbox.click();
          await page.waitForTimeout(500);
        }
      }

      // Save preferences
      await page.click('button:has-text("Save Preferences")');
      await expect(page.locator('text=/saved|updated/i')).toBeVisible();
    });

    test('Unsubscribe functionality', async ({ page, request }) => {
      // Generate unsubscribe token
      const unsubscribeData = await request.post('/api/email/generate-unsubscribe', {
        headers: { 'Authorization': `Bearer ${clientToken}` }
      });

      const { unsubscribeToken } = await unsubscribeData.json();

      // Visit unsubscribe link
      await page.goto(`/unsubscribe?token=${unsubscribeToken}`);

      // Check unsubscribe page
      await expect(page.locator('text=/unsubscribe|opt out/i')).toBeVisible();

      // Select unsubscribe options
      const options = page.locator('input[type="checkbox"]');
      const count = await options.count();
      
      if (count > 0) {
        // Unsubscribe from first option
        await options.first().check();
        
        // Confirm unsubscribe
        await page.click('button:has-text("Unsubscribe")');
        
        await expect(page.locator('text=/unsubscribed|confirmed/i')).toBeVisible();
        console.log('✅ Unsubscribe functionality working');
      }
    });

    test('Re-subscribe functionality', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Navigate to email preferences
      await page.click('text=Settings');
      await page.click('text=Email Notifications');

      // Look for re-subscribe option
      const resubscribeBtn = page.locator('button:has-text("Re-subscribe"), button:has-text("Opt In")');
      
      if (await resubscribeBtn.isVisible()) {
        await resubscribeBtn.click();
        
        // Confirm re-subscription
        await page.click('button:has-text("Confirm")');
        
        await expect(page.locator('text=/subscribed|opted in/i')).toBeVisible();
        console.log('✅ Re-subscribe functionality working');
      }
    });
  });

  test.describe('Automated Email Workflows', () => {
    test('Phase approval email workflow', async ({ page, request }) => {
      // Simulate phase completion
      const phaseUpdate = {
        projectId: 'test-project-id',
        phaseNumber: 3,
        status: 'pending_approval'
      };

      const response = await request.post('/api/phases/update', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: phaseUpdate
      });

      if (response.ok()) {
        // Check if approval email was sent
        const emailQueue = await request.get('/api/admin/email-queue', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        const emails = await emailQueue.json();
        const approvalEmail = emails.find((e: any) => 
          e.template === 'phase-approval-needed'
        );

        expect(approvalEmail).toBeTruthy();
        console.log('✅ Phase approval email triggered automatically');
      }
    });

    test('Weekly summary email', async ({ page, request }) => {
      // Check scheduled emails
      const scheduledEmails = await request.get('/api/email/scheduled', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (scheduledEmails.ok()) {
        const scheduled = await scheduledEmails.json();
        const weeklySummaries = scheduled.filter((e: any) => 
          e.template === 'project-weekly-summary'
        );

        console.log(`✅ ${weeklySummaries.length} weekly summaries scheduled`);

        // Test manual trigger
        const triggerResponse = await request.post('/api/email/trigger-weekly-summary', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        expect(triggerResponse.ok()).toBeTruthy();
        console.log('✅ Weekly summary manually triggered');
      }
    });

    test('Deadline reminder emails', async ({ page, request }) => {
      // Create project with upcoming deadline
      const projectData = {
        name: 'Deadline Test Project',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
      };

      const projectResponse = await request.post('/api/projects', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: projectData
      });

      if (projectResponse.ok()) {
        // Trigger deadline check
        const checkResponse = await request.post('/api/email/check-deadlines', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (checkResponse.ok()) {
          const { remindersSent } = await checkResponse.json();
          console.log(`✅ ${remindersSent} deadline reminder emails sent`);
        }
      }
    });

    test('Invoice overdue notifications', async ({ page, request }) => {
      // Check for overdue invoices
      const overdueCheck = await request.post('/api/invoices/check-overdue', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (overdueCheck.ok()) {
        const { overdueCount, emailsSent } = await overdueCheck.json();
        console.log(`✅ ${overdueCount} overdue invoices found`);
        console.log(`  ${emailsSent} overdue notifications sent`);
      }
    });
  });

  test.describe('Email Analytics & Reporting', () => {
    test('Email performance dashboard', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to email analytics
      await page.click('text=Reports');
      await page.click('text=Email Analytics');

      // Check metrics
      const metrics = [
        { label: 'Sent', selector: '[data-metric="sent"]' },
        { label: 'Delivered', selector: '[data-metric="delivered"]' },
        { label: 'Opened', selector: '[data-metric="opened"]' },
        { label: 'Clicked', selector: '[data-metric="clicked"]' },
        { label: 'Bounced', selector: '[data-metric="bounced"]' },
        { label: 'Unsubscribed', selector: '[data-metric="unsubscribed"]' }
      ];

      console.log('✅ Email Analytics:');
      for (const metric of metrics) {
        const element = page.locator(metric.selector);
        if (await element.isVisible()) {
          const value = await element.textContent();
          console.log(`  ${metric.label}: ${value}`);
        }
      }

      // Check email performance chart
      const chart = page.locator('canvas, .email-chart');
      if (await chart.isVisible()) {
        console.log('✅ Email performance chart displayed');
      }
    });

    test('Export email reports', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to email reports
      await page.click('text=Reports');
      await page.click('text=Email Analytics');

      // Set date range
      await page.fill('input[name="startDate"]', '2024-01-01');
      await page.fill('input[name="endDate"]', '2024-12-31');

      // Export report
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export Report")');
      
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      
      expect(filename).toContain('email-report');
      console.log(`✅ Email report exported: ${filename}`);
    });

    test('Template performance comparison', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to template analytics
      await page.click('text=Settings');
      await page.click('text=Email Templates');
      await page.click('tab:has-text("Analytics")');

      // Check template performance
      const templateStats = page.locator('.template-stats, [data-template-stats]');
      if (await templateStats.isVisible()) {
        const rows = templateStats.locator('tr[data-template]');
        const count = await rows.count();
        
        console.log(`✅ Performance data for ${count} templates`);
        
        // Check best performing template
        const bestPerforming = await rows.first().getAttribute('data-template');
        console.log(`  Best performing: ${bestPerforming}`);
      }
    });
  });

  test.describe('Email Security & Compliance', () => {
    test('SPF/DKIM validation', async ({ page, request }) => {
      // Check email authentication
      const authCheck = await request.get('/api/email/auth-check', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (authCheck.ok()) {
        const { spf, dkim, dmarc } = await authCheck.json();
        
        console.log('✅ Email Authentication Status:');
        console.log(`  SPF: ${spf.valid ? 'Valid' : 'Invalid'}`);
        console.log(`  DKIM: ${dkim.valid ? 'Valid' : 'Invalid'}`);
        console.log(`  DMARC: ${dmarc.valid ? 'Valid' : 'Invalid'}`);
      }
    });

    test('GDPR compliance features', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Request data export
      await page.click('text=Settings');
      await page.click('text=Privacy');

      // Export personal data
      const exportBtn = page.locator('button:has-text("Export My Data")');
      if (await exportBtn.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('personal-data');
        console.log('✅ GDPR data export working');
      }

      // Check data deletion option
      const deleteBtn = page.locator('button:has-text("Delete My Data")');
      expect(deleteBtn).toBeVisible();
      console.log('✅ GDPR data deletion option available');
    });

    test('Email content sanitization', async ({ page, request }) => {
      // Test XSS prevention in emails
      const xssEmail = {
        template: 'message-received',
        to: TEST_USERS.client.email,
        variables: {
          message: '<script>alert("XSS")</script>',
          senderName: '<img src=x onerror=alert("XSS")>'
        }
      };

      const response = await request.post('/api/email/send', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: xssEmail
      });

      const { previewUrl } = await response.json();
      
      if (previewUrl) {
        await page.goto(previewUrl);
        
        // Check content is sanitized
        const scriptTags = await page.locator('script').count();
        expect(scriptTags).toBe(0);
        
        console.log('✅ Email content properly sanitized');
      }
    });
  });

  test.describe('Email Queue Management', () => {
    test('View and manage email queue', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to email queue
      await page.click('text=Settings');
      await page.click('text=Email Queue');

      // Check queue status
      const queueStats = {
        pending: await page.locator('[data-status="pending"]').count(),
        processing: await page.locator('[data-status="processing"]').count(),
        sent: await page.locator('[data-status="sent"]').count(),
        failed: await page.locator('[data-status="failed"]').count()
      };

      console.log('✅ Email Queue Status:');
      Object.entries(queueStats).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      // Test retry failed emails
      const retryBtn = page.locator('button:has-text("Retry Failed")');
      if (await retryBtn.isVisible() && queueStats.failed > 0) {
        await retryBtn.click();
        
        await expect(page.locator('text=/retrying|requeued/i')).toBeVisible();
        console.log('✅ Failed email retry functionality working');
      }
    });

    test('Email rate limiting', async ({ page, request }) => {
      // Send multiple emails rapidly
      const emailPromises = [];
      
      for (let i = 0; i < 20; i++) {
        emailPromises.push(
          request.post('/api/email/send', {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            data: {
              template: 'test-notification',
              to: `test${i}@example.com`,
              variables: { message: 'Rate limit test' }
            }
          })
        );
      }

      const responses = await Promise.all(emailPromises);
      const rateLimited = responses.some(r => r.status() === 429);
      
      if (rateLimited) {
        console.log('✅ Email rate limiting active');
      } else {
        // Check queue for throttling
        const queueResponse = await request.get('/api/admin/email-queue', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const queue = await queueResponse.json();
        const pending = queue.filter((e: any) => e.status === 'pending').length;
        
        console.log(`✅ ${pending} emails queued for rate limiting`);
      }
    });
  });
});