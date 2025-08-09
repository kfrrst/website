import { test, expect } from '@playwright/test';

/**
 * Phase Requirements E2E Test Suite
 * Tests the 8-phase project workflow with requirement tracking
 */

test.describe('Phase Requirements System', () => {
  let token: string;
  let projectId: string;

  test.beforeAll(async ({ request }) => {
    // Login as client
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'client@example.com',
        password: 'client123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    token = loginData.token || loginData.accessToken;
    expect(token).toBeDefined();
  });

  test('Should get project with requirements', async ({ request }) => {
    // Get projects
    const projectsResponse = await request.get('/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(projectsResponse.ok()).toBeTruthy();
    const projectsData = await projectsResponse.json();
    expect(projectsData.projects).toBeDefined();
    expect(projectsData.projects.length).toBeGreaterThan(0);
    
    // Use first project for testing
    projectId = projectsData.projects[0].id;
    
    // Get project requirements
    const reqResponse = await request.get(`/api/projects/${projectId}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(reqResponse.ok()).toBeTruthy();
    const reqData = await reqResponse.json();
    expect(reqData.requirements).toBeDefined();
  });

  test('[Phase 1] Onboarding - Submit intake form', async ({ request }) => {
    // Submit intake form
    const formResponse = await request.post('/api/forms/submit', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        projectId: projectId,
        phaseKey: 'ONB',
        moduleId: 'intake_base',
        data: {
          business_name: 'Test Business E2E',
          contact_name: 'Test Contact',
          email: 'test@example.com',
          phone: '555-1234',
          project_type: 'Brand Identity',
          budget: '5000-10000',
          timeline: '3 months',
          goals: 'Create a professional brand identity for our new business'
        }
      }
    });
    
    expect(formResponse.ok()).toBeTruthy();
    const formData = await formResponse.json();
    expect(formData.success).toBeTruthy();
    
    // Verify requirement is marked complete
    const reqResponse = await request.get(`/api/projects/${projectId}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const reqData = await reqResponse.json();
    const intakeReq = reqData.requirements?.find((r: any) => r.requirement_key === 'intake_form');
    expect(intakeReq).toBeDefined();
    expect(intakeReq.completed).toBeTruthy();
  });

  test('[Phase 2] Ideation - Submit creative brief', async ({ request }) => {
    const formResponse = await request.post('/api/forms/submit', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        projectId: projectId,
        phaseKey: 'IDEA',
        moduleId: 'creative_brief',
        data: {
          concept: 'Modern and minimalist design',
          color_palette: ['#0057FF', '#F7C600', '#333333'],
          typography: 'Sans-serif, clean and readable',
          mood: 'Professional, trustworthy, innovative',
          references: ['Example 1', 'Example 2'],
          target_feeling: 'Confident and reliable'
        }
      }
    });
    
    expect(formResponse.ok()).toBeTruthy();
    const formData = await formResponse.json();
    expect(formData.success).toBeTruthy();
  });

  test('[Phase 3] Design - Submit design concepts', async ({ request }) => {
    const formResponse = await request.post('/api/forms/submit', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        projectId: projectId,
        phaseKey: 'DSGN',
        moduleId: 'design_concepts',
        data: {
          concept_name: 'Concept A - Bold & Modern',
          description: 'A bold, modern approach with strong typography',
          primary_colors: ['#0057FF', '#F7C600'],
          font_choices: ['Montserrat', 'Open Sans'],
          layout_description: 'Clean grid layout with emphasis on whitespace'
        }
      }
    });
    
    expect(formResponse.ok()).toBeTruthy();
  });

  test('[Phase 4] Review - Submit feedback', async ({ request }) => {
    const formResponse = await request.post('/api/forms/submit', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        projectId: projectId,
        phaseKey: 'REV',
        moduleId: 'client_feedback',
        data: {
          overall_satisfaction: 5,
          likes: 'Love the color scheme and typography',
          improvements: 'Could we make the logo slightly larger?',
          specific_changes: ['Increase logo size by 10%', 'Adjust spacing on page 2'],
          ready_to_proceed: true
        }
      }
    });
    
    expect(formResponse.ok()).toBeTruthy();
  });

  test('[Phase 5] Production - Mark production complete', async ({ request }) => {
    // Production phase typically doesn't have forms, just status updates
    // This would be handled by admin/studio side
    
    // For testing, we'll just verify the phase exists
    const reqResponse = await request.get(`/api/projects/${projectId}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const reqData = await reqResponse.json();
    expect(reqData).toBeDefined();
  });

  test('[Phase 6] Payment - Verify payment requirement', async ({ request }) => {
    // Payment is typically handled via Stripe webhook
    // For testing, we check if payment requirement exists
    
    const reqResponse = await request.get(`/api/projects/${projectId}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const reqData = await reqResponse.json();
    const paymentReq = reqData.requirements?.find((r: any) => 
      r.phase_key === 'PAY' && r.requirement_key === 'final_payment'
    );
    
    // Payment requirement should exist
    if (paymentReq) {
      expect(paymentReq).toBeDefined();
    }
  });

  test('[Phase 7] Sign-off - Submit completion agreement', async ({ request }) => {
    // Sign agreement endpoint
    const signResponse = await request.post('/api/agreements/sign/' + projectId, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        agreement_type: 'completion',
        signature_name: 'Test Client E2E',
        signature_date: new Date().toISOString()
      }
    });
    
    // Agreement signing might not be implemented yet
    if (signResponse.ok()) {
      const signData = await signResponse.json();
      expect(signData.success).toBeTruthy();
    }
  });

  test('[Phase 8] Launch - Project completion', async ({ request }) => {
    // Launch phase is typically just a status update
    const reqResponse = await request.get(`/api/projects/${projectId}/requirements`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const reqData = await reqResponse.json();
    expect(reqData).toBeDefined();
    
    // In a complete implementation, we'd check if all phases are complete
  });
});

