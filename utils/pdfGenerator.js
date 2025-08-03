import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PDF Generator for Invoices
 * Creates professional PDF invoices using PDFKit
 */

export const generateInvoicePDF = async (invoice, lineItems, client) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20)
         .text('INVOICE', 50, 50, { align: 'right' })
         .fontSize(10)
         .text(`Invoice #: ${invoice.invoice_number}`, 50, 80, { align: 'right' })
         .text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 50, 95, { align: 'right' })
         .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 50, 110, { align: 'right' });
      
      // Company information (left side)
      doc.fontSize(16)
         .text('[RE]Print Studios', 50, 50)
         .fontSize(10)
         .text('hello@reprintstudios.com', 50, 75)
         .text('Empowering Creative Journeys', 50, 90);
      
      // Client information
      doc.fontSize(12)
         .text('Bill To:', 50, 150)
         .fontSize(10)
         .text(`${client.first_name} ${client.last_name}`, 50, 170)
         .text(client.company_name || '', 50, 185)
         .text(client.email, 50, 200);
      
      // Invoice title and description
      if (invoice.title) {
        doc.fontSize(14)
           .text(invoice.title, 50, 240)
           .fontSize(10);
      }
      
      if (invoice.description) {
        doc.text(invoice.description, 50, 260, { width: 500 });
      }
      
      // Line items table
      const tableTop = 320;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const rateX = 400;
      const amountX = 480;
      
      // Table headers
      doc.fontSize(10)
         .text('Description', descriptionX, tableTop)
         .text('Qty', quantityX, tableTop, { width: 40, align: 'right' })
         .text('Rate', rateX, tableTop, { width: 60, align: 'right' })
         .text('Amount', amountX, tableTop, { width: 60, align: 'right' });
      
      // Draw header line
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();
      
      let yPosition = tableTop + 25;
      
      // Line items
      lineItems.forEach((item) => {
        doc.text(item.description, descriptionX, yPosition, { width: 180 })
           .text(item.quantity.toString(), quantityX, yPosition, { width: 40, align: 'right' })
           .text(`$${parseFloat(item.unit_price).toFixed(2)}`, rateX, yPosition, { width: 60, align: 'right' })
           .text(`$${parseFloat(item.line_total).toFixed(2)}`, amountX, yPosition, { width: 60, align: 'right' });
        
        yPosition += 20;
      });
      
      // Draw line above totals
      yPosition += 10;
      doc.moveTo(350, yPosition)
         .lineTo(550, yPosition)
         .stroke();
      
      // Totals
      yPosition += 15;
      doc.text('Subtotal:', 400, yPosition, { width: 60, align: 'right' })
         .text(`$${parseFloat(invoice.subtotal).toFixed(2)}`, amountX, yPosition, { width: 60, align: 'right' });
      
      if (invoice.tax_amount > 0) {
        yPosition += 15;
        const taxRate = (invoice.tax_rate * 100).toFixed(2);
        doc.text(`Tax (${taxRate}%):`, 400, yPosition, { width: 60, align: 'right' })
           .text(`$${parseFloat(invoice.tax_amount).toFixed(2)}`, amountX, yPosition, { width: 60, align: 'right' });
      }
      
      if (invoice.discount_amount > 0) {
        yPosition += 15;
        doc.text('Discount:', 400, yPosition, { width: 60, align: 'right' })
           .text(`-$${parseFloat(invoice.discount_amount).toFixed(2)}`, amountX, yPosition, { width: 60, align: 'right' });
      }
      
      // Total
      yPosition += 15;
      doc.fontSize(12)
         .text('Total:', 400, yPosition, { width: 60, align: 'right' })
         .text(`$${parseFloat(invoice.total_amount).toFixed(2)}`, amountX, yPosition, { width: 60, align: 'right' });
      
      // Payment information
      if (invoice.status === 'paid') {
        yPosition += 30;
        doc.fontSize(10)
           .fillColor('green')
           .text('PAID', 400, yPosition, { width: 100, align: 'center' })
           .fillColor('black');
        
        if (invoice.paid_date) {
          yPosition += 15;
          doc.text(`Paid on: ${new Date(invoice.paid_date).toLocaleDateString()}`, 400, yPosition, { width: 100, align: 'center' });
        }
      }
      
      // Terms and notes
      if (invoice.terms) {
        yPosition += 40;
        doc.fontSize(10)
           .text('Terms & Conditions:', 50, yPosition)
           .text(invoice.terms, 50, yPosition + 15, { width: 500 });
      }
      
      if (invoice.notes) {
        yPosition += (invoice.terms ? 60 : 40);
        doc.fontSize(10)
           .text('Notes:', 50, yPosition)
           .text(invoice.notes, 50, yPosition + 15, { width: 500 });
      }
      
      // Footer
      doc.fontSize(8)
         .text('Thank you for your business!', 50, doc.page.height - 50, { 
           align: 'center',
           width: doc.page.width - 100
         });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};