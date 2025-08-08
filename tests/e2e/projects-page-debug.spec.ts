import { test, expect } from '@playwright/test';

test.describe('Projects Page Debug', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/portal');
    
    // Clear any existing auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Login via API
    const response = await page.request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'client@example.com',
        password: 'client123'
      }
    });

    expect(response.ok()).toBeTruthy();
    const loginData = await response.json();
    authToken = loginData.token || loginData.accessToken;
    
    // Store token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify({
        id: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e',
        email: 'client@example.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'client'
      }));
    }, authToken);
  });

  test('should load and display projects', async ({ page }) => {
    // Navigate to portal
    await page.goto('http://localhost:3000/portal');
    
    // Wait for portal to initialize
    await page.waitForTimeout(2000);
    
    // Check if dashboard loads
    await expect(page.locator('#dashboard')).toBeVisible();
    
    // Click on projects navigation
    const projectsLink = page.locator('a[data-section="projects"], a[href="#projects"]').first();
    await expect(projectsLink).toBeVisible();
    await projectsLink.click();
    
    // Wait for projects section to be visible
    await expect(page.locator('#projects')).toBeVisible();
    
    // Check for loading message
    const loadingMessage = page.locator('.projects-list .loading-message');
    const hasLoadingMessage = await loadingMessage.count() > 0;
    
    if (hasLoadingMessage) {
      console.log('Loading message found:', await loadingMessage.textContent());
      
      // Wait for projects to load (should replace loading message)
      await page.waitForTimeout(3000);
      
      // Check if loading message is still there
      const stillLoading = await loadingMessage.isVisible().catch(() => false);
      expect(stillLoading).toBeFalsy();
    }
    
    // Check for projects container
    const projectsContainer = page.locator('.projects-container, .projects-grid');
    await expect(projectsContainer).toBeVisible({ timeout: 10000 });
    
    // Check for project cards
    const projectCards = page.locator('.project-card');
    const projectCount = await projectCards.count();
    
    console.log(`Found ${projectCount} project cards`);
    expect(projectCount).toBeGreaterThan(0);
    
    // Verify at least one project is displayed correctly
    const firstProject = projectCards.first();
    await expect(firstProject).toBeVisible();
    
    // Check project details
    const projectTitle = firstProject.locator('.project-title, h3');
    await expect(projectTitle).toBeVisible();
    const titleText = await projectTitle.textContent();
    console.log('First project title:', titleText);
    expect(titleText).toBeTruthy();
  });

  test('should verify API returns projects', async ({ page }) => {
    // Test API directly
    const response = await page.request.get('http://localhost:3000/api/projects', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    console.log('API returned', data.projects?.length || 0, 'projects');
    expect(data.projects).toBeDefined();
    expect(data.projects.length).toBeGreaterThan(0);
    
    // Log first project for debugging
    if (data.projects.length > 0) {
      console.log('First project from API:', {
        name: data.projects[0].name,
        status: data.projects[0].status,
        id: data.projects[0].id
      });
    }
  });

  test('should check console errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to portal
    await page.goto('http://localhost:3000/portal');
    await page.waitForTimeout(2000);
    
    // Navigate to projects
    await page.click('a[data-section="projects"], a[href="#projects"]');
    await page.waitForTimeout(2000);
    
    // Check for JavaScript errors
    if (consoleErrors.length > 0) {
      console.log('Console errors found:');
      consoleErrors.forEach(error => console.log('  -', error));
    }
    
    // There should be no console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should inspect DOM structure', async ({ page }) => {
    await page.goto('http://localhost:3000/portal');
    await page.waitForTimeout(2000);
    
    // Navigate to projects
    await page.click('a[data-section="projects"], a[href="#projects"]');
    await page.waitForTimeout(1000);
    
    // Get the projects section HTML
    const projectsSectionHTML = await page.locator('#projects').innerHTML();
    console.log('Projects section HTML (first 500 chars):');
    console.log(projectsSectionHTML.substring(0, 500));
    
    // Check what's inside .projects-list
    const projectsListHTML = await page.locator('.projects-list').innerHTML();
    console.log('\nProjects list HTML:');
    console.log(projectsListHTML);
    
    // Check if ProjectsModule is initialized
    const moduleState = await page.evaluate(() => {
      const portal = (window as any).portal;
      if (portal && portal.modules && portal.modules.projects) {
        return {
          initialized: true,
          hasElement: !!portal.modules.projects.element,
          projectsCount: portal.modules.projects.projects?.length || 0,
          element: portal.modules.projects.element ? 'exists' : 'null'
        };
      }
      return { initialized: false };
    });
    
    console.log('\nProjectsModule state:', moduleState);
  });

  test('should trace module initialization', async ({ page }) => {
    // Inject logging before page loads
    await page.addInitScript(() => {
      // Override console.log to capture module logs
      const originalLog = console.log;
      (window as any).moduleLogs = [];
      console.log = function(...args) {
        originalLog.apply(console, args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        if (message.includes('ProjectsModule') || message.includes('projects')) {
          (window as any).moduleLogs.push(message);
        }
      };
    });
    
    await page.goto('http://localhost:3000/portal');
    await page.waitForTimeout(2000);
    
    // Get logs before navigation
    const logsBeforeNav = await page.evaluate(() => (window as any).moduleLogs || []);
    console.log('\nLogs before navigation to projects:');
    logsBeforeNav.forEach((log: string) => console.log('  -', log));
    
    // Navigate to projects
    await page.click('a[data-section="projects"], a[href="#projects"]');
    await page.waitForTimeout(2000);
    
    // Get all logs
    const allLogs = await page.evaluate(() => (window as any).moduleLogs || []);
    console.log('\nAll module logs:');
    allLogs.forEach((log: string) => console.log('  -', log));
  });
});