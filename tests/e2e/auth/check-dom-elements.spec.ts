import { test, expect } from '@playwright/test';

test.describe('Check DOM Elements', () => {
  test('Check client portal DOM after login', async ({ page }) => {
    // Navigate and login
    await page.goto('/portal');
    await page.fill('#email', 'client@example.com');
    await page.fill('#password', 'client123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForResponse(resp => resp.url().includes('/api/auth/login'));
    await page.waitForTimeout(2000);
    
    // Check elements
    const loginScreen = await page.locator('#login-screen').evaluate(el => ({
      exists: true,
      id: el.id,
      classes: el.className,
      style: el.getAttribute('style'),
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility
    })).catch(() => ({ exists: false }));
    
    const dashboard = await page.locator('#dashboard').evaluate(el => ({
      exists: true,
      id: el.id,
      classes: el.className,
      style: el.getAttribute('style'),
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility,
      parent: el.parentElement?.id,
      parentClasses: el.parentElement?.className
    })).catch(() => ({ exists: false }));
    
    console.log('\n=== Login Screen ===');
    console.log(JSON.stringify(loginScreen, null, 2));
    
    console.log('\n=== Dashboard ===');
    console.log(JSON.stringify(dashboard, null, 2));
    
    // Check what showDashboard actually did
    const consoleMessages = [];
    await page.addInitScript(() => {
      const original = console.log;
      window.consoleLogs = [];
      console.log = (...args) => {
        window.consoleLogs.push(args.join(' '));
        original.apply(console, args);
      };
    });
    
    // Try calling showDashboard manually
    const result = await page.evaluate(async () => {
      if (window.portal && window.portal.modules.auth) {
        await window.portal.modules.auth.showDashboard();
        return { success: true, logs: window.consoleLogs };
      }
      return { success: false, error: 'No auth module found' };
    });
    
    console.log('\n=== Manual showDashboard Call ===');
    console.log(result);
    
    // Final state
    const finalDashboard = await page.locator('#dashboard').evaluate(el => ({
      classes: el.className,
      computedDisplay: window.getComputedStyle(el).display
    }));
    
    console.log('\n=== Final Dashboard State ===');
    console.log(finalDashboard);
  });
});