import { test, expect } from '@playwright/test';

test.describe('Authentication - Real Data', () => {
  const users = {
    admin: {
      email: 'kendrick@reprintstudios.com',
      password: 'admin123',
      role: 'admin',
      expectedRedirect: '/admin.html'
    },
    client: {
      email: 'client@example.com',
      password: 'client123',
      role: 'client',
      name: 'John Smith',
      expectedRedirect: '/portal.html'
    }
  };

  test('Admin login flow with real credentials', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Fill login form
    await page.fill('#email', users.admin.email);
    await page.fill('#password', users.admin.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation or content change
    await page.waitForLoadState('networkidle');
    
    // Check for admin dashboard
    await expect(page.locator('.admin-dashboard, #dashboard-content').first()).toBeVisible({ timeout: 10000 });
    
    // Verify token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    // Verify user info
    const userInfo = await page.evaluate(() => localStorage.getItem('user'));
    if (userInfo) {
      const user = JSON.parse(userInfo);
      expect(user.email).toBe(users.admin.email);
      expect(user.role).toBe(users.admin.role);
    }
  });

  test('Client login flow with real credentials', async ({ page }) => {
    await page.goto('/');
    
    // Click client portal
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    // Fill login form
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', users.client.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to portal
    await expect(page).toHaveURL(/portal\.html/, { timeout: 10000 });
    
    // Check for client info
    await expect(page.locator('text=John').first()).toBeVisible();
    
    // Verify token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('Invalid login attempt', async ({ page }) => {
    await page.goto('/');
    
    // Try to login with wrong password
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=/invalid|error|incorrect/i').first()).toBeVisible({ timeout: 5000 });
    
    // Should not redirect
    await expect(page).not.toHaveURL(/portal\.html/);
  });

  test('Logout flow', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', users.client.password);
    await page.click('button[type="submit"]');
    
    // Wait for portal
    await expect(page).toHaveURL(/portal\.html/);
    
    // Find and click logout
    await page.click('text=Logout, button:has-text("Logout"), a:has-text("Logout")');
    
    // Should redirect to home
    await expect(page).toHaveURL(/index\.html|\/$/);
    
    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('Protected API access with real token', async ({ page }) => {
    // Get real token
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: users.client.email,
        password: users.client.password
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const { token } = await loginResponse.json();
    
    // Test protected endpoints
    const endpoints = ['/api/projects', '/api/user/profile', '/api/files'];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Should not get 401/403
      expect([200, 204, 404]).toContain(response.status());
      console.log(`✅ ${endpoint}: ${response.status()}`);
    }
  });

  test('Session persistence across page refresh', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', users.client.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/portal\.html/);
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('text=John').first()).toBeVisible();
    
    // Token should persist
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});