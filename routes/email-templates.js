import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import fs from 'fs-extra';
import path from 'path';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Helper function to log activity
const logActivity = async (client, userId, entityType, entityId, action, description, metadata = {}) => {
  try {
    await client.query(`
      INSERT INTO activity_log (user_id, entity_type, entity_id, action, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, entityType, entityId, action, description, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Get template file path
const getTemplatePath = (templateKey) => {
  return path.join(process.cwd(), 'templates', 'emails', `${templateKey}.html`);
};

// =============================================================================
// GET /api/email-templates - List all email templates
// =============================================================================
router.get('/',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const templatesQuery = `
        SELECT 
          et.*,
          COUNT(esl.id) as usage_count,
          MAX(esl.sent_at) as last_used
        FROM email_templates et
        LEFT JOIN email_send_log esl ON et.template_key = esl.template_key
        GROUP BY et.id, et.template_key, et.name, et.subject, et.category, 
                 et.is_active, et.variables, et.created_at, et.updated_at
        ORDER BY et.category, et.name
      `;
      
      const result = await dbQuery(templatesQuery);
      
      const templates = result.rows.map(template => ({
        ...template,
        usage_count: parseInt(template.usage_count) || 0,
        variables: template.variables || []
      }));
      
      res.json({ templates });
      
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  }
);

// =============================================================================
// GET /api/email-templates/:key - Get specific email template
// =============================================================================
router.get('/:key',
  authenticateToken,
  requireAdmin,
  [
    param('key').isLength({ min: 1, max: 100 }).withMessage('Invalid template key')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateKey = req.params.key;
      
      // Get template from database
      const templateResult = await dbQuery(
        'SELECT * FROM email_templates WHERE template_key = $1',
        [templateKey]
      );
      
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      
      const template = templateResult.rows[0];
      
      // Try to read HTML content from file
      const templatePath = getTemplatePath(templateKey);
      let htmlContent = '';
      
      try {
        if (await fs.pathExists(templatePath)) {
          htmlContent = await fs.readFile(templatePath, 'utf8');
        }
      } catch (fileError) {
        console.error('Error reading template file:', fileError);
        // Continue without file content
      }
      
      res.json({
        template: {
          ...template,
          html_content: htmlContent,
          variables: template.variables || []
        }
      });
      
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ error: 'Failed to fetch email template' });
    }
  }
);

// =============================================================================
// POST /api/email-templates - Create new email template
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('template_key').trim().isLength({ min: 1, max: 100 }).withMessage('Template key is required (max 100 chars)'),
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required (max 200 chars)'),
    body('subject').trim().isLength({ min: 1, max: 500 }).withMessage('Subject is required (max 500 chars)'),
    body('category').isIn(['project', 'invoice', 'system', 'notification', 'marketing']).withMessage('Invalid category'),
    body('html_content').trim().isLength({ min: 1 }).withMessage('HTML content is required'),
    body('variables').optional().isArray().withMessage('Variables must be an array'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { 
        template_key, 
        name, 
        subject, 
        category, 
        html_content, 
        variables = [],
        is_active = true 
      } = req.body;
      
      const template = await withTransaction(async (client) => {
        // Check if template key already exists
        const existingTemplate = await client.query(
          'SELECT id FROM email_templates WHERE template_key = $1',
          [template_key]
        );
        
        if (existingTemplate.rows.length > 0) {
          throw new Error('Email template with this key already exists');
        }
        
        // Insert new template
        const insertQuery = `
          INSERT INTO email_templates (template_key, name, subject, category, variables, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          template_key, name, subject, category, variables, is_active
        ]);
        
        const newTemplate = result.rows[0];
        
        // Save HTML content to file
        const templatePath = getTemplatePath(template_key);
        await fs.ensureDir(path.dirname(templatePath));
        await fs.writeFile(templatePath, html_content, 'utf8');
        
        // Log activity
        await logActivity(
          client,
          req.user.id,
          'email_template',
          newTemplate.id,
          'created',
          `Email template created: ${name}`,
          { template_key, category }
        );
        
        return newTemplate;
      });
      
      res.status(201).json({
        message: 'Email template created successfully',
        template
      });
      
    } catch (error) {
      console.error('Error creating email template:', error);
      if (error.message === 'Email template with this key already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create email template' });
    }
  }
);

