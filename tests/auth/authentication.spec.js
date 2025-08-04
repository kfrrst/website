import { test, expect } from '@playwright/test';

test.describe('Authentication Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('should require valid email and password for admin login', async ({ page }) => {
    // Test invalid email format
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show validation error or stay on login page
    await expect(page.locator('#login-section')).toBeVisible();
  });

  test('should prevent SQL injection in login fields', async ({ page }) => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "1'; DROP TABLE users;--"
    ];

    for (const payload of sqlInjectionPayloads) {
      await page.fill('#email', payload);
      await page.fill('#password', payload);
      await page.click('button[type="submit"]');
      
      // Should not result in successful login
      await expect(page.locator('#login-section')).toBeVisible();
      
      // Clear fields for next test
      await page.fill('#email', '');
      await page.fill('#password', '');
    }
  });

  test('should prevent XSS in login fields', async ({ page }) => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>'
    ];

    for (const payload of xssPayloads) {
      await page.fill('#email', payload);
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      // Should not execute the script
      await expect(page.locator('#login-section')).toBeVisible();
      
      // Check that no alert was triggered
      page.on('dialog', dialog => {
        test.fail('XSS payload executed: ' + dialog.message());
      });
    }
  });

  test('should enforce rate limiting on login attempts', async ({ page, context }) => {
    // Make multiple rapid login attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    // Should show rate limit error
    const response = await page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 429
    );
    expect(response.status()).toBe(429);
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page.locator('#admin-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-section')).not.toBeVisible();
  });

  test('should maintain session across page refresh', async ({ page }) => {
    // Login first
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('#admin-dashboard')).toBeVisible({ timeout: 10000 });
    
    // Refresh the page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('#admin-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-section')).not.toBeVisible();
  });

  test('should logout and clear session', async ({ page }) => {
    // Login first
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('#admin-dashboard')).toBeVisible({ timeout: 10000 });
    
    // Logout
    await page.click('#logout-btn');
    
    // Should return to login page
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#admin-dashboard')).not.toBeVisible();
    
    // Check that tokens are cleared from localStorage
    const tokens = await page.evaluate(() => {
      return {
        adminToken: localStorage.getItem('adminToken'),
        adminRefreshToken: localStorage.getItem('adminRefreshToken'),
        adminSessionData: localStorage.getItem('adminSessionData')
      };
    });
    
    expect(tokens.adminToken).toBeNull();
    expect(tokens.adminRefreshToken).toBeNull();
    expect(tokens.adminSessionData).toBeNull();
  });

  test('should handle invalid tokens gracefully', async ({ page }) => {
    // Set invalid token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('adminToken', 'invalid-token');
      localStorage.setItem('adminRefreshToken', 'invalid-refresh-token');
    });
    
    await page.reload();
    
    // Should show login form
    await expect(page.locator('#login-section')).toBeVisible();
  });

  test('should prevent CSRF attacks', async ({ page, request }) => {
    // Try to make a request without proper authentication
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@kendrickforrest.com',
        password: 'admin123'
      },
      headers: {
        'Origin': 'http://malicious-site.com'
      }
    });
    
    // Should be blocked by CORS
    expect(response.status()).not.toBe(200);
  });
});