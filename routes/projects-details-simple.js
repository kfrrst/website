import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';

const router = express.Router();

// Simplified project details endpoint for debugging
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log('Simple details - projectId:', projectId, 'userId:', userId);
    
    // Simple project query
    const projectQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.priority,
        p.progress_percentage,
        p.budget_amount,
        p.due_date,
        p.created_at
      FROM projects p
      WHERE p.id = $1 AND p.is_active = true
        AND (
          $2 = 'admin' OR 
          p.client_id = $3
        )
    `;
    
    const projectResult = await dbQuery(projectQuery, [projectId, userRole, userId]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const project = projectResult.rows[0];
    
    // Simple phase query
    const phasesQuery = `
      SELECT 
        phase_number,
        phase_name,
        status
      FROM project_phase_tracking
      WHERE project_id = $1
      ORDER BY phase_number
    `;
    
    let phases = [];
    try {
      const phasesResult = await dbQuery(phasesQuery, [projectId]);
      phases = phasesResult.rows;
    } catch (e) {
      console.error('Phase query error:', e);
    }
    
    // Return simple response
    res.json({
      project: {
        ...project,
        phases: phases.length > 0 ? phases : [
          { phase_number: 1, phase_name: 'Onboarding', status: 'pending' },
          { phase_number: 2, phase_name: 'Ideation', status: 'pending' },
          { phase_number: 3, phase_name: 'Design', status: 'pending' },
          { phase_number: 4, phase_name: 'Review', status: 'pending' },
          { phase_number: 5, phase_name: 'Production', status: 'pending' },
          { phase_number: 6, phase_name: 'Payment', status: 'pending' },
          { phase_number: 7, phase_name: 'Sign-off', status: 'pending' },
          { phase_number: 8, phase_name: 'Delivery', status: 'pending' }
        ],
        current_phase: 1,
        milestones: [],
        recent_activity: [],
        statistics: {
          file_count: 0,
          message_count: 0,
          invoice_count: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Simple details error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project details',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;