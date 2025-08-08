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

// =============================================================================
// GET /api/team-collaboration/members - List team members
// =============================================================================
router.get('/members',
  authenticateToken,
  [
    query('project_id').optional().isUUID().withMessage('Invalid project ID format'),
    query('role').optional().isIn(['admin', 'client', 'team_member', 'contractor']).withMessage('Invalid role'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { project_id, role, status = 'active', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 0;

      // Filter by status
      paramIndex++;
      whereConditions.push(`tm.is_active = $${paramIndex}`);
      queryParams.push(status === 'active');

      // Filter by project
      if (project_id) {
        paramIndex++;
        whereConditions.push(`pt.project_id = $${paramIndex}`);
        queryParams.push(project_id);
        
        // Check project access
        if (!isAdmin) {
          paramIndex++;
          whereConditions.push(`(p.client_id = (SELECT client_id FROM users WHERE id = $${paramIndex}))`);
          queryParams.push(userId);
        }
      } else if (!isAdmin) {
        // Non-admin users can only see members from their client's projects
        paramIndex++;
        whereConditions.push(`EXISTS (
          SELECT 1 FROM project_team pt2
          JOIN projects p2 ON pt2.project_id = p2.id
          WHERE pt2.team_member_id = tm.id 
          AND p2.client_id = (SELECT client_id FROM users WHERE id = $${paramIndex})
        )`);
        queryParams.push(userId);
      }

      // Filter by role
      if (role) {
        paramIndex++;
        whereConditions.push(`tm.role = $${paramIndex}`);
        queryParams.push(role);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get team members
      const membersQuery = `
        SELECT DISTINCT
          tm.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.profile_image_url,
          array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as projects,
          array_agg(DISTINCT ts.skill_name) FILTER (WHERE ts.skill_name IS NOT NULL) as skills,
          COUNT(DISTINCT te.id) as total_time_entries,
          SUM(DISTINCT EXTRACT(EPOCH FROM (te.end_time - te.start_time))) as total_hours_worked
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        LEFT JOIN project_team pt ON tm.id = pt.team_member_id
        LEFT JOIN projects p ON pt.project_id = p.id
        LEFT JOIN team_member_skills ts ON tm.id = ts.team_member_id
        LEFT JOIN time_entries te ON tm.user_id = te.user_id AND te.end_time IS NOT NULL
        ${whereClause}
        GROUP BY tm.id, u.first_name, u.last_name, u.email, u.phone, u.profile_image_url
        ORDER BY u.first_name, u.last_name
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(limit, offset);
      const result = await dbQuery(membersQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT tm.id) as total
        FROM team_members tm
        LEFT JOIN project_team pt ON tm.id = pt.team_member_id
        LEFT JOIN projects p ON pt.project_id = p.id
        ${whereClause}
      `;
      
      const countResult = await dbQuery(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Format members
      const members = result.rows.map(member => ({
        ...member,
        full_name: `${member.first_name} ${member.last_name || ''}`.trim(),
        projects: member.projects || [],
        skills: member.skills || [],
        total_time_entries: parseInt(member.total_time_entries) || 0,
        total_hours_worked: member.total_hours_worked ? Math.round(member.total_hours_worked / 3600) : 0
      }));

      res.json({
        members,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  }
);

// =============================================================================
// POST /api/team-collaboration/members - Add team member
// =============================================================================
router.post('/members',
  authenticateToken,
  requireAdmin,
  [
    body('user_id').isUUID().withMessage('Valid user ID is required'),
    body('role').isIn(['admin', 'client', 'team_member', 'contractor']).withMessage('Valid role is required'),
    body('hourly_rate').optional().isNumeric().withMessage('Hourly rate must be numeric'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('skills.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each skill must be 1-50 chars'),
    body('projects').optional().isArray().withMessage('Projects must be an array'),
    body('projects.*').optional().isUUID().withMessage('Each project must be a valid UUID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { user_id, role, hourly_rate, skills = [], projects = [] } = req.body;

      const member = await withTransaction(async (client) => {
        // Check if user exists
        const userResult = await client.query(
          'SELECT id, first_name, last_name, email FROM users WHERE id = $1',
          [user_id]
        );

        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }

        const user = userResult.rows[0];

        // Check if already a team member
        const existingMember = await client.query(
          'SELECT id FROM team_members WHERE user_id = $1',
          [user_id]
        );

        if (existingMember.rows.length > 0) {
          throw new Error('User is already a team member');
        }

        // Create team member
        const insertQuery = `
          INSERT INTO team_members (user_id, role, hourly_rate)
          VALUES ($1, $2, $3)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [user_id, role, hourly_rate]);
        const newMember = result.rows[0];

        // Add skills
        if (skills.length > 0) {
          for (const skill of skills) {
            await client.query(
              'INSERT INTO team_member_skills (team_member_id, skill_name) VALUES ($1, $2)',
              [newMember.id, skill]
            );
          }
        }

        // Add to projects
        if (projects.length > 0) {
          for (const projectId of projects) {
            await client.query(
              'INSERT INTO project_team (project_id, team_member_id, role, assigned_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
              [projectId, newMember.id, role]
            );
          }
        }

        // Log activity
        await logActivity(
          client,
          req.user.id,
          'team_member',
          newMember.id,
          'created',
          `Team member added: ${user.first_name} ${user.last_name}`,
          {
            user_id,
            role,
            skills_count: skills.length,
            projects_count: projects.length
          }
        );

        return {
          ...newMember,
          ...user,
          skills,
          projects
        };
      });

      res.status(201).json({
        message: 'Team member added successfully',
        member
      });

    } catch (error) {
      console.error('Error adding team member:', error);
      if (error.message === 'User not found' || error.message === 'User is already a team member') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to add team member' });
    }
  }
);

// =============================================================================
// POST /api/team-collaboration/projects/:projectId/team - Assign team to project
// =============================================================================
router.post('/projects/:projectId/team',
  authenticateToken,
  requireAdmin,
  [
    param('projectId').isUUID().withMessage('Invalid project ID format'),
    body('team_members').isArray().withMessage('Team members must be an array'),
    body('team_members.*.member_id').isUUID().withMessage('Each member must have valid member_id'),
    body('team_members.*.role').isIn(['lead', 'member', 'reviewer', 'consultant']).withMessage('Valid role required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const { team_members } = req.body;

      const assignments = await withTransaction(async (client) => {
        // Check project exists
        const projectResult = await client.query(
          'SELECT id, name FROM projects WHERE id = $1',
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          throw new Error('Project not found');
        }

        const project = projectResult.rows[0];
        const assignedMembers = [];

        for (const assignment of team_members) {
          // Check if team member exists
          const memberResult = await client.query(
            `SELECT tm.*, u.first_name, u.last_name 
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.id = $1`,
            [assignment.member_id]
          );

          if (memberResult.rows.length === 0) {
            continue; // Skip invalid members
          }

          const member = memberResult.rows[0];

          // Check if already assigned
          const existingAssignment = await client.query(
            'SELECT id FROM project_team WHERE project_id = $1 AND team_member_id = $2',
            [projectId, assignment.member_id]
          );

          if (existingAssignment.rows.length === 0) {
            // Create new assignment
            await client.query(
              'INSERT INTO project_team (project_id, team_member_id, role, assigned_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
              [projectId, assignment.member_id, assignment.role]
            );
          } else {
            // Update existing assignment
            await client.query(
              'UPDATE project_team SET role = $1 WHERE project_id = $2 AND team_member_id = $3',
              [assignment.role, projectId, assignment.member_id]
            );
          }

          assignedMembers.push({
            member_id: assignment.member_id,
            name: `${member.first_name} ${member.last_name}`,
            role: assignment.role
          });
        }

        // Log activity
        await logActivity(
          client,
          req.user.id,
          'project',
          projectId,
          'team_assigned',
          `Team assigned to project: ${project.name}`,
          {
            members_count: assignedMembers.length,
            members: assignedMembers
          }
        );

        return assignedMembers;
      });

      res.json({
        message: 'Team assigned to project successfully',
        project_id: projectId,
        assigned_members: assignments
      });

    } catch (error) {
      console.error('Error assigning team to project:', error);
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to assign team to project' });
    }
  }
);

// =============================================================================
// GET /api/team-collaboration/projects/:projectId/team - Get project team
// =============================================================================
router.get('/projects/:projectId/team',
  authenticateToken,
  [
    param('projectId').isUUID().withMessage('Invalid project ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Check project access
      if (!isAdmin) {
        const accessCheck = await dbQuery(
          `SELECT id FROM projects 
           WHERE id = $1 AND client_id = (SELECT client_id FROM users WHERE id = $2)`,
          [projectId, userId]
        );

        if (accessCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Project not found or access denied' });
        }
      }

      // Get project team
      const teamQuery = `
        SELECT 
          pt.*,
          tm.role as member_role,
          tm.hourly_rate,
          u.first_name,
          u.last_name,
          u.email,
          u.profile_image_url,
          array_agg(DISTINCT ts.skill_name) FILTER (WHERE ts.skill_name IS NOT NULL) as skills,
          COUNT(DISTINCT te.id) as project_time_entries,
          SUM(DISTINCT EXTRACT(EPOCH FROM (te.end_time - te.start_time))) as project_hours
        FROM project_team pt
        JOIN team_members tm ON pt.team_member_id = tm.id
        JOIN users u ON tm.user_id = u.id
        LEFT JOIN team_member_skills ts ON tm.id = ts.team_member_id
        LEFT JOIN time_entries te ON tm.user_id = te.user_id 
          AND te.project_id = pt.project_id 
          AND te.end_time IS NOT NULL
        WHERE pt.project_id = $1
        GROUP BY pt.id, pt.project_id, pt.team_member_id, pt.role, pt.assigned_at,
                 tm.role, tm.hourly_rate, u.first_name, u.last_name, u.email, u.profile_image_url
        ORDER BY pt.role, u.first_name, u.last_name
      `;

      const result = await dbQuery(teamQuery, [projectId]);

      const teamMembers = result.rows.map(member => ({
        ...member,
        full_name: `${member.first_name} ${member.last_name || ''}`.trim(),
        skills: member.skills || [],
        project_time_entries: parseInt(member.project_time_entries) || 0,
        project_hours: member.project_hours ? Math.round(member.project_hours / 3600) : 0
      }));

      res.json({
        project_id: projectId,
        team_members: teamMembers
      });

    } catch (error) {
      console.error('Error fetching project team:', error);
      res.status(500).json({ error: 'Failed to fetch project team' });
    }
  }
);

// =============================================================================
// POST /api/team-collaboration/tasks - Create team task
// =============================================================================
router.post('/tasks',
  authenticateToken,
  [
    body('project_id').isUUID().withMessage('Valid project ID is required'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
    body('assigned_to').optional().isUUID().withMessage('Invalid assignee ID'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('due_date').optional().isISO8601().withMessage('Invalid due date format'),
    body('estimated_hours').optional().isNumeric().withMessage('Estimated hours must be numeric')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        project_id, 
        title, 
        description, 
        assigned_to, 
        priority = 'medium',
        due_date,
        estimated_hours
      } = req.body;

      const task = await withTransaction(async (client) => {
        // Check project access
        const projectResult = await client.query(
          `SELECT id, name FROM projects 
           WHERE id = $1 AND (
             $2 = true OR 
             client_id = (SELECT client_id FROM users WHERE id = $3)
           )`,
          [project_id, req.user.role === 'admin', userId]
        );

        if (projectResult.rows.length === 0) {
          throw new Error('Project not found or access denied');
        }

        // If assigned_to is provided, verify it's a valid team member
        if (assigned_to) {
          const memberCheck = await client.query(
            'SELECT id FROM team_members WHERE id = $1',
            [assigned_to]
          );

          if (memberCheck.rows.length === 0) {
            throw new Error('Assigned team member not found');
          }
        }

        // Create task
        const insertQuery = `
          INSERT INTO team_tasks (
            project_id, title, description, created_by, assigned_to,
            priority, status, due_date, estimated_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          project_id,
          title,
          description,
          userId,
          assigned_to,
          priority,
          due_date,
          estimated_hours
        ]);

        const newTask = result.rows[0];

        // Log activity
        await logActivity(
          client,
          userId,
          'team_task',
          newTask.id,
          'created',
          `Task created: ${title}`,
          {
            project_id,
            assigned_to,
            priority
          }
        );

        return newTask;
      });

      res.status(201).json({
        message: 'Task created successfully',
        task
      });

    } catch (error) {
      console.error('Error creating task:', error);
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

export default router;