import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';

const router = express.Router();

// GET /api/users/messageable - Get users that the current user can message
router.get('/messageable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let usersQuery;
    let queryParams = [];
    
    if (userRole === 'admin') {
      // Admins can message all active users
      usersQuery = `
        SELECT 
          id, 
          first_name, 
          last_name, 
          email, 
          company_name, 
          role,
          avatar_url
        FROM users 
        WHERE is_active = true AND id != $1
        ORDER BY role DESC, last_name ASC, first_name ASC
      `;
      queryParams = [userId];
    } else {
      // Clients can only message admins
      usersQuery = `
        SELECT 
          id, 
          first_name, 
          last_name, 
          email, 
          company_name, 
          role,
          avatar_url
        FROM users 
        WHERE is_active = true AND role = 'admin'
        ORDER BY last_name ASC, first_name ASC
      `;
      queryParams = [];
    }
    
    const result = await dbQuery(usersQuery, queryParams);
    
    // Format the response
    const users = result.rows.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      company: user.company_name,
      role: user.role,
      avatar: user.avatar_url
    }));
    
    res.json({ users });
    
  } catch (error) {
    console.error('Error fetching messageable users:', error);
    res.status(500).json({ error: 'Failed to fetch messageable users' });
  }
});

// GET /api/users/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        company_name,
        phone,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await dbQuery(userQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({ user });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile - Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, company_name, phone } = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    if (first_name !== undefined) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      updateValues.push(first_name);
    }
    
    if (last_name !== undefined) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      updateValues.push(last_name);
    }
    
    if (company_name !== undefined) {
      paramCount++;
      updateFields.push(`company_name = $${paramCount}`);
      updateValues.push(company_name);
    }
    
    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      updateValues.push(phone);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    paramCount++;
    updateValues.push(userId);
    
    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, company_name, phone, role, avatar_url
    `;
    
    const result = await dbQuery(updateQuery, updateValues);
    
    res.json({ 
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || 'all';
    const status = req.query.status || 'all';
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;
    
    // Filter by role
    if (role !== 'all') {
      paramCount++;
      whereClause += ` AND role = $${paramCount}`;
      queryParams.push(role);
    }
    
    // Filter by status
    if (status === 'active') {
      whereClause += ' AND is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = false';
    }
    
    // Search
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
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await dbQuery(countQuery, queryParams);
    const totalUsers = parseInt(countResult.rows[0].total);
    
    // Get users
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);
    
    const usersQuery = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        company_name,
        phone,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM projects WHERE client_id = users.id) as project_count,
        (SELECT COUNT(*) FROM invoices WHERE client_id = users.id) as invoice_count
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
    
    const usersResult = await dbQuery(usersQuery, queryParams);
    
    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;