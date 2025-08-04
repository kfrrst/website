import { BaseModule } from './BaseModule.js';

/**
 * Projects module for client portal
 * Handles project display, phase tracking, and project interactions
 */
export class ProjectsModule extends BaseModule {
  constructor(portal) {
    super(portal, 'ProjectsModule');
    this.projects = [];
    this.selectedProject = null;
    this.phaseNames = [
      'Onboarding', 'Ideation', 'Design', 'Review', 
      'Production', 'Payment', 'Sign-off', 'Delivery'
    ];
  }

  async doInit() {
    this.element = document.getElementById('projects');
    if (this.element) {
      await this.loadProjects();
      this.setupProjectsInterface();
    }
  }

  async loadProjects() {
    try {
      const data = await this.getCachedData('projects', async () => {
        const response = await this.apiRequest('/api/projects');
        const result = await response.json();
        return result.projects || [];
      }, 120000); // 2 minutes cache

      this.projects = data;
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projects = [];
    }
  }

  setupProjectsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="projects-container">
        <div class="projects-header">
          <h1>My Projects</h1>
          <div class="projects-filters">
            <select class="status-filter" onchange="portal.modules.projects.filterByStatus(this.value)">
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        <div class="projects-content">
          ${this.projects.length > 0 ? this.renderProjectsGrid() : this.renderEmptyState()}
        </div>
      </div>
    `;
  }

  renderProjectsGrid() {
    return `
      <div class="projects-grid">
        ${this.projects.map(project => this.renderProjectCard(project)).join('')}
      </div>
    `;
  }

  renderProjectCard(project) {
    const phaseIndex = project.current_phase_index || 0;
    const currentPhase = this.phaseNames[phaseIndex] || 'Unknown';
    const progress = Math.round((phaseIndex / (this.phaseNames.length - 1)) * 100);
    const statusClass = this.getStatusClass(project.status);

    return `
      <div class="project-card" onclick="portal.modules.projects.selectProject('${project.id}')">
        <div class="project-header">
          <h3 class="project-title">${project.name}</h3>
          <span class="project-status ${statusClass}">${project.status}</span>
        </div>
        
        <div class="project-description">
          <p>${project.description || 'No description available'}</p>
        </div>

