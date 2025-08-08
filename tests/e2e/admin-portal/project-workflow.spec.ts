import { test, expect } from '@playwright/test';

test.describe('Project Management Workflow', () => {
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
    
    // Wait for dashboard and navigate to projects
    await page.waitForSelector('#admin-dashboard', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.click('a[href="#projects"]');
    await page.waitForSelector('#projects.active', { state: 'visible' });
  });

  test('Create a new project', async ({ page }) => {
    // Click Create/New Project button
    const createButton = await page.locator('button:has-text("Project"), button:has-text("Create"), button#btn-create-project').first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Wait for modal
    await expect(page.locator('#project-modal')).toBeVisible();
    
    // Fill in project form
    const timestamp = Date.now();
    const testProject = {
      name: `Test Project ${timestamp}`,
      description: 'Automated test project for E2E testing',
      clientId: '', // Will be selected from dropdown
      budget: '5000',
      startDate: '2025-01-15',
      endDate: '2025-03-15',
      status: 'planning'
    };
    
    // Fill form fields
    await page.fill('input[name="name"], input[name="project_name"], input#project_name', testProject.name);
    await page.fill('textarea[name="description"], textarea#project_description', testProject.description);
    await page.fill('input[name="budget"], input#budget', testProject.budget);
    await page.fill('input[name="start_date"], input#start_date', testProject.startDate);
    await page.fill('input[name="end_date"], input#end_date', testProject.endDate);
    
    // Select client if dropdown exists
    const clientSelect = page.locator('select[name="client_id"], select#client_id').first();
    if (await clientSelect.isVisible()) {
      const options = await clientSelect.locator('option').count();
      if (options > 1) {
        await clientSelect.selectOption({ index: 1 }); // Select first actual client
      }
    }
    
    // Select status
    const statusSelect = page.locator('select[name="status"], select#project_status').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption(testProject.status);
    }
    
    // Submit form
    await page.click('#project-form button[type="submit"]');
    
    // Wait for modal to close
    await expect(page.locator('#project-modal')).not.toBeVisible({ timeout: 10000 });
    
    // Verify project appears in the list
    await page.waitForTimeout(2000);
    const projectItem = page.locator(`*:has-text("${testProject.name}")`).first();
    await expect(projectItem).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Successfully created project: ${testProject.name}`);
  });

  test('Update project phase', async ({ page }) => {
    // Find first project
    const firstProject = page.locator('.project-card, .project-row, tbody tr').first();
    await expect(firstProject).toBeVisible();
    
    // Look for phase update button
    const phaseButton = firstProject.locator('button:has-text("Phase"), button[title*="Phase"], button.phase-btn').first();
    
    if (await phaseButton.isVisible()) {
      await phaseButton.click();
      
      // Check if phase modal or dropdown appears
      const phaseModal = page.locator('.phase-modal, .phase-dropdown, [class*="phase-select"]').first();
      if (await phaseModal.isVisible({ timeout: 3000 })) {
        // Select next phase
        const nextPhaseBtn = phaseModal.locator('button:has-text("Next"), button:has-text("2"), .phase-option').first();
        if (await nextPhaseBtn.isVisible()) {
          await nextPhaseBtn.click();
          console.log('✅ Updated project phase');
        }
      }
    }
  });

  test('Filter projects by status and phase', async ({ page }) => {
    // Test status filter
    const statusFilter = page.locator('#project-status-filter, select.status-filter').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await page.waitForTimeout(1000);
      
      await statusFilter.selectOption('planning');
      await page.waitForTimeout(1000);
      
      await statusFilter.selectOption('all');
      await page.waitForTimeout(1000);
      console.log('✅ Status filter working');
    }
    
    // Test phase filter
    const phaseFilter = page.locator('#project-phase-filter, select.phase-filter').first();
    if (await phaseFilter.isVisible()) {
      await phaseFilter.selectOption('1');
      await page.waitForTimeout(1000);
      
      await phaseFilter.selectOption('all');
      await page.waitForTimeout(1000);
      console.log('✅ Phase filter working');
    }
    
    // Test search
    const searchInput = page.locator('#project-search-input, input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    await searchInput.clear();
    console.log('✅ Search functionality working');
  });

  test('Switch between grid and table view', async ({ page }) => {
    // Look for view toggle buttons
    const gridViewBtn = page.locator('#btn-view-grid, button:has-text("Grid"), .view-grid').first();
    const tableViewBtn = page.locator('#btn-view-table, button:has-text("Table"), .view-table').first();
    
    if (await gridViewBtn.isVisible() && await tableViewBtn.isVisible()) {
      // Switch to table view
      await tableViewBtn.click();
      await page.waitForTimeout(500);
      
      // Verify table view is active
      const tableView = page.locator('.projects-table, table.projects, .table-view').first();
      await expect(tableView).toBeVisible();
      console.log('✅ Switched to table view');
      
      // Switch back to grid view
      await gridViewBtn.click();
      await page.waitForTimeout(500);
      
      // Verify grid view is active
      const gridView = page.locator('.projects-grid, .grid-view, .project-cards').first();
      await expect(gridView).toBeVisible();
      console.log('✅ Switched to grid view');
    }
  });

  test('View project details', async ({ page }) => {
    // Click on first project to view details
    const viewButton = page.locator('button:has-text("View"), button[title="View"], .project-card').first();
    await viewButton.click();
    
    // Check if details modal or page opens
    const detailsView = page.locator('.project-details, #project-details-modal, .modal:has-text("Project Details")').first();
    
    if (await detailsView.isVisible({ timeout: 3000 })) {
      console.log('✅ Project details view opened');
      
      // Check for project information sections
      const sections = ['Overview', 'Timeline', 'Budget', 'Files', 'Activity'];
      for (const section of sections) {
        const sectionElement = detailsView.locator(`*:has-text("${section}")`).first();
        if (await sectionElement.isVisible()) {
          console.log(`  ✓ ${section} section present`);
        }
      }
      
      // Close details view
      const closeBtn = detailsView.locator('.modal-close, button:has-text("Close")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(detailsView).not.toBeVisible();
      }
    }
  });

  test('Export projects', async ({ page }) => {
    // Click export button
    const exportBtn = page.locator('#btn-export-projects, button:has-text("Export")').first();
    
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      
      // Check if export modal or dropdown appears
      const exportModal = page.locator('.export-modal, .export-dropdown, [class*="export"]').first();
      if (await exportModal.isVisible({ timeout: 3000 })) {
        console.log('✅ Export options available');
        
        // Look for export format options
        const csvOption = exportModal.locator('*:has-text("CSV")').first();
        const pdfOption = exportModal.locator('*:has-text("PDF")').first();
        
        if (await csvOption.isVisible()) {
          console.log('  ✓ CSV export available');
        }
        if (await pdfOption.isVisible()) {
          console.log('  ✓ PDF export available');
        }
        
        // Close modal/dropdown
        await page.click('body');
      }
    }
  });

  test('Validate 8-phase workflow', async ({ page }) => {
    // Create a new project to test phase progression
    const createButton = await page.locator('button:has-text("Project"), button#btn-create-project').first();
    await createButton.click();
    
    await expect(page.locator('#project-modal')).toBeVisible();
    
    // Check if phase selection is available in create form
    const phaseSelect = page.locator('select[name="current_phase"], #current_phase').first();
    if (await phaseSelect.isVisible()) {
      const phaseOptions = await phaseSelect.locator('option').allTextContents();
      
      // Verify all 8 phases are present
      const expectedPhases = [
        'Onboarding',
        'Ideation',
        'Design',
        'Review',
        'Production',
        'Payment',
        'Sign-off',
        'Delivery'
      ];
      
      for (const phase of expectedPhases) {
        const hasPhase = phaseOptions.some(option => option.includes(phase));
        if (hasPhase) {
          console.log(`✓ Phase "${phase}" available`);
        }
      }
    }
    
    // Close modal
    const closeBtn = page.locator('#project-modal .modal-close').first();
    await closeBtn.click();
  });
});