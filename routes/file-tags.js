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
// GET /api/file-tags - List all file tags
// =============================================================================
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const tagsQuery = `
        SELECT 
          ft.id, ft.name, ft.color_hex, ft.created_at,
          COUNT(fta.file_id) as usage_count
        FROM file_tags ft
        LEFT JOIN file_tag_assignments fta ON ft.id = fta.tag_id
        LEFT JOIN files f ON fta.file_id = f.id AND f.is_active = true
        GROUP BY ft.id, ft.name, ft.color_hex, ft.created_at
        ORDER BY ft.name ASC
      `;
      
      const result = await dbQuery(tagsQuery);
      
      res.json({ 
        tags: result.rows.map(tag => ({
          ...tag,
          usage_count: parseInt(tag.usage_count) || 0
        }))
      });
      
    } catch (error) {
      console.error('Error fetching file tags:', error);
      res.status(500).json({ error: 'Failed to fetch file tags' });
    }
  }
);

// =============================================================================
// GET /api/file-tags/:id - Get specific file tag with files
// =============================================================================
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid tag ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const tagId = req.params.id;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const tagQuery = `
        SELECT ft.*, COUNT(fta.file_id) as usage_count
        FROM file_tags ft
        LEFT JOIN file_tag_assignments fta ON ft.id = fta.tag_id
        LEFT JOIN files f ON fta.file_id = f.id AND f.is_active = true
        WHERE ft.id = $1
        GROUP BY ft.id, ft.name, ft.color_hex, ft.created_at
      `;
      
      const tagResult = await dbQuery(tagQuery, [tagId]);
      
      if (tagResult.rows.length === 0) {
        return res.status(404).json({ error: 'File tag not found' });
      }
      
      const tag = tagResult.rows[0];
      
      // Get files with this tag (with permission filtering)
      let filesQuery = `
        SELECT 
          f.id, f.original_name, f.file_size, f.file_type, f.mime_type,
          f.created_at, f.is_public,
          u.first_name || ' ' || u.last_name as uploader_name,
          p.name as project_name, p.id as project_id
        FROM files f
        JOIN file_tag_assignments fta ON f.id = fta.file_id
        LEFT JOIN users u ON f.uploader_id = u.id
        LEFT JOIN projects p ON f.project_id = p.id
        WHERE fta.tag_id = $1 AND f.is_active = true
      `;
      
      const queryParams = [tagId];
      
      // Non-admin users can only see their own files, files in their projects, or public files
      if (!isAdmin) {
        filesQuery += ` AND (
          f.uploader_id = $2 OR 
          f.is_public = true OR 
          (f.project_id IS NOT NULL AND p.client_id = (SELECT client_id FROM users WHERE id = $2))
        )`;
        queryParams.push(userId);
      }
      
      filesQuery += ` ORDER BY f.created_at DESC LIMIT 50`;
      
      const filesResult = await dbQuery(filesQuery, queryParams);
      
      res.json({
        tag: {
          ...tag,
          usage_count: parseInt(tag.usage_count) || 0,
          files: filesResult.rows
        }
      });
      
    } catch (error) {
      console.error('Error fetching file tag:', error);
      res.status(500).json({ error: 'Failed to fetch file tag' });
    }
  }
);

// =============================================================================
// POST /api/file-tags - Create new file tag (admin only)
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required (max 50 characters)'),
    body('color_hex').matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, color_hex } = req.body;
      
      const tag = await withTransaction(async (client) => {
        // Check if tag name already exists
        const existingTag = await client.query(
          'SELECT id FROM file_tags WHERE name = $1',
          [name]
        );
        
        if (existingTag.rows.length > 0) {
          throw new Error('File tag with this name already exists');
        }
        
        // Insert new tag
        const insertQuery = `
          INSERT INTO file_tags (name, color_hex)
          VALUES ($1, $2)
          RETURNING id, name, color_hex, created_at
        `;
        
        const result = await client.query(insertQuery, [name, color_hex]);
        const newTag = result.rows[0];
        
        // Log activity
        await logActivity(
          client,
          req.user.id,
          'file_tag',
          newTag.id,
          'created',
          `File tag created: ${name}`,
          { color_hex }
        );
        
        return newTag;
      });
      
      res.status(201).json({
        message: 'File tag created successfully',
        tag: { ...tag, usage_count: 0 }
      });
      
    } catch (error) {
      console.error('Error creating file tag:', error);
      if (error.message === 'File tag with this name already exists') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create file tag' });
    }
  }
);