// =============================================================================
// PUT /api/email-templates/:key - Update email template
// =============================================================================
router.put('/:key',
  authenticateToken,
  requireAdmin,
  [
    param('key').isLength({ min: 1, max: 100 }).withMessage('Invalid template key'),
    body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 chars'),
    body('subject').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Subject must be 1-500 chars'),
    body('category').optional().isIn(['project', 'invoice', 'system', 'notification', 'marketing']).withMessage('Invalid category'),
    body('html_content').optional().trim().isLength({ min: 1 }).withMessage('HTML content must not be empty'),
    body('variables').optional().isArray().withMessage('Variables must be an array'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateKey = req.params.key;
      const { name, subject, category, html_content, variables, is_active } = req.body;
      
      const updatedTemplate = await withTransaction(async (client) => {
        // Check if template exists
        const existingTemplate = await client.query(
          'SELECT * FROM email_templates WHERE template_key = $1',
          [templateKey]
        );
        
        if (existingTemplate.rows.length === 0) {
          throw new Error('Email template not found');
        }
        
        const currentTemplate = existingTemplate.rows[0];
        const updatedFields = {};
        
        // Build update fields
        if (name && name !== currentTemplate.name) {
          updatedFields.name = name;
        }
        if (subject && subject !== currentTemplate.subject) {
          updatedFields.subject = subject;
        }
        if (category && category !== currentTemplate.category) {
          updatedFields.category = category;
        }
        if (variables !== undefined) {
          updatedFields.variables = variables;
        }
        if (is_active !== undefined && is_active !== currentTemplate.is_active) {
          updatedFields.is_active = is_active;
        }
        
        let template = currentTemplate;
        
        if (Object.keys(updatedFields).length > 0) {
          // Build and execute update query
          const updateParams = Object.values(updatedFields);
          const setClause = Object.keys(updatedFields).map((field, index) => 
            `${field} = $${index + 1}`
          ).join(', ');
          
          const updateQuery = `
            UPDATE email_templates 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE template_key = $${updateParams.length + 1}
            RETURNING *
          `;
          
          updateParams.push(templateKey);
          const result = await client.query(updateQuery, updateParams);
          template = result.rows[0];
        }
        
        // Update HTML content file if provided
        if (html_content) {
          const templatePath = getTemplatePath(templateKey);
          await fs.ensureDir(path.dirname(templatePath));
          await fs.writeFile(templatePath, html_content, 'utf8');
        }
        
        // Log activity
        const changeDescription = Object.keys(updatedFields)
          .map(field => `${field}: ${updatedFields[field]}`)
          .join(', ');
        
        let logDescription = 'Email template updated';
        if (changeDescription) {
          logDescription += `: ${changeDescription}`;
        }
        if (html_content) {
          logDescription += ', HTML content updated';
        }
        
        await logActivity(
          client,
          req.user.id,
          'email_template',
          template.id,
          'updated',
          logDescription,
          { 
            updated_fields: Object.keys(updatedFields),
            html_updated: !!html_content
          }
        );
        
        return template;
      });
      
      res.json({
        message: 'Email template updated successfully',
        template: updatedTemplate
      });
      
    } catch (error) {
      console.error('Error updating email template:', error);
      if (error.message === 'Email template not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update email template' });
    }
  }
);

// =============================================================================
// POST /api/email-templates/:key/test - Send test email
// =============================================================================
router.post('/:key/test',
  authenticateToken,
  requireAdmin,
  [
    param('key').isLength({ min: 1, max: 100 }).withMessage('Invalid template key'),
    body('to_email').isEmail().withMessage('Valid email address is required'),
    body('test_data').optional().isObject().withMessage('Test data must be an object')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateKey = req.params.key;
      const { to_email, test_data = {} } = req.body;
      
      // Get template
      const templateResult = await dbQuery(
        'SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true',
        [templateKey]
      );
      
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Email template not found or inactive' });
      }
      
      const template = templateResult.rows[0];
      
      // Import email service
      const { sendTemplateEmail } = await import('../utils/emailService.js');
      
      // Send test email with provided test data
      const testEmailData = {
        to: to_email,
        ...test_data,
        context: 'test',
        type: 'test'
      };
      
      await sendTemplateEmail(templateKey, testEmailData);
      
      // Log activity
      await withTransaction(async (client) => {
        await logActivity(
          client,
          req.user.id,
          'email_template',
          template.id,
          'test_sent',
          `Test email sent using template: ${template.name}`,
          { 
            recipient: to_email,
            template_key: templateKey
          }
        );
      });
      
      res.json({
        message: 'Test email sent successfully',
        recipient: to_email,
        template_key: templateKey
      });
      
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  }
);

// =============================================================================
// GET /api/email-templates/:key/preview - Preview email template
// =============================================================================
router.get('/:key/preview',
  authenticateToken,
  requireAdmin,
  [
    param('key').isLength({ min: 1, max: 100 }).withMessage('Invalid template key')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateKey = req.params.key;
      
      // Get template
      const templateResult = await dbQuery(
        'SELECT * FROM email_templates WHERE template_key = $1',
        [templateKey]
      );
      
      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      
      const template = templateResult.rows[0];
      
      // Read HTML content
      const templatePath = getTemplatePath(templateKey);
      let htmlContent = '';
      
      if (await fs.pathExists(templatePath)) {
        htmlContent = await fs.readFile(templatePath, 'utf8');
      } else {
        return res.status(404).json({ error: 'Template file not found' });
      }
      
      // Return HTML content for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Error previewing email template:', error);
      res.status(500).json({ error: 'Failed to preview email template' });
    }
  }
);

// =============================================================================
// DELETE /api/email-templates/:key - Delete email template
// =============================================================================
router.delete('/:key',
  authenticateToken,
  requireAdmin,
  [
    param('key').isLength({ min: 1, max: 100 }).withMessage('Invalid template key')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const templateKey = req.params.key;
      
      const deletedTemplate = await withTransaction(async (client) => {
        // Check if template exists
        const existingTemplate = await client.query(
          'SELECT * FROM email_templates WHERE template_key = $1',
          [templateKey]
        );
        
        if (existingTemplate.rows.length === 0) {
          throw new Error('Email template not found');
        }
        
        const template = existingTemplate.rows[0];
        
        // Delete template from database
        await client.query('DELETE FROM email_templates WHERE template_key = $1', [templateKey]);
        
        // Delete template file
        const templatePath = getTemplatePath(templateKey);
        if (await fs.pathExists(templatePath)) {
          await fs.remove(templatePath);
        }
        
        // Log activity
        await logActivity(
          client,
          req.user.id,
          'email_template',
          template.id,
          'deleted',
          `Email template deleted: ${template.name}`,
          { template_key: templateKey }
        );
        
        return { id: template.id, name: template.name, template_key: templateKey };
      });
      
      res.json({
        message: 'Email template deleted successfully',
        template: deletedTemplate
      });
      
    } catch (error) {
      console.error('Error deleting email template:', error);
      if (error.message === 'Email template not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete email template' });
    }
  }
);

export default router;