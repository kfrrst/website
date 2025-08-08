import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
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
// GET /api/file-categories - List all file categories
// =============================================================================
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      
      let categoriesQuery = `
        SELECT 
          id, name, description, allowed_extensions, max_file_size,
          color_hex, icon, is_active, created_at,
          (SELECT COUNT(*) FROM files WHERE category_id = fc.id AND is_active = true) as file_count
        FROM file_categories fc
      `;
      
      // Non-admin users only see active categories
      if (!isAdmin) {
        categoriesQuery += ` WHERE is_active = true`;
      }
      
      categoriesQuery += ` ORDER BY name ASC`;
      
      const result = await dbQuery(categoriesQuery);
      
      const categories = result.rows.map(category => ({
        ...category,
        max_file_size_mb: category.max_file_size ? Math.round(category.max_file_size / 1048576) : null,
        allowed_extensions_list: category.allowed_extensions || []
      }));
      
      res.json({ categories });
      
    } catch (error) {
      console.error('Error fetching file categories:', error);
      res.status(500).json({ error: 'Failed to fetch file categories' });
    }
  }
);

// =============================================================================
// GET /api/file-categories/:id - Get specific file category
// =============================================================================
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid category ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const categoryQuery = `
        SELECT 
          fc.*,
          (SELECT COUNT(*) FROM files WHERE category_id = fc.id AND is_active = true) as file_count,
          (SELECT json_agg(json_build_object(
            'id', f.id,
            'name', f.original_name,
            'size', f.file_size,
            'created_at', f.created_at
          ) ORDER BY f.created_at DESC) FROM files f WHERE f.category_id = fc.id AND f.is_active = true LIMIT 10) as recent_files
        FROM file_categories fc
        WHERE fc.id = $1
      `;
      
      const result = await dbQuery(categoryQuery, [categoryId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File category not found' });
      }
      
      const category = {
        ...result.rows[0],
        max_file_size_mb: result.rows[0].max_file_size ? Math.round(result.rows[0].max_file_size / 1048576) : null,
        allowed_extensions_list: result.rows[0].allowed_extensions || [],
        recent_files: result.rows[0].recent_files || []
      };
      
      res.json({ category });
      
    } catch (error) {
      console.error('Error fetching file category:', error);
      res.status(500).json({ error: 'Failed to fetch file category' });
    }
  }
);

// =============================================================================
// POST /api/file-categories - Create new file category (admin only)
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 characters)'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
    body('allowed_extensions').isArray().withMessage('Allowed extensions must be an array'),
    body('allowed_extensions.*').trim().isLength({ min: 1 }).withMessage('Each extension must be non-empty'),
    body('max_file_size').isInt({ min: 1 }).withMessage('Max file size must be a positive integer'),
    body('color_hex').matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon max 50 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, description, allowed_extensions, max_file_size, color_hex, icon } = req.body;
      
      const category = await withTransaction(async (client) => {
        // Check if category name already exists
        const existingCategory = await client.query(
          'SELECT id FROM file_categories WHERE name = $1',
          [name]
        );
        
        if (existingCategory.rows.length > 0) {
          throw new Error('File category with this name already exists');
        }
        
        // Insert new category
        const insertQuery = `
          INSERT INTO file_categories (name, description, allowed_extensions, max_file_size, color_hex, icon)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, name, description, allowed_extensions, max_file_size, color_hex, icon, is_active, created_at
        `;
        
        const result = await client.query(insertQuery, [
          name, description, allowed_extensions, max_file_size, color_hex, icon
        ]);
        
        const newCategory = result.rows[0];
        
        // Log activity
        await logActivity(
          client,
          req.user.id,
          'file_category',
          newCategory.id,
          'created',
          `File category created: ${name}`,
          {
            allowed_extensions,
            max_file_size_mb: Math.round(max_file_size / 1048576)
          }
        );
        
        return newCategory;
      });
      
      res.status(201).json({
        message: 'File category created successfully',
        category: {
          ...category,
          max_file_size_mb: Math.round(category.max_file_size / 1048576),
          allowed_extensions_list: category.allowed_extensions
        }
      });
      
    } catch (error) {
      console.error('Error creating file category:', error);
      if (error.message === 'File category with this name already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create file category' });
    }
  }
);