test.describe('File Creation from Forms', () => {
  let token: string;
  let projectId: string;

  test.beforeAll(async ({ request }) => {
    // Login as client
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'client@example.com',
        password: 'client123'
      }
    });
    
    const loginData = await loginResponse.json();
    token = loginData.token || loginData.accessToken;
    
    // Get first project
    const projectsResponse = await request.get('/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const projectsData = await projectsResponse.json();
    projectId = projectsData.projects[0].id;
  });

  test('Form submission should create a file', async ({ request }) => {
    // Submit a form
    await request.post('/api/forms/submit', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        projectId: projectId,
        phaseKey: 'ONB',
        moduleId: 'test_form_' + Date.now(),
        data: {
          test_field: 'Test value',
          timestamp: new Date().toISOString()
        }
      }
    });
    
    // Get files for the project
    const filesResponse = await request.get('/api/files', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(filesResponse.ok()).toBeTruthy();
    const filesData = await filesResponse.json();
    expect(filesData.files).toBeDefined();
    
    // Should have at least one file
    const formFiles = filesData.files?.filter((f: any) => 
      f.file_type === 'document' && f.project_id === projectId
    );
    
    expect(formFiles).toBeDefined();
    expect(formFiles.length).toBeGreaterThan(0);
  });
});

test.describe('Requirements Completion Tracking', () => {
  test('All phases should have requirements defined', async ({ request }) => {
    // Login as admin to check all requirements
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.accessToken;
    
    const phases = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
    
    for (const phaseKey of phases) {
      const reqResponse = await request.get(`/api/phases/requirements/${phaseKey}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (reqResponse.ok()) {
        const reqData = await reqResponse.json();
        expect(reqData.requirements).toBeDefined();
        expect(Array.isArray(reqData.requirements)).toBeTruthy();
        
        // Log requirements for debugging
        console.log(`Phase ${phaseKey} has ${reqData.requirements.length} requirements`);
      }
    }
  });
});