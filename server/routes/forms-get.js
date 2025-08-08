
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const router = express.Router();
const FORMS_DIR = path.join(process.cwd(), 'public', 'templates', 'forms');

router.get('/:id', (req, res) => {
  const file = path.join(FORMS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error:'form not found' });
  res.type('application/json').send(fs.readFileSync(file,'utf8'));
});

export default router;
