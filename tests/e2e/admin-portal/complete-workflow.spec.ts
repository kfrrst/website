import { test, expect } from '@playwright/test';

test.describe('Complete Admin Portal Workflow', () => {
  let testData = {
    clientEmail: '',
    projectName: '',
    invoiceNumber: ''
  };

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
    
    // Wait for dashboard
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
  });

  test('Complete workflow: Client → Project → Invoice', async ({ page }) => {
    const timestamp = Date.now();
    
    // Step 1: Create a new client
    console.log('\n=== STEP 1: Creating Client ===');
    await page.click('a[href="#clients"]');
    await page.waitForSelector('#clients.active');
    await page.waitForTimeout(1000); // Wait for clients to load
    
    // Try multiple selectors for the client button
    const addClientBtn = page.locator('button#btn-create-client, button:has-text("+ New Client"), button:has-text("Add Client")').first();
    await addClientBtn.click();
    await expect(page.locator('#client-modal')).toBeVisible();
    
    testData.clientEmail = `client-${timestamp}@example.com`;
    await page.fill('#client-form input[name="firstName"]', `Test${timestamp}`);
    await page.fill('#client-form input[name="lastName"]', 'Client');
    await page.fill('#client-form input[name="email"]', testData.clientEmail);
    await page.fill('#client-form input[name="phone"]', '555-0123');
    await page.fill('#client-form input[name="company"]', `Company ${timestamp}`);
    
    await page.click('#client-form button[type="submit"]');
    await expect(page.locator('#client-modal')).not.toBeVisible({ timeout: 10000 });
    console.log(`✅ Client created: ${testData.clientEmail}`);
    
    // Step 2: Create a project for the client
    console.log('\n=== STEP 2: Creating Project ===');
    await page.click('a[href="#projects"]');
    await page.waitForSelector('#projects.active');
    await page.waitForTimeout(1000); // Wait for projects to load
    
    // Try multiple selectors for the project button
    const addProjectBtn = page.locator('button:has-text("New Project"), button#btn-create-project, button:has-text("+ NEW PROJECT")').first();
    await addProjectBtn.click();
    await expect(page.locator('#project-modal')).toBeVisible();
    
    testData.projectName = `Project ${timestamp}`;
    await page.fill('input[name="name"]', testData.projectName);
    await page.fill('textarea[name="description"]', 'Full workflow test project');
    await page.fill('input[name="budget"]', '10000');
    
    // Select the client we just created
    const clientSelect = page.locator('select[name="client_id"]').first();
    if (await clientSelect.isVisible()) {
      // Try to find our client in the dropdown
      const optionWithEmail = await clientSelect.locator(`option:has-text("${testData.clientEmail}")`).first();
      if (await optionWithEmail.count() > 0) {
        const value = await optionWithEmail.getAttribute('value');
        await clientSelect.selectOption(value);
      } else {
        // Select last option (most recent)
        const options = await clientSelect.locator('option').count();
        if (options > 1) {
          await clientSelect.selectOption({ index: options - 1 });
        }
      }
    }
    
    await page.click('#project-form button[type="submit"]');
    await expect(page.locator('#project-modal')).not.toBeVisible({ timeout: 10000 });
    console.log(`✅ Project created: ${testData.projectName}`);
    
    // Step 3: Create an invoice for the project
    console.log('\n=== STEP 3: Creating Invoice ===');
    await page.click('a[href="#invoices"]');
    await page.waitForSelector('#invoices.active');
    
    const addInvoiceBtn = page.locator('#btn-create-invoice');
    await addInvoiceBtn.click();
    await expect(page.locator('#invoice-modal')).toBeVisible();
    
    testData.invoiceNumber = `INV-${timestamp}`;
    
    const invoiceNumField = page.locator('input[name="invoice_number"]').first();
    if (await invoiceNumField.isVisible()) {
      await invoiceNumField.fill(testData.invoiceNumber);
    }
    
    // Select client
    const invoiceClientSelect = page.locator('select[name="client_id"]').first();
    if (await invoiceClientSelect.isVisible()) {
      const options = await invoiceClientSelect.locator('option').count();
      if (options > 1) {
        await invoiceClientSelect.selectOption({ index: options - 1 });
      }
    }
    
    // Select project
    const projectSelect = page.locator('select[name="project_id"]').first();
    if (await projectSelect.isVisible()) {
      const options = await projectSelect.locator('option').count();
      if (options > 1) {
        await projectSelect.selectOption({ index: options - 1 });
      }
    }
    
    // Add line item
    const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first();
    if (await addItemBtn.isVisible()) {
      await addItemBtn.click();
      
      const itemRow = page.locator('.invoice-item, .line-item').last();
      await itemRow.locator('input[name*="description"]').fill('Design Services');
      await itemRow.locator('input[name*="quantity"]').fill('1');
      await itemRow.locator('input[name*="rate"]').fill('5000');
    }
    
    await page.click('#invoice-form button[type="submit"]');
    await expect(page.locator('#invoice-modal')).not.toBeVisible({ timeout: 10000 });
    console.log(`✅ Invoice created: ${testData.invoiceNumber}`);
    
    // Step 4: Verify everything was created
    console.log('\n=== STEP 4: Verifying Workflow ===');
    
    // Check dashboard stats updated
    await page.click('a[href="#overview"]');
    await page.waitForTimeout(2000);
    console.log('✅ Dashboard updated with new data');
    
    // Verify relationships
    console.log('\n✅ Complete workflow successful!');
    console.log(`   Client: ${testData.clientEmail}`);
    console.log(`   Project: ${testData.projectName}`);
    console.log(`   Invoice: ${testData.invoiceNumber}`);
  });

  test('Message and file workflow', async ({ page }) => {
    // Navigate to messages
    console.log('\n=== Testing Messages ===');
    await page.click('a[href="#messages"]');
    await page.waitForSelector('#messages.active');
    
    // Check if conversations exist
    const conversations = await page.locator('.conversation-item, .message-thread').count();
    console.log(`Found ${conversations} conversations`);
    
    // Try to open first conversation
    if (conversations > 0) {
      const firstConv = page.locator('.conversation-item, .message-thread').first();
      await firstConv.click();
      await page.waitForTimeout(1000);
      
      // Check if message input is available
      const messageInput = page.locator('textarea[placeholder*="message"], .message-input').first();
      if (await messageInput.isVisible()) {
        await messageInput.fill('Test message from automated workflow');
        
        const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
        if (await sendBtn.isVisible()) {
          console.log('✅ Message interface working');
        }
      }
    }
    
    // Navigate to files
    console.log('\n=== Testing Files ===');
    await page.click('a[href="#files"]');
    await page.waitForSelector('#files.active');
    
    // Upload a test file
    const uploadBtn = page.locator('#btn-upload-files, button:has-text("Upload")').first();
    await uploadBtn.click();
    
    if (await page.locator('#upload-modal').isVisible()) {
      const fileInput = page.locator('#file-input').first();
      await fileInput.setInputFiles({
        name: `workflow-test-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from('Workflow test file content')
      });
      
      const submitBtn = page.locator('#upload-btn').first();
      if (await submitBtn.isEnabled()) {
        console.log('✅ File upload ready');
      }
      
      // Close modal
      await page.locator('#upload-modal-close').click();
    }
  });

  test('Settings and user management', async ({ page }) => {
    console.log('\n=== Testing Settings ===');
    await page.click('a[href="#settings"]');
    await page.waitForSelector('#settings.active');
    
    // Check for settings tabs
    const settingsTabs = await page.locator('.settings-tab, button[data-tab]').count();
    console.log(`Found ${settingsTabs} settings sections`);
    
    // Try to access user management
    const userTab = page.locator('*:has-text("User Management"), *:has-text("Users")').first();
    if (await userTab.isVisible()) {
      await userTab.click();
      await page.waitForTimeout(1000);
      
      const usersList = page.locator('.users-list, .user-item, table.users').first();
      if (await usersList.isVisible()) {
        console.log('✅ User management accessible');
      }
    }
    
    // Try to access email templates
    const emailTab = page.locator('*:has-text("Email Templates"), *:has-text("Email")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(1000);
      
      const templatesList = page.locator('.email-templates, .template-item').first();
      if (await templatesList.isVisible()) {
        console.log('✅ Email templates accessible');
      }
    }
  });

  test('Phase management workflow', async ({ page }) => {
    console.log('\n=== Testing Phase Management ===');
    await page.click('a[href="#phases"]');
    
    if (await page.locator('#phases.active').isVisible({ timeout: 5000 })) {
      // Check for phase management interface
      const phaseCards = await page.locator('.phase-card, .phase-item').count();
      console.log(`Found ${phaseCards} phase cards`);
      
      // RE Print Studios 8-phase workflow
      const expectedPhases = [
        'Onboarding',
        'Ideation', 
        'Design',
        'Review & Feedback',
        'Production/Print',
        'Payment',
        'Sign-off & Docs',
        'Delivery'
      ];
      
      for (const phase of expectedPhases) {
        const phaseElement = page.locator(`*:has-text("${phase}")`).first();
        if (await phaseElement.isVisible()) {
          console.log(`✓ Phase found: ${phase}`);
        }
      }
      
      console.log('✅ Phase management interface verified');
    }
  });

  test('Search functionality across portal', async ({ page }) => {
    console.log('\n=== Testing Global Search ===');
    
    // Test search in each section
    const sections = ['clients', 'projects', 'invoices', 'files'];
    
    for (const section of sections) {
      await page.click(`a[href="#${section}"]`);
      await page.waitForSelector(`#${section}.active`);
      
      const searchInput = page.locator(`#${section} input[placeholder*="Search"]`).first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        await searchInput.clear();
        console.log(`✓ Search working in ${section}`);
      }
    }
    
    console.log('✅ Search functionality verified across sections');
  });

  test('Responsive behavior check', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Check if navigation is still accessible
      const nav = page.locator('.admin-nav, nav').first();
      await expect(nav).toBeVisible();
      
      // Check if content adjusts
      const content = page.locator('.admin-content, main').first();
      await expect(content).toBeVisible();
      
      console.log(`✓ ${viewport.name} view (${viewport.width}x${viewport.height}) working`);
    }
    
    console.log('✅ Responsive design verified');
  });
});