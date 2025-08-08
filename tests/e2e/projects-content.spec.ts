import { test, expect } from '@playwright/test';

test.describe('Projects Content Test', () => {
  test('should display actual project cards', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:3000/portal');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Login
    await page.fill('input[type="email"]', 'client@example.com');
    await page.fill('input[type="password"]', 'client123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to projects
    await page.click('a:has-text("Projects")');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'projects-page.png', fullPage: true });
    
    // Check projects list content (specifically in projects section)
    const projectsList = page.locator('#projects .projects-list');
    const projectsContent = await projectsList.innerHTML();
    
    console.log('\n=== Projects List Content ===');
    console.log('Total HTML length:', projectsContent.length);
    
    // Check for specific elements
    const hasLoadingMessage = projectsContent.includes('Loading projects');
    const hasProjectsContainer = projectsContent.includes('projects-container');
    const hasProjectCards = projectsContent.includes('project-card');
    const hasMyProjects = projectsContent.includes('My Projects');
    
    console.log('Has loading message:', hasLoadingMessage);
    console.log('Has projects container:', hasProjectsContainer);
    console.log('Has project cards:', hasProjectCards);
    console.log('Has "My Projects" title:', hasMyProjects);
    
    // Count project cards
    const projectCards = page.locator('.project-card');
    const cardCount = await projectCards.count();
    console.log('Number of project cards:', cardCount);
    
    // If we have project cards, list them
    if (cardCount > 0) {
      console.log('\n=== Project Cards Found ===');
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = projectCards.nth(i);
        const title = await card.locator('.project-title, h3').textContent();
        const status = await card.locator('.project-status').textContent().catch(() => 'N/A');
        console.log(`${i + 1}. ${title} - Status: ${status}`);
      }
    }
    
    // Check for error messages
    const errorMessage = page.locator('.error-message');
    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\n⚠️ Error message found:', await errorMessage.textContent());
    }
    
    // Get first 1000 chars of content for debugging
    console.log('\n=== First 1000 chars of projects list ===');
    console.log(projectsContent.substring(0, 1000));
  });
});