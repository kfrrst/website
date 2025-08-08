import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';

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

// Helper function to calculate time difference in seconds
const calculateDuration = (startTime, endTime) => {
  return Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
};

// =============================================================================
// GET /api/time-tracking - List time entries
// =============================================================================
router.get('/',
  authenticateToken,
  [
    query('project_id').optional().isUUID().withMessage('Invalid project ID format'),
    query('user_id').optional().isUUID().withMessage('Invalid user ID format'),
    query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { 
        project_id, 
        user_id, 
        start_date, 
        end_date,
        page = 1,
        limit = 50
      } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 0;

      // Non-admin users can only see their own entries or entries for projects they have access to
      if (!isAdmin) {
        paramIndex++;
        whereConditions.push(`(te.user_id = $${paramIndex} OR p.client_id = (SELECT client_id FROM users WHERE id = $${paramIndex}))`);
        queryParams.push(userId);
      }

      // Filter by project
      if (project_id) {
        paramIndex++;
        whereConditions.push(`te.project_id = $${paramIndex}`);
        queryParams.push(project_id);
      }

      // Filter by user (admin only)
      if (user_id && isAdmin) {
        paramIndex++;
        whereConditions.push(`te.user_id = $${paramIndex}`);
        queryParams.push(user_id);
      }

      // Filter by date range
      if (start_date) {
        paramIndex++;
        whereConditions.push(`te.start_time >= $${paramIndex}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        paramIndex++;
        whereConditions.push(`te.start_time <= $${paramIndex}`);
        queryParams.push(end_date);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get time entries
      const entriesQuery = `
        SELECT 
          te.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          p.name as project_name,
          c.company_name as client_name,
          CASE 
            WHEN te.end_time IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (te.end_time - te.start_time))
            ELSE 
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - te.start_time))
          END as duration_seconds
        FROM time_entries te
        LEFT JOIN users u ON te.user_id = u.id
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        ${whereClause}
        ORDER BY te.start_time DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(limit, offset);
      const result = await dbQuery(entriesQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        ${whereClause}
      `;
      
      const countResult = await dbQuery(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Format entries
      const entries = result.rows.map(entry => ({
        ...entry,
        duration_seconds: parseInt(entry.duration_seconds) || 0,
        duration_formatted: formatDuration(parseInt(entry.duration_seconds) || 0),
        is_active: !entry.end_time
      }));

      res.json({
        entries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ error: 'Failed to fetch time entries' });
    }
  }
);

// Helper function to format duration
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// =============================================================================
// POST /api/time-tracking/start - Start time tracking
// =============================================================================
router.post('/start',
  authenticateToken,
  [
    body('project_id').isUUID().withMessage('Valid project ID is required'),
    body('task_description').trim().isLength({ min: 1, max: 500 }).withMessage('Task description is required (max 500 chars)'),
    body('billable_rate').optional().isNumeric().withMessage('Billable rate must be numeric'),
    body('is_billable').optional().isBoolean().withMessage('is_billable must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { project_id, task_description, billable_rate, is_billable = false } = req.body;

      const timeEntry = await withTransaction(async (client) => {
        // Check if user has access to this project
        const projectAccess = await client.query(
          `SELECT p.*, c.contact_person 
           FROM projects p 
           JOIN clients c ON p.client_id = c.id
           WHERE p.id = $1 AND (
             $2 = true OR 
             p.client_id = (SELECT client_id FROM users WHERE id = $3)
           )`,
          [project_id, req.user.role === 'admin', userId]
        );

        if (projectAccess.rows.length === 0) {
          throw new Error('Project not found or access denied');
        }

        // Stop any currently active timer for this user
        await client.query(
          `UPDATE time_entries 
           SET end_time = CURRENT_TIMESTAMP 
           WHERE user_id = $1 AND end_time IS NULL`,
          [userId]
        );

        // Create new time entry
        const insertQuery = `
          INSERT INTO time_entries (
            user_id, project_id, task_description, start_time, 
            billable_rate, is_billable
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          userId, project_id, task_description, billable_rate, is_billable
        ]);

        const newEntry = result.rows[0];

        // Log activity
        await logActivity(
          client,
          userId,
          'time_entry',
          newEntry.id,
          'started',
          `Time tracking started: ${task_description}`,
          {
            project_id,
            is_billable,
            billable_rate
          }
        );

        return newEntry;
      });

      res.status(201).json({
        message: 'Time tracking started successfully',
        entry: {
          ...timeEntry,
          is_active: true,
          duration_seconds: 0,
          duration_formatted: '0s'
        }
      });

    } catch (error) {
      console.error('Error starting time tracking:', error);
      if (error.message === 'Project not found or access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to start time tracking' });
    }
  }
);

