import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { DatabaseCleanup } from '../../utils/database-cleanup';
import { MockDataGenerators } from '../../utils/mock-data-generators';

test.describe('Authentication - Logout Flow', () => {
  let testClient: any;
  let testAdmin: any;

  test.beforeAll(async () => {
    // Create test users
    const clientData = MockDataGenerators.generateClient();
    testClient = await DatabaseCleanup.createTestClient(clientData);
    
    const adminData = MockDataGenerators.generateAdmin();
    testAdmin = await DatabaseCleanup.createTestUser(adminData);
  });

  test.afterAll(async () => {
    await DatabaseCleanup.cleanupTestData('test_');
  });

  test('Client logout - Successful logout', async ({ page }) => {
    // Login first
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Verify logged in
    await expect(page.locator('.client-name')).toBeVisible();
    
    // Click logout
    await page.click('#logout-btn');
    
    // Should redirect to home page
    await page.waitForURL('**/index.html', { timeout: 5000 });
    
    // Verify tokens are cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
    
    // Try to access portal again
    await page.goto('/portal.html');
    
    // Should redirect to login
    await page.waitForURL('**/index.html');
  });

  test('Admin logout - Successful logout', async ({ page }) => {
    // Login first
    await page.goto('/admin.html');
    await page.fill('#email', testAdmin.email);
    await page.fill('#password', MockDataGenerators.generateAdmin().password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    
    // Click logout
    await page.click('#logout-btn');
    
    // Should show login page
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#admin-dashboard')).toBeHidden();
    
    // Verify admin tokens are cleared
    const adminToken = await page.evaluate(() => localStorage.getItem('adminToken'));
    expect(adminToken).toBeFalsy();
  });

  test('Logout clears all session data', async ({ page }) => {
    // Login and set various session data
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    
    // Set additional session data
    await page.evaluate(() => {
      localStorage.setItem('test_data', 'test_value');
      sessionStorage.setItem('session_data', 'session_value');
      localStorage.setItem('user_preferences', JSON.stringify({ theme: 'dark' }));
    });
    
    await page.goto('/portal.html');
    
    // Logout
    await page.click('#logout-btn');
    
    // Check all auth-related data is cleared
    const authData = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      refreshToken: localStorage.getItem('refreshToken'),
      user: localStorage.getItem('user'),
      sessionData: sessionStorage.getItem('session_data')
    }));
    
    expect(authData.token).toBeFalsy();
    expect(authData.refreshToken).toBeFalsy();
    expect(authData.user).toBeFalsy();
    expect(authData.sessionData).toBeFalsy();
    
    // Non-auth data should remain
    const testData = await page.evaluate(() => localStorage.getItem('test_data'));
    expect(testData).toBe('test_value');
  });

  test('Logout from inactive session', async ({ page }) => {
    // Login
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Simulate session timeout by clearing token
    await page.evaluate(() => {
      // Simulate expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.invalid';
      localStorage.setItem('token', expiredToken);
    });
    
    // Try to perform an action that requires auth
    await page.click('[data-section="projects"]');
    
    // Should redirect to login
    await page.waitForURL('**/index.html');
  });

  test('Logout while upload in progress', async ({ page }) => {
    // Login
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Start a file upload (mock)
    await page.evaluate(() => {
      // Simulate upload in progress
      window['uploadInProgress'] = true;
    });
    
    // Try to logout
    await page.click('#logout-btn');
    
    // Should show confirmation dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('upload in progress');
      dialog.accept(); // Confirm logout
    });
    
    // Should complete logout after confirmation
    await page.waitForURL('**/index.html');
  });

  test('Concurrent logout from multiple tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Login in both tabs
    for (const page of [page1, page2]) {
      await page.goto('/');
      await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
      await page.goto('/portal.html');
      await expect(page.locator('.client-name')).toBeVisible();
    }
    
    // Logout from first tab
    await page1.click('#logout-btn');
    await page1.waitForURL('**/index.html');
    
    // Second tab should detect logout on next action
    await page2.click('[data-section="files"]');
    await page2.waitForURL('**/index.html');
    
    await context.close();
  });

  test('Logout API endpoint security', async ({ page }) => {
    // Login first
    await page.goto('/');
    const token = await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    
    // Try logout without token
    const responseNoToken = await page.request.post('/api/auth/logout', {
      headers: {}
    });
    expect(responseNoToken.status()).toBe(401);
    
    // Try logout with invalid token
    const responseInvalidToken = await page.request.post('/api/auth/logout', {
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });
    expect(responseInvalidToken.status()).toBe(401);
    
    // Valid logout
    const responseValid = await page.request.post('/api/auth/logout', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(responseValid.ok()).toBeTruthy();
  });

  test('Force logout functionality', async ({ page }) => {
    // Login
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Simulate force logout from server (admin action)
    await page.evaluate(() => {
      // Simulate WebSocket message
      if (window['socket']) {
        window['socket'].emit('force_logout', { reason: 'Security update required' });
      }
    });
    
    // Should show notification and redirect
    await TestHelpers.expectNotification(page, 'logged out', 'info');
    await page.waitForURL('**/index.html');
  });

  test('Logout clears WebSocket connections', async ({ page }) => {
    // Login
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Wait for WebSocket connection
    await TestHelpers.waitForWebSocket(page);
    
    // Verify socket is connected
    const socketConnected = await page.evaluate(() => window['socket']?.connected);
    expect(socketConnected).toBeTruthy();
    
    // Logout
    await page.click('#logout-btn');
    await page.waitForURL('**/index.html');
    
    // Verify socket is disconnected
    const socketDisconnected = await page.evaluate(() => !window['socket']?.connected);
    expect(socketDisconnected).toBeTruthy();
  });

  test('Logout button disabled during logout process', async ({ page }) => {
    // Login
    await page.goto('/');
    await TestHelpers.loginUser(page, testClient.client.email, MockDataGenerators.generateClient().password);
    await page.goto('/portal.html');
    
    // Intercept logout API to delay response
    await page.route('/api/auth/logout', async route => {
      await page.waitForTimeout(1000); // Delay
      await route.continue();
    });
    
    // Click logout
    const logoutBtn = page.locator('#logout-btn');
    await logoutBtn.click();
    
    // Button should be disabled during logout
    await expect(logoutBtn).toBeDisabled();
    
    // Wait for logout to complete
    await page.waitForURL('**/index.html');
  });
});