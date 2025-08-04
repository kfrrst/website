import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { DatabaseCleanup } from '../../utils/database-cleanup';
import { MockDataGenerators } from '../../utils/mock-data-generators';

test.describe('Phase Approval Workflow - Enhanced UI', () => {
  let testClient: any;
  let testProject: any;
  let authToken: string;

  test.beforeAll(async () => {
    // Create test client and project
    const clientData = MockDataGenerators.generateClient();
    testClient = await DatabaseCleanup.createTestClient(clientData);
    
    // Create project in phase 3 (Design) which requires approval
    testProject = await DatabaseCleanup.createTestProject({
      client_id: testClient.id,
      name: MockDataGenerators.generateProject().name,
      current_phase: 3
    });

    // Create a phase record that's awaiting approval
    await DatabaseCleanup.createPhaseRecord({
      project_id: testProject.id,
      phase_number: 3,
      status: 'awaiting_approval',
      requires_approval: true
    });
  });

  test.afterAll(async () => {
    await DatabaseCleanup.cleanupTestData('test_');
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    authToken = await TestHelpers.loginUser(
      page, 
      testClient.email, 
      MockDataGenerators.generateClient().password
    );
    await page.goto('/portal.html');
    await TestHelpers.waitForLoadingComplete(page);
  });

  test('Phase card displays enhanced UI elements', async ({ page }) => {
    // Navigate to project view
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    // Find the phase 3 card
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    await expect(phaseCard).toBeVisible();
    
    // Check for enhanced UI elements
    
    // 1. Status badge
    const statusBadge = phaseCard.locator('.phase-status-badge');
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText('Awaiting Approval');
    await expect(statusBadge).toHaveCSS('background-color', /rgba\(0, 87, 255/); // Blue background
    
    // 2. Progress bar
    const progressBar = phaseCard.locator('.phase-progress');
    await expect(progressBar).toBeVisible();
    const progressFill = progressBar.locator('.progress-bar-fill');
    await expect(progressFill).toBeVisible();
    
    // 3. Activity indicator (if there are new activities)
    const activityIndicator = phaseCard.locator('.activity-indicator');
    if (await activityIndicator.isVisible()) {
      await expect(activityIndicator.locator('.activity-count')).toHaveText(/\d+/);
    }
    
    // 4. Client actions checklist
    const clientActions = phaseCard.locator('.phase-client-actions');
    await expect(clientActions).toBeVisible();
    
    // 5. Deadline indicator
    const deadlineIndicator = phaseCard.locator('.deadline-indicator');
    if (await deadlineIndicator.isVisible()) {
      await expect(deadlineIndicator).toContainText(/days left|Due today|Overdue/);
    }
  });

  test('Client can approve phase successfully', async ({ page }) => {
    // Navigate to project
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    
    // Check approve button is visible
    const approveButton = phaseCard.locator('.btn-approve');
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toContainText('Approve Phase');
    
    // Click approve
    await approveButton.click();
    
    // Should show loading state
    await expect(phaseCard.locator('.phase-loading-overlay')).toBeVisible();
    
    // Wait for success notification
    await expect(phaseCard.locator('.phase-success-notification')).toBeVisible({ timeout: 5000 });
    await expect(phaseCard.locator('.phase-success-notification')).toContainText('Phase approved successfully');
    
    // Phase should update to completed status
    await page.waitForTimeout(2500); // Wait for reload
    
    // After reload, check phase is completed
    const updatedPhaseCard = page.locator('.phase-card[data-phase-id="3"]');
    const updatedStatusBadge = updatedPhaseCard.locator('.phase-status-badge');
    await expect(updatedStatusBadge).toContainText('Completed');
    
    // Approval info should be shown
    const approvalInfo = updatedPhaseCard.locator('.phase-approval-info');
    await expect(approvalInfo).toBeVisible();
    await expect(approvalInfo).toContainText('Approved by you');
  });

  test('Client can request changes with feedback', async ({ page }) => {
    // Reset phase to awaiting_approval for this test
    await DatabaseCleanup.updatePhaseStatus(testProject.id, 3, 'awaiting_approval');
    
    await page.goto('/portal.html');
    await TestHelpers.waitForLoadingComplete(page);
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    
    // Click request changes button
    const requestChangesButton = phaseCard.locator('.btn-request-changes');
    await expect(requestChangesButton).toBeVisible();
    await expect(requestChangesButton).toContainText('Request Changes');
    
    await requestChangesButton.click();
    
    // Feedback modal should appear
    const feedbackModal = page.locator('.feedback-modal');
    await expect(feedbackModal).toBeVisible();
    await expect(feedbackModal.locator('.modal-title')).toContainText('Request Changes - Design');
    
    // Fill feedback
    const feedbackText = 'Please adjust the color scheme to match our brand guidelines better. The logo placement needs to be more prominent.';
    await page.fill('#feedback-textarea', feedbackText);
    
    // Submit feedback
    await page.click('.feedback-modal button:has-text("Submit Changes")');
    
    // Should show loading
    await expect(phaseCard.locator('.phase-loading-overlay')).toBeVisible();
    
    // Wait for success
    await expect(phaseCard.locator('.phase-success-notification')).toBeVisible({ timeout: 5000 });
    await expect(phaseCard.locator('.phase-success-notification')).toContainText('Change request submitted successfully');
    
    // Phase should update to changes_requested status
    const updatedStatusBadge = phaseCard.locator('.phase-status-badge');
    await expect(updatedStatusBadge).toContainText('Changes Requested');
    await expect(updatedStatusBadge).toHaveCSS('background-color', /rgba\(230, 57, 70/); // Red background
    
    // Should show changes requested info
    const changesInfo = phaseCard.locator('.changes-requested-info');
    await expect(changesInfo).toBeVisible();
    await expect(changesInfo).toContainText('Changes were requested');
  });

  test('Required actions must be completed before approval', async ({ page }) => {
    // Create phase with incomplete client actions
    await DatabaseCleanup.createClientActions(testProject.id, 3, [
      { description: 'Review all design mockups', completed: true },
      { description: 'Provide brand asset files', completed: false },
      { description: 'Confirm color preferences', completed: false }
    ]);
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    
    // Check client actions are displayed
    const actionsList = phaseCard.locator('.phase-client-actions');
    await expect(actionsList).toBeVisible();
    
    const actionItems = actionsList.locator('.action-item');
    await expect(actionItems).toHaveCount(3);
    
    // First action should be completed
    await expect(actionItems.nth(0)).toHaveClass(/completed/);
    await expect(actionItems.nth(0).locator('.action-checkbox')).toContainText('✓');
    
    // Other actions should be incomplete
    await expect(actionItems.nth(1).locator('.action-checkbox')).toContainText('○');
    await expect(actionItems.nth(2).locator('.action-checkbox')).toContainText('○');
    
    // Should show message instead of approve/reject buttons
    const actionsRequired = phaseCard.locator('.actions-required-info');
    await expect(actionsRequired).toBeVisible();
    await expect(actionsRequired).toContainText('Complete all required actions above before approving');
    
    // Approve button should not be visible
    await expect(phaseCard.locator('.btn-approve')).not.toBeVisible();
  });

  test('Locked phase displays correctly', async ({ page }) => {
    // Create a future phase that should be locked
    await DatabaseCleanup.createPhaseRecord({
      project_id: testProject.id,
      phase_number: 5,
      status: 'not_started',
      requires_approval: true
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const lockedPhaseCard = page.locator('.phase-card[data-phase-id="5"]');
    await expect(lockedPhaseCard).toBeVisible();
    await expect(lockedPhaseCard).toHaveClass(/locked/);
    
    // Check locked overlay
    const lockedOverlay = lockedPhaseCard.locator('.phase-locked-overlay');
    await expect(lockedOverlay).toBeVisible();
    await expect(lockedOverlay.locator('.locked-icon')).toContainText('🔒');
    await expect(lockedOverlay.locator('.locked-message')).toContainText('This phase will unlock when the previous phase is completed');
    
    // Phase should have reduced opacity
    await expect(lockedPhaseCard).toHaveCSS('opacity', '0.7');
  });

  test('Overdue phase shows urgent indicator', async ({ page }) => {
    // Create phase with past deadline
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3); // 3 days ago
    
    await DatabaseCleanup.updatePhaseDeadline(testProject.id, 3, pastDate.toISOString());
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    
    // Check overdue indicator
    const deadlineIndicator = phaseCard.locator('.deadline-indicator');
    await expect(deadlineIndicator).toBeVisible();
    await expect(deadlineIndicator).toHaveClass(/overdue/);
    await expect(deadlineIndicator).toContainText('Overdue by 3 days');
    
    // Phase number should pulse
    const phaseNumber = phaseCard.locator('.phase-number');
    await expect(phaseNumber).toHaveClass(/overdue/);
    await expect(phaseNumber).toHaveCSS('animation-name', 'pulse-urgent');
  });

  test('Phase progress updates correctly', async ({ page }) => {
    // Create phase with 5 actions, 3 completed
    await DatabaseCleanup.createClientActions(testProject.id, 3, [
      { description: 'Action 1', completed: true },
      { description: 'Action 2', completed: true },
      { description: 'Action 3', completed: true },
      { description: 'Action 4', completed: false },
      { description: 'Action 5', completed: false }
    ]);
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    const progressBar = phaseCard.locator('.phase-progress');
    
    // Check progress text
    const progressText = progressBar.locator('.progress-value');
    await expect(progressText).toContainText('60% (3/5 actions)');
    
    // Check progress bar fill
    const progressFill = progressBar.locator('.progress-bar-fill');
    await expect(progressFill).toHaveCSS('width', '60%');
  });

  test('File downloads work from phase card', async ({ page }) => {
    // Add test file to phase
    await DatabaseCleanup.createPhaseFile(testProject.id, 3, {
      name: 'design-mockup-v2.pdf',
      type: 'application/pdf',
      size: 1024000
    });
    
    await page.reload();
    await TestHelpers.navigateToSection(page, 'projects');
    await page.click(`[data-project-id="${testProject.id}"]`);
    
    const phaseCard = page.locator('.phase-card[data-phase-id="3"]');
    const deliverables = phaseCard.locator('.phase-deliverables');
    await expect(deliverables).toBeVisible();
    
    const fileItem = deliverables.locator('.deliverable-item');
    await expect(fileItem).toContainText('design-mockup-v2.pdf');
    
    // Test download button
    const downloadBtn = fileItem.locator('.btn-download');
    await expect(downloadBtn).toBeVisible();
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('design-mockup');
  });
});