// =============================================================================
// PUT /api/time-tracking/:id/stop - Stop time tracking
// =============================================================================
router.put('/:id/stop',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid time entry ID format'),
    body('end_notes').optional().trim().isLength({ max: 1000 }).withMessage('End notes max 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const entryId = req.params.id;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { end_notes } = req.body;

      const stoppedEntry = await withTransaction(async (client) => {
        // Get current entry and check permissions
        const entryQuery = `
          SELECT te.*, p.name as project_name
          FROM time_entries te
          LEFT JOIN projects p ON te.project_id = p.id
          WHERE te.id = $1 AND te.end_time IS NULL AND (
            te.user_id = $2 OR $3 = true
          )
        `;

        const entryResult = await client.query(entryQuery, [entryId, userId, isAdmin]);

        if (entryResult.rows.length === 0) {
          throw new Error('Active time entry not found or access denied');
        }

        const entry = entryResult.rows[0];

        // Stop the timer
        const updateQuery = `
          UPDATE time_entries 
          SET end_time = CURRENT_TIMESTAMP, end_notes = $1
          WHERE id = $2
          RETURNING *, 
            EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
        `;

        const result = await client.query(updateQuery, [end_notes || null, entryId]);
        const stoppedEntry = result.rows[0];

        // Log activity
        const duration = parseInt(stoppedEntry.duration_seconds);
        await logActivity(
          client,
          userId,
          'time_entry',
          entryId,
          'stopped',
          `Time tracking stopped: ${entry.task_description} (${formatDuration(duration)})`,
          {
            duration_seconds: duration,
            project_id: entry.project_id
          }
        );

        return stoppedEntry;
      });

      const duration = parseInt(stoppedEntry.duration_seconds) || 0;

      res.json({
        message: 'Time tracking stopped successfully',
        entry: {
          ...stoppedEntry,
          is_active: false,
          duration_seconds: duration,
          duration_formatted: formatDuration(duration)
        }
      });

    } catch (error) {
      console.error('Error stopping time tracking:', error);
      if (error.message === 'Active time entry not found or access denied') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to stop time tracking' });
    }
  }
);

// =============================================================================
// GET /api/time-tracking/active - Get active time entry for user
// =============================================================================
router.get('/active',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const activeQuery = `
        SELECT 
          te.*,
          p.name as project_name,
          c.company_name as client_name,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - te.start_time)) as duration_seconds
        FROM time_entries te
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE te.user_id = $1 AND te.end_time IS NULL
        ORDER BY te.start_time DESC
        LIMIT 1
      `;

      const result = await dbQuery(activeQuery, [userId]);

      if (result.rows.length === 0) {
        return res.json({ active_entry: null });
      }

      const entry = result.rows[0];
      const duration = parseInt(entry.duration_seconds) || 0;

      res.json({
        active_entry: {
          ...entry,
          is_active: true,
          duration_seconds: duration,
          duration_formatted: formatDuration(duration)
        }
      });

    } catch (error) {
      console.error('Error fetching active time entry:', error);
      res.status(500).json({ error: 'Failed to fetch active time entry' });
    }
  }
);

