/**
 * Document Generation Routes
 * Handles document template management and generation
 */

import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import db from '../config/database.js';
import documentGenerator from '../utils/DocumentGenerator.js';
import Handlebars from 'handlebars';

const router = express.Router();

// Get all document templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { service_filter, phase_filter, template_type } = req.query;
    
    let query = `
      SELECT * FROM document_modules 
      WHERE is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (service_filter) {
      paramCount++;
      query += ` AND (service_filters IS NULL OR $${paramCount} = ANY(service_filters))`;
      params.push(service_filter);
    }

    if (phase_filter) {
      paramCount++;
      query += ` AND (phase_filters IS NULL OR $${paramCount} = ANY(phase_filters))`;
      params.push(phase_filter);
    }

    if (template_type) {
      paramCount++;
      query += ` AND template_type = $${paramCount}`;
      params.push(template_type);
    }

    query += ' ORDER BY sort_order, name';

    const result = await db.query(query, params);

    res.json({
      success: true,
      templates: result.rows
    });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document templates'
    });
  }
});

// Get single document template
router.get('/templates/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const result = await db.query(
      'SELECT * FROM document_modules WHERE module_id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching document template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document template'
    });
  }
});

// Create document template (admin only)
router.post('/templates', 
  authenticateToken, 
  requireAdmin,
  [
    body('module_id').isString().matches(/^[a-z0-9_]+$/),
    body('name').isString().notEmpty(),
    body('template_type').isIn(['proposal', 'contract', 'invoice', 'brief', 'report', 'other']),
    body('template').isString().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const {
        module_id,
        name,
        description,
        template_type,
        template,
        service_filters,
        phase_filters
      } = req.body;

      // Check if template ID already exists
      const existing = await db.query(
        'SELECT id FROM document_modules WHERE module_id = $1',
        [module_id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Template ID already exists'
        });
      }

      // Insert new template
      const result = await db.query(`
        INSERT INTO document_modules (
          module_id, name, description, template_type, 
          template, service_filters, phase_filters,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        module_id,
        name,
        description,
        template_type,
        template,
        service_filters || null,
        phase_filters || null,
        req.user.id
      ]);

      res.json({
        success: true,
        template: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating document template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create document template'
      });
    }
  }
);

// Update document template (admin only)
router.put('/templates/:templateId',
  authenticateToken,
  requireAdmin,
  [
    body('name').optional().isString().notEmpty(),
    body('template').optional().isString().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const { templateId } = req.params;
      const updates = req.body;

      // Build update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(updates).forEach(key => {
        if (['name', 'description', 'template_type', 'template', 
             'service_filters', 'phase_filters', 'is_active'].includes(key)) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Add version increment and updated_by
      paramCount++;
      updateFields.push(`version = version + 1`);
      updateFields.push(`updated_by = $${paramCount}`);
      values.push(req.user.id);

      // Add template ID
      paramCount++;
      values.push(templateId);

      const query = `
        UPDATE document_modules 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE module_id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Clear template cache
      documentGenerator.clearCache();

      res.json({
        success: true,
        template: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating document template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update document template'
      });
    }
  }
);

// Delete document template (admin only)
router.delete('/templates/:templateId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { templateId } = req.params;

      // Soft delete by setting is_active to false
      const result = await db.query(`
        UPDATE document_modules 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = $1
        WHERE module_id = $2
        RETURNING *
      `, [req.user.id, templateId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Clear template cache
      documentGenerator.clearCache();

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete document template'
      });
    }
  }
);

// Generate document for project
router.post('/generate',
  authenticateToken,
  [
    body('project_id').isUUID(),
    body('template_id').isString().notEmpty(),
    body('format').optional().isIn(['html', 'pdf'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const { project_id, template_id, format = 'html' } = req.body;

      // Check project access
      const projectAccess = await db.query(`
        SELECT 1 FROM projects 
        WHERE id = $1 AND (client_id = $2 OR $3 = 'admin')
      `, [project_id, req.user.id, req.user.role]);

      if (projectAccess.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      // Get project data
      const projectData = await documentGenerator.getProjectData(project_id);

      // Generate document
      if (format === 'pdf') {
        const pdfResult = await documentGenerator.generatePDF(template_id, projectData);
        
        // Log document generation
        await db.query(`
          INSERT INTO generated_documents (
            project_id, template_id, generated_by, 
            format, document_data
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          project_id,
          template_id,
          req.user.id,
          format,
          JSON.stringify({ project_data: projectData })
        ]);
        
        // Send PDF as binary response
        res.setHeader('Content-Type', pdfResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${template_id}_${project_id}.pdf"`);
        res.send(pdfResult.buffer);
      } else {
        const html = await documentGenerator.generateHTML(template_id, projectData);
        
        // Log document generation
        await db.query(`
          INSERT INTO generated_documents (
            project_id, template_id, generated_by, 
            format, document_data
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          project_id,
          template_id,
          req.user.id,
          format,
          JSON.stringify({ project_data: projectData })
        ]);
        
        res.json({
          success: true,
          document: { html }
        });
      }
    } catch (error) {
      console.error('Error generating document:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate document'
      });
    }
  }
);

// Get generated documents for project
router.get('/project/:projectId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId } = req.params;

      // Check project access
      const projectAccess = await db.query(`
        SELECT 1 FROM projects 
        WHERE id = $1 AND (client_id = $2 OR $3 = 'admin')
      `, [projectId, req.user.id, req.user.role]);

      if (projectAccess.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      // Get generated documents
      const documents = await db.query(`
        SELECT 
          gd.*,
          dm.name as template_name,
          dm.template_type,
          u.first_name || ' ' || u.last_name as generated_by_name
        FROM generated_documents gd
        JOIN document_modules dm ON gd.template_id = dm.module_id
        JOIN users u ON gd.generated_by = u.id
        WHERE gd.project_id = $1
        ORDER BY gd.created_at DESC
      `, [projectId]);

      res.json({
        success: true,
        documents: documents.rows
      });
    } catch (error) {
      console.error('Error fetching project documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project documents'
      });
    }
  }
);

// Preview document template
router.post('/preview',
  authenticateToken,
  requireAdmin,
  [
    body('template').isString().notEmpty(),
    body('sample_data').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    try {
      const { template, sample_data = {} } = req.body;

      // Compile template
      const compiled = Handlebars.compile(template);

      // Generate sample data if not provided
      const data = {
        project: {
          name: 'Sample Project',
          description: 'This is a sample project for template preview',
          services: ['WEB', 'LOGO'],
          status: 'in_progress'
        },
        client: {
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Example Company'
        },
        ...sample_data
      };

      // Generate HTML
      const html = compiled(data);
      const wrappedHtml = documentGenerator.wrapInDocumentTemplate(
        html, 
        'Template Preview'
      );

      res.json({
        success: true,
        html: wrappedHtml
      });
    } catch (error) {
      console.error('Error previewing template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to preview template'
      });
    }
  }
);

export default router;