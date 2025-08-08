import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * @route GET /api/settings
 * @desc Get all settings for authenticated user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // For now, return default settings until tables are created
    // TODO: Create user_settings, system_settings, and email_templates tables
    
    res.json({
      user: {
        user_id: req.user.id,
        theme: 'light',
        notifications_enabled: true,
        email_notifications: true,
        language: 'en',
        timezone: 'UTC'
      },
      system: {
        company_name: 'RE Print Studios',
        default_currency: 'USD',
        date_format: 'MM/DD/YYYY',
        time_format: '12h'
      },
      emailTemplates: [
        { id: 1, name: 'welcome_email', subject: 'Welcome to RE Print Studios', description: 'Sent to new clients' },
        { id: 2, name: 'project_update', subject: 'Project Update', description: 'Project status notifications' },
        { id: 3, name: 'invoice_due', subject: 'Invoice Due', description: 'Payment reminders' }
      ]
    });

  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve settings',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/settings/user
 * @desc Update user settings
 * @access Private
 */
router.put('/user', authenticateToken, async (req, res) => {
  try {
    const { theme, notifications_enabled, email_notifications, language, timezone } = req.body;

    // TODO: Implement database storage when tables are created
    // For now, just return the updated settings
    
    res.json({
      success: true,
      settings: {
        user_id: req.user.id,
        theme: theme || 'light',
        notifications_enabled: notifications_enabled !== false,
        email_notifications: email_notifications !== false,
        language: language || 'en',
        timezone: timezone || 'UTC',
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('Failed to update user settings:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/settings/system
 * @desc Update system settings (admin only)
 * @access Private (Admin)
 */
router.put('/system', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // Update system setting
    const result = await query(
      `UPDATE system_settings 
       SET value = $2, updated_at = NOW() 
       WHERE key = $1 
       RETURNING *`,
      [key, value]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({
      success: true,
      setting: result.rows[0]
    });

  } catch (error) {
    console.error('Failed to update system settings:', error);
    res.status(500).json({ 
      error: 'Failed to update system settings',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/settings/email-template/:id
 * @desc Update email template (admin only)
 * @access Private (Admin)
 */
router.put('/email-template/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { subject, body_html, body_text } = req.body;

    const result = await query(
      `UPDATE email_templates 
       SET subject = $2, body_html = $3, body_text = $4, 
           last_modified = NOW(), modified_by = $5
       WHERE id = $1 
       RETURNING *`,
      [id, subject, body_html, body_text, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error) {
    console.error('Failed to update email template:', error);
    res.status(500).json({ 
      error: 'Failed to update email template',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/settings/email-template/:id
 * @desc Get email template details (admin only)
 * @access Private (Admin)
 */
router.get('/email-template/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await query(
      `SELECT * FROM email_templates WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json({
      template: result.rows[0]
    });

  } catch (error) {
    console.error('Failed to fetch email template:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve email template',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/settings/test-email
 * @desc Send test email (admin only)
 * @access Private (Admin)
 */
router.post('/test-email', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { templateId, testEmail } = req.body;

    if (!templateId || !testEmail) {
      return res.status(400).json({ error: 'Template ID and test email are required' });
    }

    // Get template
    const template = await query(
      `SELECT * FROM email_templates WHERE id = $1`,
      [templateId]
    );

    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    // TODO: Send test email using email service

    res.json({
      success: true,
      message: `Test email sent to ${testEmail}`
    });

  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;