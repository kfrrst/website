import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { sendTemplateEmail } from '../utils/emailService.js';
import { EMAIL_TEMPLATES } from '../utils/emailTemplates.js';

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
      INSERT INTO activity_log (user_id, project_id, entity_type, entity_id, action, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, entityType === 'project' ? entityId : null, entityType, entityId, action, description, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error - logging should not break the main operation
  }
};

// Helper function to check if user can access project
const canAccessProject = async (projectId, userId, userRole) => {
  if (userRole === 'admin') {
    return true;
  }
  
  // Client can only access their own projects
  const result = await dbQuery(
    'SELECT id FROM projects WHERE id = $1 AND client_id = $2 AND is_active = true',
    [projectId, userId]
  );
  return result.rows.length > 0;
};

// =============================================================================
// GET /api/projects - List projects (filtered by user role)
// =============================================================================
router.get('/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled', 'all']).withMessage('Invalid status'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent', 'all']).withMessage('Invalid priority'),
    query('search').optional().isString().trim().withMessage('Search must be a string'),
    query('sort').optional().isIn(['name', 'status', 'priority', 'due_date', 'created_at', 'progress']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      console.log('Projects API - User:', { userId, role: req.user.role, isAdmin });
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status || 'all';
      const priority = req.query.priority || 'all';
      const search = req.query.search || '';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';

      // Build WHERE clause
      let whereClause = 'WHERE p.is_active = true';
      const queryParams = [];
      let paramCount = 0;

      // Non-admin users can only see their own projects
      if (!isAdmin) {
        paramCount++;
        whereClause += ` AND p.client_id = $${paramCount}`;
        queryParams.push(userId);
      }

      // Filter by status
      if (status !== 'all') {
        paramCount++;
        whereClause += ` AND p.status = $${paramCount}`;
        queryParams.push(status);
      }

      // Filter by priority
      if (priority !== 'all') {
        paramCount++;
        whereClause += ` AND p.priority = $${paramCount}`;
        queryParams.push(priority);
      }

      // Search in project names and descriptions
      if (search) {
        paramCount++;
        whereClause += ` AND (
          p.name ILIKE $${paramCount} OR 
          p.description ILIKE $${paramCount} OR
          p.project_type ILIKE $${paramCount}
        )`;
        queryParams.push(`%${search}%`);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM projects p
        LEFT JOIN users u ON p.client_id = u.id
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, queryParams);
      const totalProjects = parseInt(countResult.rows[0].total);

      // Get projects with client info and aggregated data
      const sortField = sort === 'name' ? 'p.name' :
                       sort === 'status' ? 'p.status' :
                       sort === 'priority' ? 'p.priority' :
                       sort === 'due_date' ? 'p.due_date' :
                       sort === 'progress' ? 'p.progress_percentage' : 'p.created_at';

      const projectsQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority,
          p.progress_percentage,
          p.budget_amount,
          p.budget_currency,
          p.start_date,
          p.due_date,
          p.completed_at,
          p.project_type,
          p.created_at,
          p.updated_at,
          u.first_name || ' ' || u.last_name as client_name,
          u.email as client_email,
          u.company_name,
          (SELECT COUNT(*) FROM project_milestones m WHERE m.project_id = p.id) as total_milestones,
          (SELECT COUNT(*) FROM project_milestones m WHERE m.project_id = p.id AND m.is_completed = true) as completed_milestones,
          (SELECT COUNT(*) FROM files f WHERE f.project_id = p.id AND f.is_active = true) as file_count,
          (SELECT COUNT(*) FROM messages msg WHERE msg.project_id = p.id) as message_count,
          CASE 
            WHEN p.due_date < CURRENT_DATE AND p.status NOT IN ('completed', 'cancelled') THEN true
            ELSE false
          END as is_overdue
        FROM projects p
        LEFT JOIN users u ON p.client_id = u.id
        ${whereClause}
        ORDER BY ${sortField} ${order.toUpperCase()}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);
      console.log('Projects query params:', queryParams);
      console.log('Projects whereClause:', whereClause);
      const projectsResult = await dbQuery(projectsQuery, queryParams);
      console.log('Projects result count:', projectsResult.rows.length);

      // Calculate pagination info
      const totalPages = Math.ceil(totalProjects / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        projects: projectsResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalProjects,
          limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          status,
          priority,
          search,
          sort,
          order
        }
      });

    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
);

