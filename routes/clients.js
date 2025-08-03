import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin, requireClient } from '../middleware/auth.js';
import { query as dbQuery, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';

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
    // Don't throw error - logging should not break the main operation
  }
};

// =============================================================================
// GET /api/clients - List all clients with pagination (admin only)
// =============================================================================
router.get('/', 
  authenticateToken, 
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().trim().withMessage('Search must be a string'),
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Status must be active, inactive, or all'),
    query('sort').optional().isIn(['name', 'email', 'company', 'created_at']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || 'active';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';

      // Build WHERE clause
      let whereClause = "WHERE role = 'client'";
      const queryParams = [];
      let paramCount = 0;

      if (status === 'active') {
        whereClause += ` AND is_active = true`;
      } else if (status === 'inactive') {
        whereClause += ` AND is_active = false`;
      }

      if (search) {
        paramCount++;
        whereClause += ` AND (
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          email ILIKE $${paramCount} OR 
          company_name ILIKE $${paramCount}
        )`;
        queryParams.push(`%${search}%`);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users 
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, queryParams);
      const totalClients = parseInt(countResult.rows[0].total);

      // Get clients
      const clientsQuery = `
        SELECT 
          id,
          email,
          first_name,
          last_name,
          company_name,
          phone,
          avatar_url,
          is_active,
          email_verified,
          last_login_at,
          created_at,
          updated_at,
          (SELECT COUNT(*) FROM projects WHERE client_id = users.id AND is_active = true) as active_projects,
          (SELECT COUNT(*) FROM invoices WHERE client_id = users.id) as total_invoices
        FROM users 
        ${whereClause}
        ORDER BY ${sort} ${order.toUpperCase()}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const clientsResult = await dbQuery(clientsQuery, queryParams);

      // Calculate pagination info
      const totalPages = Math.ceil(totalClients / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        clients: clientsResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalClients,
          limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          search,
          status,
          sort,
          order
        }
      });

    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }
);

// =============================================================================
// GET /api/clients/:id - Get single client details
// =============================================================================
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid client ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const clientId = req.params.id;
      const requestingUserId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Non-admin users can only view their own profile
      if (!isAdmin && requestingUserId !== clientId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
      }

      const clientQuery = `
        SELECT 
          id,
          email,
          first_name,
          last_name,
          company_name,
          phone,
          avatar_url,
          is_active,
          email_verified,
          last_login_at,
          created_at,
          updated_at
        FROM users 
        WHERE id = $1 AND role = 'client'
      `;

      const clientResult = await dbQuery(clientQuery, [clientId]);

      if (clientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const client = clientResult.rows[0];

      // Get additional client statistics (only for admin or own profile)
      if (isAdmin || requestingUserId === clientId) {
        const statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM projects WHERE client_id = $1 AND is_active = true) as active_projects,
            (SELECT COUNT(*) FROM projects WHERE client_id = $1) as total_projects,
            (SELECT COUNT(*) FROM invoices WHERE client_id = $1) as total_invoices,
            (SELECT COUNT(*) FROM invoices WHERE client_id = $1 AND status = 'paid') as paid_invoices,
            (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE client_id = $1 AND status = 'paid') as total_paid,
            (SELECT COUNT(*) FROM files WHERE uploader_id = $1 AND is_active = true) as uploaded_files
        `;
        
        const statsResult = await dbQuery(statsQuery, [clientId]);
        client.statistics = statsResult.rows[0];
      }

      res.json({ client });

    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ error: 'Failed to fetch client details' });
    }
  }
);

