import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies and localStorage before each test
    await context.clearCookies();
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });
  
  test('Admin portal login flow', async ({ page }) => {
    // Navigate to admin portal
    await page.goto('/admin.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're already logged in
    const isDashboardVisible = await page.locator('#admin-dashboard').isVisible();
    if (isDashboardVisible) {
      console.log('Already logged in, logging out first...');
      // Click logout if we're already logged in
      const logoutBtn = page.locator('#logout-btn');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Now check we're on the login page
    await expect(page.locator('#login-section h1')).toContainText('[Admin Access]');
    
    // Fill in credentials
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check if we're now on the dashboard
    const dashboardVisible = await page.locator('#admin-dashboard').isVisible();
    const loginVisible = await page.locator('#login-section').isVisible();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'admin-after-login.png', fullPage: true });
    
    // Log current state
    console.log('Dashboard visible:', dashboardVisible);
    console.log('Login visible:', loginVisible);
    console.log('Current URL:', page.url());
    
    // Check localStorage
    const localStorageData = await page.evaluate(() => {
      return {
        adminToken: localStorage.getItem('adminToken'),
        adminUser: localStorage.getItem('adminUser'),
        adminRefreshToken: localStorage.getItem('adminRefreshToken')
      };
    });
    
    console.log('LocalStorage data:', {
      hasToken: !!localStorageData.adminToken,
      hasUser: !!localStorageData.adminUser,
      hasRefreshToken: !!localStorageData.adminRefreshToken
    });
    
    // Expect dashboard to be visible
    await expect(page.locator('#admin-dashboard')).toBeVisible();
    await expect(page.locator('#login-section')).not.toBeVisible();
  });
  
  test('Client portal login flow', async ({ page }) => {
    // Navigate to client portal
    await page.goto('/portal');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're already logged in
    const isDashboardVisible = await page.locator('#dashboard').isVisible();
    if (isDashboardVisible) {
      console.log('Already logged in, logging out first...');
      // Click logout if we're already logged in
      const logoutBtn = page.locator('button:has-text("Logout")');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Now check we're on the login page
    await expect(page.locator('#login-screen h1')).toContainText('[RE]Print Studios');
    
    // Fill in credentials
    await page.fill('#email', 'client@example.com');
    await page.fill('#password', 'client123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check if we're now on the dashboard
    const dashboardVisible = await page.locator('#dashboard').isVisible();
    const loginVisible = await page.locator('#login-screen').isVisible();
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'client-after-login.png', fullPage: true });
    
    // Log current state
    console.log('Dashboard visible:', dashboardVisible);
    console.log('Login visible:', loginVisible);
    console.log('Current URL:', page.url());
    
    // Check localStorage
    const localStorageData = await page.evaluate(() => {
      return {
        authToken: localStorage.getItem('authToken'),
        userData: localStorage.getItem('userData'),
        refreshToken: localStorage.getItem('refreshToken')
      };
    });
    
    console.log('LocalStorage data:', {
      hasToken: !!localStorageData.authToken,
      hasUser: !!localStorageData.userData,
      hasRefreshToken: !!localStorageData.refreshToken
    });
    
    // Expect dashboard to be visible - check both class and actual visibility
    const dashboardElement = page.locator('#dashboard');
    await expect(dashboardElement).not.toHaveClass(/hidden/);
    
    // Also check login screen is hidden
    const loginScreenElement = page.locator('#login-screen');
    await expect(loginScreenElement).toHaveClass(/hidden/);
  });
});