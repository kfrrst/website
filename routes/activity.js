import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';

const router = express.Router();

// Get recent activity for the current user
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const isAdmin = req.user.role === 'admin';

    // For now, return mock data until activity logging is fully implemented
    const mockActivities = [
      {
        id: 1,
        type: 'project_update',
        description: 'Welcome to [RE]Print Studios Portal!',
        created_at: new Date().toISOString(),
        entity_type: 'system',
        entity_id: null
      }
    ];

    // Try to fetch real activities from activity_log table
    try {
      const activityQuery = `
        SELECT 
          id,
          action as type,
          description,
          created_at,
          entity_type,
          entity_id
        FROM activity_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await dbQuery(activityQuery, [userId, limit]);
      
      if (result.rows.length > 0) {
        res.json({ activities: result.rows });
      } else {
        res.json({ activities: mockActivities });
      }
    } catch (dbError) {
      console.log('Activity log table not available, using mock data');
      res.json({ activities: mockActivities });
    }

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;