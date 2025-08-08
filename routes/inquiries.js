import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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

// =============================================================================
// POST /api/inquiries - Submit new inquiry
// =============================================================================
router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 characters)'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('company').optional().trim().isLength({ max: 200 }).withMessage('Company name max 200 characters'),
    body('project-type').isIn(['branding', 'web-design', 'print', 'packaging', 'consultation', 'other']).withMessage('Valid project type is required'),
    body('budget').isIn(['under-5k', '5k-10k', '10k-25k', '25k-50k', 'over-50k']).withMessage('Valid budget range is required'),
    body('timeline').isIn(['rush', 'standard', 'extended', 'ongoing']).withMessage('Valid timeline is required'),
    body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const {
        name,
        email,
        company,
        'project-type': projectType,
        budget,
        timeline,
        message
      } = req.body;

      // Create inquiry record
      const inquiryId = uuidv4();
      const insertQuery = `
        INSERT INTO inquiries (
          id, name, email, company, project_type, budget_range, 
          timeline, message, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, name, email, project_type, status, created_at
      `;

      const result = await client.query(insertQuery, [
        inquiryId, name, email, company || null, projectType,
        budget, timeline, message, 'new'
      ]);

      const newInquiry = result.rows[0];

      // Log activity (no user context for public inquiries)
      await client.query(`
        INSERT INTO activity_log (id, user_id, entity_type, entity_id, action, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(), null, 'inquiry', inquiryId, 'created',
        `New inquiry from ${name} (${email})`,
        JSON.stringify({ 
          project_type: projectType, 
          budget_range: budget,
          timeline: timeline,
          ip_address: req.ip || req.connection.remoteAddress
        })
      ]);

      await commitTransaction(client);

      // Return success response (don't expose internal details)
      res.status(201).json({
        message: 'Thank you for your inquiry! We\'ll get back to you within 24 hours.',
        inquiry: {
          id: newInquiry.id,
          status: 'submitted',
          submittedAt: newInquiry.created_at
        }
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating inquiry:', error);
      res.status(500).json({ 
        error: 'Unable to submit inquiry at this time. Please try again later.' 
      });
    }
  }
);

// =============================================================================
// GET /api/inquiries - List all inquiries (admin only)
// =============================================================================
router.get('/',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status || 'all';

      // Build WHERE clause
      let whereClause = '';
      const queryParams = [];
      let paramCount = 0;

      if (status !== 'all') {
        paramCount++;
        whereClause = `WHERE status = $${paramCount}`;
        queryParams.push(status);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM inquiries ${whereClause}`;
      const countResult = await dbQuery(countQuery, queryParams);
      const totalInquiries = parseInt(countResult.rows[0].total);

      // Get inquiries
      const inquiriesQuery = `
        SELECT 
          id, name, email, company, project_type, budget_range,
          timeline, message, status, created_at, updated_at
        FROM inquiries 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const inquiriesResult = await dbQuery(inquiriesQuery, queryParams);

      // Calculate pagination info
      const totalPages = Math.ceil(totalInquiries / limit);

      res.json({
        inquiries: inquiriesResult.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalInquiries,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('Error fetching inquiries:', error);
      res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
  }
);

// =============================================================================
// PUT /api/inquiries/:id/status - Update inquiry status (admin only)
// =============================================================================
router.put('/:id/status',
  authenticateToken,
  requireAdmin,
  [
    body('status').isIn(['new', 'in-progress', 'contacted', 'converted', 'closed']).withMessage('Valid status is required'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes max 1000 characters')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const inquiryId = req.params.id;
      const { status, notes } = req.body;

      // Check if inquiry exists
      const existingInquiry = await client.query(
        'SELECT * FROM inquiries WHERE id = $1',
        [inquiryId]
      );

      if (existingInquiry.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Inquiry not found' });
      }

      // Update inquiry status
      const updateQuery = `
        UPDATE inquiries 
        SET status = $1, admin_notes = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, email, status, updated_at
      `;

      const result = await client.query(updateQuery, [status, notes || null, inquiryId]);
      const updatedInquiry = result.rows[0];

      // Log activity
      await client.query(`
        INSERT INTO activity_log (id, user_id, entity_type, entity_id, action, description, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(), req.user.userId, 'inquiry', inquiryId, 'status_updated',
        `Inquiry status updated to ${status}`,
        JSON.stringify({ 
          previous_status: existingInquiry.rows[0].status,
          new_status: status,
          notes: notes || null
        })
      ]);

      await commitTransaction(client);

      res.json({
        message: 'Inquiry status updated successfully',
        inquiry: updatedInquiry
      });

    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error updating inquiry status:', error);
      res.status(500).json({ error: 'Failed to update inquiry status' });
    }
  }
);

export default router;