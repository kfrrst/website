import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// =============================================================================
// GET /api/activity - Simple recent activity for dashboard
// =============================================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Simple fallback query using only basic tables that should exist
    const fallbackQuery = `
      SELECT 
        p.id::text as id,
        'project' as activity_type,
        'Project: ' || p.name as description,
        p.created_at,
        p.name as project_name,
        'System' as user_name
      FROM projects p
      WHERE p.client_id = $1
      AND p.created_at > NOW() - INTERVAL '30 days'
      ORDER BY p.created_at DESC
      LIMIT $2
    `;
    
    const result = await dbQuery(fallbackQuery, [userId, limit]);

    const activities = result.rows.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      description: activity.description,
      project_name: activity.project_name,
      user_name: activity.user_name,
      timestamp: activity.created_at,
      timeAgo: formatTimeAgo(activity.created_at)
    }));

    res.json({
      success: true,
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching dashboard activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      activities: []
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return time.toLocaleDateString();
  }
}

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

/**
 * Log activity helper function
 */
const logActivity = async (client, data) => {
  const {
    user_id,
    project_id,
    phase_id = null,
    activity_type,
    description,
    metadata = {},
    entity_type = null,
    entity_id = null
  } = data;

  const activityId = uuidv4();
  
  await client.query(`
    INSERT INTO project_activities (
      id, user_id, project_id, phase_id, activity_type, description, 
      metadata, entity_type, entity_id, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `, [
    activityId,
    user_id,
    project_id,
    phase_id,
    activity_type,
    description,
    JSON.stringify(metadata),
    entity_type,
    entity_id
  ]);
  
  return activityId;
};

