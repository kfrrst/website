import { test, expect } from '@playwright/test';

test.describe('Portal Basic Test', () => {
  test('should check portal login and basic structure', async ({ page }) => {
    // Clear storage
    await page.goto('http://localhost:3000/portal');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Check if login form is visible
    const emailInput = page.locator('input[type="email"], input#email');
    const passwordInput = page.locator('input[type="password"], input#password');
    
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Login form is visible, logging in...');
      
      // Fill login form
      await emailInput.fill('client@example.com');
      await passwordInput.fill('client123');
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Login")');
      await submitButton.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
    } else {
      console.log('No login form visible, checking if already logged in...');
      
      // Try to login via localStorage
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'test-token');
        localStorage.setItem('user', JSON.stringify({
          id: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e',
          email: 'client@example.com',
          firstName: 'John',
          lastName: 'Smith',
          role: 'client'
        }));
      });
      
      // Reload to apply auth
      await page.reload();
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'portal-state.png', fullPage: true });
    
    // Check what's visible
    console.log('\n=== Portal State ===');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    // Check for main sections
    const sections = {
      'Dashboard': '#dashboard',
      'Projects': '#projects',
      'Navigation': '.portal-nav, .navigation, nav',
      'Sidebar': '.sidebar',
      'Main Content': 'main, .main-content',
      'Login Form': '.login-form, form',
      'Portal Container': '.portal-container'
    };
    
    for (const [name, selector] of Object.entries(sections)) {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`${name}: ${isVisible ? '✓ visible' : '✗ not visible'}`);
    }
    
    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Try to navigate to projects if possible
    const projectsLink = page.locator('a:has-text("Projects"), a[href="#projects"], [data-section="projects"]').first();
    if (await projectsLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\nClicking on Projects link...');
      await projectsLink.click();
      await page.waitForTimeout(2000);
      
      // Check projects section
      const projectsSection = page.locator('#projects');
      const projectsVisible = await projectsSection.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`Projects section: ${projectsVisible ? '✓ visible' : '✗ not visible'}`);
      
      if (projectsVisible) {
        const projectsContent = await projectsSection.innerHTML();
        console.log('Projects content length:', projectsContent.length);
        console.log('First 200 chars:', projectsContent.substring(0, 200));
      }
    } else {
      console.log('\nProjects link not found or not visible');
    }
    
    // Log console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach(err => console.log('  -', err));
    }
    
    // Get portal status from JavaScript
    const portalStatus = await page.evaluate(() => {
      const portal = (window as any).portal;
      if (!portal) return { exists: false };
      
      return {
        exists: true,
        initialized: portal.initialized || false,
        authenticated: !!portal.authToken,
        currentSection: portal.currentSection || 'none',
        modules: Object.keys(portal.modules || {}),
        user: portal.currentUser ? { email: portal.currentUser.email } : null
      };
    });
    
    console.log('\n=== Portal Object Status ===');
    console.log(JSON.stringify(portalStatus, null, 2));
  });
});