// =============================================================================
// POST /api/clients - Create new client (admin only)
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required (max 100 characters)'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required (max 100 characters)'),
    body('company_name').optional().trim().isLength({ max: 200 }).withMessage('Company name max 200 characters'),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone max 20 characters'),
    body('avatar_url').optional().isURL().withMessage('Avatar URL must be valid'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const {
        email,
        password,
        first_name,
        last_name,
        company_name,
        phone,
        avatar_url,
        is_active = true
      } = req.body;

      // Check if email already exists
      const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUser = await client.query(existingUserQuery, [email]);
      
      if (existingUser.rows.length > 0) {
        await rollbackTransaction(client);
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Insert new client
      const insertQuery = `
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, 
          company_name, phone, avatar_url, is_active
        ) VALUES ($1, $2, $3, $4, 'client', $5, $6, $7, $8)
        RETURNING id, email, first_name, last_name, company_name, phone, 
                 avatar_url, is_active, created_at
      `;

      const result = await client.query(insertQuery, [
        email, password_hash, first_name, last_name,
        company_name, phone, avatar_url, is_active
      ]);

      const newClient = result.rows[0];

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'client',
        newClient.id,
        'created',
        `Client created: ${first_name} ${last_name} (${email})`,
        { admin_id: req.user.id }
      );

      await commitTransaction(client);

      res.status(201).json({
        message: 'Client created successfully',
        client: newClient
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating client:', error);
      
      if (error.code === '23505') { // Unique violation
        res.status(409).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create client' });
      }
    }
  }
);

// =============================================================================
// PUT /api/clients/:id - Update client info
// =============================================================================
router.put('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid client ID format'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('company_name').optional().trim().isLength({ max: 200 }).withMessage('Company name max 200 characters'),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone max 20 characters'),
    body('avatar_url').optional().isURL().withMessage('Avatar URL must be valid'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],
  validateRequest,
  async (req, res) => {
    const dbClient = await beginTransaction();
    
    try {
      const clientId = req.params.id;
      const requestingUserId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Non-admin users can only update their own profile and limited fields
      if (!isAdmin && requestingUserId !== clientId) {
        await rollbackTransaction(dbClient);
        return res.status(403).json({ error: 'Access denied. You can only update your own profile.' });
      }

      // Check if client exists
      const existingClientQuery = 'SELECT * FROM users WHERE id = $1 AND role = $2';
      const existingClient = await dbClient.query(existingClientQuery, [clientId, 'client']);
      
      if (existingClient.rows.length === 0) {
        await rollbackTransaction(dbClient);
        return res.status(404).json({ error: 'Client not found' });
      }

      const currentClient = existingClient.rows[0];
      const updatedFields = {};
      const updateParams = [];
      let paramCount = 0;

      // Build dynamic update query
      const allowedFields = isAdmin 
        ? ['email', 'first_name', 'last_name', 'company_name', 'phone', 'avatar_url', 'is_active']
        : ['first_name', 'last_name', 'company_name', 'phone', 'avatar_url'];

      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field) && req.body[field] !== currentClient[field]) {
          paramCount++;
          updatedFields[field] = req.body[field];
          updateParams.push(req.body[field]);
        }
      }

      // Handle password update separately
      if (req.body.password) {
        const bcrypt = await import('bcryptjs');
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(req.body.password, saltRounds);
        paramCount++;
        updatedFields.password_hash = password_hash;
        updateParams.push(password_hash);
      }

      if (paramCount === 0) {
        await rollbackTransaction(dbClient);
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Check email uniqueness if email is being updated
      if (updatedFields.email && updatedFields.email !== currentClient.email) {
        const emailCheckQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
        const emailCheck = await dbClient.query(emailCheckQuery, [updatedFields.email, clientId]);
        
        if (emailCheck.rows.length > 0) {
          await rollbackTransaction(dbClient);
          return res.status(409).json({ error: 'Email already exists' });
        }
      }

      // Build and execute update query
      const setClause = Object.keys(updatedFields).map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');

      const updateQuery = `
        UPDATE users 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1} AND role = 'client'
        RETURNING id, email, first_name, last_name, company_name, phone, 
                 avatar_url, is_active, updated_at
      `;

      updateParams.push(clientId);
      const result = await dbClient.query(updateQuery, updateParams);
      const updatedClient = result.rows[0];

      // Log activity
      const changeDescription = Object.keys(updatedFields)
        .filter(field => field !== 'password_hash')
        .map(field => `${field}: ${updatedFields[field]}`)
        .join(', ');
      
      await logActivity(
        dbClient,
        requestingUserId,
        'client',
        clientId,
        'updated',
        `Client updated: ${changeDescription}`,
        { 
          updated_fields: Object.keys(updatedFields),
          updated_by: isAdmin ? 'admin' : 'self'
        }
      );

      await commitTransaction(dbClient);

      res.json({
        message: 'Client updated successfully',
        client: updatedClient
      });

    } catch (error) {
      await rollbackTransaction(dbClient);
      console.error('Error updating client:', error);
      
      if (error.code === '23505') { // Unique violation
        res.status(409).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Failed to update client' });
      }
    }
  }
);

