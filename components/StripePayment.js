/**
 * Stripe Payment Component
 * Handles payment processing for invoices using Stripe Elements
 */

class StripePayment {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.paymentElement = null;
    this.isInitialized = false;
  }

  // Initialize Stripe
  async initialize() {
    try {
      // Get Stripe configuration
      const response = await fetch('/api/payments/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment configuration');
      }

      const config = await response.json();
      
      // Initialize Stripe with publishable key
      this.stripe = Stripe(config.publishableKey);
      this.isInitialized = true;
      
      return config;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  // Create payment form for invoice
  async createPaymentForm(invoiceId, containerId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ invoiceId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }

      const { clientSecret, amount, currency } = await response.json();

      // Create Elements instance
      this.elements = this.stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0057FF',
            colorBackground: '#F9F6F1',
            colorSurface: '#FCFAF7',
            colorText: '#333333',
            colorDanger: '#E63946',
            fontFamily: 'Montserrat, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px'
          },
          rules: {
            '.Tab': {
              border: '1px solid #E0E0E0',
              boxShadow: 'none'
            },
            '.Tab:hover': {
              border: '1px solid #0057FF'
            },
            '.Tab--selected': {
              border: '1px solid #0057FF',
              backgroundColor: '#F9F6F1'
            },
            '.Input': {
              border: '1px solid #E0E0E0',
              boxShadow: 'none'
            },
            '.Input:focus': {
              border: '1px solid #0057FF',
              boxShadow: '0 0 0 3px rgba(0, 87, 255, 0.1)'
            }
          }
        }
      });

      // Create Payment Element
      this.paymentElement = this.elements.create('payment', {
        layout: 'tabs',
        paymentMethodOrder: ['card', 'ach_debit']
      });

      // Mount to container
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container element #${containerId} not found`);
      }

      this.paymentElement.mount(`#${containerId}`);

      return {
        clientSecret,
        amount,
        currency,
        invoiceId
      };

    } catch (error) {
      console.error('Failed to create payment form:', error);
      throw error;
    }
  }

  // Process payment
  async processPayment(invoiceId) {
    if (!this.stripe || !this.elements) {
      throw new Error('Payment form not initialized');
    }

    try {
      // Show loading state
      this.showLoading(true);

      // Confirm payment
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/portal#invoices`,
          receipt_email: true
        },
        redirect: 'if_required'
      });

      if (error) {
        // Show error to customer
        if (error.type === 'card_error' || error.type === 'validation_error') {
          throw new Error(error.message);
        } else {
          throw new Error('An unexpected error occurred.');
        }
      }

      // Payment succeeded - confirm on backend
      const confirmResponse = await fetch('/api/payments/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          invoiceId: invoiceId
        })
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm payment');
      }

      const result = await confirmResponse.json();
      this.showLoading(false);
      
      return result;

    } catch (error) {
      this.showLoading(false);
      console.error('Payment failed:', error);
      throw error;
    }
  }

  // Create payment modal
  createPaymentModal(invoice) {
    const modalHtml = `
      <div class="modal-overlay" id="payment-modal">
        <div class="modal-content payment-modal">
          <div class="modal-header">
            <h2>Pay Invoice #${invoice.invoice_number}</h2>
            <button class="modal-close" onclick="stripePayment.closeModal()">×</button>
          </div>
          
          <div class="payment-summary">
            <div class="payment-summary-row">
              <span>Invoice Total</span>
              <span class="payment-amount">$${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div class="payment-summary-row">
              <span>Due Date</span>
              <span>${new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="payment-form-container">
            <div id="payment-element"></div>
            <div id="payment-message" class="hidden"></div>
          </div>

          <div class="payment-actions">
            <button 
              id="submit-payment" 
              class="btn-primary"
              onclick="stripePayment.handlePaymentSubmit('${invoice.id}')"
            >
              <span id="button-text">Pay $${invoice.total_amount.toFixed(2)}</span>
              <span id="spinner" class="hidden">Processing...</span>
            </button>
            <button class="btn-secondary" onclick="stripePayment.closeModal()">
              Cancel
            </button>
          </div>

          <div class="payment-security">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add modal styles if not already present
    if (!document.getElementById('stripe-payment-styles')) {
      const styles = `
        <style id="stripe-payment-styles">
          .payment-modal {
            max-width: 500px;
            width: 90%;
          }

          .payment-summary {
            background: var(--bone);
            border: 1px solid var(--border-light);
            border-radius: 6px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .payment-summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
          }

          .payment-summary-row:last-child {
            margin-bottom: 0;
          }

          .payment-amount {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--blue);
          }

          .payment-form-container {
            margin-bottom: 2rem;
          }

          #payment-element {
            min-height: 300px;
          }

          #payment-message {
            margin-top: 1rem;
            padding: 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
          }

          #payment-message.error {
            background: rgba(230, 57, 70, 0.1);
            border: 1px solid rgba(230, 57, 70, 0.2);
            color: var(--red);
          }

          #payment-message.success {
            background: rgba(39, 174, 96, 0.1);
            border: 1px solid rgba(39, 174, 96, 0.2);
            color: var(--green);
          }

          .payment-actions {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .payment-actions button {
            flex: 1;
          }

          #submit-payment {
            position: relative;
          }

          #spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }

          #spinner.hidden {
            display: none;
          }

          #button-text.hidden {
            visibility: hidden;
          }

          .payment-security {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
          }

          .payment-security svg {
            color: var(--green);
          }
        </style>
      `;
      document.head.insertAdjacentHTML('beforeend', styles);
    }
  }

  // Handle payment submission
  async handlePaymentSubmit(invoiceId) {
    try {
      const result = await this.processPayment(invoiceId);
      
      // Show success message
      this.showMessage('Payment successful! Thank you.', 'success');
      
      // Close modal after delay
      setTimeout(() => {
        this.closeModal();
        // Reload invoices
        if (window.portal && window.portal.modules.invoices) {
          window.portal.modules.invoices.loadInvoices();
        }
      }, 2000);
      
    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }

  // Show loading state
  showLoading(isLoading) {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');

    if (submitButton) {
      submitButton.disabled = isLoading;
      buttonText.classList.toggle('hidden', isLoading);
      spinner.classList.toggle('hidden', !isLoading);
    }
  }

  // Show message
  showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('payment-message');
    if (messageDiv) {
      messageDiv.textContent = message;
      messageDiv.className = type;
    }
  }

  // Close modal
  closeModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.remove();
    }
    // Clean up Stripe elements
    if (this.paymentElement) {
      this.paymentElement.destroy();
      this.paymentElement = null;
      this.elements = null;
    }
  }

  // Open payment modal for invoice
  async openPaymentModal(invoice) {
    try {
      // Create modal
      this.createPaymentModal(invoice);
      
      // Initialize payment form
      await this.createPaymentForm(invoice.id, 'payment-element');
      
    } catch (error) {
      console.error('Failed to open payment modal:', error);
      this.showMessage(error.message, 'error');
    }
  }
}

// Create global instance
window.stripePayment = new StripePayment();