        <div class="project-progress">
          <div class="progress-header">
            <span class="current-phase">Current: ${currentPhase}</span>
            <span class="progress-percentage">${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="phase-tracker">
            ${this.renderMiniPhaseTracker(phaseIndex)}
          </div>
        </div>

        <div class="project-meta">
          <div class="project-dates">
            <span class="created-date">Created: ${this.formatDate(project.created_at, { month: 'short', day: 'numeric' })}</span>
            ${project.due_date ? `<span class="due-date">Due: ${this.formatDate(project.due_date, { month: 'short', day: 'numeric' })}</span>` : ''}
          </div>
          <div class="project-priority">
            <span class="priority priority-${project.priority}">${project.priority || 'normal'}</span>
          </div>
        </div>

        <div class="project-actions">
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); portal.modules.projects.viewProjectFiles('${project.id}')">
            📁 Files
          </button>
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); portal.modules.projects.openProjectChat('${project.id}')">
            💬 Chat
          </button>
        </div>
      </div>
    `;
  }

  renderMiniPhaseTracker(currentPhaseIndex) {
    return this.phaseNames.map((phase, index) => {
      let statusClass = 'upcoming';
      if (index < currentPhaseIndex) statusClass = 'completed';
      else if (index === currentPhaseIndex) statusClass = 'current';

      return `
        <div class="mini-phase ${statusClass}" title="${phase}">
          ${index < currentPhaseIndex ? '✓' : index === currentPhaseIndex ? '●' : '○'}
        </div>
      `;
    }).join('');
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Projects Yet</h3>
        <p>Your projects will appear here once they're created by the [RE]Print Studios team.</p>
        <button class="btn-primary" onclick="portal.modules.messaging.openComposer()">
          Contact Us About a Project
        </button>
      </div>
    `;
  }

  getStatusClass(status) {
    const statusMap = {
      'active': 'status-active',
      'completed': 'status-completed',
      'on_hold': 'status-on-hold',
      'cancelled': 'status-cancelled',
      'planning': 'status-planning'
    };
    return statusMap[status] || 'status-default';
  }

  selectProject(projectId) {
    this.selectedProject = this.projects.find(p => p.id === projectId);
    if (this.selectedProject) {
      this.showProjectDetails(this.selectedProject);
    }
  }

  showProjectDetails(project) {
    // Create modal or navigate to detailed view
    const modal = document.createElement('div');
    modal.className = 'modal project-details-modal active';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${project.name}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${this.renderProjectDetailsContent(project)}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  renderProjectDetailsContent(project) {
    const phaseIndex = project.current_phase_index || 0;
    const currentPhase = this.phaseNames[phaseIndex] || 'Unknown';

    return `
      <div class="project-details">
        <div class="project-overview">
          <div class="project-info">
            <h3>Project Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Status</label>
                <span class="project-status ${this.getStatusClass(project.status)}">${project.status}</span>
              </div>
              <div class="info-item">
                <label>Current Phase</label>
                <span>${currentPhase}</span>
              </div>
              <div class="info-item">
                <label>Priority</label>
                <span class="priority priority-${project.priority}">${project.priority || 'normal'}</span>
              </div>
              <div class="info-item">
                <label>Created</label>
                <span>${this.formatDate(project.created_at)}</span>
              </div>
              ${project.due_date ? `
                <div class="info-item">
                  <label>Due Date</label>
                  <span>${this.formatDate(project.due_date)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="project-description-full">
            <h3>Description</h3>
            <p>${project.description || 'No description available'}</p>
          </div>
        </div>

        <div class="project-phases">
          <h3>Project Progress</h3>
          <div class="phase-timeline">
            ${this.renderPhaseTimeline(project)}
          </div>
        </div>

        <div class="project-actions-full">
          <button class="btn-primary" onclick="portal.modules.projects.viewProjectFiles('${project.id}')">
            📁 View Project Files
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.openProjectChat('${project.id}')">
            💬 Project Discussion
          </button>
          ${project.invoice_id ? `
            <button class="btn-secondary" onclick="portal.showSection('invoices'); portal.modules.invoices.highlightInvoice('${project.invoice_id}')">
              💳 View Invoice
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderPhaseTimeline(project) {
    const currentPhaseIndex = project.current_phase_index || 0;
    
    return this.phaseNames.map((phase, index) => {
      let statusClass = 'upcoming';
      let statusIcon = '○';
      let statusText = 'Not Started';

      if (index < currentPhaseIndex) {
        statusClass = 'completed';
        statusIcon = '✓';
        statusText = 'Completed';
      } else if (index === currentPhaseIndex) {
        statusClass = 'current';
        statusIcon = '●';
        statusText = 'In Progress';
      }

      return `
        <div class="phase-item ${statusClass}">
          <div class="phase-indicator">
            <span class="phase-icon">${statusIcon}</span>
            ${index < this.phaseNames.length - 1 ? '<div class="phase-connector"></div>' : ''}
          </div>
          <div class="phase-content">
            <h4 class="phase-name">${phase}</h4>
            <p class="phase-status">${statusText}</p>
            ${this.getPhaseDescription(phase)}
          </div>
        </div>
      `;
    }).join('');
  }

  getPhaseDescription(phaseName) {
    const descriptions = {
      'Onboarding': 'Initial project setup and requirements gathering',
      'Ideation': 'Concept development and creative brainstorming',
      'Design': 'Creating initial designs and mockups',
      'Review': 'Client review and feedback incorporation',
      'Production': 'Final production and development',
      'Payment': 'Invoice processing and payment',
      'Sign-off': 'Final approval and documentation',
      'Delivery': 'Project completion and handover'
    };
    
    return `<p class="phase-description">${descriptions[phaseName] || ''}</p>`;
  }

  filterByStatus(status) {
    // Implementation for filtering projects by status
    console.log(`Filtering projects by status: ${status}`);
    
    if (status === 'all') {
      this.setupProjectsInterface();
      return;
    }

    const filteredProjects = this.projects.filter(project => project.status === status);
    
    // Update the grid with filtered projects
    const projectsContent = this.element.querySelector('.projects-content');
    if (projectsContent) {
      projectsContent.innerHTML = filteredProjects.length > 0 
        ? `<div class="projects-grid">${filteredProjects.map(project => this.renderProjectCard(project)).join('')}</div>`
        : `<div class="empty-state">
             <div class="empty-icon">🔍</div>
             <h3>No ${status} projects found</h3>
             <p>Try selecting a different status filter.</p>
           </div>`;
    }
  }

  viewProjectFiles(projectId) {
    // Navigate to files section and filter by project
    this.portal.showSection('files');
    // Could implement project-specific file filtering here
    console.log(`Viewing files for project: ${projectId}`);
  }

  openProjectChat(projectId) {
    // Navigate to messages and open project conversation
    this.portal.showSection('messages');
    // Could implement project-specific chat opening here
    console.log(`Opening chat for project: ${projectId}`);
  }

  // Socket event handlers for real-time project updates
  setupSocketEvents(socket) {
    socket.on('project_updated', (project) => {
      this.handleProjectUpdate(project);
    });

    socket.on('phase_changed', (data) => {
      this.handlePhaseChange(data);
    });
  }

  handleProjectUpdate(updatedProject) {
    // Update project in local array
    const index = this.projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
      this.projects[index] = updatedProject;
      
      // Clear cache and refresh interface
      this.clearCache();
      this.setupProjectsInterface();
      
      // Show notification
      this.showSuccess(`Project "${updatedProject.name}" has been updated`);
    }
  }

  handlePhaseChange(data) {
    const { projectId, newPhase, newPhaseIndex } = data;
    const project = this.projects.find(p => p.id === projectId);
    
    if (project) {
      project.current_phase_index = newPhaseIndex;
      
      // Clear cache and refresh interface  
      this.clearCache();
      this.setupProjectsInterface();
      
      // Show notification
      this.showSuccess(`Project "${project.name}" moved to ${newPhase} phase`);
      
      // Highlight the updated project
      setTimeout(() => {
        const projectCard = document.querySelector(`[onclick*="${projectId}"]`);
        if (projectCard) {
          projectCard.classList.add('updated');
          setTimeout(() => projectCard.classList.remove('updated'), 3000);
        }
      }, 100);
    }
  }

  // Refresh projects data
  async refreshProjects() {
    this.clearCache();
    await this.loadProjects();
    this.setupProjectsInterface();
  }
}