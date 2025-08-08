
import type { NextApiRequest, NextApiResponse } from 'next';
import { compile, inlineStyles } from '../../lib/templates';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { template } = req.query;
  if (!template || typeof template !== 'string') return res.status(400).send('template query required');
  const data = req.body && Object.keys(req.body).length ? req.body : { client:{displayName:'ACME Co.'}, project:{name:'Demo', id:'p_demo'} };
  const html = inlineStyles(compile(template, data));
  res.setHeader('Content-Type','text/html');
  res.send(html);
}