// =============================================================================
// GET /api/projects/:id - Get project details with milestones
// =============================================================================
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access permissions
      const hasAccess = await canAccessProject(projectId, userId, userRole);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You can only view your own projects.' });
      }

      // Get project details
      const projectQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority,
          p.progress_percentage,
          p.budget_amount,
          p.budget_currency,
          p.start_date,
          p.due_date,
          p.completed_at,
          p.project_type,
          p.created_at,
          p.updated_at,
          u.first_name || ' ' || u.last_name as client_name,
          u.email as client_email,
          u.company_name,
          u.phone as client_phone,
          CASE 
            WHEN p.due_date < CURRENT_DATE AND p.status NOT IN ('completed', 'cancelled') THEN true
            ELSE false
          END as is_overdue
        FROM projects p
        LEFT JOIN users u ON p.client_id = u.id
        WHERE p.id = $1 AND p.is_active = true
      `;

      const projectResult = await dbQuery(projectQuery, [projectId]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectResult.rows[0];

      // Get project milestones
      const milestonesQuery = `
        SELECT 
          id,
          name,
          description,
          due_date,
          is_completed,
          completed_at,
          order_index,
          created_at,
          updated_at
        FROM project_milestones
        WHERE project_id = $1
        ORDER BY order_index ASC, created_at ASC
      `;

      const milestonesResult = await dbQuery(milestonesQuery, [projectId]);

      // Get project statistics
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM files WHERE project_id = $1 AND is_active = true) as file_count,
          (SELECT COUNT(*) FROM messages WHERE project_id = $1) as message_count,
          (SELECT COUNT(*) FROM activity_log WHERE project_id = $1) as activity_count
      `;

      const statsResult = await dbQuery(statsQuery, [projectId]);

      project.milestones = milestonesResult.rows;
      project.statistics = statsResult.rows[0];

      res.json({ project });

    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project details' });
    }
  }
);

