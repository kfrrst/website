import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { logPhaseTransition, logPhaseApproval } from './activities.js';
import { sendTemplateEmail } from '../utils/emailService.js';
import { EMAIL_TEMPLATES } from '../utils/emailTemplates.js';

const router = express.Router();

/**
 * Project Phases API Routes
 * Manages the 8-phase project workflow system
 */

// Get all phases (system-wide)
router.get('/phases', authenticateToken, async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        id, phase_key, name, description, icon, 
        order_index, requires_client_action, is_system_phase
      FROM project_phases
      ORDER BY order_index ASC
    `);
    
    res.json({
      phases: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching phases:', error);
    res.status(500).json({ error: 'Failed to fetch phases' });
  }
});

// Get phase details with actions
router.get('/phases/:phaseKey', authenticateToken, async (req, res) => {
  try {
    const { phaseKey } = req.params;
    
    // Get phase details
    const phaseResult = await dbQuery(`
      SELECT * FROM project_phases WHERE phase_key = $1
    `, [phaseKey]);
    
    if (phaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    
    const phase = phaseResult.rows[0];
    
    // Get client actions for this phase
    const actionsResult = await dbQuery(`
      SELECT 
        id, action_key, action_description, 
        is_required, order_index
      FROM phase_client_actions
      WHERE phase_id = $1
      ORDER BY order_index ASC
    `, [phase.id]);
    
    res.json({
      ...phase,
      actions: actionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching phase details:', error);
    res.status(500).json({ error: 'Failed to fetch phase details' });
  }
});

// Get project phase tracking
router.get('/projects/:projectId/phases', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Verify access
    if (userRole !== 'admin') {
      const projectResult = await dbQuery(
        'SELECT client_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (projectResult.rows.length === 0 || projectResult.rows[0].client_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Get project phase tracking
    const trackingResult = await dbQuery(`
      SELECT 
        pt.*,
        pp.phase_key,
        pp.name AS phase_name,
        pp.icon AS phase_icon,
        pp.description AS phase_description,
        pp.requires_client_action
      FROM project_phase_tracking pt
      JOIN project_phases pp ON pt.current_phase_id = pp.id
      WHERE pt.project_id = $1
    `, [projectId]);
    
    if (trackingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Phase tracking not found' });
    }
    
    const tracking = trackingResult.rows[0];
    
    // Get all phases with completion status
    const phasesResult = await dbQuery(`
      SELECT 
        pp.*,
        CASE 
          WHEN pp.order_index < $1 THEN 'completed'
          WHEN pp.order_index = $1 THEN 'current'
          ELSE 'upcoming'
        END AS status,
        CASE 
          WHEN pp.phase_key = 'onboarding' THEN pt.onboarding_completed_at
          WHEN pp.phase_key = 'ideation' THEN pt.ideation_completed_at
          WHEN pp.phase_key = 'design' THEN pt.design_completed_at
          WHEN pp.phase_key = 'review' THEN pt.review_completed_at
          WHEN pp.phase_key = 'production' THEN pt.production_completed_at
          WHEN pp.phase_key = 'payment' THEN pt.payment_completed_at
          WHEN pp.phase_key = 'signoff' THEN pt.signoff_completed_at
          WHEN pp.phase_key = 'delivery' THEN pt.delivery_completed_at
        END AS completed_at
      FROM project_phases pp
      CROSS JOIN project_phase_tracking pt
      WHERE pt.project_id = $2
      ORDER BY pp.order_index ASC
    `, [tracking.current_phase_index, projectId]);
    
    // Get current phase actions and their status
    const actionsResult = await dbQuery(`
      SELECT 
        pca.id,
        pca.action_key,
        pca.action_description,
        pca.is_required,
        pca.order_index,
        COALESCE(pas.is_completed, false) AS is_completed,
        pas.completed_at,
        pas.notes
      FROM phase_client_actions pca
      LEFT JOIN project_phase_action_status pas 
        ON pca.id = pas.action_id 
        AND pas.project_id = $1
      WHERE pca.phase_id = $2
      ORDER BY pca.order_index ASC
    `, [projectId, tracking.current_phase_id]);
    
    res.json({
      tracking,
      phases: phasesResult.rows,
      currentPhaseActions: actionsResult.rows,
      progress: {
        currentIndex: tracking.current_phase_index,
        totalPhases: 8,
        percentComplete: Math.round((tracking.current_phase_index / 7) * 100)
      }
    });
  } catch (error) {
    console.error('Error fetching project phases:', error);
    res.status(500).json({ error: 'Failed to fetch project phases' });
  }
});

// Get phase history for a project
router.get('/projects/:projectId/phases/history', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Verify access (similar to above)
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      const projectResult = await dbQuery(
        'SELECT client_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (projectResult.rows.length === 0 || projectResult.rows[0].client_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const historyResult = await dbQuery(`
      SELECT 
        ph.*,
        fp.name AS from_phase_name,
        fp.icon AS from_phase_icon,
        tp.name AS to_phase_name,
        tp.icon AS to_phase_icon,
        u.first_name || ' ' || u.last_name AS transitioned_by_name
      FROM project_phase_history ph
      LEFT JOIN project_phases fp ON ph.from_phase_id = fp.id
      JOIN project_phases tp ON ph.to_phase_id = tp.id
      JOIN users u ON ph.transitioned_by = u.id
      WHERE ph.project_id = $1
      ORDER BY ph.created_at DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);
    
    const countResult = await dbQuery(
      'SELECT COUNT(*) FROM project_phase_history WHERE project_id = $1',
      [projectId]
    );
    
    res.json({
      history: historyResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching phase history:', error);
    res.status(500).json({ error: 'Failed to fetch phase history' });
  }
});

