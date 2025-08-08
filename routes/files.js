import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import { uploadSingle, uploadMultiple, getFileCategory, formatFileSize, cleanupFiles } from '../middleware/upload.js';
import { canViewFile, canDownloadFile, canEditFile, canDeleteFile, canUploadToProject } from '../middleware/filePermissions.js';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
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
      INSERT INTO activity_log (user_id, entity_type, entity_id, action, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, entityType, entityId, action, description, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error - logging should not break the main operation
  }
};

// =============================================================================
// POST /api/files/upload - Upload single or multiple files
// =============================================================================
router.post('/upload',
  authenticateToken,
  canUploadToProject,
  uploadMultiple('files', 10), // Allow up to 10 files
  [
    body('project_id').optional().isUUID().withMessage('Invalid project ID format'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
    body('is_public').optional().isBoolean().withMessage('is_public must be boolean'),
    body('category_id').optional().isUUID().withMessage('Invalid category ID format'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isUUID().withMessage('Each tag must be a valid UUID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { project_id, description, is_public = false, category_id, tags = [] } = req.body;
      const uploadedFiles = req.files || [];
      
      if (uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      const savedFiles = await withTransaction(async (client) => {
        const files = [];
        
        for (const file of uploadedFiles) {
          // Determine file category from database or fallback to detected category
          let fileCategoryId = category_id;
          if (!fileCategoryId) {
            const categoryResult = await client.query(
              `SELECT id FROM file_categories WHERE name = $1 AND is_active = true`,
              [getFileCategory(file.mimetype)]
            );
            if (categoryResult.rows.length > 0) {
              fileCategoryId = categoryResult.rows[0].id;
            }
          }
          
          // Insert file record into database
          const insertQuery = `
            INSERT INTO files (
              project_id, uploader_id, category_id, original_name, stored_name, file_path,
              file_size, mime_type, file_type, description, is_public
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, original_name, file_size, mime_type, file_type, created_at
          `;
          
          const result = await client.query(insertQuery, [
            project_id || null,
            userId,
            fileCategoryId,
            file.originalname,
            file.filename,
            file.path,
            file.size,
            file.mimetype,
            getFileCategory(file.mimetype),
            description || null,
            is_public
          ]);
          
          const savedFile = result.rows[0];
          
          // Add tags if provided
          if (tags && tags.length > 0) {
            for (const tagId of tags) {
              await client.query(
                `INSERT INTO file_tag_assignments (file_id, tag_id) 
                 VALUES ($1, $2) ON CONFLICT (file_id, tag_id) DO NOTHING`,
                [savedFile.id, tagId]
              );
            }
          }
          
          files.push({
            ...savedFile,
            file_size_formatted: formatFileSize(savedFile.file_size),
            tags: tags
          });
          
          // Log activity
          await logActivity(
            client,
            userId,
            'file',
            savedFile.id,
            'uploaded',
            `File uploaded: ${file.originalname}`,
            {
              file_size: file.size,
              mime_type: file.mimetype,
              project_id: project_id || null,
              category_id: fileCategoryId,
              tags_count: tags.length
            }
          );
        }
        
        return files;
      });
      
      // Send email notifications if files were uploaded to a project
      if (project_id && savedFiles.length > 0) {
        try {
          // Get project and client details
          const projectResult = await dbQuery(
            `SELECT p.name as project_name, p.client_id,
                    c.email, c.contact_person, c.company_name,
                    pt.phase_number, pt.phase_name
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
             WHERE p.id = $1`,
            [project_id]
          );
          
          if (projectResult.rows.length > 0 && req.user.role === 'admin') {
            const project = projectResult.rows[0];
            const clientName = project.contact_person || project.company_name;
            
            // Send notification for each uploaded file
            for (const file of savedFiles) {
              await sendTemplateEmail(EMAIL_TEMPLATES.FILE_UPLOADED, {
                to: project.email,
                userId: project.client_id,
                clientName: clientName,
                projectName: project.project_name,
                fileName: file.original_name,
                fileSize: formatFileSize(file.file_size),
                fileType: file.file_type,
                uploaderName: req.user.name || 'Admin',
                uploadDate: new Date(),
                phaseName: project.phase_name || 'Planning',
                downloadUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/portal#files/${file.id}`,
                description: description,
                context: 'file',
                type: 'file_upload'
              });
            }
          }
        } catch (emailError) {
          console.error('Failed to send file upload notification:', emailError);
          // Don't fail the request if email fails
        }
      }
      
      res.status(201).json({
        message: `${savedFiles.length} file(s) uploaded successfully`,
        files: savedFiles
      });
      
    } catch (error) {
      // Transaction will auto-rollback on error
      console.error('Error uploading files:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        await cleanupFiles(req.files);
      }
      
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

// =============================================================================
// GET /api/files - List files with pagination
// =============================================================================
router.get('/',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('project_id').optional().isUUID().withMessage('Invalid project ID format'),
    query('file_type').optional().isIn(['image', 'document', 'archive', 'other']).withMessage('Invalid file type'),
    query('search').optional().isString().trim().withMessage('Search must be a string'),
    query('sort').optional().isIn(['name', 'size', 'type', 'created_at']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const projectId = req.query.project_id;
      const fileType = req.query.file_type;
      const search = req.query.search || '';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';
      const folder = req.query.folder || '';
      
      // Build WHERE clause based on user permissions
      let whereClause = 'WHERE f.is_active = true';
      const queryParams = [];
      let paramCount = 0;
      
      // Non-admin users can only see their own files, files in their projects, or public files
      if (!isAdmin) {
        paramCount++;
        whereClause += ` AND (
          f.uploader_id = $${paramCount} OR 
          f.is_public = true OR 
          (f.project_id IS NOT NULL AND p.client_id = $${paramCount})
        )`;
        queryParams.push(userId);
      }
      
      // Filter by project
      if (projectId) {
        paramCount++;
        whereClause += ` AND f.project_id = $${paramCount}`;
        queryParams.push(projectId);
      }
      
      // Filter by file type
      if (fileType) {
        paramCount++;
        whereClause += ` AND f.file_type = $${paramCount}`;
        queryParams.push(fileType);
      }
      
      // Search in file names
      if (search) {
        paramCount++;
        whereClause += ` AND f.original_name ILIKE $${paramCount}`;
        queryParams.push(`%${search}%`);
      }
      
      // Handle folder parameter (for now, just accept all folders)
      // In the future, we could add a folder_path column to files table
      // For now, we'll just log the folder request and return all files
      if (folder) {
        console.log(`Files requested for folder: ${folder}`);
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM files f
        LEFT JOIN projects p ON f.project_id = p.id
        ${whereClause}
      `;
      const countResult = await dbQuery(countQuery, queryParams);
      const totalFiles = parseInt(countResult.rows[0].total);
      
      // Get files
      const sortField = sort === 'name' ? 'f.original_name' : 
                       sort === 'size' ? 'f.file_size' :
                       sort === 'type' ? 'f.file_type' : 'f.created_at';
      
      const filesQuery = `
        SELECT 
          f.id,
          f.original_name,
          f.file_size,
          f.mime_type,
          f.file_type,
          f.description,
          f.is_public,
          f.download_count,
          f.version_number,
          f.created_at,
          f.updated_at,
          u.first_name || ' ' || u.last_name as uploader_name,
          u.email as uploader_email,
          p.name as project_name,
          p.id as project_id
        FROM files f
        LEFT JOIN users u ON f.uploader_id = u.id
        LEFT JOIN projects p ON f.project_id = p.id
        ${whereClause}
        ORDER BY ${sortField} ${order.toUpperCase()}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const filesResult = await dbQuery(filesQuery, queryParams);
      
      // Format file sizes
      const files = filesResult.rows.map(file => ({
        ...file,
        file_size_formatted: formatFileSize(file.file_size)
      }));
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalFiles / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
      
      res.json({
        files,
        pagination: {
          currentPage: page,
          totalPages,
          totalFiles,
          limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          project_id: projectId,
          file_type: fileType,
          search,
          sort,
          order
        }
      });
      
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  }
);

// =============================================================================
// GET /api/files/:id - Get file metadata
// =============================================================================
router.get('/:id',
  authenticateToken,
  canViewFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const fileId = req.params.id;
      
      const fileQuery = `
        SELECT 
          f.id,
          f.original_name,
          f.stored_name,
          f.file_size,
          f.mime_type,
          f.file_type,
          f.description,
          f.is_public,
          f.download_count,
          f.version_number,
          f.parent_file_id,
          f.created_at,
          f.updated_at,
          u.first_name || ' ' || u.last_name as uploader_name,
          u.email as uploader_email,
          p.name as project_name,
          p.id as project_id
        FROM files f
        LEFT JOIN users u ON f.uploader_id = u.id
        LEFT JOIN projects p ON f.project_id = p.id
        WHERE f.id = $1 AND f.is_active = true
      `;
      
      const result = await dbQuery(fileQuery, [fileId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const file = {
        ...result.rows[0],
        file_size_formatted: formatFileSize(result.rows[0].file_size)
      };
      
      res.json({ file });
      
    } catch (error) {
      console.error('Error fetching file metadata:', error);
      res.status(500).json({ error: 'Failed to fetch file metadata' });
    }
  }
);

// =============================================================================
// GET /api/files/:id/download - Download file
// =============================================================================
router.get('/:id/download',
  authenticateToken,
  canDownloadFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    // Using withTransaction pattern
    
    try {
      const fileId = req.params.id;
      const userId = req.user.id;
      
      // Get file information
      const fileQuery = `
        SELECT 
          id, original_name, stored_name, file_path, file_size, mime_type
        FROM files 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await client.query(fileQuery, [fileId]);
      
      if (result.rows.length === 0) {
        // Transaction will auto-rollback on error
        return res.status(404).json({ error: 'File not found' });
      }
      
      const file = result.rows[0];
      
      // Check if file exists on disk
      if (!await fs.pathExists(file.file_path)) {
        // Transaction will auto-rollback on error
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      // Update download count
      await client.query(
        'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
        [fileId]
      );
      
      // Log activity
      await logActivity(
        client,
        userId,
        'file',
        fileId,
        'downloaded',
        `File downloaded: ${file.original_name}`,
        {
          file_size: file.file_size,
          mime_type: file.mime_type
        }
      );
      
      // Transaction will auto-commit on success
      
      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', file.file_size);
      
      // Stream the file
      const fileStream = fs.createReadStream(file.file_path);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      });
      
    } catch (error) {
      // Transaction will auto-rollback on error
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    }
  }
);

// =============================================================================
// PUT /api/files/:id - Update file metadata
// =============================================================================
router.put('/:id',
  authenticateToken,
  canEditFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
    body('is_public').optional().isBoolean().withMessage('is_public must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    // Using withTransaction pattern
    
    try {
      const fileId = req.params.id;
      const userId = req.user.id;
      const { description, is_public } = req.body;
      
      // Check if file exists
      const existingFileQuery = 'SELECT * FROM files WHERE id = $1 AND is_active = true';
      const existingFile = await client.query(existingFileQuery, [fileId]);
      
      if (existingFile.rows.length === 0) {
        // Transaction will auto-rollback on error
        return res.status(404).json({ error: 'File not found' });
      }
      
      const currentFile = existingFile.rows[0];
      const updatedFields = {};
      const updateParams = [];
      let paramCount = 0;
      
      // Build dynamic update query
      if (description !== undefined && description !== currentFile.description) {
        paramCount++;
        updatedFields.description = description;
        updateParams.push(description);
      }
      
      if (is_public !== undefined && is_public !== currentFile.is_public) {
        paramCount++;
        updatedFields.is_public = is_public;
        updateParams.push(is_public);
      }
      
      if (paramCount === 0) {
        // Transaction will auto-rollback on error
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Build and execute update query
      const setClause = Object.keys(updatedFields).map((field, index) => 
        `${field} = $${index + 1}`
      ).join(', ');
      
      const updateQuery = `
        UPDATE files 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount + 1} AND is_active = true
        RETURNING id, original_name, description, is_public, updated_at
      `;
      
      updateParams.push(fileId);
      const result = await client.query(updateQuery, updateParams);
      const updatedFile = result.rows[0];
      
      // Log activity
      const changeDescription = Object.keys(updatedFields)
        .map(field => `${field}: ${updatedFields[field]}`)
        .join(', ');
      
      await logActivity(
        client,
        userId,
        'file',
        fileId,
        'updated',
        `File updated: ${changeDescription}`,
        { updated_fields: Object.keys(updatedFields) }
      );
      
      // Transaction will auto-commit on success
      
      res.json({
        message: 'File updated successfully',
        file: updatedFile
      });
      
    } catch (error) {
      // Transaction will auto-rollback on error
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  }
);

// =============================================================================
// DELETE /api/files/:id - Soft delete file
// =============================================================================
router.delete('/:id',
  authenticateToken,
  canDeleteFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    // Using withTransaction pattern
    
    try {
      const fileId = req.params.id;
      const userId = req.user.id;
      
      // Check if file exists and is active
      const existingFileQuery = 'SELECT * FROM files WHERE id = $1 AND is_active = true';
      const existingFile = await client.query(existingFileQuery, [fileId]);
      
      if (existingFile.rows.length === 0) {
        // Transaction will auto-rollback on error
        return res.status(404).json({ error: 'File not found' });
      }
      
      const fileData = existingFile.rows[0];
      
      // Soft delete the file (set is_active = false)
      const deleteQuery = `
        UPDATE files 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
        RETURNING id, original_name, is_active, updated_at
      `;
      
      const result = await client.query(deleteQuery, [fileId]);
      const deletedFile = result.rows[0];
      
      // Log activity
      await logActivity(
        client,
        userId,
        'file',
        fileId,
        'deleted',
        `File deleted: ${fileData.original_name}`,
        {
          file_size: fileData.file_size,
          mime_type: fileData.mime_type
        }
      );
      
      // Transaction will auto-commit on success
      
      res.json({
        message: 'File deleted successfully',
        file: deletedFile
      });
      
    } catch (error) {
      // Transaction will auto-rollback on error
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
);

// =============================================================================
// GET /api/files/:id/thumbnail - Get file thumbnail
// =============================================================================
router.get('/:id/thumbnail',
  authenticateToken,
  canViewFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const fileId = req.params.id;
      
      // Get file information
      const fileQuery = `
        SELECT 
          id, original_name, stored_name, file_path, file_size, mime_type, file_type
        FROM files 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await dbQuery(fileQuery, [fileId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const file = result.rows[0];
      
      // Only generate thumbnails for images
      if (file.file_type !== 'image') {
        return res.status(400).json({ error: 'Thumbnails only available for images' });
      }
      
      // Check if file exists on disk
      if (!await fs.pathExists(file.file_path)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      // Generate thumbnail path
      const uploadsDir = path.dirname(file.file_path);
      const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
      const thumbnailPath = path.join(thumbnailsDir, `thumb_${file.stored_name}`);
      
      // Create thumbnails directory if it doesn't exist
      await fs.ensureDir(thumbnailsDir);
      
      // Check if thumbnail already exists
      if (!await fs.pathExists(thumbnailPath)) {
        try {
          // Generate thumbnail using sharp (you'll need to install: npm install sharp)
          const sharp = require('sharp');
          await sharp(file.file_path)
            .resize(300, 300, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
        } catch (thumbnailError) {
          console.error('Thumbnail generation failed:', thumbnailError);
          return res.status(500).json({ error: 'Failed to generate thumbnail' });
        }
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      // Stream thumbnail
      const thumbnailStream = fs.createReadStream(thumbnailPath);
      thumbnailStream.pipe(res);
      
      thumbnailStream.on('error', (error) => {
        console.error('Error streaming thumbnail:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error loading thumbnail' });
        }
      });
      
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to load thumbnail' });
      }
    }
  }
);

// =============================================================================
// GET /api/files/:id/preview - Get file preview (full size image)
// =============================================================================
router.get('/:id/preview',
  authenticateToken,
  canViewFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const fileId = req.params.id;
      
      // Get file information
      const fileQuery = `
        SELECT 
          id, original_name, stored_name, file_path, file_size, mime_type, file_type
        FROM files 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await dbQuery(fileQuery, [fileId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const file = result.rows[0];
      
      // Only allow preview for images
      if (file.file_type !== 'image') {
        return res.status(400).json({ error: 'Preview only available for images' });
      }
      
      // Check if file exists on disk
      if (!await fs.pathExists(file.file_path)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(file.file_path);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming preview:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error loading preview' });
        }
      });
      
    } catch (error) {
      console.error('Error loading preview:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to load preview' });
      }
    }
  }
);

// =============================================================================
// GET /api/files/phase/:phaseId - Get files for a project phase
// =============================================================================
router.get('/phase/:phaseId',
  authenticateToken,
  [
    param('phaseId').isUUID().withMessage('Invalid phase ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { phaseId } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // First verify user has access to this phase
      const phaseAccessQuery = `
        SELECT pp.*, p.client_id, p.admin_id
        FROM project_phases pp
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.id = $1 AND (p.client_id = $2 OR p.admin_id = $2 OR $3 = true)
      `;
      
      const phaseResult = await dbQuery(phaseAccessQuery, [phaseId, userId, isAdmin]);
      
      if (phaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found or access denied' });
      }
      
      // Get files for this phase
      const filesQuery = `
        SELECT 
          f.id,
          f.original_name,
          f.file_size,
          f.mime_type,
          f.file_type,
          f.description,
          f.is_public,
          f.download_count,
          f.version_number,
          f.created_at,
          u.first_name || ' ' || u.last_name as uploaded_by_name,
          u.email as uploader_email
        FROM files f
        LEFT JOIN users u ON f.uploader_id = u.id
        WHERE f.phase_id = $1 AND f.is_active = true
        ORDER BY f.created_at DESC
      `;
      
      const filesResult = await dbQuery(filesQuery, [phaseId]);
      
      const files = filesResult.rows.map(file => ({
        id: file.id,
        name: file.original_name,
        type: file.mime_type,
        file_type: file.file_type,
        size: file.file_size,
        size_formatted: formatFileSize(file.file_size),
        description: file.description,
        version: file.version_number,
        upload_timestamp: file.created_at,
        uploaded_by_name: file.uploaded_by_name,
        uploaded_by_email: file.uploader_email,
        download_count: file.download_count,
        thumbnail_url: file.file_type === 'image' ? `/api/files/${file.id}/thumbnail` : null
      }));
      
      res.json({ files });
      
    } catch (error) {
      console.error('Error fetching phase files:', error);
      res.status(500).json({ error: 'Failed to fetch phase files' });
    }
  }
);

// =============================================================================
// GET /api/files/:id/technical-specs - Get technical specifications for a file
// =============================================================================
router.get('/:id/technical-specs',
  authenticateToken,
  canViewFile,
  [
    param('id').isUUID().withMessage('Invalid file ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const fileId = req.params.id;
      
      // Get technical specs from database
      const specsQuery = `
        SELECT 
          fts.*,
          f.original_name,
          f.file_size,
          f.mime_type
        FROM file_technical_specs fts
        JOIN files f ON fts.file_id = f.id
        WHERE fts.file_id = $1 AND f.is_active = true
      `;
      
      const result = await dbQuery(specsQuery, [fileId]);
      
      if (result.rows.length === 0) {
        // If no specs exist, try to generate them
        const fileQuery = `
          SELECT id, original_name, file_path, file_size, mime_type, file_type
          FROM files 
          WHERE id = $1 AND is_active = true
        `;
        
        const fileResult = await dbQuery(fileQuery, [fileId]);
        
        if (fileResult.rows.length === 0) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        const file = fileResult.rows[0];
        
        // Generate basic specs based on file type
        const extension = path.extname(file.original_name).substring(1).toUpperCase();
        let specs = {
          file_id: fileId,
          dpi_horizontal: ['AI', 'PDF', 'PSD', 'TIFF'].includes(extension) ? 300 : 72,
          dpi_vertical: ['AI', 'PDF', 'PSD', 'TIFF'].includes(extension) ? 300 : 72,
          color_mode: ['AI', 'PDF', 'PSD'].includes(extension) ? 'CMYK' : 'RGB',
          has_bleed: false,
          is_print_ready: ['AI', 'PDF'].includes(extension),
          validation_errors: [],
          validation_warnings: [],
          processed_at: new Date().toISOString(),
          processing_engine: 'fallback'
        };
        
        // Try to insert the basic specs
        try {
          await dbQuery(`
            INSERT INTO file_technical_specs (
              file_id, dpi_horizontal, dpi_vertical, color_mode, 
              has_bleed, is_print_ready, validation_errors, validation_warnings,
              processed_at, processing_engine
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            specs.file_id, specs.dpi_horizontal, specs.dpi_vertical, 
            specs.color_mode, specs.has_bleed, specs.is_print_ready,
            JSON.stringify(specs.validation_errors), 
            JSON.stringify(specs.validation_warnings),
            specs.processed_at, specs.processing_engine
          ]);
        } catch (insertError) {
          console.error('Failed to insert file specs:', insertError);
        }
        
        return res.json(specs);
      }
      
      res.json(result.rows[0]);
      
    } catch (error) {
      console.error('Error fetching file technical specs:', error);
      res.status(500).json({ error: 'Failed to fetch file technical specifications' });
    }
  }
);

export default router;