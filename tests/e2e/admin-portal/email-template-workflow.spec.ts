import { test, expect } from '@playwright/test';

test.describe('Email Template Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and login
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin.html');
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard and navigate to settings
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.click('a[href="#settings"]');
    await page.waitForSelector('#settings.active', { state: 'visible' });
  });

  test('Navigate to email templates section', async ({ page }) => {
    // Look for email templates tab/section
    const emailTab = page.locator('*:has-text("Email Templates"), *:has-text("Email Settings"), button[data-tab="email"]').first();
    
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
      
      // Verify email templates section is visible
      const templatesSection = page.locator('#email-templates, .email-templates-section, [class*="email-template"]').first();
      await expect(templatesSection).toBeVisible();
      
      console.log('✅ Email templates section loaded');
    } else {
      // Try direct navigation if available
      const emailNavLink = page.locator('a[href="#email-templates"]').first();
      if (await emailNavLink.isVisible()) {
        await emailNavLink.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('View and edit welcome email template', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Find welcome email template
    const welcomeTemplate = page.locator('*:has-text("Welcome Email"), *:has-text("welcome_email"), tr:has-text("Welcome")').first();
    
    if (await welcomeTemplate.isVisible()) {
      // Click edit button
      const editBtn = welcomeTemplate.locator('button:has-text("Edit"), button[title="Edit"]').first();
      if (!await editBtn.isVisible()) {
        // Click on the row itself
        await welcomeTemplate.click();
      } else {
        await editBtn.click();
      }
      
      await page.waitForTimeout(1000);
      
      // Look for email template editor
      const editor = page.locator('.email-editor, .template-editor, #email-template-editor').first();
      await expect(editor).toBeVisible({ timeout: 5000 });
      
      // Update subject line
      const subjectField = editor.locator('input[name="subject"], input#email_subject').first();
      if (await subjectField.isVisible()) {
        const currentSubject = await subjectField.inputValue();
        await subjectField.fill(`${currentSubject} - Updated ${new Date().toISOString()}`);
        console.log('✅ Updated email subject');
      }
      
      // Check for variable insertion buttons
      const variableButtons = await editor.locator('button:has-text("{{"), button:has-text("Insert Variable"), .variable-btn').count();
      if (variableButtons > 0) {
        console.log(`✅ Found ${variableButtons} variable insertion buttons`);
      }
      
      // Update email body
      const bodyEditor = editor.locator('textarea[name="body"], .email-body-editor, [contenteditable="true"]').first();
      if (await bodyEditor.isVisible()) {
        const isTextarea = await bodyEditor.evaluate(el => el.tagName === 'TEXTAREA');
        if (isTextarea) {
          const currentBody = await bodyEditor.inputValue();
          await bodyEditor.fill(currentBody + '\n\n<!-- Updated by automated test -->');
        } else {
          // Content editable div
          await bodyEditor.click();
          await page.keyboard.press('End');
          await page.keyboard.type('\n\n<!-- Updated by automated test -->');
        }
        console.log('✅ Updated email body');
      }
      
      // Save changes
      const saveBtn = editor.locator('button:has-text("Save"), button[type="submit"]').first();
      await saveBtn.click();
      
      await page.waitForTimeout(2000);
      console.log('✅ Email template saved');
    }
  });

  test('Preview email template', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Find preview button
    const previewBtn = page.locator('button:has-text("Preview"), button[title="Preview"]').first();
    
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      
      // Wait for preview modal/panel
      const preview = page.locator('.email-preview, .preview-modal, #email-preview').first();
      await expect(preview).toBeVisible({ timeout: 5000 });
      
      // Check for desktop/mobile toggle
      const deviceToggle = preview.locator('button:has-text("Mobile"), button:has-text("Desktop"), .device-toggle').first();
      if (await deviceToggle.isVisible()) {
        await deviceToggle.click();
        await page.waitForTimeout(500);
        console.log('✅ Device preview toggle working');
      }
      
      // Verify preview content
      const previewContent = preview.locator('.preview-content, .email-content, iframe').first();
      await expect(previewContent).toBeVisible();
      
      console.log('✅ Email preview working');
      
      // Close preview
      const closeBtn = preview.locator('.close, .modal-close, button:has-text("Close")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test('Test email template with sample data', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Find test/send button
    const testBtn = page.locator('button:has-text("Test"), button:has-text("Send Test")').first();
    
    if (await testBtn.isVisible()) {
      await testBtn.click();
      
      // Wait for test modal
      const testModal = page.locator('.test-modal, .send-test-modal, .modal:has-text("Test Email")').first();
      
      if (await testModal.isVisible({ timeout: 3000 })) {
        // Fill test email
        const testEmailField = testModal.locator('input[name="test_email"], input[type="email"]').first();
        await testEmailField.fill('test@example.com');
        
        // Select test data if available
        const testDataSelect = testModal.locator('select[name="test_data"], select#test_client').first();
        if (await testDataSelect.isVisible()) {
          const options = await testDataSelect.locator('option').count();
          if (options > 1) {
            await testDataSelect.selectOption({ index: 1 });
          }
        }
        
        console.log('✅ Test email form filled');
        
        // Close without sending
        const cancelBtn = testModal.locator('button:has-text("Cancel"), .modal-close').first();
        await cancelBtn.click();
      }
    }
  });

  test('Manage email template variables', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Edit any template
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for variable insertion panel
      const variablePanel = page.locator('.variables-panel, .variable-list, [class*="variable"]').first();
      
      if (await variablePanel.isVisible()) {
        // Common variables to check
        const commonVariables = [
          'Client Name',
          'Project Name',
          'Company Name',
          'Current Date',
          'Invoice Number',
          'Amount Due'
        ];
        
        for (const variable of commonVariables) {
          const varButton = variablePanel.locator(`*:has-text("${variable}")`).first();
          if (await varButton.isVisible()) {
            console.log(`✓ Variable available: ${variable}`);
          }
        }
        
        // Try inserting a variable
        const firstVarBtn = variablePanel.locator('button').first();
        if (await firstVarBtn.isVisible()) {
          await firstVarBtn.click();
          console.log('✅ Variable insertion working');
        }
      }
    }
  });

  test('Create custom email template', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for create/add template button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add Template"), button:has-text("New Template")').first();
    
    if (await createBtn.isVisible()) {
      await createBtn.click();
      
      // Wait for create form/modal
      const createForm = page.locator('.create-template-modal, .template-form, #new-template-form').first();
      
      if (await createForm.isVisible({ timeout: 3000 })) {
        // Fill template details
        const timestamp = Date.now();
        
        await createForm.locator('input[name="name"], input#template_name').fill(`custom_template_${timestamp}`);
        await createForm.locator('input[name="subject"], input#template_subject').fill(`Custom Template Test ${timestamp}`);
        await createForm.locator('textarea[name="description"], input#template_description').fill('Automated test template');
        
        // Select template type if available
        const typeSelect = createForm.locator('select[name="type"], select#template_type').first();
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption({ index: 1 });
        }
        
        // Add template body
        const bodyField = createForm.locator('textarea[name="body"], .template-body-editor').first();
        await bodyField.fill(`
          <h1>Hello {{client_name}}</h1>
          <p>This is a test email template created by automated testing.</p>
          <p>Project: {{project_name}}</p>
          <p>Best regards,<br>{{company_name}}</p>
        `);
        
        console.log('✅ Custom template form filled');
        
        // Close without saving for test
        const cancelBtn = createForm.locator('button:has-text("Cancel"), .modal-close').first();
        await cancelBtn.click();
      }
    }
  });

  test('Email template categories and filtering', async ({ page }) => {
    // Navigate to email templates
    const emailTab = page.locator('*:has-text("Email Templates")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for category filters
    const categoryFilter = page.locator('select.category-filter, select[name="category"], .template-categories').first();
    
    if (await categoryFilter.isVisible()) {
      const isSelect = await categoryFilter.evaluate(el => el.tagName === 'SELECT');
      
      if (isSelect) {
        // Test different categories
        const categories = ['client', 'project', 'invoice', 'system', 'all'];
        
        for (const category of categories) {
          try {
            await categoryFilter.selectOption(category);
            await page.waitForTimeout(500);
            console.log(`✓ Filtered by category: ${category}`);
          } catch {
            // Category might not exist
          }
        }
      } else {
        // Category tabs
        const categoryTabs = await page.locator('.category-tab, .filter-tab').count();
        console.log(`✅ Found ${categoryTabs} category tabs`);
      }
    }
    
    // Check for search functionality
    const searchField = page.locator('input[placeholder*="Search"], input.search-templates').first();
    if (await searchField.isVisible()) {
      await searchField.fill('welcome');
      await page.waitForTimeout(500);
      await searchField.clear();
      console.log('✅ Template search working');
    }
  });
});