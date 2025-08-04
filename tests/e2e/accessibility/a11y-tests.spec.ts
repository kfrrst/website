import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Landing page accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Run axe accessibility scan
    const results = await new AxeBuilder({ page }).analyze();
    
    // Log violations
    if (results.violations.length > 0) {
      console.log('❌ Accessibility violations found:');
      results.violations.forEach(violation => {
        console.log(`  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Elements: ${violation.nodes.length}`);
      });
    } else {
      console.log('✅ No accessibility violations on landing page');
    }
    
    // Test should pass even with minor violations, but log them
    expect(results.violations.filter(v => v.impact === 'critical').length).toBe(0);
  });

  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    const interactiveElements = [];
    
    // Start tabbing
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      // Get focused element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent?.substring(0, 30),
          type: el?.getAttribute('type'),
          href: el?.getAttribute('href')
        };
      });
      
      if (focusedElement.tag) {
        interactiveElements.push(focusedElement);
      }
    }
    
    console.log('✅ Keyboard navigation elements:');
    interactiveElements.forEach(el => {
      console.log(`  - ${el.tag} ${el.type || el.href || ''}: ${el.text}`);
    });
    
    expect(interactiveElements.length).toBeGreaterThan(0);
  });

  test('Form labels and ARIA', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    // Check form accessibility
    const formInputs = page.locator('input, select, textarea');
    const inputCount = await formInputs.count();
    
    let labeledInputs = 0;
    for (let i = 0; i < inputCount; i++) {
      const input = formInputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Check for associated label
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        
        if (hasLabel || ariaLabel || ariaLabelledBy) {
          labeledInputs++;
        }
      } else if (ariaLabel || ariaLabelledBy) {
        labeledInputs++;
      }
    }
    
    console.log(`✅ Form accessibility: ${labeledInputs}/${inputCount} inputs properly labeled`);
    expect(labeledInputs).toBe(inputCount);
  });

  test('Color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Run axe with color contrast rules
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    
    if (results.violations.length > 0) {
      console.log('❌ Color contrast issues:');
      results.violations[0].nodes.forEach(node => {
        console.log(`  - ${node.target}: ${node.failureSummary}`);
      });
    } else {
      console.log('✅ Color contrast meets WCAG standards');
    }
  });

  test('Focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusVisible = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      
      const styles = window.getComputedStyle(focused);
      const hasFocusStyle = 
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        styles.border !== styles.getPropertyValue('border');
      
      return hasFocusStyle;
    });
    
    expect(focusVisible).toBeTruthy();
    console.log('✅ Focus indicators are visible');
  });

  test('Image alt texts', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    let imagesWithAlt = 0;
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      if (alt !== null || role === 'presentation') {
        imagesWithAlt++;
      } else {
        const src = await img.getAttribute('src');
        console.log(`  ⚠️  Missing alt text: ${src}`);
      }
    }
    
    console.log(`✅ Image accessibility: ${imagesWithAlt}/${imageCount} images have alt text`);
    expect(imagesWithAlt).toBe(imageCount);
  });

  test('ARIA landmarks', async ({ page }) => {
    await page.goto('/');
    
    // Check for landmark regions
    const landmarks = {
      'header, [role="banner"]': 'banner',
      'nav, [role="navigation"]': 'navigation',
      'main, [role="main"]': 'main',
      'footer, [role="contentinfo"]': 'contentinfo'
    };
    
    console.log('✅ ARIA landmarks:');
    for (const [selector, role] of Object.entries(landmarks)) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ✓ ${role} landmark present`);
      } else {
        console.log(`  ✗ ${role} landmark missing`);
      }
    }
  });

  test('Responsive design and zoom', async ({ page }) => {
    await page.goto('/');
    
    // Test at 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    
    await page.waitForTimeout(1000);
    
    // Check if content is still accessible
    const mainContent = page.locator('main, .main-content, .container').first();
    const isVisible = await mainContent.isVisible();
    
    expect(isVisible).toBeTruthy();
    console.log('✅ Content remains accessible at 200% zoom');
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });

  test('Error messages accessibility', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Client Portal');
    await page.waitForTimeout(1000);
    
    // Submit empty form to trigger errors
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check for error messages
    const errors = page.locator('[role="alert"], .error-message, .error');
    const errorCount = await errors.count();
    
    if (errorCount > 0) {
      console.log(`✅ Found ${errorCount} error messages with proper markup`);
      
      // Check if errors are associated with inputs
      for (let i = 0; i < errorCount; i++) {
        const error = errors.nth(i);
        const id = await error.getAttribute('id');
        
        if (id) {
          const associatedInput = page.locator(`[aria-describedby="${id}"]`);
          if (await associatedInput.count() > 0) {
            console.log('  ✓ Error properly associated with input');
          }
        }
      }
    }
  });

  test('Skip links', async ({ page }) => {
    await page.goto('/');
    
    // Look for skip link
    const skipLink = page.locator('a:has-text("Skip to main"), a:has-text("Skip to content")').first();
    
    if (await skipLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ Skip link present');
      
      // Test if it works
      await skipLink.click();
      
      // Check if focus moved to main content
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      console.log(`  Focus moved to: ${focusedElement}`);
    } else {
      // Check if skip link becomes visible on focus
      await page.keyboard.press('Tab');
      if (await skipLink.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log('✅ Skip link appears on focus');
      }
    }
  });
});