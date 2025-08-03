import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
import { EMAIL_HANDLES, EMAIL_SENDER_NAMES, MAILJET_CONFIG, EMAIL_TEMPLATES } from '../config/email.js';

dotenv.config();

/**
 * Email Service for [RE]Print Studios
 * Handles sending emails using Mailjet
 */

// Create transporter based on environment configuration
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'mailjet' || MAILJET_CONFIG.API_KEY) {
    // Use Mailjet SMTP
    return createTransport({
      host: 'in-v3.mailjet.com',
      port: 587,
      secure: false,
      auth: {
        user: MAILJET_CONFIG.API_KEY,
        pass: MAILJET_CONFIG.API_SECRET
      },
      // Mailjet specific settings
      tls: {
        rejectUnauthorized: false
      }
    });
  } else if (process.env.EMAIL_SERVICE === 'gmail') {
    return createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use app-specific password for Gmail
      }
    });
  } else if (process.env.SMTP_HOST) {
    return createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Fallback to console logging in development
    return createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
};

const transporter = createTransporter();

/**
 * Send invoice to client
 */
export const sendInvoiceEmail = async (invoice, client, pdfBuffer = null) => {
  const subject = `Invoice ${invoice.invoice_number} from [RE]Print Studios`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .invoice-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
                display: inline-block; 
                padding: 10px 20px; 
                background-color: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Invoice from [RE]Print Studios</h1>
        </div>
        
        <div class="content">
            <p>Hello ${client.first_name},</p>
            
            <p>I hope this email finds you well. Please find attached your invoice for the recent work completed.</p>
            
            <div class="invoice-details">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Invoice Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                <p><strong>Project:</strong> ${invoice.title}</p>
                <p class="amount"><strong>Amount Due:</strong> $${parseFloat(invoice.total_amount).toFixed(2)}</p>
            </div>
            
            ${invoice.description ? `<p><strong>Description:</strong><br>${invoice.description}</p>` : ''}
            
            <p>You can pay this invoice online by clicking the button below:</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}" class="button">
                View & Pay Invoice
            </a>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact me.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team<br>
            [RE]Print Studios<br>
            hello@reprintstudios.com</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from [RE]Print Studios Client Portal.</p>
        </div>
    </body>
    </html>
  `;
  
  const textContent = `
    Invoice from [RE]Print Studios
    
    Hello ${client.first_name},
    
    Please find your invoice details below:
    
    Invoice Number: ${invoice.invoice_number}
    Invoice Date: ${new Date(invoice.issue_date).toLocaleDateString()}
    Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
    Project: ${invoice.title}
    Amount Due: $${parseFloat(invoice.total_amount).toFixed(2)}
    
    ${invoice.description ? `Description: ${invoice.description}` : ''}
    
    You can view and pay this invoice online at:
    ${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}
    
    If you have any questions, please contact me at hello@reprintstudios.com
    
    Thank you for your business!
    
    Best regards,
    The [RE]Print Studios Team
    [RE]Print Studios
  `;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'hello@reprintstudios.com',
    to: client.email,
    subject: subject,
    text: textContent,
    html: htmlContent
  };
  
  // Attach PDF if provided
  if (pdfBuffer) {
    mailOptions.attachments = [{
      filename: `Invoice-${invoice.invoice_number}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];
  }
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
};

/**
 * Send payment confirmation email
 */
export const sendPaymentConfirmationEmail = async (invoice, client) => {
  const subject = `Payment Confirmation - Invoice ${invoice.invoice_number}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #28a745; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; }
            .payment-details { background-color: #d4edda; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Payment Received - Thank You!</h1>
        </div>
        
        <div class="content">
            <p>Hello ${client.first_name},</p>
            
            <p>Thank you! Your payment has been successfully received and processed.</p>
            
            <div class="payment-details">
                <h3>Payment Confirmation</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Payment Date:</strong> ${new Date(invoice.paid_date).toLocaleDateString()}</p>
                <p><strong>Project:</strong> ${invoice.title}</p>
                <p class="amount"><strong>Amount Paid:</strong> $${parseFloat(invoice.total_amount).toFixed(2)}</p>
                ${invoice.payment_reference ? `<p><strong>Payment Reference:</strong> ${invoice.payment_reference}</p>` : ''}
            </div>
            
            <p>This invoice has been marked as paid in our system. You can view your payment history in the client portal.</p>
            
            <p>Thank you for your business and prompt payment!</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team<br>
            [RE]Print Studios<br>
            hello@reprintstudios.com</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from [RE]Print Studios Client Portal.</p>
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'hello@reprintstudios.com',
    to: client.email,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
};

/**
 * Send overdue invoice reminder
 */
/**
 * Send phase notification emails
 */
export const sendPhaseNotificationEmail = async (type, data) => {
  let subject, htmlContent;
  
  switch (type) {
    case 'phase_advanced':
      subject = `Project Update: ${data.projectName} - New Phase`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #0057FF; padding: 20px; text-align: center; color: white; }
                .content { padding: 20px; }
                .phase-info { background-color: #f0f7ff; padding: 15px; margin: 20px 0; border-left: 4px solid #0057FF; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .button { 
                    display: inline-block; 
                    padding: 10px 20px; 
                    background-color: #0057FF; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Project Phase Update</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>Great news! Your project "${data.projectName}" has progressed to the next phase.</p>
                
                <div class="phase-info">
                    <h3>${data.phaseIcon} ${data.newPhaseName}</h3>
                    <p>Your project is now in the ${data.newPhaseName} phase.</p>
                </div>
                
                <p>Please log in to your client portal to view the updated project status and any required actions.</p>
                
                <a href="${data.portalLink}" class="button">View Project Status</a>
                
                <p>Thank you for your continued collaboration!</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team<br>
                [RE]Print Studios<br>
                hello@reprintstudios.com</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from [RE]Print Studios Client Portal.</p>
            </div>
        </body>
        </html>
      `;
      break;
      
    case 'stuck_project':
      subject = `Action Required: ${data.projectName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #F7C600; padding: 20px; text-align: center; color: #333; }
                .content { padding: 20px; }
                .alert-info { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #F7C600; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .button { 
                    display: inline-block; 
                    padding: 10px 20px; 
                    background-color: #F7C600; 
                    color: #333; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Project Update Needed</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>We wanted to check in regarding your project "${data.projectName}".</p>
                
                <div class="alert-info">
                    <h3>Current Status</h3>
                    <p>Your project has been in the <strong>${data.phaseName}</strong> phase for ${data.daysInPhase} days.</p>
                    <p>There may be pending actions or updates needed to move forward.</p>
                </div>
                
                <p>Please log in to your client portal to review the project status and complete any required actions.</p>
                
                <a href="${data.portalLink}" class="button">Check Project Status</a>
                
                <p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team<br>
                [RE]Print Studios<br>
                hello@reprintstudios.com</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from [RE]Print Studios Client Portal.</p>
            </div>
        </body>
        </html>
      `;
      break;
      
    case 'action_reminder':
      subject = `Reminder: ${data.pendingActions} Pending Action(s) - ${data.projectName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #0057FF; padding: 20px; text-align: center; color: white; }
                .content { padding: 20px; }
                .action-info { background-color: #e3f2ff; padding: 15px; margin: 20px 0; border-left: 4px solid #0057FF; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .button { 
                    display: inline-block; 
                    padding: 10px 20px; 
                    background-color: #0057FF; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Action Required</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>This is a friendly reminder about your project "${data.projectName}".</p>
                
                <div class="action-info">
                    <h3>Pending Actions</h3>
                    <p>You have <strong>${data.pendingActions} pending action(s)</strong> in the ${data.phaseName} phase.</p>
                    <p>Completing these actions will help move your project forward.</p>
                </div>
                
                <p>Please log in to your client portal to view and complete the required actions.</p>
                
                <a href="${data.portalLink}" class="button">Complete Actions</a>
                
                <p>Thank you for your prompt attention to this matter.</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team<br>
                [RE]Print Studios<br>
                hello@reprintstudios.com</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from [RE]Print Studios Client Portal.</p>
            </div>
        </body>
        </html>
      `;
      break;
      
    default:
      throw new Error(`Unknown phase notification type: ${type}`);
  }
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'hello@reprintstudios.com',
    to: data.to,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Phase notification email sent (${type}):`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending phase notification email (${type}):`, error);
    throw error;
  }
};

export const sendOverdueReminderEmail = async (invoice, client) => {
  const daysOverdue = Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
  const subject = `Overdue Invoice Reminder - ${invoice.invoice_number}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #dc3545; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; }
            .overdue-notice { background-color: #f8d7da; padding: 15px; margin: 20px 0; border-left: 4px solid #dc3545; }
            .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
                display: inline-block; 
                padding: 10px 20px; 
                background-color: #dc3545; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Overdue Invoice Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hello ${client.first_name},</p>
            
            <p>This is a friendly reminder that the following invoice is now overdue:</p>
            
            <div class="overdue-notice">
                <h3>Overdue Invoice</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Original Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
                <p><strong>Project:</strong> ${invoice.title}</p>
                <p class="amount"><strong>Amount Due:</strong> $${parseFloat(invoice.total_amount).toFixed(2)}</p>
            </div>
            
            <p>Please arrange payment at your earliest convenience. You can pay online using the link below:</p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}" class="button">
                Pay Now
            </a>
            
            <p>If you have any questions or concerns about this invoice, please contact me immediately.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team<br>
            [RE]Print Studios<br>
            hello@reprintstudios.com</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from [RE]Print Studios Client Portal.</p>
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'hello@reprintstudios.com',
    to: client.email,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Overdue reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending overdue reminder email:', error);
    throw error;
  }
};