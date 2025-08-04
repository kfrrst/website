import { Page, Request, Response, expect } from '@playwright/test';
import { TEST_USERS, TEST_URLS, TIMEOUTS } from './test-constants';

export class EnhancedTestHelpers {
  /**
   * Login helper with retry logic and comprehensive error handling
   */
  static async loginUser(
    page: Page,
    userType: 'admin' | 'client',
    options: { 
      expectRedirect?: boolean; 
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<{ token: string; user: any }> {
    const user = TEST_USERS[userType];
    const { expectRedirect = true, timeout = TIMEOUTS.medium, retries = 3 } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Login attempt ${attempt} for ${user.email}`);
        
        // Try API login first
        const response = await page.request.post(TEST_URLS.api.login, {
          data: { email: user.email, password: user.password },
          timeout
        });
        
        if (!response.ok()) {
          throw new Error(`Login failed: ${response.status()} ${response.statusText()}`);
        }
        
        const data = await response.json();
        const token = data.accessToken || data.token;
        
        if (!token) {
          throw new Error('No token received from login');
        }
        
        // Store token in localStorage with Firefox compatibility
        try {
          await page.evaluate((t) => {
            try {
              localStorage.setItem('token', t);
            } catch (e) {
              // Firefox sometimes blocks localStorage in tests
              // Fallback to sessionStorage
              sessionStorage.setItem('token', t);
            }
          }, token);
        } catch (storageError) {
          // If storage fails completely, set via cookie as fallback
          await page.context().addCookies([{
            name: 'token',
            value: token,
            domain: new URL(page.url()).hostname,
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax'
          }]);
        }
        
        // Store user info if provided
        if (data.user) {
          try {
            await page.evaluate((u) => {
              try {
                localStorage.setItem('user', JSON.stringify(u));
              } catch (e) {
                sessionStorage.setItem('user', JSON.stringify(u));
              }
            }, data.user);
          } catch (storageError) {
            // Ignore user storage errors - token is more important
          }
        }
        
        console.log(`✅ Login successful for ${user.email}`);
        return { token, user: data.user };
        
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Login attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < retries) {
          await page.waitForTimeout(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Login failed after all retries');
  }

  /**
   * Wait for API response with specific criteria
   */
  static async waitForAPIResponse(
    page: Page,
    urlPattern: string | RegExp,
    criteria: {
      method?: string;
      status?: number;
      timeout?: number;
      predicate?: (response: Response) => boolean;
    } = {}
  ): Promise<Response> {
    const { method = 'GET', status = 200, timeout = TIMEOUTS.medium, predicate } = criteria;
    
    return page.waitForResponse(
      response => {
        const matchesUrl = typeof urlPattern === 'string' 
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
        
        const matchesMethod = response.request().method() === method;
        const matchesStatus = status ? response.status() === status : true;
        const matchesPredicate = predicate ? predicate(response) : true;
        
        return matchesUrl && matchesMethod && matchesStatus && matchesPredicate;
      },
      { timeout }
    );
  }

  /**
   * Upload file with progress tracking
   */
  static async uploadFile(
    page: Page,
    file: { name: string; mimeType: string; buffer: Buffer },
    options: {
      selector?: string;
      waitForSuccess?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    const { 
      selector = 'input[type="file"]', 
      waitForSuccess = true, 
      timeout = TIMEOUTS.upload 
    } = options;
    
    try {
      // Find file input
      const fileInput = page.locator(selector).first();
      await expect(fileInput).toBeVisible({ timeout: TIMEOUTS.short });
      
      // Monitor upload progress
      const uploadPromise = waitForSuccess 
        ? this.waitForAPIResponse(page, /\/api\/files/, { method: 'POST', timeout })
        : Promise.resolve(null);
      
      // Set file
      await fileInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer
      });
      
      // Wait for upload
      const response = await uploadPromise;
      
      if (response && response.ok()) {
        const data = await response.json();
        console.log(`✅ File uploaded: ${file.name} (ID: ${data.id || 'unknown'})`);
        return { success: true, fileId: data.id };
      } else if (response) {
        const error = await response.text();
        console.log(`❌ Upload failed: ${error}`);
        return { success: false, error };
      }
      
      return { success: true };
      
    } catch (error) {
      console.log(`❌ Upload error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check element visibility with retry
   */
  static async waitForElement(
    page: Page,
    selector: string,
    options: {
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<boolean> {
    const { state = 'visible', timeout = TIMEOUTS.short, retries = 3 } = options;
    
    for (let i = 0; i < retries; i++) {
      try {
        await page.waitForSelector(selector, { state, timeout });
        return true;
      } catch (error) {
        if (i < retries - 1) {
          await page.waitForTimeout(500);
        }
      }
    }
    
    return false;
  }

  /**
   * Measure performance metrics
   */
  static async measurePerformance(
    page: Page,
    action: () => Promise<void>
  ): Promise<{
    duration: number;
    metrics: {
      firstPaint?: number;
      firstContentfulPaint?: number;
      domContentLoaded?: number;
      loadComplete?: number;
    };
  }> {
    const startTime = Date.now();
    
    // Clear previous metrics
    await page.evaluate(() => window.performance.clearMarks());
    
    // Execute action
    await action();
    
    const duration = Date.now() - startTime;
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const getMetric = (name: string) => {
        const entries = performance.getEntriesByName(name);
        return entries.length > 0 ? entries[0].startTime : undefined;
      };
      
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        firstPaint: getMetric('first-paint'),
        firstContentfulPaint: getMetric('first-contentful-paint'),
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart
      };
    });
    
    return { duration, metrics };
  }

  /**
   * Test API endpoint security
   */
  static async testAPIEndpointSecurity(
    page: Page,
    endpoint: string,
    options: {
      method?: string;
      requiresAuth?: boolean;
      allowedRoles?: string[];
      testCases?: Array<{
        name: string;
        headers?: Record<string, string>;
        data?: any;
        expectedStatus: number;
      }>;
    } = {}
  ): Promise<{ passed: boolean; results: any[] }> {
    const { 
      method = 'GET', 
      requiresAuth = true, 
      allowedRoles = ['admin', 'client'],
      testCases = []
    } = options;
    
    const results = [];
    let passed = true;
    
    // Test without auth
    if (requiresAuth) {
      const response = await page.request[method.toLowerCase() as 'get'](endpoint);
      const result = {
        test: 'No authentication',
        expected: 401,
        actual: response.status(),
        passed: response.status() === 401
      };
      results.push(result);
      if (!result.passed) passed = false;
    }
    
    // Test with invalid token
    const invalidResponse = await page.request[method.toLowerCase() as 'get'](endpoint, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    const invalidResult = {
      test: 'Invalid token',
      expected: 401,
      actual: invalidResponse.status(),
      passed: invalidResponse.status() === 401
    };
    results.push(invalidResult);
    if (!invalidResult.passed) passed = false;
    
    // Run custom test cases
    for (const testCase of testCases) {
      const response = await page.request[method.toLowerCase() as 'get'](endpoint, {
        headers: testCase.headers,
        data: testCase.data
      });
      
      const result = {
        test: testCase.name,
        expected: testCase.expectedStatus,
        actual: response.status(),
        passed: response.status() === testCase.expectedStatus
      };
      results.push(result);
      if (!result.passed) passed = false;
    }
    
    return { passed, results };
  }

  /**
   * Create test data in database
   */
  static async createTestData(
    page: Page,
    type: 'project' | 'invoice' | 'file',
    data: any,
    token: string
  ): Promise<{ id: string; data: any }> {
    const endpoints = {
      project: TEST_URLS.api.projects,
      invoice: TEST_URLS.api.invoices,
      file: TEST_URLS.api.files
    };
    
    const response = await page.request.post(endpoints[type], {
      headers: { 'Authorization': `Bearer ${token}` },
      data
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to create test ${type}: ${response.status()}`);
    }
    
    const created = await response.json();
    return { id: created.id, data: created };
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(
    page: Page,
    type: 'project' | 'invoice' | 'file',
    id: string,
    token: string
  ): Promise<boolean> {
    const endpoints = {
      project: `${TEST_URLS.api.projects}/${id}`,
      invoice: `${TEST_URLS.api.invoices}/${id}`,
      file: `${TEST_URLS.api.files}/${id}`
    };
    
    try {
      const response = await page.request.delete(endpoints[type], {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok();
    } catch (error) {
      console.log(`Failed to cleanup ${type} ${id}: ${error}`);
      return false;
    }
  }
}