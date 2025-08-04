import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

// Verify Stripe configuration
export const verifyStripeConfig = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
    return false;
  }
  
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    console.error('❌ STRIPE_PUBLISHABLE_KEY is not set in environment variables');
    return false;
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not set - webhooks will not work');
  }
  
  console.log('✅ Stripe configuration verified');
  return true;
};

// Payment configuration
export const PAYMENT_CONFIG = {
  currency: 'usd',
  statementDescriptor: 'REPRINT STUDIOS',
  metadata: {
    company: 'RE Print Studios'
  },
  paymentMethods: {
    card: true,
    achDebit: true,
    applyPay: true,
    googlePay: true
  }
};

// Invoice settings
export const INVOICE_CONFIG = {
  daysUntilDue: 30,
  collectionMethod: 'send_invoice',
  footerText: 'Thank you for your business with [RE]Print Studios!',
  customFields: [
    {
      name: 'Project',
      value: 'project_name'
    }
  ]
};

export default stripe;