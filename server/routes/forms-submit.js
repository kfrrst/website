
import express from 'express';
import { query } from '../../config/database.js';

const router = express.Router();

// POST /api/forms/:id/submit
router.post('/:id/submit', async (req, res) => {
  try {
    const formId = req.params.id;
    const { projectId, clientId, payload } = req.body || {};
    if (!projectId || !clientId || !payload) return res.status(400).json({ error:'projectId, clientId, payload required'});
    await query('INSERT INTO forms_submissions(project_id, client_id, form_id, data) VALUES($1,$2,$3,$4)', [projectId, clientId, formId, payload]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
