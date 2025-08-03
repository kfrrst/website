import { query } from '../config/database.js';

/**
 * Invoice Helper Functions
 * Utilities for invoice management and processing
 */

/**
 * Generate next invoice number in format INV-YYYY-0001
 */
export const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  
  // Get the highest invoice number for the current year
  const result = await query(
    `SELECT invoice_number 
     FROM invoices 
     WHERE invoice_number LIKE $1 
     ORDER BY invoice_number DESC 
     LIMIT 1`,
    [`INV-${currentYear}-%`]
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number;
    const numberPart = parseInt(lastNumber.split('-')[2]);
    nextNumber = numberPart + 1;
  }
  
  return `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * Calculate invoice totals based on line items
 */
export const calculateInvoiceTotals = (lineItems, taxRate = 0, discountAmount = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
  }, 0);
  
  const taxAmount = subtotal * parseFloat(taxRate);
  const totalAmount = subtotal + taxAmount - parseFloat(discountAmount);
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100
  };
};

/**
 * Check if invoice is overdue
 */
export const isInvoiceOverdue = (invoice) => {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return false;
  }
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
};

/**
 * Update invoice status based on conditions
 */
export const updateInvoiceStatus = async (invoiceId) => {
  const result = await query(
    'SELECT id, status, due_date FROM invoices WHERE id = $1',
    [invoiceId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invoice not found');
  }
  
  const invoice = result.rows[0];
  
  // Check if invoice should be marked as overdue
  if (invoice.status === 'sent' && isInvoiceOverdue(invoice)) {
    await query(
      'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['overdue', invoiceId]
    );
    return 'overdue';
  }
  
  return invoice.status;
};

/**
 * Log activity for invoice actions
 */
export const logInvoiceActivity = async (userId, invoiceId, action, description, metadata = {}) => {
  await query(
    `INSERT INTO activity_log (user_id, entity_type, entity_id, action, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, 'invoice', invoiceId, action, description, JSON.stringify(metadata)]
  );
};

/**
 * Validate invoice data
 */
export const validateInvoiceData = (invoiceData) => {
  const errors = [];
  
  if (!invoiceData.title || invoiceData.title.trim().length === 0) {
    errors.push('Invoice title is required');
  }
  
  if (!invoiceData.client_id) {
    errors.push('Client ID is required');
  }
  
  if (!invoiceData.issue_date) {
    errors.push('Issue date is required');
  }
  
  if (!invoiceData.due_date) {
    errors.push('Due date is required');
  } else {
    const issueDate = new Date(invoiceData.issue_date);
    const dueDate = new Date(invoiceData.due_date);
    if (dueDate <= issueDate) {
      errors.push('Due date must be after issue date');
    }
  }
  
  if (!invoiceData.line_items || invoiceData.line_items.length === 0) {
    errors.push('At least one line item is required');
  } else {
    invoiceData.line_items.forEach((item, index) => {
      if (!item.description || item.description.trim().length === 0) {
        errors.push(`Line item ${index + 1}: Description is required`);
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unit_price || parseFloat(item.unit_price) < 0) {
        errors.push(`Line item ${index + 1}: Unit price must be 0 or greater`);
      }
    });
  }
  
  return errors;
};

/**
 * Get invoice statistics for dashboard
 */
export const getInvoiceStats = async (clientId = null) => {
  let baseQuery = `
    SELECT 
      COUNT(*) as total_invoices,
      COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
      COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total_amount END), 0) as pending_revenue,
      COALESCE(AVG(CASE WHEN status = 'paid' THEN total_amount END), 0) as average_invoice_amount
    FROM invoices
  `;
  
  const params = [];
  if (clientId) {
    baseQuery += ' WHERE client_id = $1';
    params.push(clientId);
  }
  
  const result = await query(baseQuery, params);
  
  return {
    total_invoices: parseInt(result.rows[0].total_invoices),
    draft_count: parseInt(result.rows[0].draft_count),
    sent_count: parseInt(result.rows[0].sent_count),
    paid_count: parseInt(result.rows[0].paid_count),
    overdue_count: parseInt(result.rows[0].overdue_count),
    cancelled_count: parseInt(result.rows[0].cancelled_count),
    total_revenue: parseFloat(result.rows[0].total_revenue),
    pending_revenue: parseFloat(result.rows[0].pending_revenue),
    average_invoice_amount: parseFloat(result.rows[0].average_invoice_amount)
  };
};