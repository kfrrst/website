import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { DatabaseCleanup } from '../../utils/database-cleanup';
import { MockDataGenerators } from '../../utils/mock-data-generators';

test.describe('Authentication - Login Flow', () => {
  let testClient: any;
  let testAdmin: any;

  test.beforeAll(async () => {
    // Create test users in database
    const clientData = MockDataGenerators.generateClient();
    testClient = await DatabaseCleanup.createTestClient(clientData);
    
    const adminData = MockDataGenerators.generateAdmin();
    testAdmin = await DatabaseCleanup.createTestUser(adminData);
  });

  test.afterAll(async () => {
    // Clean up test data
    await DatabaseCleanup.cleanupTestData('test_');
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth
    await TestHelpers.clearAuth(page);
  });

  test('Client login - Valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Click client login button
    await page.click('button[data-action="show-client-login"]');
    
    // Wait for login modal
    const modal = page.locator('#login-modal');
    await expect(modal).toBeVisible();
    
    // Fill login form
    await page.fill('#login-email', testClient.client.email);
    await page.fill('#login-password', MockDataGenerators.generateClient().password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to portal
    await page.waitForURL('**/portal.html', { timeout: 10000 });
    
    // Verify we're logged in
    await expect(page.locator('.client-name')).toContainText(testClient.client.contact_name);
    
    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('Client login - Invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Click client login button
    await page.click('button[data-action="show-client-login"]');
    
    // Wait for login modal
    const modal = page.locator('#login-modal');
    await expect(modal).toBeVisible();
    
    // Fill login form with wrong password
    await page.fill('#login-email', testClient.client.email);
    await page.fill('#login-password', 'WrongPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await TestHelpers.expectNotification(page, 'Invalid email or password', 'error');
    
    // Should still be on login page
    await expect(modal).toBeVisible();
    
    // Should not have token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('Client login - Empty fields validation', async ({ page }) => {
    await page.goto('/');
    
    // Click client login button
    await page.click('button[data-action="show-client-login"]');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check HTML5 validation messages
    const emailInput = page.locator('#login-email');
    await expect(emailInput).toHaveAttribute('required');
    
    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('Admin login - Valid credentials', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Wait for login form
    await expect(page.locator('#admin-login-form')).toBeVisible();
    
    // Fill login form
    await page.fill('#email', testAdmin.email);
    await page.fill('#password', MockDataGenerators.generateAdmin().password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('#admin-dashboard', { state: 'visible', timeout: 10000 });
    
    // Verify we're logged in
    await expect(page.locator('.admin-header h1')).toContainText('[Admin Dashboard]');
    
    // Verify admin token is stored
    const adminToken = await page.evaluate(() => localStorage.getItem('adminToken'));
    expect(adminToken).toBeTruthy();
  });

  test('Admin login - Invalid credentials', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Fill login form with wrong credentials
    await page.fill('#email', testAdmin.email);
    await page.fill('#password', 'WrongAdminPass!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorElement = page.locator('#admin-login-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText('Invalid credentials');
    
    // Should still be on login page
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#admin-dashboard')).toBeHidden();
  });

  test('Admin login - Non-admin user denied', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Try to login with client credentials
    await page.fill('#email', testClient.client.email);
    await page.fill('#password', MockDataGenerators.generateClient().password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorElement = page.locator('#admin-login-error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText('Access denied');
    
    // Should not have admin token
    const adminToken = await page.evaluate(() => localStorage.getItem('adminToken'));
    expect(adminToken).toBeFalsy();
  });

  test('Remember me functionality', async ({ page }) => {
    await page.goto('/admin.html');
    
    // Check remember me
    await page.check('#remember');
    
    // Login
    await page.fill('#email', testAdmin.email);
    await page.fill('#password', MockDataGenerators.generateAdmin().password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('#admin-dashboard')).toBeVisible();
  });

  test('Login with Enter key', async ({ page }) => {
    await page.goto('/');
    
    // Open login modal
    await page.click('button[data-action="show-client-login"]');
    
    // Fill form
    await page.fill('#login-email', testClient.client.email);
    await page.fill('#login-password', MockDataGenerators.generateClient().password);
    
    // Press Enter instead of clicking submit
    await page.press('#login-password', 'Enter');
    
    // Should redirect to portal
    await page.waitForURL('**/portal.html', { timeout: 10000 });
  });

  test('Auto-login via URL parameters', async ({ page }) => {
    // Test admin auto-login feature
    const email = testAdmin.email;
    const password = MockDataGenerators.generateAdmin().password;
    
    // Navigate with credentials in URL
    await page.goto(`/admin.html?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    
    // Should auto-login and show dashboard
    await page.waitForSelector('#admin-dashboard', { state: 'visible', timeout: 10000 });
    
    // URL should be cleaned
    expect(page.url()).not.toContain('email=');
    expect(page.url()).not.toContain('password=');
  });

  test('Session persistence across tabs', async ({ browser, page }) => {
    // Login in first tab
    await page.goto('/');
    await page.click('button[data-action="show-client-login"]');
    await page.fill('#login-email', testClient.client.email);
    await page.fill('#login-password', MockDataGenerators.generateClient().password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/portal.html');
    
    // Open new tab
    const newPage = await browser.newPage();
    await newPage.goto('/portal.html');
    
    // Should be logged in in new tab
    await expect(newPage.locator('.client-name')).toContainText(testClient.client.contact_name);
    
    await newPage.close();
  });

  test('Concurrent login attempts', async ({ page }) => {
    await page.goto('/');
    
    // Try rapid login attempts
    for (let i = 0; i < 3; i++) {
      await page.click('button[data-action="show-client-login"]');
      await page.fill('#login-email', testClient.client.email);
      await page.fill('#login-password', 'WrongPassword' + i);
      await page.click('button[type="submit"]');
      
      // Should handle gracefully
      await TestHelpers.expectNotification(page, 'Invalid', 'error');
      
      // Small delay between attempts
      await page.waitForTimeout(500);
    }
    
    // Should still be able to login with correct credentials
    await page.fill('#login-password', MockDataGenerators.generateClient().password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/portal.html');
  });

  test('XSS prevention in login form', async ({ page }) => {
    await page.goto('/');
    await page.click('button[data-action="show-client-login"]');
    
    // Try XSS in email field
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('#login-email', xssPayload);
    await page.fill('#login-password', 'password');
    await page.click('button[type="submit"]');
    
    // Should show validation error, not execute script
    await TestHelpers.expectNotification(page, 'valid email', 'error');
    
    // Check no alert was triggered
    const alerts: string[] = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    expect(alerts).toHaveLength(0);
  });
});