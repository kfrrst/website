import { BaseModule } from './BaseModule.js';

/**
 * Invoices module for client portal
 * Handles invoice display, payments, and billing history
 */
export class InvoicesModule extends BaseModule {
  constructor(portal) {
    super(portal, 'InvoicesModule');
    this.invoices = [];
    this.selectedInvoice = null;
    this.stripe = null;
    this.cardElement = null;
    this.paymentInProgress = false;
  }

  async doInit() {
    // Find the invoices list container within the invoices section
    const invoicesSection = document.getElementById('invoices');
    if (invoicesSection) {
      this.element = invoicesSection.querySelector('.invoices-list');
      if (this.element) {
        await this.initializeStripe();
        await this.loadInvoices();
        this.setupInvoicesInterface();
      }
    }
  }

  async initializeStripe() {
    try {
      if (typeof Stripe !== 'undefined') {
        this.stripe = Stripe(window.STRIPE_PUBLIC_KEY || 'pk_test_...');
        console.log('Stripe initialized');
      } else {
        console.warn('Stripe not available');
      }
    } catch (error) {
      console.error('Stripe initialization failed:', error);
    }
  }

  async loadInvoices() {
    try {
      const data = await this.getCachedData('invoices', async () => {
        const response = await this.apiRequest('/api/invoices');
        const result = await response.json();
        return result.invoices || [];
      }, 120000); // 2 minutes cache

      this.invoices = data;
    } catch (error) {
      console.error('Failed to load invoices:', error);
      this.invoices = [];
    }
  }

  setupInvoicesInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="invoices-container">
        <div class="invoices-header">
          <h1>Invoices & Billing</h1>
          <div class="billing-summary">
            ${this.renderBillingSummary()}
          </div>
        </div>

        <div class="invoices-content">
          ${this.invoices.length > 0 ? this.renderInvoicesList() : this.renderEmptyState()}
        </div>
      </div>

