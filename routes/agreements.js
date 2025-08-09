import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Sign an agreement
router.post('/sign/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { signatureName, agreementType = 'service' } = req.body;
    const userId = req.user.id;
    
    // Verify project access
    const projectResult = await dbQuery(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2',
      [projectId, userId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const project = projectResult.rows[0];
    
    // Create agreement record
    const agreementId = uuidv4();
    await dbQuery(`
      INSERT INTO agreements (
        id, project_id, client_id, agreement_type, 
        signature_name, signed_at, ip_address
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6
      )
    `, [agreementId, projectId, userId, agreementType, signatureName, req.ip]);
    
    // Create a file record for the signed agreement
    const fileName = `${agreementType}_agreement_${new Date().toISOString().split('T')[0]}.pdf`;
    await dbQuery(`
      INSERT INTO files (
        id, original_name, stored_name, file_path, file_size, 
        mime_type, file_type, uploader_id, project_id, 
        description, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true
      )
    `, [
      uuidv4(),
      fileName,
      `agreement_${agreementId}.pdf`,
      `/agreements/${projectId}/${agreementId}.pdf`,
      0, // Size will be updated when PDF is generated
      'application/pdf',
      'document',
      userId,
      projectId,
      `Signed ${agreementType} agreement`
    ]);
    
    // Mark the service agreement requirement as completed
    const requirementKey = agreementType === 'service' ? 'service_agreement' : 'completion_agreement';
    const phaseKey = agreementType === 'service' ? 'ONB' : 'SIGN';
    
    const requirementResult = await dbQuery(`
      SELECT id FROM phase_requirements 
      WHERE requirement_key = $1 AND phase_key = $2
    `, [requirementKey, phaseKey]);
    
    if (requirementResult.rows.length > 0) {
      const requirementId = requirementResult.rows[0].id;
      
      await dbQuery(`
        INSERT INTO project_phase_requirements (
          project_id, requirement_id, completed, completed_at, completed_by, metadata
        ) VALUES (
          $1, $2, true, CURRENT_TIMESTAMP, $3, $4
        ) ON CONFLICT (project_id, requirement_id) 
        DO UPDATE SET 
          completed = true,
          completed_at = CURRENT_TIMESTAMP,
          completed_by = $3,
          metadata = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [
        projectId, 
        requirementId, 
        userId,
        JSON.stringify({ agreement_id: agreementId, type: agreementType })
      ]);
    }
    
    // Log activity
    await dbQuery(`
      INSERT INTO activity_log (
        user_id, action, entity_type, entity_id, 
        description, metadata
      ) VALUES (
        $1, 'agreement_signed', 'project', $2, $3, $4
      )
    `, [
      userId,
      projectId,
      `Signed ${agreementType} agreement`,
      JSON.stringify({ agreement_id: agreementId, signature: signatureName })
    ]);
    
    res.json({ 
      success: true, 
      message: 'Agreement signed successfully',
      agreementId 
    });
    
  } catch (error) {
    console.error('Error signing agreement:', error);
    res.status(500).json({ error: 'Failed to sign agreement' });
  }
});

export default router;