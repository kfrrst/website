import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Invoices Module
 * Handles invoice creation, management, and payment tracking
 */
export class AdminInvoicesModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminInvoicesModule');
    this.invoices = [];
    this.filteredInvoices = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.sortBy = 'created';
    this.sortDirection = 'desc';
  }

  async doInit() {
    this.element = document.getElementById('invoices');
    if (this.element) {
      // Only load invoices if we have a token
      if (this.admin && this.admin.token) {
        await this.loadInvoices();
      }
      this.setupInvoicesInterface();
      this.setupAutoRefresh(60000); // Refresh every minute
    }
  }

  /**
   * Load invoices data
   */
  async loadInvoices() {
    try {
      const data = await this.getCachedData('invoices', async () => {
        const response = await this.apiRequest('/invoices');
        return await response.json();
      }, 60000); // Cache for 1 minute

      this.invoices = data.invoices || [];
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load invoices:', error);
      this.showError('Failed to load invoices');
    }
  }

  /**
   * Setup invoices interface
   */
  setupInvoicesInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-invoices">
        <div class="invoices-header">
          <h1>Invoice Management</h1>
          <div class="invoices-actions">
            <button class="btn-primary" onclick="admin.modules.invoices.showCreateModal()">
              <span class="icon">➕</span>
              Create Invoice
            </button>
            <button class="btn-secondary" onclick="admin.modules.invoices.exportInvoices()">
              <span class="icon">📊</span>
              Export
            </button>
          </div>
        </div>

        <div class="invoices-filters">
          <div class="filter-group">
            <select class="status-filter" onchange="admin.modules.invoices.filterByStatus(this.value)">
              <option value="all">All Invoices</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div class="filter-group">
            <select class="date-filter" onchange="admin.modules.invoices.filterByDate(this.value)">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <div class="search-group">
            <input type="text" 
                   class="search-input" 
                   placeholder="Search invoices..." 
                   oninput="admin.modules.invoices.handleSearch(this.value)">
            <span class="search-icon">🔍</span>
          </div>
        </div>

        <div class="invoices-stats">
          ${this.renderInvoicesStats()}
        </div>

        <div class="invoices-content">
          ${this.renderInvoicesTable()}
        </div>
      </div>

      <!-- Invoice Modal -->
      <div id="invoice-modal" class="modal">
        <div class="modal-overlay" onclick="admin.modules.invoices.closeModal()"></div>
        <div class="modal-content large">
          <div class="modal-header">
            <h2 id="invoice-modal-title">Create Invoice</h2>
            <button class="modal-close" onclick="admin.modules.invoices.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <form id="invoice-form">
              ${this.renderInvoiceForm()}
            </form>
          </div>
        </div>
      </div>

      <!-- Invoice Preview Modal -->
      <div id="invoice-preview-modal" class="modal">
        <div class="modal-overlay" onclick="admin.modules.invoices.closePreviewModal()"></div>
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Invoice Preview</h2>
            <button class="modal-close" onclick="admin.modules.invoices.closePreviewModal()">×</button>
          </div>
          <div class="modal-body" id="invoice-preview-content">
            <!-- Invoice preview will be rendered here -->
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="admin.modules.invoices.closePreviewModal()">Close</button>
            <button class="btn-primary" onclick="admin.modules.invoices.sendInvoice()">Send Invoice</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Render invoices statistics
   */
  renderInvoicesStats() {
    const stats = {
      total: this.invoices.length,
      draft: this.invoices.filter(i => i.status === 'draft').length,
      sent: this.invoices.filter(i => i.status === 'sent').length,
      paid: this.invoices.filter(i => i.status === 'paid').length,
      overdue: this.invoices.filter(i => i.status === 'overdue').length,
      totalAmount: this.invoices.reduce((sum, i) => sum + (i.amount || 0), 0),
      paidAmount: this.invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0),
      overdueAmount: this.invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.amount || 0), 0)
    };

    return `
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Invoices</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.paid}</span>
          <span class="stat-label">Paid</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.sent}</span>
          <span class="stat-label">Sent</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.overdue}</span>
          <span class="stat-label">Overdue</span>
        </div>
      </div>
      <div class="revenue-stats">
        <div class="revenue-item">
          <span class="revenue-label">Total Revenue:</span>
          <span class="revenue-value">${this.formatCurrency(stats.totalAmount)}</span>
        </div>
        <div class="revenue-item">
          <span class="revenue-label">Paid:</span>
          <span class="revenue-value success">${this.formatCurrency(stats.paidAmount)}</span>
        </div>
        <div class="revenue-item">
          <span class="revenue-label">Outstanding:</span>
          <span class="revenue-value warning">${this.formatCurrency(stats.totalAmount - stats.paidAmount)}</span>
        </div>
        <div class="revenue-item">
          <span class="revenue-label">Overdue:</span>
          <span class="revenue-value danger">${this.formatCurrency(stats.overdueAmount)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render invoices table
   */
  renderInvoicesTable() {
    if (this.filteredInvoices.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="invoices-table-container">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredInvoices.map(invoice => this.renderInvoiceRow(invoice)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render individual invoice row
   */
  renderInvoiceRow(invoice) {
    const statusClass = this.getStatusClass(invoice.status);
    const isOverdue = invoice.status === 'sent' && new Date(invoice.due_date) < new Date();
    
    return `
      <tr class="invoice-row" data-invoice-id="${invoice.id}">
        <td class="invoice-number">
          <strong>#${invoice.invoice_number || invoice.id}</strong>
        </td>
        <td class="invoice-client">${invoice.client_name || 'No Client'}</td>
        <td class="invoice-project">${invoice.project_name || 'General'}</td>
        <td class="invoice-amount">
          <strong>${this.formatCurrency(invoice.amount)}</strong>
        </td>
        <td class="invoice-date">${this.formatDate(invoice.created_at, { month: 'short', day: 'numeric' })}</td>
        <td class="invoice-due ${isOverdue ? 'overdue' : ''}">
          ${invoice.due_date ? this.formatDate(invoice.due_date, { month: 'short', day: 'numeric' }) : 'Not Set'}
        </td>
        <td class="invoice-status">
          <span class="status-badge ${statusClass}">${this.formatStatus(invoice.status)}</span>
        </td>
        <td class="invoice-actions">
          <div class="action-buttons">
            <button class="action-btn" onclick="admin.modules.invoices.viewInvoice('${invoice.id}')" title="View">
              👁️
            </button>
            <button class="action-btn" onclick="admin.modules.invoices.editInvoice('${invoice.id}')" title="Edit">
              ✏️
            </button>
            ${invoice.status === 'draft' ? `
              <button class="action-btn" onclick="admin.modules.invoices.sendInvoice('${invoice.id}')" title="Send">
                📧
              </button>
            ` : ''}
            ${invoice.status === 'sent' ? `
              <button class="action-btn" onclick="admin.modules.invoices.markPaid('${invoice.id}')" title="Mark Paid">
                ✅
              </button>
            ` : ''}
            <button class="action-btn" onclick="admin.modules.invoices.downloadInvoice('${invoice.id}')" title="Download">
              ⬇️
            </button>
            <button class="action-btn danger" onclick="admin.modules.invoices.deleteInvoice('${invoice.id}')" title="Delete">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const isFiltered = this.currentFilter !== 'all' || this.searchTerm;
    
    return `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <h3>${isFiltered ? 'No invoices found' : 'No invoices yet'}</h3>
        <p>${isFiltered ? 'Try adjusting your filters or search term.' : 'Create your first invoice to get started.'}</p>
        ${!isFiltered ? `
          <button class="btn-primary" onclick="admin.modules.invoices.showCreateModal()">
            Create First Invoice
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render invoice form
   */
  renderInvoiceForm() {
    return `
      <div class="invoice-form-container">
        <div class="invoice-header-section">
          <div class="form-grid">
            <div class="form-group">
              <label for="invoice-client">Client *</label>
              <select id="invoice-client" name="client_id" required onchange="admin.modules.invoices.loadClientProjects(this.value)">
                <option value="">Select client...</option>
                ${this.renderClientOptions()}
              </select>
            </div>
            
            <div class="form-group">
              <label for="invoice-project">Project</label>
              <select id="invoice-project" name="project_id">
                <option value="">Select project...</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="invoice-number">Invoice Number</label>
              <input type="text" id="invoice-number" name="invoice_number" placeholder="Auto-generated">
            </div>
            
            <div class="form-group">
              <label for="invoice-date">Invoice Date *</label>
              <input type="date" id="invoice-date" name="invoice_date" required value="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="form-group">
              <label for="invoice-due">Due Date *</label>
              <input type="date" id="invoice-due" name="due_date" required>
            </div>
            
            <div class="form-group">
              <label for="invoice-status">Status</label>
              <select id="invoice-status" name="status">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        <div class="invoice-items-section">
          <h3>Invoice Items</h3>
          <table class="invoice-items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="invoice-items">
              <tr class="invoice-item">
                <td><input type="text" name="items[0][description]" class="item-description" required></td>
                <td><input type="number" name="items[0][quantity]" class="item-quantity" value="1" min="1" required onchange="admin.modules.invoices.calculateItemTotal(this)"></td>
                <td><input type="number" name="items[0][rate]" class="item-rate" min="0" step="0.01" required onchange="admin.modules.invoices.calculateItemTotal(this)"></td>
                <td><span class="item-total">$0.00</span></td>
                <td><button type="button" class="remove-item" onclick="admin.modules.invoices.removeItem(this)">×</button></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5">
                  <button type="button" class="btn-secondary" onclick="admin.modules.invoices.addItem()">+ Add Item</button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="invoice-totals-section">
          <div class="totals-container">
            <div class="total-row">
              <span>Subtotal:</span>
              <span id="invoice-subtotal">$0.00</span>
            </div>
            <div class="total-row">
              <span>Tax (<input type="number" id="tax-rate" name="tax_rate" value="0" min="0" max="100" step="0.01" onchange="admin.modules.invoices.calculateTotals()">%):</span>
              <span id="invoice-tax">$0.00</span>
            </div>
            <div class="total-row total">
              <span>Total:</span>
              <span id="invoice-total">$0.00</span>
              <input type="hidden" name="amount" id="invoice-amount-input">
            </div>
          </div>
        </div>

        <div class="invoice-notes-section">
          <div class="form-group">
            <label for="invoice-notes">Notes / Payment Terms</label>
            <textarea id="invoice-notes" name="notes" rows="3" placeholder="Payment due within 30 days..."></textarea>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="admin.modules.invoices.closeModal()">
          Cancel
        </button>
        <button type="button" class="btn-secondary" onclick="admin.modules.invoices.previewInvoice()">
          Preview
        </button>
        <button type="submit" class="btn-primary">
          <span class="button-text">Save Invoice</span>
          <span class="loading-spinner" style="display: none;">Saving...</span>
        </button>
      </div>
    `;
  }

  /**
   * Render client options
   */
  renderClientOptions() {
    // This would be populated from the clients module
    return `
      <option value="1">Client 1</option>
      <option value="2">Client 2</option>
    `;
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    const form = document.getElementById('invoice-form');
    if (form) {
      this.addEventListener(form, 'submit', this.handleFormSubmit.bind(this));
    }
  }

  /**
   * Add invoice item
   */
  addItem() {
    const tbody = document.getElementById('invoice-items');
    const rowCount = tbody.children.length;
    
    const newRow = document.createElement('tr');
    newRow.className = 'invoice-item';
    newRow.innerHTML = `
      <td><input type="text" name="items[${rowCount}][description]" class="item-description" required></td>
      <td><input type="number" name="items[${rowCount}][quantity]" class="item-quantity" value="1" min="1" required onchange="admin.modules.invoices.calculateItemTotal(this)"></td>
      <td><input type="number" name="items[${rowCount}][rate]" class="item-rate" min="0" step="0.01" required onchange="admin.modules.invoices.calculateItemTotal(this)"></td>
      <td><span class="item-total">$0.00</span></td>
      <td><button type="button" class="remove-item" onclick="admin.modules.invoices.removeItem(this)">×</button></td>
    `;
    
    tbody.appendChild(newRow);
  }

  /**
   * Remove invoice item
   */
  removeItem(button) {
    const row = button.closest('tr');
    if (document.querySelectorAll('.invoice-item').length > 1) {
      row.remove();
      this.calculateTotals();
    }
  }

  /**
   * Calculate item total
   */
  calculateItemTotal(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    const total = quantity * rate;
    
    row.querySelector('.item-total').textContent = this.formatCurrency(total);
    this.calculateTotals();
  }

  /**
   * Calculate invoice totals
   */
  calculateTotals() {
    let subtotal = 0;
    
    document.querySelectorAll('.invoice-item').forEach(row => {
      const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      subtotal += quantity * rate;
    });
    
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('invoice-subtotal').textContent = this.formatCurrency(subtotal);
    document.getElementById('invoice-tax').textContent = this.formatCurrency(tax);
    document.getElementById('invoice-total').textContent = this.formatCurrency(total);
    document.getElementById('invoice-amount-input').value = total.toFixed(2);
  }

  /**
   * Show create invoice modal
   */
  showCreateModal() {
    this.currentInvoiceId = null;
    document.getElementById('invoice-modal-title').textContent = 'Create Invoice';
    document.getElementById('invoice-form').reset();
    document.getElementById('invoice-modal').classList.add('active');
    
    // Set default dates
    document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('invoice-due').value = dueDate.toISOString().split('T')[0];
  }

  /**
   * Edit invoice
   */
  async editInvoice(invoiceId) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    this.currentInvoiceId = invoiceId;
    document.getElementById('invoice-modal-title').textContent = 'Edit Invoice';
    
    // Populate form
    // This would need to populate all fields including items
    document.getElementById('invoice-modal').classList.add('active');
  }

  /**
   * Close modal
   */
  closeModal() {
    document.getElementById('invoice-modal').classList.remove('active');
    this.currentInvoiceId = null;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const invoiceData = this.parseInvoiceFormData(formData);
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Show loading
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline';

    try {
      const isEdit = this.currentInvoiceId !== null;
      const url = isEdit ? `/invoices/${this.currentInvoiceId}` : '/invoices';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await this.apiRequest(url, {
        method,
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (isEdit) {
          // Update existing invoice
          const index = this.invoices.findIndex(i => i.id === this.currentInvoiceId);
          if (index !== -1) {
            this.invoices[index] = result.invoice;
          }
          this.showSuccess('Invoice updated successfully');
        } else {
          // Add new invoice
          this.invoices.unshift(result.invoice);
          this.showSuccess('Invoice created successfully');
        }
        
        this.applyFilters();
        this.setupInvoicesInterface();
        this.closeModal();
        this.clearCache();
        
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to save invoice');
      }
      
    } catch (error) {
      console.error('Failed to save invoice:', error);
      this.showError('Failed to save invoice');
    } finally {
      // Reset button
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
    }
  }

  /**
   * Parse invoice form data
   */
  parseInvoiceFormData(formData) {
    const data = Object.fromEntries(formData.entries());
    const items = [];
    
    // Extract items
    for (let i = 0; i < 100; i++) {
      if (data[`items[${i}][description]`]) {
        items.push({
          description: data[`items[${i}][description]`],
          quantity: parseFloat(data[`items[${i}][quantity]`]) || 0,
          rate: parseFloat(data[`items[${i}][rate]`]) || 0
        });
        delete data[`items[${i}][description]`];
        delete data[`items[${i}][quantity]`];
        delete data[`items[${i}][rate]`];
      }
    }
    
    data.items = items;
    data.amount = parseFloat(data.amount) || 0;
    data.tax_rate = parseFloat(data.tax_rate) || 0;
    
    return data;
  }

  /**
   * View invoice
   */
  viewInvoice(invoiceId) {
    // Show invoice details
    console.log(`Viewing invoice: ${invoiceId}`);
    this.previewInvoice(invoiceId);
  }

  /**
   * Preview invoice
   */
  async previewInvoice(invoiceId = null) {
    // Generate invoice preview
    const invoice = invoiceId ? this.invoices.find(i => i.id === invoiceId) : this.getCurrentFormData();
    
    const previewHtml = this.generateInvoiceHTML(invoice);
    document.getElementById('invoice-preview-content').innerHTML = previewHtml;
    document.getElementById('invoice-preview-modal').classList.add('active');
  }

  /**
   * Generate invoice HTML
   */
  generateInvoiceHTML(invoice) {
    return `
      <div class="invoice-preview">
        <div class="invoice-header">
          <div class="company-info">
            <h1>[RE]Print Studios</h1>
            <p>123 Design Street<br>Creative City, CC 12345<br>hello@reprintstudios.com</p>
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoice.invoice_number || 'DRAFT'}</p>
            <p><strong>Date:</strong> ${this.formatDate(invoice.invoice_date || new Date())}</p>
            <p><strong>Due Date:</strong> ${this.formatDate(invoice.due_date)}</p>
          </div>
        </div>
        
        <div class="billing-info">
          <div class="bill-to">
            <h3>Bill To:</h3>
            <p>${invoice.client_name || 'Client Name'}<br>
            ${invoice.client_address || 'Client Address'}</p>
          </div>
        </div>
        
        <table class="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${this.formatCurrency(item.rate)}</td>
                <td>${this.formatCurrency(item.quantity * item.rate)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Subtotal</td>
              <td>${this.formatCurrency(invoice.subtotal || 0)}</td>
            </tr>
            <tr>
              <td colspan="3">Tax (${invoice.tax_rate || 0}%)</td>
              <td>${this.formatCurrency(invoice.tax || 0)}</td>
            </tr>
            <tr class="total">
              <td colspan="3">Total</td>
              <td>${this.formatCurrency(invoice.amount || 0)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${invoice.notes ? `
          <div class="invoice-notes">
            <h3>Notes</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Close preview modal
   */
  closePreviewModal() {
    document.getElementById('invoice-preview-modal').classList.remove('active');
  }

  /**
   * Send invoice
   */
  async sendInvoice(invoiceId) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const confirmed = confirm(`Send invoice #${invoice.invoice_number} to ${invoice.client_name}?`);
    if (!confirmed) return;

    try {
      const response = await this.apiRequest(`/invoices/${invoiceId}/send`, {
        method: 'POST'
      });

      if (response.ok) {
        invoice.status = 'sent';
        this.applyFilters();
        this.setupInvoicesInterface();
        this.showSuccess('Invoice sent successfully');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to send invoice');
      }
      
    } catch (error) {
      console.error('Failed to send invoice:', error);
      this.showError('Failed to send invoice');
    }
  }

  /**
   * Mark invoice as paid
   */
  async markPaid(invoiceId) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const confirmed = confirm(`Mark invoice #${invoice.invoice_number} as paid?`);
    if (!confirmed) return;

    try {
      const response = await this.apiRequest(`/invoices/${invoiceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paid' })
      });

      if (response.ok) {
        invoice.status = 'paid';
        this.applyFilters();
        this.setupInvoicesInterface();
        this.showSuccess('Invoice marked as paid');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to update invoice');
      }
      
    } catch (error) {
      console.error('Failed to update invoice:', error);
      this.showError('Failed to update invoice');
    }
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceId) {
    try {
      const response = await this.apiRequest(`/invoices/${invoiceId}/download`);
      
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
      } else {
        this.showError('Failed to download invoice');
      }
      
    } catch (error) {
      console.error('Failed to download invoice:', error);
      this.showError('Failed to download invoice');
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId) {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const confirmed = confirm(`Are you sure you want to delete invoice #${invoice.invoice_number}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await this.apiRequest(`/invoices/${invoiceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.invoices = this.invoices.filter(i => i.id !== invoiceId);
        this.applyFilters();
        this.setupInvoicesInterface();
        this.showSuccess('Invoice deleted successfully');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to delete invoice');
      }
      
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      this.showError('Failed to delete invoice');
    }
  }

  /**
   * Filter invoices by status
   */
  filterByStatus(status) {
    this.currentFilter = status;
    this.applyFilters();
    this.setupInvoicesInterface();
  }

  /**
   * Filter invoices by date
   */
  filterByDate(period) {
    this.dateFilter = period;
    this.applyFilters();
    this.setupInvoicesInterface();
  }

  /**
   * Handle search
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
    this.setupInvoicesInterface();
  }

  /**
   * Apply filters and sorting
   */
  applyFilters() {
    let filtered = [...this.invoices];

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === this.currentFilter);
    }

    // Apply date filter
    if (this.dateFilter && this.dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      
      switch (this.dateFilter) {
        case 'today':
          filtered = filtered.filter(invoice => 
            new Date(invoice.created_at) >= startOfDay
          );
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          filtered = filtered.filter(invoice => 
            new Date(invoice.created_at) >= weekAgo
          );
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          filtered = filtered.filter(invoice => 
            new Date(invoice.created_at) >= monthAgo
          );
          break;
        case 'year':
          const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          filtered = filtered.filter(invoice => 
            new Date(invoice.created_at) >= yearAgo
          );
          break;
      }
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(invoice => 
        (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(this.searchTerm)) ||
        (invoice.client_name && invoice.client_name.toLowerCase().includes(this.searchTerm)) ||
        (invoice.project_name && invoice.project_name.toLowerCase().includes(this.searchTerm))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.sortBy) {
        case 'created':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        default:
          aVal = a[this.sortBy];
          bVal = b[this.sortBy];
      }

      if (this.sortDirection === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    this.filteredInvoices = filtered;
  }

  /**
   * Export invoices data
   */
  exportInvoices() {
    const csvData = this.generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.showSuccess('Invoices exported successfully');
  }

  /**
   * Generate CSV data
   */
  generateCSV() {
    const headers = ['Invoice #', 'Client', 'Project', 'Amount', 'Date', 'Due Date', 'Status'];
    const rows = this.invoices.map(invoice => [
      invoice.invoice_number || invoice.id,
      invoice.client_name || '',
      invoice.project_name || '',
      invoice.amount || 0,
      this.formatDate(invoice.created_at, { year: 'numeric', month: '2-digit', day: '2-digit' }),
      invoice.due_date ? this.formatDate(invoice.due_date, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '',
      invoice.status
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Get status class for styling
   */
  getStatusClass(status) {
    const classes = {
      draft: 'status-draft',
      sent: 'status-sent',
      paid: 'status-paid',
      overdue: 'status-overdue',
      cancelled: 'status-cancelled'
    };
    return classes[status] || 'status-default';
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const labels = {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Load client projects
   */
  async loadClientProjects(clientId) {
    if (!clientId) {
      document.getElementById('invoice-project').innerHTML = '<option value="">Select project...</option>';
      return;
    }

    try {
      const response = await this.apiRequest(`/clients/${clientId}/projects`);
      const projects = await response.json();
      
      const projectSelect = document.getElementById('invoice-project');
      projectSelect.innerHTML = `
        <option value="">Select project...</option>
        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      `;
      
    } catch (error) {
      console.error('Failed to load client projects:', error);
    }
  }

  /**
   * Get current form data
   */
  getCurrentFormData() {
    const form = document.getElementById('invoice-form');
    const formData = new FormData(form);
    return this.parseInvoiceFormData(formData);
  }

  /**
   * Refresh invoices data
   */
  async refresh() {
    this.clearCache();
    await this.loadInvoices();
    this.setupInvoicesInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('invoice_created', (invoice) => {
      this.invoices.unshift(invoice);
      this.applyFilters();
      this.setupInvoicesInterface();
      this.showSuccess(`New invoice created: #${invoice.invoice_number}`);
    });

    socket.on('invoice_updated', (invoice) => {
      const index = this.invoices.findIndex(i => i.id === invoice.id);
      if (index !== -1) {
        this.invoices[index] = invoice;
        this.applyFilters();
        this.setupInvoicesInterface();
      }
    });

    socket.on('invoice_deleted', (invoiceId) => {
      this.invoices = this.invoices.filter(i => i.id !== invoiceId);
      this.applyFilters();
      this.setupInvoicesInterface();
    });

    socket.on('payment_received', (data) => {
      const invoice = this.invoices.find(i => i.id === data.invoiceId);
      if (invoice) {
        invoice.status = 'paid';
        this.applyFilters();
        this.setupInvoicesInterface();
        this.showSuccess(`Payment received for invoice #${invoice.invoice_number}`);
      }
    });
  }
}