// =============================================================================
// PUT /api/file-tags/:id - Update file tag (admin only)
// =============================================================================
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid tag ID format'),
    body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
    body('color_hex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const tagId = req.params.id;
      
      const updatedTag = await withTransaction(async (client) => {
        // Get current tag
        const existingTag = await client.query(
          'SELECT * FROM file_tags WHERE id = $1',
          [tagId]
        );
        
        if (existingTag.rows.length === 0) {
          throw new Error('File tag not found');
        }
        
        const currentTag = existingTag.rows[0];
        const updatedFields = {};
        
        // Build update fields
        if (req.body.name && req.body.name !== currentTag.name) {
          updatedFields.name = req.body.name;
        }
        if (req.body.color_hex && req.body.color_hex !== currentTag.color_hex) {
          updatedFields.color_hex = req.body.color_hex;
        }
        
        if (Object.keys(updatedFields).length === 0) {
          throw new Error('No valid fields to update');
        }
        
        // Check for duplicate name
        if (updatedFields.name) {
          const duplicateCheck = await client.query(
            'SELECT id FROM file_tags WHERE name = $1 AND id != $2',
            [updatedFields.name, tagId]
          );
          
          if (duplicateCheck.rows.length > 0) {
            throw new Error('File tag with this name already exists');
          }
        }
        
        // Build and execute update query
        const updateParams = Object.values(updatedFields);
        const setClause = Object.keys(updatedFields).map((field, index) => 
          `${field} = $${index + 1}`
        ).join(', ');
        
        const updateQuery = `
          UPDATE file_tags 
          SET ${setClause}
          WHERE id = $${updateParams.length + 1}
          RETURNING id, name, color_hex, created_at
        `;
        
        updateParams.push(tagId);
        const result = await client.query(updateQuery, updateParams);
        const tag = result.rows[0];
        
        // Log activity
        const changeDescription = Object.keys(updatedFields)
          .map(field => `${field}: ${updatedFields[field]}`)
          .join(', ');
        
        await logActivity(
          client,
          req.user.id,
          'file_tag',
          tagId,
          'updated',
          `File tag updated: ${changeDescription}`,
          { updated_fields: Object.keys(updatedFields) }
        );
        
        return tag;
      });
      
      res.json({
        message: 'File tag updated successfully',
        tag: updatedTag
      });
      
    } catch (error) {
      console.error('Error updating file tag:', error);
      if (error.message.includes('already exists') || error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'File tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update file tag' });
    }
  }
);

// =============================================================================
// DELETE /api/file-tags/:id - Delete file tag (admin only)
// =============================================================================
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid tag ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const tagId = req.params.id;
      
      const deletedTag = await withTransaction(async (client) => {
        // Check if tag exists
        const existingTag = await client.query(
          'SELECT * FROM file_tags WHERE id = $1',
          [tagId]
        );
        
        if (existingTag.rows.length === 0) {
          throw new Error('File tag not found');
        }
        
        const tag = existingTag.rows[0];
        
        // Remove all tag assignments first
        await client.query(
          'DELETE FROM file_tag_assignments WHERE tag_id = $1',
          [tagId]
        );
        
        // Delete the tag
        await client.query('DELETE FROM file_tags WHERE id = $1', [tagId]);
        
        // Log activity
        await logActivity(
          client,
          req.user.id,
          'file_tag',
          tagId,
          'deleted',
          `File tag deleted: ${tag.name}`,
          {}
        );
        
        return { id: tagId, name: tag.name };
      });
      
      res.json({
        message: 'File tag deleted successfully',
        tag: deletedTag
      });
      
    } catch (error) {
      console.error('Error deleting file tag:', error);
      if (error.message === 'File tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete file tag' });
    }
  }
);

