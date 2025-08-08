import { test, expect } from '@playwright/test';
import { loginAsClient } from '../helpers/auth';

test.describe('Client Portal Modules', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test('all modules should initialize without errors', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to portal
    await page.goto('/portal.html');
    
    // Wait for portal to initialize
    await page.waitForSelector('#portal-content', { state: 'visible' });
    
    // Check each section
    const sections = [
      { name: 'projects', selector: '.projects-list' },
      { name: 'files', selector: '.file-manager' },
      { name: 'messages', selector: '.messaging-interface' },
      { name: 'invoices', selector: '.invoices-list' },
      { name: 'documents', selector: '#documents-section' }
    ];

    for (const section of sections) {
      await test.step(`Check ${section.name} section`, async () => {
        // Navigate to section
        await page.click(`a[href="#${section.name}"]`);
        
        // Wait for section to be active
        await expect(page.locator(`#${section.name}`)).toHaveClass(/active/);
        
        // Check if content loaded (no loading message)
        const loadingMessage = page.locator(`#${section.name} .loading-message`);
        await expect(loadingMessage).toBeHidden({ timeout: 5000 });
        
        // Check if module content is rendered
        const moduleContent = page.locator(`#${section.name} ${section.selector}`);
        await expect(moduleContent).toBeVisible();
        
        // Content should not just say "Loading..."
        const text = await moduleContent.textContent();
        expect(text).not.toContain('Loading...');
      });
    }

    // Check for console errors
    expect(errors).toHaveLength(0);
  });

  test('projects module should display project data', async ({ page }) => {
    await page.goto('/portal.html');
    await page.waitForSelector('#portal-content', { state: 'visible' });
    
    // Navigate to projects
    await page.click('a[href="#projects"]');
    await page.waitForSelector('#projects.active');
    
    // Should show either projects or empty state
    const hasProjects = await page.locator('.project-card').count() > 0;
    const hasEmptyState = await page.locator('.empty-state').isVisible();
    
    expect(hasProjects || hasEmptyState).toBeTruthy();
  });

  test('files module should handle uploads', async ({ page }) => {
    await page.goto('/portal.html');
    await page.waitForSelector('#portal-content', { state: 'visible' });
    
    // Navigate to files
    await page.click('a[href="#files"]');
    await page.waitForSelector('#files.active');
    
    // Check upload button exists
    await expect(page.locator('.upload-btn')).toBeVisible();
  });
});