// Update phase action status
router.put('/projects/:projectId/phases/actions/:actionId', 
  authenticateToken,
  [
    param('projectId').isUUID(),
    param('actionId').isUUID(),
    body('is_completed').isBoolean(),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { projectId, actionId } = req.params;
      const { is_completed, notes } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Verify access
      if (userRole !== 'admin') {
        const projectResult = await dbQuery(
          'SELECT client_id FROM projects WHERE id = $1',
          [projectId]
        );
        
        if (projectResult.rows.length === 0 || projectResult.rows[0].client_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Check if action status exists
      const existingResult = await dbQuery(`
        SELECT id FROM project_phase_action_status 
        WHERE project_id = $1 AND action_id = $2
      `, [projectId, actionId]);
      
      if (existingResult.rows.length === 0) {
        // Create new status
        await dbQuery(`
          INSERT INTO project_phase_action_status 
          (project_id, action_id, phase_id, is_completed, completed_at, completed_by, notes)
          SELECT $1, $2, pca.phase_id, $3, $4, $5, $6
          FROM phase_client_actions pca
          WHERE pca.id = $2
        `, [
          projectId, 
          actionId, 
          is_completed,
          is_completed ? new Date() : null,
          is_completed ? userId : null,
          notes
        ]);
      } else {
        // Update existing status
        await dbQuery(`
          UPDATE project_phase_action_status
          SET 
            is_completed = $1,
            completed_at = $2,
            completed_by = $3,
            notes = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE project_id = $5 AND action_id = $6
        `, [
          is_completed,
          is_completed ? new Date() : null,
          is_completed ? userId : null,
          notes,
          projectId,
          actionId
        ]);
      }
      
      // Check if all required actions are complete for auto-advance
      const phaseResult = await dbQuery(`
        SELECT phase_id FROM phase_client_actions WHERE id = $1
      `, [actionId]);
      
      if (phaseResult.rows.length > 0) {
        const phaseId = phaseResult.rows[0].phase_id;
        
        // Check if all actions are complete
        const completeResult = await dbQuery(`
          SELECT check_phase_actions_complete($1, $2) AS all_complete
        `, [projectId, phaseId]);
        
        if (completeResult.rows[0].all_complete) {
          // Check for automation rules
          const ruleResult = await dbQuery(`
            SELECT * FROM phase_automation_rules
            WHERE from_phase_id = $1 
              AND rule_type = 'all_actions_complete'
              AND is_active = true
          `, [phaseId]);
          
          if (ruleResult.rows.length > 0 && ruleResult.rows[0].rule_config?.auto_advance) {
            // Auto-advance to next phase
            await dbQuery(`
              SELECT advance_project_phase($1, $2, $3)
            `, [projectId, userId, 'Auto-advanced: All required actions completed']);
          }
        }
      }
      
      res.json({ 
        message: 'Action status updated successfully',
        is_completed 
      });
    } catch (error) {
      console.error('Error updating action status:', error);
      res.status(500).json({ error: 'Failed to update action status' });
    }
  }
);

// Advance project to next phase (admin only)
router.post('/projects/:projectId/phases/advance',
  authenticateToken,
  [
    param('projectId').isUUID(),
    body('notes').optional().isString()
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
      const { projectId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;
      
      // Attempt to advance phase
      const result = await dbQuery(`
        SELECT advance_project_phase($1, $2, $3) AS success
      `, [projectId, userId, notes]);
      
      if (!result.rows[0].success) {
        return res.status(400).json({ error: 'Cannot advance phase - already at final phase' });
      }
      
      // Get updated phase info
      const phaseResult = await dbQuery(`
        SELECT 
          pt.*,
          pp.phase_key,
          pp.name AS phase_name,
          pp.icon AS phase_icon
        FROM project_phase_tracking pt
        JOIN project_phases pp ON pt.current_phase_id = pp.id
        WHERE pt.project_id = $1
      `, [projectId]);
      
      res.json({
        message: 'Project phase advanced successfully',
        newPhase: phaseResult.rows[0]
      });
    } catch (error) {
      console.error('Error advancing phase:', error);
      res.status(500).json({ error: 'Failed to advance phase' });
    }
  }
);

// Move project to specific phase (admin only)
router.put('/projects/:projectId/phases/current',
  authenticateToken,
  [
    param('projectId').isUUID(),
    body('phaseKey').isString(),
    body('reason').optional().isString()
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
      const { projectId } = req.params;
      const { phaseKey, reason } = req.body;
      const userId = req.user.id;
      
      // Get target phase
      const phaseResult = await dbQuery(`
        SELECT id, order_index FROM project_phases WHERE phase_key = $1
      `, [phaseKey]);
      
      if (phaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      
      const targetPhase = phaseResult.rows[0];
      
      // Get current phase
      const currentResult = await dbQuery(`
        SELECT current_phase_id FROM project_phase_tracking WHERE project_id = $1
      `, [projectId]);
      
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project phase tracking not found' });
      }
      
      const currentPhaseId = currentResult.rows[0].current_phase_id;
      
      // Update phase tracking
      await dbQuery(`
        UPDATE project_phase_tracking
        SET 
          current_phase_id = $1,
          current_phase_index = $2,
          phase_started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $3
      `, [targetPhase.id, targetPhase.order_index, projectId]);
      
      // Record history
      await dbQuery(`
        INSERT INTO project_phase_history 
        (project_id, from_phase_id, to_phase_id, transitioned_by, transition_reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [projectId, currentPhaseId, targetPhase.id, userId, reason || 'Manual phase change']);
      
      res.json({
        message: 'Project phase updated successfully',
        newPhaseKey: phaseKey
      });
    } catch (error) {
      console.error('Error updating project phase:', error);
      res.status(500).json({ error: 'Failed to update project phase' });
    }
  }
);

// Get phase documents
router.get('/projects/:projectId/phases/:phaseKey/documents',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, phaseKey } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Verify access
      if (userRole !== 'admin') {
        const projectResult = await dbQuery(
          'SELECT client_id FROM projects WHERE id = $1',
          [projectId]
        );
        
        if (projectResult.rows.length === 0 || projectResult.rows[0].client_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      const documentsResult = await dbQuery(`
        SELECT 
          pd.*,
          pf.filename,
          pf.original_filename,
          pf.file_size,
          pf.mime_type,
          pf.uploaded_at AS file_uploaded_at,
          pp.name AS phase_name
        FROM phase_documents pd
        JOIN project_files pf ON pd.file_id = pf.id
        JOIN project_phases pp ON pd.phase_id = pp.id
        WHERE pd.project_id = $1 
          AND pp.phase_key = $2
          AND (pd.is_client_visible = true OR $3 = 'admin')
        ORDER BY pd.uploaded_at DESC
      `, [projectId, phaseKey, userRole]);
      
      res.json({
        documents: documentsResult.rows,
        total: documentsResult.rows.length
      });
    } catch (error) {
      console.error('Error fetching phase documents:', error);
      res.status(500).json({ error: 'Failed to fetch phase documents' });
    }
  }
);

// Link document to phase
router.post('/projects/:projectId/phases/:phaseKey/documents',
  authenticateToken,
  [
    param('projectId').isUUID(),
    param('phaseKey').isString(),
    body('fileId').isUUID(),
    body('documentType').optional().isString(),
    body('isClientVisible').optional().isBoolean()
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
      const { projectId, phaseKey } = req.params;
      const { fileId, documentType, isClientVisible = true } = req.body;
      
      // Get phase ID
      const phaseResult = await dbQuery(
        'SELECT id FROM project_phases WHERE phase_key = $1',
        [phaseKey]
      );
      
      if (phaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      
      const phaseId = phaseResult.rows[0].id;
      
      // Insert phase document
      await dbQuery(`
        INSERT INTO phase_documents 
        (project_id, phase_id, file_id, document_type, is_client_visible)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, phase_id, file_id) 
        DO UPDATE SET 
          document_type = EXCLUDED.document_type,
          is_client_visible = EXCLUDED.is_client_visible
      `, [projectId, phaseId, fileId, documentType, isClientVisible]);
      
      res.json({
        message: 'Document linked to phase successfully'
      });
    } catch (error) {
      console.error('Error linking document to phase:', error);
      res.status(500).json({ error: 'Failed to link document to phase' });
    }
  }
);

// GET /api/phases/project/:projectId/tracking - Get project phase tracking data
router.get('/project/:projectId/tracking', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log('Phase tracking request:', {
      projectId,
      userId,
      userRole,
      userObject: req.user
    });
    
    // Check access
    if (userRole !== 'admin') {
      const projectResult = await dbQuery(
        'SELECT client_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      console.log('Project query result:', {
        found: projectResult.rows.length > 0,
        clientId: projectResult.rows[0]?.client_id,
        userIdFromToken: userId,
        matches: projectResult.rows[0]?.client_id === userId
      });
      
      if (projectResult.rows.length === 0 || projectResult.rows[0].client_id !== userId) {
        console.log('Access denied - project not found or user mismatch');
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Get project with phase tracking
    const projectQuery = `
      SELECT 
        p.*,
        pt.current_phase_id,
        pt.current_phase_index,
        pt.phase_started_at,
        pt.is_completed as project_completed,
        pt.completed_at as project_completed_at,
        ph.phase_key as current_phase_key,
        ph.name as current_phase_name,
        ph.icon as current_phase_icon
      FROM projects p
      LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
      LEFT JOIN project_phases ph ON pt.current_phase_id = ph.id
      WHERE p.id = $1
    `;
    
    const projectResult = await dbQuery(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    
    // Get all actions for current phase
    const actionsQuery = `
      SELECT 
        pca.*,
        pas.is_completed,
        pas.completed_at,
        pas.completed_by
      FROM phase_client_actions pca
      LEFT JOIN project_phase_action_status pas 
        ON pca.id = pas.action_id 
        AND pas.project_id = $1
      WHERE pca.phase_id = $2
      ORDER BY pca.order_index ASC
    `;
    
    const actionsResult = await dbQuery(actionsQuery, [projectId, project.current_phase_id]);
    
    // Get action statuses for all phases
    const allStatusesQuery = `
      SELECT action_id, is_completed 
      FROM project_phase_action_status 
      WHERE project_id = $1
    `;
    
    const statusesResult = await dbQuery(allStatusesQuery, [projectId]);
    
    res.json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      },
      tracking: {
        current_phase_id: project.current_phase_id,
        current_phase_index: project.current_phase_index,
        phase_started_at: project.phase_started_at,
        is_completed: project.project_completed,
        completed_at: project.project_completed_at,
        action_statuses: statusesResult.rows
      },
      actions: actionsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching project phase tracking:', error);
    res.status(500).json({ error: 'Failed to fetch phase tracking' });
  }
});

// PUT /api/phases/actions/:actionId/status - Update action status
router.put('/actions/:actionId/status', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params;
    const { is_completed } = req.body;
    const userId = req.user.id;
    
    // Get action details to verify access
    const actionQuery = `
      SELECT 
        pca.*,
        p.client_id,
        p.id as project_id
      FROM phase_client_actions pca
      JOIN project_phases pp ON pca.phase_id = pp.id
      JOIN project_phase_tracking pt ON pt.current_phase_id = pp.id
      JOIN projects p ON pt.project_id = p.id
      WHERE pca.id = $1
    `;
    
    const actionResult = await dbQuery(actionQuery, [actionId]);
    
    if (actionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    const action = actionResult.rows[0];
    
    // Check access
    if (req.user.role !== 'admin' && action.client_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update or insert action status
    const upsertQuery = `
      INSERT INTO project_phase_action_status (project_id, action_id, is_completed, completed_at, completed_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id, action_id) 
      DO UPDATE SET 
        is_completed = $3,
        completed_at = $4,
        completed_by = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const statusResult = await dbQuery(upsertQuery, [
      action.project_id,
      actionId,
      is_completed,
      is_completed ? new Date() : null,
      is_completed ? userId : null
    ]);
    
    // Check if all required actions are complete
    const checkCompleteQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE pca.is_required = true) as required_count,
        COUNT(*) FILTER (WHERE pca.is_required = true AND pas.is_completed = true) as completed_count
      FROM phase_client_actions pca
      LEFT JOIN project_phase_action_status pas 
        ON pca.id = pas.action_id 
        AND pas.project_id = $1
      WHERE pca.phase_id = $2
    `;
    
    const checkResult = await dbQuery(checkCompleteQuery, [action.project_id, action.phase_id]);
    const { required_count, completed_count } = checkResult.rows[0];
    const can_advance = required_count === completed_count;
    
    res.json({
      status: statusResult.rows[0],
      can_advance,
      message: is_completed ? 'Action marked as complete' : 'Action marked as incomplete'
    });
    
  } catch (error) {
    console.error('Error updating action status:', error);
    res.status(500).json({ error: 'Failed to update action status' });
  }
});

// POST /api/phases/:phaseId/approve - Approve a phase
router.post('/:phaseId/approve', authenticateToken, async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { phaseId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    
    // Get phase with project info
    const phaseQuery = await client.query(`
      SELECT 
        pp.*,
        p.id as project_id,
        p.name as project_name,
        p.client_id,
        pt.current_phase_index
      FROM project_phases pp
      JOIN project_phase_tracking pt ON pp.id = pt.current_phase_id
      JOIN projects p ON pt.project_id = p.id
      WHERE pp.id = $1
    `, [phaseId]);
    
    if (phaseQuery.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({ 
        success: false, 
        error: 'Phase not found or not current phase' 
      });
    }
    
    const phase = phaseQuery.rows[0];
    
    // Verify permissions
    if (req.user.role !== 'admin' && phase.client_id !== userId) {
      await rollbackTransaction(client);
      return res.status(403).json({ 
        success: false, 
        error: 'Only the project owner can approve phases' 
      });
    }
    
    // Update phase approval in tracking
    const updateColumns = {
      'onboarding': 'onboarding_completed_at',
      'ideation': 'ideation_completed_at',
      'design': 'design_completed_at',
      'review': 'review_completed_at',
      'production': 'production_completed_at',
      'payment': 'payment_completed_at',
      'signoff': 'signoff_completed_at',
      'delivery': 'delivery_completed_at'
    };
    
    const completionColumn = updateColumns[phase.phase_key];
    if (completionColumn) {
      await client.query(`
        UPDATE project_phase_tracking 
        SET ${completionColumn} = CURRENT_TIMESTAMP
        WHERE project_id = $1
      `, [phase.project_id]);
    }
    
    // Log phase approval
    await logPhaseApproval(client, {
      user_id: userId,
      project_id: phase.project_id,
      phase_id: phaseId,
      approved: true,
      notes
    });
    
    // Auto-advance to next phase if not last
    const nextPhaseIndex = phase.current_phase_index + 1;
    if (nextPhaseIndex < 8) {
      const nextPhaseResult = await client.query(
        'SELECT * FROM project_phases WHERE order_index = $1',
        [nextPhaseIndex]
      );
      
      if (nextPhaseResult.rows.length > 0) {
        const nextPhase = nextPhaseResult.rows[0];
        
        await client.query(`
          UPDATE project_phase_tracking
          SET 
            current_phase_id = $1,
            current_phase_index = $2,
            phase_started_at = CURRENT_TIMESTAMP
          WHERE project_id = $3
        `, [nextPhase.id, nextPhaseIndex, phase.project_id]);
        
        // Log phase transition
        await logPhaseTransition(client, {
          user_id: userId,
          project_id: phase.project_id,
          from_phase_id: phaseId,
          to_phase_id: nextPhase.id,
          reason: 'Auto-advanced after approval'
        });
      }
    } else {
      // Mark project as completed
      await client.query(`
        UPDATE projects 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [phase.project_id]);
      
      await client.query(`
        UPDATE project_phase_tracking
        SET is_completed = true, completed_at = CURRENT_TIMESTAMP
        WHERE project_id = $1
      `, [phase.project_id]);
    }
    
    await commitTransaction(client);
    
    // Send email notification to admin/team
    try {
      // Get admin users
      const adminResult = await dbQuery(
        `SELECT email, first_name FROM users WHERE role = 'admin' LIMIT 1`
      );
      
      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const userInfo = await dbQuery(
          `SELECT first_name, last_name FROM users WHERE id = $1`,
          [userId]
        );
        const clientName = userInfo.rows[0] ? 
          `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}` : 'Client';
        
        await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVED, {
          to: admin.email,
          clientName: clientName,
          projectName: phase.project_name,
          phaseName: phase.name,
          approvedAt: new Date(),
          approvalNotes: notes,
          nextPhase: nextPhaseIndex < 8 ? {
            name: `Phase ${nextPhaseIndex + 1}`,
            description: 'Next phase of the project'
          } : null,
          projectUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/admin#projects/${phase.project_id}`,
          context: 'project'
        });
      }
    } catch (emailError) {
      console.error('Failed to send phase approval email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      success: true,
      message: 'Phase approved successfully',
      phase: {
        id: phaseId,
        status: 'completed',
        approved_by: userId,
        approved_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error approving phase:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve phase. Please try again.',
      errorCode: 'PHASE_APPROVAL_ERROR'
    });
  }
});

