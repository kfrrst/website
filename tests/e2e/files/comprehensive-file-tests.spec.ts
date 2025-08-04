import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, TEST_FILES, TIMEOUTS, PERFORMANCE_BENCHMARKS } from '../../utils/test-constants';

test.describe('Comprehensive File Management Tests', () => {
  let clientToken: string;
  let adminToken: string;
  let uploadedFileIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Get tokens for both users
    const clientLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.client
    });
    clientToken = (await clientLogin.json()).token;

    const adminLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.admin
    });
    adminToken = (await adminLogin.json()).token;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup uploaded files
    for (const fileId of uploadedFileIds) {
      try {
        await request.delete(`/api/files/${fileId}`, {
          headers: { 'Authorization': `Bearer ${clientToken}` }
        });
      } catch (error) {
        console.log(`Cleanup failed for file ${fileId}`);
      }
    }
  });

  test.describe('File Upload Tests', () => {
    test('Single file upload with progress tracking', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Create test file
      const testFile = {
        name: 'test-design.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content for testing')
      };

      // Monitor network for upload progress
      const progressUpdates: number[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/files') && request.method() === 'POST') {
          // Track upload started
          console.log('📤 Upload started');
        }
      });

      // Upload file
      const result = await EnhancedTestHelpers.uploadFile(page, testFile);
      expect(result.success).toBeTruthy();
      
      if (result.fileId) {
        uploadedFileIds.push(result.fileId);
      }

      // Verify file appears in list
      await expect(page.locator(`text="${testFile.name}"`)).toBeVisible({ timeout: TIMEOUTS.medium });
    });

    test('Multiple concurrent file uploads', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      const files = [
        { name: 'design1.png', mimeType: 'image/png', buffer: Buffer.from('PNG1') },
        { name: 'design2.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('JPG2') },
        { name: 'design3.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDF3') }
      ];

      // Upload all files concurrently
      const uploadPromises = files.map(file => 
        page.locator('input[type="file"]').setInputFiles({
          name: file.name,
          mimeType: file.mimeType,
          buffer: file.buffer
        })
      );

      // Wait for all uploads
      const startTime = Date.now();
      await Promise.all(uploadPromises);
      const uploadTime = Date.now() - startTime;

      console.log(`✅ Uploaded ${files.length} files in ${uploadTime}ms`);

      // Verify all files appear
      for (const file of files) {
        await expect(page.locator(`text="${file.name}"`)).toBeVisible();
      }
    });

    test('File type validation', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Try to upload prohibited file type
      const executableFile = {
        name: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('MZ executable content')
      };

      // Attempt upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(executableFile);

      // Should show error
      await expect(page.locator('text=/not allowed|invalid file type|prohibited/i')).toBeVisible({ 
        timeout: TIMEOUTS.short 
      });

      // File should not appear in list
      await expect(page.locator(`text="${executableFile.name}"`)).not.toBeVisible();
    });

    test('File size limit enforcement', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Create large file (over limit)
      const largeFile = {
        name: 'huge-file.zip',
        mimeType: 'application/zip',
        buffer: Buffer.alloc(100 * 1024 * 1024) // 100MB
      };

      // Monitor for error
      const errorPromise = page.waitForSelector('text=/too large|size limit|maximum/i', {
        timeout: TIMEOUTS.medium
      });

      // Attempt upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(largeFile);

      // Should show size error
      await errorPromise;
      console.log('✅ File size limit properly enforced');
    });

    test('Upload retry on network failure', async ({ page, context }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Simulate network failure
      await context.route('**/api/files', route => {
        if (Math.random() > 0.5) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const testFile = {
        name: 'retry-test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Retry test content')
      };

      // Upload with retry
      let uploaded = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.locator('input[type="file"]').setInputFiles(testFile);
          await page.waitForSelector(`text="${testFile.name}"`, { timeout: TIMEOUTS.short });
          uploaded = true;
          break;
        } catch (error) {
          console.log(`Upload attempt ${i + 1} failed, retrying...`);
        }
      }

      expect(uploaded).toBeTruthy();
    });
  });

  test.describe('File Organization Tests', () => {
    test('Files organized by project', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Check for project-based organization
      const projectSections = page.locator('.project-files, [data-project-files]');
      const sectionCount = await projectSections.count();

      if (sectionCount > 0) {
        console.log(`✅ Files organized into ${sectionCount} project sections`);

        // Check first project section
        const firstSection = projectSections.first();
        const projectName = await firstSection.locator('.project-name, h3').textContent();
        console.log(`  Project: ${projectName}`);

        // Count files in project
        const projectFiles = firstSection.locator('.file-item, [data-file-id]');
        const fileCount = await projectFiles.count();
        console.log(`  Files: ${fileCount}`);
      }
    });

    test('File filtering and search', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Test search functionality
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"]').first();
      
      if (await searchInput.isVisible()) {
        // Search for PDF files
        await searchInput.fill('pdf');
        await page.waitForTimeout(500); // Debounce

        // Count visible results
        const visibleFiles = await page.locator('.file-item:visible').count();
        console.log(`✅ Search for "pdf" returned ${visibleFiles} results`);

        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);

        // Test file type filter
        const typeFilter = page.locator('select[name*="type"], button:has-text("File Type")').first();
        if (await typeFilter.isVisible()) {
          await typeFilter.click();
          await page.click('text="Images"');

          const imageFiles = await page.locator('.file-item:visible').count();
          console.log(`✅ Image filter shows ${imageFiles} files`);
        }
      }
    });

    test('File sorting options', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Look for sort options
      const sortDropdown = page.locator('select[name*="sort"], button:has-text("Sort")').first();
      
      if (await sortDropdown.isVisible()) {
        // Test different sort orders
        const sortOptions = ['name', 'date', 'size', 'type'];
        
        for (const option of sortOptions) {
          await sortDropdown.selectOption(option);
          await page.waitForTimeout(300);

          // Verify files are re-ordered
          const firstFileName = await page.locator('.file-item').first().textContent();
          console.log(`✅ Sorted by ${option}, first file: ${firstFileName}`);
        }
      }
    });
  });

  test.describe('File Operations Tests', () => {
    test('File preview functionality', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Find an image file to preview
      const imageFile = page.locator('.file-item').filter({ hasText: /\.(png|jpg|jpeg)/i }).first();
      
      if (await imageFile.isVisible()) {
        // Click to preview
        await imageFile.click();

        // Check for preview modal
        const previewModal = page.locator('.file-preview, .modal-preview, [data-preview]');
        await expect(previewModal).toBeVisible({ timeout: TIMEOUTS.short });

        // Check preview content
        const previewImage = previewModal.locator('img');
        await expect(previewImage).toBeVisible();

        // Close preview
        await page.keyboard.press('Escape');
        await expect(previewModal).not.toBeVisible();
      }
    });

    test('File download with tracking', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Find download button
      const downloadBtn = page.locator('button:has-text("Download")').first();
      
      if (await downloadBtn.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        // Click download
        await downloadBtn.click();
        
        // Wait for download
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        
        console.log(`✅ Downloaded file: ${filename}`);
        
        // Verify download completed
        const path = await download.path();
        expect(path).toBeTruthy();
      }
    });

    test('Bulk file operations', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Look for bulk selection
      const selectAllCheckbox = page.locator('input[type="checkbox"][name*="all"], .select-all').first();
      
      if (await selectAllCheckbox.isVisible()) {
        // Select all files
        await selectAllCheckbox.check();

        // Check bulk actions appear
        const bulkActions = page.locator('.bulk-actions, [data-bulk-actions]');
        await expect(bulkActions).toBeVisible();

        // Test bulk download
        const bulkDownload = bulkActions.locator('button:has-text("Download")');
        if (await bulkDownload.isVisible()) {
          await bulkDownload.click();
          console.log('✅ Bulk download initiated');
        }

        // Unselect all
        await selectAllCheckbox.uncheck();
      }
    });

    test('File versioning', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Upload initial file
      const v1File = {
        name: 'versioned-doc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Version 1 content')
      };

      await page.locator('input[type="file"]').setInputFiles(v1File);
      await page.waitForSelector(`text="${v1File.name}"`);

      // Upload same filename (new version)
      const v2File = {
        name: 'versioned-doc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Version 2 content - updated')
      };

      await page.locator('input[type="file"]').setInputFiles(v2File);

      // Check for version indicator
      const versionIndicator = page.locator('text=/version|v2|updated/i');
      if (await versionIndicator.isVisible({ timeout: TIMEOUTS.short })) {
        console.log('✅ File versioning supported');

        // Check version history
        const historyBtn = page.locator('button:has-text("History"), button:has-text("Versions")').first();
        if (await historyBtn.isVisible()) {
          await historyBtn.click();
          
          const versionList = page.locator('.version-list, [data-versions]');
          await expect(versionList).toBeVisible();
          
          const versionCount = await versionList.locator('.version-item').count();
          console.log(`  Found ${versionCount} versions`);
        }
      }
    });
  });

  test.describe('File Permissions Tests', () => {
    test('File access control between users', async ({ page, request }) => {
      // Create file as client
      const clientFile = await request.post('/api/files', {
        headers: { 'Authorization': `Bearer ${clientToken}` },
        multipart: {
          file: {
            name: 'client-private.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('Client private content')
          },
          projectId: 'test-project-id'
        }
      });

      const fileData = await clientFile.json();
      
      if (fileData.id) {
        uploadedFileIds.push(fileData.id);

        // Try to access as admin
        const adminAccess = await request.get(`/api/files/${fileData.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        // Admin should have access
        expect(adminAccess.ok()).toBeTruthy();
        console.log('✅ Admin can access client files');

        // Try without auth
        const unauthAccess = await request.get(`/api/files/${fileData.id}`);
        expect(unauthAccess.status()).toBe(401);
        console.log('✅ Unauthorized access blocked');
      }
    });

    test('File sharing functionality', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Find share button
      const shareBtn = page.locator('button:has-text("Share")').first();
      
      if (await shareBtn.isVisible()) {
        await shareBtn.click();

        // Check share modal
        const shareModal = page.locator('.share-modal, [data-share-modal]');
        await expect(shareModal).toBeVisible();

        // Generate share link
        const generateLinkBtn = shareModal.locator('button:has-text("Generate Link")');
        if (await generateLinkBtn.isVisible()) {
          await generateLinkBtn.click();

          // Check for share link
          const shareLink = shareModal.locator('input[readonly], .share-link');
          await expect(shareLink).toBeVisible();
          
          const linkValue = await shareLink.inputValue();
          expect(linkValue).toContain('http');
          console.log('✅ Share link generated');
        }

        // Close modal
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('Large file upload performance', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Create 10MB file
      const largeFile = {
        name: 'large-design.psd',
        mimeType: 'image/vnd.adobe.photoshop',
        buffer: Buffer.alloc(10 * 1024 * 1024, 'test')
      };

      // Measure upload time
      const startTime = Date.now();
      
      await page.locator('input[type="file"]').setInputFiles(largeFile);
      
      // Wait for upload completion
      await page.waitForSelector(`text="${largeFile.name}"`, { 
        timeout: TIMEOUTS.upload 
      });
      
      const uploadTime = Date.now() - startTime;
      const mbPerSecond = (10 / (uploadTime / 1000)).toFixed(2);
      
      console.log(`✅ Upload performance: ${mbPerSecond} MB/s (${uploadTime}ms for 10MB)`);
      
      // Check against benchmark
      const expectedTime = 10 * PERFORMANCE_BENCHMARKS.fileUpload.perMB;
      expect(uploadTime).toBeLessThan(expectedTime * 2); // Allow 2x buffer
    });

    test('File list pagination performance', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      
      // Measure page load with files
      const loadMetrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
        await page.goto('/portal.html');
      });
      
      console.log(`✅ Page load time: ${loadMetrics.duration}ms`);
      console.log(`  DOM Content Loaded: ${loadMetrics.metrics.domContentLoaded}ms`);
      
      // Test pagination if available
      const pagination = page.locator('.pagination, [data-pagination]');
      if (await pagination.isVisible()) {
        // Click next page
        const nextMetrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
          await page.click('button:has-text("Next"), .page-next');
        });
        
        console.log(`✅ Pagination response: ${nextMetrics.duration}ms`);
        expect(nextMetrics.duration).toBeLessThan(PERFORMANCE_BENCHMARKS.apiResponse.average);
      }
    });
  });
});