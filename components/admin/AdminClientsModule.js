import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Clients Module
 * Handles client management, CRUD operations, and client data
 */
export class AdminClientsModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminClientsModule');
    this.clients = [];
    this.filteredClients = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.sortBy = 'name';
    this.sortDirection = 'asc';
  }

  async doInit() {
    this.element = document.getElementById('clients');
    if (this.element) {
      // Only load clients if we have a token (i.e., user is authenticated)
      if (this.admin && this.admin.token) {
        await this.loadClients();
      }
      this.setupClientsInterface();
      this.setupAutoRefresh(60000); // Refresh every minute
    }
  }

  /**
   * Load clients data
   */
  async loadClients() {
    try {
      const data = await this.getCachedData('clients', async () => {
        const response = await this.apiRequest('/clients');
        return await response.json();
      }, 60000); // Cache for 1 minute

      this.clients = data.clients || [];
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load clients:', error);
      this.showError('Failed to load clients');
    }
  }

  /**
   * Setup clients interface
   */
  setupClientsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-clients">
        <div class="clients-header">
          <h1>Client Management</h1>
          <div class="clients-actions">
            <button class="btn-primary" id="btn-create-client">
              Add Client
            </button>
            <button class="btn-secondary" id="btn-export-clients">
              Export
            </button>
          </div>
        </div>

        <div class="clients-filters">
          <div class="filter-group">
            <select class="status-filter" id="client-status-filter">
              <option value="all">All Clients</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospects</option>
            </select>
          </div>
          
          <div class="search-group">
            <input type="text" 
                   class="search-input" 
                   id="client-search-input"
                   placeholder="Search clients...">
          </div>

          <div class="sort-group">
            <select class="sort-select" id="client-sort-select">
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="projects_desc">Most Projects</option>
            </select>
          </div>
        </div>

        <div class="clients-stats">
          ${this.renderClientsStats()}
        </div>

        <div class="clients-content">
          ${this.renderClientsTable()}
        </div>
      </div>

      <!-- Client Modal -->
      <div id="client-modal" class="modal">
        <div class="modal-overlay" id="client-modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="client-modal-title">Add Client</h2>
            <button class="modal-close" id="client-modal-close">×</button>
          </div>
          <div class="modal-body">
            <form id="client-form">
              ${this.renderClientForm()}
            </form>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Render clients statistics
   */
  renderClientsStats() {
    const stats = {
      total: this.clients.length,
      active: this.clients.filter(c => c.status === 'active').length,
      inactive: this.clients.filter(c => c.status === 'inactive').length,
      prospects: this.clients.filter(c => c.status === 'prospect').length
    };

    return `
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Clients</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.active}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.inactive}</span>
          <span class="stat-label">Inactive</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.prospects}</span>
          <span class="stat-label">Prospects</span>
        </div>
      </div>
    `;
  }

  /**
   * Render clients table
   */
  renderClientsTable() {
    if (this.filteredClients.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="clients-table-container">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Projects</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredClients.map(client => this.renderClientRow(client)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render individual client row
   */
  renderClientRow(client) {
    const statusClass = this.getStatusClass(client.status);
    
    return `
      <tr class="client-row" data-client-id="${client.id}">
        <td class="client-info">
          <div class="client-name">
            <strong>${client.firstName} ${client.lastName}</strong>
            ${client.company ? `<div class="client-company">${client.company}</div>` : ''}
          </div>
        </td>
        <td class="client-contact">
          <div class="contact-email">${client.email}</div>
          ${client.phone ? `<div class="contact-phone">${client.phone}</div>` : ''}
        </td>
        <td class="client-status">
          <span class="status-badge ${statusClass}">${this.formatStatus(client.status)}</span>
        </td>
        <td class="client-projects">
          <span class="project-count">${client.projectCount || 0}</span>
          ${client.activeProjects > 0 ? `<span class="active-projects">(${client.activeProjects} active)</span>` : ''}
        </td>
        <td class="client-activity">
          ${client.lastActivity ? this.formatRelativeTime(client.lastActivity) : 'Never'}
        </td>
        <td class="client-actions">
          <div class="action-buttons">
            <button class="action-btn" onclick="admin.modules.clients.viewClient('${client.id}')" title="View Details">
              View
            </button>
            <button class="action-btn" onclick="admin.modules.clients.editClient('${client.id}')" title="Edit">
              Edit
            </button>
            <button class="action-btn" onclick="admin.modules.clients.createProject('${client.id}')" title="New Project">
              Project
            </button>
            <button class="action-btn danger" onclick="admin.modules.clients.deleteClient('${client.id}')" title="Delete">
              Delete
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
        <div class="empty-icon"></div>
        <h3>${isFiltered ? 'No clients found' : 'No clients yet'}</h3>
        <p>${isFiltered ? 'Try adjusting your filters or search term.' : 'Add your first client to get started.'}</p>
        ${!isFiltered ? `
          <button class="btn-primary" onclick="admin.modules.clients.showCreateModal()">
            Add First Client
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render client form
   */
  renderClientForm() {
    return `
      <div class="form-grid">
        <div class="form-group">
          <label for="client-first-name">First Name *</label>
          <input type="text" id="client-first-name" name="firstName" required>
        </div>
        
        <div class="form-group">
          <label for="client-last-name">Last Name *</label>
          <input type="text" id="client-last-name" name="lastName" required>
        </div>
        
        <div class="form-group full-width">
          <label for="client-email">Email *</label>
          <input type="email" id="client-email" name="email" required>
        </div>
        
        <div class="form-group">
          <label for="client-phone">Phone</label>
          <input type="tel" id="client-phone" name="phone">
        </div>
        
        <div class="form-group">
          <label for="client-company">Company</label>
          <input type="text" id="client-company" name="company">
        </div>
        
        <div class="form-group full-width">
          <label for="client-address">Address</label>
          <textarea id="client-address" name="address" rows="3"></textarea>
        </div>
        
        <div class="form-group">
          <label for="client-status">Status</label>
          <select id="client-status" name="status">
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="client-source">Source</label>
          <select id="client-source" name="source">
            <option value="">Select source...</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
            <option value="social_media">Social Media</option>
            <option value="advertising">Advertising</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group full-width">
          <label for="client-notes">Notes</label>
          <textarea id="client-notes" name="notes" rows="4" placeholder="Internal notes about this client..."></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="admin.modules.clients.closeModal()">
          Cancel
        </button>
        <button type="submit" class="btn-primary">
          <span class="button-text">Save Client</span>
          <span class="loading-spinner" style="display: none;">Saving...</span>
        </button>
      </div>
    `;
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    const form = document.getElementById('client-form');
    if (form) {
      this.addEventListener(form, 'submit', this.handleFormSubmit.bind(this));
    }
    
    // Setup modal close handlers
    const modalOverlay = document.getElementById('client-modal-overlay');
    if (modalOverlay) {
      this.addEventListener(modalOverlay, 'click', () => this.closeModal());
    }
    
    const modalClose = document.getElementById('client-modal-close');
    if (modalClose) {
      this.addEventListener(modalClose, 'click', () => this.closeModal());
    }

    // Setup create button handler
    const createBtn = document.getElementById('btn-create-client');
    if (createBtn) {
      this.addEventListener(createBtn, 'click', () => this.showCreateModal());
    }

    // Setup export button handler
    const exportBtn = document.getElementById('btn-export-clients');
    if (exportBtn) {
      this.addEventListener(exportBtn, 'click', () => this.exportClients());
    }

    // Setup filter handlers
    const statusFilter = document.getElementById('client-status-filter');
    if (statusFilter) {
      this.addEventListener(statusFilter, 'change', (e) => this.filterByStatus(e.target.value));
    }

    const searchInput = document.getElementById('client-search-input');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
    }

    const sortSelect = document.getElementById('client-sort-select');
    if (sortSelect) {
      this.addEventListener(sortSelect, 'change', (e) => this.handleSort(e.target.value));
    }
  }

  /**
   * Show create client modal
   */
  showCreateModal() {
    this.currentClientId = null;
    document.getElementById('client-modal-title').textContent = 'Add Client';
    document.getElementById('client-form').reset();
    document.getElementById('client-modal').classList.add('active');
  }

  /**
   * Show edit client modal
   */
  editClient(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    this.currentClientId = clientId;
    document.getElementById('client-modal-title').textContent = 'Edit Client';
    
    // Populate form
    Object.keys(client).forEach(key => {
      const input = document.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = client[key] || '';
      }
    });
    
    document.getElementById('client-modal').classList.add('active');
  }

  /**
   * Close modal
   */
  closeModal() {
    document.getElementById('client-modal').classList.remove('active');
    this.currentClientId = null;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const clientData = Object.fromEntries(formData.entries());
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Show loading
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline';

    try {
      const isEdit = this.currentClientId !== null;
      const url = isEdit ? `/clients/${this.currentClientId}` : '/clients';
      const method = isEdit ? 'PUT' : 'POST';

      // Transform field names from camelCase to snake_case
      const transformedData = {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone || '',
        company_name: clientData.company || '',
        address: clientData.address || '',
        status: clientData.status || 'prospect',
        source: clientData.source || ''
      };

      // Add password for new clients (generate a temporary password)
      if (!isEdit) {
        transformedData.password = `TempPass${Date.now()}!`;
      }

      const response = await this.apiRequest(url, {
        method,
        body: JSON.stringify(transformedData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (isEdit) {
          // Update existing client
          const index = this.clients.findIndex(c => c.id === this.currentClientId);
          if (index !== -1) {
            this.clients[index] = result.client;
          }
          this.showSuccess('Client updated successfully');
        } else {
          // Add new client
          this.clients.unshift(result.client);
          this.showSuccess('Client created successfully');
        }
        
        this.applyFilters();
        this.setupClientsInterface();
        this.closeModal();
        this.clearCache();
        
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to save client');
      }
      
    } catch (error) {
      console.error('Failed to save client:', error);
      this.showError('Failed to save client');
    } finally {
      // Reset button
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
    }
  }

  /**
   * View client details
   */
  viewClient(clientId) {
    // Navigate to client detail view or show modal
    console.log(`Viewing client: ${clientId}`);
    // Implementation would show detailed client view
  }

  /**
   * Create project for client
   */
  createProject(clientId) {
    this.admin.showSection('projects');
    // Trigger project creation with pre-selected client
    console.log(`Creating project for client: ${clientId}`);
  }

  /**
   * Delete client
   */
  async deleteClient(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    const confirmed = confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await this.apiRequest(`/clients/${clientId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.clients = this.clients.filter(c => c.id !== clientId);
        this.applyFilters();
        this.setupClientsInterface();
        this.showSuccess('Client deleted successfully');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to delete client');
      }
      
    } catch (error) {
      console.error('Failed to delete client:', error);
      this.showError('Failed to delete client');
    }
  }

  /**
   * Filter clients by status
   */
  filterByStatus(status) {
    this.currentFilter = status;
    this.applyFilters();
    this.setupClientsInterface();
  }

  /**
   * Handle search
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
    this.setupClientsInterface();
  }

  /**
   * Handle sorting
   */
  handleSort(sortValue) {
    const [field, direction] = sortValue.split('_');
    this.sortBy = field;
    this.sortDirection = direction;
    this.applyFilters();
    this.setupClientsInterface();
  }

  /**
   * Apply filters and sorting
   */
  applyFilters() {
    let filtered = [...this.clients];

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(client => client.status === this.currentFilter);
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(client => 
        client.firstName.toLowerCase().includes(this.searchTerm) ||
        client.lastName.toLowerCase().includes(this.searchTerm) ||
        client.email.toLowerCase().includes(this.searchTerm) ||
        (client.company && client.company.toLowerCase().includes(this.searchTerm))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.sortBy) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case 'projects':
          aVal = a.projectCount || 0;
          bVal = b.projectCount || 0;
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

    this.filteredClients = filtered;
  }

  /**
   * Export clients data
   */
  exportClients() {
    const csvData = this.generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.showSuccess('Clients exported successfully');
  }

  /**
   * Generate CSV data
   */
  generateCSV() {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Status', 'Projects', 'Created Date'];
    const rows = this.clients.map(client => [
      client.firstName,
      client.lastName,
      client.email,
      client.phone || '',
      client.company || '',
      client.status,
      client.projectCount || 0,
      this.formatDate(client.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
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
      active: 'status-active',
      inactive: 'status-inactive',
      prospect: 'status-prospect'
    };
    return classes[status] || 'status-default';
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      prospect: 'Prospect'
    };
    return labels[status] || status;
  }

  /**
   * Refresh clients data
   */
  async refresh() {
    this.clearCache();
    await this.loadClients();
    this.setupClientsInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('client_created', (client) => {
      this.clients.unshift(client);
      this.applyFilters();
      this.setupClientsInterface();
      this.showSuccess(`New client: ${client.firstName} ${client.lastName}`);
    });

    socket.on('client_updated', (client) => {
      const index = this.clients.findIndex(c => c.id === client.id);
      if (index !== -1) {
        this.clients[index] = client;
        this.applyFilters();
        this.setupClientsInterface();
      }
    });

    socket.on('client_deleted', (clientId) => {
      this.clients = this.clients.filter(c => c.id !== clientId);
      this.applyFilters();
      this.setupClientsInterface();
    });
  }
}