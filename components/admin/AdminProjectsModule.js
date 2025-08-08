import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Projects Module
 * Handles project management, phase tracking, and project analytics
 */
export class AdminProjectsModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminProjectsModule');
    this.projects = [];
    this.filteredProjects = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.sortBy = 'created';
    this.sortDirection = 'desc';
    this.viewMode = 'grid'; // grid or table
  }

  async doInit() {
    this.element = document.getElementById('projects');
    if (this.element) {
      // Only load projects if we have a token
      if (this.admin && this.admin.token) {
        await this.loadProjects();
      }
      this.setupProjectsInterface();
      this.setupAutoRefresh(60000); // Refresh every minute
    }
  }

  /**
   * Load projects data
   */
  async loadProjects() {
    try {
      const data = await this.getCachedData('projects', async () => {
        const response = await this.apiRequest('/projects');
        return await response.json();
      }, 60000); // Cache for 1 minute

      this.projects = data.projects || [];
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showError('Failed to load projects');
    }
  }

  /**
   * Setup projects interface
   */
  setupProjectsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-projects">
        <div class="projects-header">
          <h1>Project Management</h1>
          <div class="projects-actions">
            <button class="btn-primary" id="btn-create-project">
              New Project
            </button>
            <button class="btn-secondary" id="btn-export-projects">
              Export
            </button>
          </div>
        </div>

        <div class="projects-filters">
          <div class="filter-group">
            <select class="status-filter" id="project-status-filter">
              <option value="all">All Projects</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          
          <div class="filter-group">
            <select class="phase-filter" id="project-phase-filter">
              <option value="all">All Phases</option>
              <option value="1">Phase 1: Onboarding</option>
              <option value="2">Phase 2: Ideation</option>
              <option value="3">Phase 3: Design</option>
              <option value="4">Phase 4: Review</option>
              <option value="5">Phase 5: Production</option>
              <option value="6">Phase 6: Payment</option>
              <option value="7">Phase 7: Sign-off</option>
              <option value="8">Phase 8: Delivery</option>
            </select>
          </div>
          
          <div class="search-group">
            <input type="text" 
                   class="search-input" 
                   id="project-search-input"
                   placeholder="Search projects...">
          </div>

          <div class="view-toggle">
            <button class="${this.viewMode === 'grid' ? 'active' : ''}" 
                    id="btn-view-grid">
              Grid
            </button>
            <button class="${this.viewMode === 'table' ? 'active' : ''}" 
                    id="btn-view-table">
              Table
            </button>
          </div>
        </div>

        <div class="projects-stats">
          ${this.renderProjectsStats()}
        </div>

        <div class="projects-content">
          ${this.viewMode === 'grid' ? this.renderProjectsGrid() : this.renderProjectsTable()}
        </div>
      </div>

      <!-- Project Modal -->
      <div id="project-modal" class="modal">
        <div class="modal-overlay" id="project-modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="project-modal-title">Create Project</h2>
            <button class="modal-close" id="project-modal-close">×</button>
          </div>
          <div class="modal-body">
            <form id="project-form">
              ${this.renderProjectForm()}
            </form>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Render projects statistics
   */
  renderProjectsStats() {
    const stats = {
      total: this.projects.length,
      active: this.projects.filter(p => p.status === 'active').length,
      completed: this.projects.filter(p => p.status === 'completed').length,
      revenue: this.projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    };

    const phaseStats = {};
    for (let i = 1; i <= 8; i++) {
      phaseStats[i] = this.projects.filter(p => p.current_phase === i).length;
    }

    return `
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Projects</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.active}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.completed}</span>
          <span class="stat-label">Completed</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.formatCurrency(stats.revenue)}</span>
          <span class="stat-label">Total Revenue</span>
        </div>
      </div>
      <div class="phase-stats">
        ${Object.entries(phaseStats).map(([phase, count]) => `
          <div class="phase-stat" title="Phase ${phase}">
            <span class="phase-number">${phase}</span>
            <span class="phase-count">${count}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render projects grid view
   */
  renderProjectsGrid() {
    if (this.filteredProjects.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="projects-grid">
        ${this.filteredProjects.map(project => this.renderProjectCard(project)).join('')}
      </div>
    `;
  }

  /**
   * Render individual project card
   */
  renderProjectCard(project) {
    const statusClass = this.getStatusClass(project.status);
    const phaseProgress = (project.current_phase / 8) * 100;
    
    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-header">
          <h3>${project.name}</h3>
          <span class="status-badge ${statusClass}">${this.formatStatus(project.status)}</span>
        </div>
        
        <div class="project-client">
          <span class="client-name">${project.client_name || 'No Client'}</span>
        </div>
        
        <div class="project-details">
          <div class="detail-item">
            <span class="detail-label">Service:</span>
            <span class="detail-value">${project.service_type || 'General'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Budget:</span>
            <span class="detail-value">${this.formatCurrency(project.budget)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Timeline:</span>
            <span class="detail-value">${project.timeline || 'Not Set'}</span>
          </div>
        </div>
        
        <div class="project-phase">
          <div class="phase-info">
            <span>Phase ${project.current_phase} of 8</span>
            <span>${Math.round(phaseProgress)}%</span>
          </div>
          <div class="phase-progress">
            <div class="phase-bar" style="width: ${phaseProgress}%"></div>
          </div>
        </div>
        
        <div class="project-dates">
          <span>Created: ${this.formatDate(project.created_at, { month: 'short', day: 'numeric' })}</span>
          ${project.deadline ? `<span>Due: ${this.formatDate(project.deadline, { month: 'short', day: 'numeric' })}</span>` : ''}
        </div>
        
        <div class="project-actions">
          <button class="action-btn" onclick="admin.modules.projects.viewProject('${project.id}')" title="View Details">
            View
          </button>
          <button class="action-btn" onclick="admin.modules.projects.editProject('${project.id}')" title="Edit">
            Edit
          </button>
          <button class="action-btn" onclick="admin.modules.projects.updatePhase('${project.id}')" title="Update Phase">
            Phase
          </button>
          <button class="action-btn danger" onclick="admin.modules.projects.deleteProject('${project.id}')" title="Delete">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render projects table view
   */
  renderProjectsTable() {
    if (this.filteredProjects.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="projects-table-container">
        <table class="projects-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Client</th>
              <th>Status</th>
              <th>Phase</th>
              <th>Budget</th>
              <th>Timeline</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredProjects.map(project => this.renderProjectRow(project)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render individual project row
   */
  renderProjectRow(project) {
    const statusClass = this.getStatusClass(project.status);
    
    return `
      <tr class="project-row" data-project-id="${project.id}">
        <td class="project-name">
          <strong>${project.name}</strong>
        </td>
        <td class="project-client">${project.client_name || 'No Client'}</td>
        <td class="project-status">
          <span class="status-badge ${statusClass}">${this.formatStatus(project.status)}</span>
        </td>
        <td class="project-phase">
          <div class="phase-indicator">
            <span class="phase-number">${project.current_phase}</span>
            <span class="phase-total">/ 8</span>
          </div>
        </td>
        <td class="project-budget">${this.formatCurrency(project.budget)}</td>
        <td class="project-timeline">${project.timeline || 'Not Set'}</td>
        <td class="project-created">${this.formatDate(project.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="project-actions">
          <div class="action-buttons">
            <button class="action-btn" onclick="admin.modules.projects.viewProject('${project.id}')" title="View">
              View
            </button>
            <button class="action-btn" onclick="admin.modules.projects.editProject('${project.id}')" title="Edit">
              Edit
            </button>
            <button class="action-btn" onclick="admin.modules.projects.updatePhase('${project.id}')" title="Phase">
              Phase
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
        <h3>${isFiltered ? 'No projects found' : 'No projects yet'}</h3>
        <p>${isFiltered ? 'Try adjusting your filters or search term.' : 'Create your first project to get started.'}</p>
        ${!isFiltered ? `
          <button class="btn-primary" onclick="admin.modules.projects.showCreateModal()">
            Create First Project
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render project form
   */
  renderProjectForm() {
    return `
      <div class="form-grid">
        <div class="form-group full-width">
          <label for="project-name">Project Name *</label>
          <input type="text" id="project-name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="project-client">Client *</label>
          <select id="project-client" name="client_id" required>
            <option value="">Select client...</option>
            ${this.renderClientOptions()}
          </select>
        </div>
        
        <div class="form-group">
          <label for="project-service">Service Type</label>
          <select id="project-service" name="service_type">
            <option value="">Select service...</option>
            <option value="branding">Branding</option>
            <option value="web_design">Web Design</option>
            <option value="print_design">Print Design</option>
            <option value="marketing">Marketing</option>
            <option value="consulting">Consulting</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="project-budget">Budget</label>
          <input type="number" id="project-budget" name="budget" min="0" step="100">
        </div>
        
        <div class="form-group">
          <label for="project-timeline">Timeline</label>
          <input type="text" id="project-timeline" name="timeline" placeholder="e.g., 4 weeks">
        </div>
        
        <div class="form-group">
          <label for="project-deadline">Deadline</label>
          <input type="date" id="project-deadline" name="deadline">
        </div>
        
        <div class="form-group">
          <label for="project-status">Status</label>
          <select id="project-status" name="status">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
        
        <div class="form-group full-width">
          <label for="project-description">Description</label>
          <textarea id="project-description" name="description" rows="4"></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn-secondary" onclick="admin.modules.projects.closeModal()">
          Cancel
        </button>
        <button type="submit" class="btn-primary">
          <span class="button-text">Save Project</span>
          <span class="loading-spinner" style="display: none;">Saving...</span>
        </button>
      </div>
    `;
  }

  /**
   * Render client options for select
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
    // Form handler
    const form = document.getElementById('project-form');
    if (form) {
      this.addEventListener(form, 'submit', this.handleFormSubmit.bind(this));
    }
    
    // Button handlers
    const createBtn = document.getElementById('btn-create-project');
    if (createBtn) {
      this.addEventListener(createBtn, 'click', () => this.showCreateModal());
    }
    
    const exportBtn = document.getElementById('btn-export-projects');
    if (exportBtn) {
      this.addEventListener(exportBtn, 'click', () => this.exportProjects());
    }
    
    // Filter handlers
    const statusFilter = document.getElementById('project-status-filter');
    if (statusFilter) {
      this.addEventListener(statusFilter, 'change', (e) => this.filterByStatus(e.target.value));
    }
    
    const phaseFilter = document.getElementById('project-phase-filter');
    if (phaseFilter) {
      this.addEventListener(phaseFilter, 'change', (e) => this.filterByPhase(e.target.value));
    }
    
    const searchInput = document.getElementById('project-search-input');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
    }
    
    // Modal handlers
    const modalOverlay = document.getElementById('project-modal-overlay');
    if (modalOverlay) {
      this.addEventListener(modalOverlay, 'click', () => this.closeModal());
    }
    
    const modalClose = document.getElementById('project-modal-close');
    if (modalClose) {
      this.addEventListener(modalClose, 'click', () => this.closeModal());
    }
    
    // View mode handlers
    const gridBtn = document.getElementById('btn-view-grid');
    if (gridBtn) {
      this.addEventListener(gridBtn, 'click', () => this.setViewMode('grid'));
    }
    
    const tableBtn = document.getElementById('btn-view-table');
    if (tableBtn) {
      this.addEventListener(tableBtn, 'click', () => this.setViewMode('table'));
    }
  }

  /**
   * Show create project modal
   */
  showCreateModal() {
    this.currentProjectId = null;
    document.getElementById('project-modal-title').textContent = 'Create Project';
    document.getElementById('project-form').reset();
    document.getElementById('project-modal').classList.add('active');
  }

  /**
   * Edit project
   */
  editProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    this.currentProjectId = projectId;
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    
    // Populate form
    Object.keys(project).forEach(key => {
      const input = document.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = project[key] || '';
      }
    });
    
    document.getElementById('project-modal').classList.add('active');
  }

  /**
   * Close modal
   */
  closeModal() {
    document.getElementById('project-modal').classList.remove('active');
    this.currentProjectId = null;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const projectData = Object.fromEntries(formData.entries());
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Show loading
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline';

    try {
      const isEdit = this.currentProjectId !== null;
      const url = isEdit ? `/projects/${this.currentProjectId}` : '/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await this.apiRequest(url, {
        method,
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (isEdit) {
          // Update existing project
          const index = this.projects.findIndex(p => p.id === this.currentProjectId);
          if (index !== -1) {
            this.projects[index] = result.project;
          }
          this.showSuccess('Project updated successfully');
        } else {
          // Add new project
          this.projects.unshift(result.project);
          this.showSuccess('Project created successfully');
        }
        
        this.applyFilters();
        this.setupProjectsInterface();
        this.closeModal();
        this.clearCache();
        
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to save project');
      }
      
    } catch (error) {
      console.error('Failed to save project:', error);
      this.showError('Failed to save project');
    } finally {
      // Reset button
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
    }
  }

  /**
   * View project details
   */
  viewProject(projectId) {
    // Navigate to project detail view
    console.log(`Viewing project: ${projectId}`);
    // Implementation would show detailed project view with all phases, files, etc.
  }

  /**
   * Update project phase
   */
  async updatePhase(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const newPhase = prompt(`Update phase for "${project.name}" (current: ${project.current_phase}/8):`, project.current_phase);
    if (!newPhase || isNaN(newPhase) || newPhase < 1 || newPhase > 8) return;

    try {
      const response = await this.apiRequest(`/projects/${projectId}/phase`, {
        method: 'PUT',
        body: JSON.stringify({ phase: parseInt(newPhase) })
      });

      if (response.ok) {
        project.current_phase = parseInt(newPhase);
        this.applyFilters();
        this.setupProjectsInterface();
        this.showSuccess('Phase updated successfully');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to update phase');
      }
      
    } catch (error) {
      console.error('Failed to update phase:', error);
      this.showError('Failed to update phase');
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const confirmed = confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await this.apiRequest(`/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.applyFilters();
        this.setupProjectsInterface();
        this.showSuccess('Project deleted successfully');
        this.clearCache();
      } else {
        const error = await response.json();
        this.showError(error.message || 'Failed to delete project');
      }
      
    } catch (error) {
      console.error('Failed to delete project:', error);
      this.showError('Failed to delete project');
    }
  }

  /**
   * Filter projects by status
   */
  filterByStatus(status) {
    this.currentFilter = status;
    this.applyFilters();
    this.setupProjectsInterface();
  }

  /**
   * Filter projects by phase
   */
  filterByPhase(phase) {
    this.phaseFilter = phase;
    this.applyFilters();
    this.setupProjectsInterface();
  }

  /**
   * Handle search
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
    this.setupProjectsInterface();
  }

  /**
   * Set view mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.setupProjectsInterface();
  }

  /**
   * Apply filters and sorting
   */
  applyFilters() {
    let filtered = [...this.projects];

    // Apply status filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(project => project.status === this.currentFilter);
    }

    // Apply phase filter
    if (this.phaseFilter && this.phaseFilter !== 'all') {
      filtered = filtered.filter(project => project.current_phase === parseInt(this.phaseFilter));
    }

    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(this.searchTerm) ||
        (project.client_name && project.client_name.toLowerCase().includes(this.searchTerm)) ||
        (project.description && project.description.toLowerCase().includes(this.searchTerm))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'budget':
          aVal = a.budget || 0;
          bVal = b.budget || 0;
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

    this.filteredProjects = filtered;
  }

  /**
   * Export projects data
   */
  exportProjects() {
    const csvData = this.generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.showSuccess('Projects exported successfully');
  }

  /**
   * Generate CSV data
   */
  generateCSV() {
    const headers = ['Project Name', 'Client', 'Status', 'Phase', 'Budget', 'Timeline', 'Created Date'];
    const rows = this.projects.map(project => [
      project.name,
      project.client_name || '',
      project.status,
      `Phase ${project.current_phase}`,
      project.budget || 0,
      project.timeline || '',
      this.formatDate(project.created_at, { year: 'numeric', month: '2-digit', day: '2-digit' })
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
      planning: 'status-planning',
      active: 'status-active',
      review: 'status-review',
      completed: 'status-completed',
      on_hold: 'status-hold'
    };
    return classes[status] || 'status-default';
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const labels = {
      planning: 'Planning',
      active: 'Active',
      review: 'In Review',
      completed: 'Completed',
      on_hold: 'On Hold'
    };
    return labels[status] || status;
  }

  /**
   * Refresh projects data
   */
  async refresh() {
    this.clearCache();
    await this.loadProjects();
    this.setupProjectsInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('project_created', (project) => {
      this.projects.unshift(project);
      this.applyFilters();
      this.setupProjectsInterface();
      this.showSuccess(`New project: ${project.name}`);
    });

    socket.on('project_updated', (project) => {
      const index = this.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        this.projects[index] = project;
        this.applyFilters();
        this.setupProjectsInterface();
      }
    });

    socket.on('project_deleted', (projectId) => {
      this.projects = this.projects.filter(p => p.id !== projectId);
      this.applyFilters();
      this.setupProjectsInterface();
    });

    socket.on('phase_updated', (data) => {
      const project = this.projects.find(p => p.id === data.projectId);
      if (project) {
        project.current_phase = data.phase;
        this.applyFilters();
        this.setupProjectsInterface();
      }
    });
  }
}