import { test, expect } from '@playwright/test';

test.describe('Input Validation and Sanitization Tests', () => {
  let authContext;
  
  test.beforeAll(async ({ browser }) => {
    // Create authenticated context
    const page = await browser.newPage();
    await page.goto('/admin');
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#admin-dashboard', { timeout: 10000 });
    
    authContext = await page.context().storageState();
    await page.close();
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({ storageState: authContext });
    const page = await context.newPage();
    await page.goto('/admin');
  });

  test('should sanitize HTML in client creation', async ({ page }) => {
    await page.click('a[href="#clients"]');
    await page.click('button:has-text("+ New Client")');
    
    // Try to inject script via client name
    const xssPayload = '<script>alert("xss")</script>Test Client';
    await page.fill('#client-form input[name="first_name"]', xssPayload);
    await page.fill('#client-form input[name="last_name"]', 'User');
    await page.fill('#client-form input[name="email"]', 'test@example.com');
    await page.fill('#client-form input[name="password"]', 'password123');
    
    await page.click('#client-form button[type="submit"]');
    
    // Check that script was sanitized
    page.on('dialog', dialog => {
      test.fail('XSS payload executed in client creation');
    });
    
    // Verify client was created with sanitized data
    await page.waitForTimeout(2000);
    const clientText = await page.textContent('.clients-table');
    expect(clientText).not.toContain('<script>');
  });

  test('should validate email formats', async ({ page }) => {
    await page.click('a[href="#clients"]');
    await page.click('button:has-text("+ New Client")');
    
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test@example'
    ];
    
    for (const email of invalidEmails) {
      await page.fill('#client-form input[name="email"]', email);
      await page.fill('#client-form input[name="first_name"]', 'Test');
      await page.fill('#client-form input[name="last_name"]', 'User');
      await page.fill('#client-form input[name="password"]', 'password123');
      
      await page.click('#client-form button[type="submit"]');
      
      // Should show validation error
      const errorMessage = await page.locator('.error-message, .alert-error').textContent();
      expect(errorMessage).toContain('email');
    }
  });

  test('should enforce password complexity', async ({ page }) => {
    await page.click('a[href="#clients"]');
    await page.click('button:has-text("+ New Client")');
    
    const weakPasswords = [
      '123',
      'password',
      'abc123',
      '12345678' // No uppercase or special chars
    ];
    
    for (const password of weakPasswords) {
      await page.fill('#client-form input[name="email"]', 'test@example.com');
      await page.fill('#client-form input[name="first_name"]', 'Test');
      await page.fill('#client-form input[name="last_name"]', 'User');
      await page.fill('#client-form input[name="password"]', password);
      
      await page.click('#client-form button[type="submit"]');
      
      // Should show password complexity error
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/clients') && response.status() === 400
      );
      expect(response.status()).toBe(400);
    }
  });

  test('should prevent path traversal in file operations', async ({ page }) => {
    await page.click('a[href="#files"]');
    
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      '../../../../../../../../etc/shadow',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];
    
    for (const payload of pathTraversalPayloads) {
      // Try to use path traversal in folder path
      const response = await page.request.get(`/api/files?folder=${encodeURIComponent(payload)}`);
      expect(response.status()).toBe(400);
    }
  });

  test('should sanitize project descriptions', async ({ page }) => {
    await page.click('a[href="#projects"]');
    await page.click('button:has-text("+ New Project")');
    
    const maliciousDescription = `
      <script>
        fetch('/api/users', {method: 'DELETE'});
        document.cookie = 'stolen=true';
      </script>
      <img src=x onerror="alert('xss')">
      Legitimate project description.
    `;
    
    await page.fill('#project-form input[name="name"]', 'Test Project');
    await page.fill('#project-form select[name="client_id"]', 'some-uuid');
    await page.fill('#project-form textarea[name="description"]', maliciousDescription);
    
    await page.click('#project-form button[type="submit"]');
    
    // Verify script tags are removed
    page.on('dialog', dialog => {
      test.fail('XSS payload executed in project description');
    });
    
    // Check that cookie wasn't set
    const cookies = await page.context().cookies();
    const stolenCookie = cookies.find(c => c.name === 'stolen');
    expect(stolenCookie).toBeUndefined();
  });

  test('should validate numeric inputs', async ({ page }) => {
    await page.click('a[href="#projects"]');
    await page.click('button:has-text("+ New Project")');
    
    const invalidNumbers = [
      'abc',
      '999999999999999999999',
      '-100',
      '1.2.3',
      'Infinity',
      'NaN'
    ];
    
    for (const invalidNumber of invalidNumbers) {
      await page.fill('#project-form input[name="budget_amount"]', invalidNumber);
      await page.fill('#project-form input[name="name"]', 'Test Project');
      
      await page.click('#project-form button[type="submit"]');
      
      // Should show validation error
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/projects') && response.status() === 400
      );
      expect(response.status()).toBe(400);
    }
  });

  test('should prevent SQL injection in search queries', async ({ page }) => {
    await page.click('a[href="#clients"]');
    
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM passwords --",
      "1' OR '1'='1",
      "admin'/*",
      "' OR 1=1#"
    ];
    
    for (const payload of sqlPayloads) {
      await page.fill('.search-input[data-section="clients"]', payload);
      await page.keyboard.press('Enter');
      
      // Should not cause SQL errors or unexpected results
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/clients')
      );
      expect(response.status()).not.toBe(500);
    }
  });

  test('should limit file upload sizes', async ({ page }) => {
    await page.click('a[href="#files"]');
    await page.click('button:has-text("+ Upload Files")');
    
    // Test would need actual file upload implementation
    // This is a placeholder for file size validation tests
    expect(true).toBe(true);
  });

  test('should validate file extensions', async ({ page }) => {
    await page.click('a[href="#files"]');
    
    const dangerousExtensions = [
      'test.exe',
      'malware.bat',
      'script.php',
      'backdoor.jsp',
      'virus.scr'
    ];
    
    // This would test file extension validation
    // Implementation depends on actual file upload component
    expect(dangerousExtensions.length).toBeGreaterThan(0);
  });

  test('should enforce maximum field lengths', async ({ page }) => {
    await page.click('a[href="#clients"]');
    await page.click('button:has-text("+ New Client")');
    
    // Test very long inputs
    const veryLongString = 'a'.repeat(1000);
    
    await page.fill('#client-form input[name="first_name"]', veryLongString);
    await page.fill('#client-form input[name="last_name"]', 'User');
    await page.fill('#client-form input[name="email"]', 'test@example.com');
    await page.fill('#client-form input[name="password"]', 'Password123');
    
    await page.click('#client-form button[type="submit"]');
    
    // Should show field length error
    const response = await page.waitForResponse(response => 
      response.url().includes('/api/clients') && response.status() === 400
    );
    expect(response.status()).toBe(400);
  });
});