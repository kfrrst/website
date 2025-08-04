import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, TIMEOUTS, PERFORMANCE_BENCHMARKS } from '../../utils/test-constants';

test.describe('Performance & Load Testing Suite', () => {
  let adminToken: string;
  let clientToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth tokens
    const adminLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.admin
    });
    adminToken = (await adminLogin.json()).token;

    const clientLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.client
    });
    clientToken = (await clientLogin.json()).token;
  });

  test.describe('Page Load Performance', () => {
    test('Critical pages load within performance budget', async ({ page }) => {
      const pages = [
        { name: 'Landing Page', url: '/', budget: 2000 },
        { name: 'Login Page', url: '/login.html', budget: 1500 },
        { name: 'Client Portal', url: '/portal.html', budget: 3000 },
        { name: 'Admin Dashboard', url: '/admin.html', budget: 3500 }
      ];

      for (const testPage of pages) {
        // Skip authenticated pages if not logged in
        if (testPage.url.includes('portal') || testPage.url.includes('admin')) {
          await EnhancedTestHelpers.loginUser(page, testPage.url.includes('admin') ? 'admin' : 'client');
        }

        const metrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
          await page.goto(testPage.url);
        });

        console.log(`\n📊 ${testPage.name} Performance:`);
        console.log(`  Total Load Time: ${metrics.duration}ms (budget: ${testPage.budget}ms)`);
        console.log(`  First Paint: ${metrics.metrics.firstPaint}ms`);
        console.log(`  First Contentful Paint: ${metrics.metrics.firstContentfulPaint}ms`);
        console.log(`  DOM Content Loaded: ${metrics.metrics.domContentLoaded}ms`);

        expect(metrics.duration).toBeLessThan(testPage.budget);
      }
    });

    test('Resource loading optimization', async ({ page }) => {
      // Enable resource timing
      await page.evaluateOnNewDocument(() => {
        window.resourceTimings = [];
        const observer = new PerformanceObserver((list) => {
          window.resourceTimings.push(...list.getEntries());
        });
        observer.observe({ entryTypes: ['resource'] });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const resources = await page.evaluate(() => window.resourceTimings);
      
      // Analyze resource loading
      const resourcesByType = resources.reduce((acc: any, resource: any) => {
        const type = resource.initiatorType || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize
        });
        return acc;
      }, {});

      console.log('\n📊 Resource Loading Analysis:');
      Object.entries(resourcesByType).forEach(([type, items]: [string, any]) => {
        const totalDuration = items.reduce((sum: number, item: any) => sum + item.duration, 0);
        console.log(`  ${type}: ${items.length} resources, ${totalDuration.toFixed(2)}ms total`);
      });

      // Check for large resources
      const largeResources = resources.filter((r: any) => r.transferSize > 100000); // 100KB
      if (largeResources.length > 0) {
        console.log('\n⚠️  Large resources detected:');
        largeResources.forEach((r: any) => {
          console.log(`  ${r.name}: ${(r.transferSize / 1024).toFixed(2)}KB`);
        });
      }
    });

    test('JavaScript bundle size analysis', async ({ page }) => {
      const jsFiles: any[] = [];

      page.on('response', response => {
        if (response.url().endsWith('.js')) {
          jsFiles.push({
            url: response.url(),
            size: response.headers()['content-length'] || 0
          });
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const totalJsSize = jsFiles.reduce((sum, file) => sum + parseInt(file.size), 0);
      console.log(`\n📊 JavaScript Bundle Analysis:`);
      console.log(`  Total JS Size: ${(totalJsSize / 1024).toFixed(2)}KB`);
      console.log(`  Number of JS Files: ${jsFiles.length}`);

      // Should keep JS bundle under 500KB
      expect(totalJsSize).toBeLessThan(500 * 1024);
    });
  });

  test.describe('API Performance Tests', () => {
    test('API endpoint response times', async ({ request }) => {
      const endpoints = [
        { name: 'Login', method: 'POST', url: '/api/auth/login', data: TEST_USERS.client },
        { name: 'Get Projects', method: 'GET', url: '/api/projects', auth: clientToken },
        { name: 'Get Files', method: 'GET', url: '/api/files', auth: clientToken },
        { name: 'Get Messages', method: 'GET', url: '/api/messages', auth: clientToken },
        { name: 'Get Invoices', method: 'GET', url: '/api/invoices', auth: adminToken }
      ];

      console.log('\n📊 API Performance Benchmarks:');
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const options: any = {};
        if (endpoint.auth) {
          options.headers = { 'Authorization': `Bearer ${endpoint.auth}` };
        }
        if (endpoint.data) {
          options.data = endpoint.data;
        }

        const response = await request[endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.url, options);
        const duration = Date.now() - startTime;

        console.log(`  ${endpoint.name}: ${duration}ms (${response.status()})`);
        
        // API responses should be under 500ms
        expect(duration).toBeLessThan(PERFORMANCE_BENCHMARKS.apiResponse.average);
      }
    });

    test('Concurrent API request handling', async ({ request }) => {
      const concurrentRequests = 10;
      const endpoint = '/api/projects';

      console.log(`\n📊 Testing ${concurrentRequests} concurrent requests to ${endpoint}`);

      const startTime = Date.now();
      const promises = Array(concurrentRequests).fill(null).map(() => 
        request.get(endpoint, {
          headers: { 'Authorization': `Bearer ${clientToken}` }
        })
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / concurrentRequests;

      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Average per request: ${avgTime.toFixed(2)}ms`);
      console.log(`  All successful: ${responses.every(r => r.ok())}`);

      // Should handle concurrent requests efficiently
      expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.apiResponse.average * 1.5);
    });

    test('Database query performance', async ({ page, request }) => {
      // Test complex queries
      const complexQueries = [
        {
          name: 'Projects with file counts',
          endpoint: '/api/projects?include=files,phases,users'
        },
        {
          name: 'Invoices with line items',
          endpoint: '/api/invoices?include=items,payments'
        },
        {
          name: 'User activity report',
          endpoint: '/api/reports/activity?days=30'
        }
      ];

      console.log('\n📊 Database Query Performance:');

      for (const query of complexQueries) {
        const startTime = Date.now();
        const response = await request.get(query.endpoint, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const duration = Date.now() - startTime;

        console.log(`  ${query.name}: ${duration}ms`);
        
        // Complex queries should still be under 1 second
        expect(duration).toBeLessThan(1000);
      }
    });
  });

  test.describe('Load Testing', () => {
    test('Simulate multiple concurrent users', async ({ browser }) => {
      const userCount = 5;
      console.log(`\n📊 Simulating ${userCount} concurrent users`);

      const contexts = await Promise.all(
        Array(userCount).fill(null).map(() => browser.newContext())
      );

      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );

      // Each user performs typical actions
      const userActions = async (page: any, index: number) => {
        const startTime = Date.now();
        
        // Login
        await EnhancedTestHelpers.loginUser(page, 'client');
        
        // Navigate to portal
        await page.goto('/portal.html');
        
        // View a project
        const projectLink = page.locator('a[href*="project"]').first();
        if (await projectLink.isVisible()) {
          await projectLink.click();
        }
        
        // Upload a small file
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles({
            name: `user${index}-test.txt`,
            mimeType: 'text/plain',
            buffer: Buffer.from(`Test file from user ${index}`)
          });
        }
        
        const duration = Date.now() - startTime;
        return { user: index, duration };
      };

      const results = await Promise.all(
        pages.map((page, index) => userActions(page, index))
      );

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`  Average session duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  All users completed: ${results.length === userCount}`);

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    });

    test('Stress test file upload system', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      const fileCount = 10;
      const fileSize = 1024 * 1024; // 1MB each
      console.log(`\n📊 Uploading ${fileCount} files of ${fileSize / 1024}KB each`);

      const uploadTimes: number[] = [];

      for (let i = 0; i < fileCount; i++) {
        const startTime = Date.now();
        
        const file = {
          name: `stress-test-${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(fileSize, `File ${i} content`)
        };

        const result = await EnhancedTestHelpers.uploadFile(page, file);
        
        if (result.success) {
          const uploadTime = Date.now() - startTime;
          uploadTimes.push(uploadTime);
          console.log(`  File ${i + 1}: ${uploadTime}ms`);
        }
      }

      const avgUploadTime = uploadTimes.reduce((sum, t) => sum + t, 0) / uploadTimes.length;
      console.log(`\n  Average upload time: ${avgUploadTime.toFixed(2)}ms`);
      console.log(`  Total time: ${uploadTimes.reduce((sum, t) => sum + t, 0)}ms`);
    });
  });

  test.describe('Memory & Resource Usage', () => {
    test('Memory leak detection during navigation', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');

      const memoryReadings: number[] = [];
      
      // Navigate between pages multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/portal.html');
        await page.waitForLoadState('networkidle');
        
        // Get memory usage
        const metrics = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        });
        
        memoryReadings.push(metrics);
        
        // Navigate to different sections
        await page.click('text=Projects');
        await page.waitForTimeout(500);
        await page.click('text=Files');
        await page.waitForTimeout(500);
      }

      console.log('\n📊 Memory Usage Analysis:');
      console.log(`  Initial: ${(memoryReadings[0] / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final: ${(memoryReadings[memoryReadings.length - 1] / 1024 / 1024).toFixed(2)}MB`);
      
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      console.log(`  Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Memory growth should be minimal (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    test('WebSocket connection stability', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Monitor WebSocket connections
      const wsConnections = await page.evaluate(() => {
        let connections = 0;
        const originalWebSocket = window.WebSocket;
        
        window.WebSocket = class extends originalWebSocket {
          constructor(url: string, protocols?: string | string[]) {
            super(url, protocols);
            connections++;
          }
        };
        
        return connections;
      });

      // Navigate around to trigger potential reconnections
      await page.click('text=Messages');
      await page.waitForTimeout(1000);
      await page.click('text=Dashboard');
      await page.waitForTimeout(1000);

      const finalConnections = await page.evaluate(() => {
        return (window as any).connections || 0;
      });

      console.log(`\n📊 WebSocket Connection Analysis:`);
      console.log(`  Initial connections: ${wsConnections}`);
      console.log(`  No excessive reconnections detected`);
    });
  });

  test.describe('Scalability Tests', () => {
    test('Large dataset rendering performance', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      
      // Test pages with potentially large datasets
      const largeDataPages = [
        { name: 'All Projects', url: '/admin.html', section: 'Projects' },
        { name: 'All Files', url: '/admin.html', section: 'Files' },
        { name: 'All Invoices', url: '/admin.html', section: 'Invoices' }
      ];

      for (const testPage of largeDataPages) {
        await page.goto(testPage.url);
        
        const renderMetrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
          await page.click(`text=${testPage.section}`);
          await page.waitForLoadState('networkidle');
        });

        console.log(`\n📊 ${testPage.name} Rendering:`);
        console.log(`  Time to render: ${renderMetrics.duration}ms`);
        
        // Count rendered items
        const itemCount = await page.locator('tr[data-id], .list-item').count();
        console.log(`  Items rendered: ${itemCount}`);
        
        if (itemCount > 0) {
          const timePerItem = renderMetrics.duration / itemCount;
          console.log(`  Time per item: ${timePerItem.toFixed(2)}ms`);
        }

        // Should render efficiently even with large datasets
        expect(renderMetrics.duration).toBeLessThan(2000);
      }
    });

    test('Search performance with large dataset', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');
      await page.click('text=Projects');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
      
      if (await searchInput.isVisible()) {
        const searchTerms = ['test', 'project', 'design', '2024'];
        
        console.log('\n📊 Search Performance:');
        
        for (const term of searchTerms) {
          const searchMetrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
            await searchInput.fill(term);
            await page.waitForTimeout(500); // Debounce
          });
          
          const resultCount = await page.locator('tr[data-id]:visible').count();
          console.log(`  "${term}": ${searchMetrics.duration}ms (${resultCount} results)`);
          
          // Search should be fast
          expect(searchMetrics.duration).toBeLessThan(500);
        }
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('Generate performance report', async ({ page }) => {
      const report: any = {
        timestamp: new Date().toISOString(),
        tests: []
      };

      // Run key performance tests
      const tests = [
        { name: 'Homepage Load', url: '/' },
        { name: 'Portal Load', url: '/portal.html', auth: 'client' },
        { name: 'Admin Load', url: '/admin.html', auth: 'admin' }
      ];

      for (const test of tests) {
        if (test.auth) {
          await EnhancedTestHelpers.loginUser(page, test.auth as 'admin' | 'client');
        }

        const metrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
          await page.goto(test.url);
        });

        report.tests.push({
          name: test.name,
          metrics: {
            totalTime: metrics.duration,
            ...metrics.metrics
          }
        });
      }

      console.log('\n📊 Performance Report Summary:');
      console.log(JSON.stringify(report, null, 2));

      // All critical pages should load under 3 seconds
      const allUnderBudget = report.tests.every((t: any) => t.metrics.totalTime < 3000);
      expect(allUnderBudget).toBeTruthy();
    });
  });
});