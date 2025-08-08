import { test, expect } from '@playwright/test';

test.describe('Admin Portal Modal Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Login to admin portal
    await page.goto('/admin.html');
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to be visible
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(1000); // Give modules time to initialize
  });

  test('All modals should be hidden by default', async ({ page }) => {
    // Check that all modals are hidden initially
    const modals = await page.locator('.modal').all();
    
    console.log(`Found ${modals.length} modals`);
    
    for (const modal of modals) {
      const isVisible = await modal.isVisible();
      const id = await modal.getAttribute('id');
      console.log(`Modal ${id || 'unnamed'}: visible=${isVisible}`);
      
      // Modal should not be visible
      await expect(modal).not.toBeVisible();
      
      // Check computed styles
      const display = await modal.evaluate(el => window.getComputedStyle(el).display);
      expect(display).toBe('none');
    }
  });

  test('Navigation should work without modal interference', async ({ page }) => {
    // Test navigation between sections
    const sections = [
      { name: 'Clients', selector: 'a[href="#clients"]', contentId: 'clients' },
      { name: 'Projects', selector: 'a[href="#projects"]', contentId: 'projects' },
      { name: 'Invoices', selector: 'a[href="#invoices"]', contentId: 'invoices' },
      { name: 'Files', selector: 'a[href="#files"]', contentId: 'files' }
    ];
    
    for (const section of sections) {
      console.log(`\nNavigating to ${section.name}`);
      
      // Click navigation link
      await page.click(section.selector);
      await page.waitForTimeout(500);
      
      // Check section is visible
      const sectionElement = page.locator(`#${section.contentId}`);
      await expect(sectionElement).toBeVisible();
      await expect(sectionElement).toHaveClass(/active/);
      
      // Check no modals are blocking the view
      const visibleModals = await page.locator('.modal:visible').count();
      expect(visibleModals).toBe(0);
      
      // Take screenshot if any modals are visible
      if (visibleModals > 0) {
        await page.screenshot({ 
          path: `modal-blocking-${section.name.toLowerCase()}.png`,
          fullPage: true 
        });
      }
    }
  });

  test('Modal overlays should not intercept clicks', async ({ page }) => {
    // Navigate to clients section
    await page.click('a[href="#clients"]');
    await page.waitForTimeout(500);
    
    // Try to interact with the page
    const clientsSection = page.locator('#clients');
    await expect(clientsSection).toBeVisible();
    
    // Check if any modal overlay is intercepting
    const overlays = await page.locator('.modal-overlay').all();
    
    for (const overlay of overlays) {
      const isVisible = await overlay.isVisible();
      const zIndex = await overlay.evaluate(el => window.getComputedStyle(el).zIndex);
      const pointerEvents = await overlay.evaluate(el => window.getComputedStyle(el).pointerEvents);
      
      console.log(`Overlay: visible=${isVisible}, z-index=${zIndex}, pointer-events=${pointerEvents}`);
      
      if (isVisible) {
        // If overlay is visible, it should not block interaction
        expect(pointerEvents).toBe('none');
      }
    }
  });

  test('Modals should only show when explicitly opened', async ({ page }) => {
    // Navigate to clients section
    await page.click('a[href="#clients"]');
    await page.waitForTimeout(500);
    
    // Find "Add Client" or "New Client" button
    const addClientBtn = page.locator('button:has-text("Client"), button:has-text("Add")').first();
    
    if (await addClientBtn.isVisible()) {
      // Modal should be hidden before click
      const clientModal = page.locator('#client-modal');
      await expect(clientModal).not.toBeVisible();
      
      // Click to open modal
      await addClientBtn.click();
      await page.waitForTimeout(500);
      
      // Modal should now be visible
      await expect(clientModal).toBeVisible();
      await expect(clientModal).toHaveClass(/active/);
      
      // Close modal
      const closeBtn = page.locator('#client-modal .modal-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        
        // Modal should be hidden again
        await expect(clientModal).not.toBeVisible();
      }
    }
  });

  test('Check CSS specificity and conflicts', async ({ page }) => {
    // Get all modal elements and their computed styles
    const modalData = await page.evaluate(() => {
      const modals = document.querySelectorAll('.modal');
      return Array.from(modals).map(modal => {
        const styles = window.getComputedStyle(modal);
        const rules = [];
        
        // Try to find which stylesheet is applying the display property
        try {
          for (const sheet of document.styleSheets) {
            if (sheet.href && !sheet.href.includes(window.location.origin)) continue;
            
            try {
              for (const rule of sheet.cssRules) {
                if (rule.selectorText && modal.matches(rule.selectorText)) {
                  if (rule.style.display) {
                    rules.push({
                      selector: rule.selectorText,
                      display: rule.style.display,
                      sheet: sheet.href || 'inline'
                    });
                  }
                }
              }
            } catch (e) {
              // Cross-origin stylesheets will throw
            }
          }
        } catch (e) {
          console.error('Error checking stylesheets:', e);
        }
        
        return {
          id: modal.id,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position,
          classes: modal.className,
          rules: rules
        };
      });
    });
    
    console.log('\n=== Modal Styles Analysis ===');
    modalData.forEach(modal => {
      console.log(`\nModal: ${modal.id || 'unnamed'}`);
      console.log(`  Classes: ${modal.classes}`);
      console.log(`  Display: ${modal.display}`);
      console.log(`  Visibility: ${modal.visibility}`);
      console.log(`  Position: ${modal.position}`);
      console.log(`  Z-Index: ${modal.zIndex}`);
      if (modal.rules.length > 0) {
        console.log('  Applied rules:');
        modal.rules.forEach(rule => {
          console.log(`    ${rule.selector} { display: ${rule.display} } from ${rule.sheet}`);
        });
      }
    });
    
    // All modals should have display: none initially
    modalData.forEach(modal => {
      expect(modal.display).toBe('none');
    });
  });

  test('Module initialization should not affect modal visibility', async ({ page }) => {
    // Monitor console for module initialization
    const moduleInitLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('module initialized') || msg.text().includes('Module initialization')) {
        moduleInitLogs.push(msg.text());
      }
    });
    
    // Reload page to catch initialization
    await page.reload();
    
    // Login again
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modules to initialize
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(3000);
    
    console.log('\n=== Module Initialization Logs ===');
    moduleInitLogs.forEach(log => console.log(log));
    
    // Check modals are still hidden after initialization
    const visibleModals = await page.locator('.modal:visible').count();
    expect(visibleModals).toBe(0);
    
    // Take screenshot if any modals are visible
    if (visibleModals > 0) {
      await page.screenshot({ 
        path: 'modals-visible-after-init.png',
        fullPage: true 
      });
      
      // Log which modals are visible
      const visibleModalIds = await page.locator('.modal:visible').evaluateAll(
        modals => modals.map(m => m.id || m.className)
      );
      console.log('Visible modals:', visibleModalIds);
    }
  });
});