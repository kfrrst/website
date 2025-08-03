import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Configuration for [RE]Print Studios
 * Using Mailjet as the email service provider
 */

// Email handles for different purposes
export const EMAIL_HANDLES = {
  // Main contact email
  MAIN: 'hello@reprintstudios.com',
  
  // Automated system emails (no-reply)
  SYSTEM: 'system@reprintstudios.com',
  NOREPLY: 'noreply@reprintstudios.com',
  
  // Department-specific emails
  SUPPORT: 'support@reprintstudios.com',
  BILLING: 'billing@reprintstudios.com',
  PROJECTS: 'projects@reprintstudios.com',
  
  // Personal email
  KENDRICK: 'kendrick@reprintstudios.com',
  
  // Notification categories
  NOTIFICATIONS: {
    INVOICE: 'billing@reprintstudios.com',
    PROJECT_UPDATE: 'projects@reprintstudios.com',
    PHASE_UPDATE: 'projects@reprintstudios.com',
    INQUIRY: 'hello@reprintstudios.com',
    SUPPORT_TICKET: 'support@reprintstudios.com',
    SYSTEM_ALERT: 'system@reprintstudios.com'
  }
};

// Email sender names for different contexts
export const EMAIL_SENDER_NAMES = {
  DEFAULT: '[RE]Print Studios',
  BILLING: '[RE]Print Studios Billing',
  SUPPORT: '[RE]Print Studios Support',
  PROJECTS: '[RE]Print Studios Projects',
  SYSTEM: '[RE]Print Studios System'
};

// Mailjet configuration
export const MAILJET_CONFIG = {
  API_KEY: process.env.MAILJET_API_KEY || '',
  API_SECRET: process.env.MAILJET_API_SECRET || '',
  VERSION: 'v3.1',
  
  // Default sender based on context
  getDefaultSender: (context = 'default') => {
    switch (context) {
      case 'invoice':
      case 'billing':
        return {
          Email: EMAIL_HANDLES.BILLING,
          Name: EMAIL_SENDER_NAMES.BILLING
        };
      case 'support':
        return {
          Email: EMAIL_HANDLES.SUPPORT,
          Name: EMAIL_SENDER_NAMES.SUPPORT
        };
      case 'project':
      case 'phase':
        return {
          Email: EMAIL_HANDLES.PROJECTS,
          Name: EMAIL_SENDER_NAMES.PROJECTS
        };
      case 'system':
      case 'automation':
        return {
          Email: EMAIL_HANDLES.SYSTEM,
          Name: EMAIL_SENDER_NAMES.SYSTEM
        };
      default:
        return {
          Email: EMAIL_HANDLES.MAIN,
          Name: EMAIL_SENDER_NAMES.DEFAULT
        };
    }
  }
};

// Email templates configuration
export const EMAIL_TEMPLATES = {
  // Brand colors for email templates
  COLORS: {
    PRIMARY: '#0057FF',
    SECONDARY: '#F7C600',
    SUCCESS: '#27AE60',
    ERROR: '#E63946',
    BACKGROUND: '#F9F6F1',
    TEXT: '#2E2E2E',
    TEXT_LIGHT: '#666666'
  },
  
  // Common email footer
  FOOTER: `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E0E0E0; text-align: center; color: #666666; font-size: 14px;">
      <p style="margin: 5px 0;">
        <strong>[RE]Print Studios</strong><br>
        Empowering Creative Journeys
      </p>
      <p style="margin: 5px 0;">
        Bloomington, IL | <a href="mailto:hello@reprintstudios.com" style="color: #0057FF;">hello@reprintstudios.com</a>
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 12px; color: #999999;">
        This email was sent by [RE]Print Studios. If you have questions, please contact us.
      </p>
    </div>
  `
};

export default {
  EMAIL_HANDLES,
  EMAIL_SENDER_NAMES,
  MAILJET_CONFIG,
  EMAIL_TEMPLATES
};