// Admin Portal JavaScript
class AdminPortal {
  constructor() {
    this.apiUrl = '/api';
    this.token = localStorage.getItem('adminToken');
    this.refreshToken = localStorage.getItem('adminRefreshToken');
    this.currentSection = 'overview';
    this.socket = null;
    this.stats = {};
    this.clients = [];
    this.projects = [];
    this.invoices = [];
    this.inquiries = [];
    this.searchTimeout = null;
    this.init();
  }

  init() {
    // Check if already logged in
    if (this.token) {
      this.verifyTokenAndShowDashboard();
    } else {
      this.setupLoginForm();
    }
    
    // Setup modal backdrop close handling
    this.setupModalBackdropClose();
  }

  // Setup login form
  setupLoginForm() {
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // For development - show default credentials hint
    if (window.location.hostname === 'localhost') {
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.placeholder = 'admin@kendrickforrest.com';
      }
    }
  }

  // Handle login
  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = document.getElementById('button-text');
    
    // Get form data
    const formData = new FormData(form);
    const credentials = {
      email: formData.get('email'),
      password: formData.get('password')
    };

    // Show loading state
    button.disabled = true;
    buttonText.textContent = 'Authenticating...';

    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        // Check if user is admin
        if (data.user.role !== 'admin') {
          this.showMessage('Admin access required', 'error');
          button.disabled = false;
          buttonText.textContent = 'Access Admin Portal';
          return;
        }

        // Store tokens
        this.token = data.accessToken;
        this.refreshToken = data.refreshToken;
        localStorage.setItem('adminToken', this.token);
        localStorage.setItem('adminRefreshToken', this.refreshToken);
        
        // Remember me functionality
        if (formData.get('remember')) {
          localStorage.setItem('adminEmail', credentials.email);
        }

        // Show dashboard
        this.showDashboard();
      } else {
        this.showMessage(data.error || 'Invalid credentials', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('Connection error. Please try again.', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = 'Access Admin Portal';
    }
  }

  // Verify token and show dashboard
  async verifyTokenAndShowDashboard() {
    try {
      const response = await fetch(`${this.apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user.role === 'admin') {
          this.showDashboard();
        } else {
          this.logout();
        }
      } else if (response.status === 403) {
        // Try to refresh token
        await this.refreshAccessToken();
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.logout();
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      this.logout();
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.accessToken;
        this.refreshToken = data.refreshToken;
        localStorage.setItem('adminToken', this.token);
        localStorage.setItem('adminRefreshToken', this.refreshToken);
        this.showDashboard();
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
    }
  }

  // Show dashboard
  showDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    
    this.setupDashboard();
    this.loadDashboardData();
    this.initializeSocket();
    this.setupSearch();
    this.setupFilterHandlers();
  }

  // Setup filter handlers
  setupFilterHandlers() {
    // Status filters
    const statusFilters = document.querySelectorAll('.status-filter');
    statusFilters.forEach(filter => {
      filter.addEventListener('change', (e) => {
        const section = e.target.dataset.section;
        const status = e.target.value;
        this.filterByStatus(section, status);
      });
    });
  }

  filterByStatus(section, status) {
    switch(section) {
      case 'clients':
        this.loadClients(1, '', status);
        break;
      case 'projects':
        this.loadProjects(1, '', status);
        break;
      case 'invoices':
        this.loadInvoices(1, status);
        break;
      case 'inquiries':
        this.loadInquiries(1, status);
        break;
    }
  }

  // Setup dashboard
  setupDashboard() {
    // Setup navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('href').substring(1);
        this.showSection(section);
      });
    });

    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            this.showSection('overview');
            break;
          case '2':
            e.preventDefault();
            this.showSection('clients');
            break;
          case '3':
            e.preventDefault();
            this.showSection('projects');
            break;
          case '4':
            e.preventDefault();
            this.showSection('invoices');
            break;
        }
      }
    });
  }

  // Show section
  showSection(sectionId) {
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${sectionId}`) {
        link.classList.add('active');
      }
    });

    // Show section
    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('active');
      this.currentSection = sectionId;
      
      // Load section-specific data
      this.loadSectionData(sectionId);
    }
  }

  // Load dashboard data
  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadStats(),
        this.loadRecentActivity(),
        this.loadSystemHealth()
      ]);
      this.animateStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showMessage('Failed to load dashboard data', 'error');
    }
  }

  // Load statistics from various endpoints
  async loadStats() {
    try {
      const [clientsRes, projectsRes, invoicesRes, inquiriesRes] = await Promise.all([
        this.fetchWithAuth(`${this.apiUrl}/clients?limit=1`),
        this.fetchWithAuth(`${this.apiUrl}/projects?limit=1`),
        this.fetchWithAuth(`${this.apiUrl}/invoices/stats`),
        this.fetchWithAuth(`${this.apiUrl}/inquiries?limit=1`)
      ]);

      const clientsData = await clientsRes.json();
      const projectsData = await projectsRes.json();
      const invoicesData = await invoicesRes.json();
      const inquiriesData = await inquiriesRes.json();

      // Update stats in the DOM
      const statCards = document.querySelectorAll('.stat-card');
      if (statCards.length >= 4) {
        statCards[0].querySelector('h3').textContent = clientsData.pagination?.totalClients || 0;
        statCards[1].querySelector('h3').textContent = projectsData.pagination?.totalProjects || 0;
        statCards[2].querySelector('h3').textContent = this.formatCurrency(invoicesData.current_month_revenue || 0);
        statCards[3].querySelector('h3').textContent = invoicesData.pending_invoices || 0;
      }

      this.stats = {
        totalClients: clientsData.pagination?.totalClients || 0,
        totalProjects: projectsData.pagination?.totalProjects || 0,
        monthlyRevenue: invoicesData.current_month_revenue || 0,
        pendingInvoices: invoicesData.pending_invoices || 0
      };
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Load recent activity
  async loadRecentActivity() {
    try {
      // This would be a custom endpoint for activity feed
      const activityList = document.querySelector('.activity-list');
      if (activityList) {
        activityList.innerHTML = `
          <div class="activity-item">
            <span class="activity-time">Loading...</span>
            <span class="activity-text">Fetching recent activity...</span>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  // Load system health
  async loadSystemHealth() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/health`);
      const health = await response.json();
      console.log('System health:', health);
    } catch (error) {
      console.error('Error loading system health:', error);
    }
  }

  // Animate statistics
  animateStats() {
    const statCards = document.querySelectorAll('.stat-card h3');
    statCards.forEach(stat => {
      const target = parseInt(stat.textContent.replace(/[^0-9]/g, ''));
      if (!isNaN(target)) {
        this.animateNumber(stat, 0, target, 1000);
      }
    });
  }

  // Animate number
  animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const isPrice = element.textContent.includes('$');
    
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeOutCubic);
      
      if (isPrice) {
        element.textContent = '$' + current.toLocaleString();
      } else {
        element.textContent = current.toLocaleString();
      }
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  // Additional helper function for proper modal backdrop click handling
  setupModalBackdropClose() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.remove();
      }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
      }
    });
  }

  // Load section data
  async loadSectionData(section) {
    switch(section) {
      case 'clients':
        await this.loadClients();
        break;
      case 'projects':
        await this.loadProjects();
        break;
      case 'invoices':
        await this.loadInvoices();
        break;
      case 'files':
        await this.loadFiles();
        break;
      case 'inquiries':
        await this.loadInquiries();
        break;
      case 'messages':
        await this.loadMessages();
        break;
      case 'phases':
        await this.loadPhaseAnalytics();
        break;
    }
  }

  // Message system functions
  async loadMessages(page = 1) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/messages/conversations?page=${page}&limit=20`);
      const data = await response.json();
      
      if (response.ok && data.conversations) {
        this.renderConversations(data.conversations);
        this.renderPagination('messages', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.showMessage('Failed to load messages', 'error');
    }
  }

  renderConversations(conversations) {
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) return;

    if (conversations.length === 0) {
      messagesContainer.innerHTML = '<div class="no-messages">No conversations found</div>';
      return;
    }

    messagesContainer.innerHTML = conversations.map(conv => `
      <div class="conversation-item" onclick="window.adminPortal.openConversation('${conv.id}')">
        <div class="conversation-header">
          <h4>${this.escapeHtml(`${conv.first_name} ${conv.last_name}`)}</h4>
          <span class="timestamp">${this.formatDate(conv.last_message_at)}</span>
        </div>
        <p class="last-message">${this.escapeHtml(conv.last_message || 'No messages')}</p>
        ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
      </div>
    `).join('');
  }

  async openConversation(userId) {
    // This would open a conversation modal or navigate to a detailed view
    this.showMessage(`Opening conversation with user ${userId}`, 'info');
  }

  // Export functionality
  async exportData(type) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/export/${type}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage(`${type} data exported successfully`, 'success');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showMessage(`Failed to export ${type} data`, 'error');
    }
  }

  // Load clients
  async loadClients(page = 1, search = '', status = 'active') {
    const clientsList = document.getElementById('clients-list');
    if (!clientsList) return;

    try {
      clientsList.innerHTML = '<tr><td colspan="6">Loading clients...</td></tr>';
      
      const params = new URLSearchParams({ page, limit: 20, status });
      if (search) params.append('search', search);
      
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients?${params}`);
      const data = await response.json();

      if (response.ok && data.clients) {
        this.clients = data.clients;
        this.renderClientsTable(data.clients);
        this.renderPagination('clients', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load clients');
      }
    } catch (error) {
      console.error('Load clients error:', error);
      clientsList.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    }
  }

  // Render clients table
  renderClientsTable(clients) {
    const clientsList = document.getElementById('clients-list');
    if (!clientsList) return;

    if (clients.length === 0) {
      clientsList.innerHTML = '<tr><td colspan="6">No clients found</td></tr>';
      return;
    }

    clientsList.innerHTML = clients.map(client => `
      <tr>
        <td>${this.escapeHtml(`${client.first_name} ${client.last_name}`)}</td>
        <td>${this.escapeHtml(client.email)}</td>
        <td>${client.active_projects || 0}</td>
        <td>$${(client.total_paid || 0).toLocaleString()}</td>
        <td>
          <span class="badge ${client.is_active ? 'active' : 'inactive'}">
            ${client.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn-link" onclick="window.adminPortal.editClient('${client.id}')">Edit</button>
          <button class="btn-link" onclick="window.adminPortal.viewClient('${client.id}')">View</button>
          ${client.is_active ? 
            `<button class="btn-link" onclick="window.adminPortal.deactivateClient('${client.id}')">Deactivate</button>` :
            `<button class="btn-link" onclick="window.adminPortal.reactivateClient('${client.id}')">Reactivate</button>`
          }
        </td>
      </tr>
    `).join('');
  }

  // Load projects
  async loadProjects(page = 1, search = '', status = 'all', sort = 'created_at') {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    try {
      projectsList.innerHTML = '<div class="loading">Loading projects...</div>';
      
      const params = new URLSearchParams({ page, limit: 20, sort, order: 'desc' });
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects?${params}`);
      const data = await response.json();

      if (response.ok && data.projects) {
        this.projects = data.projects;
        this.renderProjectsGrid(data.projects);
        this.renderPagination('projects', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Load projects error:', error);
      projectsList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  // Render projects grid
  renderProjectsGrid(projects) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    if (projects.length === 0) {
      projectsList.innerHTML = '<div class="no-projects">No projects found</div>';
      return;
    }

    projectsList.innerHTML = projects.map(project => `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-header">
          <h4>${this.escapeHtml(project.name)}</h4>
          <span class="project-status status-${project.status}">${this.formatStatus(project.status)}</span>
        </div>
        <p class="client">${this.escapeHtml(project.client_name || 'No Client')}</p>
        
        <!-- Phase Information -->
        <div class="phase-info">
          <div class="current-phase">
            <span class="phase-icon">${project.current_phase_icon || '📋'}</span>
            <span class="phase-name">${project.current_phase_name || 'Onboarding'}</span>
            <span class="phase-duration ${project.days_in_current_phase > 7 ? 'stuck' : ''}">(${project.days_in_current_phase || 0}d)</span>
          </div>
          <div class="phase-progress-mini">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${(project.current_phase_index || 0) / 7 * 100}%"></div>
            </div>
            <span class="phase-step">${(project.current_phase_index || 0) + 1}/8</span>
          </div>
        </div>
        
        <!-- Traditional Progress Bar -->
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${project.progress_percentage || 0}%"></div>
        </div>
        <p class="progress-text">${project.progress_percentage || 0}% Complete</p>
        ${project.due_date ? `<p class="due-date ${project.is_overdue ? 'overdue' : ''}">Due: ${this.formatDate(project.due_date)}</p>` : ''}
        
        <!-- Enhanced Project Actions with Phase Controls -->
        <div class="project-actions">
          <div class="main-actions">
            <button class="btn-secondary" onclick="window.adminPortal.editProject('${project.id}')">Edit</button>
            <button class="btn-secondary" onclick="window.adminPortal.viewProject('${project.id}')">View</button>
          </div>
          <div class="phase-actions">
            <button class="btn-icon btn-rewind" onclick="window.adminPortal.rewindPhase('${project.id}')" title="Previous Phase" ${(project.current_phase_index || 0) <= 0 ? 'disabled' : ''}>
              ⏪
            </button>
            <button class="btn-icon btn-advance" onclick="window.adminPortal.advancePhase('${project.id}')" title="Next Phase" ${(project.current_phase_index || 0) >= 7 ? 'disabled' : ''}>
              ⏩
            </button>
            <button class="btn-icon btn-jump" onclick="window.adminPortal.showPhaseJumpModal('${project.id}')" title="Jump to Phase">
              🎯
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Load invoices
  async loadInvoices(page = 1, status = 'all') {
    const invoicesList = document.getElementById('invoices-list');
    if (!invoicesList) return;

    try {
      invoicesList.innerHTML = '<tr><td colspan="6">Loading invoices...</td></tr>';
      
      const params = new URLSearchParams({ page, limit: 20 });
      if (status !== 'all') params.append('status', status);
      
      const response = await this.fetchWithAuth(`${this.apiUrl}/invoices?${params}`);
      const data = await response.json();

      if (response.ok && data.invoices) {
        this.invoices = data.invoices;
        this.renderInvoicesTable(data.invoices);
        this.renderPagination('invoices', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Load invoices error:', error);
      invoicesList.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    }
  }

  // Render invoices table
  renderInvoicesTable(invoices) {
    const invoicesList = document.getElementById('invoices-list');
    if (!invoicesList) return;

    if (invoices.length === 0) {
      invoicesList.innerHTML = '<tr><td colspan="6">No invoices found</td></tr>';
      return;
    }

    invoicesList.innerHTML = invoices.map(invoice => `
      <tr>
        <td>#${invoice.invoice_number}</td>
        <td>${this.escapeHtml(invoice.client_name || 'Unknown Client')}</td>
        <td>${this.formatCurrency(invoice.total_amount)}</td>
        <td>${this.formatDate(invoice.issue_date)}</td>
        <td>
          <span class="badge ${invoice.status} ${invoice.display_status === 'Overdue' ? 'overdue' : ''}">
            ${invoice.display_status || invoice.status}
          </span>
        </td>
        <td>
          <button class="btn-link" onclick="window.adminPortal.viewInvoice('${invoice.id}')">View</button>
          ${invoice.status === 'draft' ? 
            `<button class="btn-link" onclick="window.adminPortal.sendInvoice('${invoice.id}')">Send</button>` : ''
          }
          ${invoice.status !== 'draft' ? 
            `<button class="btn-link" onclick="window.adminPortal.downloadInvoice('${invoice.id}')">PDF</button>` : ''
          }
          ${invoice.status !== 'paid' && invoice.status !== 'cancelled' ? 
            `<button class="btn-link" onclick="window.adminPortal.cancelInvoice('${invoice.id}')">Cancel</button>` : ''
          }
        </td>
      </tr>
    `).join('');
  }

  // Load files
  async loadFiles(page = 1, project_id = '') {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    try {
      filesList.innerHTML = '<div class="loading">Loading files...</div>';
      
      const params = new URLSearchParams({ page, limit: 20 });
      if (project_id) params.append('project_id', project_id);
      
      const response = await this.fetchWithAuth(`${this.apiUrl}/files?${params}`);
      const data = await response.json();

      if (response.ok && data.files) {
        this.renderFilesGrid(data.files);
        this.renderPagination('files', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load files');
      }
    } catch (error) {
      console.error('Load files error:', error);
      filesList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  // Render files grid
  renderFilesGrid(files) {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    if (files.length === 0) {
      filesList.innerHTML = '<div class="no-files">No files found</div>';
      return;
    }

    filesList.innerHTML = files.map(file => `
      <div class="file-card">
        <div class="file-icon">${this.getFileIcon(file.filename)}</div>
        <h5>${this.escapeHtml(file.filename)}</h5>
        <p>${this.formatFileSize(file.file_size)} • ${this.formatDate(file.created_at)}</p>
        <p class="file-project">${file.project_name ? `Project: ${this.escapeHtml(file.project_name)}` : 'No Project'}</p>
        <div class="file-actions">
          <button class="btn-secondary" onclick="window.adminPortal.downloadFile('${file.id}')">Download</button>
          <button class="btn-secondary" onclick="window.adminPortal.deleteFile('${file.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Load inquiries
  async loadInquiries(page = 1, status = 'all') {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status !== 'all') params.append('status', status);
      
      const response = await this.fetchWithAuth(`${this.apiUrl}/inquiries?${params}`);
      const data = await response.json();

      if (response.ok && data.inquiries) {
        this.inquiries = data.inquiries;
        this.renderInquiriesTable(data.inquiries);
        this.renderPagination('inquiries', data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load inquiries');
      }
    } catch (error) {
      console.error('Load inquiries error:', error);
      this.showMessage('Failed to load inquiries', 'error');
    }
  }

  // Render inquiries table
  renderInquiriesTable(inquiries) {
    // This would be added to the HTML structure first
    const inquiriesContainer = document.getElementById('inquiries-list');
    if (!inquiriesContainer) return;

    if (inquiries.length === 0) {
      inquiriesContainer.innerHTML = '<tr><td colspan="7">No inquiries found</td></tr>';
      return;
    }

    inquiriesContainer.innerHTML = inquiries.map(inquiry => `
      <tr>
        <td>${this.escapeHtml(inquiry.name)}</td>
        <td>${this.escapeHtml(inquiry.email)}</td>
        <td>${this.escapeHtml(inquiry.company || 'N/A')}</td>
        <td>${this.formatStatus(inquiry.project_type)}</td>
        <td>${this.formatStatus(inquiry.budget_range)}</td>
        <td>
          <span class="badge ${inquiry.status}">${this.formatStatus(inquiry.status)}</span>
        </td>
        <td>
          <button class="btn-link" onclick="window.adminPortal.viewInquiry('${inquiry.id}')">View</button>
          <button class="btn-link" onclick="window.adminPortal.updateInquiryStatus('${inquiry.id}', '${inquiry.status}')">Update</button>
        </td>
      </tr>
    `).join('');
  }

  // Fetch with authentication
  async fetchWithAuth(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    return fetch(url, { ...options, ...defaultOptions });
  }

  // Logout
  async logout() {
    try {
      await this.fetchWithAuth(`${this.apiUrl}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Cleanup
    this.cleanup();

    // Clear tokens
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    this.token = null;
    this.refreshToken = null;

    // Redirect to login
    window.location.reload();
  }

  // Show message
  showMessage(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '10000',
      padding: '1rem 1.5rem',
      backgroundColor: type === 'error' ? '#e74c3c' : '#27ae60',
      color: '#fff',
      borderRadius: '0',
      transform: 'translateX(400px)',
      transition: 'transform 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      maxWidth: '400px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    });
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Modal helper functions
  showClientModal(client = null) {
    const isEdit = !!client;
    const modalId = 'client-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
      <div class="modal-overlay" id="${modalId}">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${isEdit ? 'Edit Client' : 'Create New Client'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="client-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="first_name">First Name *</label>
                  <input type="text" id="first_name" name="first_name" value="${isEdit ? this.escapeHtml(client.first_name || '') : ''}" required>
                </div>
                <div class="form-group">
                  <label for="last_name">Last Name *</label>
                  <input type="text" id="last_name" name="last_name" value="${isEdit ? this.escapeHtml(client.last_name || '') : ''}" required>
                </div>
              </div>
              <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" value="${isEdit ? this.escapeHtml(client.email || '') : ''}" required>
              </div>
              <div class="form-group">
                <label for="phone">Phone</label>
                <input type="tel" id="phone" name="phone" value="${isEdit ? this.escapeHtml(client.phone || '') : ''}">
              </div>
              <div class="form-group">
                <label for="company">Company</label>
                <input type="text" id="company" name="company" value="${isEdit ? this.escapeHtml(client.company || '') : ''}">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="address">Address</label>
                  <input type="text" id="address" name="address" value="${isEdit ? this.escapeHtml(client.address || '') : ''}">
                </div>
                <div class="form-group">
                  <label for="city">City</label>
                  <input type="text" id="city" name="city" value="${isEdit ? this.escapeHtml(client.city || '') : ''}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="state">State</label>
                  <input type="text" id="state" name="state" value="${isEdit ? this.escapeHtml(client.state || '') : ''}">
                </div>
                <div class="form-group">
                  <label for="zip_code">ZIP Code</label>
                  <input type="text" id="zip_code" name="zip_code" value="${isEdit ? this.escapeHtml(client.zip_code || '') : ''}">
                </div>
              </div>
              <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" name="notes" rows="3">${isEdit ? this.escapeHtml(client.notes || '') : ''}</textarea>
              </div>
              ${isEdit ? `
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="is_active" ${client.is_active ? 'checked' : ''}>
                  Active Client
                </label>
              </div>` : ''}
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" form="client-form" class="btn-primary">
              <span class="button-text">${isEdit ? 'Update Client' : 'Create Client'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Setup form handler
    const form = document.getElementById('client-form');
    form.addEventListener('submit', (e) => this.handleClientSubmit(e, client?.id));
    
    // Focus first input
    setTimeout(() => document.getElementById('first_name').focus(), 100);
  }

  showClientDetailsModal(client) {
    const modalId = 'client-details-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
      <div class="modal-overlay" id="${modalId}">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>Client Details: ${this.escapeHtml(`${client.first_name} ${client.last_name}`)}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="details-grid">
              <div class="details-section">
                <h4>Contact Information</h4>
                <div class="detail-item">
                  <label>Name:</label>
                  <span>${this.escapeHtml(`${client.first_name} ${client.last_name}`)}</span>
                </div>
                <div class="detail-item">
                  <label>Email:</label>
                  <span><a href="mailto:${client.email}">${this.escapeHtml(client.email)}</a></span>
                </div>
                ${client.phone ? `
                <div class="detail-item">
                  <label>Phone:</label>
                  <span><a href="tel:${client.phone}">${this.escapeHtml(client.phone)}</a></span>
                </div>` : ''}
                ${client.company ? `
                <div class="detail-item">
                  <label>Company:</label>
                  <span>${this.escapeHtml(client.company)}</span>
                </div>` : ''}
              </div>
              
              ${client.address || client.city || client.state || client.zip_code ? `
              <div class="details-section">
                <h4>Address</h4>
                ${client.address ? `<div class="detail-item"><label>Address:</label><span>${this.escapeHtml(client.address)}</span></div>` : ''}
                ${client.city ? `<div class="detail-item"><label>City:</label><span>${this.escapeHtml(client.city)}</span></div>` : ''}
                ${client.state ? `<div class="detail-item"><label>State:</label><span>${this.escapeHtml(client.state)}</span></div>` : ''}
                ${client.zip_code ? `<div class="detail-item"><label>ZIP:</label><span>${this.escapeHtml(client.zip_code)}</span></div>` : ''}
              </div>` : ''}
              
              <div class="details-section">
                <h4>Account Information</h4>
                <div class="detail-item">
                  <label>Status:</label>
                  <span class="badge ${client.is_active ? 'active' : 'inactive'}">
                    ${client.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Active Projects:</label>
                  <span>${client.active_projects || 0}</span>
                </div>
                <div class="detail-item">
                  <label>Total Paid:</label>
                  <span>${this.formatCurrency(client.total_paid || 0)}</span>
                </div>
                <div class="detail-item">
                  <label>Member Since:</label>
                  <span>${this.formatDate(client.created_at)}</span>
                </div>
              </div>
              
              ${client.notes ? `
              <div class="details-section full-width">
                <h4>Notes</h4>
                <div class="notes-content">
                  ${this.escapeHtml(client.notes).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="window.adminPortal.showClientModal(${JSON.stringify(client).replace(/"/g, '&quot;')})">Edit Client</button>
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async showProjectModal(project = null) {
    const isEdit = !!project;
    const modalId = 'project-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    // Load clients for dropdown
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients?limit=100&status=active`);
      const data = await response.json();
      const clients = data.clients || [];
      
      const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>${isEdit ? 'Edit Project' : 'Create New Project'}</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <form id="project-form">
                <div class="form-group">
                  <label for="project_name">Project Name *</label>
                  <input type="text" id="project_name" name="name" value="${isEdit ? this.escapeHtml(project.name || '') : ''}" required>
                </div>
                <div class="form-group">
                  <label for="client_id">Client *</label>
                  <select id="client_id" name="client_id" required>
                    <option value="">Select a client...</option>
                    ${clients.map(client => `
                      <option value="${client.id}" ${isEdit && project.client_id === client.id ? 'selected' : ''}>
                        ${this.escapeHtml(`${client.first_name} ${client.last_name}`)}
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="description">Description</label>
                  <textarea id="description" name="description" rows="3">${isEdit ? this.escapeHtml(project.description || '') : ''}</textarea>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="project_type">Project Type</label>
                    <select id="project_type" name="project_type">
                      <option value="">Select type...</option>
                      <option value="website" ${isEdit && project.project_type === 'website' ? 'selected' : ''}>Website</option>
                      <option value="web-app" ${isEdit && project.project_type === 'web-app' ? 'selected' : ''}>Web Application</option>
                      <option value="mobile-app" ${isEdit && project.project_type === 'mobile-app' ? 'selected' : ''}>Mobile App</option>
                      <option value="consulting" ${isEdit && project.project_type === 'consulting' ? 'selected' : ''}>Consulting</option>
                      <option value="maintenance" ${isEdit && project.project_type === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                      <option value="other" ${isEdit && project.project_type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="status">Status</label>
                    <select id="status" name="status">
                      <option value="planning" ${isEdit && project.status === 'planning' ? 'selected' : ''}>Planning</option>
                      <option value="in-progress" ${isEdit && project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                      <option value="review" ${isEdit && project.status === 'review' ? 'selected' : ''}>Review</option>
                      <option value="completed" ${isEdit && project.status === 'completed' ? 'selected' : ''}>Completed</option>
                      <option value="on-hold" ${isEdit && project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                      <option value="cancelled" ${isEdit && project.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="budget">Budget</label>
                    <input type="number" id="budget" name="budget" step="0.01" min="0" value="${isEdit ? (project.budget || '') : ''}">
                  </div>
                  <div class="form-group">
                    <label for="progress_percentage">Progress %</label>
                    <input type="number" id="progress_percentage" name="progress_percentage" min="0" max="100" value="${isEdit ? (project.progress_percentage || 0) : 0}">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="start_date">Start Date</label>
                    <input type="date" id="start_date" name="start_date" value="${isEdit && project.start_date ? project.start_date.split('T')[0] : ''}">
                  </div>
                  <div class="form-group">
                    <label for="due_date">Due Date</label>
                    <input type="date" id="due_date" name="due_date" value="${isEdit && project.due_date ? project.due_date.split('T')[0] : ''}">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="priority">Priority</label>
                    <select id="priority" name="priority">
                      <option value="low" ${isEdit && project.priority === 'low' ? 'selected' : ''}>Low</option>
                      <option value="medium" ${isEdit && project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                      <option value="high" ${isEdit && project.priority === 'high' ? 'selected' : ''}>High</option>
                      <option value="urgent" ${isEdit && project.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="estimated_hours">Estimated Hours</label>
                    <input type="number" id="estimated_hours" name="estimated_hours" min="0" step="0.5" value="${isEdit ? (project.estimated_hours || '') : ''}">
                  </div>
                </div>
                <div class="form-group">
                  <label for="requirements">Requirements/Notes</label>
                  <textarea id="requirements" name="requirements" rows="3">${isEdit ? this.escapeHtml(project.requirements || '') : ''}</textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" form="project-form" class="btn-primary">
                <span class="button-text">${isEdit ? 'Update Project' : 'Create Project'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Setup form handler
      const form = document.getElementById('project-form');
      form.addEventListener('submit', (e) => this.handleProjectSubmit(e, project?.id));
      
      // Focus first input
      setTimeout(() => document.getElementById('project_name').focus(), 100);
      
    } catch (error) {
      console.error('Error loading clients for project modal:', error);
      this.showMessage('Failed to load clients', 'error');
    }
  }

  showProjectDetailsModal(project) {
    const modalId = 'project-details-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
      <div class="modal-overlay" id="${modalId}">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>Project Details: ${this.escapeHtml(project.name)}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="details-grid">
              <div class="details-section">
                <h4>Project Information</h4>
                <div class="detail-item">
                  <label>Name:</label>
                  <span>${this.escapeHtml(project.name)}</span>
                </div>
                <div class="detail-item">
                  <label>Client:</label>
                  <span>${this.escapeHtml(project.client_name || 'No Client')}</span>
                </div>
                <div class="detail-item">
                  <label>Type:</label>
                  <span>${this.formatStatus(project.project_type || 'Not specified')}</span>
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <span class="badge status-${project.status}">${this.formatStatus(project.status)}</span>
                </div>
                <div class="detail-item">
                  <label>Priority:</label>
                  <span class="badge priority-${project.priority || 'medium'}">${this.formatStatus(project.priority || 'medium')}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h4>Timeline & Progress</h4>
                ${project.start_date ? `
                <div class="detail-item">
                  <label>Start Date:</label>
                  <span>${this.formatDate(project.start_date)}</span>
                </div>` : ''}
                ${project.due_date ? `
                <div class="detail-item">
                  <label>Due Date:</label>
                  <span class="${project.is_overdue ? 'overdue' : ''}">${this.formatDate(project.due_date)}</span>
                </div>` : ''}
                <div class="detail-item">
                  <label>Progress:</label>
                  <div class="progress-container">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${project.progress_percentage || 0}%"></div>
                    </div>
                    <span class="progress-text">${project.progress_percentage || 0}%</span>
                  </div>
                </div>
                <div class="detail-item">
                  <label>Created:</label>
                  <span>${this.formatDate(project.created_at)}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h4>Budget & Hours</h4>
                ${project.budget ? `
                <div class="detail-item">
                  <label>Budget:</label>
                  <span>${this.formatCurrency(project.budget)}</span>
                </div>` : ''}
                ${project.estimated_hours ? `
                <div class="detail-item">
                  <label>Estimated Hours:</label>
                  <span>${project.estimated_hours} hours</span>
                </div>` : ''}
                ${project.actual_hours ? `
                <div class="detail-item">
                  <label>Actual Hours:</label>
                  <span>${project.actual_hours} hours</span>
                </div>` : ''}
              </div>
              
              ${project.description ? `
              <div class="details-section full-width">
                <h4>Description</h4>
                <div class="notes-content">
                  ${this.escapeHtml(project.description).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
              
              ${project.requirements ? `
              <div class="details-section full-width">
                <h4>Requirements/Notes</h4>
                <div class="notes-content">
                  ${this.escapeHtml(project.requirements).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
              
              <!-- Phase Management Section -->
              <div class="details-section full-width phase-management-section">
                <div class="phase-section-header">
                  <h4>Phase Management</h4>
                  <div class="phase-controls">
                    <button class="btn-icon" onclick="window.adminPortal.showPhaseHistory('${project.id}')" title="View Phase History">
                      📊 History
                    </button>
                    <button class="btn-icon" onclick="window.adminPortal.showPhaseActions('${project.id}')" title="Manage Phase Actions">
                      ⚙️ Actions
                    </button>
                  </div>
                </div>
                <div class="phase-tracker-container" id="project-phase-tracker-${project.id}">
                  <!-- Phase tracker will be loaded here -->
                </div>
                
                <!-- Admin Phase Controls -->
                <div class="admin-phase-controls">
                  <div class="phase-actions-row">
                    <div class="current-phase-info">
                      <strong>Current: </strong>
                      <span class="current-phase-name" id="current-phase-${project.id}">
                        ${project.current_phase_name || 'Loading...'}
                      </span>
                      <span class="phase-duration" id="phase-duration-${project.id}">
                        (${project.days_in_current_phase || 0} days)
                      </span>
                    </div>
                    <div class="phase-action-buttons">
                      <button class="btn-icon btn-rewind" onclick="window.adminPortal.rewindPhase('${project.id}')" title="Previous Phase" ${project.current_phase_index <= 0 ? 'disabled' : ''}>
                        ⏪
                      </button>
                      <button class="btn-icon btn-advance" onclick="window.adminPortal.advancePhase('${project.id}')" title="Next Phase" ${project.current_phase_index >= 7 ? 'disabled' : ''}>
                        ⏩
                      </button>
                      <select class="phase-jump-select" onchange="window.adminPortal.jumpToPhase('${project.id}', this.value)" title="Jump to Phase">
                        <option value="">Jump to...</option>
                        <option value="0" ${project.current_phase_index === 0 ? 'selected' : ''}>Onboarding</option>
                        <option value="1" ${project.current_phase_index === 1 ? 'selected' : ''}>Ideation</option>
                        <option value="2" ${project.current_phase_index === 2 ? 'selected' : ''}>Design</option>
                        <option value="3" ${project.current_phase_index === 3 ? 'selected' : ''}>Review</option>
                        <option value="4" ${project.current_phase_index === 4 ? 'selected' : ''}>Production</option>
                        <option value="5" ${project.current_phase_index === 5 ? 'selected' : ''}>Payment</option>
                        <option value="6" ${project.current_phase_index === 6 ? 'selected' : ''}>Sign-off</option>
                        <option value="7" ${project.current_phase_index === 7 ? 'selected' : ''}>Delivery</option>
                      </select>
                      <button class="btn-secondary" onclick="window.adminPortal.editPhaseRequirements('${project.id}', ${project.current_phase_index || 0})">
                        Edit Requirements
                      </button>
                    </div>
                  </div>
                  
                  <!-- Phase Automation Controls -->
                  <div class="automation-controls">
                    <label class="checkbox-label">
                      <input type="checkbox" id="auto-advance-${project.id}" ${project.auto_advance_enabled ? 'checked' : ''} onchange="window.adminPortal.toggleAutoAdvance('${project.id}', this.checked)">
                      Auto-advance when requirements met
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" id="notify-stuck-${project.id}" ${project.stuck_notifications_enabled ? 'checked' : ''} onchange="window.adminPortal.toggleStuckNotifications('${project.id}', this.checked)">
                      Notify when stuck (>7 days)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="window.adminPortal.showProjectModal(${JSON.stringify(project).replace(/"/g, '&quot;')})">Edit Project</button>
            <button type="button" class="btn-secondary" onclick="window.adminPortal.updateProjectProgress('${project.id}', ${project.progress_percentage || 0})">Update Progress</button>
            <button type="button" class="btn-primary" onclick="window.adminPortal.refreshPhaseTracker('${project.id}')">Refresh Phases</button>
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize phase tracker for this project
    this.initializeProjectPhaseTracker(project.id);
  }

  async showInvoiceModal(invoice = null) {
    const isEdit = !!invoice;
    const modalId = 'invoice-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    try {
      // Load clients and projects for dropdowns
      const [clientsRes, projectsRes] = await Promise.all([
        this.fetchWithAuth(`${this.apiUrl}/clients?limit=100&status=active`),
        this.fetchWithAuth(`${this.apiUrl}/projects?limit=100`)
      ]);
      
      const clientsData = await clientsRes.json();
      const projectsData = await projectsRes.json();
      const clients = clientsData.clients || [];
      const projects = projectsData.projects || [];
      
      // Load existing line items if editing
      let lineItems = [];
      if (isEdit && invoice.id) {
        try {
          const lineItemsRes = await this.fetchWithAuth(`${this.apiUrl}/invoices/${invoice.id}`);
          const lineItemsData = await lineItemsRes.json();
          lineItems = lineItemsData.line_items || [];
        } catch (error) {
          console.error('Error loading line items:', error);
        }
      }
      
      const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>${isEdit ? `Edit Invoice ${invoice.invoice_number}` : 'Create New Invoice'}</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <form id="invoice-form">
                <div class="form-row">
                  <div class="form-group">
                    <label for="client_id">Client *</label>
                    <select id="client_id" name="client_id" required>
                      <option value="">Select a client...</option>
                      ${clients.map(client => `
                        <option value="${client.id}" ${isEdit && invoice.client_id === client.id ? 'selected' : ''}>
                          ${this.escapeHtml(`${client.first_name} ${client.last_name}`)}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="project_id">Project (Optional)</label>
                    <select id="project_id" name="project_id">
                      <option value="">Select a project...</option>
                      ${projects.map(project => `
                        <option value="${project.id}" ${isEdit && invoice.project_id === project.id ? 'selected' : ''}>
                          ${this.escapeHtml(project.name)}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="issue_date">Issue Date *</label>
                    <input type="date" id="issue_date" name="issue_date" value="${isEdit && invoice.issue_date ? invoice.issue_date.split('T')[0] : new Date().toISOString().split('T')[0]}" required>
                  </div>
                  <div class="form-group">
                    <label for="due_date">Due Date *</label>
                    <input type="date" id="due_date" name="due_date" value="${isEdit && invoice.due_date ? invoice.due_date.split('T')[0] : ''}" required>
                  </div>
                </div>
                <div class="form-group">
                  <label for="notes">Notes</label>
                  <textarea id="notes" name="notes" rows="2">${isEdit ? this.escapeHtml(invoice.notes || '') : ''}</textarea>
                </div>
                
                <div class="line-items-section">
                  <div class="section-header">
                    <h4>Line Items</h4>
                    <button type="button" class="btn-secondary" onclick="window.adminPortal.addLineItem()">Add Line Item</button>
                  </div>
                  <div id="line-items-container">
                    ${lineItems.length > 0 ? lineItems.map((item, index) => this.createLineItemHtml(item, index)).join('') : this.createLineItemHtml(null, 0)}
                  </div>
                </div>
                
                <div class="invoice-totals">
                  <div class="total-row">
                    <label>Subtotal:</label>
                    <span id="subtotal">$0.00</span>
                  </div>
                  <div class="total-row">
                    <label for="tax_rate">Tax Rate (%):</label>
                    <input type="number" id="tax_rate" name="tax_rate" step="0.01" min="0" max="100" value="${isEdit ? (invoice.tax_rate || 0) : 0}" onchange="window.adminPortal.calculateTotals()">
                  </div>
                  <div class="total-row">
                    <label>Tax Amount:</label>
                    <span id="tax-amount">$0.00</span>
                  </div>
                  <div class="total-row final-total">
                    <label>Total:</label>
                    <span id="total-amount">$0.00</span>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              ${isEdit ? `<button type="button" class="btn-secondary" onclick="window.adminPortal.saveInvoiceAsDraft('${invoice.id}')">Save as Draft</button>` : ''}
              <button type="submit" form="invoice-form" class="btn-primary">
                <span class="button-text">${isEdit ? 'Update Invoice' : 'Create Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Setup form handler
      const form = document.getElementById('invoice-form');
      form.addEventListener('submit', (e) => this.handleInvoiceSubmit(e, invoice?.id));
      
      // Calculate initial totals
      setTimeout(() => {
        this.calculateTotals();
        document.getElementById('client_id').focus();
      }, 100);
      
    } catch (error) {
      console.error('Error loading data for invoice modal:', error);
      this.showMessage('Failed to load invoice data', 'error');
    }
  }

  showInvoiceDetailsModal(invoice, lineItems) {
    const modalId = 'invoice-details-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = subtotal * (invoice.tax_rate || 0) / 100;
    const totalAmount = subtotal + taxAmount;
    
    const modalHtml = `
      <div class="modal-overlay" id="${modalId}">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>Invoice Details: ${invoice.invoice_number}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="invoice-details">
              <div class="details-grid">
                <div class="details-section">
                  <h4>Invoice Information</h4>
                  <div class="detail-item">
                    <label>Invoice Number:</label>
                    <span>${invoice.invoice_number}</span>
                  </div>
                  <div class="detail-item">
                    <label>Client:</label>
                    <span>${this.escapeHtml(invoice.client_name || 'Unknown Client')}</span>
                  </div>
                  ${invoice.project_name ? `
                  <div class="detail-item">
                    <label>Project:</label>
                    <span>${this.escapeHtml(invoice.project_name)}</span>
                  </div>` : ''}
                  <div class="detail-item">
                    <label>Status:</label>
                    <span class="badge ${invoice.status} ${invoice.display_status === 'Overdue' ? 'overdue' : ''}">
                      ${invoice.display_status || invoice.status}
                    </span>
                  </div>
                </div>
                
                <div class="details-section">
                  <h4>Dates & Payment</h4>
                  <div class="detail-item">
                    <label>Issue Date:</label>
                    <span>${this.formatDate(invoice.issue_date)}</span>
                  </div>
                  <div class="detail-item">
                    <label>Due Date:</label>
                    <span class="${invoice.is_overdue ? 'overdue' : ''}">${this.formatDate(invoice.due_date)}</span>
                  </div>
                  ${invoice.paid_date ? `
                  <div class="detail-item">
                    <label>Paid Date:</label>
                    <span>${this.formatDate(invoice.paid_date)}</span>
                  </div>` : ''}
                  <div class="detail-item">
                    <label>Total Amount:</label>
                    <span class="amount">${this.formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
              </div>
              
              ${invoice.notes ? `
              <div class="details-section full-width">
                <h4>Notes</h4>
                <div class="notes-content">
                  ${this.escapeHtml(invoice.notes).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
              
              <div class="line-items-details">
                <h4>Line Items</h4>
                <table class="line-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lineItems.map(item => `
                      <tr>
                        <td>${this.escapeHtml(item.description)}</td>
                        <td>${item.quantity}</td>
                        <td>${this.formatCurrency(item.rate)}</td>
                        <td>${this.formatCurrency(item.quantity * item.rate)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr class="subtotal-row">
                      <td colspan="3">Subtotal:</td>
                      <td>${this.formatCurrency(subtotal)}</td>
                    </tr>
                    ${invoice.tax_rate > 0 ? `
                    <tr class="tax-row">
                      <td colspan="3">Tax (${invoice.tax_rate}%):</td>
                      <td>${this.formatCurrency(taxAmount)}</td>
                    </tr>` : ''}
                    <tr class="total-row">
                      <td colspan="3"><strong>Total:</strong></td>
                      <td><strong>${this.formatCurrency(totalAmount)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${invoice.status === 'draft' ? `<button type="button" class="btn-secondary" onclick="window.adminPortal.sendInvoice('${invoice.id}')">Send Invoice</button>` : ''}
            ${invoice.status !== 'draft' ? `<button type="button" class="btn-secondary" onclick="window.adminPortal.downloadInvoice('${invoice.id}')">Download PDF</button>` : ''}
            <button type="button" class="btn-secondary" onclick="window.adminPortal.showInvoiceModal(${JSON.stringify(invoice).replace(/"/g, '&quot;')})">Edit Invoice</button>
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  showInquiryDetailsModal(inquiry) {
    const modalId = 'inquiry-details-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
      <div class="modal-overlay" id="${modalId}">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>Inquiry Details: ${this.escapeHtml(inquiry.name)}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="details-grid">
              <div class="details-section">
                <h4>Contact Information</h4>
                <div class="detail-item">
                  <label>Name:</label>
                  <span>${this.escapeHtml(inquiry.name)}</span>
                </div>
                <div class="detail-item">
                  <label>Email:</label>
                  <span><a href="mailto:${inquiry.email}">${this.escapeHtml(inquiry.email)}</a></span>
                </div>
                ${inquiry.phone ? `
                <div class="detail-item">
                  <label>Phone:</label>
                  <span><a href="tel:${inquiry.phone}">${this.escapeHtml(inquiry.phone)}</a></span>
                </div>` : ''}
                ${inquiry.company ? `
                <div class="detail-item">
                  <label>Company:</label>
                  <span>${this.escapeHtml(inquiry.company)}</span>
                </div>` : ''}
              </div>
              
              <div class="details-section">
                <h4>Project Information</h4>
                <div class="detail-item">
                  <label>Project Type:</label>
                  <span>${this.formatStatus(inquiry.project_type)}</span>
                </div>
                <div class="detail-item">
                  <label>Budget Range:</label>
                  <span>${this.formatStatus(inquiry.budget_range)}</span>
                </div>
                ${inquiry.timeline ? `
                <div class="detail-item">
                  <label>Timeline:</label>
                  <span>${this.escapeHtml(inquiry.timeline)}</span>
                </div>` : ''}
                <div class="detail-item">
                  <label>Status:</label>
                  <span class="badge ${inquiry.status}">${this.formatStatus(inquiry.status)}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h4>Inquiry Details</h4>
                <div class="detail-item">
                  <label>Submitted:</label>
                  <span>${this.formatDate(inquiry.created_at)}</span>
                </div>
                ${inquiry.follow_up_date ? `
                <div class="detail-item">
                  <label>Follow-up Date:</label>
                  <span>${this.formatDate(inquiry.follow_up_date)}</span>
                </div>` : ''}
                ${inquiry.source ? `
                <div class="detail-item">
                  <label>Source:</label>
                  <span>${this.formatStatus(inquiry.source)}</span>
                </div>` : ''}
              </div>
              
              ${inquiry.message ? `
              <div class="details-section full-width">
                <h4>Message</h4>
                <div class="notes-content">
                  ${this.escapeHtml(inquiry.message).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
              
              ${inquiry.notes ? `
              <div class="details-section full-width">
                <h4>Internal Notes</h4>
                <div class="notes-content">
                  ${this.escapeHtml(inquiry.notes).replace(/\n/g, '<br>')}
                </div>
              </div>` : ''}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="window.adminPortal.updateInquiryStatus('${inquiry.id}', '${inquiry.status}')">Update Status</button>
            <button type="button" class="btn-secondary" onclick="window.adminPortal.showComposeMessageModal('${inquiry.email}', 'Re: ${inquiry.name} - Project Inquiry')">Reply</button>
            ${inquiry.status === 'new' || inquiry.status === 'contacted' ? `<button type="button" class="btn-secondary" onclick="window.adminPortal.convertInquiryToClient('${inquiry.id}')">Convert to Client</button>` : ''}
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async showFileUploadModal() {
    const modalId = 'file-upload-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    try {
      // Load projects for dropdown
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects?limit=100`);
      const data = await response.json();
      const projects = data.projects || [];
      
      const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Upload Files</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <form id="file-upload-form">
                <div class="form-group">
                  <label for="project_id">Project (Optional)</label>
                  <select id="project_id" name="project_id">
                    <option value="">Select a project...</option>
                    ${projects.map(project => `
                      <option value="${project.id}">
                        ${this.escapeHtml(project.name)}
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="file-input">Files *</label>
                  <div class="file-upload-area" id="file-upload-area">
                    <input type="file" id="file-input" name="files" multiple accept="*/*" required>
                    <div class="upload-text">
                      <p>Click to select files or drag and drop</p>
                      <small>Maximum file size: 50MB per file</small>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label for="description">Description (Optional)</label>
                  <textarea id="description" name="description" rows="2" placeholder="Brief description of the files..."></textarea>
                </div>
                <div id="file-preview-container" class="file-preview-container"></div>
                <div class="upload-progress" id="upload-progress" style="display: none;">
                  <div class="progress-bar">
                    <div class="progress-fill" id="upload-progress-fill"></div>
                  </div>
                  <div class="progress-text" id="upload-progress-text">0%</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" form="file-upload-form" class="btn-primary" id="upload-btn">
                <span class="button-text">Upload Files</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Setup file upload handlers
      this.setupFileUploadHandlers();
      
    } catch (error) {
      console.error('Error setting up file upload modal:', error);
      this.showMessage('Failed to load file upload form', 'error');
    }
  }

  async showComposeMessageModal(recipientEmail = '', subject = '') {
    const modalId = 'compose-message-modal';
    
    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    
    try {
      // Load clients for recipient dropdown
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients?limit=100&status=active`);
      const data = await response.json();
      const clients = data.clients || [];
      
      const modalHtml = `
        <div class="modal-overlay" id="${modalId}">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>Compose Message</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <form id="compose-message-form">
                <div class="form-row">
                  <div class="form-group">
                    <label for="recipient_type">Recipient Type</label>
                    <select id="recipient_type" name="recipient_type" onchange="window.adminPortal.toggleRecipientFields()">
                      <option value="client" ${recipientEmail ? 'selected' : ''}>Client</option>
                      <option value="custom" ${recipientEmail ? 'selected' : ''}>Custom Email</option>
                      <option value="broadcast">Broadcast to All Clients</option>
                    </select>
                  </div>
                  <div class="form-group" id="client-select-group" ${recipientEmail ? 'style="display: none;"' : ''}>
                    <label for="client_id">Select Client</label>
                    <select id="client_id" name="client_id">
                      <option value="">Choose a client...</option>
                      ${clients.map(client => `
                        <option value="${client.id}" data-email="${client.email}">
                          ${this.escapeHtml(`${client.first_name} ${client.last_name}`)}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>
                <div class="form-group" id="custom-email-group" ${!recipientEmail ? 'style="display: none;"' : ''}>
                  <label for="recipient_email">Recipient Email</label>
                  <input type="email" id="recipient_email" name="recipient_email" value="${recipientEmail}">
                </div>
                <div class="form-group">
                  <label for="subject">Subject *</label>
                  <input type="text" id="subject" name="subject" value="${this.escapeHtml(subject)}" required>
                </div>
                <div class="form-group">
                  <label for="message_type">Message Type</label>
                  <select id="message_type" name="message_type">
                    <option value="general">General</option>
                    <option value="project_update">Project Update</option>
                    <option value="invoice">Invoice Related</option>
                    <option value="inquiry_response">Inquiry Response</option>
                    <option value="system">System Notification</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="priority">Priority</label>
                  <select id="priority" name="priority">
                    <option value="low">Low</option>
                    <option value="normal" selected>Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="content">Message *</label>
                  <textarea id="content" name="content" rows="8" required placeholder="Type your message here..."></textarea>
                </div>
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" name="send_email" checked>
                    Send email notification
                  </label>
                </div>
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" name="save_template">
                    Save as template
                  </label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="btn-secondary" onclick="window.adminPortal.saveMessageDraft()">Save Draft</button>
              <button type="submit" form="compose-message-form" class="btn-primary">
                <span class="button-text">Send Message</span>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Setup form handler
      const form = document.getElementById('compose-message-form');
      form.addEventListener('submit', (e) => this.handleMessageSubmit(e));
      
      // Setup client selection handler
      const clientSelect = document.getElementById('client_id');
      clientSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.email) {
          document.getElementById('recipient_email').value = selectedOption.dataset.email;
        }
      });
      
      // Focus subject field
      setTimeout(() => {
        if (recipientEmail) {
          document.getElementById('subject').focus();
        } else {
          document.getElementById('client_id').focus();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error setting up compose message modal:', error);
      this.showMessage('Failed to load compose message form', 'error');
    }
  }

  // Analytics and reporting functions
  async generateReport(type, period = 'month') {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/reports/${type}?period=${period}`);
      
      if (response.ok) {
        const data = await response.json();
        this.displayReportResults(type, data);
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Generate report error:', error);
      this.showMessage(`Failed to generate ${type} report`, 'error');
    }
  }

  displayReportResults(type, data) {
    // Implementation for displaying report results
    this.showMessage(`${type} report generated with ${data.length || 0} results`, 'success');
  }

  // Backup and restore functions
  async backupData() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/backup`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Backup completed successfully', 'success');
      } else {
        throw new Error('Backup failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      this.showMessage('Failed to create backup', 'error');
    }
  }

  // System health monitoring
  async checkSystemHealth() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/health`);
      const health = await response.json();
      
      if (response.ok) {
        this.displaySystemHealth(health);
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('Health check error:', error);
      this.showMessage('System health check failed', 'error');
    }
  }

  displaySystemHealth(health) {
    console.log('System Health:', health);
    // Implementation for displaying system health metrics
  }

  // Notification management
  async sendBroadcastNotification(message, type = 'info') {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/messages/broadcast`, {
        method: 'POST',
        body: JSON.stringify({
          subject: 'System Notification',
          content: message,
          message_type: type,
          priority: 'normal'
        })
      });
      
      if (response.ok) {
        this.showMessage('Broadcast notification sent successfully', 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Broadcast notification error:', error);
      this.showMessage('Failed to send broadcast notification', 'error');
    }
  }

  // Advanced filtering and sorting
  applySorting(section, field, direction = 'asc') {
    switch(section) {
      case 'clients':
        this.loadClients(1, '', 'active', field, direction);
        break;
      case 'projects':
        this.loadProjects(1, '', 'all', field, direction);
        break;
      case 'invoices':
        this.loadInvoices(1, 'all', field, direction);
        break;
    }
  }

  // Bulk operations
  async bulkAction(section, action, selectedIds) {
    if (!selectedIds || selectedIds.length === 0) {
      this.showMessage('Please select items to perform bulk action', 'error');
      return;
    }

    const confirmed = confirm(`Are you sure you want to ${action} ${selectedIds.length} items?`);
    if (!confirmed) return;

    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/${section}/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          action: action,
          ids: selectedIds
        })
      });
      
      if (response.ok) {
        this.showMessage(`Bulk ${action} completed successfully`, 'success');
        this.loadSectionData(section);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      this.showMessage(`Failed to perform bulk ${action}`, 'error');
    }
  }

  // Cleanup on logout
  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // Socket.io integration
  initializeSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      this.socket = io({
        auth: {
          token: this.token
        }
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.socket.emit('join_room', `user_${this.getUserId()}`);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      // Listen for real-time updates
      this.socket.on('new_message', (message) => {
        this.showMessage(`New message from ${message.sender_first_name}`, 'info');
        if (this.currentSection === 'messages') {
          this.loadMessages();
        }
      });

      this.socket.on('project_updated', (data) => {
        if (this.currentSection === 'projects') {
          this.loadProjects();
        }
      });

      this.socket.on('invoice_paid', (data) => {
        this.showMessage(`Invoice ${data.invoice_number} has been paid!`, 'success');
        if (this.currentSection === 'invoices') {
          this.loadInvoices();
        }
        this.loadStats(); // Refresh stats
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }

  // Helper functions
  getUserId() {
    try {
      const token = this.token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch (error) {
      return null;
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatStatus(status) {
    if (!status) return 'Unknown';
    return status.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(filename) {
    if (!filename) return '📄';
    const ext = filename.toLowerCase().split('.').pop();
    const icons = {
      pdf: '📋',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      zip: '🗜️', rar: '🗜️',
      mp4: '🎥', avi: '🎥',
      mp3: '🎵', wav: '🎵'
    };
    return icons[ext] || '📄';
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Pagination helper
  renderPagination(section, pagination) {
    const paginationContainer = document.getElementById(`${section}-pagination`);
    if (!paginationContainer || !pagination) return;

    const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;
    
    paginationContainer.innerHTML = `
      <div class="pagination">
        <button ${!hasPrevPage ? 'disabled' : ''} onclick="window.adminPortal.loadSectionPage('${section}', ${currentPage - 1})">
          Previous
        </button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button ${!hasNextPage ? 'disabled' : ''} onclick="window.adminPortal.loadSectionPage('${section}', ${currentPage + 1})">
          Next
        </button>
      </div>
    `;
  }

  loadSectionPage(section, page) {
    switch(section) {
      case 'clients':
        this.loadClients(page);
        break;
      case 'projects':
        this.loadProjects(page);
        break;
      case 'invoices':
        this.loadInvoices(page);
        break;
      case 'files':
        this.loadFiles(page);
        break;
      case 'inquiries':
        this.loadInquiries(page);
        break;
    }
  }

  // Search functionality
  setupSearch() {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.performSearch(e.target.dataset.section, e.target.value);
        }, 300);
      });
    });
  }

  performSearch(section, query) {
    switch(section) {
      case 'clients':
        this.loadClients(1, query);
        break;
      case 'projects':
        this.loadProjects(1, query);
        break;
    }
  }

  // Client management functions
  async editClient(clientId) {
    try {
      const client = this.clients.find(c => c.id === clientId);
      if (!client) {
        this.showMessage('Client not found', 'error');
        return;
      }
      
      this.showClientModal(client);
    } catch (error) {
      console.error('Error editing client:', error);
      this.showMessage('Failed to load client details', 'error');
    }
  }

  async viewClient(clientId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients/${clientId}`);
      const data = await response.json();
      
      if (response.ok) {
        this.showClientDetailsModal(data.client);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error viewing client:', error);
      this.showMessage('Failed to load client details', 'error');
    }
  }

  async deactivateClient(clientId) {
    if (!confirm('Are you sure you want to deactivate this client?')) return;
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients/${clientId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.showMessage('Client deactivated successfully', 'success');
        this.loadClients();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deactivating client:', error);
      this.showMessage(error.message || 'Failed to deactivate client', 'error');
    }
  }

  async reactivateClient(clientId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/clients/${clientId}/reactivate`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showMessage('Client reactivated successfully', 'success');
        this.loadClients();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error reactivating client:', error);
      this.showMessage(error.message || 'Failed to reactivate client', 'error');
    }
  }

  // Project management functions
  async editProject(projectId) {
    try {
      const project = this.projects.find(p => p.id === projectId);
      if (!project) {
        this.showMessage('Project not found', 'error');
        return;
      }
      
      this.showProjectModal(project);
    } catch (error) {
      console.error('Error editing project:', error);
      this.showMessage('Failed to load project details', 'error');
    }
  }

  async viewProject(projectId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}`);
      const data = await response.json();
      
      if (response.ok) {
        this.showProjectDetailsModal(data.project);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error viewing project:', error);
      this.showMessage('Failed to load project details', 'error');
    }
  }

  async updateProjectProgress(projectId, currentProgress) {
    const newProgress = prompt(`Update progress for this project (current: ${currentProgress}%):`, currentProgress);
    if (newProgress === null || newProgress === '') return;
    
    const progress = parseInt(newProgress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      this.showMessage('Please enter a valid progress percentage (0-100)', 'error');
      return;
    }
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress_percentage: progress })
      });
      
      if (response.ok) {
        this.showMessage('Project progress updated successfully', 'success');
        this.loadProjects();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating project progress:', error);
      this.showMessage(error.message || 'Failed to update project progress', 'error');
    }
  }

  // Invoice management functions
  async viewInvoice(invoiceId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/invoices/${invoiceId}`);
      const data = await response.json();
      
      if (response.ok) {
        this.showInvoiceDetailsModal(data.invoice, data.line_items);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      this.showMessage('Failed to load invoice details', 'error');
    }
  }

  async sendInvoice(invoiceId) {
    if (!confirm('Are you sure you want to send this invoice to the client?')) return;
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/invoices/${invoiceId}/send`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showMessage('Invoice sent successfully', 'success');
        this.loadInvoices();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      this.showMessage(error.message || 'Failed to send invoice', 'error');
    }
  }

  async downloadInvoice(invoiceId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/invoices/${invoiceId}/pdf`);
      
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
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      this.showMessage('Failed to download invoice', 'error');
    }
  }

  async cancelInvoice(invoiceId) {
    const reason = prompt('Please provide a reason for cancelling this invoice:');
    if (!reason) return;
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        this.showMessage('Invoice cancelled successfully', 'success');
        this.loadInvoices();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      this.showMessage(error.message || 'Failed to cancel invoice', 'error');
    }
  }

  // File management functions
  async downloadFile(fileId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/files/${fileId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `file-${fileId}`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.showMessage('Failed to download file', 'error');
    }
  }

  async deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.showMessage('File deleted successfully', 'success');
        this.loadFiles();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      this.showMessage(error.message || 'Failed to delete file', 'error');
    }
  }

  // Modal form handlers
  async handleClientSubmit(e, clientId = null) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = clientId ? 'Updating...' : 'Creating...';
    
    try {
      const formData = new FormData(form);
      const clientData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
        zip_code: formData.get('zip_code'),
        notes: formData.get('notes')
      };
      
      if (clientId) {
        clientData.is_active = formData.get('is_active') === 'on';
      }
      
      const url = clientId ? `${this.apiUrl}/clients/${clientId}` : `${this.apiUrl}/clients`;
      const method = clientId ? 'PUT' : 'POST';
      
      const response = await this.fetchWithAuth(url, {
        method,
        body: JSON.stringify(clientData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showMessage(clientId ? 'Client updated successfully' : 'Client created successfully', 'success');
        document.getElementById('client-modal').remove();
        this.loadClients();
      } else {
        throw new Error(data.error || 'Failed to save client');
      }
    } catch (error) {
      console.error('Client submit error:', error);
      this.showMessage(error.message || 'Failed to save client', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = originalText;
    }
  }

  async handleProjectSubmit(e, projectId = null) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = projectId ? 'Updating...' : 'Creating...';
    
    try {
      const formData = new FormData(form);
      const projectData = {
        name: formData.get('name'),
        client_id: formData.get('client_id'),
        description: formData.get('description'),
        project_type: formData.get('project_type'),
        status: formData.get('status'),
        budget: formData.get('budget') ? parseFloat(formData.get('budget')) : null,
        progress_percentage: parseInt(formData.get('progress_percentage')) || 0,
        start_date: formData.get('start_date') || null,
        due_date: formData.get('due_date') || null,
        priority: formData.get('priority'),
        estimated_hours: formData.get('estimated_hours') ? parseFloat(formData.get('estimated_hours')) : null,
        requirements: formData.get('requirements')
      };
      
      const url = projectId ? `${this.apiUrl}/projects/${projectId}` : `${this.apiUrl}/projects`;
      const method = projectId ? 'PUT' : 'POST';
      
      const response = await this.fetchWithAuth(url, {
        method,
        body: JSON.stringify(projectData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showMessage(projectId ? 'Project updated successfully' : 'Project created successfully', 'success');
        document.getElementById('project-modal').remove();
        this.loadProjects();
      } else {
        throw new Error(data.error || 'Failed to save project');
      }
    } catch (error) {
      console.error('Project submit error:', error);
      this.showMessage(error.message || 'Failed to save project', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = originalText;
    }
  }

  async handleInvoiceSubmit(e, invoiceId = null) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = invoiceId ? 'Updating...' : 'Creating...';
    
    try {
      const formData = new FormData(form);
      const invoiceData = {
        client_id: formData.get('client_id'),
        project_id: formData.get('project_id') || null,
        issue_date: formData.get('issue_date'),
        due_date: formData.get('due_date'),
        notes: formData.get('notes'),
        tax_rate: parseFloat(formData.get('tax_rate')) || 0,
        line_items: this.getLineItemsFromForm()
      };
      
      const url = invoiceId ? `${this.apiUrl}/invoices/${invoiceId}` : `${this.apiUrl}/invoices`;
      const method = invoiceId ? 'PUT' : 'POST';
      
      const response = await this.fetchWithAuth(url, {
        method,
        body: JSON.stringify(invoiceData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showMessage(invoiceId ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
        document.getElementById('invoice-modal').remove();
        this.loadInvoices();
      } else {
        throw new Error(data.error || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Invoice submit error:', error);
      this.showMessage(error.message || 'Failed to save invoice', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = originalText;
    }
  }

  async handleMessageSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = 'Sending...';
    
    try {
      const formData = new FormData(form);
      const recipientType = formData.get('recipient_type');
      
      let messageData = {
        subject: formData.get('subject'),
        content: formData.get('content'),
        message_type: formData.get('message_type'),
        priority: formData.get('priority'),
        send_email: formData.get('send_email') === 'on'
      };
      
      if (recipientType === 'broadcast') {
        messageData.is_broadcast = true;
      } else {
        messageData.recipient_email = recipientType === 'client' ? 
          document.getElementById('recipient_email').value : 
          formData.get('recipient_email');
        messageData.client_id = formData.get('client_id') || null;
      }
      
      const url = recipientType === 'broadcast' ? 
        `${this.apiUrl}/messages/broadcast` : 
        `${this.apiUrl}/messages`;
      
      const response = await this.fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showMessage('Message sent successfully', 'success');
        document.getElementById('compose-message-modal').remove();
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Message submit error:', error);
      this.showMessage(error.message || 'Failed to send message', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = originalText;
    }
  }

  // Invoice line items helpers
  createLineItemHtml(item = null, index = 0) {
    return `
      <div class="line-item" data-index="${index}">
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Description *</label>
            <input type="text" name="line_items[${index}][description]" value="${item ? this.escapeHtml(item.description) : ''}" required onchange="window.adminPortal.calculateTotals()">
          </div>
          <div class="form-group">
            <label>Quantity *</label>
            <input type="number" name="line_items[${index}][quantity]" value="${item ? item.quantity : 1}" min="0" step="0.01" required onchange="window.adminPortal.calculateTotals()">
          </div>
          <div class="form-group">
            <label>Rate *</label>
            <input type="number" name="line_items[${index}][rate]" value="${item ? item.rate : ''}" min="0" step="0.01" required onchange="window.adminPortal.calculateTotals()">
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input type="text" class="line-item-amount" readonly value="$0.00">
          </div>
          <div class="form-group">
            <button type="button" class="btn-remove" onclick="window.adminPortal.removeLineItem(${index})" ${index === 0 ? 'style="visibility: hidden;"' : ''}>&times;</button>
          </div>
        </div>
      </div>
    `;
  }

  addLineItem() {
    const container = document.getElementById('line-items-container');
    const currentItems = container.querySelectorAll('.line-item').length;
    const newItemHtml = this.createLineItemHtml(null, currentItems);
    container.insertAdjacentHTML('beforeend', newItemHtml);
    this.calculateTotals();
  }

  removeLineItem(index) {
    const lineItem = document.querySelector(`[data-index="${index}"]`);
    if (lineItem) {
      lineItem.remove();
      this.renumberLineItems();
      this.calculateTotals();
    }
  }

  renumberLineItems() {
    const lineItems = document.querySelectorAll('.line-item');
    lineItems.forEach((item, index) => {
      item.dataset.index = index;
      const inputs = item.querySelectorAll('input[name*="line_items"]');
      inputs.forEach(input => {
        const name = input.name.replace(/\[\d+\]/, `[${index}]`);
        input.name = name;
      });
      const removeBtn = item.querySelector('.btn-remove');
      if (removeBtn) {
        removeBtn.onclick = () => this.removeLineItem(index);
        removeBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
      }
    });
  }

  calculateTotals() {
    const lineItems = document.querySelectorAll('.line-item');
    let subtotal = 0;
    
    lineItems.forEach(item => {
      const quantity = parseFloat(item.querySelector('input[name*="[quantity]"]').value) || 0;
      const rate = parseFloat(item.querySelector('input[name*="[rate]"]').value) || 0;
      const amount = quantity * rate;
      
      item.querySelector('.line-item-amount').value = this.formatCurrency(amount);
      subtotal += amount;
    });
    
    const taxRate = parseFloat(document.getElementById('tax_rate')?.value || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    document.getElementById('subtotal').textContent = this.formatCurrency(subtotal);
    document.getElementById('tax-amount').textContent = this.formatCurrency(taxAmount);
    document.getElementById('total-amount').textContent = this.formatCurrency(totalAmount);
  }

  getLineItemsFromForm() {
    const lineItems = [];
    const container = document.getElementById('line-items-container');
    const items = container.querySelectorAll('.line-item');
    
    items.forEach(item => {
      const description = item.querySelector('input[name*="[description]"]').value;
      const quantity = parseFloat(item.querySelector('input[name*="[quantity]"]').value) || 0;
      const rate = parseFloat(item.querySelector('input[name*="[rate]"]').value) || 0;
      
      if (description && quantity > 0 && rate >= 0) {
        lineItems.push({ description, quantity, rate });
      }
    });
    
    return lineItems;
  }

  // File upload helpers
  setupFileUploadHandlers() {
    const form = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('file-upload-area');
    const previewContainer = document.getElementById('file-preview-container');
    
    // Form submit handler
    form.addEventListener('submit', (e) => this.handleFileUpload(e));
    
    // File input change handler
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      this.handleFileSelection(e.dataTransfer.files);
    });
  }

  handleFileSelection(files) {
    const previewContainer = document.getElementById('file-preview-container');
    previewContainer.innerHTML = '';
    
    Array.from(files).forEach((file, index) => {
      const filePreview = document.createElement('div');
      filePreview.className = 'file-preview';
      filePreview.innerHTML = `
        <div class="file-info">
          <span class="file-name">${this.escapeHtml(file.name)}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </div>
        <button type="button" class="btn-remove" onclick="this.remove()">&times;</button>
      `;
      previewContainer.appendChild(filePreview);
    });
  }

  async handleFileUpload(e) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.button-text');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('upload-progress');
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');
    
    if (!fileInput.files.length) {
      this.showMessage('Please select files to upload', 'error');
      return;
    }
    
    // Show loading state
    button.disabled = true;
    buttonText.textContent = 'Uploading...';
    progressContainer.style.display = 'block';
    
    try {
      const formData = new FormData();
      formData.append('project_id', document.getElementById('project_id').value);
      formData.append('description', document.getElementById('description').value);
      
      Array.from(fileInput.files).forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${this.apiUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.showMessage(`${fileInput.files.length} file(s) uploaded successfully`, 'success');
        document.getElementById('file-upload-modal').remove();
        this.loadFiles();
      } else {
        throw new Error(data.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('File upload error:', error);
      this.showMessage(error.message || 'Failed to upload files', 'error');
    } finally {
      button.disabled = false;
      buttonText.textContent = 'Upload Files';
      progressContainer.style.display = 'none';
    }
  }

  // Message modal helper functions
  toggleRecipientFields() {
    const recipientType = document.getElementById('recipient_type').value;
    const clientGroup = document.getElementById('client-select-group');
    const customGroup = document.getElementById('custom-email-group');
    
    if (recipientType === 'client') {
      clientGroup.style.display = 'block';
      customGroup.style.display = 'none';
    } else if (recipientType === 'custom') {
      clientGroup.style.display = 'none';
      customGroup.style.display = 'block';
    } else {
      clientGroup.style.display = 'none';
      customGroup.style.display = 'none';
    }
  }

  async saveMessageDraft() {
    // Implementation for saving message draft
    this.showMessage('Draft saved (feature to be implemented)', 'info');
  }

  async convertInquiryToClient(inquiryId) {
    if (!confirm('Are you sure you want to convert this inquiry to a client?')) return;
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/inquiries/${inquiryId}/convert`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showMessage('Inquiry converted to client successfully', 'success');
        document.getElementById('inquiry-details-modal').remove();
        this.loadInquiries();
        this.loadClients();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error converting inquiry:', error);
      this.showMessage(error.message || 'Failed to convert inquiry', 'error');
    }
  }

  // Inquiry management functions
  async viewInquiry(inquiryId) {
    try {
      const inquiry = this.inquiries.find(i => i.id === inquiryId);
      if (!inquiry) {
        this.showMessage('Inquiry not found', 'error');
        return;
      }
      
      this.showInquiryDetailsModal(inquiry);
    } catch (error) {
      console.error('Error viewing inquiry:', error);
      this.showMessage('Failed to load inquiry details', 'error');
    }
  }

  async updateInquiryStatus(inquiryId, currentStatus) {
    const statuses = ['new', 'in-progress', 'contacted', 'converted', 'closed'];
    const newStatus = prompt(`Update inquiry status (current: ${currentStatus})\nOptions: ${statuses.join(', ')}`, currentStatus);
    
    if (!newStatus || !statuses.includes(newStatus)) {
      if (newStatus) this.showMessage('Please enter a valid status', 'error');
      return;
    }
    
    const notes = prompt('Add notes (optional):');
    
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/inquiries/${inquiryId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, notes })
      });
      
      if (response.ok) {
        this.showMessage('Inquiry status updated successfully', 'success');
        this.loadInquiries();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      this.showMessage(error.message || 'Failed to update inquiry status', 'error');
    }
  }

  // ===============================
  // PHASE MANAGEMENT FUNCTIONS
  // ===============================

  // Initialize phase tracker for a project
  async initializeProjectPhaseTracker(projectId) {
    try {
      const container = document.getElementById(`project-phase-tracker-${projectId}`);
      if (!container) return;

      // Import ProgressTracker dynamically
      const { ProgressTracker } = await import('./utils/progressTracker.js');
      
      // Create tracker with admin options
      const tracker = new ProgressTracker(container, {
        interactive: true,
        showActions: true,
        showProgress: true,
        orientation: 'horizontal',
        onPhaseClick: (phaseKey, phaseIndex) => {
          this.jumpToPhase(projectId, phaseIndex);
        },
        onActionComplete: (actionId, isCompleted) => {
          this.onPhaseActionComplete(projectId, actionId, isCompleted);
        }
      });

      await tracker.init(projectId);
    } catch (error) {
      console.error('Error initializing phase tracker:', error);
      this.showMessage('Failed to load phase tracker', 'error');
    }
  }

  // Refresh phase tracker
  async refreshPhaseTracker(projectId) {
    await this.initializeProjectPhaseTracker(projectId);
    this.showMessage('Phase tracker refreshed', 'success');
  }

  // Manual phase advance
  async advancePhase(projectId) {
    if (!confirm('Are you sure you want to advance this project to the next phase?')) {
      return;
    }

    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_override: true })
      });

      if (response.ok) {
        const data = await response.json();
        this.showMessage(`Project advanced to ${data.new_phase_name}`, 'success');
        this.refreshProjectData(projectId);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error advancing phase:', error);
      this.showMessage(error.message || 'Failed to advance phase', 'error');
    }
  }

  // Manual phase rewind
  async rewindPhase(projectId) {
    if (!confirm('Are you sure you want to rewind this project to the previous phase?')) {
      return;
    }

    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/rewind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_override: true })
      });

      if (response.ok) {
        const data = await response.json();
        this.showMessage(`Project rewound to ${data.new_phase_name}`, 'success');
        this.refreshProjectData(projectId);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error rewinding phase:', error);
      this.showMessage(error.message || 'Failed to rewind phase', 'error');
    }
  }

  // Jump to specific phase
  async jumpToPhase(projectId, phaseIndex) {
    const phaseNames = ['Onboarding', 'Ideation', 'Design', 'Review', 'Production', 'Payment', 'Sign-off', 'Delivery'];
    const phaseName = phaseNames[phaseIndex];
    
    if (!confirm(`Are you sure you want to jump this project to ${phaseName} phase?`)) {
      return;
    }

    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/jump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phase_index: parseInt(phaseIndex), 
          manual_override: true 
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.showMessage(`Project jumped to ${data.new_phase_name}`, 'success');
        this.refreshProjectData(projectId);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error jumping to phase:', error);
      this.showMessage(error.message || 'Failed to jump to phase', 'error');
    }
  }

  // Show phase jump modal
  showPhaseJumpModal(projectId) {
    const modalHtml = `
      <div class="modal-overlay" id="phase-jump-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Jump to Phase</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <p>Select which phase to jump to:</p>
            <div class="phase-options">
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 0); this.closest('.modal-overlay').remove();">
                📋 Onboarding
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 1); this.closest('.modal-overlay').remove();">
                💡 Ideation
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 2); this.closest('.modal-overlay').remove();">
                🎨 Design
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 3); this.closest('.modal-overlay').remove();">
                👀 Review & Feedback
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 4); this.closest('.modal-overlay').remove();">
                🖨️ Production/Print
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 5); this.closest('.modal-overlay').remove();">
                💳 Payment
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 6); this.closest('.modal-overlay').remove();">
                ✍️ Sign-off & Docs
              </button>
              <button class="phase-option" onclick="window.adminPortal.jumpToPhase('${projectId}', 7); this.closest('.modal-overlay').remove();">
                📦 Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Show phase history
  async showPhaseHistory(projectId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/history`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const modalHtml = `
        <div class="modal-overlay" id="phase-history-modal">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>Phase History</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="phase-history-timeline">
                ${data.history.map(entry => `
                  <div class="history-entry">
                    <div class="history-date">${this.formatDate(entry.timestamp)}</div>
                    <div class="history-content">
                      <h4>${entry.phase_name}</h4>
                      <p>${entry.action_description}</p>
                      ${entry.notes ? `<p class="history-notes">${this.escapeHtml(entry.notes)}</p>` : ''}
                      <span class="history-duration">Duration: ${entry.duration_days} days</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
      console.error('Error loading phase history:', error);
      this.showMessage('Failed to load phase history', 'error');
    }
  }

  // Show phase actions management
  async showPhaseActions(projectId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/actions`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const modalHtml = `
        <div class="modal-overlay" id="phase-actions-modal">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>Manage Phase Actions</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="actions-list">
                ${data.actions.map(action => `
                  <div class="action-item ${action.is_completed ? 'completed' : ''}">
                    <div class="action-content">
                      <h4>${action.action_description}</h4>
                      <p>Phase: ${action.phase_name}</p>
                      ${action.is_required ? '<span class="required-badge">Required</span>' : ''}
                    </div>
                    <div class="action-controls">
                      <label class="checkbox-label">
                        <input type="checkbox" ${action.is_completed ? 'checked' : ''} 
                               onchange="window.adminPortal.updatePhaseAction('${action.id}', this.checked)">
                        Completed
                      </label>
                      <button class="btn-link" onclick="window.adminPortal.editPhaseAction('${action.id}')">Edit</button>
                      <button class="btn-link" onclick="window.adminPortal.deletePhaseAction('${action.id}')">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="modal-footer">
                <button class="btn-primary" onclick="window.adminPortal.addPhaseAction('${projectId}')">Add Action</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
      console.error('Error loading phase actions:', error);
      this.showMessage('Failed to load phase actions', 'error');
    }
  }

  // Update phase action status
  async updatePhaseAction(actionId, isCompleted) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/phases/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted })
      });

      if (response.ok) {
        this.showMessage('Action updated successfully', 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating phase action:', error);
      this.showMessage('Failed to update action', 'error');
    }
  }

  // Toggle auto-advance for project
  async toggleAutoAdvance(projectId, enabled) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/automation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_advance_enabled: enabled })
      });

      if (response.ok) {
        this.showMessage(`Auto-advance ${enabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error toggling auto-advance:', error);
      this.showMessage('Failed to update auto-advance setting', 'error');
    }
  }

  // Toggle stuck notifications for project
  async toggleStuckNotifications(projectId, enabled) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/automation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stuck_notifications_enabled: enabled })
      });

      if (response.ok) {
        this.showMessage(`Stuck notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error toggling stuck notifications:', error);
      this.showMessage('Failed to update notification setting', 'error');
    }
  }

  // Edit phase requirements
  async editPhaseRequirements(projectId, phaseIndex) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/${phaseIndex}/requirements`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const modalHtml = `
        <div class="modal-overlay" id="phase-requirements-modal">
          <div class="modal-content modal-large">
            <div class="modal-header">
              <h3>Edit Phase Requirements - ${data.phase_name}</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <form id="requirements-form">
                <div class="form-group">
                  <label for="requirements-description">Phase Description</label>
                  <textarea id="requirements-description" name="description" rows="3">${this.escapeHtml(data.description || '')}</textarea>
                </div>
                <div class="form-group">
                  <label>Client Actions Required</label>
                  <div class="client-actions-list" id="client-actions-list">
                    ${data.client_actions.map((action, index) => `
                      <div class="action-input-row">
                        <input type="text" name="client_actions[]" value="${this.escapeHtml(action)}" placeholder="Client action required">
                        <button type="button" class="btn-link" onclick="this.parentElement.remove()">Remove</button>
                      </div>
                    `).join('')}
                  </div>
                  <button type="button" class="btn-secondary" onclick="window.adminPortal.addClientActionInput()">+ Add Action</button>
                </div>
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" name="requires_client_action" ${data.requires_client_action ? 'checked' : ''}>
                    Requires client action to proceed
                  </label>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn-primary" onclick="window.adminPortal.savePhaseRequirements('${projectId}', ${phaseIndex})">Save Changes</button>
              <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
      console.error('Error loading phase requirements:', error);
      this.showMessage('Failed to load phase requirements', 'error');
    }
  }

  // Save phase requirements
  async savePhaseRequirements(projectId, phaseIndex) {
    const form = document.getElementById('requirements-form');
    const formData = new FormData(form);
    
    const requirements = {
      description: formData.get('description'),
      client_actions: Array.from(form.querySelectorAll('input[name="client_actions[]"]')).map(input => input.value).filter(v => v.trim()),
      requires_client_action: formData.get('requires_client_action') === 'on'
    };

    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/${phaseIndex}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requirements)
      });

      if (response.ok) {
        this.showMessage('Phase requirements updated successfully', 'success');
        document.getElementById('phase-requirements-modal').remove();
        this.refreshPhaseTracker(projectId);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving phase requirements:', error);
      this.showMessage('Failed to save requirements', 'error');
    }
  }

  // Add client action input field
  addClientActionInput() {
    const container = document.getElementById('client-actions-list');
    const inputRow = document.createElement('div');
    inputRow.className = 'action-input-row';
    inputRow.innerHTML = `
      <input type="text" name="client_actions[]" placeholder="Client action required">
      <button type="button" class="btn-link" onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(inputRow);
  }

  // Bulk phase update modal
  showBulkPhaseUpdateModal() {
    const modalHtml = `
      <div class="modal-overlay" id="bulk-phase-modal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>Bulk Phase Update</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="bulk-update-form">
              <div class="form-group">
                <label>Select Projects</label>
                <div class="project-selection" id="bulk-project-list">
                  <!-- Projects will be loaded here -->
                </div>
              </div>
              <div class="form-group">
                <label for="bulk-action">Action</label>
                <select id="bulk-action">
                  <option value="advance">Advance to Next Phase</option>
                  <option value="rewind">Rewind to Previous Phase</option>
                  <option value="jump">Jump to Specific Phase</option>
                  <option value="auto-advance">Toggle Auto-Advance</option>
                </select>
              </div>
              <div class="form-group" id="target-phase-group" style="display: none;">
                <label for="target-phase">Target Phase</label>
                <select id="target-phase">
                  <option value="0">Onboarding</option>
                  <option value="1">Ideation</option>
                  <option value="2">Design</option>
                  <option value="3">Review</option>
                  <option value="4">Production</option>
                  <option value="5">Payment</option>
                  <option value="6">Sign-off</option>
                  <option value="7">Delivery</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" onclick="window.adminPortal.executeBulkPhaseUpdate()">Execute Update</button>
            <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.loadBulkProjectList();
    
    // Show/hide target phase based on action
    document.getElementById('bulk-action').addEventListener('change', (e) => {
      const targetPhaseGroup = document.getElementById('target-phase-group');
      targetPhaseGroup.style.display = e.target.value === 'jump' ? 'block' : 'none';
    });
  }

  // Load project list for bulk operations
  async loadBulkProjectList() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects?limit=100&status=active`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const container = document.getElementById('bulk-project-list');
      container.innerHTML = data.projects.map(project => `
        <label class="checkbox-label project-checkbox">
          <input type="checkbox" value="${project.id}" name="selected_projects">
          <span>${this.escapeHtml(project.name)} (${project.current_phase_name || 'Unknown Phase'})</span>
        </label>
      `).join('');
    } catch (error) {
      console.error('Error loading projects for bulk update:', error);
      this.showMessage('Failed to load projects', 'error');
    }
  }

  // Execute bulk phase update
  async executeBulkPhaseUpdate() {
    const selectedProjects = Array.from(document.querySelectorAll('input[name="selected_projects"]:checked')).map(cb => cb.value);
    const action = document.getElementById('bulk-action').value;
    const targetPhase = document.getElementById('target-phase').value;

    if (selectedProjects.length === 0) {
      this.showMessage('Please select at least one project', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedProjects.length} projects?`)) {
      return;
    }

    try {
      const requestBody = {
        project_ids: selectedProjects,
        action: action
      };

      if (action === 'jump') {
        requestBody.target_phase_index = parseInt(targetPhase);
      }

      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/bulk-phase-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        this.showMessage(`Successfully updated ${data.updated_count} projects`, 'success');
        document.getElementById('bulk-phase-modal').remove();
        this.loadProjects(); // Refresh project list
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error executing bulk update:', error);
      this.showMessage('Failed to execute bulk update', 'error');
    }
  }

  // Load phase analytics
  async loadPhaseAnalytics() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/analytics/phases`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Update analytics cards
      document.getElementById('stuck-projects-count').textContent = data.stuck_projects_count || 0;
      document.getElementById('avg-phase-time').textContent = `${data.avg_phase_time || 0} days`;
      document.getElementById('bottleneck-phase').textContent = data.bottleneck_phase || 'None';
      document.getElementById('completion-rate').textContent = `${data.completion_rate || 0}%`;

      // Update phase distribution chart
      this.renderPhaseDistributionChart(data.phase_distribution);
      
      // Load projects by phase
      this.renderProjectsByPhase(data.projects_by_phase);
    } catch (error) {
      console.error('Error loading phase analytics:', error);
      this.showMessage('Failed to load phase analytics', 'error');
    }
  }

  // Render phase distribution chart
  renderPhaseDistributionChart(distribution) {
    const chartContainer = document.getElementById('phase-distribution-chart');
    if (!chartContainer) return;

    const total = distribution.reduce((sum, phase) => sum + phase.count, 0);
    
    chartContainer.innerHTML = distribution.map(phase => `
      <div class="phase-bar">
        <div class="phase-bar-fill" style="width: ${total > 0 ? (phase.count / total) * 100 : 0}%">
          <span class="phase-bar-label">${phase.phase_name} (${phase.count})</span>
        </div>
      </div>
    `).join('');
  }

  // Render projects grouped by phase
  renderProjectsByPhase(projectsByPhase) {
    const container = document.getElementById('phase-projects-list');
    if (!container) return;

    container.innerHTML = Object.entries(projectsByPhase).map(([phaseName, projects]) => `
      <div class="phase-group">
        <h4 class="phase-group-title">${phaseName} (${projects.length})</h4>
        <div class="phase-group-projects">
          ${projects.map(project => `
            <div class="mini-project-card" onclick="window.adminPortal.viewProject('${project.id}')">
              <h5>${this.escapeHtml(project.name)}</h5>
              <p>${this.escapeHtml(project.client_name || 'No Client')}</p>
              <span class="days-in-phase ${project.days_in_phase > 7 ? 'stuck' : ''}">${project.days_in_phase}d</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Export phase report
  async exportPhaseReport() {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/analytics/phases/export`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phase-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Phase report exported successfully', 'success');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showMessage('Failed to export phase report', 'error');
    }
  }

  // Helper function to refresh project data
  async refreshProjectData(projectId) {
    // Refresh the project in the current list
    if (this.currentSection === 'projects') {
      this.loadProjects();
    }
    
    // Refresh any open modals
    const modal = document.getElementById('project-details-modal');
    if (modal) {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        modal.remove();
        this.showProjectDetailsModal(data.project);
      }
    }
    
    // Refresh phase analytics if on phases section
    if (this.currentSection === 'phases') {
      this.loadPhaseAnalytics();
    }
  }

  // Handle phase action completion callback
  onPhaseActionComplete(projectId, actionId, isCompleted) {
    // This can trigger automatic phase advancement if all actions are complete
    this.checkForAutoAdvancement(projectId);
  }

  // Check if project can auto-advance
  async checkForAutoAdvancement(projectId) {
    try {
      const response = await this.fetchWithAuth(`${this.apiUrl}/projects/${projectId}/phases/check-advancement`);
      const data = await response.json();

      if (response.ok && data.can_advance && data.auto_advance_enabled) {
        if (confirm('All requirements met. Advance to next phase automatically?')) {
          this.advancePhase(projectId);
        }
      }
    } catch (error) {
      console.error('Error checking for auto-advancement:', error);
    }
  }
}

// Global functions for onclick handlers
function showNewClientForm() {
  window.adminPortal.showClientModal();
}

function showNewProjectForm() {
  window.adminPortal.showProjectModal();
}

function showNewInvoiceForm() {
  window.adminPortal.showInvoiceModal();
}

function uploadFiles() {
  window.adminPortal.showFileUploadModal();
}

function composeMessage() {
  window.adminPortal.showComposeMessageModal();
}

// Initialize admin portal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminPortal = new AdminPortal();
});