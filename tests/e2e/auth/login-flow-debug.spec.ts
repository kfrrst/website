import { test, expect } from '@playwright/test';

test.describe('Login Flow Debug', () => {
  test('Debug admin login flow step by step', async ({ page }) => {
    // Capture all console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Clear storage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to admin portal
    await page.goto('/admin.html');
    await page.waitForLoadState('networkidle');
    
    console.log('=== Initial Page Load ===');
    consoleLogs.forEach(log => console.log(log));
    consoleLogs.length = 0;
    
    // Fill in credentials
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    
    // Set up response listener
    const loginResponsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/login')
    );
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for login response
    const loginResponse = await loginResponsePromise;
    console.log('\n=== Login Response ===');
    console.log('Status:', loginResponse.status());
    
    const responseData = await loginResponse.json();
    console.log('Has token:', !!responseData.accessToken);
    console.log('Has user:', !!responseData.user);
    
    // Wait a bit for processing
    await page.waitForTimeout(2000);
    
    console.log('\n=== After Login Processing ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Check what methods were called
    const methodsCalled = await page.evaluate(() => {
      const called = [];
      
      // Check if modules exist
      if (window.adminDashboard) {
        called.push('adminDashboard exists');
        if (window.adminDashboard.modules) {
          called.push('modules exist');
          if (window.adminDashboard.modules.auth) {
            called.push('auth module exists');
          }
        }
      }
      
      return called;
    });
    
    console.log('\n=== Module State ===');
    methodsCalled.forEach(m => console.log('✓', m));
    
    // Check DOM state
    const dashboardVisible = await page.locator('#admin-dashboard').isVisible();
    const loginVisible = await page.locator('#login-section').isVisible();
    const dashboardClasses = await page.locator('#admin-dashboard').getAttribute('class');
    const loginStyle = await page.locator('#login-section').getAttribute('style');
    
    console.log('\n=== DOM State ===');
    console.log('Dashboard visible:', dashboardVisible);
    console.log('Dashboard classes:', dashboardClasses);
    console.log('Login visible:', loginVisible);
    console.log('Login style:', loginStyle);
    
    // Take screenshot
    await page.screenshot({ path: 'login-flow-debug.png', fullPage: true });
  });
});