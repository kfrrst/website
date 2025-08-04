import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { DatabaseCleanup } from '../../utils/database-cleanup';
import { MockDataGenerators } from '../../utils/mock-data-generators';

test.describe('Phase Management System - 8-Phase Workflow', () => {
  let testClient: any;
  let testProject: any;
  let authToken: string;

  test.beforeAll(async () => {
    // Create test client and project
    const clientData = MockDataGenerators.generateClient();
    testClient = await DatabaseCleanup.createTestClient(clientData);
    
    // Create project in phase 1
    testProject = await DatabaseCleanup.createTestProject({
      client_id: testClient.client.id,
      name: MockDataGenerators.generateProject().name,
      current_phase: 1
    });
  });

  test.afterAll(async () => {
    await DatabaseCleanup.cleanupTestData('test_');
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    authToken = await TestHelpers.loginUser(
      page, 
      testClient.client.email, 
      MockDataGenerators.generateClient().password
    );
    await page.goto('/portal.html');
    await TestHelpers.waitForLoadingComplete(page);
  });

  test('Phase display - Shows all 8 phases correctly', async ({ page }) => {
    // Navigate to project view
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check progress tracker displays all phases
    const progressTracker = page.locator('.progress-tracker');
    await expect(progressTracker).toBeVisible();
    
    // Verify all 8 phases are displayed
    const phases = [
      'Onboarding',
      'Ideation',
      'Design',
      'Review & Feedback',
      'Production/Print',
      'Payment',
      'Sign-off & Docs',
      'Delivery'
    ];
    
    for (let i = 0; i < phases.length; i++) {
      const phaseStep = progressTracker.locator(`.progress-step:nth-child(${i + 1})`);
      await expect(phaseStep).toBeVisible();
      await expect(phaseStep).toContainText(phases[i]);
      await expect(phaseStep).toContainText(`${i + 1}`);
    }
    
    // Verify current phase is highlighted
    const currentPhase = progressTracker.locator('.progress-step.current');
    await expect(currentPhase).toHaveCount(1);
    await expect(currentPhase).toContainText('1');
    await expect(currentPhase).toContainText('Onboarding');
  });

  test('Phase 1: Onboarding - Client actions', async ({ page }) => {
    // Navigate to project
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check phase 1 requirements
    const phaseContent = page.locator('.phase-content');
    await expect(phaseContent).toContainText('Welcome to your project');
    
    // Check required actions
    const actionItems = page.locator('.client-action-item');
    await expect(actionItems).toHaveCount(3); // Typical onboarding actions
    
    // Complete onboarding form
    await page.click('button:has-text("Complete Onboarding Form")');
    
    // Fill onboarding form
    const formData = MockDataGenerators.generateFormData('onboarding');
    await TestHelpers.fillFormField(page, 'company_overview', formData.company_overview);
    await TestHelpers.fillFormField(page, 'target_audience', formData.target_audience);
    await TestHelpers.fillFormField(page, 'project_goals', formData.project_goals);
    
    // Submit form
    await page.click('button[type="submit"]');
    await TestHelpers.expectNotification(page, 'Onboarding form submitted successfully');
    
    // Check action marked as complete
    await expect(actionItems.first()).toHaveClass(/completed/);
  });

  test('Phase progression - Advance from phase 1 to 2', async ({ page }) => {
    // Complete all phase 1 actions first
    // ... (complete actions as needed)
    
    // Admin needs to approve phase completion
    // For testing, we'll simulate this via API
    const response = await page.request.post(`/api/projects/${testProject.id}/phases/advance`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        from_phase: 1,
        to_phase: 2,
        notes: 'Phase 1 completed successfully'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Reload page to see updated phase
    await page.reload();
    
    // Verify phase advanced
    await TestHelpers.waitForPhaseTransition(page, 1, 2);
    
    const currentPhase = page.locator('.progress-step.current');
    await expect(currentPhase).toContainText('2');
    await expect(currentPhase).toContainText('Ideation');
    
    // Check phase 1 is marked complete
    const phase1 = page.locator('.progress-step:nth-child(1)');
    await expect(phase1).toHaveClass(/completed/);
  });

  test('Phase 3: Design - File uploads and approvals', async ({ page }) => {
    // Update project to phase 3 for this test
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 3 }
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check we're in design phase
    const phaseTitle = page.locator('.phase-title');
    await expect(phaseTitle).toContainText('Phase 3: Design');
    
    // Upload design file
    const uploadButton = page.locator('button:has-text("Upload Design Files")');
    await uploadButton.click();
    
    // Use file upload helper
    await TestHelpers.uploadFile(
      page,
      'input[type="file"]',
      'tests/fixtures/files/sample-design.pdf'
    );
    
    // Wait for upload success
    await TestHelpers.expectNotification(page, 'File uploaded successfully');
    
    // Check file appears in list
    const fileList = page.locator('.phase-files');
    await expect(fileList).toContainText('sample-design.pdf');
    
    // Test design approval flow
    await page.click('button:has-text("Review Design")');
    
    // Should show design preview/approval modal
    const approvalModal = page.locator('.design-approval-modal');
    await expect(approvalModal).toBeVisible();
    
    // Approve design
    await page.click('button:has-text("Approve Design")');
    await TestHelpers.expectNotification(page, 'Design approved');
  });

  test('Phase 4: Review & Feedback - Revision requests', async ({ page }) => {
    // Set project to phase 4
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 4 }
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Submit feedback
    await page.click('button:has-text("Provide Feedback")');
    
    const feedbackModal = page.locator('.feedback-modal');
    await expect(feedbackModal).toBeVisible();
    
    // Fill feedback form
    const feedbackData = MockDataGenerators.generateFormData('feedback');
    await TestHelpers.selectOption(page, '#overall_rating', feedbackData.overall_rating.toString());
    await TestHelpers.fillFormField(page, 'design_feedback', feedbackData.design_feedback);
    await TestHelpers.fillFormField(page, 'revision_requests', feedbackData.revision_requests);
    
    // Submit feedback
    await page.click('button:has-text("Submit Feedback")');
    await TestHelpers.expectNotification(page, 'Feedback submitted');
    
    // Check feedback appears in phase history
    const phaseHistory = page.locator('.phase-history');
    await expect(phaseHistory).toContainText(feedbackData.revision_requests);
  });

  test('Phase 5: Production - Status tracking', async ({ page }) => {
    // Set project to phase 5
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 5 }
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check production status
    const productionStatus = page.locator('.production-status');
    await expect(productionStatus).toBeVisible();
    await expect(productionStatus).toContainText('In Production');
    
    // Check for status updates
    const statusUpdates = page.locator('.status-updates');
    await expect(statusUpdates).toBeVisible();
    
    // Production phase should show estimated completion
    const estimatedCompletion = page.locator('.estimated-completion');
    await expect(estimatedCompletion).toBeVisible();
  });

  test('Phase 6: Payment - Invoice generation and payment', async ({ page }) => {
    // Set project to phase 6
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 6 }
    });
    
    // Create test invoice
    const invoiceData = MockDataGenerators.generateInvoice(testProject.id);
    await page.request.post('/api/invoices', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: invoiceData
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check payment phase displays invoice
    const invoiceSection = page.locator('.phase-invoice');
    await expect(invoiceSection).toBeVisible();
    await expect(invoiceSection).toContainText(invoiceData.invoice_number);
    await expect(invoiceSection).toContainText(`$${invoiceData.total.toFixed(2)}`);
    
    // Click pay invoice
    await page.click('button:has-text("Pay Invoice")');
    
    // Should show payment modal
    const paymentModal = page.locator('.payment-modal');
    await expect(paymentModal).toBeVisible();
    
    // Fill payment details (Stripe test card)
    const cardData = MockDataGenerators.generateCreditCard('valid');
    await TestHelpers.fillFormField(page, 'cardNumber', cardData.number);
    await TestHelpers.fillFormField(page, 'cardExpiry', `${cardData.exp_month}/${cardData.exp_year}`);
    await TestHelpers.fillFormField(page, 'cardCvc', cardData.cvc);
    await TestHelpers.fillFormField(page, 'billingZip', cardData.zip);
    
    // Submit payment
    await page.click('button:has-text("Pay Now")');
    
    // Wait for payment processing
    await TestHelpers.waitForApiResponse(page, '/api/payments/process', 200);
    await TestHelpers.expectNotification(page, 'Payment successful');
    
    // Invoice should show as paid
    await expect(invoiceSection).toContainText('PAID');
  });

  test('Phase 7: Sign-off - Document approval', async ({ page }) => {
    // Set project to phase 7
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 7 }
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check for sign-off documents
    const signoffDocs = page.locator('.signoff-documents');
    await expect(signoffDocs).toBeVisible();
    
    // Review project summary
    await page.click('button:has-text("Review Project Summary")');
    
    const summaryModal = page.locator('.project-summary-modal');
    await expect(summaryModal).toBeVisible();
    
    // Sign off on project
    await page.check('#agree-to-terms');
    await page.fill('#signature', testClient.client.contact_name);
    
    await page.click('button:has-text("Sign & Approve")');
    await TestHelpers.expectNotification(page, 'Project signed off successfully');
  });

  test('Phase 8: Delivery - Final files access', async ({ page }) => {
    // Set project to phase 8 (completed)
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { 
        current_phase: 8,
        status: 'completed'
      }
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Check project shows as completed
    const projectStatus = page.locator('.project-status');
    await expect(projectStatus).toContainText('Completed');
    
    // All phases should show as complete
    const completedPhases = page.locator('.progress-step.completed');
    await expect(completedPhases).toHaveCount(8);
    
    // Final deliverables should be available
    const deliverables = page.locator('.final-deliverables');
    await expect(deliverables).toBeVisible();
    
    // Download all files button
    const downloadAllBtn = page.locator('button:has-text("Download All Files")');
    await expect(downloadAllBtn).toBeVisible();
    await expect(downloadAllBtn).toBeEnabled();
    
    // Test download
    const downloadPromise = page.waitForEvent('download');
    await downloadAllBtn.click();
    const download = await downloadPromise;
    
    // Verify download started
    expect(download.suggestedFilename()).toContain(testProject.name);
  });

  test('Phase rollback - Handle phase regression', async ({ page }) => {
    // Admin functionality to roll back a phase
    // Set project to phase 5
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 5 }
    });
    
    // Simulate rollback to phase 4 via API (admin action)
    const rollbackResponse = await page.request.post(`/api/projects/${testProject.id}/phases/rollback`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        from_phase: 5,
        to_phase: 4,
        reason: 'Client requested design changes'
      }
    });
    
    expect(rollbackResponse.ok()).toBeTruthy();
    
    await page.reload();
    
    // Verify phase rolled back
    const currentPhase = page.locator('.progress-step.current');
    await expect(currentPhase).toContainText('4');
    
    // Check rollback notice
    const rollbackNotice = page.locator('.phase-rollback-notice');
    await expect(rollbackNotice).toBeVisible();
    await expect(rollbackNotice).toContainText('design changes');
  });

  test('Phase notifications - Email and real-time updates', async ({ page }) => {
    // Test real-time phase update notification
    await TestHelpers.waitForWebSocket(page);
    
    // Simulate phase update from another user/admin
    await page.evaluate((projectId) => {
      if (window['socket']) {
        window['socket'].emit('phase_updated', {
          project_id: projectId,
          new_phase: 3,
          message: 'Your project has moved to the Design phase!'
        });
      }
    }, testProject.id);
    
    // Should show real-time notification
    await TestHelpers.expectNotification(page, 'moved to the Design phase', 'info');
    
    // Check email was triggered (mock)
    const emailData = await TestHelpers.captureEmail(page, 'phase_updated');
    expect(emailData).toBeTruthy();
  });

  test('Phase permissions - Client cannot skip phases', async ({ page }) => {
    // Set to phase 2
    await page.request.put(`/api/projects/${testProject.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { current_phase: 2 }
    });
    
    // Try to access phase 5 content directly
    await page.goto(`/portal.html#project/${testProject.id}/phase/5`);
    
    // Should redirect to current phase
    await expect(page.locator('.phase-title')).toContainText('Phase 2: Ideation');
    
    // Should show message
    await TestHelpers.expectNotification(page, 'Complete current phase first', 'info');
  });

  test('Phase history tracking', async ({ page }) => {
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Open phase history
    await page.click('button:has-text("View Phase History")');
    
    const historyModal = page.locator('.phase-history-modal');
    await expect(historyModal).toBeVisible();
    
    // Should show all phase transitions
    const historyItems = historyModal.locator('.history-item');
    await expect(historyItems.first()).toContainText('Project created');
    
    // Each phase transition should be logged
    const transitions = await historyItems.count();
    expect(transitions).toBeGreaterThan(0);
    
    // Check history item details
    const firstTransition = historyItems.first();
    await expect(firstTransition).toContainText('Phase 1: Onboarding');
    await expect(firstTransition.locator('.timestamp')).toBeVisible();
    await expect(firstTransition.locator('.user-info')).toBeVisible();
  });
});