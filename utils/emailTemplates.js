import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Template System for [RE]Print Studios
 * Handles template rendering with Handlebars
 */

// Cache compiled templates
const templateCache = new Map();

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

Handlebars.registerHelper('formatCurrency', (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${parseFloat(amount).toFixed(2)}`;
});

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
Handlebars.registerHelper('lt', (a, b) => a < b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('lte', (a, b) => a <= b);
Handlebars.registerHelper('gte', (a, b) => a >= b);

/**
 * Load and compile template
 */
async function loadTemplate(templateName) {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  try {
    // Load template file
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Compile template
    const compiled = Handlebars.compile(templateContent);
    
    // Cache compiled template
    templateCache.set(templateName, compiled);
    
    return compiled;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

/**
 * Load base template
 */
async function loadBaseTemplate() {
  return loadTemplate('base');
}

/**
 * Render email template with data
 */
export async function renderEmailTemplate(templateName, data) {
  try {
    // Load base template
    const baseTemplate = await loadBaseTemplate();
    
    // Load specific template content
    const contentTemplate = await loadTemplate(templateName);
    
    // Render content
    const renderedContent = contentTemplate(data);
    
    // Prepare base template data
    const baseData = {
      ...data,
      content: renderedContent,
      unsubscribeUrl: data.unsubscribeToken ? 
        `${process.env.BASE_URL || 'http://localhost:3000'}/unsubscribe/${data.unsubscribeToken}` : 
        null
    };
    
    // Render full email
    return baseTemplate(baseData);
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Render inline template (for dynamic content)
 */
export function renderInlineTemplate(templateString, data) {
  const template = Handlebars.compile(templateString);
  return template(data);
}

/**
 * Email template definitions
 */
export const EMAIL_TEMPLATES = {
  // Phase notification templates
  PHASE_APPROVAL_NEEDED: {
    name: 'phase-approval-needed',
    subject: 'Action Required: {{projectName}} - {{phaseName}} Ready for Review'
  },
  
  PHASE_APPROVED: {
    name: 'phase-approved',
    subject: 'Phase Approved: {{projectName}} - {{phaseName}}'
  },
  
  PHASE_CHANGES_REQUESTED: {
    name: 'phase-changes-requested',
    subject: 'Changes Requested: {{projectName}} - {{phaseName}}'
  },
  
  PHASE_COMPLETED: {
    name: 'phase-completed',
    subject: 'Phase Completed: {{projectName}} - {{phaseName}}'
  },
  
  // Project notification templates
  PROJECT_WELCOME: {
    name: 'project-welcome',
    subject: 'Welcome to Your Project: {{projectName}}'
  },
  
  PROJECT_COMPLETED: {
    name: 'project-completed',
    subject: 'Project Completed: {{projectName}}'
  },
  
  PROJECT_DEADLINE_REMINDER: {
    name: 'project-deadline-reminder',
    subject: 'Deadline Reminder: {{projectName}} - {{daysUntil}} days remaining'
  },
  
  PROJECT_WEEKLY_SUMMARY: {
    name: 'project-weekly-summary',
    subject: 'Weekly Project Summary - {{weekOf}}'
  },
  
  // File notification templates
  FILE_UPLOADED: {
    name: 'file-uploaded',
    subject: 'New File Uploaded: {{fileName}} - {{projectName}}'
  },
  
  // Invoice notification templates
  INVOICE_SENT: {
    name: 'invoice-sent',
    subject: 'Invoice {{invoiceNumber}} from [RE]Print Studios'
  },
  
  INVOICE_REMINDER: {
    name: 'invoice-reminder',
    subject: 'Reminder: Invoice {{invoiceNumber}} due in {{daysUntilDue}} days'
  },
  
  INVOICE_OVERDUE: {
    name: 'invoice-overdue',
    subject: 'Overdue Invoice Reminder - {{invoiceNumber}}'
  },
  
  PAYMENT_RECEIVED: {
    name: 'payment-received',
    subject: 'Payment Confirmation - Invoice {{invoiceNumber}}'
  },
  
  // System notification templates
  PASSWORD_RESET: {
    name: 'password-reset',
    subject: 'Password Reset Request - [RE]Print Studios'
  },
  
  ACCOUNT_ACTIVATED: {
    name: 'account-activated',
    subject: 'Account Activated - Welcome to [RE]Print Studios'
  },
  
  SECURITY_ALERT: {
    name: 'security-alert',
    subject: 'Security Alert: New login from {{location}}'
  }
};

/**
 * Get template subject with variables replaced
 */
export function getTemplateSubject(template, data) {
  return renderInlineTemplate(template.subject, data);
}

/**
 * Clear template cache
 */
export function clearTemplateCache() {
  templateCache.clear();
}

/**
 * Preload all templates
 */
export async function preloadTemplates() {
  const templates = Object.values(EMAIL_TEMPLATES);
  
  console.log('Preloading email templates...');
  
  for (const template of templates) {
    try {
      await loadTemplate(template.name);
      console.log(`Loaded template: ${template.name}`);
    } catch (error) {
      console.error(`Failed to load template ${template.name}:`, error);
    }
  }
  
  console.log('Email templates preloaded');
}

export default {
  renderEmailTemplate,
  renderInlineTemplate,
  EMAIL_TEMPLATES,
  getTemplateSubject,
  clearTemplateCache,
  preloadTemplates
};