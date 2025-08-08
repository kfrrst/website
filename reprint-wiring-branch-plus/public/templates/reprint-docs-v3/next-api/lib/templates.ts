
import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';

const ROOT = process.cwd();
const DOC_DIR = path.join(ROOT, 'templates', 'docs');
const CSS_DIR = path.join(ROOT, 'styles');

export function loadTemplate(name: string) {
  const file = path.join(DOC_DIR, name);
  if (!fs.existsSync(file)) throw new Error('Template not found: ' + name);
  return fs.readFileSync(file, 'utf-8');
}

export function inlineStyles(html: string) {
  const css = fs.readFileSync(path.join(CSS_DIR, 'pdf.css'), 'utf-8');
  // Replace external link tag if present; otherwise inject in <head>
  if (html.includes('../styles/pdf.css')) {
    html = html.replace('<link rel="stylesheet" href="../styles/pdf.css">', `<style>${css}</style>`);
  } else {
    html = html.replace('</head>', `<style>${css}</style></head>`);
  }
  return html;
}

export function compile(name: string, data: any) {
  const src = loadTemplate(name);
  const tpl = Handlebars.compile(src);
  return tpl(data);
}
