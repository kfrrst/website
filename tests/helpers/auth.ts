import { Page } from '@playwright/test';

export async function loginAsClient(page: Page, email: string = 'test@example.com', password: string = 'password123') {
  await page.goto('/portal');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('#email', email);
  await page.fill('#password', password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/portal', { timeout: 10000 });
  await page.waitForSelector('#dashboard', { timeout: 10000 });
}

export async function loginAsAdmin(page: Page, email: string = 'admin@reprintstudios.com', password: string = 'admin123') {
  await page.goto('/admin.html');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('#email', email);
  await page.fill('#password', password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for admin dashboard
  await page.waitForSelector('#admin-dashboard', { timeout: 10000 });
}

export async function logout(page: Page) {
  // Click logout button if present
  const logoutButton = await page.$('button:has-text("Logout")');
  if (logoutButton) {
    await logoutButton.click();
  }
}

export async function createTestUser(email: string, password: string, role: string = 'client') {
  // This would normally interact with your API or database
  // For now, we'll assume test users are pre-created
  return {
    email,
    password,
    role
  };
}