
import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';

const DOC_DIR = path.join(process.cwd(), 'public', 'templates', 'docs');
const CSS_PATH = path.join(process.cwd(), 'public', 'styles', 'pdf.css');

export function compileTemplate(name, data) {
  const src = fs.readFileSync(path.join(DOC_DIR, name), 'utf8');
  const tpl = Handlebars.compile(src);
  let html = tpl({ ...data, generatedAt: new Date().toISOString() });
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  html = html.replace('<link rel="stylesheet" href="../styles/pdf.css">', `<style>${css}</style>`);
  return html;
}