// =============================================================================
// POST /api/file-tags/:id/assign - Assign tag to files
// =============================================================================
router.post('/:id/assign',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid tag ID format'),
    body('file_ids').isArray().withMessage('File IDs must be an array'),
    body('file_ids.*').isUUID().withMessage('Each file ID must be a valid UUID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const tagId = req.params.id;
      const { file_ids } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const result = await withTransaction(async (client) => {
        // Verify tag exists
        const tagResult = await client.query('SELECT name FROM file_tags WHERE id = $1', [tagId]);
        if (tagResult.rows.length === 0) {
          throw new Error('File tag not found');
        }
        
        const tagName = tagResult.rows[0].name;
        const assignedFiles = [];
        const skippedFiles = [];
        
        for (const fileId of file_ids) {
          // Check if user can edit this file
          let fileAccessQuery = `
            SELECT f.id, f.original_name, f.uploader_id, p.client_id
            FROM files f
            LEFT JOIN projects p ON f.project_id = p.id
            WHERE f.id = $1 AND f.is_active = true
          `;
          
          const fileResult = await client.query(fileAccessQuery, [fileId]);
          
          if (fileResult.rows.length === 0) {
            skippedFiles.push({ fileId, reason: 'File not found' });
            continue;
          }
          
          const file = fileResult.rows[0];
          
          // Check permissions
          const canEdit = isAdmin || file.uploader_id === userId || 
            (file.client_id && file.client_id === (await client.query('SELECT client_id FROM users WHERE id = $1', [userId])).rows[0]?.client_id);
          
          if (!canEdit) {
            skippedFiles.push({ fileId, reason: 'No permission to edit this file' });
            continue;
          }
          
          // Assign tag (ignore if already assigned)
          try {
            await client.query(
              'INSERT INTO file_tag_assignments (file_id, tag_id) VALUES ($1, $2) ON CONFLICT (file_id, tag_id) DO NOTHING',
              [fileId, tagId]
            );
            
            assignedFiles.push({
              fileId,
              fileName: file.original_name
            });
          } catch (insertError) {
            skippedFiles.push({ fileId, reason: 'Database error' });
          }
        }
        
        // Log activity
        if (assignedFiles.length > 0) {
          await logActivity(
            client,
            userId,
            'file_tag',
            tagId,
            'assigned',
            `Tag "${tagName}" assigned to ${assignedFiles.length} files`,
            { 
              assigned_files: assignedFiles.length,
              skipped_files: skippedFiles.length,
              tag_name: tagName
            }
          );
        }
        
        return { tagName, assignedFiles, skippedFiles };
      });
      
      res.json({
        message: `Tag assigned to ${result.assignedFiles.length} files`,
        tag_name: result.tagName,
        assigned_files: result.assignedFiles,
        skipped_files: result.skippedFiles
      });
      
    } catch (error) {
      console.error('Error assigning file tag:', error);
      if (error.message === 'File tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to assign file tag' });
    }
  }
);

// =============================================================================
// DELETE /api/file-tags/:id/remove - Remove tag from files
// =============================================================================
router.delete('/:id/remove',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid tag ID format'),
    body('file_ids').isArray().withMessage('File IDs must be an array'),
    body('file_ids.*').isUUID().withMessage('Each file ID must be a valid UUID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const tagId = req.params.id;
      const { file_ids } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      const result = await withTransaction(async (client) => {
        // Verify tag exists
        const tagResult = await client.query('SELECT name FROM file_tags WHERE id = $1', [tagId]);
        if (tagResult.rows.length === 0) {
          throw new Error('File tag not found');
        }
        
        const tagName = tagResult.rows[0].name;
        const removedFiles = [];
        const skippedFiles = [];
        
        for (const fileId of file_ids) {
          // Check if user can edit this file
          let fileAccessQuery = `
            SELECT f.id, f.original_name, f.uploader_id, p.client_id
            FROM files f
            LEFT JOIN projects p ON f.project_id = p.id
            WHERE f.id = $1 AND f.is_active = true
          `;
          
          const fileResult = await client.query(fileAccessQuery, [fileId]);
          
          if (fileResult.rows.length === 0) {
            skippedFiles.push({ fileId, reason: 'File not found' });
            continue;
          }
          
          const file = fileResult.rows[0];
          
          // Check permissions
          const canEdit = isAdmin || file.uploader_id === userId || 
            (file.client_id && file.client_id === (await client.query('SELECT client_id FROM users WHERE id = $1', [userId])).rows[0]?.client_id);
          
          if (!canEdit) {
            skippedFiles.push({ fileId, reason: 'No permission to edit this file' });
            continue;
          }
          
          // Remove tag assignment
          const removeResult = await client.query(
            'DELETE FROM file_tag_assignments WHERE file_id = $1 AND tag_id = $2',
            [fileId, tagId]
          );
          
          if (removeResult.rowCount > 0) {
            removedFiles.push({
              fileId,
              fileName: file.original_name
            });
          } else {
            skippedFiles.push({ fileId, reason: 'Tag was not assigned to this file' });
          }
        }
        
        // Log activity
        if (removedFiles.length > 0) {
          await logActivity(
            client,
            userId,
            'file_tag',
            tagId,
            'removed',
            `Tag "${tagName}" removed from ${removedFiles.length} files`,
            { 
              removed_files: removedFiles.length,
              skipped_files: skippedFiles.length,
              tag_name: tagName
            }
          );
        }
        
        return { tagName, removedFiles, skippedFiles };
      });
      
      res.json({
        message: `Tag removed from ${result.removedFiles.length} files`,
        tag_name: result.tagName,
        removed_files: result.removedFiles,
        skipped_files: result.skippedFiles
      });
      
    } catch (error) {
      console.error('Error removing file tag:', error);
      if (error.message === 'File tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to remove file tag' });
    }
  }
);

export default router;