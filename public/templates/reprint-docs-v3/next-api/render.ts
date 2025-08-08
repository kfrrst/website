
import type { NextApiRequest, NextApiResponse } from 'next';
import { compile, inlineStyles } from '../../lib/templates';
import { renderPdfFromHtml } from '../../lib/pdf';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { template, data } = req.body;
    if (!template) return res.status(400).json({error:'template required'});
    const html = inlineStyles(compile(template, data || {}));
    const pdf = await renderPdfFromHtml(html);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`inline; filename="${template.replace('.hbs','')}.pdf"`);
    res.send(pdf);
  } catch (e:any) {
    res.status(500).json({error: e.message});
  }
}
