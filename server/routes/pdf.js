
import express from 'express';
import { compileTemplate } from '../lib/templates.js';
import { renderPdf } from '../lib/pdf.js';
import { query } from '../../config/database.js';

const router = express.Router();

router.post('/render', async (req, res) => {
  try {
    const { template, data, projectId, docType } = req.body || {};
    if (!template) return res.status(400).json({ error: 'template required' });
    const html = compileTemplate(template, data || {});
    const pdf = await renderPdf(html);
    // optional: store record in documents table
    if (projectId && docType) {
      await query('INSERT INTO documents(project_id, doc_type, storage_url, sha256) VALUES($1,$2,$3,$4)', [projectId, docType, null, null]);
    }
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${template.replace('.hbs','')}.pdf"`);
    res.send(pdf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
