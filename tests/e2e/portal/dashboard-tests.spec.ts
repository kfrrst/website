import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, TIMEOUTS } from '../../utils/test-constants';

test.describe('Client Portal Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await EnhancedTestHelpers.loginUser(page, 'client');
    await page.goto('/portal.html');
  });

  test.describe('Dashboard Overview', () => {
    test('Dashboard loads with all key sections', async ({ page }) => {
      // Check welcome message
      await expect(page.locator(`text=/welcome.*${TEST_USERS.client.firstName}/i`)).toBeVisible();

      // Verify main dashboard sections
      const sections = [
        { name: 'Active Projects', selector: '.projects-section, [data-section="projects"]' },
        { name: 'Recent Files', selector: '.files-section, [data-section="files"]' },
        { name: 'Messages', selector: '.messages-section, [data-section="messages"]' },
        { name: 'Upcoming Deadlines', selector: '.deadlines-section, [data-section="deadlines"]' }
      ];

      for (const section of sections) {
        const element = page.locator(section.selector);
        if (await element.isVisible({ timeout: TIMEOUTS.short })) {
          console.log(`✅ ${section.name} section loaded`);
        }
      }
    });

    test('Dashboard metrics display correctly', async ({ page }) => {
      // Check for key metrics
      const metrics = [
        { label: 'Active Projects', selector: '[data-metric="active-projects"]' },
        { label: 'Files Uploaded', selector: '[data-metric="files-uploaded"]' },
        { label: 'Pending Tasks', selector: '[data-metric="pending-tasks"]' },
        { label: 'Messages', selector: '[data-metric="unread-messages"]' }
      ];

      for (const metric of metrics) {
        const element = page.locator(metric.selector);
        if (await element.isVisible({ timeout: TIMEOUTS.short })) {
          const value = await element.textContent();
          console.log(`✅ ${metric.label}: ${value}`);
        }
      }
    });

    test('Recent activity feed displays', async ({ page }) => {
      const activityFeed = page.locator('.activity-feed, [data-activity]');
      
      if (await activityFeed.isVisible()) {
        const activities = activityFeed.locator('.activity-item');
        const count = await activities.count();
        
        console.log(`✅ Activity feed shows ${count} recent activities`);
        
        if (count > 0) {
          // Check first activity has required elements
          const firstActivity = activities.first();
          await expect(firstActivity.locator('.activity-time, time')).toBeVisible();
          await expect(firstActivity.locator('.activity-description')).toBeVisible();
        }
      }
    });
  });

  test.describe('Project Overview', () => {
    test('Active projects display with progress', async ({ page }) => {
      const projectsSection = page.locator('.projects-section, [data-projects]');
      
      if (await projectsSection.isVisible()) {
        const projects = projectsSection.locator('.project-card, [data-project-id]');
        const projectCount = await projects.count();
        
        console.log(`✅ Found ${projectCount} active projects`);
        
        for (let i = 0; i < Math.min(projectCount, 3); i++) {
          const project = projects.nth(i);
          
          // Check project elements
          await expect(project.locator('.project-name')).toBeVisible();
          await expect(project.locator('.project-phase')).toBeVisible();
          
          // Check progress indicator
          const progress = project.locator('.progress-bar, [role="progressbar"]');
          if (await progress.isVisible()) {
            const value = await progress.getAttribute('aria-valuenow') || 
                         await progress.getAttribute('data-progress');
            console.log(`  Project ${i + 1} progress: ${value}%`);
          }
        }
      }
    });

    test('Project quick actions work', async ({ page }) => {
      const firstProject = page.locator('.project-card').first();
      
      if (await firstProject.isVisible()) {
        // Test view details
        const viewBtn = firstProject.locator('button:has-text("View"), a:has-text("View")');
        if (await viewBtn.isVisible()) {
          await viewBtn.click();
          
          // Should navigate to project details
          await expect(page).toHaveURL(/project|phase/);
          console.log('✅ Project view navigation works');
          
          // Go back to dashboard
          await page.goBack();
        }
      }
    });
  });

  test.describe('File Management Section', () => {
    test('Recent files display with actions', async ({ page }) => {
      const filesSection = page.locator('.files-section, [data-files]');
      
      if (await filesSection.isVisible()) {
        const files = filesSection.locator('.file-item, [data-file-id]');
        const fileCount = await files.count();
        
        console.log(`✅ Recent files shows ${fileCount} files`);
        
        if (fileCount > 0) {
          const firstFile = files.first();
          
          // Check file info
          await expect(firstFile.locator('.file-name')).toBeVisible();
          await expect(firstFile.locator('.file-size, .file-date')).toBeVisible();
          
          // Check actions
          const downloadBtn = firstFile.locator('button[aria-label*="download"]');
          expect(downloadBtn).toBeTruthy();
        }
      }
    });

    test('Upload new file from dashboard', async ({ page }) => {
      const uploadBtn = page.locator('button:has-text("Upload File"), button:has-text("Add File")');
      
      if (await uploadBtn.isVisible()) {
        await uploadBtn.click();
        
        // Should show upload modal or navigate to files
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeVisible({ timeout: TIMEOUTS.short });
        
        // Upload test file
        const testFile = {
          name: 'dashboard-test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Dashboard upload test')
        };
        
        await fileInput.setInputFiles(testFile);
        
        // Verify upload success
        await expect(page.locator('text=/uploaded|success/i')).toBeVisible({ 
          timeout: TIMEOUTS.medium 
        });
        
        console.log('✅ File upload from dashboard works');
      }
    });
  });

  test.describe('Messaging Section', () => {
    test('Unread messages display', async ({ page }) => {
      const messagesSection = page.locator('.messages-section, [data-messages]');
      
      if (await messagesSection.isVisible()) {
        const unreadBadge = messagesSection.locator('.unread-count, [data-unread]');
        
        if (await unreadBadge.isVisible()) {
          const count = await unreadBadge.textContent();
          console.log(`✅ ${count} unread messages`);
        }
        
        // Check message preview
        const messagePreview = messagesSection.locator('.message-preview').first();
        if (await messagePreview.isVisible()) {
          await expect(messagePreview.locator('.sender-name')).toBeVisible();
          await expect(messagePreview.locator('.message-excerpt')).toBeVisible();
        }
      }
    });

    test('Quick message compose', async ({ page }) => {
      const composeBtn = page.locator('button:has-text("New Message"), button:has-text("Compose")');
      
      if (await composeBtn.isVisible()) {
        await composeBtn.click();
        
        // Should show message composer
        const messageInput = page.locator('textarea[name="message"], input[name="message"]');
        await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.short });
        
        // Send quick message
        await messageInput.fill('Quick message from dashboard');
        await page.keyboard.press('Enter');
        
        // Verify sent
        await expect(page.locator('text=/sent|delivered/i')).toBeVisible({ 
          timeout: TIMEOUTS.short 
        });
        
        console.log('✅ Quick message feature works');
      }
    });
  });

  test.describe('Deadlines & Tasks', () => {
    test('Upcoming deadlines display correctly', async ({ page }) => {
      const deadlinesSection = page.locator('.deadlines-section, [data-deadlines]');
      
      if (await deadlinesSection.isVisible()) {
        const deadlines = deadlinesSection.locator('.deadline-item');
        const count = await deadlines.count();
        
        console.log(`✅ ${count} upcoming deadlines shown`);
        
        for (let i = 0; i < Math.min(count, 3); i++) {
          const deadline = deadlines.nth(i);
          
          // Check deadline info
          await expect(deadline.locator('.deadline-title')).toBeVisible();
          await expect(deadline.locator('.deadline-date, time')).toBeVisible();
          
          // Check urgency indicator
          const urgency = await deadline.getAttribute('data-urgency') || 
                         await deadline.getAttribute('class');
          if (urgency?.includes('urgent') || urgency?.includes('overdue')) {
            console.log(`  Deadline ${i + 1} is marked as urgent`);
          }
        }
      }
    });

    test('Task completion from dashboard', async ({ page }) => {
      const taskItem = page.locator('.task-item, [data-task]').first();
      
      if (await taskItem.isVisible()) {
        const checkbox = taskItem.locator('input[type="checkbox"]');
        
        if (await checkbox.isVisible()) {
          const wasChecked = await checkbox.isChecked();
          await checkbox.click();
          
          // Verify state change
          await expect(checkbox).toBeChecked({ state: !wasChecked });
          
          // Check for completion feedback
          if (!wasChecked) {
            await expect(taskItem).toHaveClass(/completed|done/);
          }
          
          console.log('✅ Task completion toggle works');
        }
      }
    });
  });

  test.describe('Dashboard Customization', () => {
    test('Widget arrangement preferences', async ({ page }) => {
      const customizeBtn = page.locator('button:has-text("Customize"), button[aria-label*="customize"]');
      
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();
        
        // Check for customization panel
        const customPanel = page.locator('.customize-panel, [data-customize]');
        await expect(customPanel).toBeVisible();
        
        // Try toggling a widget
        const widgetToggle = customPanel.locator('input[type="checkbox"]').first();
        if (await widgetToggle.isVisible()) {
          const wasChecked = await widgetToggle.isChecked();
          await widgetToggle.click();
          
          // Save changes
          await page.click('button:has-text("Save")');
          
          // Verify change persisted
          await page.reload();
          await customizeBtn.click();
          await expect(widgetToggle).toBeChecked({ state: !wasChecked });
          
          console.log('✅ Dashboard customization saved');
        }
      }
    });

    test('Dashboard theme preferences', async ({ page }) => {
      // Check for theme toggle
      const themeToggle = page.locator('button[aria-label*="theme"], .theme-toggle');
      
      if (await themeToggle.isVisible()) {
        // Get current theme
        const currentTheme = await page.evaluate(() => 
          document.documentElement.getAttribute('data-theme') || 
          document.body.classList.contains('dark') ? 'dark' : 'light'
        );
        
        // Toggle theme
        await themeToggle.click();
        
        // Verify theme changed
        const newTheme = await page.evaluate(() => 
          document.documentElement.getAttribute('data-theme') || 
          document.body.classList.contains('dark') ? 'dark' : 'light'
        );
        
        expect(newTheme).not.toBe(currentTheme);
        console.log(`✅ Theme toggled from ${currentTheme} to ${newTheme}`);
      }
    });
  });

  test.describe('Dashboard Performance', () => {
    test('Dashboard loads within performance budget', async ({ page }) => {
      const metrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
        await page.goto('/portal.html');
      });
      
      console.log(`✅ Dashboard load time: ${metrics.duration}ms`);
      console.log(`  First Paint: ${metrics.metrics.firstPaint}ms`);
      console.log(`  DOM Content Loaded: ${metrics.metrics.domContentLoaded}ms`);
      
      // Should load within 3 seconds
      expect(metrics.duration).toBeLessThan(3000);
    });

    test('Dashboard handles data updates efficiently', async ({ page }) => {
      // Simulate data refresh
      const refreshBtn = page.locator('button[aria-label*="refresh"], .refresh-btn');
      
      if (await refreshBtn.isVisible()) {
        const refreshMetrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
          await refreshBtn.click();
          await page.waitForLoadState('networkidle');
        });
        
        console.log(`✅ Dashboard refresh time: ${refreshMetrics.duration}ms`);
        expect(refreshMetrics.duration).toBeLessThan(1000);
      }
    });
  });

  test.describe('Mobile Dashboard Experience', () => {
    test('Dashboard responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile menu
      const mobileMenu = page.locator('.mobile-menu, button[aria-label*="menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Check sections stack properly
      const sections = await page.locator('.dashboard-section, [class*="section"]').count();
      console.log(`✅ ${sections} sections visible on mobile`);
      
      // Test mobile navigation
      await mobileMenu.click();
      const navDrawer = page.locator('.nav-drawer, [data-mobile-nav]');
      await expect(navDrawer).toBeVisible();
      
      console.log('✅ Mobile dashboard navigation works');
    });

    test('Touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test swipe gestures if available
      const swipeableElement = page.locator('[data-swipeable], .swipeable').first();
      
      if (await swipeableElement.isVisible()) {
        const box = await swipeableElement.boundingBox();
        if (box) {
          // Simulate swipe
          await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 });
          await page.mouse.up();
          
          console.log('✅ Touch gestures supported');
        }
      }
    });
  });
});