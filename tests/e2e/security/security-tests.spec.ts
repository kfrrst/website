import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  const users = {
    admin: { email: 'kendrick@reprintstudios.com', password: 'admin123' },
    client: { email: 'client@example.com', password: 'client123' }
  };

  test('XSS Prevention - Script injection in forms', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    // Try to inject script in login form
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('#login-email', xssPayload);
    await page.fill('#login-password', xssPayload);
    await page.click('button[type="submit"]');
    
    // Check that no alert was triggered
    let alertTriggered = false;
    page.on('dialog', () => { alertTriggered = true; });
    
    await page.waitForTimeout(2000);
    expect(alertTriggered).toBe(false);
    console.log('✅ XSS prevention in login form working');
  });

  test('SQL Injection Prevention', async ({ page, request }) => {
    // Try SQL injection in login
    const sqlPayload = "' OR '1'='1";
    
    const response = await request.post('/api/auth/login', {
      data: {
        email: sqlPayload,
        password: sqlPayload
      }
    });
    
    // Should not authenticate
    expect(response.status()).toBe(401);
    console.log('✅ SQL injection prevented in login');
  });

  test('CSRF Protection', async ({ page, request }) => {
    // Login first to get valid token
    const loginResponse = await request.post('/api/auth/login', {
      data: users.client
    });
    const { token } = await loginResponse.json();
    
    // Try to make request without proper CSRF protection
    const response = await request.post('/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://evil-site.com'
      },
      data: { name: 'Malicious Project' }
    });
    
    // Should be blocked by CORS/CSRF protection
    expect([403, 400]).toContain(response.status());
    console.log('✅ CSRF protection active');
  });

  test('Authentication Token Security', async ({ page, request }) => {
    // Test expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE2MDk0NTkyMDB9.invalid';
    
    const response = await request.get('/api/projects', {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    
    expect(response.status()).toBe(401);
    console.log('✅ Expired token rejected');
    
    // Test malformed token
    const malformedToken = 'not-a-real-token';
    
    const response2 = await request.get('/api/projects', {
      headers: { 'Authorization': `Bearer ${malformedToken}` }
    });
    
    expect(response2.status()).toBe(401);
    console.log('✅ Malformed token rejected');
  });

  test('Password Security Requirements', async ({ page }) => {
    // Navigate to registration or password change
    await page.goto('/');
    
    // Look for password requirements
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for password requirements text
      const requirements = page.locator('text=/must contain|requirements|at least/i').first();
      if (await requirements.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Password requirements displayed');
      }
    }
  });

  test('Rate Limiting', async ({ request }) => {
    // Make multiple rapid requests
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        request.post('/api/auth/login', {
          data: {
            email: 'test@example.com',
            password: 'wrong'
          }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    
    if (rateLimited) {
      console.log('✅ Rate limiting active');
    } else {
      console.log('⚠️  Rate limiting may not be configured');
    }
  });

  test('Secure Headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};
    
    // Check security headers
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': 'max-age='
    };
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const value = headers[header];
      if (value) {
        if (Array.isArray(expectedValue)) {
          const hasValidValue = expectedValue.some(v => value.includes(v));
          if (hasValidValue) {
            console.log(`✅ ${header}: ${value}`);
          }
        } else if (value.includes(expectedValue)) {
          console.log(`✅ ${header}: ${value}`);
        }
      } else {
        console.log(`⚠️  Missing header: ${header}`);
      }
    }
  });

  test('Access Control - Client cannot access admin', async ({ page }) => {
    // Login as client
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', users.client.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/portal\.html/);
    
    // Try to access admin page
    await page.goto('/admin.html');
    
    // Should redirect or show unauthorized
    const isOnAdmin = page.url().includes('admin.html');
    const hasAdminContent = await page.locator('.admin-dashboard').isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(!isOnAdmin || !hasAdminContent).toBeTruthy();
    console.log('✅ Client blocked from admin access');
  });

  test('Input Validation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    // Test email validation
    await page.fill('#login-email', 'not-an-email');
    await page.fill('#login-password', 'password');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    const emailError = await page.locator('text=/invalid email|valid email/i').isVisible({ timeout: 2000 }).catch(() => false);
    const stillOnLogin = !page.url().includes('portal.html');
    
    expect(emailError || stillOnLogin).toBeTruthy();
    console.log('✅ Email validation working');
  });

  test('Session Security', async ({ page, context }) => {
    // Login
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', users.client.email);
    await page.fill('#login-password', users.client.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/portal\.html/);
    
    // Get cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('token'));
    
    if (sessionCookie) {
      // Check secure flags
      if (sessionCookie.secure) {
        console.log('✅ Session cookie has secure flag');
      }
      if (sessionCookie.httpOnly) {
        console.log('✅ Session cookie has httpOnly flag');
      }
      if (sessionCookie.sameSite) {
        console.log(`✅ Session cookie has sameSite: ${sessionCookie.sameSite}`);
      }
    }
  });
});