      <!-- Payment Modal -->
      <div id="payment-modal" class="modal">
        <div class="modal-overlay" onclick="portal.modules.invoices.closePaymentModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Pay Invoice</h2>
            <button class="modal-close" onclick="portal.modules.invoices.closePaymentModal()">×</button>
          </div>
          <div class="modal-body">
            <div id="payment-form-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderBillingSummary() {
    const totalAmount = this.invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = this.invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const pendingAmount = this.invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueAmount = this.invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    return `
      <div class="billing-stats">
        <div class="billing-stat">
          <div class="stat-value">${this.formatCurrency(totalAmount)}</div>
          <div class="stat-label">Total Billed</div>
        </div>
        <div class="billing-stat">
          <div class="stat-value">${this.formatCurrency(paidAmount)}</div>
          <div class="stat-label">Paid</div>
        </div>
        <div class="billing-stat ${pendingAmount > 0 ? 'attention' : ''}">
          <div class="stat-value">${this.formatCurrency(pendingAmount)}</div>
          <div class="stat-label">Pending</div>
        </div>
        ${overdueAmount > 0 ? `
          <div class="billing-stat urgent">
            <div class="stat-value">${this.formatCurrency(overdueAmount)}</div>
            <div class="stat-label">Overdue</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderInvoicesList() {
    // Sort invoices by date (newest first)
    const sortedInvoices = [...this.invoices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return `
      <div class="invoices-list">
        ${sortedInvoices.map(invoice => this.renderInvoiceCard(invoice)).join('')}
      </div>
    `;
  }

  renderInvoiceCard(invoice) {
    const statusClass = this.getInvoiceStatusClass(invoice.status);
    const isPayable = ['sent', 'overdue'].includes(invoice.status);
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && invoice.status !== 'paid';

    return `
      <div class="invoice-card ${statusClass} ${isOverdue ? 'overdue' : ''}" 
           onclick="portal.modules.invoices.viewInvoiceDetails('${invoice.id}')">
        <div class="invoice-header">
          <div class="invoice-number">
            <h3>Invoice #${invoice.invoice_number}</h3>
            <span class="invoice-status ${statusClass}">${this.formatStatus(invoice.status)}</span>
          </div>
          <div class="invoice-amount">
            <div class="amount-value">${this.formatCurrency(invoice.total_amount)}</div>
            ${invoice.tax_amount > 0 ? `<div class="amount-tax">+${this.formatCurrency(invoice.tax_amount)} tax</div>` : ''}
          </div>
        </div>

        <div class="invoice-details">
          <div class="invoice-project">
            ${invoice.project_name ? `[PROJECT] ${invoice.project_name}` : 'General Invoice'}
          </div>
          <div class="invoice-dates">
            <span class="invoice-date">Issued: ${this.formatDate(invoice.created_at, { month: 'short', day: 'numeric' })}</span>
            ${dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">Due: ${this.formatDate(dueDate, { month: 'short', day: 'numeric' })}</span>` : ''}
          </div>
        </div>

        <div class="invoice-actions" onclick="event.stopPropagation()">
          <button class="btn-secondary btn-sm" onclick="portal.modules.invoices.downloadInvoice('${invoice.id}')">
            [PDF] Download PDF
          </button>
          ${isPayable ? `
            <button class="btn-primary btn-sm" onclick="portal.modules.invoices.payInvoice('${invoice.id}')">
              [PAY] Pay Now
            </button>
          ` : ''}
          ${invoice.status === 'paid' ? `
            <span class="payment-date">Paid: ${this.formatDate(invoice.paid_at, { month: 'short', day: 'numeric' })}</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">[INVOICES]</div>
        <h3>No Invoices Yet</h3>
        <p>Your invoices will appear here when projects begin billing.</p>
      </div>
    `;
  }

  getInvoiceStatusClass(status) {
    const statusMap = {
      'draft': 'status-draft',
      'sent': 'status-sent',
      'paid': 'status-paid',
      'overdue': 'status-overdue',
      'cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-default';
  }

  formatStatus(status) {
    const statusMap = {
      'draft': 'Draft',
      'sent': 'Sent',
      'paid': 'Paid',
      'overdue': 'Overdue',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  viewInvoiceDetails(invoiceId) {
    const invoice = this.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    this.selectedInvoice = invoice;
    this.showInvoiceDetailsModal(invoice);
  }

  async showInvoiceDetailsModal(invoice) {
    // Load line items if not already loaded
    if (!invoice.line_items) {
      try {
        const response = await this.apiRequest(`/api/invoices/${invoice.id}/details`);
        const data = await response.json();
        invoice.line_items = data.line_items || [];
      } catch (error) {
        console.error('Failed to load invoice details:', error);
        invoice.line_items = [];
      }
    }

    const modal = document.createElement('div');
    modal.className = 'modal invoice-details-modal active';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Invoice #${invoice.invoice_number}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${this.renderInvoiceDetailsContent(invoice)}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  renderInvoiceDetailsContent(invoice) {
    const statusClass = this.getInvoiceStatusClass(invoice.status);
    const isPayable = ['sent', 'overdue'].includes(invoice.status);

    return `
      <div class="invoice-details-full">
        <div class="invoice-summary">
          <div class="invoice-info">
            <div class="info-row">
              <label>Status:</label>
              <span class="invoice-status ${statusClass}">${this.formatStatus(invoice.status)}</span>
            </div>
            <div class="info-row">
              <label>Issue Date:</label>
              <span>${this.formatDate(invoice.created_at)}</span>
            </div>
            <div class="info-row">
              <label>Due Date:</label>
              <span>${invoice.due_date ? this.formatDate(invoice.due_date) : 'No due date'}</span>
            </div>
            ${invoice.project_name ? `
              <div class="info-row">
                <label>Project:</label>
                <span>${invoice.project_name}</span>
              </div>
            ` : ''}
            ${invoice.paid_at ? `
              <div class="info-row">
                <label>Paid Date:</label>
                <span>${this.formatDate(invoice.paid_at)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="invoice-line-items">
          <h3>Items</h3>
          <div class="line-items-table">
            <div class="line-items-header">
              <div class="item-description">Description</div>
              <div class="item-quantity">Qty</div>
              <div class="item-rate">Rate</div>
              <div class="item-amount">Amount</div>
            </div>
            <div class="line-items-body">
              ${invoice.line_items?.map(item => `
                <div class="line-item">
                  <div class="item-description">${item.description}</div>
                  <div class="item-quantity">${item.quantity}</div>
                  <div class="item-rate">${this.formatCurrency(item.unit_price)}</div>
                  <div class="item-amount">${this.formatCurrency(item.quantity * item.unit_price)}</div>
                </div>
              `).join('') || '<div class="no-items">No line items available</div>'}
            </div>
          </div>
        </div>

        <div class="invoice-totals">
          <div class="totals-row">
            <label>Subtotal:</label>
            <span>${this.formatCurrency(invoice.subtotal_amount || invoice.total_amount)}</span>
          </div>
          ${invoice.tax_amount > 0 ? `
            <div class="totals-row">
              <label>Tax:</label>
              <span>${this.formatCurrency(invoice.tax_amount)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <label>Total:</label>
            <span>${this.formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>

        <div class="invoice-actions-full">
          <button class="btn-secondary" onclick="portal.modules.invoices.downloadInvoice('${invoice.id}')">
            [PDF] Download PDF
          </button>
          ${isPayable ? `
            <button class="btn-primary" onclick="portal.modules.invoices.payInvoice('${invoice.id}'); this.closest('.modal').remove();">
              [PAY] Pay Invoice
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  async downloadInvoice(invoiceId) {
    try {
      this.showLoading();
      
      const response = await this.apiRequest(`/api/invoices/${invoiceId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess('Invoice downloaded successfully');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to download invoice');
    } finally {
      this.hideLoading();
    }
  }

  async payInvoice(invoiceId) {
    const invoice = this.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    if (!this.stripe) {
      this.showError('Payment system not available');
      return;
    }

    this.selectedInvoice = invoice;
    this.showPaymentModal(invoice);
  }

  showPaymentModal(invoice) {
    const modal = document.getElementById('payment-modal');
    const container = document.getElementById('payment-form-container');
    
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="payment-form">
        <div class="payment-summary">
          <h3>Payment Summary</h3>
          <div class="summary-row">
            <span>Invoice #${invoice.invoice_number}</span>
            <span>${this.formatCurrency(invoice.total_amount)}</span>
          </div>
          ${invoice.project_name ? `
            <div class="summary-project">Project: ${invoice.project_name}</div>
          ` : ''}
        </div>

        <form id="payment-form">
          <div class="form-group">
            <label for="cardholder-name">Cardholder Name</label>
            <input type="text" id="cardholder-name" placeholder="Full name on card" required>
          </div>
          
          <div class="form-group">
            <label for="card-element">Card Information</label>
            <div id="card-element">
              <!-- Stripe Elements will create form elements here -->
            </div>
            <div id="card-errors" class="error-message" style="display: none;"></div>
          </div>

          <div class="payment-actions">
            <button type="button" class="btn-secondary" onclick="portal.modules.invoices.closePaymentModal()">
              Cancel
            </button>
            <button type="submit" id="submit-payment" class="btn-primary">
              <span class="button-text">Pay ${this.formatCurrency(invoice.total_amount)}</span>
              <span class="loading-spinner" style="display: none;">Processing...</span>
            </button>
          </div>
        </form>
      </div>
    `;

    // Initialize Stripe Elements
    this.setupStripeElements();
    
    modal.classList.add('active');
  }

  setupStripeElements() {
    if (!this.stripe) return;

    const elements = this.stripe.elements();
    
    this.cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      },
    });

    this.cardElement.mount('#card-element');

    // Handle real-time validation errors from the card Element
    this.cardElement.on('change', ({ error }) => {
      const errorElement = document.getElementById('card-errors');
      if (error) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
      } else {
        errorElement.style.display = 'none';
      }
    });

    // Handle form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', this.handlePaymentSubmit.bind(this));
  }

  async handlePaymentSubmit(event) {
    event.preventDefault();

    if (this.paymentInProgress) return;

    const submitButton = document.getElementById('submit-payment');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    const cardholderName = document.getElementById('cardholder-name').value;

    if (!cardholderName.trim()) {
      this.showError('Please enter cardholder name');
      return;
    }

    try {
      this.paymentInProgress = true;
      submitButton.disabled = true;
      buttonText.style.display = 'none';
      loadingSpinner.style.display = 'inline';

      // Create payment method
      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.cardElement,
        billing_details: {
          name: cardholderName,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Process payment on server
      const response = await this.apiRequest(`/api/invoices/${this.selectedInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
          amount: this.selectedInvoice.total_amount
        })
      });

      const result = await response.json();

      if (response.ok) {
        this.showSuccess('Payment successful!');
        this.closePaymentModal();
        
        // Refresh invoices
        this.clearCache();
        await this.loadInvoices();
        this.setupInvoicesInterface();
        
        // Update invoice status locally
        const invoice = this.invoices.find(inv => inv.id === this.selectedInvoice.id);
        if (invoice) {
          invoice.status = 'paid';
          invoice.paid_at = new Date().toISOString();
        }
        
      } else {
        throw new Error(result.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      this.showError(`Payment failed: ${error.message}`);
    } finally {
      this.paymentInProgress = false;
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
    }
  }

  closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.remove('active');
      
      // Cleanup Stripe elements
      if (this.cardElement) {
        this.cardElement.destroy();
        this.cardElement = null;
      }
    }
  }

  highlightInvoice(invoiceId) {
    // Highlight specific invoice when called from other modules
    setTimeout(() => {
      const invoiceCard = document.querySelector(`[onclick*="${invoiceId}"]`);
      if (invoiceCard) {
        invoiceCard.scrollIntoView({ behavior: 'smooth' });
        invoiceCard.classList.add('highlighted');
        setTimeout(() => invoiceCard.classList.remove('highlighted'), 3000);
      }
    }, 100);
  }

  // Socket event handlers for real-time invoice updates
  setupSocketEvents(socket) {
    socket.on('invoice_updated', (invoice) => {
      this.handleInvoiceUpdate(invoice);
    });

    socket.on('payment_received', (data) => {
      this.handlePaymentReceived(data);
    });
  }

  handleInvoiceUpdate(updatedInvoice) {
    // Update invoice in local array
    const index = this.invoices.findIndex(inv => inv.id === updatedInvoice.id);
    if (index !== -1) {
      this.invoices[index] = updatedInvoice;
    } else {
      this.invoices.unshift(updatedInvoice); // Add new invoice to the beginning
    }
    
    // Clear cache and refresh interface
    this.clearCache();
    this.setupInvoicesInterface();
    
    // Show notification
    this.showSuccess(`Invoice #${updatedInvoice.invoice_number} has been updated`);
  }

  handlePaymentReceived(data) {
    const { invoiceId, amount } = data;
    const invoice = this.invoices.find(inv => inv.id === invoiceId);
    
    if (invoice) {
      invoice.status = 'paid';
      invoice.paid_at = new Date().toISOString();
      
      // Clear cache and refresh interface
      this.clearCache();
      this.setupInvoicesInterface();
      
      // Show success notification
      this.showSuccess(`Payment of ${this.formatCurrency(amount)} received for invoice #${invoice.invoice_number}`);
    }
  }

  async refreshInvoices() {
    this.clearCache();
    await this.loadInvoices();
    this.setupInvoicesInterface();
  }
}