// =============================================================================
// POST /api/projects - Create project (admin only)
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('client_id').isUUID().withMessage('Valid client ID is required'),
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Project name is required (max 255 characters)'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
    body('status').optional().isIn(['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('progress_percentage').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
    body('budget_amount').optional().isDecimal().withMessage('Budget must be a valid number'),
    body('budget_currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    body('due_date').optional().isISO8601().withMessage('Due date must be valid ISO date'),
    body('project_type').optional().trim().isLength({ max: 100 }).withMessage('Project type max 100 characters')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();

    try {
      const {
        client_id,
        name,
        description,
        status = 'planning',
        priority = 'medium',
        progress_percentage = 0,
        budget_amount,
        budget_currency = 'USD',
        start_date,
        due_date,
        project_type
      } = req.body;

      // Verify client exists and is active
      const clientCheck = await client.query(
        'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [client_id, 'client']
      );

      if (clientCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Invalid client ID or client is not active' });
      }

      const clientData = clientCheck.rows[0];

      // Validate date logic
      if (start_date && due_date && new Date(start_date) > new Date(due_date)) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Start date cannot be after due date' });
      }

      // Insert new project
      const insertQuery = `
        INSERT INTO projects (
          client_id, name, description, status, priority, progress_percentage,
          budget_amount, budget_currency, start_date, due_date, project_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, status, priority, progress_percentage,
                 budget_amount, budget_currency, start_date, due_date, project_type, created_at
      `;

      const result = await client.query(insertQuery, [
        client_id, name, description, status, priority, progress_percentage,
        budget_amount, budget_currency, start_date, due_date, project_type
      ]);

      const newProject = result.rows[0];

      // Initialize phase tracking for the new project
      const phaseTrackingQuery = `
        INSERT INTO project_phase_tracking (
          project_id, 
          current_phase_id,
          current_phase_index,
          phase_started_at
        )
        SELECT 
          $1,
          id,
          0,
          CURRENT_TIMESTAMP
        FROM project_phases 
        WHERE phase_key = 'onboarding'
        RETURNING *
      `;
      
      await client.query(phaseTrackingQuery, [newProject.id]);

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'project',
        newProject.id,
        'created',
        `Project created: ${name} for ${clientData.first_name} ${clientData.last_name}`,
        {
          admin_id: req.user.id,
          client_id,
          project_type,
          budget_amount
        }
      );

      // Log phase initialization
      await logActivity(
        client,
        req.user.id,
        'phase',
        newProject.id,
        'phase_change',
        'Project initialized in Onboarding phase',
        {
          phase_index: 0,
          phase_key: 'onboarding'
        }
      );

      await commitTransaction(client);

      // Send welcome email to client
      try {
        // Get client full details for email
        const clientResult = await dbQuery(
          `SELECT email, first_name, last_name FROM users WHERE id = $1`,
          [client_id]
        );
        
        if (clientResult.rows.length > 0) {
          const clientInfo = clientResult.rows[0];
          const clientName = `${clientInfo.first_name} ${clientInfo.last_name || ''}`.trim();
          
          // Get all phases for the email
          const phasesResult = await dbQuery(
            `SELECT phase_key, name, description FROM project_phases ORDER BY order_index`
          );
          
          await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_WELCOME, {
            to: clientInfo.email,
            userId: client_id,
            clientName: clientName,
            projectName: name,
            projectDescription: description,
            startDate: start_date || new Date(),
            estimatedEndDate: due_date,
            totalPhases: phasesResult.rows.length,
            phases: phasesResult.rows.map(phase => ({
              name: phase.name,
              description: phase.description
            })),
            portalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal`,
            projectManager: {
              name: 'Kendrick Forrest',
              email: 'kendrick@reprintstudios.com'
            },
            hasProject: true,
            context: 'project',
            type: 'project_notifications'
          });
        }
      } catch (emailError) {
        console.error('Failed to send project welcome email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        message: 'Project created successfully',
        project: newProject
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

// =============================================================================
// PUT /api/projects/:id - Update project
// =============================================================================
router.put('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Project name must be 1-255 characters'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
    body('status').optional().isIn(['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('progress_percentage').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
    body('budget_amount').optional().isDecimal().withMessage('Budget must be a valid number'),
    body('budget_currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    body('due_date').optional().isISO8601().withMessage('Due date must be valid ISO date'),
    body('project_type').optional().trim().isLength({ max: 100 }).withMessage('Project type max 100 characters')
  ],
  validateRequest,
  async (req, res) => {
    const dbClient = await beginTransaction();

    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access permissions
      const hasAccess = await canAccessProject(projectId, userId, userRole);
      if (!hasAccess) {
        await rollbackTransaction(dbClient);
        return res.status(403).json({ error: 'Access denied. You can only update your own projects.' });
      }

      // Get current project data
      const existingProjectQuery = 'SELECT * FROM projects WHERE id = $1 AND is_active = true';
      const existingProject = await dbClient.query(existingProjectQuery, [projectId]);

      if (existingProject.rows.length === 0) {
        await rollbackTransaction(dbClient);
        return res.status(404).json({ error: 'Project not found' });
      }

      const currentProject = existingProject.rows[0];
      const updatedFields = {};
      const updateParams = [];
      let paramCount = 0;

      // Build dynamic update query - clients have limited update permissions
      const allowedFields = userRole === 'admin' 
        ? ['name', 'description', 'status', 'priority', 'progress_percentage', 'budget_amount', 'budget_currency', 'start_date', 'due_date', 'project_type']
        : ['description']; // Clients can only update description

      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field) && req.body[field] !== currentProject[field]) {
          paramCount++;
          updatedFields[field] = req.body[field];
          updateParams.push(req.body[field]);
        }
      }

      if (paramCount === 0) {
        await rollbackTransaction(dbClient);
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Validate date logic if dates are being updated
      const newStartDate = updatedFields.start_date || currentProject.start_date;
      const newDueDate = updatedFields.due_date || currentProject.due_date;
      
      if (newStartDate && newDueDate && new Date(newStartDate) > new Date(newDueDate)) {
        await rollbackTransaction(dbClient);
        return res.status(400).json({ error: 'Start date cannot be after due date' });
      }

      // Handle completion timestamp
      if (updatedFields.status === 'completed' && currentProject.status !== 'completed') {
        updatedFields.completed_at = new Date();
        paramCount++;
        updateParams.push(updatedFields.completed_at);
      } else if (updatedFields.status !== 'completed' && currentProject.status === 'completed') {
        updatedFields.completed_at = null;
        paramCount++;
        updateParams.push(null);
      }

      // Build and execute update query
      const setClause = Object.keys(updatedFields).map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');

      const updateQuery = `
        UPDATE projects 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1} AND is_active = true
        RETURNING id, name, description, status, priority, progress_percentage,
                 budget_amount, budget_currency, start_date, due_date, project_type,
                 completed_at, updated_at
      `;

      updateParams.push(projectId);
      const result = await dbClient.query(updateQuery, updateParams);
      const updatedProject = result.rows[0];

      // Log activity
      const changeDescription = Object.keys(updatedFields)
        .filter(field => field !== 'completed_at')
        .map(field => `${field}: ${updatedFields[field]}`)
        .join(', ');

      await logActivity(
        dbClient,
        userId,
        'project',
        projectId,
        'updated',
        `Project updated: ${changeDescription}`,
        {
          updated_fields: Object.keys(updatedFields),
          updated_by: userRole
        }
      );

      await commitTransaction(dbClient);

      // Send project completion email if status changed to completed
      if (updatedFields.status === 'completed' && currentProject.status !== 'completed') {
        try {
          // Get client and project details
          const projectResult = await dbQuery(
            `SELECT 
              p.*, 
              u.email, u.first_name, u.last_name,
              COUNT(DISTINCT f.id) as total_deliverables
             FROM projects p
             JOIN users u ON p.client_id = u.id
             LEFT JOIN files f ON f.project_id = p.id AND f.is_active = true
             WHERE p.id = $1
             GROUP BY p.id, u.email, u.first_name, u.last_name`,
            [projectId]
          );
          
          if (projectResult.rows.length > 0) {
            const project = projectResult.rows[0];
            const clientName = `${project.first_name} ${project.last_name || ''}`.trim();
            
            // Get completed phases
            const phasesResult = await dbQuery(
              `SELECT pp.name, 
                CASE
                  WHEN pp.phase_key = 'onboarding' THEN pt.onboarding_completed_at
                  WHEN pp.phase_key = 'ideation' THEN pt.ideation_completed_at
                  WHEN pp.phase_key = 'design' THEN pt.design_completed_at
                  WHEN pp.phase_key = 'review' THEN pt.review_completed_at
                  WHEN pp.phase_key = 'production' THEN pt.production_completed_at
                  WHEN pp.phase_key = 'payment' THEN pt.payment_completed_at
                  WHEN pp.phase_key = 'signoff' THEN pt.signoff_completed_at
                  WHEN pp.phase_key = 'delivery' THEN pt.delivery_completed_at
                END as completed_at
               FROM project_phases pp
               CROSS JOIN project_phase_tracking pt
               WHERE pt.project_id = $1
               ORDER BY pp.order_index`,
              [projectId]
            );
            
            // Check for outstanding invoices
            const invoiceResult = await dbQuery(
              `SELECT COUNT(*) as unpaid_count 
               FROM invoices 
               WHERE project_id = $1 AND status IN ('draft', 'sent', 'overdue')`,
              [projectId]
            );
            
            // Calculate project duration
            const startDate = new Date(project.start_date || project.created_at);
            const completionDate = new Date();
            const durationDays = Math.ceil((completionDate - startDate) / (1000 * 60 * 60 * 24));
            const durationText = durationDays > 30 
              ? `${Math.floor(durationDays / 30)} months` 
              : `${durationDays} days`;
            
            await sendTemplateEmail(EMAIL_TEMPLATES.PROJECT_COMPLETED, {
              to: project.email,
              userId: project.client_id,
              clientName: clientName,
              projectName: project.name,
              startDate: startDate,
              completionDate: completionDate,
              projectDuration: durationText,
              totalDeliverables: project.total_deliverables,
              completedPhases: phasesResult.rows.filter(p => p.completed_at).map(p => ({
                name: p.name,
                completedAt: p.completed_at
              })),
              portalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal`,
              hasOutstandingInvoice: invoiceResult.rows[0].unpaid_count > 0,
              context: 'project',
              type: 'project_notifications'
            });
          }
        } catch (emailError) {
          console.error('Failed to send project completion email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        message: 'Project updated successfully',
        project: updatedProject
      });

    } catch (error) {
      await rollbackTransaction(dbClient);
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

// =============================================================================
// DELETE /api/projects/:id - Soft delete project
// =============================================================================
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();

    try {
      const projectId = req.params.id;

      // Check if project exists and is active
      const existingProjectQuery = 'SELECT * FROM projects WHERE id = $1 AND is_active = true';
      const existingProject = await client.query(existingProjectQuery, [projectId]);

      if (existingProject.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectData = existingProject.rows[0];

      // Soft delete the project
      const deleteQuery = `
        UPDATE projects 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
        RETURNING id, name, is_active, updated_at
      `;

      const result = await client.query(deleteQuery, [projectId]);
      const deletedProject = result.rows[0];

      // Also soft delete associated files
      await client.query(
        'UPDATE files SET is_active = false WHERE project_id = $1',
        [projectId]
      );

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'project',
        projectId,
        'deleted',
        `Project deleted: ${projectData.name}`,
        {
          admin_id: req.user.id,
          client_id: projectData.client_id
        }
      );

      await commitTransaction(client);

      res.json({
        message: 'Project deleted successfully',
        project: deletedProject
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

// =============================================================================
// POST /api/projects/:id/milestones - Add milestone
// =============================================================================
router.post('/:id/milestones',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Milestone name is required (max 255 characters)'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
    body('due_date').optional().isISO8601().withMessage('Due date must be valid ISO date'),
    body('order_index').optional().isInt({ min: 0 }).withMessage('Order index must be non-negative integer')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();

    try {
      const projectId = req.params.id;
      const { name, description, due_date, order_index } = req.body;

      // Verify project exists and is active
      const projectCheck = await client.query(
        'SELECT id, name FROM projects WHERE id = $1 AND is_active = true',
        [projectId]
      );

      if (projectCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectData = projectCheck.rows[0];

      // Get next order index if not provided
      let finalOrderIndex = order_index;
      if (finalOrderIndex === undefined) {
        const maxOrderResult = await client.query(
          'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM project_milestones WHERE project_id = $1',
          [projectId]
        );
        finalOrderIndex = maxOrderResult.rows[0].next_order;
      }

      // Insert milestone
      const insertQuery = `
        INSERT INTO project_milestones (project_id, name, description, due_date, order_index)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, due_date, is_completed, completed_at, order_index, created_at
      `;

      const result = await client.query(insertQuery, [
        projectId, name, description, due_date, finalOrderIndex
      ]);

      const newMilestone = result.rows[0];

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'milestone',
        newMilestone.id,
        'created',
        `Milestone created: ${name} for project ${projectData.name}`,
        {
          admin_id: req.user.id,
          project_id: projectId,
          due_date
        }
      );

      await commitTransaction(client);

      res.status(201).json({
        message: 'Milestone created successfully',
        milestone: newMilestone
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating milestone:', error);
      res.status(500).json({ error: 'Failed to create milestone' });
    }
  }
);

// =============================================================================
// PUT /api/projects/:id/milestones/:milestoneId - Update milestone
// =============================================================================
router.put('/:id/milestones/:milestoneId',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    param('milestoneId').isUUID().withMessage('Invalid milestone ID format'),
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Milestone name must be 1-255 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
    body('due_date').optional().isISO8601().withMessage('Due date must be valid ISO date'),
    body('is_completed').optional().isBoolean().withMessage('is_completed must be boolean'),
    body('order_index').optional().isInt({ min: 0 }).withMessage('Order index must be non-negative integer')
  ],
  validateRequest,
  async (req, res) => {
    const dbClient = await beginTransaction();

    try {
      const projectId = req.params.id;
      const milestoneId = req.params.milestoneId;

      // Verify project and milestone exist
      const milestoneCheck = await dbClient.query(
        'SELECT m.*, p.name as project_name FROM project_milestones m JOIN projects p ON m.project_id = p.id WHERE m.id = $1 AND m.project_id = $2 AND p.is_active = true',
        [milestoneId, projectId]
      );

      if (milestoneCheck.rows.length === 0) {
        await rollbackTransaction(dbClient);
        return res.status(404).json({ error: 'Milestone not found' });
      }

      const currentMilestone = milestoneCheck.rows[0];
      const updatedFields = {};
      const updateParams = [];
      let paramCount = 0;

      // Build dynamic update query
      const allowedFields = ['name', 'description', 'due_date', 'is_completed', 'order_index'];

      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field) && req.body[field] !== currentMilestone[field]) {
          paramCount++;
          updatedFields[field] = req.body[field];
          updateParams.push(req.body[field]);
        }
      }

      if (paramCount === 0) {
        await rollbackTransaction(dbClient);
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Handle completion timestamp
      if (updatedFields.is_completed === true && !currentMilestone.is_completed) {
        updatedFields.completed_at = new Date();
        paramCount++;
        updateParams.push(updatedFields.completed_at);
      } else if (updatedFields.is_completed === false && currentMilestone.is_completed) {
        updatedFields.completed_at = null;
        paramCount++;
        updateParams.push(null);
      }

      // Build and execute update query
      const setClause = Object.keys(updatedFields).map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');

      const updateQuery = `
        UPDATE project_milestones 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1}
        RETURNING id, name, description, due_date, is_completed, completed_at, order_index, updated_at
      `;

      updateParams.push(milestoneId);
      const result = await dbClient.query(updateQuery, updateParams);
      const updatedMilestone = result.rows[0];

      // Log activity
      const changeDescription = Object.keys(updatedFields)
        .filter(field => field !== 'completed_at')
        .map(field => `${field}: ${updatedFields[field]}`)
        .join(', ');

      await logActivity(
        dbClient,
        req.user.id,
        'milestone',
        milestoneId,
        'updated',
        `Milestone updated: ${changeDescription}`,
        {
          admin_id: req.user.id,
          project_id: projectId,
          updated_fields: Object.keys(updatedFields)
        }
      );

      await commitTransaction(dbClient);

      res.json({
        message: 'Milestone updated successfully',
        milestone: updatedMilestone
      });

    } catch (error) {
      await rollbackTransaction(dbClient);
      console.error('Error updating milestone:', error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  }
);

// =============================================================================
// POST /api/projects/:id/progress - Update project progress
// =============================================================================
router.post('/:id/progress',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('progress_percentage').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note max 500 characters')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();

    try {
      const projectId = req.params.id;
      const { progress_percentage, note } = req.body;

      // Verify project exists and is active
      const projectCheck = await client.query(
        'SELECT id, name, progress_percentage FROM projects WHERE id = $1 AND is_active = true',
        [projectId]
      );

      if (projectCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectData = projectCheck.rows[0];
      const oldProgress = projectData.progress_percentage;

      // Update project progress
      const updateQuery = `
        UPDATE projects 
        SET progress_percentage = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, name, progress_percentage, updated_at
      `;

      const result = await client.query(updateQuery, [progress_percentage, projectId]);
      const updatedProject = result.rows[0];

      // Auto-update status based on progress
      let newStatus = null;
      if (progress_percentage === 0 && oldProgress !== 0) {
        newStatus = 'planning';
      } else if (progress_percentage > 0 && progress_percentage < 100 && oldProgress !== progress_percentage) {
        newStatus = 'in_progress';
      } else if (progress_percentage === 100 && oldProgress !== 100) {
        newStatus = 'completed';
        await client.query(
          'UPDATE projects SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['completed', projectId]
        );
      }

      // Log activity
      const progressNote = note ? ` - ${note}` : '';
      await logActivity(
        client,
        req.user.id,
        'project',
        projectId,
        'progress_updated',
        `Project progress updated from ${oldProgress}% to ${progress_percentage}%${progressNote}`,
        {
          admin_id: req.user.id,
          old_progress: oldProgress,
          new_progress: progress_percentage,
          status_change: newStatus,
          note
        }
      );

      await commitTransaction(client);

      res.json({
        message: 'Project progress updated successfully',
        project: {
          ...updatedProject,
          status_updated: newStatus
        }
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error updating project progress:', error);
      res.status(500).json({ error: 'Failed to update project progress' });
    }
  }
);

// =============================================================================
// GET /api/projects/:id/phases - Get project phases with status
// =============================================================================
router.get('/:id/phases',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: projectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check project access
      if (!await canAccessProject(projectId, userId, userRole)) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      // Get project phases with tracking data
      const phasesQuery = `
        SELECT 
          pp.id,
          pp.phase_key,
          pp.name,
          pp.description,
          pp.order_index,
          pp.requires_approval,
          pp.expected_duration_days,
          pt.current_phase_index,
          pt.current_phase_id,
          pt.onboarding_completed_at,
          pt.ideation_completed_at,
          pt.design_completed_at,
          pt.review_completed_at,
          pt.production_completed_at,
          pt.payment_completed_at,
          pt.signoff_completed_at,
          pt.delivery_completed_at,
          pt.is_completed,
          CASE 
            WHEN pp.id = pt.current_phase_id AND NOT pt.is_completed THEN 'in_progress'
            WHEN pp.order_index < pt.current_phase_index THEN 'completed'
            WHEN pp.order_index > pt.current_phase_index THEN 'not_started'
            WHEN pt.is_completed THEN 'completed'
            ELSE 'not_started'
          END as status,
          CASE
            WHEN pp.phase_key = 'onboarding' THEN pt.onboarding_completed_at
            WHEN pp.phase_key = 'ideation' THEN pt.ideation_completed_at
            WHEN pp.phase_key = 'design' THEN pt.design_completed_at
            WHEN pp.phase_key = 'review' THEN pt.review_completed_at
            WHEN pp.phase_key = 'production' THEN pt.production_completed_at
            WHEN pp.phase_key = 'payment' THEN pt.payment_completed_at
            WHEN pp.phase_key = 'signoff' THEN pt.signoff_completed_at
            WHEN pp.phase_key = 'delivery' THEN pt.delivery_completed_at
          END as completed_at,
          (
            SELECT COUNT(*) FROM project_activities pa 
            WHERE pa.project_id = $1 AND pa.phase_id = pp.id
          ) as activity_count,
          (
            SELECT COUNT(*) FROM files f 
            WHERE f.project_id = $1 AND f.phase_id = pp.id AND f.is_active = true
          ) as file_count
        FROM project_phases pp
        LEFT JOIN project_phase_tracking pt ON pt.project_id = $1
        ORDER BY pp.order_index ASC
      `;

      const phasesResult = await dbQuery(phasesQuery, [projectId]);

      // Get overall project info
      const projectQuery = `
        SELECT 
          p.id,
          p.name,
          p.status,
          p.progress_percentage,
          p.start_date,
          p.due_date,
          pt.current_phase_index,
          pt.is_completed,
          pt.completed_at as project_completed_at
        FROM projects p
        LEFT JOIN project_phase_tracking pt ON pt.project_id = p.id
        WHERE p.id = $1 AND p.is_active = true
      `;

      const projectResult = await dbQuery(projectQuery, [projectId]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectResult.rows[0];
      const phases = phasesResult.rows;

      res.json({
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          progress_percentage: project.progress_percentage,
          start_date: project.start_date,
          due_date: project.due_date,
          current_phase_index: project.current_phase_index,
          is_completed: project.is_completed,
          completed_at: project.project_completed_at
        },
        phases: phases,
        total_phases: phases.length,
        current_phase: phases.find(p => p.status === 'in_progress') || null
      });

    } catch (error) {
      console.error('Error fetching project phases:', error);
      res.status(500).json({ error: 'Failed to fetch project phases' });
    }
  }
);

export default router;