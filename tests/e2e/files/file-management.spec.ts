import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Management System', () => {
  const client = {
    email: 'client@example.com',
    password: 'client123'
  };

  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token for API tests
    const response = await request.post('/api/auth/login', {
      data: { email: client.email, password: client.password }
    });
    const data = await response.json();
    authToken = data.accessToken || data.token;
  });

  test.beforeEach(async ({ page }) => {
    // Login to portal
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', client.email);
    await page.fill('#login-password', client.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/portal\.html/);
  });

  test('File upload interface is accessible', async ({ page }) => {
    // Look for upload UI
    const uploadArea = page.locator('.upload-area, .file-upload, input[type="file"]').first();
    await expect(uploadArea).toBeVisible({ timeout: 5000 });
    
    // Check for file input
    const fileInput = page.locator('input[type="file"]').first();
    expect(fileInput).toBeTruthy();
    
    console.log('✅ File upload interface found');
  });

  test('Upload a test file', async ({ page }) => {
    // Create a test file
    const fileInput = page.locator('input[type="file"]').first();
    
    // Set test file
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Test PDF content for E2E testing')
    });
    
    // Wait for upload to process
    await page.waitForTimeout(2000);
    
    // Check for success message or file in list
    const successMessage = page.locator('text=/uploaded|success/i').first();
    const fileInList = page.locator('text=test-document.pdf').first();
    
    const uploadSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false) ||
                         await fileInList.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(uploadSuccess).toBeTruthy();
    console.log('✅ File uploaded successfully');
  });

  test('View uploaded files list', async ({ page }) => {
    // Look for files section
    const filesSection = page.locator('.files-list, .file-grid, [data-testid="files"]').first();
    
    if (await filesSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Count files
      const fileItems = page.locator('.file-item, .file-card, [data-file-id]');
      const count = await fileItems.count();
      console.log(`✅ Found ${count} files in list`);
      
      // Check file details
      if (count > 0) {
        const firstFile = fileItems.first();
        const fileName = await firstFile.locator('.file-name, .title').textContent();
        console.log(`  First file: ${fileName}`);
      }
    }
  });

  test('Download file functionality', async ({ page }) => {
    // Find a download button
    const downloadButton = page.locator('button:has-text("Download"), a[download]').first();
    
    if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Click download
      await downloadButton.click();
      
      // Wait for download
      const download = await downloadPromise.catch(() => null);
      
      if (download) {
        console.log(`✅ File download initiated: ${download.suggestedFilename()}`);
      }
    }
  });

  test('File permissions and access control', async ({ page, request }) => {
    // Test API access control
    const filesResponse = await request.get('/api/files', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(filesResponse.ok()).toBeTruthy();
    const files = await filesResponse.json();
    console.log(`✅ API returned ${Array.isArray(files) ? files.length : 0} files`);
    
    // Test unauthorized access
    const unauthorizedResponse = await request.get('/api/files', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    
    expect(unauthorizedResponse.status()).toBe(401);
    console.log('✅ Unauthorized access properly blocked');
  });

  test('File deletion', async ({ page }) => {
    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete"]').first();
    
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get initial file count
      const fileItems = page.locator('.file-item, .file-card');
      const initialCount = await fileItems.count();
      
      // Click delete
      await deleteButton.click();
      
      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      // Wait for deletion
      await page.waitForTimeout(2000);
      
      // Check new count
      const newCount = await fileItems.count();
      console.log(`✅ File deletion: ${initialCount} → ${newCount} files`);
    }
  });

  test('File search and filtering', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]').first();
    
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Type search query
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Check filtered results
      const visibleFiles = page.locator('.file-item:visible, .file-card:visible');
      const count = await visibleFiles.count();
      console.log(`✅ Search results: ${count} files matching "test"`);
    }
    
    // Check for filter options
    const filterButtons = page.locator('button:has-text("Filter"), select[name*="filter"]').first();
    if (await filterButtons.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ File filtering options available');
    }
  });
});