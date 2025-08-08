import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs-extra';

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
// GET /api/research/items - Get research items for a project
// =============================================================================
router.get('/items',
  authenticateToken,
  [
    query('project_id').isUUID().withMessage('Invalid project ID format'),
    query('type').optional().isString().withMessage('Type must be a string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { project_id, type, limit = 50, offset = 0 } = req.query;
      const userId = req.user.id;

      // Verify user has access to the project
      const projectCheck = await dbQuery(`
        SELECT p.id, p.client_id 
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1 AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
      `, [project_id, userId, req.user.role === 'admin']);

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      let typeFilter = '';
      const queryParams = [project_id, limit, offset];
      let paramCount = 3;

      if (type) {
        typeFilter = `AND ri.research_type = $${++paramCount}`;
        queryParams.push(type);
      }

      const query = `
        SELECT 
          ri.*,
          COUNT(DISTINCT rf.id) as findings_count,
          COUNT(DISTINCT f.id) as documents_count,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', rf.id,
                'text', rf.finding_text,
                'highlighted', rf.is_highlighted,
                'created_at', rf.created_at
              )
            ) FILTER (WHERE rf.id IS NOT NULL), 
            '[]'::json
          ) as findings,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', f.id,
                'original_name', f.original_name,
                'file_size', f.file_size,
                'mime_type', f.mime_type,
                'created_at', f.created_at
              )
            ) FILTER (WHERE f.id IS NOT NULL), 
            '[]'::json
          ) as documents
        FROM research_items ri
        LEFT JOIN research_findings rf ON ri.id = rf.research_item_id
        LEFT JOIN research_documents rd ON ri.id = rd.research_item_id
        LEFT JOIN files f ON rd.file_id = f.id
        WHERE ri.project_id = $1 ${typeFilter}
        GROUP BY ri.id
        ORDER BY ri.updated_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await dbQuery(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM research_items ri
        WHERE ri.project_id = $1 ${typeFilter}
      `;
      const countParams = [project_id];
      if (type) countParams.push(type);
      
      const countResult = await dbQuery(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        items: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      });
    } catch (error) {
      console.error('Error fetching research items:', error);
      res.status(500).json({ 
        error: 'Failed to fetch research items',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// GET /api/research/items/:id - Get single research item with full details
// =============================================================================
router.get('/items/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid research item ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const query = `
        SELECT 
          ri.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', rf.id,
                'text', rf.finding_text,
                'highlighted', rf.is_highlighted,
                'tags', rf.tags,
                'created_at', rf.created_at
              )
            ) FILTER (WHERE rf.id IS NOT NULL), 
            '[]'::json
          ) as findings,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', f.id,
                'original_name', f.original_name,
                'file_size', f.file_size,
                'mime_type', f.mime_type,
                'file_path', f.file_path,
                'created_at', f.created_at
              )
            ) FILTER (WHERE f.id IS NOT NULL), 
            '[]'::json
          ) as documents
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN research_findings rf ON ri.id = rf.research_item_id
        LEFT JOIN research_documents rd ON ri.id = rd.research_item_id
        LEFT JOIN files f ON rd.file_id = f.id
        WHERE ri.id = $1 AND (c.admin_id = $2 OR p.client_id = $2 OR $3 = true)
        GROUP BY ri.id
      `;

      const result = await dbQuery(query, [id, userId, req.user.role === 'admin']);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Research item not found' });
      }

      res.json({
        success: true,
        item: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching research item:', error);
      res.status(500).json({ 
        error: 'Failed to fetch research item',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// POST /api/research/items - Create new research item
// =============================================================================
router.post('/items',
  authenticateToken,
  [
    body('project_id').isUUID().withMessage('Invalid project ID format'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('research_type').isIn(['market_analysis', 'user_research', 'competitive_analysis', 'brand_audit']).withMessage('Invalid research type'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('findings').optional().isArray().withMessage('Findings must be an array'),
    body('document_ids').optional().isArray().withMessage('Document IDs must be an array')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { project_id, title, research_type, description, tags, findings, document_ids } = req.body;
      const userId = req.user.id;

      // Verify user has access to the project
      const projectCheck = await client.query(`
        SELECT p.id, p.client_id 
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1 AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
      `, [project_id, userId, req.user.role === 'admin']);

      if (projectCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      // Create research item
      const researchId = uuidv4();
      const insertResearchQuery = `
        INSERT INTO research_items (
          id, project_id, title, research_type, description, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const researchResult = await client.query(insertResearchQuery, [
        researchId, project_id, title, research_type, description, tags || [], userId
      ]);

      // Add findings if provided
      if (findings && findings.length > 0) {
        for (const finding of findings) {
          if (finding.text && finding.text.trim()) {
            await client.query(`
              INSERT INTO research_findings (id, research_item_id, finding_text, is_highlighted, tags, created_by)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [uuidv4(), researchId, finding.text.trim(), finding.highlighted || false, finding.tags || [], userId]);
          }
        }
      }

      // Link documents if provided
      if (document_ids && document_ids.length > 0) {
        for (const fileId of document_ids) {
          // Verify file exists and user has access
          const fileCheck = await client.query(`
            SELECT id FROM files 
            WHERE id = $1 AND (uploader_id = $2 OR is_public = true)
          `, [fileId, userId]);

          if (fileCheck.rows.length > 0) {
            await client.query(`
              INSERT INTO research_documents (id, research_item_id, file_id, added_by)
              VALUES ($1, $2, $3, $4)
            `, [uuidv4(), researchId, fileId, userId]);
          }
        }
      }

      // Log activity
      await logActivity(client, userId, 'research_item', researchId, 'created', 
        `Created research item: ${title}`, { research_type, project_id });

      await commitTransaction(client);

      res.status(201).json({
        success: true,
        item: researchResult.rows[0]
      });
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error creating research item:', error);
      res.status(500).json({ 
        error: 'Failed to create research item',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// PUT /api/research/items/:id - Update research item
// =============================================================================
router.put('/items/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid research item ID format'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('research_type').isIn(['market_analysis', 'user_research', 'competitive_analysis', 'brand_audit']).withMessage('Invalid research type'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('findings').optional().isArray().withMessage('Findings must be an array'),
    body('document_ids').optional().isArray().withMessage('Document IDs must be an array')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { id } = req.params;
      const { title, research_type, description, tags, findings, document_ids } = req.body;
      const userId = req.user.id;

      // Verify user has access to the research item
      const accessCheck = await client.query(`
        SELECT ri.id, ri.project_id
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ri.id = $1 AND (c.admin_id = $2 OR p.client_id = $2 OR $3 = true)
      `, [id, userId, req.user.role === 'admin']);

      if (accessCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(403).json({ error: 'Access denied to this research item' });
      }

      // Update research item
      const updateQuery = `
        UPDATE research_items 
        SET title = $1, research_type = $2, description = $3, tags = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const researchResult = await client.query(updateQuery, [
        title, research_type, description, tags || [], id
      ]);

      // Update findings - remove existing and add new ones
      await client.query('DELETE FROM research_findings WHERE research_item_id = $1', [id]);
      
      if (findings && findings.length > 0) {
        for (const finding of findings) {
          if (finding.text && finding.text.trim()) {
            await client.query(`
              INSERT INTO research_findings (id, research_item_id, finding_text, is_highlighted, tags, created_by)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [uuidv4(), id, finding.text.trim(), finding.highlighted || false, finding.tags || [], userId]);
          }
        }
      }

      // Update documents - remove existing and add new ones
      await client.query('DELETE FROM research_documents WHERE research_item_id = $1', [id]);
      
      if (document_ids && document_ids.length > 0) {
        for (const fileId of document_ids) {
          // Verify file exists and user has access
          const fileCheck = await client.query(`
            SELECT id FROM files 
            WHERE id = $1 AND (uploader_id = $2 OR is_public = true)
          `, [fileId, userId]);

          if (fileCheck.rows.length > 0) {
            await client.query(`
              INSERT INTO research_documents (id, research_item_id, file_id, added_by)
              VALUES ($1, $2, $3, $4)
            `, [uuidv4(), id, fileId, userId]);
          }
        }
      }

      // Log activity
      await logActivity(client, userId, 'research_item', id, 'updated', 
        `Updated research item: ${title}`, { research_type });

      await commitTransaction(client);

      res.json({
        success: true,
        item: researchResult.rows[0]
      });
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error updating research item:', error);
      res.status(500).json({ 
        error: 'Failed to update research item',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// DELETE /api/research/items/:id - Delete research item
// =============================================================================
router.delete('/items/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid research item ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user has access to the research item
      const accessCheck = await client.query(`
        SELECT ri.id, ri.title, ri.project_id
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ri.id = $1 AND (c.admin_id = $2 OR p.client_id = $2 OR $3 = true)
      `, [id, userId, req.user.role === 'admin']);

      if (accessCheck.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(403).json({ error: 'Access denied to this research item' });
      }

      const item = accessCheck.rows[0];

      // Delete research item (cascading will handle findings and documents)
      await client.query('DELETE FROM research_items WHERE id = $1', [id]);

      // Log activity
      await logActivity(client, userId, 'research_item', id, 'deleted', 
        `Deleted research item: ${item.title}`, { project_id: item.project_id });

      await commitTransaction(client);

      res.json({
        success: true,
        message: 'Research item deleted successfully'
      });
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error deleting research item:', error);
      res.status(500).json({ 
        error: 'Failed to delete research item',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// DELETE /api/research/documents/:id - Remove document from research item
// =============================================================================
router.delete('/documents/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid document ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user has access
      const accessCheck = await dbQuery(`
        SELECT rd.id
        FROM research_documents rd
        LEFT JOIN research_items ri ON rd.research_item_id = ri.id
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE rd.file_id = $1 AND (c.admin_id = $2 OR p.client_id = $2 OR $3 = true)
      `, [id, userId, req.user.role === 'admin']);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this document' });
      }

      // Remove document link (not the file itself)
      await dbQuery('DELETE FROM research_documents WHERE file_id = $1', [id]);

      res.json({
        success: true,
        message: 'Document removed from research item'
      });
    } catch (error) {
      console.error('Error removing document:', error);
      res.status(500).json({ 
        error: 'Failed to remove document',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// GET /api/research/items/:id/documents/download - Download all documents as ZIP
// =============================================================================
router.get('/items/:id/documents/download',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid research item ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get documents for this research item
      const documentsQuery = `
        SELECT f.id, f.original_name, f.file_path, f.mime_type
        FROM research_documents rd
        LEFT JOIN files f ON rd.file_id = f.id
        LEFT JOIN research_items ri ON rd.research_item_id = ri.id
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ri.id = $1 AND (c.admin_id = $2 OR p.client_id = $2 OR $3 = true)
      `;

      const documentsResult = await dbQuery(documentsQuery, [id, userId, req.user.role === 'admin']);

      if (documentsResult.rows.length === 0) {
        return res.status(404).json({ error: 'No documents found for this research item' });
      }

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=research-documents-${id}.zip`);

      archive.pipe(res);

      // Add files to archive
      for (const doc of documentsResult.rows) {
        if (await fs.pathExists(doc.file_path)) {
          archive.file(doc.file_path, { name: doc.original_name });
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error('Error downloading documents:', error);
      res.status(500).json({ 
        error: 'Failed to download documents',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// GET /api/research/export - Export research as PDF
// =============================================================================
router.get('/export',
  authenticateToken,
  [
    query('project_id').isUUID().withMessage('Invalid project ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { project_id } = req.query;
      const userId = req.user.id;

      // Verify project access
      const projectCheck = await dbQuery(`
        SELECT p.id, p.name, c.company_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1 AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
      `, [project_id, userId, req.user.role === 'admin']);

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      const project = projectCheck.rows[0];

      // Get research items
      const researchQuery = `
        SELECT 
          ri.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'text', rf.finding_text,
                'highlighted', rf.is_highlighted
              )
            ) FILTER (WHERE rf.id IS NOT NULL), 
            '[]'::json
          ) as findings
        FROM research_items ri
        LEFT JOIN research_findings rf ON ri.id = rf.research_item_id
        WHERE ri.project_id = $1
        GROUP BY ri.id
        ORDER BY ri.research_type, ri.created_at
      `;

      const researchResult = await dbQuery(researchQuery, [project_id]);
      const researchItems = researchResult.rows;

      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=research-export-${project_id}.pdf`);
      
      doc.pipe(res);

      // Title page
      doc.fontSize(24).text('Research Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).text(`Project: ${project.name}`, { align: 'center' });
      if (project.company_name) {
        doc.fontSize(14).text(`Client: ${project.company_name}`, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.addPage();

      // Research types summary
      const researchTypes = {
        'market_analysis': 'Market Analysis',
        'user_research': 'User Research',
        'competitive_analysis': 'Competitive Analysis',
        'brand_audit': 'Brand Audit'
      };

      const typeCounts = {};
      researchItems.forEach(item => {
        typeCounts[item.research_type] = (typeCounts[item.research_type] || 0) + 1;
      });

      doc.fontSize(18).text('Research Summary', { underline: true });
      doc.moveDown(0.5);
      
      Object.entries(typeCounts).forEach(([type, count]) => {
        doc.fontSize(12).text(`${researchTypes[type] || type}: ${count} item${count !== 1 ? 's' : ''}`, { indent: 20 });
      });
      
      doc.moveDown(1);

      // Research items
      researchItems.forEach((item, index) => {
        if (index > 0) doc.addPage();
        
        doc.fontSize(16).text(`${researchTypes[item.research_type] || item.research_type}: ${item.title}`, { underline: true });
        doc.moveDown(0.5);
        
        if (item.description) {
          doc.fontSize(12).text('Description:', { underline: true });
          doc.fontSize(11).text(item.description, { indent: 20 });
          doc.moveDown(0.5);
        }
        
        if (item.tags && item.tags.length > 0) {
          doc.fontSize(12).text('Tags:', { underline: true });
          doc.fontSize(11).text(item.tags.join(', '), { indent: 20 });
          doc.moveDown(0.5);
        }
        
        if (item.findings && item.findings.length > 0) {
          doc.fontSize(12).text('Key Findings:', { underline: true });
          item.findings.forEach((finding, findingIndex) => {
            doc.fontSize(11).text(`${findingIndex + 1}. ${finding.text}`, { indent: 20 });
          });
          doc.moveDown(0.5);
        }
        
        doc.fontSize(10).text(`Created: ${new Date(item.created_at).toLocaleDateString()}`, { indent: 20 });
        if (item.updated_at !== item.created_at) {
          doc.text(`Updated: ${new Date(item.updated_at).toLocaleDateString()}`, { indent: 20 });
        }
      });

      doc.end();
    } catch (error) {
      console.error('Error exporting research:', error);
      res.status(500).json({ 
        error: 'Failed to export research',
        details: error.message 
      });
    }
  }
);

// =============================================================================
// Bulk operations
// =============================================================================

// POST /api/research/bulk-export - Export selected research items
router.post('/bulk-export',
  authenticateToken,
  [
    body('item_ids').isArray({ min: 1 }).withMessage('At least one item ID required'),
    body('item_ids.*').isUUID().withMessage('Invalid item ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { item_ids } = req.body;
      const userId = req.user.id;

      // Get research items with access check
      const researchQuery = `
        SELECT 
          ri.*,
          p.name as project_name,
          c.company_name,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'text', rf.finding_text,
                'highlighted', rf.is_highlighted
              )
            ) FILTER (WHERE rf.id IS NOT NULL), 
            '[]'::json
          ) as findings
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN research_findings rf ON ri.id = rf.research_item_id
        WHERE ri.id = ANY($1) AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
        GROUP BY ri.id, p.name, c.company_name
        ORDER BY ri.research_type, ri.created_at
      `;

      const researchResult = await dbQuery(researchQuery, [item_ids, userId, req.user.role === 'admin']);
      const researchItems = researchResult.rows;

      if (researchItems.length === 0) {
        return res.status(404).json({ error: 'No accessible research items found' });
      }

      // Create PDF (similar to single export but for selected items)
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=research-selection-${new Date().toISOString().split('T')[0]}.pdf`);
      
      doc.pipe(res);

      // Title
      doc.fontSize(24).text('Selected Research Items', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.addPage();

      // Export items
      researchItems.forEach((item, index) => {
        if (index > 0) doc.addPage();
        
        const researchTypes = {
          'market_analysis': 'Market Analysis',
          'user_research': 'User Research', 
          'competitive_analysis': 'Competitive Analysis',
          'brand_audit': 'Brand Audit'
        };
        
        doc.fontSize(16).text(`${researchTypes[item.research_type] || item.research_type}: ${item.title}`, { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12).text(`Project: ${item.project_name || 'Unknown'}`);
        if (item.company_name) {
          doc.text(`Client: ${item.company_name}`);
        }
        doc.moveDown(0.5);
        
        if (item.description) {
          doc.fontSize(12).text('Description:', { underline: true });
          doc.fontSize(11).text(item.description, { indent: 20 });
          doc.moveDown(0.5);
        }
        
        if (item.tags && item.tags.length > 0) {
          doc.fontSize(12).text('Tags:', { underline: true });
          doc.fontSize(11).text(item.tags.join(', '), { indent: 20 });
          doc.moveDown(0.5);
        }
        
        if (item.findings && item.findings.length > 0) {
          doc.fontSize(12).text('Key Findings:', { underline: true });
          item.findings.forEach((finding, findingIndex) => {
            doc.fontSize(11).text(`${findingIndex + 1}. ${finding.text}`, { indent: 20 });
          });
          doc.moveDown(0.5);
        }
        
        doc.fontSize(10).text(`Created: ${new Date(item.created_at).toLocaleDateString()}`, { indent: 20 });
      });

      doc.end();
    } catch (error) {
      console.error('Error bulk exporting research:', error);
      res.status(500).json({ 
        error: 'Failed to export selected research',
        details: error.message 
      });
    }
  }
);

// POST /api/research/bulk-tag - Add tags to multiple research items
router.post('/bulk-tag',
  authenticateToken,
  [
    body('item_ids').isArray({ min: 1 }).withMessage('At least one item ID required'),
    body('item_ids.*').isUUID().withMessage('Invalid item ID format'),
    body('tags').isArray({ min: 1 }).withMessage('At least one tag required'),
    body('tags.*').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Each tag must be 1-50 characters')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { item_ids, tags } = req.body;
      const userId = req.user.id;

      // Verify access to all items
      const accessCheck = await client.query(`
        SELECT ri.id, ri.tags
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ri.id = ANY($1) AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
      `, [item_ids, userId, req.user.role === 'admin']);

      if (accessCheck.rows.length !== item_ids.length) {
        await rollbackTransaction(client);
        return res.status(403).json({ error: 'Access denied to some research items' });
      }

      // Update each item's tags
      for (const item of accessCheck.rows) {
        const existingTags = item.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])]; // Merge and deduplicate
        
        await client.query(`
          UPDATE research_items 
          SET tags = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [newTags, item.id]);
      }

      // Log activity
      await logActivity(client, userId, 'research_items', 'bulk', 'tagged', 
        `Added tags to ${item_ids.length} research items`, { tags, item_count: item_ids.length });

      await commitTransaction(client);

      res.json({
        success: true,
        message: `Tags added to ${item_ids.length} research items`,
        tags_added: tags
      });
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error bulk tagging research items:', error);
      res.status(500).json({ 
        error: 'Failed to add tags to research items',
        details: error.message 
      });
    }
  }
);

// DELETE /api/research/bulk-delete - Delete multiple research items
router.delete('/bulk-delete',
  authenticateToken,
  [
    body('item_ids').isArray({ min: 1 }).withMessage('At least one item ID required'),
    body('item_ids.*').isUUID().withMessage('Invalid item ID format')
  ],
  validateRequest,
  async (req, res) => {
    const client = await beginTransaction();
    
    try {
      const { item_ids } = req.body;
      const userId = req.user.id;

      // Verify access to all items
      const accessCheck = await client.query(`
        SELECT ri.id, ri.title
        FROM research_items ri
        LEFT JOIN projects p ON ri.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ri.id = ANY($1) AND (p.client_id = $2 OR c.admin_id = $2 OR $3 = true)
      `, [item_ids, userId, req.user.role === 'admin']);

      if (accessCheck.rows.length !== item_ids.length) {
        await rollbackTransaction(client);
        return res.status(403).json({ error: 'Access denied to some research items' });
      }

      const itemTitles = accessCheck.rows.map(row => row.title);

      // Delete items (cascading will handle related data)
      await client.query('DELETE FROM research_items WHERE id = ANY($1)', [item_ids]);

      // Log activity
      await logActivity(client, userId, 'research_items', 'bulk', 'deleted', 
        `Bulk deleted ${item_ids.length} research items`, { item_titles: itemTitles });

      await commitTransaction(client);

      res.json({
        success: true,
        message: `${item_ids.length} research items deleted successfully`
      });
    } catch (error) {
      await rollbackTransaction(client);
      console.error('Error bulk deleting research items:', error);
      res.status(500).json({ 
        error: 'Failed to delete research items',
        details: error.message 
      });
    }
  }
);

export default router;