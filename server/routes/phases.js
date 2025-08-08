
import express from 'express';
import { query } from '../../config/database.js';

const router = express.Router();

// GET /api/phases/projects/:id/phases
router.get('/projects/:id/phases', async (req, res) => {
  try {
    const projectId = req.params.id;
    // Try DB first
    try {
      const { rows } = await query('SELECT phase_key AS key, status FROM project_phases WHERE project_id=$1 ORDER BY created_at', [projectId]);
      if (rows.length) {
        const labels = {ONB:'Onboarding',IDEA:'Ideation',DSGN:'Design',REV:'Review',PROD:'Production',PAY:'Payment',SIGN:'Sign‑off',LAUNCH:'Launch'};
        return res.json({ projectId, phases: rows.map(r => ({ key:r.key, label:labels[r.key]||r.key, status:r.status })) });
      }
    } catch {}
    // Fallback demo
    res.json({ projectId, phases:[
      { key:'ONB', label:'Onboarding', status:'in_progress' },
      { key:'IDEA', label:'Ideation', status:'not_started' },
      { key:'DSGN', label:'Design', status:'not_started' },
      { key:'REV', label:'Review', status:'not_started' },
      { key:'PROD', label:'Production', status:'not_started' },
      { key:'PAY', label:'Payment', status:'not_started' },
      { key:'SIGN', label:'Sign‑off', status:'not_started' },
      { key:'LAUNCH', label:'Launch', status:'not_started' }
    ]});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/phases/projects/:id/advance  { key:'ONB', status:'done' }
router.patch('/projects/:id/advance', async (req, res) => {
  const { key, status } = req.body || {};
  const projectId = req.params.id;
  if (!key || !status) return res.status(400).json({ error:'key & status required' });
  await query('UPDATE project_phases SET status=$1, completed_at=CASE WHEN $1=$2 THEN now() ELSE completed_at END WHERE project_id=$3 AND phase_key=$2', [status, key, projectId]);
  res.json({ ok:true });
});

export default router;
