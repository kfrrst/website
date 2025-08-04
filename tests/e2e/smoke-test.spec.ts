import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Basic Functionality', () => {
  test('server is running and homepage loads', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Check that the page loaded
    await expect(page).toHaveTitle(/\[RE\]Print Studios/);
    
    // Check for main content
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('[RE]Print Studios');
  });

  test('static assets load correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Check CSS loaded
    const styles = await page.evaluate(() => {
      const body = document.querySelector('body');
      return window.getComputedStyle(body!).backgroundColor;
    });
    expect(styles).toBeTruthy();
    
    // Check images load (if any)
    const images = page.locator('img');
    const imageCount = await images.count();
    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        await expect(img).toBeVisible();
      }
    }
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation
    const nav = page.locator('nav, .navigation, header');
    await expect(nav.first()).toBeVisible();
    
    // Check for links
    const links = page.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('responsive design works', async ({ page, viewport }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for any animations
    
    // Content should still be visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Content should still be visible
    await expect(heading).toBeVisible();
  });

  test('error pages work correctly', async ({ page }) => {
    // Try to navigate to a non-existent page
    const response = await page.goto('/non-existent-page.html');
    
    // Server might return 200 with index.html for SPA routing
    // So check if we get redirected or see error content
    const status = response?.status();
    expect([200, 404]).toContain(status);
    
    // If 200, check that we're not on the requested page
    if (status === 200) {
      const url = page.url();
      // We should either be redirected or see an error message
      const hasErrorMessage = await page.locator('text=/404|not found|error/i').count() > 0;
      const isRedirected = !url.includes('non-existent-page.html');
      
      expect(hasErrorMessage || isRedirected).toBeTruthy();
    }
  });
});