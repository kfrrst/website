import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration
const CLIENT_PORTAL_URL = '/portal';
const ADMIN_PORTAL_URL = '/admin';

// Test credentials
const TEST_CLIENT = {
  email: 'john.smith@nexuscreative.com',
  password: 'Password123!'
};

const TEST_ADMIN = {
  email: 'admin@kendrickforrest.com',
  password: 'admin123'
};

// Debug report path
const DEBUG_REPORT_PATH = path.join(process.cwd(), 'auth-debug-report.md');

// Helper to log debug info
async function logDebugInfo(page: Page, context: string) {
  const timestamp = new Date().toISOString();
  const currentUrl = page.url();
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Capture network errors
  page.on('requestfailed', request => {
    networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  
  // Get page content
  const pageContent = await page.content();
  const hasLoginForm = pageContent.includes('form') && pageContent.includes('password');
  const hasErrorMessage = pageContent.includes('error') || pageContent.includes('Error');
  
  // Get cookies
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'token' || c.name === 'authToken');
  
  // Get localStorage
  let localStorage: any = {};
  try {
    localStorage = await page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key);
        }
      }
      return items;
    });
  } catch (e) {
    // Ignore errors
  }
  
  const debugInfo = `
## Debug Info: ${context}
- Timestamp: ${timestamp}
- Current URL: ${currentUrl}
- Has Login Form: ${hasLoginForm}
- Has Error Message: ${hasErrorMessage}
- Auth Cookie Present: ${authCookie ? 'Yes' : 'No'}
- Console Errors: ${consoleErrors.length > 0 ? consoleErrors.join(', ') : 'None'}
- Network Errors: ${networkErrors.length > 0 ? networkErrors.join(', ') : 'None'}
- LocalStorage Keys: ${Object.keys(localStorage).join(', ') || 'None'}

`;
  
  await fs.appendFile(DEBUG_REPORT_PATH, debugInfo);
  
  return {
    currentUrl,
    hasLoginForm,
    hasErrorMessage,
    authCookie,
    consoleErrors,
    networkErrors,
    localStorage
  };
}

