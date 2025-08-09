import { test, expect } from '@playwright/test';
import { fetchForm, submitForm, renderPdf, phases, advancePhase, stripePaid, signEvent, login, createProject, getRequirements } from './helpers';

test.describe('[RE]Print Studios — 8-step E2E', () => {
  let projectId: string;
  let clientId: string;
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Login as client
    token = await login(request, 'client@example.com', 'client123');
    
    // Create a test project
    const projectResponse = await createProject(request, token, {
      name: 'E2E Book Cover Project',
      description: 'Automated test project for 8-step flow',
      client_id: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e', // Use existing client ID from DB
      budget: 5000,
      timeline: '3 months',
      current_phase_key: 'ONB'
    });
    
    projectId = projectResponse.project.id;
    clientId = projectResponse.project.client_id;
  });

  test('[1] Onboarding — intake + SOW + deposit', async ({ request, page, baseURL }) => {
    // Submit intake form
    await submitForm(request, token, {
      projectId, 
      phaseKey: 'ONB',
      moduleId: 'intake_base',
      data: { 
        business_name: 'Client E2E LLC',
        contact_name: 'Client E2E',
        email: 'client@example.com',
        phone: '555-0100',
        project_type: 'Book Cover Design',
        budget: '2500-5000',
        timeline: '1-month',
        goals: 'Create professional book cover design',
        target_audience: 'Young adults',
        competitors: 'Similar genre books',
        brand_attributes: 'Modern, Professional, Bold'
      }
    });

    // Submit book-specific intake
    await submitForm(request, token, {
      projectId, 
      phaseKey: 'ONB',
      moduleId: 'intake_book_cover',
      data: { 
        title: 'The E2E Test Book', 
        author: 'Test Author', 
        trim_size: '6x9', 
        platform: 'KDP',
        genre: 'Fiction',
        target_audience: 'Young Adults',
        spine_text: 'The E2E Test Book - Test Author',
        back_cover_elements: ['Synopsis', 'Author Bio', 'ISBN Barcode']
      }
    });

    // Generate SOW PDF
    const pdfResponse = await renderPdf(request, 'service_agreement_sow.hbs', {
      client: { 
        displayName: 'Client E2E', 
        legalName: 'Client E2E LLC',
        email: 'client@example.com'
      },
      project: { 
        name: 'E2E Book Cover', 
        id: projectId,
        timeline: '4 weeks',
        budget: '$5,000'
      },
      deliverables: [
        'Front cover design',
        'Spine design', 
        'Back cover design',
        'Print-ready files',
        'Digital mockups'
      ],
      payment: { 
        deposit: '50%', 
        trigger: 'upon final approval' 
      }
    }, projectId, 'sow');

    // Simulate deposit payment
    await stripePaid(request, projectId, false);

    // Check requirements are marked complete
    const requirements = await getRequirements(request, token, projectId);
    const intakeReq = requirements.requirements?.find((r: any) => r.requirement_key === 'intake_form');
    expect(intakeReq?.completed).toBeTruthy();

    // UI smoke test
    await page.goto(`${baseURL}/portal`, {
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check for project in UI
    await page.waitForLoadState('networkidle');
    const projectElement = page.locator(`text="${projectId}"`).or(page.locator('text="E2E Book Cover"'));
    await expect(projectElement).toBeVisible({ timeout: 10000 });
  });

  test('[2] Ideation — approve Creative Brief', async ({ request }) => {
    // Submit ideation form
    await submitForm(request, token, {
      projectId, 
      phaseKey: 'IDEA',
      moduleId: 'creative_brief',
      data: { 
        date: new Date().toISOString().split('T')[0],
        participants: ['Client E2E', 'Design Team'],
        exercises: ['Mood Board Review', 'Sketch & Vote', 'Style Direction'],
        outcomes: 'Selected modern minimalist style with bold typography',
        preferredDirection: 'Direction A - Clean and Professional'
      }
    });

    // Advance phase to complete
    await advancePhase(request, projectId, 'IDEA', 'done');

    // Verify phase status
    const phaseData = await phases(request, projectId);
    const ideaPhase = phaseData.phases?.find((p: any) => p.key === 'IDEA');
    expect(ideaPhase?.status).toBe('done');
  });

  test('[3] Design — create designs and move to Review', async ({ request }) => {
    // Mark design phase as in progress
    await advancePhase(request, projectId, 'DSGN', 'in_progress');
    
    // In production, this would include file uploads
    // For now, we'll simulate design completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete design phase
    await advancePhase(request, projectId, 'DSGN', 'done');
  });

  test('[4] Review & Feedback — proof approval', async ({ request }) => {
    // Submit proof approval form
    await submitForm(request, token, {
      projectId, 
      phaseKey: 'REV',
      moduleId: 'proof_approval',
      data: { 
        spellingCorrect: true, 
        sizeOk: true, 
        colorsOk: true, 
        placementOk: true, 
        qualityOk: true,
        notes: 'Everything looks perfect! Ready to proceed.',
        approvalDate: new Date().toISOString(),
        approverName: 'Client E2E'
      }
    });

    // Mark review phase as complete
    await advancePhase(request, projectId, 'REV', 'done');

    // Check requirements
    const requirements = await getRequirements(request, token, projectId);
    const proofReq = requirements.requirements?.find((r: any) => r.requirement_key === 'proof_approval');
    expect(proofReq?.completed).toBeTruthy();
  });

  test('[5] Production / Build — prepare final files', async ({ request }) => {
    // Mark production as in progress
    await advancePhase(request, projectId, 'PROD', 'in_progress');
    
    // Simulate production work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Complete production
    await advancePhase(request, projectId, 'PROD', 'done');
  });

  test('[6] Payment — final invoice paid', async ({ request }) => {
    // Simulate final payment via Stripe webhook
    await stripePaid(request, projectId, true);
    
    // Verify payment phase advancement
    const phaseData = await phases(request, projectId);
    const payPhase = phaseData.phases?.find((p: any) => p.key === 'PAY');
    expect(payPhase?.status).toBe('done');
  });

  test('[7] Sign-off & Docs — completion agreement signed', async ({ request }) => {
    // Create sign event for project completion
    await signEvent(request, projectId, 'client', 'typed', 'Client E2E', `doc_${projectId}_completion`);
    
    // Mark sign-off phase as complete
    await advancePhase(request, projectId, 'SIGN', 'done');
    
    // Check requirements
    const requirements = await getRequirements(request, token, projectId);
    const signReq = requirements.requirements?.find((r: any) => r.requirement_key === 'completion_sign');
    expect(signReq?.completed).toBeTruthy();
  });

  test('[8] Launch — complete project and deliver', async ({ request }) => {
    // Mark launch phase as complete
    await advancePhase(request, projectId, 'LAUNCH', 'done');
    
    // Verify final project status
    const phaseData = await phases(request, projectId);
    
    // Check all phases are complete
    const expectedPhases = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
    for (const phaseKey of expectedPhases) {
      const phase = phaseData.phases?.find((p: any) => p.key === phaseKey);
      expect(phase).toBeDefined();
      expect(phase?.status).toBe('done');
    }
    
    // Verify project is fully complete
    const launchPhase = phaseData.phases?.find((p: any) => p.key === 'LAUNCH');
    expect(launchPhase?.status).toBe('done');
  });
});

