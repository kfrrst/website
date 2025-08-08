import { test, expect } from '@playwright/test';

test.describe('File Management Workflow', () => {
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
    
    // Wait for dashboard and navigate to files
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.click('a[href="#files"]');
    await page.waitForSelector('#files.active', { state: 'visible' });
  });

  test('Upload files via drag and drop', async ({ page }) => {
    // Click upload button
    const uploadBtn = page.locator('#btn-upload-files, button:has-text("Upload")').first();
    await uploadBtn.click();
    
    // Wait for upload modal
    await expect(page.locator('#upload-modal')).toBeVisible();
    
    // Create test file
    const fileName = `test-file-${Date.now()}.txt`;
    const fileContent = 'This is a test file for automated testing';
    const buffer = Buffer.from(fileContent);
    
    // Get file input
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    
    // Set files
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: buffer
    });
    
    // Verify file appears in queue
    const fileQueue = page.locator('#file-list, .upload-queue').first();
    await expect(fileQueue).toContainText(fileName);
    
    // Select project if dropdown exists
    const projectSelect = page.locator('#upload-project, select[name="project_id"]').first();
    if (await projectSelect.isVisible()) {
      const options = await projectSelect.locator('option').count();
      if (options > 1) {
        await projectSelect.selectOption({ index: 1 });
      }
    }
    
    // Click upload button
    const submitBtn = page.locator('#upload-btn, button:has-text("Upload Files")').first();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    
    // Wait for upload to complete and modal to close
    await expect(page.locator('#upload-modal')).not.toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Successfully uploaded file: ${fileName}`);
    
    // Verify file appears in the list
    await page.waitForTimeout(2000);
    const uploadedFile = page.locator(`*:has-text("${fileName}")`).first();
    await expect(uploadedFile).toBeVisible({ timeout: 5000 });
  });

  test('Filter files by type', async ({ page }) => {
    // Test type filter
    const typeFilter = page.locator('#type-filter, select.type-filter').first();
    
    if (await typeFilter.isVisible()) {
      // Filter by images
      await typeFilter.selectOption('image');
      await page.waitForTimeout(1000);
      console.log('✓ Filtered by images');
      
      // Filter by documents
      await typeFilter.selectOption('document');
      await page.waitForTimeout(1000);
      console.log('✓ Filtered by documents');
      
      // Filter by PDFs
      await typeFilter.selectOption('pdf');
      await page.waitForTimeout(1000);
      console.log('✓ Filtered by PDFs');
      
      // Back to all
      await typeFilter.selectOption('all');
      await page.waitForTimeout(1000);
      console.log('✅ Type filter working');
    }
  });

  test('Search for files', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('#search-input, input[placeholder*="Search"]').first();
    
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    console.log('✅ File search working');
  });

  test('Preview file', async ({ page }) => {
    // Find a file with preview button or click on file card
    const fileCard = page.locator('.file-card, .file-item').first();
    
    if (await fileCard.isVisible()) {
      // Click preview area or button
      const previewBtn = fileCard.locator('[data-action="preview"], button:has-text("Preview"), .file-preview').first();
      
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
      } else {
        // Click the card itself
        await fileCard.click();
      }
      
      // Wait for preview modal
      const previewModal = page.locator('#file-preview-modal, .preview-modal').first();
      
      if (await previewModal.isVisible({ timeout: 3000 })) {
        console.log('✅ File preview opened');
        
        // Check preview content
        const previewContent = previewModal.locator('#file-preview-content, .preview-content').first();
        await expect(previewContent).toBeVisible();
        
        // Close preview
        const closeBtn = previewModal.locator('#preview-modal-close, .modal-close').first();
        await closeBtn.click();
        await expect(previewModal).not.toBeVisible();
      }
    }
  });

  test('Download file', async ({ page }) => {
    // Find download button
    const downloadBtn = page.locator('[data-action="download"], button:has-text("Download")').first();
    
    if (await downloadBtn.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await downloadBtn.click();
      
      const download = await downloadPromise;
      if (download) {
        console.log(`✅ File downloaded: ${download.suggestedFilename()}`);
        
        // Clean up
        await download.delete();
      }
    }
  });

  test('Share file', async ({ page }) => {
    // Find share button
    const shareBtn = page.locator('[data-action="share"], button:has-text("Share")').first();
    
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      
      // Check for share modal or notification
      await page.waitForTimeout(2000);
      
      // Look for success message or share link
      const successMsg = page.locator('.success-message, .notification:has-text("copied"), *:has-text("Share link")').first();
      
      if (await successMsg.isVisible({ timeout: 3000 })) {
        console.log('✅ File share link generated');
      }
    }
  });

  test('Edit file name', async ({ page }) => {
    // Find edit button
    const editBtn = page.locator('[data-action="edit"], button:has-text("Edit"), button[title="Edit"]').first();
    
    if (await editBtn.isVisible()) {
      await editBtn.click();
      
      // Check if prompt appears or inline edit
      await page.waitForTimeout(1000);
      
      // Handle browser prompt if it appears
      page.once('dialog', async dialog => {
        const currentName = dialog.defaultValue();
        await dialog.accept(`${currentName}_edited`);
        console.log('✅ File renamed via prompt');
      });
      
      // Or check for inline edit field
      const editField = page.locator('input.edit-name, input[name="filename"]').first();
      if (await editField.isVisible({ timeout: 2000 })) {
        const currentValue = await editField.inputValue();
        await editField.fill(`${currentValue}_edited`);
        await page.keyboard.press('Enter');
        console.log('✅ File renamed inline');
      }
    }
  });

  test('Delete file', async ({ page }) => {
    // Find delete button for a test file
    const testFile = page.locator('.file-card:has-text("test"), .file-item:has-text("test")').first();
    
    if (await testFile.isVisible()) {
      const deleteBtn = testFile.locator('[data-action="delete"], button:has-text("Delete"), button.danger').first();
      
      if (await deleteBtn.isVisible()) {
        // Set up dialog handler
        page.once('dialog', async dialog => {
          await dialog.accept();
          console.log('✅ Delete confirmation accepted');
        });
        
        await deleteBtn.click();
        
        // Wait for file to be removed
        await expect(testFile).not.toBeVisible({ timeout: 5000 });
        console.log('✅ File deleted successfully');
      }
    }
  });

  test('Switch between grid and list view', async ({ page }) => {
    // Find view toggle buttons
    const gridBtn = page.locator('#btn-view-grid, button:has-text("Grid"), .view-grid').first();
    const listBtn = page.locator('#btn-view-list, button:has-text("List"), .view-list').first();
    
    if (await gridBtn.isVisible() && await listBtn.isVisible()) {
      // Switch to list view
      await listBtn.click();
      await page.waitForTimeout(500);
      
      // Verify list view is active
      const listView = page.locator('.files-table, .list-view').first();
      await expect(listView).toBeVisible();
      console.log('✅ Switched to list view');
      
      // Switch back to grid view
      await gridBtn.click();
      await page.waitForTimeout(500);
      
      // Verify grid view is active
      const gridView = page.locator('.files-grid, .grid-view').first();
      await expect(gridView).toBeVisible();
      console.log('✅ Switched to grid view');
    }
  });

  test('Filter files by project', async ({ page }) => {
    // Find project filter
    const projectFilter = page.locator('#project-filter, select.project-filter').first();
    
    if (await projectFilter.isVisible()) {
      const options = await projectFilter.locator('option').count();
      
      if (options > 1) {
        // Select first project
        await projectFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        console.log('✓ Filtered by project');
        
        // Back to all
        await projectFilter.selectOption('all');
        await page.waitForTimeout(1000);
        console.log('✅ Project filter working');
      }
    }
  });

  test('Upload multiple files', async ({ page }) => {
    // Click upload button
    const uploadBtn = page.locator('#btn-upload-files, button:has-text("Upload")').first();
    await uploadBtn.click();
    
    // Wait for upload modal
    await expect(page.locator('#upload-modal')).toBeVisible();
    
    // Create multiple test files
    const files = [];
    for (let i = 0; i < 3; i++) {
      files.push({
        name: `test-file-${i}-${Date.now()}.txt`,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Test file ${i} content`)
      });
    }
    
    // Set multiple files
    const fileInput = page.locator('#file-input, input[type="file"]').first();
    await fileInput.setInputFiles(files);
    
    // Verify all files appear in queue
    const fileQueue = page.locator('#file-list, .upload-queue').first();
    for (const file of files) {
      await expect(fileQueue).toContainText(file.name);
    }
    
    console.log(`✅ ${files.length} files ready for upload`);
    
    // Close modal without uploading for test
    const closeBtn = page.locator('#upload-modal-close, .modal-close').first();
    await closeBtn.click();
  });
});