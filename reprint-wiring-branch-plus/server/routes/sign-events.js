
import express from 'express';
import { query } from '../../config/database.js';

const router = express.Router();

// POST /api/sign-events
router.post('/', async (req, res) => {
  try {
    const { documentId, projectId, signerRole, method, dataUrl, typedName } = req.body || {};
    if (!projectId || !signerRole) return res.status(400).json({ error:'projectId & signerRole required' });
    const payload = { dataUrl, typedName, ua: req.headers['user-agent'], ip: req.ip, ts: new Date().toISOString() };
    await query('INSERT INTO sign_events(document_id, signer_role, method, payload) VALUES($1,$2,$3,$4)', [documentId || null, signerRole, method || 'typed', payload]);
    // If this was completion agreement, flip SIGN → done and LAUNCH → in_progress
    await query("UPDATE project_phases SET status='done', completed_at=now() WHERE project_id=$1 AND phase_key='SIGN'", [projectId]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
