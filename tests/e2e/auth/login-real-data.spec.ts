import { test, expect } from '@playwright/test';

test.describe('Authentication - Real Data Tests', () => {
  // These are the ACTUAL users in your database
  const realUsers = {
    admin: {
      email: 'kendrick@reprintstudios.com',
      role: 'admin'
    },
    client: {
      email: 'client@example.com',
      role: 'client'
    }
  };

  test('Admin login with real credentials', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Fill in the login form with REAL admin credentials
    await page.fill('#email', realUsers.admin.email);
    await page.fill('#password', 'your-actual-password-here'); // You need to provide the real password
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Check if login was successful by looking for admin dashboard elements
    await expect(page.locator('.admin-dashboard, #admin-content, [data-module="dashboard"]').first()).toBeVisible({ timeout: 10000 });
    
    // Verify we have a token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('Client login with real credentials', async ({ page }) => {
    await page.goto('/');
    
    // Click client portal button
    const portalButton = page.locator('button:has-text("Client Portal"), a:has-text("Client Portal")').first();
    await portalButton.click();
    
    // Wait for login modal/form
    await page.waitForTimeout(1000);
    
    // Fill in the login form with REAL client credentials  
    const emailInput = page.locator('input[type="email"], #login-email, #email').first();
    const passwordInput = page.locator('input[type="password"], #login-password, #password').first();
    
    await emailInput.fill(realUsers.client.email);
    await passwordInput.fill('your-actual-password-here'); // You need to provide the real password
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Check if redirected to portal
    await expect(page).toHaveURL(/portal\.html/, { timeout: 10000 });
    
    // Verify we're logged in
    const clientInfo = page.locator('.client-name, .user-info, .welcome-message').first();
    await expect(clientInfo).toBeVisible();
  });

  test('API endpoint with real data', async ({ page }) => {
    // Test the API directly with real credentials
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: realUsers.client.email,
        password: 'your-actual-password-here' // You need to provide the real password
      }
    });
    
    // Should get a successful response
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.token).toBeTruthy();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe(realUsers.client.email);
    expect(data.user.role).toBe(realUsers.client.role);
  });

  test('Protected route with real token', async ({ page }) => {
    // First, get a real token by logging in
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: realUsers.client.email,
        password: 'your-actual-password-here' // You need to provide the real password
      }
    });
    
    const { token } = await loginResponse.json();
    
    // Now test a protected endpoint with the real token
    const protectedResponse = await page.request.get('/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(protectedResponse.ok()).toBeTruthy();
    const projects = await protectedResponse.json();
    expect(Array.isArray(projects)).toBeTruthy();
  });
});

// Note: You need to replace 'your-actual-password-here' with the real passwords
// for these users in your database. The passwords should be whatever was used
// when these users were created.