// POST /api/phases/:phaseId/request-changes - Request changes for a phase
router.post('/:phaseId/request-changes', authenticateToken, async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { phaseId } = req.params;
    const { changes_requested } = req.body;
    const userId = req.user.id;
    
    if (!changes_requested || changes_requested.trim().length === 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide details about the changes needed' 
      });
    }
    
    // Get phase with project info
    const phaseQuery = await client.query(`
      SELECT 
        pp.*,
        p.id as project_id,
        p.name as project_name,
        p.client_id
      FROM project_phases pp
      JOIN project_phase_tracking pt ON pp.id = pt.current_phase_id
      JOIN projects p ON pt.project_id = p.id
      WHERE pp.id = $1
    `, [phaseId]);
    
    if (phaseQuery.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({ 
        success: false, 
        error: 'Phase not found or not current phase' 
      });
    }
    
    const phase = phaseQuery.rows[0];
    
    // Verify permissions
    if (req.user.role !== 'admin' && phase.client_id !== userId) {
      await rollbackTransaction(client);
      return res.status(403).json({ 
        success: false, 
        error: 'Only the project owner can request changes' 
      });
    }
    
    // Log phase rejection/change request
    await logPhaseApproval(client, {
      user_id: userId,
      project_id: phase.project_id,
      phase_id: phaseId,
      approved: false,
      notes: changes_requested
    });
    
    // Add as a project message
    await client.query(`
      INSERT INTO messages 
      (project_id, sender_id, message, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      phase.project_id,
      userId,
      `Changes requested for ${phase.name}:\n\n${changes_requested}`
    ]);
    
    await commitTransaction(client);
    
    // Send email notification to admin/team
    try {
      // Get admin users
      const adminResult = await dbQuery(
        `SELECT email, first_name FROM users WHERE role = 'admin' LIMIT 1`
      );
      
      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const userInfo = await dbQuery(
          `SELECT first_name, last_name FROM users WHERE id = $1`,
          [userId]
        );
        const clientName = userInfo.rows[0] ? 
          `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}` : 'Client';
        
        await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_CHANGES_REQUESTED, {
          to: admin.email,
          clientName: clientName,
          projectName: phase.project_name,
          phaseName: phase.name,
          requestedAt: new Date(),
          feedback: changes_requested,
          projectUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/admin#projects/${phase.project_id}`,
          context: 'project'
        });
      }
    } catch (emailError) {
      console.error('Failed to send changes requested email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      success: true,
      message: 'Change request submitted successfully',
      phase: {
        id: phaseId,
        status: 'changes_requested',
        last_feedback: changes_requested,
        last_feedback_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error requesting changes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit change request. Please try again.',
      errorCode: 'CHANGE_REQUEST_ERROR'
    });
  }
});

