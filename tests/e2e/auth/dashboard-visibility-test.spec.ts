import { test, expect } from '@playwright/test';

test.describe('Dashboard Visibility Tests', () => {
  test('Check dashboard visibility after login', async ({ page }) => {
    // Clear storage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to admin portal
    await page.goto('/admin.html');
    await page.waitForLoadState('networkidle');
    
    // Log initial state
    const initialDashboardClasses = await page.locator('#admin-dashboard').getAttribute('class');
    const initialDashboardStyle = await page.locator('#admin-dashboard').getAttribute('style');
    const initialLoginClasses = await page.locator('#login-section').getAttribute('class');
    const initialLoginStyle = await page.locator('#login-section').getAttribute('style');
    
    console.log('Initial state:');
    console.log('Dashboard classes:', initialDashboardClasses);
    console.log('Dashboard style:', initialDashboardStyle);
    console.log('Login classes:', initialLoginClasses);
    console.log('Login style:', initialLoginStyle);
    
    // Fill in credentials
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    
    // Click login and wait for navigation
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login') && resp.status() === 200),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a bit for any transitions
    await page.waitForTimeout(1000);
    
    // Check dashboard state after login
    const finalDashboardClasses = await page.locator('#admin-dashboard').getAttribute('class');
    const finalDashboardStyle = await page.locator('#admin-dashboard').getAttribute('style');
    const finalLoginClasses = await page.locator('#login-section').getAttribute('class');
    const finalLoginStyle = await page.locator('#login-section').getAttribute('style');
    
    console.log('\nAfter login:');
    console.log('Dashboard classes:', finalDashboardClasses);
    console.log('Dashboard style:', finalDashboardStyle);
    console.log('Login classes:', finalLoginClasses);
    console.log('Login style:', finalLoginStyle);
    
    // Check if initializeDashboard was called
    const consoleMessages = await page.evaluate(() => {
      return window.consoleMessages || [];
    });
    
    // Listen for console messages
    page.on('console', msg => {
      console.log('Console:', msg.text());
    });
    
    // Check computed styles
    const dashboardDisplay = await page.locator('#admin-dashboard').evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    const loginDisplay = await page.locator('#login-section').evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    
    console.log('\nComputed styles:');
    console.log('Dashboard display:', dashboardDisplay);
    console.log('Login display:', loginDisplay);
    
    // Check if any JavaScript errors occurred
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    if (jsErrors.length > 0) {
      console.log('\nJavaScript errors:');
      jsErrors.forEach(err => console.log('❌', err));
    }
    
    // Take screenshot
    await page.screenshot({ path: 'dashboard-visibility-test.png', fullPage: true });
  });
});