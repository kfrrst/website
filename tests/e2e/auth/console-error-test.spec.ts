import { test, expect } from '@playwright/test';

test.describe('Console Error Tests', () => {
  test('Check for JavaScript errors during login', async ({ page }) => {
    // Collect all console messages
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });
    
    // Also listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page error: ${error.message}`);
    });
    
    // Test Admin Portal
    console.log('\n=== Testing Admin Portal ===');
    await page.goto('/admin.html');
    await page.waitForLoadState('networkidle');
    
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('Admin Portal Console Messages:');
    consoleMessages.forEach(msg => console.log(msg));
    
    if (consoleErrors.length > 0) {
      console.log('\nAdmin Portal Errors Found:');
      consoleErrors.forEach(err => console.log('❌', err));
    }
    
    // Clear for next test
    consoleMessages.length = 0;
    consoleErrors.length = 0;
    
    // Test Client Portal
    console.log('\n=== Testing Client Portal ===');
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    
    console.log('Client Portal Console Messages:');
    consoleMessages.forEach(msg => console.log(msg));
    
    if (consoleErrors.length > 0) {
      console.log('\nClient Portal Errors Found:');
      consoleErrors.forEach(err => console.log('❌', err));
    }
    
    // Expect no errors
    expect(consoleErrors).toHaveLength(0);
  });
});