test.describe('Authentication Debug Tests', () => {
  test.beforeAll(async () => {
    // Clear previous debug report
    await fs.writeFile(DEBUG_REPORT_PATH, '# Authentication Debug Report\n\n');
  });
  
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Take screenshot on failure
      const screenshotPath = `auth-debug-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await fs.appendFile(DEBUG_REPORT_PATH, `\nScreenshot saved: ${screenshotPath}\n`);
    }
  });

  test('Client Portal - Login Flow Debug', async ({ page }) => {
    await fs.appendFile(DEBUG_REPORT_PATH, '\n# Client Portal Login Test\n\n');
    
    // Step 1: Navigate to client portal
    await page.goto(CLIENT_PORTAL_URL);
    const step1 = await logDebugInfo(page, 'Step 1: Initial Navigation');
    
    // Check if we're redirected to login
    if (!step1.currentUrl.includes('/login') && step1.hasLoginForm === false) {
      await fs.appendFile(DEBUG_REPORT_PATH, '⚠️ WARNING: Not redirected to login page\n');
    }
    
    // Step 2: Find and fill login form
    try {
      // Try different selectors for email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        '#email',
        '.email-input'
      ];
      
      let emailFound = false;
      for (const selector of emailSelectors) {
        const emailField = await page.locator(selector).first();
        if (await emailField.isVisible()) {
          await emailField.fill(TEST_CLIENT.email);
          emailFound = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Email field found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!emailFound) {
        await fs.appendFile(DEBUG_REPORT_PATH, '❌ ERROR: Could not find email field\n');
        throw new Error('Email field not found');
      }
      
      // Try different selectors for password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        '#password',
        '.password-input'
      ];
      
      let passwordFound = false;
      for (const selector of passwordSelectors) {
        const passwordField = await page.locator(selector).first();
        if (await passwordField.isVisible()) {
          await passwordField.fill(TEST_CLIENT.password);
          passwordFound = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Password field found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!passwordFound) {
        await fs.appendFile(DEBUG_REPORT_PATH, '❌ ERROR: Could not find password field\n');
        throw new Error('Password field not found');
      }
      
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Form filling error: ${error}\n`);
      throw error;
    }
    
    // Step 3: Submit form
    try {
      // Try different ways to submit
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'input[type="submit"]',
        '.login-button',
        '.submit-button'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        const submitButton = await page.locator(selector).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          submitted = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Submit button found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!submitted) {
        // Try pressing Enter
        await page.keyboard.press('Enter');
        await fs.appendFile(DEBUG_REPORT_PATH, '⚠️ Submit button not found, pressed Enter\n');
      }
      
      // Wait for navigation or error
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Form submission error: ${error}\n`);
    }
    
    // Step 4: Check post-login state
    await page.waitForTimeout(2000); // Give time for any redirects
    const step4 = await logDebugInfo(page, 'Step 4: Post-Login State');
    
    // Check if login was successful
    const loginSuccess = !step4.currentUrl.includes('/login') && !step4.hasErrorMessage;
    await fs.appendFile(DEBUG_REPORT_PATH, `\nLogin Success: ${loginSuccess ? '✓ YES' : '❌ NO'}\n`);
    
    if (!loginSuccess) {
      // Try to find error messages
      const errorSelectors = ['.error', '.alert', '.message', '[role="alert"]', '.error-message'];
      for (const selector of errorSelectors) {
        const errorElement = await page.locator(selector).first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          await fs.appendFile(DEBUG_REPORT_PATH, `Error message found: "${errorText}"\n`);
        }
      }
    }
    
    // Step 5: Check API endpoints
    await fs.appendFile(DEBUG_REPORT_PATH, '\n## API Endpoint Checks\n');
    
    const apiEndpoints = [
      '/api/auth/login',
      '/api/auth/verify',
      '/api/auth/me',
      '/api/auth/status'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(endpoint);
        await fs.appendFile(DEBUG_REPORT_PATH, `- ${endpoint}: ${response.status()} ${response.statusText()}\n`);
      } catch (error) {
        await fs.appendFile(DEBUG_REPORT_PATH, `- ${endpoint}: ERROR - ${error}\n`);
      }
    }
  });

  test('Admin Portal - Login Flow Debug', async ({ page }) => {
    await fs.appendFile(DEBUG_REPORT_PATH, '\n# Admin Portal Login Test\n\n');
    
    // Step 1: Navigate to admin portal
    await page.goto(ADMIN_PORTAL_URL);
    const step1 = await logDebugInfo(page, 'Step 1: Initial Navigation');
    
    // Check if we're redirected to login
    if (!step1.currentUrl.includes('/login') && step1.hasLoginForm === false) {
      await fs.appendFile(DEBUG_REPORT_PATH, '⚠️ WARNING: Not redirected to login page\n');
    }
    
    // Step 2: Find and fill login form
    try {
      // Try different selectors for email field
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        '#email',
        '.email-input'
      ];
      
      let emailFound = false;
      for (const selector of emailSelectors) {
        const emailField = await page.locator(selector).first();
        if (await emailField.isVisible()) {
          await emailField.fill(TEST_ADMIN.email);
          emailFound = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Email field found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!emailFound) {
        await fs.appendFile(DEBUG_REPORT_PATH, '❌ ERROR: Could not find email field\n');
        throw new Error('Email field not found');
      }
      
      // Try different selectors for password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        '#password',
        '.password-input'
      ];
      
      let passwordFound = false;
      for (const selector of passwordSelectors) {
        const passwordField = await page.locator(selector).first();
        if (await passwordField.isVisible()) {
          await passwordField.fill(TEST_ADMIN.password);
          passwordFound = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Password field found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!passwordFound) {
        await fs.appendFile(DEBUG_REPORT_PATH, '❌ ERROR: Could not find password field\n');
        throw new Error('Password field not found');
      }
      
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Form filling error: ${error}\n`);
      throw error;
    }
    
    // Step 3: Submit form
    try {
      // Try different ways to submit
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'input[type="submit"]',
        '.login-button',
        '.submit-button'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        const submitButton = await page.locator(selector).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          submitted = true;
          await fs.appendFile(DEBUG_REPORT_PATH, `✓ Submit button found with selector: ${selector}\n`);
          break;
        }
      }
      
      if (!submitted) {
        // Try pressing Enter
        await page.keyboard.press('Enter');
        await fs.appendFile(DEBUG_REPORT_PATH, '⚠️ Submit button not found, pressed Enter\n');
      }
      
      // Wait for navigation or error
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Form submission error: ${error}\n`);
    }
    
    // Step 4: Check post-login state
    await page.waitForTimeout(2000); // Give time for any redirects
    const step4 = await logDebugInfo(page, 'Step 4: Post-Login State');
    
    // Check if login was successful
    const loginSuccess = !step4.currentUrl.includes('/login') && !step4.hasErrorMessage;
    await fs.appendFile(DEBUG_REPORT_PATH, `\nLogin Success: ${loginSuccess ? '✓ YES' : '❌ NO'}\n`);
    
    if (!loginSuccess) {
      // Try to find error messages
      const errorSelectors = ['.error', '.alert', '.message', '[role="alert"]', '.error-message'];
      for (const selector of errorSelectors) {
        const errorElement = await page.locator(selector).first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          await fs.appendFile(DEBUG_REPORT_PATH, `Error message found: "${errorText}"\n`);
        }
      }
    }
  });

  test('Authentication Endpoint Tests', async ({ request }) => {
    await fs.appendFile(DEBUG_REPORT_PATH, '\n# Authentication Endpoint Tests\n\n');
    
    // Test client login endpoint
    try {
      const clientLoginResponse = await request.post('/api/auth/login', {
        data: {
          email: TEST_CLIENT.email,
          password: TEST_CLIENT.password
        }
      });
      
      const clientLoginData = await clientLoginResponse.json().catch(() => ({}));
      await fs.appendFile(DEBUG_REPORT_PATH, `## Client Login Endpoint\n`);
      await fs.appendFile(DEBUG_REPORT_PATH, `- Status: ${clientLoginResponse.status()}\n`);
      await fs.appendFile(DEBUG_REPORT_PATH, `- Response: ${JSON.stringify(clientLoginData, null, 2)}\n\n`);
      
      if (clientLoginResponse.ok() && clientLoginData.token) {
        // Test token verification
        const verifyResponse = await request.get('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${clientLoginData.token}`
          }
        });
        
        const verifyData = await verifyResponse.json().catch(() => ({}));
        await fs.appendFile(DEBUG_REPORT_PATH, `## Token Verification\n`);
        await fs.appendFile(DEBUG_REPORT_PATH, `- Status: ${verifyResponse.status()}\n`);
        await fs.appendFile(DEBUG_REPORT_PATH, `- Response: ${JSON.stringify(verifyData, null, 2)}\n\n`);
      }
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Client login endpoint error: ${error}\n\n`);
    }
    
    // Test admin login endpoint
    try {
      const adminLoginResponse = await request.post('/api/auth/login', {
        data: {
          email: TEST_ADMIN.email,
          password: TEST_ADMIN.password
        }
      });
      
      const adminLoginData = await adminLoginResponse.json().catch(() => ({}));
      await fs.appendFile(DEBUG_REPORT_PATH, `## Admin Login Endpoint\n`);
      await fs.appendFile(DEBUG_REPORT_PATH, `- Status: ${adminLoginResponse.status()}\n`);
      await fs.appendFile(DEBUG_REPORT_PATH, `- Response: ${JSON.stringify(adminLoginData, null, 2)}\n\n`);
    } catch (error) {
      await fs.appendFile(DEBUG_REPORT_PATH, `❌ Admin login endpoint error: ${error}\n\n`);
    }
  });

  test('Check Database Connection', async ({ page }) => {
    await fs.appendFile(DEBUG_REPORT_PATH, '\n# Database Connection Test\n\n');
    
    // Check if database endpoints are accessible
    const dbEndpoints = [
      '/api/health',
      '/api/status',
      '/api/db-check'
    ];
    
    for (const endpoint of dbEndpoints) {
      try {
        const response = await page.request.get(endpoint);
        const data = await response.json().catch(() => ({}));
        await fs.appendFile(DEBUG_REPORT_PATH, `- ${endpoint}: ${response.status()} - ${JSON.stringify(data)}\n`);
      } catch (error) {
        await fs.appendFile(DEBUG_REPORT_PATH, `- ${endpoint}: ERROR - ${error}\n`);
      }
    }
  });
});

test.describe('Authentication Visual Tests', () => {
  test('Capture Login Pages', async ({ page }) => {
    await fs.appendFile(DEBUG_REPORT_PATH, '\n# Visual Captures\n\n');
    
    // Capture client portal login
    await page.goto(CLIENT_PORTAL_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'client-portal-login.png', 
      fullPage: true 
    });
    await fs.appendFile(DEBUG_REPORT_PATH, '- Client portal login screenshot: client-portal-login.png\n');
    
    // Capture admin portal login
    await page.goto(ADMIN_PORTAL_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'admin-portal-login.png', 
      fullPage: true 
    });
    await fs.appendFile(DEBUG_REPORT_PATH, '- Admin portal login screenshot: admin-portal-login.png\n');
  });
});

// After all tests, provide summary
test.afterAll(async () => {
  await fs.appendFile(DEBUG_REPORT_PATH, '\n# Summary\n\n');
  await fs.appendFile(DEBUG_REPORT_PATH, 'Debug report completed. Check the screenshots and error logs above to identify authentication issues.\n');
  
  console.log('\n🔍 Authentication debug tests completed!');
  console.log(`📄 Debug report saved to: ${DEBUG_REPORT_PATH}`);
  console.log('📸 Screenshots saved to project root');
});