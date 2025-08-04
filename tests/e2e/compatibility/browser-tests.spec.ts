import { test, expect, devices } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, TIMEOUTS } from '../../utils/test-constants';

test.describe('Cross-Browser Compatibility Tests', () => {
  test.describe('Browser-Specific Tests', () => {
    test('Chrome-specific features', async ({ browserName, page }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      await page.goto('/');
      
      // Test Chrome-specific APIs
      const hasChromeSpeechAPI = await page.evaluate(() => {
        return 'webkitSpeechRecognition' in window;
      });
      
      console.log(`✅ Chrome Speech API available: ${hasChromeSpeechAPI}`);
      
      // Test Chrome DevTools Protocol features if needed
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');
      const metrics = await client.send('Performance.getMetrics');
      console.log(`✅ Chrome performance metrics collected: ${metrics.metrics.length} metrics`);
    });

    test('Firefox-specific features', async ({ browserName, page }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await page.goto('/');
      
      // Test Firefox-specific features
      const hasFirefoxPDF = await page.evaluate(() => {
        return navigator.pdfViewerEnabled !== undefined;
      });
      
      console.log(`✅ Firefox PDF viewer available: ${hasFirefoxPDF}`);
    });

    test('Safari-specific features', async ({ browserName, page }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await page.goto('/');
      
      // Test Safari-specific features
      const hasSafariPayment = await page.evaluate(() => {
        return 'ApplePaySession' in window;
      });
      
      console.log(`✅ Safari Apple Pay available: ${hasSafariPayment}`);
    });
  });

  test.describe('CSS Compatibility', () => {
    test('CSS Grid support across browsers', async ({ page }) => {
      await page.goto('/');
      
      const gridSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.display = 'grid';
        return testElement.style.display === 'grid';
      });
      
      expect(gridSupport).toBeTruthy();
      console.log('✅ CSS Grid supported');
      
      // Test specific grid features
      const gridFeatures = await page.evaluate(() => {
        const features: any = {};
        const testElement = document.createElement('div');
        
        // Test grid-template-areas
        testElement.style.gridTemplateAreas = '"header header" "sidebar main"';
        features.gridTemplateAreas = testElement.style.gridTemplateAreas !== '';
        
        // Test gap property
        testElement.style.gap = '10px';
        features.gap = testElement.style.gap !== '';
        
        return features;
      });
      
      console.log('  Grid features:', gridFeatures);
    });

    test('Flexbox compatibility', async ({ page }) => {
      await page.goto('/');
      
      const flexSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        const prefixes = ['', '-webkit-', '-moz-', '-ms-'];
        
        for (const prefix of prefixes) {
          testElement.style.display = `${prefix}flex`;
          if (testElement.style.display.includes('flex')) {
            return true;
          }
        }
        return false;
      });
      
      expect(flexSupport).toBeTruthy();
      console.log('✅ Flexbox supported');
    });

    test('CSS Custom Properties (Variables)', async ({ page }) => {
      await page.goto('/');
      
      const customPropsSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.setProperty('--test-color', 'red');
        return getComputedStyle(testElement).getPropertyValue('--test-color').trim() === 'red';
      });
      
      expect(customPropsSupport).toBeTruthy();
      console.log('✅ CSS Custom Properties supported');
    });

    test('Modern CSS features', async ({ page }) => {
      await page.goto('/');
      
      const modernFeatures = await page.evaluate(() => {
        const features: any = {};
        
        // Test CSS Container Queries
        features.containerQueries = CSS.supports('container-type', 'inline-size');
        
        // Test :has() selector
        features.hasSelector = CSS.supports('selector(:has(*))');
        
        // Test aspect-ratio
        features.aspectRatio = CSS.supports('aspect-ratio', '16/9');
        
        // Test clamp()
        features.clamp = CSS.supports('width', 'clamp(100px, 50%, 500px)');
        
        return features;
      });
      
      console.log('✅ Modern CSS features support:', modernFeatures);
    });
  });

  test.describe('JavaScript Compatibility', () => {
    test('ES6+ features support', async ({ page }) => {
      await page.goto('/');
      
      const es6Support = await page.evaluate(() => {
        const features: any = {};
        
        // Arrow functions
        try {
          eval('() => {}');
          features.arrowFunctions = true;
        } catch { features.arrowFunctions = false; }
        
        // Template literals
        try {
          eval('`test ${1}`');
          features.templateLiterals = true;
        } catch { features.templateLiterals = false; }
        
        // Destructuring
        try {
          eval('const {a} = {a: 1}');
          features.destructuring = true;
        } catch { features.destructuring = false; }
        
        // Async/await
        try {
          eval('async function test() { await Promise.resolve(); }');
          features.asyncAwait = true;
        } catch { features.asyncAwait = false; }
        
        // Optional chaining
        try {
          eval('const a = {}; a?.b?.c');
          features.optionalChaining = true;
        } catch { features.optionalChaining = false; }
        
        return features;
      });
      
      console.log('✅ ES6+ features support:', es6Support);
      
      // All modern features should be supported
      Object.values(es6Support).forEach(supported => {
        expect(supported).toBeTruthy();
      });
    });

    test('Web API compatibility', async ({ page }) => {
      await page.goto('/');
      
      const apiSupport = await page.evaluate(() => {
        return {
          fetch: 'fetch' in window,
          localStorage: 'localStorage' in window,
          sessionStorage: 'sessionStorage' in window,
          webSocket: 'WebSocket' in window,
          intersectionObserver: 'IntersectionObserver' in window,
          mutationObserver: 'MutationObserver' in window,
          formData: 'FormData' in window,
          fileReader: 'FileReader' in window,
          history: 'history' in window && 'pushState' in history
        };
      });
      
      console.log('✅ Web API support:', apiSupport);
      
      // All critical APIs should be supported
      Object.entries(apiSupport).forEach(([api, supported]) => {
        expect(supported).toBeTruthy();
      });
    });
  });

  test.describe('Form Compatibility', () => {
    test('HTML5 input types', async ({ page }) => {
      await page.goto('/login.html');
      
      const inputTypes = ['email', 'date', 'number', 'tel', 'url', 'color', 'range'];
      
      for (const type of inputTypes) {
        const supported = await page.evaluate((inputType) => {
          const input = document.createElement('input');
          input.type = inputType;
          return input.type === inputType;
        }, type);
        
        console.log(`✅ Input type="${type}": ${supported ? 'supported' : 'fallback to text'}`);
      }
    });

    test('Form validation features', async ({ page }) => {
      await page.goto('/login.html');
      
      const validationSupport = await page.evaluate(() => {
        const form = document.createElement('form');
        const input = document.createElement('input');
        
        return {
          required: 'required' in input,
          pattern: 'pattern' in input,
          validity: 'validity' in input,
          checkValidity: 'checkValidity' in form,
          reportValidity: 'reportValidity' in form,
          setCustomValidity: 'setCustomValidity' in input
        };
      });
      
      console.log('✅ Form validation support:', validationSupport);
    });
  });

  test.describe('Media Compatibility', () => {
    test('Image format support', async ({ page }) => {
      await page.goto('/');
      
      const imageSupport = await page.evaluate(() => {
        const formats: any = {};
        
        // Test WebP
        const webp = new Image();
        webp.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
        formats.webp = webp.width > 0;
        
        // Test AVIF (basic check)
        formats.avif = CSS.supports('background-image', 'image-set(url("test.avif") type("image/avif"))');
        
        return formats;
      });
      
      console.log('✅ Image format support:', imageSupport);
    });

    test('Video codec support', async ({ page }) => {
      await page.goto('/');
      
      const videoSupport = await page.evaluate(() => {
        const video = document.createElement('video');
        
        return {
          h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
          webm: video.canPlayType('video/webm; codecs="vp8, vorbis"') !== '',
          ogg: video.canPlayType('video/ogg; codecs="theora"') !== ''
        };
      });
      
      console.log('✅ Video codec support:', videoSupport);
    });
  });

  test.describe('Responsive Design', () => {
    const devices = [
      { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
      { name: 'iPad', viewport: { width: 768, height: 1024 } },
      { name: 'Desktop', viewport: { width: 1920, height: 1080 } }
    ];

    for (const device of devices) {
      test(`Layout on ${device.name}`, async ({ page }) => {
        await page.setViewportSize(device.viewport);
        await page.goto('/');
        
        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `screenshots/${device.name.toLowerCase()}-homepage.png`,
          fullPage: true 
        });
        
        // Check responsive elements
        const navigation = page.locator('nav, .navigation');
        const mobileMenu = page.locator('.mobile-menu, .hamburger, button[aria-label*="menu"]');
        
        if (device.viewport.width < 768) {
          // Mobile layout checks
          await expect(mobileMenu).toBeVisible();
          console.log(`✅ ${device.name}: Mobile menu visible`);
        } else {
          // Desktop layout checks
          await expect(navigation).toBeVisible();
          console.log(`✅ ${device.name}: Desktop navigation visible`);
        }
      });
    }
  });

  test.describe('Performance Across Browsers', () => {
    test('Page load performance comparison', async ({ browserName, page }) => {
      const metrics = await EnhancedTestHelpers.measurePerformance(page, async () => {
        await page.goto('/');
      });
      
      console.log(`\n📊 ${browserName} Performance:`);
      console.log(`  Total Load: ${metrics.duration}ms`);
      console.log(`  First Paint: ${metrics.metrics.firstPaint}ms`);
      console.log(`  DOM Content Loaded: ${metrics.metrics.domContentLoaded}ms`);
      
      // All browsers should meet performance targets
      expect(metrics.duration).toBeLessThan(3000);
    });

    test('JavaScript execution performance', async ({ browserName, page }) => {
      await page.goto('/');
      
      const jsPerformance = await page.evaluate(() => {
        const iterations = 100000;
        
        // Test array operations
        const arrayStart = performance.now();
        const arr = Array(iterations).fill(0).map((_, i) => i * 2);
        const arrayTime = performance.now() - arrayStart;
        
        // Test object operations
        const objStart = performance.now();
        const obj: any = {};
        for (let i = 0; i < iterations; i++) {
          obj[`key${i}`] = i;
        }
        const objTime = performance.now() - objStart;
        
        // Test DOM operations
        const domStart = performance.now();
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.textContent = `Item ${i}`;
          fragment.appendChild(div);
        }
        const domTime = performance.now() - domStart;
        
        return { arrayTime, objTime, domTime };
      });
      
      console.log(`\n📊 ${browserName} JS Performance:`);
      console.log(`  Array ops (100k): ${jsPerformance.arrayTime.toFixed(2)}ms`);
      console.log(`  Object ops (100k): ${jsPerformance.objTime.toFixed(2)}ms`);
      console.log(`  DOM ops (1k): ${jsPerformance.domTime.toFixed(2)}ms`);
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    test('Screen reader compatibility', async ({ browserName, page }) => {
      await page.goto('/');
      
      // Check ARIA attributes
      const ariaSupport = await page.evaluate(() => {
        const elements = document.querySelectorAll('[role], [aria-label], [aria-describedby]');
        return {
          elementsWithAria: elements.length,
          landmarkRoles: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"]').length,
          formLabels: document.querySelectorAll('label[for]').length
        };
      });
      
      console.log(`\n✅ ${browserName} Accessibility:`);
      console.log(`  ARIA elements: ${ariaSupport.elementsWithAria}`);
      console.log(`  Landmark roles: ${ariaSupport.landmarkRoles}`);
      console.log(`  Form labels: ${ariaSupport.formLabels}`);
      
      expect(ariaSupport.elementsWithAria).toBeGreaterThan(0);
    });

    test('Keyboard navigation', async ({ browserName, page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
      
      console.log(`✅ ${browserName} keyboard navigation works`);
      console.log(`  First tab: ${firstFocused}`);
      console.log(`  Second tab: ${secondFocused}`);
      
      expect(firstFocused).toBeTruthy();
      expect(secondFocused).toBeTruthy();
    });
  });

  test.describe('Security Features', () => {
    test('Content Security Policy support', async ({ page }) => {
      const response = await page.goto('/');
      const cspHeader = response?.headers()['content-security-policy'];
      
      if (cspHeader) {
        console.log('✅ CSP header present');
        console.log(`  Policy: ${cspHeader.substring(0, 100)}...`);
      } else {
        console.log('⚠️  No CSP header found');
      }
    });

    test('Secure cookie handling', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'token' || c.name === 'session');
      
      if (sessionCookie) {
        console.log('✅ Session cookie security:');
        console.log(`  HttpOnly: ${sessionCookie.httpOnly}`);
        console.log(`  Secure: ${sessionCookie.secure}`);
        console.log(`  SameSite: ${sessionCookie.sameSite}`);
        
        expect(sessionCookie.httpOnly).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Browser Specific', () => {
    test('Touch event support', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      const touchSupport = await page.evaluate(() => {
        return {
          touchEvents: 'ontouchstart' in window,
          pointerEvents: 'PointerEvent' in window,
          maxTouchPoints: navigator.maxTouchPoints || 0
        };
      });
      
      console.log('✅ Touch support:', touchSupport);
    });

    test('Viewport meta tag', async ({ page }) => {
      await page.goto('/');
      
      const viewportMeta = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });
      
      expect(viewportMeta).toContain('width=device-width');
      console.log(`✅ Viewport meta tag: ${viewportMeta}`);
    });
  });
});