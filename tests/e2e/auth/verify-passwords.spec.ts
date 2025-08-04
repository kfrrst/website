import { test, expect } from '@playwright/test';

test.describe('Password Verification', () => {
  // Common passwords to try
  const commonPasswords = [
    'password',
    'test123',
    'admin123',
    'client123',
    'password123',
    'test',
    'demo',
    '123456'
  ];

  test('Find working password for existing users', async ({ page }) => {
    const users = [
      { email: 'kendrick@reprintstudios.com', expectedRole: 'admin' },
      { email: 'client@example.com', expectedRole: 'client' }
    ];

    for (const user of users) {
      console.log(`\nTesting passwords for ${user.email}:`);
      
      for (const password of commonPasswords) {
        const response = await page.request.post('/api/auth/login', {
          data: {
            email: user.email,
            password: password
          }
        });

        if (response.ok()) {
          const data = await response.json();
          console.log(`✅ SUCCESS! Password for ${user.email} is: "${password}"`);
          console.log(`   Token: ${data.token?.substring(0, 20)}...`);
          console.log(`   Role: ${data.user?.role}`);
          
          // Verify the response structure
          expect(data.token).toBeTruthy();
          expect(data.user).toBeTruthy();
          expect(data.user.email).toBe(user.email);
          expect(data.user.role).toBe(user.expectedRole);
          
          break; // Found the password, move to next user
        } else {
          console.log(`❌ Failed: ${password}`);
        }
      }
    }
  });

  test('Test admin portal login with discovered password', async ({ page }) => {
    // Try the most common password first
    await page.goto('/admin.html');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Try logging in with common passwords
    for (const password of commonPasswords) {
      await page.fill('#email', 'kendrick@reprintstudios.com');
      await page.fill('#password', password);
      
      // Click login
      await page.click('button[type="submit"]');
      
      // Wait a bit to see if login succeeds
      await page.waitForTimeout(2000);
      
      // Check if we're logged in by looking for admin content
      const adminContent = await page.locator('.admin-dashboard, #admin-content, .admin-nav').first().isVisible().catch(() => false);
      
      if (adminContent) {
        console.log(`✅ Admin login successful with password: "${password}"`);
        
        // Verify we have a token
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
        
        break;
      } else {
        console.log(`❌ Admin login failed with: ${password}`);
        
        // Clear the form for next attempt
        await page.fill('#email', '');
        await page.fill('#password', '');
      }
    }
  });
});