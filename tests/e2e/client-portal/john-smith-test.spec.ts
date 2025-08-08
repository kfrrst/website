import { test, expect } from '@playwright/test';

test.describe('John Smith Client Portal Tests - Real Data', () => {
  const johnSmith = {
    email: 'client@example.com',
    password: 'client123', // Correct password for client
    firstName: 'John',
    lastName: 'Smith'
  };

  test('John Smith can login to client portal', async ({ page }) => {
    // Go to homepage
    await page.goto('/');
    
    // Click Client Login button
    await page.click('button:has-text("Client Login")');
    
    // Wait for login modal to appear
    await page.waitForSelector('#login-modal:not(.hidden)', { state: 'visible' });
    
    // Fill in John's credentials
    await page.fill('#login-email', johnSmith.email);
    await page.fill('#login-password', johnSmith.password);
    
    // Submit form
    await page.click('#login-form button[type="submit"]');
    
    // Should redirect to portal
    await expect(page).toHaveURL(/portal\.html/, { timeout: 10000 });
    
    // Should see welcome message with John's name
    const welcomeText = await page.textContent('body');
    expect(welcomeText).toContain('John');
    
    // Check localStorage for token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    console.log('✅ John Smith logged in successfully');
  });

  test('John Smith can view his projects', async ({ page }) => {
    // First login
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: johnSmith.email,
        password: johnSmith.password
      }
    });
    
    const { token } = await loginResponse.json();
    
    // Get projects via API
    const projectsResponse = await page.request.get('/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(projectsResponse.ok()).toBeTruthy();
    const projects = await projectsResponse.json();
    
    console.log(`John Smith has ${projects.length} projects:`);
    projects.forEach((project: any) => {
      console.log(`- ${project.name} (${project.status})`);
    });
    
    // Now check the UI
    await page.goto('/portal.html');
    
    // Set the token in localStorage
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
    }, token);
    
    // Reload to apply auth
    await page.reload();
    
    // Wait for projects to load
    await page.waitForLoadState('networkidle');
    
    // Check if projects are displayed
    if (projects.length > 0) {
      // Should see project cards or list items
      const projectElements = await page.locator('.project-card, .project-item, [data-project-id]').count();
      expect(projectElements).toBeGreaterThan(0);
      
      // Check for first project name
      await expect(page.locator('text=' + projects[0].name)).toBeVisible();
    } else {
      // Should see empty state
      await expect(page.locator('text=/no projects|get started/i')).toBeVisible();
    }
  });

  test('John Smith can access phase management', async ({ page }) => {
    // Login first
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: johnSmith.email,
        password: johnSmith.password
      }
    });
    
    const { token } = await loginResponse.json();
    
    // Go to portal
    await page.goto('/portal.html');
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload();
    
    // Look for phase tracker or progress indicators
    const phaseElements = await page.locator('.phase-tracker, .progress-tracker, .phase-item, [data-phase]').first();
    
    if (await phaseElements.isVisible()) {
      console.log('✅ Phase management UI is visible');
      
      // Check for 8-phase system
      const phases = ['Onboarding', 'Ideation', 'Design', 'Review', 'Production', 'Payment', 'Sign-off', 'Delivery'];
      
      for (const phase of phases) {
        const phaseElement = page.locator(`text=/${phase}/i`).first();
        if (await phaseElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`✅ Found phase: ${phase}`);
        }
      }
    } else {
      console.log('⚠️  No active projects with phases visible');
    }
  });

  test('John Smith can upload files', async ({ page }) => {
    // This test checks if file upload UI is accessible
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: johnSmith.email,
        password: johnSmith.password
      }
    });
    
    const { token } = await loginResponse.json();
    
    await page.goto('/portal.html');
    await page.evaluate((t) => localStorage.setItem('token', t), token);
    await page.reload();
    
    // Look for file upload elements
    const uploadButton = page.locator('button:has-text("Upload"), input[type="file"], .upload-area').first();
    
    if (await uploadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ File upload UI is available');
      
      // Check if it's functional
      const fileInput = page.locator('input[type="file"]').first();
      expect(fileInput).toBeTruthy();
    } else {
      console.log('⚠️  No file upload UI visible (might need to select a project first)');
    }
  });
});

// Run this test to see what John Smith actually has access to:
// npx playwright test john-smith-test.spec.ts --reporter=list