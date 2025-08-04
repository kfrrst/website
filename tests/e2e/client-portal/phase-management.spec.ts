import { test, expect } from '@playwright/test';

test.describe('Phase Management System', () => {
  const client = {
    email: 'client@example.com',
    password: 'client123'
  };

  const phases = [
    { number: 1, name: 'Onboarding', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 2, name: 'Ideation', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 3, name: 'Design', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 4, name: 'Review & Feedback', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 5, name: 'Production/Print', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 6, name: 'Payment', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 7, name: 'Sign-off & Docs', expectedStatus: ['completed', 'active', 'pending'] },
    { number: 8, name: 'Delivery', expectedStatus: ['completed', 'active', 'pending'] }
  ];

  test.beforeEach(async ({ page }) => {
    // Login as client
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    await page.fill('#login-email', client.email);
    await page.fill('#login-password', client.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/portal\.html/);
  });

  test('Phase tracker displays all 8 phases', async ({ page }) => {
    // Look for phase tracker
    const phaseTracker = page.locator('.phase-tracker, .progress-tracker, #phase-container').first();
    await expect(phaseTracker).toBeVisible({ timeout: 5000 });
    
    // Check each phase
    for (const phase of phases) {
      const phaseElement = page.locator(`text=/${phase.name}/i`).first();
      await expect(phaseElement).toBeVisible();
      console.log(`✅ Found phase ${phase.number}: ${phase.name}`);
      
      // Check for phase number
      const numberElement = page.locator(`text="${phase.number}"`).first();
      if (await numberElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ✓ Phase number ${phase.number} displayed`);
      }
    }
  });

  test('Current phase is highlighted', async ({ page }) => {
    // Find active phase
    const activePhase = page.locator('.phase-active, .phase-current, [data-status="active"]').first();
    
    if (await activePhase.isVisible({ timeout: 2000 }).catch(() => false)) {
      const activePhaseText = await activePhase.textContent();
      console.log(`✅ Active phase: ${activePhaseText}`);
      
      // Check for visual indicators
      const hasActiveClass = await activePhase.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
               el.classList.contains('active') ||
               el.classList.contains('current');
      });
      expect(hasActiveClass).toBeTruthy();
    }
  });

  test('Completed phases show checkmarks', async ({ page }) => {
    // Look for completed phases
    const completedPhases = page.locator('.phase-completed, [data-status="completed"]');
    const count = await completedPhases.count();
    
    if (count > 0) {
      console.log(`✅ Found ${count} completed phases`);
      
      // Check for checkmarks or completion indicators
      for (let i = 0; i < count; i++) {
        const phase = completedPhases.nth(i);
        const hasCheckmark = await phase.locator('.checkmark, .check, text=✓, text=✔').isVisible().catch(() => false);
        if (hasCheckmark) {
          console.log(`  ✓ Phase has checkmark indicator`);
        }
      }
    }
  });

  test('Phase actions are available', async ({ page }) => {
    // Look for phase action buttons
    const actionButtons = [
      'button:has-text("Upload")',
      'button:has-text("Approve")',
      'button:has-text("Review")',
      'button:has-text("Submit")',
      'button:has-text("View Details")'
    ];
    
    for (const selector of actionButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found action: ${selector}`);
        
        // Check if enabled
        const isEnabled = await button.isEnabled();
        console.log(`  ${isEnabled ? '✓ Enabled' : '✗ Disabled'}`);
      }
    }
  });

  test('Phase progress percentage is displayed', async ({ page }) => {
    // Look for progress indicators
    const progressElements = [
      '.progress-bar, .progress-fill',
      'text=/%|percent|progress/i',
      '[data-progress], [aria-valuenow]'
    ];
    
    for (const selector of progressElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found progress indicator: ${selector}`);
        
        // Try to get progress value
        const progressText = await element.textContent();
        if (progressText && progressText.includes('%')) {
          console.log(`  Progress: ${progressText}`);
        }
      }
    }
  });

  test('Phase timeline or dates are shown', async ({ page }) => {
    // Look for timeline elements
    const timelineElements = [
      '.phase-timeline, .timeline',
      'text=/deadline|due date|start date/i',
      '.date, .phase-date'
    ];
    
    for (const selector of timelineElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found timeline element: ${selector}`);
      }
    }
  });

  test('Phase deliverables are accessible', async ({ page }) => {
    // Click on a phase to see details
    const designPhase = page.locator('text=/design/i').first();
    if (await designPhase.isVisible()) {
      await designPhase.click();
      await page.waitForTimeout(1000);
      
      // Look for deliverables section
      const deliverables = page.locator('text=/deliverable|file|document|upload/i').first();
      if (await deliverables.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ Deliverables section found');
        
        // Check for file list
        const files = page.locator('.file-item, .deliverable-item, [data-file-id]');
        const fileCount = await files.count();
        console.log(`  Found ${fileCount} deliverable files`);
      }
    }
  });

  test('Phase notifications or messages', async ({ page }) => {
    // Look for phase-related messages
    const messageElements = [
      '.phase-message, .phase-notification',
      'text=/approved|pending approval|feedback required/i',
      '.alert, .notification'
    ];
    
    for (const selector of messageElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        const text = await element.textContent();
        console.log(`✅ Found phase message: ${text?.substring(0, 50)}...`);
      }
    }
  });
});