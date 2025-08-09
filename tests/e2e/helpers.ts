import { APIRequestContext, expect } from '@playwright/test';

/**
 * Helper functions for [RE]Print Studios E2E tests
 */

export async function fetchForm(request: APIRequestContext, formId: string, token: string) {
  const r = await request.get(`/api/forms/${formId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function submitForm(request: APIRequestContext, token: string, formData: { projectId: string; phaseKey: string; moduleId: string; data: any }) {
  const r = await request.post(`/api/forms/submit`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: formData
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function renderPdf(request: APIRequestContext, template: string, data: any, projectId?: string, docType?: string) {
  const r = await request.post(`/api/pdf/render`, { data: { template, data, projectId, docType } });
  expect(r.ok()).toBeTruthy();
  expect(r.headers()['content-type']).toContain('application/pdf');
  return r;
}

export async function phases(request: APIRequestContext, projectId: string) {
  const r = await request.get(`/api/phases/projects/${projectId}/phases`);
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function advancePhase(request: APIRequestContext, projectId: string, key: string, status: 'not_started'|'in_progress'|'done') {
  const r = await request.patch(`/api/phases/projects/${projectId}/advance`, { data: { key, status } });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function stripePaid(request: APIRequestContext, projectId: string, isFinal = false) {
  // Dev simulation of Stripe webhook; production should verify signatures.
  const type = 'invoice.paid';
  const data = { object: { metadata: { projectId, stage: isFinal ? 'final' : 'deposit' } } };
  const r = await request.post(`/api/stripe/webhook`, { headers: { 'Content-Type': 'application/json' }, data: { type, data } });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

export async function signEvent(request: APIRequestContext, projectId: string, signerRole: 'client'|'studio'='client', method: 'typed'|'drawn'='typed', typedName='Test Client', documentId?: string) {
  const r = await request.post(`/api/sign-events`, { data: { projectId, signerRole, method, typedName, documentId } });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

/**
 * Login helper for authenticated tests
 */
export async function login(request: APIRequestContext, email: string, password: string) {
  const r = await request.post('/api/auth/login', {
    data: { email, password }
  });
  expect(r.ok()).toBeTruthy();
  const data = await r.json();
  return data.token || data.accessToken;
}

/**
 * Create a test project
 */
export async function createProject(request: APIRequestContext, token: string, projectData: any) {
  const r = await request.post('/api/projects', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: projectData
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}

/**
 * Get project requirements
 */
export async function getRequirements(request: APIRequestContext, token: string, projectId: string) {
  const r = await request.get(`/api/projects/${projectId}/requirements`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(r.ok()).toBeTruthy();
  return await r.json();
}