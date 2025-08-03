import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { 
  generateInvoiceNumber, 
  calculateInvoiceTotals, 
  updateInvoiceStatus,
  logInvoiceActivity,
  validateInvoiceData,
  getInvoiceStats
} from '../utils/invoiceHelpers.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { 
  sendInvoiceEmail, 
  sendPaymentConfirmationEmail,
  sendOverdueReminderEmail 
} from '../utils/emailService.js';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/invoices - List invoices (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, client_id, project_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let baseQuery = `
      SELECT 
        i.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email,
        u.company_name,
        p.name as project_name,
        CASE 
          WHEN i.status = 'paid' THEN 'Paid'
          WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 'Overdue'
          ELSE initcap(i.status)
        END as display_status
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      LEFT JOIN projects p ON i.project_id = p.id
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    // Filter by user role
    if (req.user.role === 'client') {
      conditions.push(`i.client_id = $${paramIndex++}`);
      params.push(req.user.id);
    }
    
    // Filter by status
    if (status) {
      conditions.push(`i.status = $${paramIndex++}`);
      params.push(status);
    }
    
    // Filter by client (admin only)
    if (client_id && req.user.role === 'admin') {
      conditions.push(`i.client_id = $${paramIndex++}`);
      params.push(client_id);
    }
    
    // Filter by project
    if (project_id) {
      conditions.push(`i.project_id = $${paramIndex++}`);
      params.push(project_id);
    }
    
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    baseQuery += ` ORDER BY i.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const result = await query(baseQuery, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      JOIN users u ON i.client_id = u.id
    `;
    
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      invoices: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/stats - Revenue statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.role === 'client' ? req.user.id : null;
    const stats = await getInvoiceStats(clientId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - Get invoice details with line items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice with client and project info
    let invoiceQuery = `
      SELECT 
        i.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email,
        u.company_name,
        u.phone as client_phone,
        p.name as project_name
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = $1
    `;
    
    // If client, ensure they can only see their own invoices
    if (req.user.role === 'client') {
      invoiceQuery += ' AND i.client_id = $2';
    }
    
    const params = req.user.role === 'client' ? [id, req.user.id] : [id];
    const invoiceResult = await query(invoiceQuery, params);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get line items
    const lineItemsResult = await query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY order_index, created_at',
      [id]
    );
    
    // Update status if overdue
    await updateInvoiceStatus(id);
    
    res.json({
      invoice,
      line_items: lineItemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices - Create invoice with line items
router.post('/', authenticateToken, async (req, res) => {
  // Only admins can create invoices
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const client = await beginTransaction();
  
  try {
    const invoiceData = req.body;
    
    // Validate invoice data
    const validationErrors = validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Calculate totals
    const totals = calculateInvoiceTotals(
      invoiceData.line_items, 
      invoiceData.tax_rate || 0, 
      invoiceData.discount_amount || 0
    );
    
    // Create invoice
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        client_id, project_id, invoice_number, title, description, status,
        subtotal, tax_rate, tax_amount, discount_amount, total_amount, currency,
        issue_date, due_date, notes, terms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        invoiceData.client_id,
        invoiceData.project_id || null,
        invoiceNumber,
        invoiceData.title,
        invoiceData.description || null,
        'draft',
        totals.subtotal,
        invoiceData.tax_rate || 0,
        totals.tax_amount,
        invoiceData.discount_amount || 0,
        totals.total_amount,
        invoiceData.currency || 'USD',
        invoiceData.issue_date,
        invoiceData.due_date,
        invoiceData.notes || null,
        invoiceData.terms || null
      ]
    );
    
    const invoice = invoiceResult.rows[0];
    
    // Create line items
    const lineItems = [];
    for (let i = 0; i < invoiceData.line_items.length; i++) {
      const item = invoiceData.line_items[i];
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      
      const lineItemResult = await client.query(
        `INSERT INTO invoice_line_items (
          invoice_id, description, quantity, unit_price, line_total, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          invoice.id,
          item.description,
          item.quantity,
          item.unit_price,
          lineTotal,
          i
        ]
      );
      
      lineItems.push(lineItemResult.rows[0]);
    }
    
    // Log activity
    await logInvoiceActivity(
      req.user.id,
      invoice.id,
      'created',
      `Invoice ${invoice.invoice_number} created`,
      { total_amount: invoice.total_amount }
    );
    
    await commitTransaction(client);
    
    res.status(201).json({
      invoice,
      line_items: lineItems
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id - Update invoice (draft only)
router.put('/:id', authenticateToken, async (req, res) => {
  // Only admins can update invoices
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const client = await beginTransaction();
  
  try {
    const { id } = req.params;
    const invoiceData = req.body;
    
    // Check if invoice exists and is in draft status
    const checkResult = await query(
      'SELECT status FROM invoices WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (checkResult.rows[0].status !== 'draft') {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Only draft invoices can be updated' });
    }
    
    // Validate invoice data
    const validationErrors = validateInvoiceData(invoiceData);
    if (validationErrors.length > 0) {
      await rollbackTransaction(client);
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    // Calculate totals
    const totals = calculateInvoiceTotals(
      invoiceData.line_items, 
      invoiceData.tax_rate || 0, 
      invoiceData.discount_amount || 0
    );
    
    // Update invoice
    const invoiceResult = await client.query(
      `UPDATE invoices SET
        client_id = $1, project_id = $2, title = $3, description = $4,
        subtotal = $5, tax_rate = $6, tax_amount = $7, discount_amount = $8, 
        total_amount = $9, currency = $10, issue_date = $11, due_date = $12,
        notes = $13, terms = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        invoiceData.client_id,
        invoiceData.project_id || null,
        invoiceData.title,
        invoiceData.description || null,
        totals.subtotal,
        invoiceData.tax_rate || 0,
        totals.tax_amount,
        invoiceData.discount_amount || 0,
        totals.total_amount,
        invoiceData.currency || 'USD',
        invoiceData.issue_date,
        invoiceData.due_date,
        invoiceData.notes || null,
        invoiceData.terms || null,
        id
      ]
    );
    
    // Delete existing line items
    await client.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);
    
    // Create new line items
    const lineItems = [];
    for (let i = 0; i < invoiceData.line_items.length; i++) {
      const item = invoiceData.line_items[i];
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
      
      const lineItemResult = await client.query(
        `INSERT INTO invoice_line_items (
          invoice_id, description, quantity, unit_price, line_total, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          id,
          item.description,
          item.quantity,
          item.unit_price,
          lineTotal,
          i
        ]
      );
      
      lineItems.push(lineItemResult.rows[0]);
    }
    
    // Log activity
    await logInvoiceActivity(
      req.user.id,
      id,
      'updated',
      `Invoice ${invoiceResult.rows[0].invoice_number} updated`,
      { total_amount: invoiceResult.rows[0].total_amount }
    );
    
    await commitTransaction(client);
    
    res.json({
      invoice: invoiceResult.rows[0],
      line_items: lineItems
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/send - Send invoice to client
router.post('/:id/send', authenticateToken, async (req, res) => {
  // Only admins can send invoices
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    const { id } = req.params;
    
    // Get invoice with client info and line items
    const invoiceResult = await query(
      `SELECT 
        i.*,
        u.first_name, u.last_name, u.email, u.company_name
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      WHERE i.id = $1`,
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot send paid or cancelled invoices' });
    }
    
    // Get line items
    const lineItemsResult = await query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY order_index',
      [id]
    );
    
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, lineItemsResult.rows, invoice);
    
    // Send email
    await sendInvoiceEmail(invoice, invoice, pdfBuffer);
    
    // Update invoice status
    await query(
      'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['sent', id]
    );
    
    // Log activity
    await logInvoiceActivity(
      req.user.id,
      id,
      'sent',
      `Invoice ${invoice.invoice_number} sent to ${invoice.email}`,
      { client_email: invoice.email }
    );
    
    res.json({ message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

// GET /api/invoices/:id/pdf - Generate PDF invoice
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice with client info
    let invoiceQuery = `
      SELECT 
        i.*,
        u.first_name, u.last_name, u.email, u.company_name, u.phone
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      WHERE i.id = $1
    `;
    
    // If client, ensure they can only see their own invoices
    if (req.user.role === 'client') {
      invoiceQuery += ' AND i.client_id = $2';
    }
    
    const params = req.user.role === 'client' ? [id, req.user.id] : [id];
    const invoiceResult = await query(invoiceQuery, params);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get line items
    const lineItemsResult = await query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY order_index',
      [id]
    );
    
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, lineItemsResult.rows, invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoice_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/invoices/:id/pay - Process payment with Stripe
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method_id } = req.body;
    
    // Get invoice
    let invoiceQuery = `
      SELECT 
        i.*,
        u.first_name, u.last_name, u.email
      FROM invoices i
      JOIN users u ON i.client_id = u.id
      WHERE i.id = $1
    `;
    
    // If client, ensure they can only pay their own invoices
    if (req.user.role === 'client') {
      invoiceQuery += ' AND i.client_id = $2';
    }
    
    const params = req.user.role === 'client' ? [id, req.user.id] : [id];
    const invoiceResult = await query(invoiceQuery, params);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot pay cancelled invoice' });
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total_amount * 100), // Convert to cents
      currency: invoice.currency.toLowerCase(),
      payment_method: payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id
      }
    });
    
    if (paymentIntent.status === 'succeeded') {
      // Update invoice as paid
      await query(
        `UPDATE invoices SET 
          status = 'paid', 
          paid_date = CURRENT_DATE, 
          payment_method = 'stripe',
          payment_reference = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
        [paymentIntent.id, id]
      );
      
      // Log activity
      await logInvoiceActivity(
        req.user.id,
        id,
        'paid',
        `Invoice ${invoice.invoice_number} paid via Stripe`,
        { 
          payment_intent_id: paymentIntent.id,
          amount: invoice.total_amount
        }
      );
      
      // Send payment confirmation email
      try {
        await sendPaymentConfirmationEmail(
          { ...invoice, paid_date: new Date(), payment_reference: paymentIntent.id },
          invoice
        );
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError);
        // Don't fail the payment if email fails
      }
      
      res.json({ 
        message: 'Payment successful',
        payment_intent_id: paymentIntent.id
      });
    } else {
      res.status(400).json({ 
        error: 'Payment failed',
        payment_intent: paymentIntent
      });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// POST /api/invoices/:id/cancel - Cancel invoice
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  // Only admins can cancel invoices
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    const { id } = req.params;
    
    // Get invoice
    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid invoice' });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice is already cancelled' });
    }
    
    // Cancel invoice
    await query(
      'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', id]
    );
    
    // Log activity
    await logInvoiceActivity(
      req.user.id,
      id,
      'cancelled',
      `Invoice ${invoice.invoice_number} cancelled`,
      { reason: req.body.reason || 'No reason provided' }
    );
    
    res.json({ message: 'Invoice cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe webhook endpoint for payment confirmations
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata.invoice_id;
        
        if (invoiceId) {
          // Update invoice status
          await query(
            `UPDATE invoices SET 
              status = 'paid', 
              paid_date = CURRENT_DATE, 
              payment_method = 'stripe',
              payment_reference = $1,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
            [paymentIntent.id, invoiceId]
          );
          
          // Get invoice and client info for email
          const invoiceResult = await query(
            `SELECT 
              i.*,
              u.first_name, u.last_name, u.email
            FROM invoices i
            JOIN users u ON i.client_id = u.id
            WHERE i.id = $1`,
            [invoiceId]
          );
          
          if (invoiceResult.rows.length > 0) {
            const invoice = invoiceResult.rows[0];
            
            // Log activity
            await logInvoiceActivity(
              null, // No user ID for webhook
              invoiceId,
              'paid',
              `Invoice ${invoice.invoice_number} paid via Stripe webhook`,
              { 
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100
              }
            );
            
            // Send payment confirmation email
            try {
              await sendPaymentConfirmationEmail(
                { ...invoice, paid_date: new Date(), payment_reference: paymentIntent.id },
                invoice
              );
            } catch (emailError) {
              console.error('Error sending payment confirmation email:', emailError);
            }
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

export default router;