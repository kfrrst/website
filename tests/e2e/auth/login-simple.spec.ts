import { test, expect } from '@playwright/test';

test.describe('Authentication - Simple Login Tests', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for login button or link
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Client Portal")').first();
    await expect(loginButton).toBeVisible();
    
    // Click login button
    await loginButton.click();
    
    // Wait for login form elements
    await page.waitForTimeout(1000); // Give modal time to appear
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input#login-email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password, input#login-password').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
    
    // Verify form elements are visible
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('login form validation works', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to login
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Client Portal")').first();
    await loginButton.click();
    
    await page.waitForTimeout(1000);
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Check for validation messages or required attributes
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input#login-email').first();
    const emailRequired = await emailInput.getAttribute('required');
    
    // Either HTML5 validation or custom validation should prevent submission
    const errorMessage = page.locator('.error, .error-message, [role="alert"]').first();
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    expect(emailRequired !== null || hasError).toBeTruthy();
  });

  test('admin login page exists', async ({ page }) => {
    // Try direct navigation to admin
    await page.goto('/admin.html');
    
    // Check if we're on admin page
    const pageTitle = await page.title();
    expect(pageTitle.toLowerCase()).toContain('admin');
    
    // Look for admin-specific elements
    const adminElements = page.locator('text=/admin/i, .admin-login, #admin-login');
    const adminElementCount = await adminElements.count();
    expect(adminElementCount).toBeGreaterThan(0);
  });

  test('login form is accessible', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to login
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login"), button:has-text("Client Portal")').first();
    await loginButton.click();
    
    await page.waitForTimeout(1000);
    
    // Check form labels
    const emailLabel = page.locator('label[for*="email"], label:has-text("Email")').first();
    const passwordLabel = page.locator('label[for*="password"], label:has-text("Password")').first();
    
    // Labels should exist for accessibility
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
    
    // Check tab navigation
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input#login-email').first();
    await emailInput.focus();
    await page.keyboard.press('Tab');
    
    // Should move to password field
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');
  });
});