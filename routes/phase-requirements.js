import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import db from '../config/database.js';

const router = express.Router();

// Get all phase requirements
router.get('/requirements', authenticateToken, async (req, res) => {
  try {
    // Check if requirements exist in database
    const existingReqs = await db.query('SELECT * FROM phase_requirements ORDER BY phase_key, sort_order');
    
    if (existingReqs.rows.length > 0) {
      return res.json({ requirements: existingReqs.rows });
    }

    // If no requirements exist, insert default requirements
    const defaultRequirements = [
      // Onboarding (ONB)
      { phase_key: 'ONB', requirement_type: 'form', requirement_text: 'Complete intake form', is_mandatory: true, sort_order: 1 },
      { phase_key: 'ONB', requirement_type: 'agreement', requirement_text: 'Sign service agreement', is_mandatory: true, sort_order: 2 },
      { phase_key: 'ONB', requirement_type: 'payment', requirement_text: 'Pay deposit invoice', is_mandatory: true, sort_order: 3 },
      
      // Ideation (IDEA)
      { phase_key: 'IDEA', requirement_type: 'review', requirement_text: 'Review creative brief', is_mandatory: true, sort_order: 1 },
      { phase_key: 'IDEA', requirement_type: 'approval', requirement_text: 'Approve project direction', is_mandatory: true, sort_order: 2 },
      { phase_key: 'IDEA', requirement_type: 'feedback', requirement_text: 'Provide initial feedback', is_mandatory: false, sort_order: 3 },
      
      // Design (DSGN)
      { phase_key: 'DSGN', requirement_type: 'review', requirement_text: 'Review initial designs', is_mandatory: false, sort_order: 1 },
      { phase_key: 'DSGN', requirement_type: 'feedback', requirement_text: 'Provide design feedback', is_mandatory: false, sort_order: 2 },
      
      // Review & Feedback (REV)
      { phase_key: 'REV', requirement_type: 'approval', requirement_text: 'Approve all deliverables', is_mandatory: true, sort_order: 1 },
      { phase_key: 'REV', requirement_type: 'proof', requirement_text: 'Complete proof approval (if print)', is_mandatory: false, sort_order: 2 },
      { phase_key: 'REV', requirement_type: 'feedback', requirement_text: 'Request changes (if needed)', is_mandatory: false, sort_order: 3 },
      
      // Production/Build (PROD)
      { phase_key: 'PROD', requirement_type: 'monitor', requirement_text: 'Monitor production progress', is_mandatory: false, sort_order: 1 },
      { phase_key: 'PROD', requirement_type: 'check', requirement_text: 'Approve press check (if applicable)', is_mandatory: false, sort_order: 2 },
      
      // Payment (PAY)
      { phase_key: 'PAY', requirement_type: 'payment', requirement_text: 'Pay final invoice', is_mandatory: true, sort_order: 1 },
      
      // Sign-off & Docs (SIGN)
      { phase_key: 'SIGN', requirement_type: 'agreement', requirement_text: 'Sign completion agreement', is_mandatory: true, sort_order: 1 },
      { phase_key: 'SIGN', requirement_type: 'download', requirement_text: 'Download final assets', is_mandatory: false, sort_order: 2 },
      { phase_key: 'SIGN', requirement_type: 'review', requirement_text: 'Review documentation', is_mandatory: false, sort_order: 3 },
      
      // Launch (LAUNCH)
      { phase_key: 'LAUNCH', requirement_type: 'confirm', requirement_text: 'Confirm receipt of deliverables', is_mandatory: false, sort_order: 1 },
      { phase_key: 'LAUNCH', requirement_type: 'feedback', requirement_text: 'Provide testimonial', is_mandatory: false, sort_order: 2 },
      { phase_key: 'LAUNCH', requirement_type: 'launch', requirement_text: 'Launch/deploy project', is_mandatory: false, sort_order: 3 }
    ];

    // Insert default requirements
    for (const req of defaultRequirements) {
      await db.query(
        `INSERT INTO phase_requirements (phase_key, requirement_type, requirement_text, is_mandatory, sort_order) 
         VALUES ($1, $2, $3, $4, $5)`,
        [req.phase_key, req.requirement_type, req.requirement_text, req.is_mandatory, req.sort_order]
      );
    }

    const requirements = await db.query('SELECT * FROM phase_requirements ORDER BY phase_key, sort_order');
    res.json({ requirements: requirements.rows });
  } catch (error) {
    console.error('Error fetching phase requirements:', error);
    res.status(500).json({ error: 'Failed to fetch phase requirements' });
  }
});

