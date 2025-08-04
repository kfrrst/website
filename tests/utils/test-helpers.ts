import { Page, expect } from '@playwright/test';

/**
 * Production-ready test helpers for [RE]Print Studios E2E tests
 */

export class TestHelpers {
  /**
   * Wait for API response with specific status
   */
  static async waitForApiResponse(page: Page, urlPattern: string | RegExp, status: number = 200) {
    return page.waitForResponse(response => 
      (typeof urlPattern === 'string' ? response.url().includes(urlPattern) : urlPattern.test(response.url())) &&
      response.status() === status
    );
  }

  /**
   * Login as a user and return authentication token
   */
  static async loginUser(page: Page, email: string, password: string): Promise<string> {
    const response = await page.request.post('/api/auth/login', {
      data: { email, password }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.token).toBeTruthy();
    
    // Set authentication in browser context
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, data.token);
    
    return data.token;
  }

  /**
   * Login as admin and return authentication token
   */
  static async loginAdmin(page: Page, email: string, password: string): Promise<string> {
    const response = await page.request.post('/api/auth/login', {
      data: { email, password }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.token).toBeTruthy();
    expect(data.user.role).toBe('admin');
    
    // Set admin authentication in browser context
    await page.evaluate((token) => {
      localStorage.setItem('adminToken', token);
    }, data.token);
    
    return data.token;
  }

  /**
   * Clear all authentication tokens
   */
  static async clearAuth(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminRefreshToken');
      sessionStorage.clear();
    });
  }

  /**
   * Wait for WebSocket connection
   */
  static async waitForWebSocket(page: Page, timeout: number = 5000): Promise<void> {
    await page.waitForFunction(
      () => window['socket'] && window['socket'].connected,
      { timeout }
    );
  }

  /**
   * Upload a file through the UI
   */
  static async uploadFile(page: Page, selector: string, filePath: string) {
    const fileInput = await page.locator(selector);
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/files/upload') && response.status() === 200
    );
  }

  /**
   * Check if element is visible and enabled
   */
  static async isInteractable(page: Page, selector: string): Promise<boolean> {
    const element = page.locator(selector);
    return await element.isVisible() && await element.isEnabled();
  }

  /**
   * Wait for loading states to complete
   */
  static async waitForLoadingComplete(page: Page) {
    // Wait for any loading spinners to disappear
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 }).catch(() => {});
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
  }

  /**
   * Check notification appears with specific message
   */
  static async expectNotification(page: Page, message: string, type: 'success' | 'error' | 'info' = 'success') {
    const notification = page.locator(`.notification.${type}`);
    await expect(notification).toBeVisible();
    await expect(notification).toContainText(message);
  }

  /**
   * Navigate to a portal section
   */
  static async navigateToSection(page: Page, sectionName: string) {
    await page.click(`[data-section="${sectionName}"], a[href="#${sectionName}"]`);
    await this.waitForLoadingComplete(page);
  }

  /**
   * Fill form field with validation
   */
  static async fillFormField(page: Page, fieldName: string, value: string) {
    const field = page.locator(`[name="${fieldName}"], #${fieldName}`);
    await field.fill(value);
    
    // Trigger validation
    await field.blur();
    
    // Check for validation errors
    const errorElement = page.locator(`[data-error-for="${fieldName}"], .error-message`).first();
    const hasError = await errorElement.isVisible();
    
    if (hasError) {
      const errorText = await errorElement.textContent();
      throw new Error(`Validation error for field ${fieldName}: ${errorText}`);
    }
  }

  /**
   * Select option from dropdown
   */
  static async selectOption(page: Page, selector: string, value: string) {
    const select = page.locator(selector);
    await select.selectOption(value);
  }

  /**
   * Check table has specific row
   */
  static async expectTableRow(page: Page, tableSelector: string, rowData: Record<string, string>) {
    const table = page.locator(tableSelector);
    const rows = table.locator('tbody tr');
    
    let found = false;
    const rowCount = await rows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      let matches = true;
      
      for (const [key, value] of Object.entries(rowData)) {
        const cell = row.locator(`td[data-column="${key}"], td:has-text("${value}")`);
        if (!(await cell.isVisible())) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        found = true;
        break;
      }
    }
    
    expect(found).toBeTruthy();
  }

  /**
   * Wait for phase transition
   */
  static async waitForPhaseTransition(page: Page, fromPhase: number, toPhase: number) {
    await page.waitForFunction(
      ({ from, to }) => {
        const tracker = document.querySelector('.progress-tracker');
        if (!tracker) return false;
        
        const currentPhase = tracker.querySelector('.progress-step.current');
        if (!currentPhase) return false;
        
        return currentPhase.textContent?.includes(to.toString()) ?? false;
      },
      { from: fromPhase, to: toPhase },
      { timeout: 10000 }
    );
  }

  /**
   * Check accessibility on current page
   */
  static async checkAccessibility(page: Page, options = {}) {
    // This will be implemented with axe-core
    // For now, return basic check
    const title = await page.title();
    expect(title).toBeTruthy();
  }

  /**
   * Measure page performance
   */
  static async measurePerformance(page: Page) {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    return metrics;
  }

  /**
   * Mock email capture for testing
   */
  static async captureEmail(page: Page, emailType: string): Promise<any> {
    // In real implementation, this would connect to email testing service
    // For now, check API was called
    const response = await page.waitForResponse(
      response => response.url().includes('/api/email/send') && response.status() === 200
    );
    
    return response.json();
  }
}