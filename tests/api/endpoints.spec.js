import { test, expect } from '@playwright/test';

test.describe('API Endpoint Security Tests', () => {
  let adminToken;
  let clientToken; 
  
  test.beforeAll(async ({ request }) => {
    // Get admin token
    const adminResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@kendrickforrest.com',
        password: 'admin123'
      }
    });
    const adminData = await adminResponse.json();
    adminToken = adminData.accessToken;
    
    // Create and get client token
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        email: 'testclient@example.com',
        password: 'TestPassword123',
        name: 'Test Client'
      }
    });
    
    if (registerResponse.ok()) {
      const clientData = await registerResponse.json();
      clientToken = clientData.accessToken;
    } else {
      // Try to login if user already exists
      const loginResponse = await request.post('/api/auth/login', {
        data: {
          email: 'testclient@example.com',
          password: 'TestPassword123'
        }
      });
      if (loginResponse.ok()) {
        const clientData = await loginResponse.json();
        clientToken = clientData.accessToken;
      }
    }
  });

  test('should require authentication for protected endpoints', async ({ request }) => {
    const protectedEndpoints = [
      '/api/dashboard/stats',
      '/api/clients',
      '/api/projects', 
      '/api/invoices',
      '/api/files',
      '/api/users'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('should enforce role-based access control', async ({ request }) => {
    // Admin-only endpoints that clients should not access
    const adminOnlyEndpoints = [
      '/api/clients',
      '/api/users',
      '/api/dashboard/stats'
    ];
    
    for (const endpoint of adminOnlyEndpoints) {
      // Should work with admin token
      const adminResponse = await request.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      expect(adminResponse.status()).not.toBe(403);
      
      // Should be forbidden with client token
      if (clientToken) {
        const clientResponse = await request.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${clientToken}`
          }
        });
        expect(clientResponse.status()).toBe(403);
      }
    }
  });

  test('should validate JWT tokens properly', async ({ request }) => {
    const invalidTokens = [
      'invalid-token',
      'Bearer invalid',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      ''
    ];
    
    for (const token of invalidTokens) {
      const response = await request.get('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      expect(response.status()).toBe(401);
    }
  });

  test('should prevent unauthorized data access', async ({ request }) => {
    // Try to access another user's data
    const response = await request.get('/api/projects/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    
    // Should not return sensitive data for non-existent or unauthorized resources
    expect([404, 403]).toContain(response.status());
  });

  test('should validate UUID parameters', async ({ request }) => {
    const invalidUUIDs = [
      'invalid-uuid',
      '123',
      'not-a-uuid-at-all',
      'xxxx-xxxx-xxxx-xxxx'
    ];
    
    for (const invalidUUID of invalidUUIDs) {
      const response = await request.get(`/api/projects/${invalidUUID}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      expect(response.status()).toBe(400);
    }
  });

  test('should handle malformed JSON payloads', async ({ request }) => {
    const malformedPayloads = [
      '{"incomplete": json',
      '{malformed json}',
      'not json at all',
      '{"key": undefined}'
    ];
    
    for (const payload of malformedPayloads) {
      const response = await request.post('/api/projects', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: payload
      });
      expect(response.status()).toBe(400);
    }
  });

  test('should enforce CORS policies', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: {
        'Origin': 'http://malicious-site.com'
      },
      data: {
        email: 'admin@kendrickforrest.com',
        password: 'admin123'
      }
    });
    
    // Should be blocked by CORS or return appropriate headers
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).not.toBe('http://malicious-site.com');
  });

  test('should return appropriate error codes', async ({ request }) => {
    // Test various error scenarios
    const scenarios = [
      {
        endpoint: '/api/nonexistent',
        expectedStatus: 404,
        token: adminToken
      },
      {
        endpoint: '/api/projects',
        method: 'POST',
        data: { invalid: 'data' },
        expectedStatus: 400,
        token: adminToken
      },
      {
        endpoint: '/api/projects',
        method: 'GET',
        expectedStatus: 401,
        token: null
      }
    ];
    
    for (const scenario of scenarios) {
      let response;
      const headers = scenario.token ? {
        'Authorization': `Bearer ${scenario.token}`
      } : {};
      
      if (scenario.method === 'POST') {
        response = await request.post(scenario.endpoint, {
          headers,
          data: scenario.data
        });
      } else {
        response = await request.get(scenario.endpoint, { headers });
      }
      
      expect(response.status()).toBe(scenario.expectedStatus);
    }
  });

  test('should not expose sensitive information in error messages', async ({ request }) => {
    // Try to access non-existent user
    const response = await request.get('/api/users/00000000-0000-0000-0000-000000000000', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const errorData = await response.json();
    
    // Should not expose database schema, internal paths, or sensitive data
    const errorString = JSON.stringify(errorData).toLowerCase();
    expect(errorString).not.toContain('password');
    expect(errorString).not.toContain('secret');
    expect(errorString).not.toContain('database');
    expect(errorString).not.toContain('/users/');
  });

  test('should implement proper pagination limits', async ({ request }) => {
    // Test excessive pagination limits
    const response = await request.get('/api/projects?limit=10000&page=1', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    // Should enforce maximum limits
    expect(response.status()).toBe(400);
  });

  test('should validate Content-Type headers', async ({ request }) => {
    // Try to send data with incorrect content type
    const response = await request.post('/api/projects', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'text/plain'
      },
      data: 'not json data'
    });
    
    expect(response.status()).toBe(400);
  });

  test('should handle concurrent requests safely', async ({ request }) => {
    // Make multiple concurrent requests to test for race conditions
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.get('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // All requests should succeed or fail consistently
    const statuses = responses.map(r => r.status());
    const uniqueStatuses = [...new Set(statuses)];
    
    // Should not have inconsistent responses due to race conditions
    expect(uniqueStatuses.length).toBeLessThanOrEqual(2); // Allow for rate limiting
  });
});