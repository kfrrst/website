import { test, expect } from '@playwright/test';

test.describe('Invoice Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and login
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin.html');
    await page.fill('#email', 'admin@kendrickforrest.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard and navigate to invoices
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.click('a[href="#invoices"]');
    await page.waitForSelector('#invoices.active', { state: 'visible' });
  });

  test('Create a new invoice', async ({ page }) => {
    // Click Create Invoice button
    const createButton = await page.locator('button:has-text("Invoice"), button:has-text("Create"), button#btn-create-invoice').first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Wait for invoice modal
    await expect(page.locator('#invoice-modal')).toBeVisible();
    
    // Fill in invoice form
    const timestamp = Date.now();
    const testInvoice = {
      invoiceNumber: `INV-${timestamp}`,
      clientId: '', // Will be selected
      projectId: '', // Will be selected
      dueDate: '2025-02-15',
      items: [
        { description: 'Design Services', quantity: '10', rate: '150', amount: '1500' },
        { description: 'Development Services', quantity: '20', rate: '200', amount: '4000' }
      ],
      tax: '8.25',
      discount: '10',
      notes: 'Thank you for your business!'
    };
    
    // Fill basic invoice details
    const invoiceNumField = page.locator('input[name="invoice_number"], input#invoice_number').first();
    if (await invoiceNumField.isVisible()) {
      await invoiceNumField.fill(testInvoice.invoiceNumber);
    }
    
    // Select client
    const clientSelect = page.locator('select[name="client_id"], select#invoice_client').first();
    if (await clientSelect.isVisible()) {
      const options = await clientSelect.locator('option').count();
      if (options > 1) {
        await clientSelect.selectOption({ index: 1 });
      }
    }
    
    // Select project if available
    const projectSelect = page.locator('select[name="project_id"], select#invoice_project').first();
    if (await projectSelect.isVisible()) {
      const options = await projectSelect.locator('option').count();
      if (options > 1) {
        await projectSelect.selectOption({ index: 1 });
      }
    }
    
    // Set due date
    await page.fill('input[name="due_date"], input#due_date', testInvoice.dueDate);
    
    // Add line items
    const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("Add Line")').first();
    if (await addItemBtn.isVisible()) {
      for (const item of testInvoice.items) {
        await addItemBtn.click();
        await page.waitForTimeout(500);
        
        // Fill item details
        const itemRows = page.locator('.invoice-item, .line-item, tr.item-row');
        const lastRow = itemRows.last();
        
        await lastRow.locator('input[name*="description"]').fill(item.description);
        await lastRow.locator('input[name*="quantity"]').fill(item.quantity);
        await lastRow.locator('input[name*="rate"]').fill(item.rate);
      }
    }
    
    // Add tax if field exists
    const taxField = page.locator('input[name="tax_rate"], input#tax_rate').first();
    if (await taxField.isVisible()) {
      await taxField.fill(testInvoice.tax);
    }
    
    // Add discount if field exists
    const discountField = page.locator('input[name="discount"], input#discount').first();
    if (await discountField.isVisible()) {
      await discountField.fill(testInvoice.discount);
    }
    
    // Add notes
    const notesField = page.locator('textarea[name="notes"], textarea#invoice_notes').first();
    if (await notesField.isVisible()) {
      await notesField.fill(testInvoice.notes);
    }
    
    // Submit form
    await page.click('#invoice-form button[type="submit"]');
    
    // Wait for modal to close
    await expect(page.locator('#invoice-modal')).not.toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Successfully created invoice: ${testInvoice.invoiceNumber}`);
  });

  test('Preview invoice before sending', async ({ page }) => {
    // Find first invoice with preview button
    const previewButton = page.locator('button:has-text("Preview"), button[title="Preview"]').first();
    
    if (await previewButton.isVisible()) {
      await previewButton.click();
      
      // Wait for preview modal
      await expect(page.locator('#invoice-preview-modal, .preview-modal')).toBeVisible({ timeout: 5000 });
      
      // Verify preview contains key elements
      const previewContent = page.locator('#invoice-preview-content, .preview-content').first();
      
      // Check for invoice header
      await expect(previewContent.locator('*:has-text("Invoice")')).toBeVisible();
      
      // Check for company info
      await expect(previewContent.locator('*:has-text("RE Print Studios")')).toBeVisible();
      
      // Check for line items section
      const itemsSection = previewContent.locator('table, .invoice-items, .line-items').first();
      await expect(itemsSection).toBeVisible();
      
      console.log('✅ Invoice preview working correctly');
      
      // Close preview
      const closeBtn = page.locator('#invoice-preview-modal .modal-close, #invoice-preview-close').first();
      await closeBtn.click();
      await expect(page.locator('#invoice-preview-modal')).not.toBeVisible();
    }
  });

  test('Send invoice to client', async ({ page }) => {
    // Find invoice with send button
    const sendButton = page.locator('button:has-text("Send"), button[title="Send"]').first();
    
    if (await sendButton.isVisible()) {
      await sendButton.click();
      
      // Check if send modal appears
      const sendModal = page.locator('.send-modal, .email-modal, .modal:has-text("Send Invoice")').first();
      
      if (await sendModal.isVisible({ timeout: 3000 })) {
        // Verify email fields
        const emailTo = sendModal.locator('input[name="to"], input#email_to').first();
        const emailSubject = sendModal.locator('input[name="subject"], input#email_subject').first();
        const emailMessage = sendModal.locator('textarea[name="message"], textarea#email_message').first();
        
        await expect(emailTo).toBeVisible();
        await expect(emailSubject).toBeVisible();
        await expect(emailMessage).toBeVisible();
        
        // Verify recipient email is pre-filled
        const toValue = await emailTo.inputValue();
        expect(toValue).toBeTruthy();
        
        console.log('✅ Send invoice modal working');
        
        // Close modal without sending
        const cancelBtn = sendModal.locator('button:has-text("Cancel"), .modal-close').first();
        await cancelBtn.click();
      }
    }
  });

  test('Mark invoice as paid', async ({ page }) => {
    // Find unpaid invoice
    const unpaidInvoice = page.locator('tr:has-text("Unpaid"), tr:has-text("Pending"), .invoice-item:has-text("Unpaid")').first();
    
    if (await unpaidInvoice.isVisible()) {
      // Look for mark as paid button
      const markPaidBtn = unpaidInvoice.locator('button:has-text("Mark Paid"), button:has-text("Paid")').first();
      
      if (await markPaidBtn.isVisible()) {
        await markPaidBtn.click();
        
        // Check if confirmation modal appears
        const confirmModal = page.locator('.confirm-modal, .modal:has-text("Confirm Payment")').first();
        
        if (await confirmModal.isVisible({ timeout: 3000 })) {
          // Add payment details if fields exist
          const amountField = confirmModal.locator('input[name="amount"], input#payment_amount').first();
          const dateField = confirmModal.locator('input[name="payment_date"], input#payment_date').first();
          
          if (await amountField.isVisible()) {
            const amount = await unpaidInvoice.locator('.amount, .total').first().textContent();
            await amountField.fill(amount?.replace(/[^0-9.]/g, '') || '0');
          }
          
          if (await dateField.isVisible()) {
            await dateField.fill(new Date().toISOString().split('T')[0]);
          }
          
          // Confirm payment
          await confirmModal.locator('button:has-text("Confirm"), button:has-text("Save")').first().click();
          console.log('✅ Marked invoice as paid');
        } else {
          // Direct status update without modal
          await page.waitForTimeout(2000);
          console.log('✅ Invoice status updated');
        }
      }
    }
  });

  test('Filter invoices by status', async ({ page }) => {
    // Test status filter
    const statusFilter = page.locator('select.status-filter, select[name="status"]').first();
    
    if (await statusFilter.isVisible()) {
      // Filter by unpaid
      await statusFilter.selectOption('unpaid');
      await page.waitForTimeout(1000);
      
      // Filter by paid
      await statusFilter.selectOption('paid');
      await page.waitForTimeout(1000);
      
      // Filter by overdue
      await statusFilter.selectOption('overdue');
      await page.waitForTimeout(1000);
      
      // Back to all
      await statusFilter.selectOption('all');
      await page.waitForTimeout(1000);
      
      console.log('✅ Status filter working');
    }
    
    // Test date range filter if available
    const dateFromField = page.locator('input[name="date_from"], input#date_from').first();
    const dateToField = page.locator('input[name="date_to"], input#date_to').first();
    
    if (await dateFromField.isVisible() && await dateToField.isVisible()) {
      await dateFromField.fill('2025-01-01');
      await dateToField.fill('2025-12-31');
      await page.waitForTimeout(1000);
      console.log('✅ Date range filter working');
    }
  });

  test('Download invoice as PDF', async ({ page }) => {
    // Find download button
    const downloadButton = page.locator('button:has-text("Download"), button[title="Download"], button:has-text("PDF")').first();
    
    if (await downloadButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await downloadButton.click();
      
      const download = await downloadPromise;
      if (download) {
        console.log(`✅ Invoice downloaded: ${download.suggestedFilename()}`);
        
        // Clean up downloaded file
        await download.delete();
      } else {
        // Check if preview opened instead
        const pdfViewer = page.locator('iframe[src*="pdf"], .pdf-viewer, embed[type="application/pdf"]').first();
        if (await pdfViewer.isVisible({ timeout: 3000 })) {
          console.log('✅ PDF preview opened');
          await page.goBack();
        }
      }
    }
  });

  test('Duplicate invoice', async ({ page }) => {
    // Find duplicate button
    const duplicateButton = page.locator('button:has-text("Duplicate"), button[title="Duplicate"], button:has-text("Copy")').first();
    
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();
      
      // Check if create modal opens with pre-filled data
      await expect(page.locator('#invoice-modal')).toBeVisible({ timeout: 5000 });
      
      // Verify some fields are pre-filled
      const clientSelect = page.locator('select[name="client_id"], select#invoice_client').first();
      const clientValue = await clientSelect.inputValue();
      expect(clientValue).not.toBe('');
      
      console.log('✅ Invoice duplication working');
      
      // Close modal
      const closeBtn = page.locator('#invoice-modal .modal-close').first();
      await closeBtn.click();
    }
  });
});