// =============================================================================
// DELETE /api/clients/:id - Soft delete client (admin only)
// =============================================================================
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid client ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const clientId = req.params.id;

      // Check if client exists and is active
      const existingClientQuery = 'SELECT * FROM users WHERE id = $1 AND role = $2';
      const existingClient = await client.query(existingClientQuery, [clientId, 'client']);
      
      if (existingClient.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Client not found' });
      }

      const clientData = existingClient.rows[0];

      if (!clientData.is_active) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Client is already deactivated' });
      }

      // Check for active projects
      const activeProjectsQuery = 'SELECT COUNT(*) as count FROM projects WHERE client_id = $1 AND is_active = true';
      const activeProjects = await client.query(activeProjectsQuery, [clientId]);
      const activeProjectCount = parseInt(activeProjects.rows[0].count);

      if (activeProjectCount > 0) {
        await rollbackTransaction(client);
        return res.status(400).json({ 
          error: 'Cannot deactivate client with active projects',
          details: `Client has ${activeProjectCount} active project(s). Please complete or deactivate projects first.`
        });
      }

      // Soft delete the client (set is_active = false)
      const deactivateQuery = `
        UPDATE users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND role = 'client'
        RETURNING id, email, first_name, last_name, is_active, updated_at
      `;

      const result = await client.query(deactivateQuery, [clientId]);
      const deactivatedClient = result.rows[0];

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'client',
        clientId,
        'deactivated',
        `Client deactivated: ${clientData.first_name} ${clientData.last_name} (${clientData.email})`,
        { 
          admin_id: req.user.id,
          reason: 'Admin deactivation'
        }
      );

      await commitTransaction(client);

      res.json({
        message: 'Client deactivated successfully',
        client: deactivatedClient
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error deactivating client:', error);
      res.status(500).json({ error: 'Failed to deactivate client' });
    }
  }
);

// =============================================================================
// POST /api/clients/:id/reactivate - Reactivate a deactivated client (admin only)
// =============================================================================
router.post('/:id/reactivate',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid client ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const clientId = req.params.id;

      // Check if client exists
      const existingClientQuery = 'SELECT * FROM users WHERE id = $1 AND role = $2';
      const existingClient = await client.query(existingClientQuery, [clientId, 'client']);
      
      if (existingClient.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Client not found' });
      }

      const clientData = existingClient.rows[0];

      if (clientData.is_active) {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Client is already active' });
      }

      // Reactivate the client
      const reactivateQuery = `
        UPDATE users 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND role = 'client'
        RETURNING id, email, first_name, last_name, is_active, updated_at
      `;

      const result = await client.query(reactivateQuery, [clientId]);
      const reactivatedClient = result.rows[0];

      // Log activity
      await logActivity(
        client,
        req.user.id,
        'client',
        clientId,
        'reactivated',
        `Client reactivated: ${clientData.first_name} ${clientData.last_name} (${clientData.email})`,
        { 
          admin_id: req.user.id,
          reason: 'Admin reactivation'
        }
      );

      await commitTransaction(client);

      res.json({
        message: 'Client reactivated successfully',
        client: reactivatedClient
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error reactivating client:', error);
      res.status(500).json({ error: 'Failed to reactivate client' });
    }
  }
);

export default router;