// =============================================================================
// GET /api/activities/project/:projectId - Get project activities
// =============================================================================
router.get('/project/:projectId',
  authenticateToken,
  [
    param('projectId').isUUID().withMessage('Invalid project ID format'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('activity_type').optional().isString().withMessage('Activity type must be a string'),
    query('phase_id').optional().isUUID().withMessage('Invalid phase ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const activityType = req.query.activity_type;
      const phaseId = req.query.phase_id;
      
      // Verify user has access to this project
      const accessQuery = `
        SELECT p.id, p.name, p.client_id, p.admin_id
        FROM projects p
        WHERE p.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const accessResult = await dbQuery(accessQuery, [projectId, userId, isAdmin]);
      
      if (accessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      
      // Build query filters
      let whereClause = 'WHERE pa.project_id = $1';
      const queryParams = [projectId];
      let paramCount = 1;
      
      if (activityType) {
        paramCount++;
        whereClause += ` AND pa.activity_type = $${paramCount}`;
        queryParams.push(activityType);
      }
      
      if (phaseId) {
        paramCount++;
        whereClause += ` AND pa.phase_id = $${paramCount}`;
        queryParams.push(phaseId);
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM project_activities pa
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, queryParams);
      const totalActivities = parseInt(countResult.rows[0].total);
      
      // Get activities
      const activitiesQuery = `
        SELECT 
          pa.id,
          pa.user_id,
          pa.project_id,
          pa.phase_id,
          pa.activity_type,
          pa.description,
          pa.metadata,
          pa.entity_type,
          pa.entity_id,
          pa.created_at,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          pp.name as phase_name,
          pp.order_index as phase_order
        FROM project_activities pa
        LEFT JOIN users u ON pa.user_id = u.id
        LEFT JOIN project_phases pp ON pa.phase_id = pp.id
        ${whereClause}
        ORDER BY pa.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const activitiesResult = await dbQuery(activitiesQuery, queryParams);
      
      const activities = activitiesResult.rows.map(activity => ({
        id: activity.id,
        user_id: activity.user_id,
        user_name: activity.user_name,
        user_email: activity.user_email,
        project_id: activity.project_id,
        phase_id: activity.phase_id,
        phase_name: activity.phase_name,
        phase_order: activity.phase_order,
        activity_type: activity.activity_type,
        description: activity.description,
        metadata: activity.metadata,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        created_at: activity.created_at
      }));
      
      res.json({
        activities,
        pagination: {
          total: totalActivities,
          limit,
          offset,
          hasMore: offset + limit < totalActivities
        }
      });
      
    } catch (error) {
      console.error('Error fetching project activities:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  }
);

// =============================================================================
// GET /api/activities/phase/:phaseId - Get phase activities
// =============================================================================
router.get('/phase/:phaseId',
  authenticateToken,
  [
    param('phaseId').isUUID().withMessage('Invalid phase ID format'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { phaseId } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      // Verify user has access to this phase
      const accessQuery = `
        SELECT pp.*, p.client_id, p.admin_id
        FROM project_phases pp
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const accessResult = await dbQuery(accessQuery, [phaseId, userId, isAdmin]);
      
      if (accessResult.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found or access denied' });
      }
      
      const phase = accessResult.rows[0];
      
      // Get activities for this phase
      const activitiesQuery = `
        SELECT 
          pa.id,
          pa.user_id,
          pa.project_id,
          pa.phase_id,
          pa.activity_type,
          pa.description,
          pa.metadata,
          pa.entity_type,
          pa.entity_id,
          pa.created_at,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM project_activities pa
        LEFT JOIN users u ON pa.user_id = u.id
        WHERE pa.phase_id = $1
        ORDER BY pa.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const activitiesResult = await dbQuery(activitiesQuery, [phaseId, limit, offset]);
      
      const activities = activitiesResult.rows.map(activity => ({
        id: activity.id,
        user_id: activity.user_id,
        user_name: activity.user_name,
        user_email: activity.user_email,
        project_id: activity.project_id,
        phase_id: activity.phase_id,
        activity_type: activity.activity_type,
        description: activity.description,
        metadata: activity.metadata,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        created_at: activity.created_at
      }));
      
      res.json({
        activities,
        phase: {
          id: phase.id,
          name: phase.name,
          order_index: phase.order_index,
          status: phase.status
        }
      });
      
    } catch (error) {
      console.error('Error fetching phase activities:', error);
      res.status(500).json({ error: 'Failed to fetch phase activities' });
    }
  }
);

// =============================================================================
// POST /api/activities - Create new activity
// =============================================================================
router.post('/',
  authenticateToken,
  [
    body('project_id').isUUID().withMessage('Invalid project ID format'),
    body('phase_id').optional().isUUID().withMessage('Invalid phase ID format'),
    body('activity_type').isString().isLength({ min: 1, max: 50 }).withMessage('Activity type required (max 50 chars)'),
    body('description').isString().isLength({ min: 1, max: 1000 }).withMessage('Description required (max 1000 chars)'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    body('entity_type').optional().isString().withMessage('Entity type must be a string'),
    body('entity_id').optional().isString().withMessage('Entity ID must be a string')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { project_id, phase_id, activity_type, description, metadata, entity_type, entity_id } = req.body;
      
      // Verify user has access to this project
      const accessQuery = `
        SELECT p.id, p.name, p.client_id, p.admin_id
        FROM projects p
        WHERE p.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const accessResult = await client.query(accessQuery, [project_id, userId, isAdmin]);
      
      if (accessResult.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      
      // If phase_id is provided, verify access to phase
      if (phase_id) {
        const phaseAccessQuery = `
          SELECT pp.id FROM project_phases pp
          WHERE pp.id = $1 AND pp.project_id = $2
        `;
        
        const phaseAccessResult = await client.query(phaseAccessQuery, [phase_id, project_id]);
        
        if (phaseAccessResult.rows.length === 0) {
          await rollbackTransaction(client);
          return res.status(404).json({ error: 'Phase not found or not part of project' });
        }
      }
      
      // Create activity
      const activityId = await logActivity(client, {
        user_id: userId,
        project_id,
        phase_id,
        activity_type,
        description,
        metadata: metadata || {},
        entity_type,
        entity_id
      });
      
      await commitTransaction(client);
      
      res.status(201).json({
        message: 'Activity created successfully',
        activity_id: activityId
      });
      
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating activity:', error);
      res.status(500).json({ error: 'Failed to create activity' });
    }
  }
);

// =============================================================================
// POST /api/activities/:id/reply - Reply to activity
// =============================================================================
router.post('/:id/reply',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid activity ID format'),
    body('reply').isString().isLength({ min: 1, max: 1000 }).withMessage('Reply required (max 1000 chars)')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { id: activityId } = req.params;
      const { reply } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Get original activity and verify access
      const activityQuery = `
        SELECT pa.*, p.client_id, p.admin_id
        FROM project_activities pa
        JOIN projects p ON pa.project_id = p.id
        WHERE pa.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const activityResult = await client.query(activityQuery, [activityId, userId, isAdmin]);
      
      if (activityResult.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Activity not found or access denied' });
      }
      
      const originalActivity = activityResult.rows[0];
      
      // Create reply activity
      const replyActivityId = await logActivity(client, {
        user_id: userId,
        project_id: originalActivity.project_id,
        phase_id: originalActivity.phase_id,
        activity_type: 'reply',
        description: `Replied to: ${originalActivity.description}`,
        metadata: {
          reply_text: reply,
          parent_activity_id: activityId,
          original_activity_type: originalActivity.activity_type
        },
        entity_type: 'activity',
        entity_id: activityId
      });
      
      await commitTransaction(client);
      
      res.status(201).json({
        message: 'Reply added successfully', 
        reply_id: replyActivityId
      });
      
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
    }
  }
);

// =============================================================================
// POST /api/activities/:id/like - Toggle like on activity
// =============================================================================
router.post('/:id/like',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid activity ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { id: activityId } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Verify access to activity
      const activityQuery = `
        SELECT pa.*, p.client_id, p.admin_id
        FROM project_activities pa
        JOIN projects p ON pa.project_id = p.id
        WHERE pa.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const activityResult = await client.query(activityQuery, [activityId, userId, isAdmin]);
      
      if (activityResult.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Activity not found or access denied' });
      }
      
      // Check if user already liked this activity
      const existingLikeQuery = `
        SELECT id FROM activity_likes 
        WHERE activity_id = $1 AND user_id = $2
      `;
      
      const existingLikeResult = await client.query(existingLikeQuery, [activityId, userId]);
      
      let liked = false;
      
      if (existingLikeResult.rows.length > 0) {
        // Unlike - remove existing like
        await client.query('DELETE FROM activity_likes WHERE activity_id = $1 AND user_id = $2', [activityId, userId]);
        liked = false;
      } else {
        // Like - add new like
        await client.query(
          'INSERT INTO activity_likes (id, activity_id, user_id, created_at) VALUES ($1, $2, $3, NOW())',
          [uuidv4(), activityId, userId]
        );
        liked = true;
      }
      
      // Get updated like count
      const likeCountQuery = 'SELECT COUNT(*) as count FROM activity_likes WHERE activity_id = $1';
      const likeCountResult = await client.query(likeCountQuery, [activityId]);
      const likeCount = parseInt(likeCountResult.rows[0].count);
      
      await commitTransaction(client);
      
      res.json({
        message: liked ? 'Activity liked' : 'Activity unliked',
        liked,
        like_count: likeCount
      });
      
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error toggling like:', error);
      res.status(500).json({ error: 'Failed to toggle like' });
    }
  }
);

// =============================================================================
// Helper function to log phase transitions (exported for use in other routes)
// =============================================================================
export const logPhaseTransition = async (client, data) => {
  const { user_id, project_id, from_phase_id, to_phase_id, reason = null } = data;
  
  // Get phase names for description
  let fromPhaseName = 'Unknown';
  let toPhaseName = 'Unknown';
  
  if (from_phase_id) {
    const fromPhaseResult = await client.query('SELECT name FROM project_phases WHERE id = $1', [from_phase_id]);
    if (fromPhaseResult.rows.length > 0) {
      fromPhaseName = fromPhaseResult.rows[0].name;
    }
  }
  
  if (to_phase_id) {
    const toPhaseResult = await client.query('SELECT name FROM project_phases WHERE id = $1', [to_phase_id]);
    if (toPhaseResult.rows.length > 0) {
      toPhaseName = toPhaseResult.rows[0].name;
    }
  }
  
  const description = from_phase_id 
    ? `Phase transition: ${fromPhaseName} → ${toPhaseName}`
    : `Phase started: ${toPhaseName}`;
  
  return await logActivity(client, {
    user_id,
    project_id,
    phase_id: to_phase_id,
    activity_type: 'phase_transition',
    description,
    metadata: {
      from_phase_id,
      to_phase_id,
      from_phase_name: fromPhaseName,
      to_phase_name: toPhaseName,
      reason,
      transition_timestamp: new Date().toISOString()
    },
    entity_type: 'phase',
    entity_id: to_phase_id
  });
};

// =============================================================================
// Helper function to log phase approvals
// =============================================================================
export const logPhaseApproval = async (client, data) => {
  const { user_id, project_id, phase_id, approved, notes = null } = data;
  
  // Get phase name
  const phaseResult = await client.query('SELECT name FROM project_phases WHERE id = $1', [phase_id]);
  const phaseName = phaseResult.rows.length > 0 ? phaseResult.rows[0].name : 'Unknown Phase';
  
  const activityType = approved ? 'phase_approval' : 'phase_rejection';
  const description = approved 
    ? `Approved phase: ${phaseName}`
    : `Requested changes for phase: ${phaseName}`;
  
  return await logActivity(client, {
    user_id,
    project_id,
    phase_id,
    activity_type: activityType,
    description,
    metadata: {
      approved,
      notes,
      phase_name: phaseName,
      approval_timestamp: new Date().toISOString()
    },
    entity_type: 'phase',
    entity_id: phase_id
  });
};

export default router;