// POST /api/phases/projects/:projectId/advance - Advance to next phase
router.post('/projects/:projectId/advance', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { next_phase_index, notes } = req.body;
    const userId = req.user.id;
    
    // Check access
    const projectResult = await dbQuery(
      'SELECT client_id, name FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    
    if (req.user.role !== 'admin' && project.client_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get next phase details
    const phaseResult = await dbQuery(
      'SELECT * FROM project_phases WHERE order_index = $1',
      [next_phase_index]
    );
    
    if (phaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Next phase not found' });
    }
    
    const nextPhase = phaseResult.rows[0];
    
    // Update phase tracking
    await dbQuery(`
      UPDATE project_phase_tracking
      SET 
        current_phase_id = $1,
        current_phase_index = $2,
        phase_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $3
    `, [nextPhase.id, next_phase_index, projectId]);
    
    // Log the phase change
    await dbQuery(`
      INSERT INTO activity_log (user_id, project_id, entity_type, entity_id, action, description, metadata)
      VALUES ($1, $2, 'phase', $3, 'phase_change', $4, $5)
    `, [
      userId,
      projectId,
      nextPhase.id,
      `Phase advanced to ${nextPhase.name}`,
      JSON.stringify({ from_index: next_phase_index - 1, to_index: next_phase_index, notes })
    ]);
    
    // Send email notification to client if phase requires approval
    if (nextPhase.requires_client_action && req.user.role === 'admin') {
      try {
        // Get client info
        const clientResult = await dbQuery(
          `SELECT u.email, u.first_name, u.last_name 
           FROM users u 
           JOIN projects p ON u.id = p.client_id 
           WHERE p.id = $1`,
          [projectId]
        );
        
        if (clientResult.rows.length > 0) {
          const client = clientResult.rows[0];
          const clientName = `${client.first_name} ${client.last_name || ''}`.trim();
          
          // Get deliverable count for this phase
          const deliverableResult = await dbQuery(
            `SELECT COUNT(*) as count FROM files WHERE project_id = $1 AND phase_id = $2`,
            [projectId, nextPhase.id]
          );
          
          await sendTemplateEmail(EMAIL_TEMPLATES.PHASE_APPROVAL_NEEDED, {
            to: client.email,
            userId: project.client_id,
            clientName: clientName,
            projectName: project.name,
            phaseName: nextPhase.name,
            phaseDescription: nextPhase.description,
            deliverableCount: parseInt(deliverableResult.rows[0].count),
            reviewUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal#projects`,
            context: 'phase',
            type: 'phase_approval'
          });
        }
      } catch (emailError) {
        console.error('Failed to send phase approval needed email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({
      success: true,
      new_phase: {
        id: nextPhase.id,
        key: nextPhase.phase_key,
        name: nextPhase.name,
        icon: nextPhase.icon,
        index: next_phase_index
      },
      message: `Successfully advanced to ${nextPhase.name} phase`
    });
    
  } catch (error) {
    console.error('Error advancing phase:', error);
    res.status(500).json({ error: 'Failed to advance phase' });
  }
});

export default router;