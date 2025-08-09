import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Track payment for a project invoice
router.post('/track/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentMethod, transactionId } = req.body;
    const userId = req.user.id;
    
    // Get invoice and project details
    const invoiceResult = await dbQuery(`
      SELECT i.*, p.id as project_id, p.current_phase_key
      FROM invoices i
      JOIN projects p ON i.project_id = p.id
      WHERE i.id = $1 AND p.client_id = $2
    `, [invoiceId, userId]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invoice not found or access denied' });
    }
    
    const invoice = invoiceResult.rows[0];
    const projectId = invoice.project_id;
    
    // Update invoice status
    await dbQuery(`
      UPDATE invoices 
      SET status = 'paid', 
          paid_date = CURRENT_TIMESTAMP,
          payment_method = $1,
          transaction_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [paymentMethod, transactionId, invoiceId]);
    
    // Determine which payment requirement to mark complete
    let requirementKey = 'final_payment';
    let phaseKey = 'PAY';
    
    // Check if this is a deposit payment (ONB phase)
    if (invoice.invoice_type === 'deposit' || invoice.current_phase_key === 'ONB') {
      requirementKey = 'deposit_payment';
      phaseKey = 'ONB';
    }
    
    // Mark payment requirement as completed
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
        JSON.stringify({ 
          invoice_id: invoiceId, 
          amount: invoice.total_amount,
          payment_method: paymentMethod,
          transaction_id: transactionId
        })
      ]);
      
      // Check if all mandatory requirements are complete for phase advancement
      const mandatoryCheck = await dbQuery(`
        SELECT 
          COUNT(*) FILTER (WHERE pr.is_mandatory = true) as total_mandatory,
          COUNT(*) FILTER (WHERE pr.is_mandatory = true AND ppr.completed = true) as completed_mandatory
        FROM phase_requirements pr
        LEFT JOIN project_phase_requirements ppr 
          ON pr.id = ppr.requirement_id AND ppr.project_id = $1
        WHERE pr.phase_key = $2
      `, [projectId, phaseKey]);
      
      const { total_mandatory, completed_mandatory } = mandatoryCheck.rows[0];
      
      if (total_mandatory === completed_mandatory) {
        // Log that phase can advance
        await dbQuery(`
          INSERT INTO activity_log (
            user_id, action, entity_type, entity_id, 
            description, metadata
          ) VALUES (
            $1, 'phase_ready', 'project', $2, $3, $4
          )
        `, [
          userId,
          projectId,
          `All requirements complete for ${phaseKey} phase after payment`,
          JSON.stringify({ 
            phase: phaseKey,
            payment_completed: true,
            invoice_id: invoiceId
          })
        ]);
      }
    }
    
    // Log payment activity
    await dbQuery(`
      INSERT INTO activity_log (
        user_id, action, entity_type, entity_id, 
        description, metadata
      ) VALUES (
        $1, 'payment_received', 'invoice', $2, $3, $4
      )
    `, [
      userId,
      invoiceId,
      `Payment received for invoice #${invoice.invoice_number}`,
      JSON.stringify({ 
        amount: invoice.total_amount,
        payment_method: paymentMethod,
        transaction_id: transactionId
      })
    ]);
    
    res.json({ 
      success: true, 
      message: 'Payment tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking payment:', error);
    res.status(500).json({ error: 'Failed to track payment' });
  }
});

export default router;