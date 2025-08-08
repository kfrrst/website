import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';
import stripe, { PAYMENT_CONFIG, INVOICE_CONFIG, verifyStripeConfig } from '../config/stripe.js';
import { sendTemplateEmail } from '../utils/emailService.js';
import { EMAIL_TEMPLATES } from '../utils/emailTemplates.js';

const router = express.Router();

// Verify Stripe configuration on startup
verifyStripeConfig();

/**
 * Payment Routes
 * Handles Stripe payment processing, invoices, and payment methods
 */

// Get Stripe publishable key
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    currency: PAYMENT_CONFIG.currency,
    paymentMethods: PAYMENT_CONFIG.paymentMethods
  });
});

// Create payment intent for invoice
router.post('/create-payment-intent', 
  authenticateToken,
  [
    body('invoiceId').isUUID().withMessage('Valid invoice ID required'),
    body('paymentMethodId').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoiceId, paymentMethodId } = req.body;
    const userId = req.user.id;

    let client;
    try {
      client = await beginTransaction();

      // Get invoice details
      const invoiceResult = await client.query(`
        SELECT 
          i.*,
          p.name as project_name,
          u.email as client_email,
          u.first_name,
          u.last_name,
          u.stripe_customer_id
        FROM invoices i
        JOIN users u ON i.client_id = u.id
        LEFT JOIN projects p ON i.project_id = p.id
        WHERE i.id = $1 AND i.client_id = $2
      `, [invoiceId, userId]);

      if (invoiceResult.rows.length === 0) {
        await rollbackTransaction(client);
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = invoiceResult.rows[0];

      if (invoice.status === 'paid') {
        await rollbackTransaction(client);
        return res.status(400).json({ error: 'Invoice already paid' });
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId = invoice.stripe_customer_id;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: invoice.client_email,
          name: `${invoice.first_name} ${invoice.last_name}`,
          metadata: {
            user_id: userId
          }
        });
        stripeCustomerId = customer.id;

        // Save Stripe customer ID
        await client.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, userId]
        );
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.total_amount * 100), // Convert to cents
        currency: PAYMENT_CONFIG.currency,
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoice.invoice_number,
          project_name: invoice.project_name || 'N/A',
          user_id: userId
        },
        statement_descriptor: PAYMENT_CONFIG.statementDescriptor,
        receipt_email: invoice.client_email,
        confirm: false,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      });

      // Update invoice with Stripe payment intent ID
      await client.query(
        'UPDATE invoices SET stripe_payment_intent_id = $1 WHERE id = $2',
        [paymentIntent.id, invoiceId]
      );

      await commitTransaction(client);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: invoice.total_amount,
        currency: PAYMENT_CONFIG.currency
      });

    } catch (error) {
      if (client) await rollbackTransaction(client);
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Confirm payment
router.post('/confirm-payment',
  authenticateToken,
  [
    body('paymentIntentId').isString().withMessage('Payment intent ID required'),
    body('invoiceId').isUUID().withMessage('Valid invoice ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId, invoiceId } = req.body;
    const userId = req.user.id;

    try {
      // Verify the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          error: 'Payment not successful',
          status: paymentIntent.status 
        });
      }

      // Update invoice status
      const updateResult = await dbQuery(`
        UPDATE invoices 
        SET 
          status = 'paid',
          paid_date = CURRENT_DATE,
          payment_method = $1,
          payment_reference = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND client_id = $4 AND stripe_payment_intent_id = $5
        RETURNING *
      `, [
        paymentIntent.payment_method_types[0] || 'card',
        paymentIntent.id,
        invoiceId,
        userId,
        paymentIntentId
      ]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invoice not found or already updated' });
      }

      const invoice = updateResult.rows[0];

      // Log the payment
      await dbQuery(`
        INSERT INTO activity_log (
          entity_type, entity_id, action, description, 
          user_id, metadata
        ) VALUES (
          'invoice', $1, 'payment_received', $2,
          $3, $4
        )
      `, [
        invoiceId,
        `Payment received for invoice ${invoice.invoice_number}`,
        userId,
        JSON.stringify({
          amount: invoice.total_amount,
          payment_method: paymentIntent.payment_method_types[0],
          stripe_payment_intent: paymentIntentId
        })
      ]);

      // Get client details for email
      const clientResult = await dbQuery(`
        SELECT email, first_name, last_name 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        
        // Send payment confirmation email
        await sendTemplateEmail(
          EMAIL_TEMPLATES.PAYMENT_RECEIVED,
          client.email,
          {
            clientName: `${client.first_name} ${client.last_name}`,
            invoiceNumber: invoice.invoice_number,
            amountPaid: invoice.total_amount.toFixed(2),
            paymentDate: new Date().toLocaleDateString(),
            paymentMethod: paymentIntent.payment_method_types[0],
            portalUrl: `${process.env.BASE_URL}/portal`
          }
        );
      }

      res.json({
        success: true,
        invoice: invoice,
        message: 'Payment successful'
      });

    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

// Get payment methods
router.get('/payment-methods', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's Stripe customer ID
    const userResult = await dbQuery(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.json({ paymentMethods: [] });
    }

    const stripeCustomerId = userResult.rows[0].stripe_customer_id;

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card'
    });

    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        is_default: pm.metadata.is_default === 'true'
      }))
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Add payment method
router.post('/payment-methods',
  authenticateToken,
  [
    body('paymentMethodId').isString().withMessage('Payment method ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentMethodId } = req.body;
    const userId = req.user.id;

    try {
      // Get or create Stripe customer
      const userResult = await dbQuery(`
        SELECT stripe_customer_id, email, first_name, last_name 
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      let stripeCustomerId = user.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: { user_id: userId }
        });
        stripeCustomerId = customer.id;

        await dbQuery(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [stripeCustomerId, userId]
        );
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId
      });

      // Set as default if it's the first payment method
      const existingMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card'
      });

      if (existingMethods.data.length === 1) {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      res.json({
        success: true,
        message: 'Payment method added successfully'
      });

    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
});

// Remove payment method
router.delete('/payment-methods/:paymentMethodId',
  authenticateToken,
  async (req, res) => {
    const { paymentMethodId } = req.params;

    try {
      await stripe.paymentMethods.detach(paymentMethodId);

      res.json({
        success: true,
        message: 'Payment method removed successfully'
      });

    } catch (error) {
      console.error('Error removing payment method:', error);
      res.status(500).json({ error: 'Failed to remove payment method' });
    }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Payment confirmation is handled in the confirm-payment endpoint
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        
        // Log the failure
        if (failedPayment.metadata.invoice_id) {
          await dbQuery(`
            INSERT INTO activity_log (
              entity_type, entity_id, action, description, metadata
            ) VALUES (
              'invoice', $1, 'payment_failed', $2, $3
            )
          `, [
            failedPayment.metadata.invoice_id,
            `Payment failed for invoice ${failedPayment.metadata.invoice_number}`,
            JSON.stringify({
              error: failedPayment.last_payment_error,
              stripe_payment_intent: failedPayment.id
            })
          ]);
        }
        break;

      case 'invoice.payment_succeeded':
        // Handle subscription invoice payments if needed
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;