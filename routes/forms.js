import express from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';
import ServiceTypeManager from '../utils/ServiceTypeManager.js';
import FormModuleSystem from '../utils/FormModuleSystem.js';

const router = express.Router();

/**
 * Dynamic Forms API Routes
 */

// Get available service types
router.get('/service-types', authenticateToken, async (req, res) => {
  try {
    const serviceTypes = await ServiceTypeManager.getServiceTypes();
    res.json({
      success: true,
      serviceTypes
    });
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch service types' 
    });
  }
});

// Get phases for specific services
router.post('/phases-for-services', 
  authenticateToken,
  [
    body('services').isArray().withMessage('Services must be an array'),
    body('services.*').isString().withMessage('Service codes must be strings')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { services } = req.body;
      const phases = await ServiceTypeManager.getProjectPhases(services);
      
      res.json({
        success: true,
        phases
      });
    } catch (error) {
      console.error('Error fetching phases:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch phases' 
      });
    }
});

// Get form schema for a project phase
router.get('/schema/:projectId/:phaseKey',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, phaseKey } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify user has access to this project
      const projectResult = await dbQuery(`
        SELECT p.*, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1
      `, [projectId]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectResult.rows[0];

      // Check access
      if (userRole !== 'admin' && project.client_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get project services
      const services = project.services || [];
      if (services.length === 0) {
        return res.status(400).json({ error: 'Project has no services defined' });
      }

      // Build composite schema
      const compositeSchema = await FormModuleSystem.buildCompositeSchema(
        phaseKey,
        services
      );

      // Get existing form data if any
      const formData = await FormModuleSystem.getFormData(projectId, phaseKey);
      
      // Merge all form data into single object
      const mergedData = {};
      formData.forEach(fd => {
        Object.assign(mergedData, fd.payload);
      });

      res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          client: project.client_name,
          services: project.services
        },
        phase: phaseKey,
        schema: compositeSchema.schema,
        uiSchema: compositeSchema.uiSchema,
        modules: compositeSchema.modules,
        data: mergedData
      });

    } catch (error) {
      console.error('Error fetching form schema:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch form schema' 
      });
    }
});

// Submit form data
router.post('/submit',
  authenticateToken,
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('phaseKey').isString().withMessage('Phase key required'),
    body('moduleId').isString().withMessage('Module ID required'),
    body('data').isObject().withMessage('Form data required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, phaseKey, moduleId, data } = req.body;
      const userId = req.user.id;

      // Save form data
      const savedData = await FormModuleSystem.saveFormData(
        projectId,
        phaseKey,
        moduleId,
        data,
        userId
      );

      // Log activity
      await dbQuery(`
        INSERT INTO activity_log (
          user_id, action, entity_type, entity_id, 
          description, metadata
        ) VALUES (
          $1, 'form_submission', 'project', $2,
          $3, $4
        )
      `, [
        userId,
        projectId,
        `Submitted ${moduleId} form for ${phaseKey} phase`,
        JSON.stringify({
          phaseKey,
          moduleId,
          formDataId: savedData.id
        })
      ]);

      res.json({
        success: true,
        message: 'Form submitted successfully',
        data: savedData
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to submit form' 
      });
    }
});

// Get form submission history
router.get('/history/:projectId/:phaseKey?',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, phaseKey } = req.params;
      const history = await FormModuleSystem.getFormHistory(projectId, phaseKey);
      
      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error fetching form history:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch form history' 
      });
    }
});

// Create new form module (admin only)
router.post('/modules',
  authenticateToken,
  [
    body('module_id').isString().withMessage('Module ID required'),
    body('name').isString().withMessage('Name required'),
    body('schema').isObject().withMessage('Valid JSON schema required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const module = await FormModuleSystem.createFormModule(req.body);
      
      // Clear cache
      ServiceTypeManager.clearCache();
      
      res.json({
        success: true,
        message: 'Form module created successfully',
        module
      });
    } catch (error) {
      console.error('Error creating form module:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to create form module' 
      });
    }
});

// Update form module (admin only)
router.put('/modules/:moduleId',
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const { moduleId } = req.params;
      const module = await FormModuleSystem.updateFormModule(moduleId, req.body);
      
      // Clear cache
      ServiceTypeManager.clearCache();
      
      res.json({
        success: true,
        message: 'Form module updated successfully',
        module
      });
    } catch (error) {
      console.error('Error updating form module:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to update form module' 
      });
    }
});

// Get all form modules (admin only)
router.get('/modules',
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const result = await dbQuery(`
        SELECT 
          fm.*,
          COUNT(DISTINCT fd.id) as usage_count
        FROM form_modules fm
        LEFT JOIN forms_data fd ON fm.module_id = fd.module_id
        WHERE fm.is_active = true
        GROUP BY fm.id
        ORDER BY fm.name
      `);
      
      res.json({
        success: true,
        modules: result.rows
      });
    } catch (error) {
      console.error('Error fetching form modules:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch form modules' 
      });
    }
});

export default router;