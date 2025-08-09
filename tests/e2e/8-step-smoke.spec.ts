import { test, expect } from '@playwright/test';

/**
 * Smoke test for the 8-step project flow
 * Validates that all endpoints and phase requirements are properly wired
 */

test.describe('8-Step Project Flow - Smoke Test', () => {
  const testProjectId = '3db33a21-ea6a-4bf9-9911-cef7c64b645a'; // Brand Identity Design from DB
  let adminToken: string;
  let clientToken: string;

  test.beforeAll(async ({ request }) => {
    // Login as admin
    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@example.com', password: 'admin123' }
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminData = await adminLogin.json();
    adminToken = adminData.token || adminData.accessToken;

    // Login as client
    const clientLogin = await request.post('/api/auth/login', {
      data: { email: 'client@example.com', password: 'client123' }
    });
    expect(clientLogin.ok()).toBeTruthy();
    const clientData = await clientLogin.json();
    clientToken = clientData.token || clientData.accessToken;
  });

  test('Phase 1: Onboarding - Intake form creates file and marks requirement complete', async ({ request }) => {
    // Submit intake form
    const formResponse = await request.post('/api/forms/submit', {
      headers: { 'Authorization': `Bearer ${clientToken}` },
      data: {
        projectId: testProjectId,
        phaseKey: 'ONB',
        moduleId: 'intake_base',
        data: {
          business_name: 'Smoke Test Business',
          contact_name: 'Smoke Tester',
          email: 'smoke@test.com',
          phone: '555-SMOKE',
          project_type: 'Brand Identity',
          budget: '5000-10000',
          timeline: '2 months',
          goals: 'Complete 8-step flow test'
        }
      }
    });

    expect(formResponse.ok()).toBeTruthy();
    const formData = await formResponse.json();
    expect(formData.success).toBeTruthy();

    // Verify file was created
    const filesResponse = await request.get('/api/files', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    expect(filesResponse.ok()).toBeTruthy();
    const filesData = await filesResponse.json();
    
    const formFile = filesData.files?.find((f: any) => 
      f.project_id === testProjectId && 
      f.file_type === 'document' &&
      f.original_name?.includes('Intake')
    );
    expect(formFile).toBeDefined();

    // Verify requirement is marked complete
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    
    const intakeReq = reqData.requirements?.find((r: any) => 
      r.phase_key === 'ONB' && r.requirement_key === 'intake_form'
    );
    expect(intakeReq).toBeDefined();
    expect(intakeReq.completed).toBeTruthy();
  });

  test('Phase 2: Ideation - Creative brief submission', async ({ request }) => {
    const formResponse = await request.post('/api/forms/submit', {
      headers: { 'Authorization': `Bearer ${clientToken}` },
      data: {
        projectId: testProjectId,
        phaseKey: 'IDEA',
        moduleId: 'creative_brief',
        data: {
          vision: 'Modern, clean, professional',
          target_audience: 'Young professionals',
          competitors: ['Brand A', 'Brand B'],
          unique_value: 'Innovation and quality'
        }
      }
    });

    expect(formResponse.ok()).toBeTruthy();
    
    // Check requirement
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const reqData = await reqResponse.json();
    
    const briefReq = reqData.requirements?.find((r: any) => 
      r.phase_key === 'IDEA' && r.requirement_key === 'review_brief'
    );
    if (briefReq) {
      expect(briefReq.completed).toBeTruthy();
    }
  });

  test('Phase 3: Design - Design upload tracking', async ({ request }) => {
    // Design phase typically involves file uploads
    // For smoke test, just verify the phase requirements exist
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    
    const designReqs = reqData.requirements?.filter((r: any) => r.phase_key === 'DSGN');
    expect(designReqs).toBeDefined();
    expect(designReqs.length).toBeGreaterThan(0);
  });

  test('Phase 4: Review & Feedback - Client approval', async ({ request }) => {
    const formResponse = await request.post('/api/forms/submit', {
      headers: { 'Authorization': `Bearer ${clientToken}` },
      data: {
        projectId: testProjectId,
        phaseKey: 'REV',
        moduleId: 'client_feedback',
        data: {
          approval_status: 'approved',
          feedback: 'Looks great!',
          requested_changes: [],
          approval_date: new Date().toISOString()
        }
      }
    });

    expect(formResponse.ok()).toBeTruthy();
  });

  test('Phase 5: Production - Production completion', async ({ request }) => {
    // Production is typically managed by admin
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    
    const prodReqs = reqData.requirements?.filter((r: any) => r.phase_key === 'PROD');
    expect(prodReqs).toBeDefined();
  });

  test('Phase 6: Payment - Payment tracking', async ({ request }) => {
    // Check payment requirements exist
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    
    const paymentReq = reqData.requirements?.find((r: any) => 
      r.phase_key === 'PAY' && r.requirement_key === 'final_payment'
    );
    
    expect(paymentReq).toBeDefined();
    
    // In production, Stripe webhook would mark this complete
  });

  test('Phase 7: Sign-off - Agreement signing', async ({ request }) => {
    // Try to sign agreement
    const signResponse = await request.post(`/api/agreements/sign/${testProjectId}`, {
      headers: { 'Authorization': `Bearer ${clientToken}` },
      data: {
        agreement_type: 'completion',
        signature_name: 'Smoke Test Client'
      }
    });

    // Agreement endpoint should exist
    expect(signResponse.status()).toBeLessThan(500);
    
    if (signResponse.ok()) {
      const signData = await signResponse.json();
      expect(signData.success).toBeTruthy();
    }
  });

  test('Phase 8: Launch - Project completion', async ({ request }) => {
    // Check launch phase requirements
    const reqResponse = await request.get(`/api/projects/${testProjectId}/requirements`, {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    
    const launchReqs = reqData.requirements?.filter((r: any) => r.phase_key === 'LAUNCH');
    expect(launchReqs).toBeDefined();
    
    // Launch typically has no mandatory requirements
    expect(launchReqs.every((r: any) => !r.is_mandatory)).toBeTruthy();
  });

  test('Requirements Summary - All phases have requirements defined', async ({ request }) => {
    const phases = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
    
    for (const phaseKey of phases) {
      const reqResponse = await request.get(`/api/phases/requirements/${phaseKey}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      expect(reqResponse.ok()).toBeTruthy();
      const reqData = await reqResponse.json();
      
      expect(reqData.requirements).toBeDefined();
      expect(Array.isArray(reqData.requirements)).toBeTruthy();
      expect(reqData.requirements.length).toBeGreaterThan(0);
      
      console.log(`✓ Phase ${phaseKey}: ${reqData.requirements.length} requirements defined`);
    }
  });

  test('File System - Forms create files visible to clients', async ({ request }) => {
    // Get all files for the test project
    const filesResponse = await request.get('/api/files', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    
    expect(filesResponse.ok()).toBeTruthy();
    const filesData = await filesResponse.json();
    
    // Should have document files from form submissions
    const documentFiles = filesData.files?.filter((f: any) => 
      f.project_id === testProjectId && f.file_type === 'document'
    );
    
    expect(documentFiles).toBeDefined();
    expect(documentFiles.length).toBeGreaterThan(0);
    
    console.log(`✓ Found ${documentFiles.length} document files from form submissions`);
  });
});

test.describe('Production Readiness Checks', () => {
  test('No mock data in responses', async ({ request }) => {
    // Login and get data
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'client@example.com', password: 'client123' }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.accessToken;
    
    // Check projects for mock data
    const projectsResponse = await request.get('/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projectsData = await projectsResponse.json();
    const projectsString = JSON.stringify(projectsData);
    
    // Check for common mock data patterns
    expect(projectsString).not.toContain('TODO');
    expect(projectsString).not.toContain('Lorem ipsum');
    expect(projectsString).not.toContain('Test test');
    expect(projectsString).not.toContain('[PLACEHOLDER]');
    
    // Check that data has real UUIDs
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    expect(projectsString).toMatch(uuidPattern);
  });

  test('All forms save to database', async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'client@example.com', password: 'client123' }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.accessToken;
    
    // Submit a test form
    const testFormId = 'test_' + Date.now();
    const formResponse = await request.post('/api/forms/submit', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        projectId: '3db33a21-ea6a-4bf9-9911-cef7c64b645a',
        phaseKey: 'ONB',
        moduleId: testFormId,
        data: { test: true, timestamp: Date.now() }
      }
    });
    
    expect(formResponse.ok()).toBeTruthy();
    const formData = await formResponse.json();
    expect(formData.success).toBeTruthy();
    
    // Verify it created a file
    const filesResponse = await request.get('/api/files', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const filesData = await filesResponse.json();
    const testFile = filesData.files?.find((f: any) => 
      f.original_name?.includes(testFormId.replace(/_/g, ' '))
    );
    
    expect(testFile).toBeDefined();
  });
});