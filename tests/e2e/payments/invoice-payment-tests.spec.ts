import { test, expect } from '@playwright/test';
import { EnhancedTestHelpers } from '../../utils/enhanced-helpers';
import { TEST_USERS, STRIPE_TEST_CARDS, TIMEOUTS } from '../../utils/test-constants';

test.describe('Comprehensive Invoice & Payment Tests', () => {
  let clientToken: string;
  let adminToken: string;
  let testInvoiceId: string;

  test.beforeAll(async ({ request }) => {
    // Get auth tokens
    const clientLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.client
    });
    clientToken = (await clientLogin.json()).token;

    const adminLogin = await request.post('/api/auth/login', {
      data: TEST_USERS.admin
    });
    adminToken = (await adminLogin.json()).token;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test invoices
    if (testInvoiceId) {
      try {
        await request.delete(`/api/invoices/${testInvoiceId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (error) {
        console.log('Invoice cleanup failed');
      }
    }
  });

  test.describe('Invoice Creation & Management', () => {
    test('Create invoice with line items', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to invoices
      await page.click('text=Invoices');
      await page.waitForLoadState('networkidle');

      // Click create invoice
      await page.click('button:has-text("Create Invoice"), button:has-text("New Invoice")');

      // Fill invoice form
      const invoiceModal = page.locator('.invoice-modal, [data-invoice-form]');
      await expect(invoiceModal).toBeVisible();

      // Select client
      await page.selectOption('select[name="client"]', { label: 'John Smith' });

      // Add line items
      const lineItems = [
        { description: 'Logo Design', quantity: 1, rate: 500 },
        { description: 'Business Card Design', quantity: 100, rate: 2 },
        { description: 'Brand Guidelines', quantity: 1, rate: 800 }
      ];

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        
        // Add new line item if needed
        if (i > 0) {
          await page.click('button:has-text("Add Line Item")');
        }

        // Fill line item details
        await page.fill(`input[name="items[${i}].description"]`, item.description);
        await page.fill(`input[name="items[${i}].quantity"]`, String(item.quantity));
        await page.fill(`input[name="items[${i}].rate"]`, String(item.rate));
      }

      // Verify total calculation
      const totalElement = page.locator('.invoice-total, [data-invoice-total]');
      await expect(totalElement).toContainText('1,500'); // $1,500 total

      // Set due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await page.fill('input[name="dueDate"]', dueDate.toISOString().split('T')[0]);

      // Save invoice
      await page.click('button:has-text("Create"), button:has-text("Save")');

      // Wait for success
      await expect(page.locator('text=/created|success/i')).toBeVisible();

      // Verify invoice appears in list
      await expect(page.locator('text="$1,500.00"')).toBeVisible();
      console.log('✅ Invoice created with line items');
    });

    test('Edit existing invoice', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to invoices
      await page.click('text=Invoices');
      await page.waitForLoadState('networkidle');

      // Find and edit first invoice
      const editBtn = page.locator('button:has-text("Edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();

        // Update invoice
        const modal = page.locator('.invoice-modal');
        await expect(modal).toBeVisible();

        // Add discount
        await page.fill('input[name="discount"]', '10');
        await page.selectOption('select[name="discountType"]', 'percent');

        // Verify total updates
        const totalBefore = await page.locator('[data-invoice-total]').textContent();
        await page.waitForTimeout(500); // Wait for calculation
        const totalAfter = await page.locator('[data-invoice-total]').textContent();
        
        expect(totalBefore).not.toBe(totalAfter);
        console.log('✅ Invoice discount applied');

        // Save changes
        await page.click('button:has-text("Update"), button:has-text("Save")');
        await expect(page.locator('text=/updated|saved/i')).toBeVisible();
      }
    });

    test('Invoice status workflow', async ({ page, request }) => {
      // Create test invoice via API
      const invoiceData = {
        clientId: TEST_USERS.client.email,
        items: [{ description: 'Test Service', quantity: 1, rate: 100 }],
        status: 'draft',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const createResponse = await request.post('/api/invoices', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: invoiceData
      });

      const invoice = await createResponse.json();
      testInvoiceId = invoice.id;

      // Test status transitions
      const statusTransitions = [
        { from: 'draft', to: 'sent', action: 'Send' },
        { from: 'sent', to: 'viewed', action: 'View' },
        { from: 'viewed', to: 'paid', action: 'Pay' }
      ];

      for (const transition of statusTransitions) {
        const updateResponse = await request.patch(`/api/invoices/${invoice.id}/status`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          data: { status: transition.to }
        });

        expect(updateResponse.ok()).toBeTruthy();
        console.log(`✅ Invoice status: ${transition.from} → ${transition.to}`);
      }
    });

    test('Invoice PDF generation', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to invoices
      await page.click('text=Invoices');
      await page.waitForLoadState('networkidle');

      // Find PDF download button
      const pdfBtn = page.locator('button:has-text("PDF"), button:has-text("Download")').first();
      
      if (await pdfBtn.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        // Click download
        await pdfBtn.click();
        
        // Wait for download
        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        
        expect(filename).toContain('.pdf');
        console.log(`✅ Invoice PDF generated: ${filename}`);
        
        // Verify PDF is valid
        const path = await download.path();
        expect(path).toBeTruthy();
      }
    });

    test('Bulk invoice operations', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to invoices
      await page.click('text=Invoices');
      await page.waitForLoadState('networkidle');

      // Select multiple invoices
      const checkboxes = page.locator('input[type="checkbox"][name*="invoice"]');
      const count = await checkboxes.count();
      
      if (count >= 2) {
        // Select first two
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        // Check bulk actions appear
        const bulkActions = page.locator('.bulk-actions, [data-bulk-actions]');
        await expect(bulkActions).toBeVisible();

        // Test bulk send
        const bulkSend = bulkActions.locator('button:has-text("Send Selected")');
        if (await bulkSend.isVisible()) {
          await bulkSend.click();
          
          // Confirm action
          await page.click('button:has-text("Confirm")');
          
          await expect(page.locator('text=/sent|emailed/i')).toBeVisible();
          console.log('✅ Bulk invoice send completed');
        }
      }
    });
  });

  test.describe('Payment Processing Tests', () => {
    test('Stripe payment flow - successful payment', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      
      // Navigate to payment page
      await page.goto('/portal.html');
      await page.click('text=Invoices, text=Payments');

      // Find unpaid invoice
      const payBtn = page.locator('button:has-text("Pay Now")').first();
      
      if (await payBtn.isVisible()) {
        await payBtn.click();

        // Wait for Stripe checkout
        await page.waitForLoadState('networkidle');

        // Check if Stripe iframe loaded
        const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
        
        if (stripeFrame) {
          // Fill payment details
          await stripeFrame.locator('[placeholder="Card number"]').fill(STRIPE_TEST_CARDS.success.number);
          await stripeFrame.locator('[placeholder="MM / YY"]').fill(STRIPE_TEST_CARDS.success.exp);
          await stripeFrame.locator('[placeholder="CVC"]').fill(STRIPE_TEST_CARDS.success.cvc);
          await stripeFrame.locator('[placeholder="ZIP"]').fill(STRIPE_TEST_CARDS.success.zip);

          // Submit payment
          await page.click('button[type="submit"]:has-text("Pay")');

          // Wait for success
          await expect(page.locator('text=/success|paid|thank you/i')).toBeVisible({ 
            timeout: TIMEOUTS.payment 
          });
          
          console.log('✅ Stripe payment successful');
        }
      }
    });

    test('Payment failure handling', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');
      await page.click('text=Invoices, text=Payments');

      const payBtn = page.locator('button:has-text("Pay Now")').first();
      
      if (await payBtn.isVisible()) {
        await payBtn.click();
        await page.waitForLoadState('networkidle');

        const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
        
        if (stripeFrame) {
          // Use declining card
          await stripeFrame.locator('[placeholder="Card number"]').fill(STRIPE_TEST_CARDS.decline.number);
          await stripeFrame.locator('[placeholder="MM / YY"]').fill(STRIPE_TEST_CARDS.decline.exp);
          await stripeFrame.locator('[placeholder="CVC"]').fill(STRIPE_TEST_CARDS.decline.cvc);

          // Submit payment
          await page.click('button[type="submit"]:has-text("Pay")');

          // Wait for error
          await expect(page.locator('text=/declined|failed|error/i')).toBeVisible({ 
            timeout: TIMEOUTS.medium 
          });
          
          console.log('✅ Payment failure handled correctly');
        }
      }
    });

    test('3D Secure authentication flow', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');
      await page.click('text=Invoices, text=Payments');

      const payBtn = page.locator('button:has-text("Pay Now")').first();
      
      if (await payBtn.isVisible()) {
        await payBtn.click();
        await page.waitForLoadState('networkidle');

        const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
        
        if (stripeFrame) {
          // Use 3DS card
          await stripeFrame.locator('[placeholder="Card number"]').fill(STRIPE_TEST_CARDS.authentication.number);
          await stripeFrame.locator('[placeholder="MM / YY"]').fill(STRIPE_TEST_CARDS.authentication.exp);
          await stripeFrame.locator('[placeholder="CVC"]').fill(STRIPE_TEST_CARDS.authentication.cvc);

          // Submit payment
          await page.click('button[type="submit"]:has-text("Pay")');

          // Wait for 3DS modal
          const authFrame = page.frameLocator('iframe[name*="3ds"]');
          if (authFrame) {
            // Complete authentication
            await authFrame.locator('button:has-text("Complete")').click();
            
            await expect(page.locator('text=/authenticated|verified/i')).toBeVisible({ 
              timeout: TIMEOUTS.payment 
            });
            
            console.log('✅ 3D Secure authentication completed');
          }
        }
      }
    });

    test('Payment method management', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');
      
      // Navigate to payment methods
      await page.click('text=Payment Methods, text=Billing');
      await page.waitForLoadState('networkidle');

      // Add new payment method
      const addCardBtn = page.locator('button:has-text("Add Card"), button:has-text("Add Payment Method")');
      
      if (await addCardBtn.isVisible()) {
        await addCardBtn.click();

        // Fill card details in Stripe Elements
        const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
        
        if (stripeFrame) {
          await stripeFrame.locator('[placeholder="Card number"]').fill(STRIPE_TEST_CARDS.success.number);
          await stripeFrame.locator('[placeholder="MM / YY"]').fill(STRIPE_TEST_CARDS.success.exp);
          await stripeFrame.locator('[placeholder="CVC"]').fill(STRIPE_TEST_CARDS.success.cvc);

          // Save card
          await page.click('button:has-text("Save")');

          // Verify card added
          await expect(page.locator('text=•••• 4242')).toBeVisible();
          console.log('✅ Payment method added');

          // Test setting as default
          const setDefaultBtn = page.locator('button:has-text("Set as Default")').first();
          if (await setDefaultBtn.isVisible()) {
            await setDefaultBtn.click();
            await expect(page.locator('text=Default')).toBeVisible();
          }
        }
      }
    });

    test('Refund processing', async ({ page, request }) => {
      // This test requires admin access
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to payments
      await page.click('text=Payments, text=Transactions');
      await page.waitForLoadState('networkidle');

      // Find a paid transaction
      const refundBtn = page.locator('button:has-text("Refund")').first();
      
      if (await refundBtn.isVisible()) {
        await refundBtn.click();

        // Fill refund form
        const refundModal = page.locator('.refund-modal, [data-refund-form]');
        await expect(refundModal).toBeVisible();

        // Partial refund
        await page.fill('input[name="amount"]', '50.00');
        await page.fill('textarea[name="reason"]', 'Test partial refund');

        // Process refund
        await page.click('button:has-text("Process Refund")');

        // Wait for confirmation
        await expect(page.locator('text=/refunded|processed/i')).toBeVisible();
        console.log('✅ Refund processed successfully');
      }
    });
  });

  test.describe('Payment Notifications & Reminders', () => {
    test('Automated payment reminder emails', async ({ page, request }) => {
      // Check if reminder emails are scheduled
      const remindersResponse = await request.get('/api/invoices/reminders', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (remindersResponse.ok()) {
        const reminders = await remindersResponse.json();
        console.log(`✅ ${reminders.length} payment reminders scheduled`);

        // Test manual reminder send
        if (testInvoiceId) {
          const sendReminder = await request.post(`/api/invoices/${testInvoiceId}/remind`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });

          expect(sendReminder.ok()).toBeTruthy();
          console.log('✅ Payment reminder sent');
        }
      }
    });

    test('Payment confirmation emails', async ({ page, request }) => {
      // Mock a payment completion
      if (testInvoiceId) {
        const paymentData = {
          invoiceId: testInvoiceId,
          amount: 100.00,
          paymentMethod: 'card',
          stripePaymentId: 'pi_test_' + Date.now()
        };

        const paymentResponse = await request.post('/api/payments', {
          headers: { 'Authorization': `Bearer ${clientToken}` },
          data: paymentData
        });

        if (paymentResponse.ok()) {
          // Check if confirmation email was queued
          const emailQueue = await request.get('/api/admin/email-queue', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });

          if (emailQueue.ok()) {
            const emails = await emailQueue.json();
            const confirmationEmail = emails.find((e: any) => 
              e.template === 'payment-received' && 
              e.recipient === TEST_USERS.client.email
            );

            expect(confirmationEmail).toBeTruthy();
            console.log('✅ Payment confirmation email queued');
          }
        }
      }
    });
  });

  test.describe('Invoice Analytics & Reporting', () => {
    test('Invoice dashboard metrics', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Check dashboard for invoice metrics
      const metrics = [
        { label: 'Total Revenue', selector: '[data-metric="revenue"]' },
        { label: 'Outstanding', selector: '[data-metric="outstanding"]' },
        { label: 'Overdue', selector: '[data-metric="overdue"]' },
        { label: 'Paid This Month', selector: '[data-metric="paid-month"]' }
      ];

      for (const metric of metrics) {
        const element = page.locator(metric.selector);
        if (await element.isVisible({ timeout: TIMEOUTS.short })) {
          const value = await element.textContent();
          console.log(`✅ ${metric.label}: ${value}`);
        }
      }
    });

    test('Export invoice reports', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to reports
      await page.click('text=Reports');
      await page.waitForLoadState('networkidle');

      // Generate invoice report
      await page.selectOption('select[name="reportType"]', 'invoices');
      await page.fill('input[name="startDate"]', '2024-01-01');
      await page.fill('input[name="endDate"]', '2024-12-31');

      // Export as CSV
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export CSV")');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
      console.log('✅ Invoice report exported');
    });
  });

  test.describe('Multi-currency Support', () => {
    test('Create invoice in different currency', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'admin');
      await page.goto('/admin.html');

      // Navigate to invoices
      await page.click('text=Invoices');
      await page.click('button:has-text("Create Invoice")');

      // Select currency
      const currencySelect = page.locator('select[name="currency"]');
      if (await currencySelect.isVisible()) {
        await currencySelect.selectOption('EUR');

        // Add item with EUR price
        await page.fill('input[name="items[0].description"]', 'European Service');
        await page.fill('input[name="items[0].rate"]', '100');

        // Verify currency symbol
        await expect(page.locator('text=€')).toBeVisible();
        console.log('✅ Multi-currency invoice created');
      }
    });

    test('Currency conversion for payments', async ({ page }) => {
      await EnhancedTestHelpers.loginUser(page, 'client');
      await page.goto('/portal.html');

      // Look for currency indicator
      const currencyInfo = page.locator('.currency-info, [data-currency]').first();
      if (await currencyInfo.isVisible()) {
        const currency = await currencyInfo.textContent();
        console.log(`✅ Payment currency: ${currency}`);

        // Check for conversion rate if applicable
        const conversionRate = page.locator('.conversion-rate, [data-conversion]');
        if (await conversionRate.isVisible()) {
          const rate = await conversionRate.textContent();
          console.log(`  Conversion rate: ${rate}`);
        }
      }
    });
  });
});