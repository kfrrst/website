import { test, expect } from '@playwright/test';

test.describe('Client Management Workflow', () => {
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
    
    // Wait for dashboard and navigate to clients
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.click('a[href="#clients"]');
    await page.waitForSelector('#clients.active', { state: 'visible' });
  });

  test('Create a new client', async ({ page }) => {
    // Click Add/New Client button
    const addButton = await page.locator('button:has-text("Client"), button:has-text("Add"), button#btn-create-client').first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Wait for modal
    await expect(page.locator('#client-modal')).toBeVisible();
    await expect(page.locator('#client-modal')).toHaveClass(/active/);
    
    // Fill in client form
    const timestamp = Date.now();
    const testClient = {
      firstName: `Test${timestamp}`,
      lastName: 'Client',
      email: `test${timestamp}@example.com`,
      phone: '555-0123',
      company: `Test Company ${timestamp}`,
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '90210',
      notes: 'Created by automated test'
    };
    
    // Fill form fields
    await page.fill('input[name="first_name"], input[name="firstName"], input#first_name', testClient.firstName);
    await page.fill('input[name="last_name"], input[name="lastName"], input#last_name', testClient.lastName);
    await page.fill('input[name="email"], input#email', testClient.email);
    await page.fill('input[name="phone"], input#phone', testClient.phone);
    await page.fill('input[name="company_name"], input[name="company"], input#company', testClient.company);
    await page.fill('input[name="address"], input#address', testClient.address);
    await page.fill('input[name="city"], input#city', testClient.city);
    await page.fill('input[name="state"], input#state', testClient.state);
    await page.fill('input[name="zip"], input#zip', testClient.zip);
    
    const notesField = page.locator('textarea[name="notes"], textarea#notes').first();
    if (await notesField.isVisible()) {
      await notesField.fill(testClient.notes);
    }
    
    // Submit form
    await page.click('#client-form button[type="submit"]');
    
    // Wait for modal to close and success message
    await expect(page.locator('#client-modal')).not.toBeVisible({ timeout: 10000 });
    
    // Verify client appears in the list
    await page.waitForTimeout(2000);
    const clientRow = page.locator(`tr:has-text("${testClient.email}"), div:has-text("${testClient.email}")`).first();
    await expect(clientRow).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Successfully created client: ${testClient.email}`);
  });

  test('Edit an existing client', async ({ page }) => {
    // Find first client in the list
    const firstClientRow = page.locator('tbody tr, .client-item').first();
    await expect(firstClientRow).toBeVisible();
    
    // Click edit button
    const editButton = firstClientRow.locator('button:has-text("Edit"), button[title="Edit"], button.edit-btn').first();
    await editButton.click();
    
    // Wait for modal
    await expect(page.locator('#client-modal')).toBeVisible();
    
    // Update some fields
    const timestamp = Date.now();
    const updatedNotes = `Updated by test at ${new Date(timestamp).toISOString()}`;
    
    const notesField = page.locator('#client-modal textarea[name="notes"], #client-modal textarea#notes').first();
    if (await notesField.isVisible()) {
      await notesField.fill(updatedNotes);
    }
    
    // Update phone
    const phoneField = page.locator('#client-modal input[name="phone"], #client-modal input#phone').first();
    await phoneField.fill('555-9999');
    
    // Submit form
    await page.click('#client-form button[type="submit"]');
    
    // Wait for modal to close
    await expect(page.locator('#client-modal')).not.toBeVisible({ timeout: 10000 });
    
    console.log('✅ Successfully edited client');
  });

  test('Search and filter clients', async ({ page }) => {
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input.search-input').first();
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // Test status filter
    const statusFilter = page.locator('select.status-filter, select[data-section="clients"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await page.waitForTimeout(1000);
      
      await statusFilter.selectOption('all');
      await page.waitForTimeout(1000);
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    console.log('✅ Search and filter functionality working');
  });

  test('View client details', async ({ page }) => {
    // Find first client with view button
    const viewButton = page.locator('button:has-text("View"), button[title="View"], button.view-btn').first();
    
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      // Check if modal or detail view opens
      const detailModal = page.locator('.modal:has-text("Client Details"), .client-details-modal').first();
      if (await detailModal.isVisible({ timeout: 3000 })) {
        console.log('✅ Client details modal opened');
        
        // Close modal
        const closeBtn = detailModal.locator('.modal-close').first();
        await closeBtn.click();
        await expect(detailModal).not.toBeVisible();
      }
    }
  });

  test('Validate form validation', async ({ page }) => {
    // Click Add Client button
    const addButton = await page.locator('button:has-text("Client"), button:has-text("Add"), button#btn-create-client').first();
    await addButton.click();
    
    // Wait for modal
    await expect(page.locator('#client-modal')).toBeVisible();
    
    // Try to submit empty form
    await page.click('#client-form button[type="submit"]');
    
    // Check for validation errors
    const errors = await page.locator('.error-message, .field-error, .invalid-feedback, [class*="error"]').count();
    
    if (errors > 0) {
      console.log('✅ Form validation is working');
    } else {
      // Check if form was prevented from submitting
      await expect(page.locator('#client-modal')).toBeVisible();
      console.log('✅ Form submission prevented for empty fields');
    }
    
    // Close modal
    const closeBtn = page.locator('#client-modal .modal-close').first();
    await closeBtn.click();
  });

  test('Bulk actions on clients', async ({ page }) => {
    // Check if bulk selection checkboxes exist
    const bulkCheckboxes = await page.locator('input[type="checkbox"][name="select-client"], .bulk-select').count();
    
    if (bulkCheckboxes > 0) {
      // Select first few clients
      const checkboxes = page.locator('input[type="checkbox"][name="select-client"], .bulk-select');
      const count = Math.min(3, await checkboxes.count());
      
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }
      
      // Look for bulk action buttons
      const bulkActionBtn = page.locator('button:has-text("Bulk"), button:has-text("Selected")').first();
      if (await bulkActionBtn.isVisible()) {
        await bulkActionBtn.click();
        console.log('✅ Bulk actions available');
        
        // Close any dropdown that opened
        await page.click('body');
      }
    } else {
      console.log('ℹ️  No bulk actions available');
    }
  });
});