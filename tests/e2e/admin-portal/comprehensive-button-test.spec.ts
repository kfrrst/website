import { test, expect } from '@playwright/test';

test.describe('Admin Portal - Comprehensive Button Test', () => {
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
    await page.waitForTimeout(2000); // Give modules time to initialize
  });

  test('Click every button in the admin portal', async ({ page }) => {
    // Track results
    const buttonResults = [];
    const errors = [];
    
    // Monitor console errors
    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack
      });
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console-error',
          message: msg.text()
        });
      }
    });

    // Sections to test
    const sections = [
      'overview',
      'clients', 
      'projects',
      'invoices',
      'files',
      'messages',
      'inquiries',
      'phases',
      'settings'
    ];

    for (const sectionName of sections) {
      console.log(`\n=== Testing ${sectionName.toUpperCase()} Section ===`);
      
      // Navigate to section
      try {
        await page.click(`a[href="#${sectionName}"]`);
        await page.waitForTimeout(1000);
        
        // Verify section is visible
        const section = page.locator(`#${sectionName}`);
        await expect(section).toBeVisible({ timeout: 5000 });
      } catch (error) {
        console.log(`❌ Failed to navigate to ${sectionName}: ${error.message}`);
        continue;
      }

      // Find all buttons in the current section
      const buttons = await page.locator(`#${sectionName} button:visible`).all();
      console.log(`Found ${buttons.length} visible buttons in ${sectionName}`);

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        
        try {
          // Get button info
          const buttonText = await button.textContent() || '';
          const buttonClass = await button.getAttribute('class') || '';
          const buttonId = await button.getAttribute('id') || '';
          const isDisabled = await button.isDisabled();
          
          const buttonInfo = {
            section: sectionName,
            text: buttonText.trim(),
            class: buttonClass,
            id: buttonId,
            index: i,
            disabled: isDisabled
          };

          // Skip disabled buttons
          if (isDisabled) {
            buttonResults.push({
              ...buttonInfo,
              result: 'skipped',
              reason: 'disabled'
            });
            console.log(`⏭️  Skipped disabled button: "${buttonText.trim()}"`);
            continue;
          }

          // Skip certain buttons that might cause issues
          const skipPatterns = [
            /delete/i,
            /remove/i,
            /logout/i,
            /submit/i,
            /save/i,
            /send/i
          ];
          
          const shouldSkip = skipPatterns.some(pattern => 
            pattern.test(buttonText) || pattern.test(buttonClass)
          );
          
          if (shouldSkip) {
            buttonResults.push({
              ...buttonInfo,
              result: 'skipped',
              reason: 'potentially destructive'
            });
            console.log(`⏭️  Skipped potentially destructive button: "${buttonText.trim()}"`);
            continue;
          }

          // Clear previous errors
          const errorCountBefore = errors.length;
          
          // Click the button
          console.log(`🖱️  Clicking button ${i + 1}/${buttons.length}: "${buttonText.trim()}" (id: ${buttonId})`);
          await button.click();
          await page.waitForTimeout(500);

          // Check for modals that might have opened
          const activeModals = await page.locator('.modal.active').count();
          if (activeModals > 0) {
            console.log(`   📋 Modal opened (${activeModals} active)`);
            
            // Try to close modals
            const closeButtons = await page.locator('.modal.active .modal-close:visible').all();
            for (const closeBtn of closeButtons) {
              await closeBtn.click();
              await page.waitForTimeout(300);
            }
            
            // Also try clicking overlay
            const overlays = await page.locator('.modal.active .modal-overlay:visible').all();
            for (const overlay of overlays) {
              await overlay.click({ force: true });
              await page.waitForTimeout(300);
            }
          }

          // Check if any errors occurred
          const newErrors = errors.length - errorCountBefore;
          
          buttonResults.push({
            ...buttonInfo,
            result: newErrors > 0 ? 'error' : 'success',
            errors: newErrors > 0 ? errors.slice(-newErrors) : []
          });

          if (newErrors > 0) {
            console.log(`   ❌ Button caused ${newErrors} error(s)`);
          } else {
            console.log(`   ✅ Button clicked successfully`);
          }

        } catch (error) {
          console.log(`   ❌ Failed to click button: ${error.message}`);
          buttonResults.push({
            section: sectionName,
            index: i,
            result: 'exception',
            error: error.message
          });
        }
      }
    }

    // Summary Report
    console.log('\n\n=== BUTTON CLICK TEST SUMMARY ===');
    console.log(`Total buttons found: ${buttonResults.length}`);
    console.log(`Successful clicks: ${buttonResults.filter(r => r.result === 'success').length}`);
    console.log(`Skipped buttons: ${buttonResults.filter(r => r.result === 'skipped').length}`);
    console.log(`Failed buttons: ${buttonResults.filter(r => r.result === 'error' || r.result === 'exception').length}`);

    // Detailed failure report
    const failures = buttonResults.filter(r => r.result === 'error' || r.result === 'exception');
    if (failures.length > 0) {
      console.log('\n=== FAILED BUTTONS ===');
      failures.forEach(failure => {
        console.log(`\n❌ ${failure.section} - "${failure.text}"`);
        console.log(`   ID: ${failure.id || 'none'}`);
        console.log(`   Class: ${failure.class || 'none'}`);
        if (failure.errors) {
          failure.errors.forEach(err => {
            console.log(`   Error: ${err.message}`);
          });
        }
        if (failure.error) {
          console.log(`   Exception: ${failure.error}`);
        }
      });
    }

    // Save detailed results
    await page.evaluate((results) => {
      console.log('=== DETAILED BUTTON TEST RESULTS ===');
      console.table(results);
    }, buttonResults);

    // Assertions
    const errorButtons = buttonResults.filter(r => r.result === 'error' || r.result === 'exception');
    expect(errorButtons.length).toBe(0);
  });

  test('Test specific high-priority buttons', async ({ page }) => {
    // Test critical user flows
    const criticalButtons = [
      // Overview section
      { section: 'overview', selector: 'button:has-text("View All")', description: 'View all buttons' },
      
      // Clients section
      { section: 'clients', selector: 'button:has-text("New Client"), button:has-text("Add Client")', description: 'Add client button' },
      
      // Projects section  
      { section: 'projects', selector: 'button:has-text("New Project"), button:has-text("Create Project")', description: 'Create project button' },
      
      // Invoices section
      { section: 'invoices', selector: 'button:has-text("Create Invoice"), button:has-text("New Invoice")', description: 'Create invoice button' },
      
      // Files section
      { section: 'files', selector: 'button:has-text("Upload"), button:has-text("Browse")', description: 'File upload button' }
    ];

    for (const buttonTest of criticalButtons) {
      console.log(`\n=== Testing ${buttonTest.description} ===`);
      
      // Navigate to section
      await page.click(`a[href="#${buttonTest.section}"]`);
      await page.waitForTimeout(1000);
      
      try {
        // Find and click the button
        const button = page.locator(buttonTest.selector).first();
        await expect(button).toBeVisible({ timeout: 5000 });
        
        const buttonText = await button.textContent();
        console.log(`Found button: "${buttonText}"`);
        
        await button.click();
        await page.waitForTimeout(1000);
        
        // Check if a modal opened
        const modal = page.locator('.modal.active').first();
        if (await modal.isVisible()) {
          console.log('✅ Modal opened successfully');
          
          // Close the modal
          const closeBtn = modal.locator('.modal-close').first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(500);
            console.log('✅ Modal closed successfully');
          }
        } else {
          console.log('✅ Button clicked (no modal expected or different action)');
        }
        
      } catch (error) {
        console.log(`❌ Failed to test ${buttonTest.description}: ${error.message}`);
        throw error;
      }
    }
  });

  test('Test navigation buttons', async ({ page }) => {
    // Get all navigation links
    const navLinks = await page.locator('.admin-nav a[href^="#"]').all();
    
    console.log(`\n=== Testing ${navLinks.length} navigation links ===`);
    
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      console.log(`\nClicking nav: "${text}" -> ${href}`);
      
      await link.click();
      await page.waitForTimeout(500);
      
      // Verify the section is shown
      if (href && href.startsWith('#')) {
        const sectionId = href.substring(1);
        const section = page.locator(`#${sectionId}`);
        
        try {
          await expect(section).toBeVisible({ timeout: 3000 });
          await expect(section).toHaveClass(/active/);
          console.log('✅ Section displayed correctly');
        } catch (error) {
          console.log(`❌ Section ${sectionId} not visible after navigation`);
          throw error;
        }
      }
    }
  });

  test('Test view mode toggles', async ({ page }) => {
    // Sections that might have view mode toggles
    const sectionsWithViews = ['projects', 'files', 'clients'];
    
    for (const sectionName of sectionsWithViews) {
      console.log(`\n=== Testing view modes in ${sectionName} ===`);
      
      // Navigate to section
      await page.click(`a[href="#${sectionName}"]`);
      await page.waitForTimeout(1000);
      
      // Look for view toggle buttons
      const viewButtons = await page.locator(`#${sectionName} .view-toggle button`).all();
      
      if (viewButtons.length > 0) {
        console.log(`Found ${viewButtons.length} view toggle buttons`);
        
        for (const btn of viewButtons) {
          const icon = await btn.textContent();
          await btn.click();
          await page.waitForTimeout(500);
          
          // Check if button became active
          const isActive = await btn.evaluate(el => el.classList.contains('active'));
          console.log(`View button "${icon}": ${isActive ? 'active' : 'inactive'}`);
        }
      } else {
        console.log('No view toggle buttons found');
      }
    }
  });
});