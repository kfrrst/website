import express from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';
import ServiceTypeManager from '../utils/ServiceTypeManager.js';
import FormModuleSystem from '../utils/FormModuleSystem.js';
import { v4 as uuidv4 } from 'uuid';

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

      // Try to save using FormModuleSystem, fallback to direct DB insert
      let savedData;
      try {
        savedData = await FormModuleSystem.saveFormData(
          projectId,
          phaseKey,
          moduleId,
          data,
          userId
        );
      } catch (moduleError) {
        console.log('FormModuleSystem failed, using direct insert:', moduleError.message);
        
        // Direct database insert as fallback to forms_data table
        const result = await dbQuery(`
          INSERT INTO forms_data (
            project_id, phase_key, module_id, payload, submitted_by
          ) VALUES (
            $1, $2, $3, $4, $5
          ) ON CONFLICT (project_id, phase_key, module_id) 
          DO UPDATE SET 
            payload = $4,
            submitted_by = $5,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [projectId, phaseKey, moduleId, JSON.stringify(data), userId]);
        
        savedData = result.rows[0];
      }

      // Create a file record for the submitted form
      const formattedDate = new Date().toISOString().split('T')[0];
      const formModuleName = moduleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const fileName = `${formModuleName} - ${formattedDate}.json`;
      const storedName = `form_${savedData.id || Date.now()}.json`;
      
      console.log('Creating file record for form:', {
        fileName,
        projectId,
        userId
      });
      
      // Save form as a file in the database
      const fileResult = await dbQuery(`
        INSERT INTO files (
          id, original_name, stored_name, file_path, file_size, 
          mime_type, file_type, uploader_id, project_id, 
          description, is_active, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, CURRENT_TIMESTAMP
        ) RETURNING id
      `, [
        uuidv4(),
        fileName,
        storedName,
        `/forms/${projectId}/${phaseKey}/${storedName}`,
        JSON.stringify(data).length,
        'application/json',
        'document',  // Changed from 'form' to 'document' for better visibility
        userId,
        projectId,
        `${formModuleName} submission for ${phaseKey} phase`
      ]);
      
      console.log('File created:', fileResult.rows[0]);

      // Mark the corresponding phase requirement as completed
      // Map form module IDs to requirement keys - comprehensive mapping
      const requirementMapping = {
        // Onboarding phase
        'intake_base': 'intake_form',
        'intake_form': 'intake_form',
        'project_intake': 'intake_form',
        
        // Ideation phase
        'creative_brief': 'review_brief',
        'brief_review': 'review_brief',
        'direction_approval': 'approve_direction',
        'ideation_feedback': 'initial_feedback',
        
        // Design phase
        'design_review': 'review_designs',
        'design_feedback': 'design_feedback',
        'design_feedback_form': 'design_feedback',
        'design_approval': 'approve_designs',
        
        // Review phase
        'final_approval': 'approve_deliverables',
        'deliverables_approval': 'approve_deliverables',
        'proof_approval': 'proof_approval',
        'change_request': 'request_changes',
        
        // Production phase
        'production_monitor': 'monitor_production',
        'press_check_approval': 'press_check',
        
        // Payment phase
        'payment_confirmation': 'final_payment',
        'cost_review': 'review_costs',
        
        // Sign-off phase
        'completion_agreement': 'completion_agreement',
        'asset_download': 'download_assets',
        'documentation_review': 'review_docs',
        
        // Launch phase
        'delivery_confirmation': 'confirm_receipt',
        'testimonial_form': 'provide_testimonial',
        'launch_confirmation': 'launch_project'
      };

      const requirementKey = requirementMapping[moduleId];
      console.log('Form submission - Checking requirement completion:', {
        moduleId,
        requirementKey,
        phaseKey,
        projectId
      });
      
      if (requirementKey) {
        // Find the requirement
        const requirementResult = await dbQuery(`
          SELECT id FROM phase_requirements 
          WHERE requirement_key = $1 AND phase_key = $2
        `, [requirementKey, phaseKey]);
        
        console.log('Found requirement:', requirementResult.rows);

        if (requirementResult.rows.length > 0) {
          const requirementId = requirementResult.rows[0].id;
          
          // Mark as completed
          await dbQuery(`
            INSERT INTO project_phase_requirements (
              project_id, requirement_id, completed, completed_at, completed_by, metadata
            ) VALUES (
              $1, $2, true, CURRENT_TIMESTAMP, $3, $4
            ) ON CONFLICT (project_id, requirement_id) 
            DO UPDATE SET 
              completed = true,
              completed_at = CURRENT_TIMESTAMP,
              completed_by = $3,
              metadata = $4,
              updated_at = CURRENT_TIMESTAMP
          `, [
            projectId, 
            requirementId, 
            userId,
            JSON.stringify({ form_data_id: savedData.id, module_id: moduleId })
          ]);

          // Check if all mandatory requirements for current phase are complete
          const mandatoryCheck = await dbQuery(`
            SELECT 
              COUNT(*) FILTER (WHERE pr.is_mandatory = true) as total_mandatory,
              COUNT(*) FILTER (WHERE pr.is_mandatory = true AND ppr.completed = true) as completed_mandatory
            FROM phase_requirements pr
            LEFT JOIN project_phase_requirements ppr 
              ON pr.id = ppr.requirement_id AND ppr.project_id = $1
            WHERE pr.phase_key = $2
          `, [projectId, phaseKey]);

          const { total_mandatory, completed_mandatory } = mandatoryCheck.rows[0];
          const allMandatoryComplete = total_mandatory === completed_mandatory;

          // If all mandatory requirements are complete, consider advancing the phase
          if (allMandatoryComplete) {
            // Get the next phase
            const phaseOrder = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
            const currentIndex = phaseOrder.indexOf(phaseKey);
            if (currentIndex < phaseOrder.length - 1) {
              const nextPhase = phaseOrder[currentIndex + 1];
              
              // Update project phase (optional - can be manual approval based)
              // For now, we'll just log it
              await dbQuery(`
                INSERT INTO activity_log (
                  user_id, action, entity_type, entity_id, 
                  description, metadata
                ) VALUES (
                  $1, 'phase_ready', 'project', $2,
                  $3, $4
                )
              `, [
                userId,
                projectId,
                `All mandatory requirements completed for ${phaseKey} phase. Ready to advance to ${nextPhase}.`,
                JSON.stringify({
                  currentPhase: phaseKey,
                  nextPhase: nextPhase,
                  completedRequirements: completed_mandatory,
                  totalMandatory: total_mandatory
                })
              ]);
            }
          }
        }
      }

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