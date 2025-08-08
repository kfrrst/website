import { test, expect } from '@playwright/test';

test.describe('Client Portal Debug', () => {
  test('Debug client portal login', async ({ page }) => {
    // Capture console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      consoleLogs.push(`[pageerror] ${error.message}`);
    });
    
    // Navigate to client portal
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    
    console.log('=== Initial Load Console ===');
    consoleLogs.forEach(log => console.log(log));
    consoleLogs.length = 0;
    
    // Fill in credentials
    await page.fill('#email', 'client@example.com');
    await page.fill('#password', 'test123');
    
    // Set up response listener
    page.on('response', response => {
      if (response.url().includes('/api/auth/login')) {
        console.log('\n=== Login API Response ===');
        console.log('URL:', response.url());
        console.log('Status:', response.status());
        console.log('Status Text:', response.statusText());
      }
    });
    
    // Click login
    await page.click('button[type="submit"]');
    
    // Wait for any response
    await page.waitForTimeout(3000);
    
    console.log('\n=== After Login Console ===');
    consoleLogs.forEach(log => console.log(log));
    
    // Check login response manually
    const loginResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'client@example.com',
            password: 'test123'
          })
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n=== Manual Login Test ===');
    console.log('Response:', loginResponse);
    
    // Check form state
    const buttonText = await page.locator('button[type="submit"]').textContent();
    const hasError = await page.locator('.error-message, .login-error').isVisible().catch(() => false);
    
    console.log('\n=== Form State ===');
    console.log('Button text:', buttonText);
    console.log('Has error message:', hasError);
    
    if (hasError) {
      const errorText = await page.locator('.error-message, .login-error').textContent();
      console.log('Error text:', errorText);
    }
    
    // Check localStorage
    const storage = await page.evaluate(() => {
      return {
        authToken: localStorage.getItem('authToken'),
        userData: localStorage.getItem('userData'),
        refreshToken: localStorage.getItem('refreshToken')
      };
    });
    
    console.log('\n=== LocalStorage ===');
    console.log('Has authToken:', !!storage.authToken);
    console.log('Has userData:', !!storage.userData);
    console.log('Has refreshToken:', !!storage.refreshToken);
  });
});