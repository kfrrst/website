import { test, expect } from '@playwright/test';

test.describe('Admin Portal Navigation and Module Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });
    
    // Login to admin portal
    await page.goto('/admin.html');
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to be visible
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000); // Give modules time to initialize
  });

  test('Check module initialization errors', async ({ page }) => {
    // Capture network failures
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // Capture 404 responses
    const notFoundRequests = [];
    page.on('response', response => {
      if (response.status() === 404) {
        notFoundRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Check console for module errors
    const moduleErrors = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      
      // Capture console messages
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('module initialization failed') || 
            message.includes('timeout') ||
            message.includes('will be unavailable')) {
          logs.push({ type: 'log', message });
        }
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        logs.push({ type: 'error', message: args.join(' ') });
        originalError.apply(console, args);
      };
      
      return logs;
    });
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(6000); // Wait longer than the 5s timeout
    
    console.log('\n=== Module Initialization Analysis ===');
    console.log('Failed Requests:', failedRequests);
    console.log('404 Endpoints:', notFoundRequests);
    console.log('Module Errors:', moduleErrors);
    
    // Check which modules initialized successfully
    const moduleStatus = await page.evaluate(() => {
      if (!window.adminDashboard || !window.adminDashboard.modules) {
        return { error: 'Admin dashboard not found' };
      }
      
      const modules = window.adminDashboard.modules;
      const status = {};
      
      for (const [name, module] of Object.entries(modules)) {
        status[name] = {
          exists: !!module,
          initialized: module ? module.initialized : false,
          hasElement: module && module.element ? !!module.element : false
        };
      }
      
      return status;
    });
    
    console.log('\n=== Module Status ===');
    console.log(JSON.stringify(moduleStatus, null, 2));
  });

  test('Navigate through all admin sections', async ({ page }) => {
    const sections = [
      { name: 'Overview', selector: 'a[href="#overview"]', contentId: 'overview' },
      { name: 'Clients', selector: 'a[href="#clients"]', contentId: 'clients' },
      { name: 'Projects', selector: 'a[href="#projects"]', contentId: 'projects' },
      { name: 'Invoices', selector: 'a[href="#invoices"]', contentId: 'invoices' },
      { name: 'Files', selector: 'a[href="#files"]', contentId: 'files' },
      { name: 'Messages', selector: 'a[href="#messages"]', contentId: 'messages' },
      { name: 'Inquiries', selector: 'a[href="#inquiries"]', contentId: 'inquiries' },
      { name: 'Phase Management', selector: 'a[href="#phases"]', contentId: 'phases' },
      { name: 'Settings', selector: 'a[href="#settings"]', contentId: 'settings' }
    ];
    
    for (const section of sections) {
      console.log(`\n=== Testing ${section.name} Section ===`);
      
      // Capture errors for this section
      const sectionErrors = [];
      page.once('pageerror', error => {
        sectionErrors.push(error.message);
      });
      
      // Click navigation link
      await page.click(section.selector);
      await page.waitForTimeout(1000);
      
      // Check if section is visible
      const sectionElement = await page.locator(`#${section.contentId}`);
      const isVisible = await sectionElement.isVisible();
      const hasActiveClass = await sectionElement.evaluate(el => el.classList.contains('active'));
      
      console.log(`Section visible: ${isVisible}`);
      console.log(`Has active class: ${hasActiveClass}`);
      
      // Check for content
      const contentText = await sectionElement.textContent();
      const hasContent = contentText && contentText.trim().length > 50;
      console.log(`Has content: ${hasContent}`);
      
      // Check for loading states
      const hasLoadingIndicator = await page.locator('.loading-indicator, .spinner, .loading').isVisible().catch(() => false);
      console.log(`Loading indicator: ${hasLoadingIndicator}`);
      
      // Report errors
      if (sectionErrors.length > 0) {
        console.log(`Errors: ${sectionErrors.join(', ')}`);
      }
      
      // Take screenshot of problematic sections
      if (!isVisible || !hasContent || sectionErrors.length > 0) {
        await page.screenshot({ 
          path: `admin-section-${section.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
      }
    }
  });

  test('Check Settings tab user management error', async ({ page }) => {
    // Navigate to settings
    await page.click('a[href="#settings"]');
    await page.waitForTimeout(1000);
    
    // Try to click on User Management tab if it exists
    const userManagementTab = await page.locator('text=User Management').first();
    if (await userManagementTab.isVisible()) {
      // Monitor for the specific error
      let errorCaptured = null;
      page.on('pageerror', error => {
        if (error.message.includes('Cannot read properties of undefined')) {
          errorCaptured = error;
        }
      });
      
      await userManagementTab.click();
      await page.waitForTimeout(1000);
      
      if (errorCaptured) {
        console.log('\n=== User Management Error ===');
        console.log('Error:', errorCaptured.message);
        
        // Check what data is causing the issue
        const userData = await page.evaluate(() => {
          if (window.adminDashboard && 
              window.adminDashboard.modules.settings && 
              window.adminDashboard.modules.settings.users) {
            return window.adminDashboard.modules.settings.users.map(user => ({
              id: user.id,
              email: user.email,
              hasFirstName: !!user.first_name,
              hasLastName: !!user.last_name,
              firstName: user.first_name,
              lastName: user.last_name
            }));
          }
          return null;
        });
        
        console.log('User data:', userData);
      }
    }
  });

  test('Check API endpoint availability', async ({ page }) => {
    // Get auth token
    const token = await page.evaluate(() => localStorage.getItem('adminToken'));
    
    if (!token) {
      console.log('No auth token found');
      return;
    }
    
    // Test each API endpoint
    const endpoints = [
      '/api/dashboard/stats',
      '/api/clients',
      '/api/projects',
      '/api/invoices',
      '/api/files',
      '/api/messages/conversations',
      '/api/settings',
      '/api/users'
    ];
    
    console.log('\n=== API Endpoint Status ===');
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`${endpoint}: ${response.status()} ${response.statusText()}`);
        
        if (response.status() === 404) {
          console.log(`  ❌ Endpoint not implemented`);
        } else if (response.ok()) {
          const data = await response.json();
          console.log(`  ✓ Response has ${Object.keys(data).join(', ')}`);
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
  });

  test('Check UI rendering issues', async ({ page }) => {
    // Take screenshots of current state
    await page.screenshot({ path: 'admin-portal-overview.png', fullPage: true });
    
    // Check for CSS loading issues
    const stylesheets = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.map(sheet => ({
        href: sheet.href,
        rules: sheet.cssRules ? sheet.cssRules.length : 0,
        disabled: sheet.disabled
      }));
    });
    
    console.log('\n=== Stylesheets ===');
    stylesheets.forEach(sheet => {
      console.log(`${sheet.href || 'inline'}: ${sheet.rules} rules, disabled: ${sheet.disabled}`);
    });
    
    // Check for missing elements
    const criticalElements = [
      '.admin-header',
      '.admin-nav',
      '.admin-content',
      '.stats-grid',
      '.stat-card'
    ];
    
    console.log('\n=== Critical Elements ===');
    for (const selector of criticalElements) {
      const exists = await page.locator(selector).first().isVisible().catch(() => false);
      console.log(`${selector}: ${exists ? '✓ Found' : '❌ Missing'}`);
    }
    
    // Check computed styles on main container
    const dashboardStyles = await page.locator('#admin-dashboard').evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        overflow: computed.overflow
      };
    });
    
    console.log('\n=== Dashboard Container Styles ===');
    console.log(JSON.stringify(dashboardStyles, null, 2));
  });

  test('Measure module initialization performance', async ({ page }) => {
    // Reload to measure fresh initialization
    await page.reload();
    
    // Re-login
    await page.waitForSelector('#email', { state: 'visible' });
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    
    // Start performance measurement
    await page.evaluate(() => {
      window.moduleTimings = [];
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('module initialized in')) {
          const match = message.match(/(\w+) module initialized in (\d+)ms/);
          if (match) {
            window.moduleTimings.push({
              module: match[1],
              time: parseInt(match[2])
            });
          }
        }
        originalLog.apply(console, args);
      };
    });
    
    await page.click('button[type="submit"]');
    
    // Wait for all modules to initialize (or timeout)
    await page.waitForTimeout(10000);
    
    const timings = await page.evaluate(() => window.moduleTimings || []);
    
    console.log('\n=== Module Initialization Times ===');
    timings.forEach(timing => {
      console.log(`${timing.module}: ${timing.time}ms`);
    });
    
    const totalTime = timings.reduce((sum, t) => sum + t.time, 0);
    console.log(`Total: ${totalTime}ms`);
    
    // Identify slow modules
    const slowModules = timings.filter(t => t.time > 1000);
    if (slowModules.length > 0) {
      console.log('\n⚠️  Slow modules (>1s):');
      slowModules.forEach(timing => {
        console.log(`  ${timing.module}: ${timing.time}ms`);
      });
    }
  });
});