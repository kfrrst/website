
import puppeteer from 'puppeteer';
export async function renderPdf(html) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil:'networkidle0' });
  const pdf = await page.pdf({ format:'A4', printBackground:true, margin:{top:'20mm',bottom:'20mm',left:'16mm',right:'16mm'} });
  await browser.close();
  return pdf;
}
