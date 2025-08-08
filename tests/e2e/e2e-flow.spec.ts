
import { test, expect, request } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('Onboarding → Launch (simulated)', async ({ page }) => {
  // 1. Intake submit
  const formResp = await (await fetch(BASE + '/api/forms/intake_book_cover')).json();
  expect(formResp.id).toBe('intake_book_cover');

  // 2. Submit intake to backend
  const save = await fetch(BASE + '/api/forms/intake_book_cover/submit', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ projectId:'p_e2e', clientId:'c_demo', payload:{ title:'Test', author:'A U Thor', trimSize:'6x9' } })
  });
  expect(save.ok).toBeTruthy();

  // 3. Render SOW PDF
  const pdf = await fetch(BASE + '/api/pdf/render', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ template:'service_agreement_sow.hbs', projectId:'p_e2e', docType:'sow', data:{ client:{displayName:'E2E Co.',legalName:'E2E Co.'}, project:{name:'Demo', id:'p_e2e'}, deliverables:['Cover'], payment:{deposit:'50%', trigger:'final approval'} } })
  });
  expect(pdf.ok).toBeTruthy();
  expect(pdf.headers.get('content-type')).toContain('application/pdf');

  // 4. Simulate Stripe webhook (dev path, JSON w/o signature)
  const wh = await fetch(BASE + '/api/stripe/webhook', { method:'POST', body: JSON.stringify({type:'invoice.paid', data:{object:{metadata:{projectId:'p_e2e'}}}}) });
  expect(wh.ok).toBeTruthy();

  // 5. Sign completion
  // Direct API call to /api/sign-events (skipping UI for speed)
  const sign = await fetch(BASE + '/api/sign-events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ projectId:'p_e2e', signerRole:'client', method:'typed', typedName:'Client E2E' }) });
  const sj = await sign.json(); expect(sj.ok).toBeTruthy();
});