// Get requirements for a specific phase
router.get('/requirements/:phaseKey', authenticateToken, async (req, res) => {
  try {
    const { phaseKey } = req.params;
    const requirements = await db.query(
      'SELECT * FROM phase_requirements WHERE phase_key = $1 ORDER BY sort_order',
      [phaseKey]
    );
    
    res.json({ requirements: requirements.rows });
  } catch (error) {
    console.error('Error fetching phase requirements:', error);
    res.status(500).json({ error: 'Failed to fetch phase requirements' });
  }
});

// Update phase requirement completion status for a project
router.post('/projects/:projectId/requirements/:requirementId', authenticateToken, async (req, res) => {
  try {
    const { projectId, requirementId } = req.params;
    const { completed } = req.body;
    const userId = req.user.id;
    
    // Verify user has access to this project
    const projectResult = await db.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    if (req.user.role !== 'admin' && project.client_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if tracking record exists
    const existing = await db.query(
      'SELECT * FROM project_phase_requirements WHERE project_id = $1 AND requirement_id = $2',
      [projectId, requirementId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE project_phase_requirements 
         SET completed = $1, completed_at = $2, completed_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE project_id = $4 AND requirement_id = $5`,
        [completed, completed ? new Date() : null, completed ? userId : null, projectId, requirementId]
      );
    } else {
      // Create new tracking record
      await db.query(
        `INSERT INTO project_phase_requirements 
         (project_id, requirement_id, completed, completed_at, completed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, requirementId, completed, completed ? new Date() : null, completed ? userId : null]
      );
    }
    
    // Get requirement details for notification
    const reqDetails = await db.query(
      'SELECT * FROM phase_requirements WHERE id = $1',
      [requirementId]
    );
    const requirement = reqDetails.rows[0];
    
    // Log activity
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description, metadata)
       VALUES ($1, $2, 'project', $3, $4, $5)`,
      [
        userId,
        completed ? 'requirement_completed' : 'requirement_uncompleted',
        projectId,
        `${completed ? 'Completed' : 'Marked incomplete'}: ${requirement.requirement_text}`,
        JSON.stringify({ 
          requirement_id: requirementId,
          requirement_text: requirement.requirement_text,
          phase_key: requirement.phase_key
        })
      ]
    );
    
    // Send notification email if requirement is completed
    if (completed && process.env.SMTP_HOST) {
      try {
        const { sendTemplateEmail } = await import('../utils/emailService.js');
        
        // Get client details
        const clientResult = await db.query(
          'SELECT email, CONCAT(first_name, \' \', last_name) as name FROM users WHERE id = $1',
          [project.client_id]
        );
        const client = clientResult.rows[0];
        
        if (client && client.email) {
          await sendTemplateEmail(
            client.email,
            'requirement-completed',
            {
              clientName: client.name,
              projectName: project.name,
              requirementText: requirement.requirement_text,
              phaseKey: requirement.phase_key
            }
          );
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
    }
    
    // Check if all mandatory requirements for current phase are complete
    const currentPhaseKey = project.current_phase_key;
    
    const mandatoryReqs = await db.query(
      `SELECT pr.*, COALESCE(ppr.completed, false) as completed
       FROM phase_requirements pr
       LEFT JOIN project_phase_requirements ppr 
         ON pr.id = ppr.requirement_id AND ppr.project_id = $1
       WHERE pr.phase_key = $2 AND pr.is_mandatory = true`,
      [projectId, currentPhaseKey]
    );
    
    const allMandatoryComplete = mandatoryReqs.rows.every(req => req.completed);
    
    if (allMandatoryComplete) {
      // Get next phase
      const phaseOrder = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
      const phaseNames = {
        'ONB': 'Onboarding',
        'IDEA': 'Ideation',
        'DSGN': 'Design',
        'REV': 'Review & Feedback',
        'PROD': 'Production/Build',
        'PAY': 'Payment',
        'SIGN': 'Sign-off & Docs',
        'LAUNCH': 'Launch'
      };
      
      const currentIndex = phaseOrder.indexOf(currentPhaseKey);
      let autoAdvanced = false;
      let nextPhaseName = '';
      
      // Check if auto-advance is enabled (can be configured)
      const autoAdvanceEnabled = process.env.AUTO_ADVANCE_PHASES === 'true' || false;
      
      if (autoAdvanceEnabled && currentIndex < phaseOrder.length - 1) {
        const nextPhaseKey = phaseOrder[currentIndex + 1];
        const nextPhaseIndex = currentIndex + 1;
        nextPhaseName = phaseNames[nextPhaseKey];
        
        // Update project to next phase
        await db.query(
          `UPDATE projects 
           SET current_phase_key = $1, current_phase_index = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [nextPhaseKey, nextPhaseIndex, projectId]
        );
        
        // Update project_phases table
        await db.query(
          `UPDATE project_phases 
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP
           WHERE project_id = $1 AND phase_key = $2`,
          [projectId, currentPhaseKey]
        );
        
        await db.query(
          `UPDATE project_phases 
           SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
           WHERE project_id = $1 AND phase_key = $2`,
          [projectId, nextPhaseKey]
        );
        
        autoAdvanced = true;
        
        // Log phase advancement
        await db.query(
          `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description, metadata)
           VALUES ($1, 'phase_advanced', 'project', $2, $3, $4)`,
          [
            userId,
            projectId,
            `Phase automatically advanced from ${phaseNames[currentPhaseKey]} to ${nextPhaseName}`,
            JSON.stringify({ 
              from_phase: currentPhaseKey,
              to_phase: nextPhaseKey,
              auto_advanced: true
            })
          ]
        );
        
        // Send phase advancement notification
        if (process.env.SMTP_HOST) {
          try {
            const { sendTemplateEmail } = await import('../utils/emailService.js');
            const clientResult = await db.query(
              'SELECT email, CONCAT(first_name, \' \', last_name) as name FROM users WHERE id = $1',
              [project.client_id]
            );
            const client = clientResult.rows[0];
            
            if (client && client.email) {
              await sendTemplateEmail(
                client.email,
                'phase-advanced',
                {
                  clientName: client.name,
                  projectName: project.name,
                  fromPhase: phaseNames[currentPhaseKey],
                  toPhase: nextPhaseName
                }
              );
            }
          } catch (emailError) {
            console.error('Failed to send phase advancement email:', emailError);
          }
        }
      }
      
      res.json({ 
        success: true, 
        allMandatoryComplete: true,
        autoAdvanced,
        nextPhaseName,
        message: autoAdvanced 
          ? `Phase advanced to ${nextPhaseName}!` 
          : 'All mandatory requirements complete. Phase can advance.'
      });
    } else {
      res.json({ 
        success: true, 
        allMandatoryComplete: false,
        message: 'Requirement status updated'
      });
    }
  } catch (error) {
    console.error('Error updating requirement status:', error);
    res.status(500).json({ error: 'Failed to update requirement status' });
  }
});

// Admin: Create new requirement
router.post('/requirements', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { phase_key, requirement_text, requirement_type, requirement_key, is_mandatory, sort_order } = req.body;
    
    const result = await db.query(
      `INSERT INTO phase_requirements 
       (phase_key, requirement_text, requirement_type, requirement_key, is_mandatory, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [phase_key, requirement_text, requirement_type, requirement_key, is_mandatory, sort_order]
    );
    
    res.json({ success: true, requirement: result.rows[0] });
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

// Admin: Update requirement
router.put('/requirements/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { phase_key, requirement_text, requirement_type, requirement_key, is_mandatory, sort_order } = req.body;
    
    const result = await db.query(
      `UPDATE phase_requirements 
       SET phase_key = $2, requirement_text = $3, requirement_type = $4, 
           requirement_key = $5, is_mandatory = $6, sort_order = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, phase_key, requirement_text, requirement_type, requirement_key, is_mandatory, sort_order]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    res.json({ success: true, requirement: result.rows[0] });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// Admin: Delete requirement
router.delete('/requirements/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM phase_requirements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    
    res.json({ success: true, message: 'Requirement deleted successfully' });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
});

export default router;