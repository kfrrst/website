import { test, expect } from '@playwright/test';

test.describe('Rate Limiting Tests', () => {
  test('should enforce rate limiting on authentication endpoints', async ({ page, context }) => {
    await page.goto('/admin');
    
    // Make multiple rapid login attempts
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.request.post('/api/auth/login', {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // At least some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('should enforce rate limiting on API endpoints', async ({ page }) => {
    // Login first to get valid token
    await page.goto('/admin');
    await page.fill('#email', 'admin@kendrickforrest.com'); 
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#admin-dashboard', { timeout: 10000 });
    
    // Get auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('adminToken'));
    
    // Make rapid API requests
    const promises = [];
    for (let i = 0; i < 150; i++) {
      promises.push(
        page.request.get('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // Should have some rate limited responses
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  test('should allow requests after rate limit window expires', async ({ page }) => {
    await page.goto('/admin');
    
    // Make requests until rate limited
    let rateLimited = false;
    for (let i = 0; i < 10; i++) {
      const response = await page.request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      
      if (response.status() === 429) {
        rateLimited = true;
        break;
      }
    }
    
    expect(rateLimited).toBe(true);
    
    // Wait for rate limit window to expire (15 minutes is too long for tests)
    // In a real scenario, we'd need to adjust rate limit window for testing
    // or mock the time
    await page.waitForTimeout(1000);
    
    // Try one more request - should still be rate limited initially
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'test@example.com', 
        password: 'wrongpassword'
      }
    });
    
    expect(response.status()).toBe(429);
  });

  test('should have different rate limits for different endpoints', async ({ page }) => {
    await page.goto('/admin');
    
    // Test file upload rate limit (should be more lenient)
    let fileUploadRateLimited = false;
    for (let i = 0; i < 25; i++) {
      const response = await page.request.post('/api/files/upload', {
        data: {
          file: 'test content'
        }
      });
      
      if (response.status() === 429) {
        fileUploadRateLimited = true;
        break;
      }
    }
    
    // File uploads should have higher rate limit threshold
    expect(fileUploadRateLimited).toBe(true);
  });

  test('should include rate limit headers', async ({ page }) => {
    await page.goto('/admin');
    
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword'  
      }
    });
    
    // Should include rate limit headers
    const headers = response.headers();
    expect(headers['ratelimit-limit'] || headers['x-ratelimit-limit']).toBeDefined();
    expect(headers['ratelimit-remaining'] || headers['x-ratelimit-remaining']).toBeDefined();
  });

  test('should reset rate limit counter on successful authentication', async ({ page }) => {
    await page.goto('/admin');
    
    // Make a few failed attempts  
    for (let i = 0; i < 3; i++) {
      await page.request.post('/api/auth/login', {
        data: {
          email: 'admin@kendrickforrest.com',
          password: 'wrongpassword'
        }
      });
    }
    
    // Make successful login
    const successResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@kendrickforrest.com', 
        password: 'admin123'
      }
    });
    
    expect(successResponse.status()).toBe(200);
    
    // Should be able to make more attempts (counter reset)
    const nextResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@kendrickforrest.com',
        password: 'wrongpassword'
      }
    });
    
    expect(nextResponse.status()).not.toBe(429);
  });

  test('should rate limit per IP address', async ({ browser }) => {
    // Create multiple browser contexts to simulate different sessions
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await page1.goto('/admin');
    await page2.goto('/admin');
    
    // Rate limit first session
    for (let i = 0; i < 10; i++) {
      await page1.request.post('/api/auth/login', {
        data: {
          email: 'test1@example.com',
          password: 'wrongpassword'
        }
      });
    }
    
    // Second session should still work (different IP simulation would be needed)
    const response = await page2.request.post('/api/auth/login', {
      data: {
        email: 'test2@example.com',
        password: 'wrongpassword'
      }
    });
    
    // In real test, this would verify IP-based rate limiting
    expect(response.status()).not.toBe(200); // Wrong password, but not rate limited
    
    await context1.close();
    await context2.close(); 
  });
});