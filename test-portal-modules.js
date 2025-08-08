// Test script to check if portal modules are loading data correctly
import puppeteer from 'puppeteer';

async function testPortalModules() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/portal.html');
    await page.waitForSelector('#login-form', { timeout: 5000 });
    
    // Login with test credentials
    await page.type('#email', 'test@example.com');
    await page.type('#password', 'password123');
    await page.click('#login-form button[type="submit"]');
    
    // Wait for portal to load
    await page.waitForSelector('#portal-content', { visible: true, timeout: 10000 });
    
    // Wait a bit for modules to initialize
    await page.waitForTimeout(3000);
    
    // Check each section for data
    const sections = ['projects', 'files', 'messages', 'invoices', 'documents'];
    
    for (const section of sections) {
      console.log(`\nChecking ${section} section...`);
      
      // Click on the navigation link
      await page.click(`a[href="#${section}"]`);
      await page.waitForTimeout(1000);
      
      // Check if section is visible
      const sectionVisible = await page.$eval(`#${section}`, el => {
        return el.classList.contains('active');
      });
      
      console.log(`${section} section visible:`, sectionVisible);
      
      // Check for loading messages
      const loadingMessages = await page.$$eval(`#${section} .loading-message`, messages => {
        return messages.map(msg => ({
          text: msg.textContent,
          visible: msg.offsetParent !== null
        }));
      });
      
      if (loadingMessages.length > 0) {
        console.log(`Loading messages in ${section}:`, loadingMessages);
      }
      
      // Check if content has been rendered
      const hasContent = await page.$eval(`#${section}`, el => {
        const content = el.textContent;
        return !content.includes('Loading') || content.length > 100;
      });
      
      console.log(`${section} has content:`, hasContent);
    }
    
    // Keep browser open for manual inspection
    console.log('\nTest complete. Browser will remain open for inspection.');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPortalModules();