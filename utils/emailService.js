import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
import { EMAIL_HANDLES, EMAIL_SENDER_NAMES, MAILJET_CONFIG, EMAIL_TEMPLATES } from '../config/email.js';
import { query as dbQuery } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { renderEmailTemplate, getTemplateSubject, EMAIL_TEMPLATES as TEMPLATE_DEFINITIONS } from './emailTemplates.js';

dotenv.config();

/**
 * Email Service for [RE]Print Studios
 * Production-ready email service with queue system and retry logic
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.queue = [];
    this.processing = false;
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter based on environment
   */
  initializeTransporter() {
    if (process.env.EMAIL_SERVICE === 'mailjet' || MAILJET_CONFIG.API_KEY) {
      // Use Mailjet SMTP
      this.transporter = createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: {
          user: MAILJET_CONFIG.API_KEY,
          pass: MAILJET_CONFIG.API_SECRET
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10, // 10 messages per second
        tls: {
          rejectUnauthorized: false
        }
      });
    } else if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else if (process.env.SMTP_HOST) {
      this.transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // Development fallback
      this.transporter = createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter verification failed:', error);
      } else {
        console.log('Email service ready');
      }
    });
  }

  /**
   * Add email to queue with retry logic
   */
  async queueEmail(emailData) {
    const emailId = uuidv4();
    
    try {
      // Check user preferences if userId provided
      if (emailData.userId) {
        const preferences = await this.getUserPreferences(emailData.userId);
        if (!this.shouldSendEmail(emailData.type, preferences)) {
          console.log(`Email skipped due to user preferences: ${emailData.type}`);
          return null;
        }
      }

      // Log to database
      await dbQuery(
        `INSERT INTO email_log (id, to_email, from_email, subject, template_name, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          emailId,
          emailData.to,
          emailData.from || EMAIL_HANDLES.SYSTEM,
          emailData.subject,
          emailData.template || 'custom',
          'queued',
          JSON.stringify(emailData.metadata || {})
        ]
      );

      // Add to queue
      this.queue.push({
        id: emailId,
        data: emailData,
        attempts: 0,
        maxAttempts: 3
      });

      // Process queue if not already processing
      if (!this.processing) {
        this.processQueue();
      }

      return emailId;
    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  /**
   * Process email queue with exponential backoff
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const emailJob = this.queue.shift();
      
      try {
        await this.sendEmailJob(emailJob);
        
        // Update status to sent
        await dbQuery(
          `UPDATE email_log SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [emailJob.id]
        );
      } catch (error) {
        emailJob.attempts++;
        
        if (emailJob.attempts < emailJob.maxAttempts) {
          // Exponential backoff retry
          const delay = Math.pow(2, emailJob.attempts) * 1000;
          setTimeout(() => {
            this.queue.push(emailJob);
            if (!this.processing) this.processQueue();
          }, delay);
        } else {
          // Max attempts reached
          await dbQuery(
            `UPDATE email_log 
             SET status = 'failed', 
                 error_message = $2
             WHERE id = $1`,
            [emailJob.id, error.message]
          );
        }
      }
    }

    this.processing = false;
  }

  /**
   * Send individual email job
   */
  async sendEmailJob(emailJob) {
    const { data } = emailJob;
    const sender = data.from || MAILJET_CONFIG.getDefaultSender(data.context || 'default');
    
    const mailOptions = {
      from: `"${sender.Name}" <${sender.Email}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text || this.htmlToText(data.html),
      headers: {
        'X-Email-Id': emailJob.id,
        'X-Template': data.template || 'custom'
      }
    };

    if (data.attachments) {
      mailOptions.attachments = data.attachments;
    }

    const info = await this.transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  }

  /**
   * Get user email preferences
   */
  async getUserPreferences(userId) {
    const result = await dbQuery(
      `SELECT * FROM user_email_preferences WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || {
      phase_notifications: true,
      project_notifications: true,
      file_notifications: true,
      marketing_emails: false,
      weekly_summary: true
    };
  }

  /**
   * Check if email should be sent based on preferences
   */
  shouldSendEmail(type, preferences) {
    if (!preferences) return true;
    
    const typeMap = {
      'phase_update': 'phase_notifications',
      'phase_approval': 'phase_notifications',
      'project_update': 'project_notifications',
      'file_upload': 'file_notifications',
      'weekly_summary': 'weekly_summary',
      'marketing': 'marketing_emails'
    };

    const prefKey = typeMap[type];
    return prefKey ? preferences[prefKey] !== false : true;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate unsubscribe token
   */
  async generateUnsubscribeToken(userId) {
    const token = uuidv4();
    
    await dbQuery(
      `INSERT INTO unsubscribe_tokens (token, user_id) VALUES ($1, $2)
       ON CONFLICT (token) DO NOTHING`,
      [token, userId]
    );
    
    return token;
  }

  /**
   * Get email statistics
   */
  async getStatistics(filters = {}) {
    const { startDate, endDate, template } = filters;
    
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued
      FROM email_log
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND created_at <= $${params.length}`;
    }
    
    if (template) {
      params.push(template);
      query += ` AND template_name = $${params.length}`;
    }
    
    const result = await dbQuery(query, params);
    return result.rows[0];
  }
}

// Create singleton instance
const emailService = new EmailService();

// Keep existing transporter for backward compatibility
const transporter = emailService.transporter;

/**
 * Send invoice to client
 */
export const sendInvoiceEmail = async (invoice, client, pdfBuffer = null) => {
  const subject = `Invoice ${invoice.invoice_number} from [RE]Print Studios`;
  const sender = MAILJET_CONFIG.getDefaultSender('billing');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
            .header { background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
            .invoice-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.PRIMARY}; }
            .amount { font-size: 24px; font-weight: bold; color: ${EMAIL_TEMPLATES.COLORS.SUCCESS}; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
                font-weight: 600;
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
            <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}" class="button">
                    View & Pay Invoice
                </a>
            </center>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact our billing team at <a href="mailto:${EMAIL_HANDLES.BILLING}">${EMAIL_HANDLES.BILLING}</a>.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team</p>
            
            ${EMAIL_TEMPLATES.FOOTER}
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
    
    If you have any questions, please contact our billing team at ${EMAIL_HANDLES.BILLING}
    
    Thank you for your business!
    
    Best regards,
    The [RE]Print Studios Team
  `;
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
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
  const sender = MAILJET_CONFIG.getDefaultSender('billing');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
            .header { background-color: ${EMAIL_TEMPLATES.COLORS.SUCCESS}; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
            .payment-details { background-color: #d4edda; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.SUCCESS}; }
            .amount { font-size: 24px; font-weight: bold; color: ${EMAIL_TEMPLATES.COLORS.SUCCESS}; }
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
            The [RE]Print Studios Team</p>
            
            ${EMAIL_TEMPLATES.FOOTER}
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
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
 * Send phase notification emails
 */
export const sendPhaseNotificationEmail = async (type, data) => {
  let subject, htmlContent;
  const sender = MAILJET_CONFIG.getDefaultSender('project');
  
  switch (type) {
    case 'phase_advanced':
      subject = `Project Update: ${data.projectName} - New Phase`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
                .header { background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; padding: 20px; text-align: center; color: white; }
                .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
                .phase-info { background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.PRIMARY}; }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                    font-weight: 600;
                }
                .action-required { background-color: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.SECONDARY}; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Project Phase Update</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>Great news! Your project "${data.projectName}" has advanced to a new phase.</p>
                
                <div class="phase-info">
                    <h3>Current Phase: ${data.newPhaseName}</h3>
                    <p>${data.phaseDescription || 'Your project is progressing smoothly.'}</p>
                </div>
                
                ${data.requiredActions && data.requiredActions.length > 0 ? `
                    <div class="action-required">
                        <h4>⚡ Action Required</h4>
                        <p>This phase requires your input:</p>
                        <ul>
                            ${data.requiredActions.map(action => `<li>${action}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal#projects" class="button">
                        View Project Status
                    </a>
                </center>
                
                <p>If you have any questions, please contact our project team at <a href="mailto:${EMAIL_HANDLES.PROJECTS}">${EMAIL_HANDLES.PROJECTS}</a>.</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team</p>
                
                ${EMAIL_TEMPLATES.FOOTER}
            </div>
        </body>
        </html>
      `;
      break;
      
    case 'stuck_project':
      subject = `Action Required: ${data.projectName} needs your attention`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
                .header { background-color: ${EMAIL_TEMPLATES.COLORS.SECONDARY}; padding: 20px; text-align: center; color: #333; }
                .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
                .alert-box { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.SECONDARY}; }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚡ Action Required</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>Your project "${data.projectName}" has been in the ${data.phaseName} phase for ${data.daysInPhase} days and may need your attention.</p>
                
                <div class="alert-box">
                    <h3>Why am I seeing this?</h3>
                    <p>This phase typically requires client input or approval to proceed. Please check if there are any pending actions or decisions needed from your side.</p>
                </div>
                
                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal#projects" class="button">
                        Check Project Status
                    </a>
                </center>
                
                <p>If you need assistance or have questions, please contact our project team at <a href="mailto:${EMAIL_HANDLES.PROJECTS}">${EMAIL_HANDLES.PROJECTS}</a>.</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team</p>
                
                ${EMAIL_TEMPLATES.FOOTER}
            </div>
        </body>
        </html>
      `;
      break;
      
    case 'overdue_actions':
      subject = `Reminder: Pending actions for ${data.projectName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
                .header { background-color: ${EMAIL_TEMPLATES.COLORS.SECONDARY}; padding: 20px; text-align: center; color: #333; }
                .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
                .action-list { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
                .button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 10px 0;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Pending Actions Reminder</h1>
            </div>
            
            <div class="content">
                <p>Hello ${data.clientName},</p>
                
                <p>This is a friendly reminder that your project "${data.projectName}" has ${data.pendingActions} pending action(s) in the ${data.phaseName} phase.</p>
                
                <div class="action-list">
                    <h3>Next Steps</h3>
                    <p>Please log in to the client portal to review and complete the required actions. This will help keep your project moving forward smoothly.</p>
                </div>
                
                <center>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal#projects" class="button">
                        Complete Actions
                    </a>
                </center>
                
                <p>If you need assistance, please contact our project team at <a href="mailto:${EMAIL_HANDLES.PROJECTS}">${EMAIL_HANDLES.PROJECTS}</a>.</p>
                
                <p>Best regards,<br>
                The [RE]Print Studios Team</p>
                
                ${EMAIL_TEMPLATES.FOOTER}
            </div>
        </body>
        </html>
      `;
      break;
      
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
    to: data.to,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Phase notification email (${type}) sent:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending phase notification email (${type}):`, error);
    throw error;
  }
};

/**
 * Send inquiry confirmation email
 */
export const sendInquiryConfirmationEmail = async (inquiryData) => {
  const subject = 'Thank you for your inquiry - [RE]Print Studios';
  const sender = MAILJET_CONFIG.getDefaultSender('default');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
            .header { background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
            .inquiry-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Thank You for Your Inquiry</h1>
        </div>
        
        <div class="content">
            <p>Hello ${inquiryData.name},</p>
            
            <p>Thank you for reaching out to [RE]Print Studios! We've received your inquiry and are excited about the possibility of working together.</p>
            
            <div class="inquiry-details">
                <h3>Your Inquiry Details</h3>
                <p><strong>Project Type:</strong> ${inquiryData.projectType}</p>
                <p><strong>Budget Range:</strong> ${inquiryData.budget}</p>
                <p><strong>Timeline:</strong> ${inquiryData.timeline}</p>
                <p><strong>Message:</strong><br>${inquiryData.message}</p>
            </div>
            
            <p>We'll review your inquiry and get back to you within 24-48 hours with next steps.</p>
            
            <p>In the meantime, if you have any urgent questions, feel free to reach out to us at <a href="mailto:${EMAIL_HANDLES.MAIN}">${EMAIL_HANDLES.MAIN}</a>.</p>
            
            <p>We look forward to empowering your creative journey!</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team</p>
            
            ${EMAIL_TEMPLATES.FOOTER}
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
    to: inquiryData.email,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Inquiry confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending inquiry confirmation email:', error);
    throw error;
  }
};

/**
 * Send overdue invoice reminder
 */
export const sendOverdueReminderEmail = async (invoice, client) => {
  const daysOverdue = Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
  const subject = `Overdue Invoice Reminder - ${invoice.invoice_number}`;
  const sender = MAILJET_CONFIG.getDefaultSender('billing');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
            .header { background-color: ${EMAIL_TEMPLATES.COLORS.ERROR}; padding: 20px; text-align: center; color: white; }
            .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
            .overdue-notice { background-color: #f8d7da; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.ERROR}; }
            .amount { font-size: 24px; font-weight: bold; color: ${EMAIL_TEMPLATES.COLORS.ERROR}; }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: ${EMAIL_TEMPLATES.COLORS.ERROR}; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Overdue Invoice Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hello ${client.first_name},</p>
            
            <p>This is a friendly reminder that the following invoice is now ${daysOverdue} days overdue:</p>
            
            <div class="overdue-notice">
                <h3>Overdue Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Original Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                <p><strong>Project:</strong> ${invoice.title}</p>
                <p class="amount"><strong>Amount Overdue:</strong> $${parseFloat(invoice.total_amount).toFixed(2)}</p>
            </div>
            
            <p>Please pay this invoice as soon as possible to avoid any service interruptions.</p>
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}" class="button">
                    Pay Now
                </a>
            </center>
            
            <p>If you've already paid this invoice or have any questions, please contact our billing team immediately at <a href="mailto:${EMAIL_HANDLES.BILLING}">${EMAIL_HANDLES.BILLING}</a>.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team</p>
            
            ${EMAIL_TEMPLATES.FOOTER}
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
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

/**
 * Send invoice reminder email (before due date)
 */
export const sendInvoiceReminder = async (invoice, client) => {
  const daysUntilDue = Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24));
  const subject = `Reminder: Invoice ${invoice.invoice_number} due in ${daysUntilDue} days`;
  const sender = MAILJET_CONFIG.getDefaultSender('billing');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: ${EMAIL_TEMPLATES.COLORS.BACKGROUND}; }
            .header { background-color: ${EMAIL_TEMPLATES.COLORS.SECONDARY}; padding: 20px; text-align: center; color: #333; }
            .content { padding: 20px; background: white; max-width: 600px; margin: 0 auto; }
            .reminder-box { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid ${EMAIL_TEMPLATES.COLORS.SECONDARY}; }
            .amount { font-size: 24px; font-weight: bold; color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; }
            .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: ${EMAIL_TEMPLATES.COLORS.PRIMARY}; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Invoice Reminder</h1>
        </div>
        
        <div class="content">
            <p>Hello ${client.first_name},</p>
            
            <p>This is a friendly reminder that the following invoice will be due in ${daysUntilDue} days:</p>
            
            <div class="reminder-box">
                <h3>Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
                <p><strong>Project:</strong> ${invoice.title}</p>
                <p class="amount"><strong>Amount Due:</strong> $${parseFloat(invoice.total_amount).toFixed(2)}</p>
            </div>
            
            <p>You can pay this invoice online at your convenience:</p>
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/invoices/${invoice.id}" class="button">
                    View & Pay Invoice
                </a>
            </center>
            
            <p>If you have any questions about this invoice, please contact our billing team at <a href="mailto:${EMAIL_HANDLES.BILLING}">${EMAIL_HANDLES.BILLING}</a>.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            The [RE]Print Studios Team</p>
            
            ${EMAIL_TEMPLATES.FOOTER}
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `${sender.Name} <${sender.Email}>`,
    to: client.email,
    subject: subject,
    html: htmlContent
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending invoice reminder email:', error);
    throw error;
  }
};

/**
 * Send template-based email with queue system
 */
export const sendTemplateEmail = async (templateDef, data) => {
  try {
    // Generate unsubscribe token if user ID provided
    const unsubscribeToken = data.userId ? await emailService.generateUnsubscribeToken(data.userId) : null;
    
    // Add unsubscribe token to data
    const emailData = {
      ...data,
      unsubscribeToken
    };
    
    // Get subject with variables replaced
    const subject = getTemplateSubject(templateDef, emailData);
    
    // Render HTML using template system
    const html = await renderEmailTemplate(templateDef.name, emailData);
    
    return await emailService.queueEmail({
      to: data.to,
      subject,
      html,
      template: templateDef.name,
      userId: data.userId,
      type: data.type || templateDef.name,
      context: data.context,
      unsubscribeToken,
      metadata: data.metadata
    });
  } catch (error) {
    console.error('Error sending template email:', error);
    throw error;
  }
};

/**
 * Get email statistics
 */
export const getEmailStatistics = async (filters = {}) => {
  return await emailService.getStatistics(filters);
};

/**
 * Handle email bounce webhook
 */
export const handleEmailBounce = async (emailId, bounceData) => {
  await dbQuery(
    `UPDATE email_log 
     SET status = 'bounced', 
         metadata = metadata || $2
     WHERE id = $1`,
    [emailId, JSON.stringify(bounceData)]
  );
};

/**
 * Handle email complaint webhook
 */
export const handleEmailComplaint = async (emailId, complaintData) => {
  await dbQuery(
    `UPDATE email_log 
     SET status = 'complained', 
         metadata = metadata || $2
     WHERE id = $1`,
    [emailId, JSON.stringify(complaintData)]
  );
  
  // Add to suppression list if needed
  if (complaintData.email) {
    // Implementation depends on suppression strategy
  }
};

// Export all functions and the service instance
export default {
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendPhaseNotificationEmail,
  sendInquiryConfirmationEmail,
  sendOverdueReminderEmail,
  sendInvoiceReminder,
  sendTemplateEmail,
  getEmailStatistics,
  handleEmailBounce,
  handleEmailComplaint,
  emailService
};