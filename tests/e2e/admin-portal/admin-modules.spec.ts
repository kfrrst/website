import { test, expect } from '@playwright/test';

test.describe('Admin Portal - All Modules', () => {
  const admin = {
    email: 'kendrick@reprintstudios.com',
    password: 'admin123'
  };

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin.html');
    await page.fill('#email', admin.email);
    await page.fill('#password', admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard module loads correctly', async ({ page }) => {
    // Should be on dashboard by default
    await expect(page.locator('[data-module="dashboard"]').first()).toBeVisible();
    
    // Check for dashboard elements
    const dashboardElements = [
      'text=/total clients|active projects|revenue/i',
      '.stats-card, .metric-card, .dashboard-stat',
      'text=/recent activity|quick actions/i'
    ];
    
    for (const selector of dashboardElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found dashboard element: ${selector}`);
      }
    }
  });

  test('Clients module functionality', async ({ page }) => {
    // Navigate to clients
    await page.click('text=Clients, [data-section="clients"]');
    await page.waitForTimeout(1000);
    
    // Check for clients list
    await expect(page.locator('#clients-content, [data-module="clients"]').first()).toBeVisible();
    
    // Look for John Smith
    const johnSmith = page.locator('text=John Smith').first();
    if (await johnSmith.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Found John Smith in clients list');
      
      // Try to view details
      await johnSmith.click();
      await page.waitForTimeout(500);
      
      // Check for client details
      await expect(page.locator('text=client@example.com').first()).toBeVisible();
    }
    
    // Check for add client button
    const addButton = page.locator('button:has-text("Add Client"), button:has-text("New Client")').first();
    expect(addButton).toBeVisible();
  });

  test('Projects module functionality', async ({ page }) => {
    // Navigate to projects
    await page.click('text=Projects, [data-section="projects"]');
    await page.waitForTimeout(1000);
    
    // Check for projects content
    await expect(page.locator('#projects-content, [data-module="projects"]').first()).toBeVisible();
    
    // Look for project elements
    const projectElements = [
      '.project-card, .project-item, tr[data-project-id]',
      'text=/active|completed|pending/i',
      'button:has-text("New Project"), button:has-text("Add Project")'
    ];
    
    for (const selector of projectElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found project element: ${selector}`);
      }
    }
  });

  test('Invoices module functionality', async ({ page }) => {
    // Navigate to invoices
    await page.click('text=Invoices, [data-section="invoices"]');
    await page.waitForTimeout(1000);
    
    // Check for invoices content
    await expect(page.locator('#invoices-content, [data-module="invoices"]').first()).toBeVisible();
    
    // Look for invoice elements
    const invoiceElements = [
      'text=/invoice|payment|amount/i',
      '.invoice-item, .invoice-row, tr[data-invoice-id]',
      'text=/paid|pending|overdue/i',
      'button:has-text("Create Invoice"), button:has-text("New Invoice")'
    ];
    
    for (const selector of invoiceElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found invoice element: ${selector}`);
      }
    }
  });

  test('Files module functionality', async ({ page }) => {
    // Navigate to files
    await page.click('text=Files, [data-section="files"]');
    await page.waitForTimeout(1000);
    
    // Check for files content
    await expect(page.locator('#files-content, [data-module="files"]').first()).toBeVisible();
    
    // Look for file management elements
    const fileElements = [
      '.file-item, .file-card, tr[data-file-id]',
      'text=/upload|download/i',
      'button:has-text("Upload"), input[type="file"]'
    ];
    
    for (const selector of fileElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found file element: ${selector}`);
      }
    }
  });

  test('Messages module functionality', async ({ page }) => {
    // Navigate to messages
    await page.click('text=Messages, [data-section="messages"]');
    await page.waitForTimeout(1000);
    
    // Check for messages content
    await expect(page.locator('#messages-content, [data-module="messages"]').first()).toBeVisible();
    
    // Look for messaging elements
    const messageElements = [
      '.message-list, .conversation-list',
      'text=/inbox|sent|unread/i',
      'button:has-text("Compose"), button:has-text("New Message")'
    ];
    
    for (const selector of messageElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found message element: ${selector}`);
      }
    }
  });

  test('Reports module functionality', async ({ page }) => {
    // Navigate to reports
    await page.click('text=Reports, [data-section="reports"]');
    await page.waitForTimeout(1000);
    
    // Check for reports content
    await expect(page.locator('#reports-content, [data-module="reports"]').first()).toBeVisible();
    
    // Look for report elements
    const reportElements = [
      'text=/analytics|statistics|export/i',
      '.chart-container, .report-chart, canvas',
      'button:has-text("Generate"), button:has-text("Export")'
    ];
    
    for (const selector of reportElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found report element: ${selector}`);
      }
    }
  });

  test('Settings module functionality', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings, [data-section="settings"]');
    await page.waitForTimeout(1000);
    
    // Check for settings content
    await expect(page.locator('#settings-content, [data-module="settings"]').first()).toBeVisible();
    
    // Look for settings elements
    const settingsElements = [
      'text=/email templates|notifications|preferences/i',
      'input[type="checkbox"], input[type="radio"], select',
      'button:has-text("Save"), button:has-text("Update")'
    ];
    
    for (const selector of settingsElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found settings element: ${selector}`);
      }
    }
  });

  test('Navigation between modules', async ({ page }) => {
    const modules = ['dashboard', 'clients', 'projects', 'invoices', 'files', 'messages', 'reports', 'settings'];
    
    for (const module of modules) {
      // Click on navigation
      await page.click(`text=${module}, [data-section="${module}"]`);
      await page.waitForTimeout(500);
      
      // Verify content loaded
      const content = page.locator(`#${module}-content, [data-module="${module}"]`).first();
      await expect(content).toBeVisible();
      console.log(`✅ Navigated to ${module}`);
    }
  });

  test('Logout from admin portal', async ({ page }) => {
    // Find logout button
    await page.click('text=Logout, button:has-text("Logout")');
    
    // Should redirect to admin login
    await expect(page).toHaveURL(/admin\.html/);
    
    // Should show login form
    await expect(page.locator('#email')).toBeVisible();
    
    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});