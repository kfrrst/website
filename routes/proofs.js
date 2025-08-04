/**
 * Proof Checklist API Routes
 * Handles all proof checklist operations including validation, approvals, and reporting
 */

import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import sharp from 'sharp';
import ExifReader from 'exifreader';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import { fileValidationService } from '../utils/fileValidationService.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow common design and image file types
    const allowedTypes = /\.(ai|pdf|psd|svg|png|jpg|jpeg|tiff|tif|eps|indd)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * GET /api/projects/:projectId/proofs
 * Get all proofs for a project
 */
router.get('/projects/:projectId/proofs', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this project
    const projectAccess = await pool.query(`
      SELECT p.id FROM projects p 
      WHERE p.id = $1 AND (p.client_id = $2 OR $3 = 'admin')
    `, [projectId, userId, req.user.role]);

    if (projectAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Get current proof or most recent proof
    const proofQuery = await pool.query(`
      SELECT 
        pp.*,
        ph.name as phase_name,
        ph.phase_key,
        u.first_name || ' ' || u.last_name as created_by_name,
        COUNT(pa.id) as approval_count,
        COUNT(CASE WHEN pa.status = 'approved' THEN 1 END) as approved_count
      FROM project_proofs pp
      JOIN project_phases ph ON pp.phase_id = ph.id
      JOIN users u ON pp.created_by = u.id
      LEFT JOIN proof_approvals pa ON pp.id = pa.proof_id
      WHERE pp.project_id = $1
      GROUP BY pp.id, ph.id, u.id
      ORDER BY pp.created_at DESC
      LIMIT 1
    `, [projectId]);

    if (proofQuery.rows.length === 0) {
      return res.json({ current_proof: null, approvals: [] });
    }

    const currentProof = proofQuery.rows[0];

    // Get approvals for this proof
    const approvalsQuery = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.notes,
        pa.signature_data,
        pa.approver_name,
        pa.approver_email,
        pa.approval_timestamp as created_at
      FROM proof_approvals pa
      WHERE pa.proof_id = $1
      ORDER BY pa.created_at DESC
    `, [currentProof.id]);

    res.json({
      current_proof: currentProof,
      approvals: approvalsQuery.rows
    });

  } catch (error) {
    console.error('Error fetching proofs:', error);
    res.status(500).json({ error: 'Failed to fetch proofs' });
  }
});

/**
 * POST /api/projects/:projectId/proofs
 * Create a new proof session
 */
router.post('/projects/:projectId/proofs', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { projectId } = req.params;
    const { phase_id, services } = req.body;
    const userId = req.user.id;

    // Verify user has access
    const projectAccess = await client.query(`
      SELECT p.id FROM projects p 
      WHERE p.id = $1 AND (p.client_id = $2 OR $3 = 'admin')
    `, [projectId, userId, req.user.role]);

    if (projectAccess.rows.length === 0) {
      throw new Error('Access denied to this project');
    }

    // Create proof session using the database function
    const proofResult = await client.query(`
      SELECT create_proof_session($1, $2, $3, $4) as proof_id
    `, [projectId, phase_id, JSON.stringify(services), userId]);

    const proofId = proofResult.rows[0].proof_id;

    // Get the created proof with full details
    const proofQuery = await client.query(`
      SELECT 
        pp.*,
        ph.name as phase_name,
        ph.phase_key,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM project_proofs pp
      JOIN project_phases ph ON pp.phase_id = ph.id
      JOIN users u ON pp.created_by = u.id
      WHERE pp.id = $1
    `, [proofId]);

    await client.query('COMMIT');
    res.status(201).json(proofQuery.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating proof:', error);
    res.status(500).json({ error: error.message || 'Failed to create proof session' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/projects/:projectId/proofs/:proofId
 * Update proof checklist state and validation results  
 */
router.put('/projects/:projectId/proofs/:proofId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { projectId, proofId } = req.params;
    const { checklist_state, validation_results } = req.body;
    const userId = req.user.id;

    // Verify access
    const accessQuery = await client.query(`
      SELECT pp.id FROM project_proofs pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1 AND pp.project_id = $2 
      AND (p.client_id = $3 OR $4 = 'admin')
    `, [proofId, projectId, userId, req.user.role]);

    if (accessQuery.rows.length === 0) {
      throw new Error('Access denied or proof not found');
    }

    // Update the proof
    const updateData = {};
    const updateParts = [];
    const values = [proofId];
    let paramIndex = 2;

    if (checklist_state) {
      updateParts.push(`checklist_state = $${paramIndex}`);
      values.push(JSON.stringify(checklist_state));
      paramIndex++;
    }

    if (validation_results) {
      updateParts.push(`validation_results = $${paramIndex}`);
      values.push(JSON.stringify(validation_results));
      paramIndex++;
    }

    updateParts.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE project_proofs 
      SET ${updateParts.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    // Log the update
    await client.query(`
      INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      proofId, 
      'updated', 
      'Proof checklist state updated', 
      userId, 
      req.user.role
    ]);

    await client.query('COMMIT');
    res.json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating proof:', error);
    res.status(500).json({ error: error.message || 'Failed to update proof' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/projects/:projectId/proofs/:proofId/override
 * Request override for critical checklist item
 */
router.post('/projects/:projectId/proofs/:proofId/override', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { projectId, proofId } = req.params;
    const { item_id, reason } = req.body;
    const userId = req.user.id;

    // Verify access
    const accessQuery = await client.query(`
      SELECT pp.id FROM project_proofs pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1 AND pp.project_id = $2 
      AND (p.client_id = $3 OR $4 = 'admin')
    `, [proofId, projectId, userId, req.user.role]);

    if (accessQuery.rows.length === 0) {
      throw new Error('Access denied or proof not found');
    }

    // Create override request
    const overrideResult = await client.query(`
      INSERT INTO proof_override_requests (
        proof_id, item_id, reason, requested_by
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [proofId, item_id, reason, userId]);

    // For admin users, auto-approve the override
    if (req.user.role === 'admin') {
      await client.query(`
        UPDATE proof_override_requests
        SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [userId, overrideResult.rows[0].id]);

      // Update the checklist item to checked with override flag
      await client.query(`
        SELECT update_checklist_item($1, $2, $3, $4, $5)
      `, [proofId, item_id, true, `Override approved: ${reason}`, userId]);
    }

    // Log the override request
    await client.query(`
      INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role, item_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      proofId, 
      'override_requested', 
      `Override requested for ${item_id}: ${reason}`, 
      userId, 
      req.user.role,
      item_id
    ]);

    await client.query('COMMIT');
    res.json({ success: true, override_id: overrideResult.rows[0].id });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error requesting override:', error);
    res.status(500).json({ error: error.message || 'Failed to request override' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/projects/:projectId/proofs/:proofId/approvals
 * Submit digital approval for proof
 */
router.post('/projects/:projectId/proofs/:proofId/approvals', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { projectId, proofId } = req.params;
    const { signature_data, status, notes } = req.body;
    const userId = req.user.id;

    // Verify access and get proof details
    const proofQuery = await client.query(`
      SELECT pp.id, pp.status as proof_status, p.client_id
      FROM project_proofs pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1 AND pp.project_id = $2 
      AND (p.client_id = $3 OR $4 = 'admin')
    `, [proofId, projectId, userId, req.user.role]);

    if (proofQuery.rows.length === 0) {
      throw new Error('Access denied or proof not found');
    }

    if (proofQuery.rows[0].proof_status !== 'ready') {
      throw new Error('Proof is not ready for approval');
    }

    // Get user details
    const userQuery = await client.query(`
      SELECT first_name, last_name, email FROM users WHERE id = $1
    `, [userId]);

    const user = userQuery.rows[0];
    const approverName = `${user.first_name} ${user.last_name}`;

    // Create the approval
    const approvalResult = await client.query(`
      INSERT INTO proof_approvals (
        proof_id, approver_id, approver_name, approver_email,
        status, notes, signature_data, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      proofId, userId, approverName, user.email,
      status || 'approved', notes || '', signature_data,
      req.ip, req.get('User-Agent')
    ]);

    // Update proof status based on approval
    const newProofStatus = status === 'rejected' ? 'rejected' : 'approved';
    await client.query(`
      UPDATE project_proofs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newProofStatus, proofId]);

    // Log the approval
    await client.query(`
      INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      proofId, 
      status === 'rejected' ? 'rejected' : 'approved',
      `Proof ${status === 'rejected' ? 'rejected' : 'approved'} by ${approverName}`, 
      userId, 
      req.user.role
    ]);

    // Create notification for project team
    if (status !== 'rejected') {
      await client.query(`
        INSERT INTO notifications (
          user_id, type, title, content, action_url
        )
        SELECT 
          u.id,
          'proof_approved',
          'Proof Approved',
          'The proof for project "' || p.name || '" has been approved.',
          '/admin/projects/' || p.id::text
        FROM projects p
        CROSS JOIN users u
        WHERE p.id = $1 AND u.role = 'admin'
      `, [projectId]);
    }

    await client.query('COMMIT');
    res.status(201).json(approvalResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting approval:', error);
    res.status(500).json({ error: error.message || 'Failed to submit approval' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/projects/:projectId/proofs/:proofId/validate-files
 * Validate uploaded files against service requirements
 */
router.post('/projects/:projectId/proofs/:proofId/validate-files', authenticateToken, async (req, res) => {
  try {
    const { projectId, proofId } = req.params;
    const userId = req.user.id;

    // Verify access
    const accessQuery = await pool.query(`
      SELECT pp.id, pp.services FROM project_proofs pp
      JOIN projects p ON pp.project_id = p.id
      WHERE pp.id = $1 AND pp.project_id = $2 
      AND (p.client_id = $3 OR $4 = 'admin')
    `, [proofId, projectId, userId, req.user.role]);

    if (accessQuery.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or proof not found' });
    }

    const services = accessQuery.rows[0].services;

    // Get project files
    const filesQuery = await pool.query(`
      SELECT id, original_name, file_path, file_size, mime_type
      FROM files
      WHERE project_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [projectId]);

    const validationResults = {};

    // Validate each file against each service
    for (const file of filesQuery.rows) {
      validationResults[file.id] = {};

      for (const serviceCode of services) {
        try {
          const validation = await validateFileForService(file, serviceCode);
          validationResults[file.id][serviceCode] = validation;
        } catch (error) {
          console.error(`Error validating file ${file.id} for service ${serviceCode}:`, error);
          validationResults[file.id][serviceCode] = {
            passed: false,
            issues: [`Validation error: ${error.message}`],
            warnings: []
          };
        }
      }
    }

    // Update proof with validation results
    await pool.query(`
      UPDATE project_proofs 
      SET validation_results = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(validationResults), proofId]);

    res.json({ validation_results: validationResults });

  } catch (error) {
    console.error('Error validating files:', error);
    res.status(500).json({ error: 'Failed to validate files' });
  }
});

/**
 * GET /api/projects/:projectId/proofs/:proofId/report
 * Generate and download proof checklist report
 */
router.get('/projects/:projectId/proofs/:proofId/report', authenticateToken, async (req, res) => {
  try {
    const { projectId, proofId } = req.params;
    const userId = req.user.id;

    // Verify access
    const proofQuery = await pool.query(`
      SELECT 
        pp.*,
        p.name as project_name,
        ph.name as phase_name,
        u.first_name || ' ' || u.last_name as client_name
      FROM project_proofs pp
      JOIN projects p ON pp.project_id = p.id
      JOIN project_phases ph ON pp.phase_id = ph.id
      JOIN users u ON p.client_id = u.id
      WHERE pp.id = $1 AND pp.project_id = $2 
      AND (p.client_id = $3 OR $4 = 'admin')
    `, [proofId, projectId, userId, req.user.role]);

    if (proofQuery.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or proof not found' });
    }

    const proof = proofQuery.rows[0];
    
    // Generate PDF report
    const pdfBuffer = await generateProofReport(proof);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proof-checklist-${proof.project_name}-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * POST /api/projects/:projectId/proofs/:proofId/generate-pdf
 * Generate PDF proof for client review
 */
router.post('/projects/:projectId/proofs/:proofId/generate-pdf', authenticateToken, async (req, res) => {
  try {
    const { projectId, proofId } = req.params;
    
    // This would typically be handled by a background job
    // For now, we'll just acknowledge the request
    res.json({ 
      success: true, 
      message: 'PDF generation started. You will receive a notification when complete.' 
    });

    // TODO: Implement actual PDF proof generation with project files
    // This would involve:
    // 1. Collecting all project files
    // 2. Generating a PDF with file previews
    // 3. Adding proof annotations and checkboxes
    // 4. Storing the generated PDF
    // 5. Sending notification when complete

  } catch (error) {
    console.error('Error starting PDF generation:', error);
    res.status(500).json({ error: 'Failed to start PDF generation' });
  }
});

// Helper functions

/**
 * Validate a file against service-specific requirements
 */
async function validateFileForService(file, serviceCode) {
  const validation = {
    passed: true,
    issues: [],
    warnings: []
  };

  try {
    // Get validation standards for this service
    const standardsQuery = await pool.query(`
      SELECT * FROM service_validation_standards 
      WHERE service_code = $1 AND is_active = true
    `, [serviceCode]);

    if (standardsQuery.rows.length === 0) {
      validation.warnings.push(`No validation standards found for service ${serviceCode}`);
      return validation;
    }

    const standards = standardsQuery.rows[0];

    // Check file format
    const extension = path.extname(file.original_name).substring(1).toUpperCase();
    const allowedFormats = standards.allowed_formats;
    
    if (!allowedFormats.includes(extension)) {
      validation.issues.push(`File format ${extension} not allowed. Use: ${allowedFormats.join(', ')}`);
      validation.passed = false;
    }

    // Check file size
    const fileSizeMB = file.file_size / (1024 * 1024);
    if (fileSizeMB > standards.max_file_size_mb) {
      validation.issues.push(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum (${standards.max_file_size_mb}MB)`);
      validation.passed = false;
    }

    // For image files, check technical specifications
    if (['JPG', 'JPEG', 'PNG', 'TIFF', 'TIF'].includes(extension)) {
      const techSpecs = await getFileTechnicalSpecs(file);
      
      if (techSpecs) {
        // Update file_technical_specs table
        await pool.query(`
          INSERT INTO file_technical_specs (
            file_id, width_pixels, height_pixels, dpi_horizontal, dpi_vertical,
            color_mode, bit_depth, is_print_ready, validation_errors, validation_warnings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (file_id) DO UPDATE SET
            width_pixels = EXCLUDED.width_pixels,
            height_pixels = EXCLUDED.height_pixels,
            dpi_horizontal = EXCLUDED.dpi_horizontal,
            dpi_vertical = EXCLUDED.dpi_vertical,
            color_mode = EXCLUDED.color_mode,
            bit_depth = EXCLUDED.bit_depth,
            is_print_ready = EXCLUDED.is_print_ready,
            validation_errors = EXCLUDED.validation_errors,
            validation_warnings = EXCLUDED.validation_warnings,
            processed_at = CURRENT_TIMESTAMP
        `, [
          file.id, techSpecs.width, techSpecs.height, 
          techSpecs.dpi, techSpecs.dpi, techSpecs.colorMode,
          techSpecs.bitDepth, validation.passed,
          JSON.stringify(validation.issues),
          JSON.stringify(validation.warnings)
        ]);

        // Check DPI requirements
        if (techSpecs.dpi < standards.min_dpi) {
          validation.issues.push(`Resolution ${techSpecs.dpi} DPI below minimum ${standards.min_dpi} DPI`);
          validation.passed = false;
        }

        // Check color mode
        const requiredColorModes = standards.required_color_modes;
        if (!requiredColorModes.includes(techSpecs.colorMode)) {
          validation.warnings.push(`Color mode ${techSpecs.colorMode} should be ${requiredColorModes.join(' or ')}`);
        }

        // Check bleed requirements
        if (standards.requires_bleed && !techSpecs.hasBleed) {
          validation.issues.push(`Bleeds required (${standards.min_bleed_inches}") but not detected`);
          validation.passed = false;
        }
      }
    }

  } catch (error) {
    console.error('File validation error:', error);
    validation.warnings.push('Could not fully validate file technical specifications');
  }

  return validation;
}

/**
 * Extract technical specifications from image files
 */
async function getFileTechnicalSpecs(file) {
  try {
    const filePath = file.file_path;
    
    // Use Sharp for image analysis
    const metadata = await sharp(filePath).metadata();
    
    // Calculate DPI (Sharp provides density in pixels per inch)
    const dpi = metadata.density || 72;
    
    // Determine color mode
    let colorMode = 'Unknown';
    if (metadata.channels === 1) colorMode = 'Grayscale';
    else if (metadata.channels === 3) colorMode = 'RGB';
    else if (metadata.channels === 4) colorMode = 'CMYK';

    // For more detailed specs, you might use ExifReader
    let exifData = {};
    try {
      const buffer = await fs.readFile(filePath);
      exifData = ExifReader.load(buffer);
    } catch (exifError) {
      console.log('Could not read EXIF data:', exifError.message);
    }

    return {
      width: metadata.width,
      height: metadata.height,
      dpi: Math.round(dpi),
      colorMode: colorMode,
      bitDepth: metadata.depth || 8,
      hasBleed: false, // Would need more sophisticated analysis
      format: metadata.format.toUpperCase()
    };

  } catch (error) {
    console.error('Error extracting file specs:', error);
    return null;
  }
}

/**
 * Generate PDF report for proof checklist
 */
async function generateProofReport(proof) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('[RE]Print Studios', 50, 50);
      doc.fontSize(16).text('Proof Checklist Report', 50, 80);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 110);
      
      // Project details
      doc.fontSize(14).text('Project Details', 50, 150);
      doc.fontSize(12)
         .text(`Project: ${proof.project_name}`, 70, 175)
         .text(`Client: ${proof.client_name}`, 70, 195)
         .text(`Phase: ${proof.phase_name}`, 70, 215)
         .text(`Proof Status: ${proof.status}`, 70, 235);

      // Services
      doc.fontSize(14).text('Services', 50, 270);
      const services = proof.services || [];
      services.forEach((service, index) => {
        doc.fontSize(12).text(`• ${service}`, 70, 295 + (index * 20));
      });

      // Checklist items
      let yPosition = 350;
      doc.fontSize(14).text('Checklist Status', 50, yPosition);
      yPosition += 30;

      const checklistState = proof.checklist_state || {};
      const itemCount = Object.keys(checklistState).length;
      const completedCount = Object.values(checklistState).filter(item => item.checked).length;

      doc.fontSize(12)
         .text(`Total Items: ${itemCount}`, 70, yPosition)
         .text(`Completed: ${completedCount}`, 200, yPosition)
         .text(`Progress: ${itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0}%`, 330, yPosition);

      // Footer
      doc.fontSize(10)
         .text('This report was generated automatically by the [RE]Print Studios Client Portal', 50, 750)
         .text(`Report ID: ${proof.id}`, 50, 765);

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

export default router;