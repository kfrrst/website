
import express from 'express';
import Stripe from 'stripe';
import { query } from '../../config/database.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2024-06-20' });

// Use raw body just on this route. Ensure app doesn't run express.json before this (or we fall back without verification).
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Dev fallback: parse JSON (no signature verification)
      event = req.body ? JSON.parse(req.body.toString()) : null;
    }
  } catch (err) {
    console.error('Stripe webhook error', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (!event) return res.json({ received: true });

    if (event.type === 'invoice.paid' || event.type === 'payment_intent.succeeded') {
      const invoice = event.data.object;
      const projectId = invoice.metadata?.projectId || invoice.metadata?.project_id;
      if (projectId) {
        // Mark PAY phase done; unlock SIGN
        await query("UPDATE project_phases SET status='done', completed_at=now() WHERE project_id=$1 AND phase_key='PAY'", [projectId]);
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
