import { test, expect } from '@playwright/test';

test.describe('Check Initialization Errors', () => {
  test('Check for errors during module initialization', async ({ page }) => {
    // Capture all console messages and errors
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });
    
    // Add script to intercept initializeDashboard
    await page.addInitScript(() => {
      window.dashboardInitCalled = false;
      window.dashboardInitError = null;
      
      // Override console.log to capture specific messages
      const originalLog = console.log;
      window.consoleMessages = [];
      console.log = (...args) => {
        window.consoleMessages.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });
    
    // Navigate to admin portal
    await page.goto('/admin.html');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    
    // Click login and wait
    await page.click('button[type="submit"]');
    
    // Wait for login response
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/login') && response.status() === 200
    );
    
    // Wait longer for all modules to initialize
    await page.waitForTimeout(5000);
    
    // Also try to wait for specific log messages
    try {
      await page.waitForFunction(() => {
        const messages = window.consoleMessages || [];
        return messages.some(msg => 
          msg.includes('initializeDashboard called') || 
          msg.includes('settings module initialized') || // Last module
          msg.includes('module initialization failed')
        );
      }, { timeout: 10000 });
    } catch (e) {
      // Timeout is okay, we'll check the logs
    }
    
    // Get all console messages
    const allMessages = await page.evaluate(() => window.consoleMessages || []);
    
    // Look for specific messages
    const dashboardInitMessage = allMessages.find(msg => msg.includes('initializeDashboard'));
    const errorMessages = allMessages.filter(msg => msg.includes('failed') || msg.includes('error'));
    const lastModuleInit = allMessages.filter(msg => msg.includes('module initialized')).pop();
    
    console.log('\n=== Analysis ===');
    console.log('Dashboard init called:', !!dashboardInitMessage);
    console.log('Last module initialized:', lastModuleInit);
    console.log('Error messages found:', errorMessages.length);
    
    if (errorMessages.length > 0) {
      console.log('\n=== Errors ===');
      errorMessages.forEach(err => console.log('❌', err));
    }
    
    // Check if all expected modules were initialized
    const expectedModules = ['dashboard', 'clients', 'projects', 'invoices', 'files', 'messages', 'reports', 'settings'];
    const initializedModules = allMessages
      .filter(msg => msg.includes('module initialized'))
      .map(msg => {
        const match = msg.match(/(\w+) module initialized/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    
    console.log('\n=== Module Initialization ===');
    console.log('Expected modules:', expectedModules.length);
    console.log('Initialized modules:', initializedModules.length);
    console.log('Initialized:', initializedModules.join(', '));
    
    const missingModules = expectedModules.filter(m => !initializedModules.includes(m));
    if (missingModules.length > 0) {
      console.log('Missing modules:', missingModules.join(', '));
    }
    
    // Check final state
    const dashboardVisible = await page.locator('#admin-dashboard').isVisible();
    const hasHiddenClass = await page.locator('#admin-dashboard').evaluate(el => el.classList.contains('hidden'));
    
    console.log('\n=== Final State ===');
    console.log('Dashboard visible:', dashboardVisible);
    console.log('Has hidden class:', hasHiddenClass);
    
    // Print last few console messages
    console.log('\n=== Last Console Messages ===');
    const lastMessages = allMessages.slice(-10);
    lastMessages.forEach(msg => console.log(msg));
  });
});