// =============================================================================
// GET /api/time-tracking/reports - Time tracking reports
// =============================================================================
router.get('/reports',
  authenticateToken,
  [
    query('start_date').isISO8601().withMessage('Valid start date is required'),
    query('end_date').isISO8601().withMessage('Valid end date is required'),
    query('project_id').optional().isUUID().withMessage('Invalid project ID format'),
    query('user_id').optional().isUUID().withMessage('Invalid user ID format'),
    query('group_by').optional().isIn(['user', 'project', 'date', 'task']).withMessage('Invalid group_by option')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { start_date, end_date, project_id, user_id, group_by = 'project' } = req.query;

      // Build base conditions
      let whereConditions = ['te.end_time IS NOT NULL'];
      let queryParams = [];
      let paramIndex = 0;

      // Date range
      paramIndex++;
      whereConditions.push(`te.start_time >= $${paramIndex}`);
      queryParams.push(start_date);

      paramIndex++;
      whereConditions.push(`te.start_time <= $${paramIndex}`);
      queryParams.push(end_date);

      // Non-admin access control
      if (!isAdmin) {
        paramIndex++;
        whereConditions.push(`(te.user_id = $${paramIndex} OR p.client_id = (SELECT client_id FROM users WHERE id = $${paramIndex}))`);
        queryParams.push(userId);
      }

      // Optional filters
      if (project_id) {
        paramIndex++;
        whereConditions.push(`te.project_id = $${paramIndex}`);
        queryParams.push(project_id);
      }

      if (user_id && isAdmin) {
        paramIndex++;
        whereConditions.push(`te.user_id = $${paramIndex}`);
        queryParams.push(user_id);
      }

      const whereClause = whereConditions.join(' AND ');

      // Group by clause
      let groupByClause, selectClause;
      switch (group_by) {
        case 'user':
          selectClause = `
            u.first_name || ' ' || u.last_name as group_name,
            'user' as group_type,
            te.user_id as group_id
          `;
          groupByClause = 'GROUP BY te.user_id, u.first_name, u.last_name';
          break;
        case 'project':
          selectClause = `
            p.name as group_name,
            'project' as group_type,
            te.project_id as group_id
          `;
          groupByClause = 'GROUP BY te.project_id, p.name';
          break;
        case 'date':
          selectClause = `
            DATE(te.start_time) as group_name,
            'date' as group_type,
            DATE(te.start_time) as group_id
          `;
          groupByClause = 'GROUP BY DATE(te.start_time)';
          break;
        default:
          selectClause = `
            p.name as group_name,
            'project' as group_type,
            te.project_id as group_id
          `;
          groupByClause = 'GROUP BY te.project_id, p.name';
      }

      const reportQuery = `
        SELECT 
          ${selectClause},
          COUNT(te.id) as entry_count,
          SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time))) as total_seconds,
          AVG(EXTRACT(EPOCH FROM (te.end_time - te.start_time))) as average_seconds,
          SUM(CASE WHEN te.is_billable THEN EXTRACT(EPOCH FROM (te.end_time - te.start_time)) ELSE 0 END) as billable_seconds,
          SUM(CASE WHEN te.is_billable AND te.billable_rate > 0 
              THEN (EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600) * te.billable_rate 
              ELSE 0 END) as billable_amount
        FROM time_entries te
        LEFT JOIN users u ON te.user_id = u.id
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ${whereClause}
        ${groupByClause}
        ORDER BY total_seconds DESC
      `;

      const result = await dbQuery(reportQuery, queryParams);

      // Format results
      const reportData = result.rows.map(row => ({
        ...row,
        entry_count: parseInt(row.entry_count),
        total_seconds: parseInt(row.total_seconds) || 0,
        total_formatted: formatDuration(parseInt(row.total_seconds) || 0),
        average_seconds: parseInt(row.average_seconds) || 0,
        average_formatted: formatDuration(parseInt(row.average_seconds) || 0),
        billable_seconds: parseInt(row.billable_seconds) || 0,
        billable_formatted: formatDuration(parseInt(row.billable_seconds) || 0),
        billable_amount: parseFloat(row.billable_amount) || 0
      }));

      // Calculate totals
      const totals = {
        total_entries: reportData.reduce((sum, row) => sum + row.entry_count, 0),
        total_seconds: reportData.reduce((sum, row) => sum + row.total_seconds, 0),
        billable_seconds: reportData.reduce((sum, row) => sum + row.billable_seconds, 0),
        billable_amount: reportData.reduce((sum, row) => sum + row.billable_amount, 0)
      };

      totals.total_formatted = formatDuration(totals.total_seconds);
      totals.billable_formatted = formatDuration(totals.billable_seconds);

      res.json({
        report_data: reportData,
        totals,
        filters: {
          start_date,
          end_date,
          project_id,
          user_id,
          group_by
        }
      });

    } catch (error) {
      console.error('Error generating time tracking report:', error);
      res.status(500).json({ error: 'Failed to generate time tracking report' });
    }
  }
);

export default router;