// =============================================================================
// PUT /api/file-categories/:id - Update file category (admin only)
// =============================================================================
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid category ID format'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters'),
    body('allowed_extensions').optional().isArray().withMessage('Allowed extensions must be an array'),
    body('allowed_extensions.*').optional().trim().isLength({ min: 1 }).withMessage('Each extension must be non-empty'),
    body('max_file_size').optional().isInt({ min: 1 }).withMessage('Max file size must be a positive integer'),
    body('color_hex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon max 50 characters'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const updatedCategory = await withTransaction(async (client) => {
        // Get current category
        const existingCategory = await client.query(
          'SELECT * FROM file_categories WHERE id = $1',
          [categoryId]
        );
        
        if (existingCategory.rows.length === 0) {
          throw new Error('File category not found');
        }
        
        const currentCategory = existingCategory.rows[0];
        const updatedFields = {};
        
        // Build update fields
        const allowedFields = ['name', 'description', 'allowed_extensions', 'max_file_size', 'color_hex', 'icon', 'is_active'];
        for (const field of allowedFields) {
          if (req.body.hasOwnProperty(field) && req.body[field] !== currentCategory[field]) {
            updatedFields[field] = req.body[field];
          }
        }
        
        if (Object.keys(updatedFields).length === 0) {
          throw new Error('No valid fields to update');
        }
        
        // Check for duplicate name
        if (updatedFields.name && updatedFields.name !== currentCategory.name) {
          const duplicateCheck = await client.query(
            'SELECT id FROM file_categories WHERE name = $1 AND id != $2',
            [updatedFields.name, categoryId]
          );
          
          if (duplicateCheck.rows.length > 0) {
            throw new Error('File category with this name already exists');
          }
        }
        
        // Build and execute update query
        const updateParams = Object.values(updatedFields);
        const setClause = Object.keys(updatedFields).map((field, index) => 
          `${field} = $${index + 1}`
        ).join(', ');
        
        const updateQuery = `
          UPDATE file_categories 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${updateParams.length + 1}
          RETURNING id, name, description, allowed_extensions, max_file_size, color_hex, icon, is_active, updated_at
        `;
        
        updateParams.push(categoryId);
        const result = await client.query(updateQuery, updateParams);
        
        const category = result.rows[0];
        
        // Log activity
        const changeDescription = Object.keys(updatedFields)
          .map(field => `${field}: ${updatedFields[field]}`)
          .join(', ');
        
        await logActivity(
          client,
          req.user.id,
          'file_category',
          categoryId,
          'updated',
          `File category updated: ${changeDescription}`,
          { updated_fields: Object.keys(updatedFields) }
        );
        
        return category;
      });
      
      res.json({
        message: 'File category updated successfully',
        category: {
          ...updatedCategory,
          max_file_size_mb: updatedCategory.max_file_size ? Math.round(updatedCategory.max_file_size / 1048576) : null,
          allowed_extensions_list: updatedCategory.allowed_extensions || []
        }
      });
      
    } catch (error) {
      console.error('Error updating file category:', error);
      if (error.message.includes('already exists') || error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'File category not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update file category' });
    }
  }
);

// =============================================================================
// DELETE /api/file-categories/:id - Delete file category (admin only)
// =============================================================================
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid category ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const categoryId = req.params.id;
      
      const result = await withTransaction(async (client) => {
        // Check if category exists
        const existingCategory = await client.query(
          'SELECT * FROM file_categories WHERE id = $1',
          [categoryId]
        );
        
        if (existingCategory.rows.length === 0) {
          throw new Error('File category not found');
        }
        
        const category = existingCategory.rows[0];
        
        // Check if category has files
        const fileCount = await client.query(
          'SELECT COUNT(*) as count FROM files WHERE category_id = $1 AND is_active = true',
          [categoryId]
        );
        
        if (parseInt(fileCount.rows[0].count) > 0) {
          // Soft delete - just deactivate
          const deactivateQuery = `
            UPDATE file_categories 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, name, is_active, updated_at
          `;
          
          const deactivateResult = await client.query(deactivateQuery, [categoryId]);
          
          await logActivity(
            client,
            req.user.id,
            'file_category',
            categoryId,
            'deactivated',
            `File category deactivated: ${category.name} (had ${fileCount.rows[0].count} files)`,
            { file_count: parseInt(fileCount.rows[0].count) }
          );
          
          return {
            type: 'deactivated',
            category: deactivateResult.rows[0]
          };
        } else {
          // Hard delete if no files
          await client.query('DELETE FROM file_categories WHERE id = $1', [categoryId]);
          
          await logActivity(
            client,
            req.user.id,
            'file_category',
            categoryId,
            'deleted',
            `File category deleted: ${category.name}`,
            {}
          );
          
          return {
            type: 'deleted',
            category: { id: categoryId, name: category.name }
          };
        }
      });
      
      if (result.type === 'deactivated') {
        res.json({
          message: 'File category deactivated (has associated files)',
          category: result.category
        });
      } else {
        res.json({
          message: 'File category deleted successfully',
          category: result.category
        });
      }
      
    } catch (error) {
      console.error('Error deleting file category:', error);
      if (error.message === 'File category not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete file category' });
    }
  }
);

export default router;