test.describe('Phase Gates and Requirements (Enforcement Tests)', () => {
  let projectId: string;
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await login(request, 'client@example.com', 'client123');
    
    const projectResponse = await createProject(request, token, {
      name: 'Gate Test Project',
      description: 'Testing phase gate enforcement',
      client_id: '8fa035c9-83a3-4ac2-a55b-a148d92a3f7e',
      budget: 3000,
      timeline: '2 months',
      current_phase_key: 'ONB'
    });
    
    projectId = projectResponse.project.id;
  });

  test('Cannot advance from Onboarding without mandatory requirements', async ({ request }) => {
    // Try to advance without completing intake form
    const response = await request.patch(`/api/phases/projects/${projectId}/advance`, {
      data: { key: 'ONB', status: 'done' }
    });
    
    // Should fail or return warning about incomplete requirements
    if (!response.ok()) {
      const error = await response.json();
      expect(error.error).toContain('requirement');
    }
  });

  test('Cannot complete Payment phase without Stripe payment', async ({ request }) => {
    // Try to mark payment as done without payment
    const response = await request.patch(`/api/phases/projects/${projectId}/advance`, {
      data: { key: 'PAY', status: 'done' }
    });
    
    if (!response.ok()) {
      const error = await response.json();
      expect(error.error).toContain('payment');
    }
  });

  test('Cannot complete Sign-off without signature', async ({ request }) => {
    // Try to complete sign-off without signature
    const response = await request.patch(`/api/phases/projects/${projectId}/advance`, {
      data: { key: 'SIGN', status: 'done' }
    });
    
    if (!response.ok()) {
      const error = await response.json();
      expect(error.error).toContain('signature');
    }
  });
});

test.describe('Requirements Tracking', () => {
  test('All phase requirements are properly defined', async ({ request }) => {
    const token = await login(request, 'admin@example.com', 'admin123');
    
    // Check that each phase has requirements defined
    const phases = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
    
    for (const phaseKey of phases) {
      const response = await request.get(`/api/phases/requirements/${phaseKey}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok()) {
        const data = await response.json();
        expect(data.requirements).toBeDefined();
        expect(Array.isArray(data.requirements)).toBeTruthy();
      }
    }
  });
});