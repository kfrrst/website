import { BaseModule } from './BaseModule.js';
import { ProgressTracker } from '../ProgressTracker.js';
import { PhaseCard } from '../PhaseCard.js';
import { PhaseDeliverables } from '../PhaseDeliverables.js';

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

  async showProjectDetails(project) {
    this.selectedProject = project;
    
    // Fetch detailed project data including phases
    try {
      const response = await fetch(`/api/projects/${project.id}/details`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch project details');
      const data = await response.json();
      
      // Merge detailed data
      this.selectedProject = { ...project, ...data };
      
      // Navigate to detailed project view
      this.renderDetailedProjectView();
    } catch (error) {
      console.error('Error fetching project details:', error);
      this.portal.showNotification('Unable to load project details', 'error');
    }
  }

  renderDetailedProjectView() {
    const project = this.selectedProject;
    if (!project) return;
    
    const currentPhaseIndex = project.current_phase_index || 0;
    
    // Clear current content and show detailed view
    this.element.innerHTML = `
      <div class="project-detail-view">
        <div class="project-detail-header">
          <button class="btn-back" id="back-to-projects">
            ← Back to Projects
          </button>
          <div class="project-detail-title">
            <h1>${project.name}</h1>
            <span class="project-status ${this.getStatusClass(project.status)}">${project.status}</span>
          </div>
        </div>
        
        <div class="project-overview-section">
          <div class="project-info-card">
            <h3>Project Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Current Phase</label>
                <span>${this.phaseNames[currentPhaseIndex] || 'Unknown'}</span>
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
              <div class="info-item">
                <label>Progress</label>
                <span>${Math.round((currentPhaseIndex / this.phaseNames.length) * 100)}%</span>
              </div>
            </div>
          </div>
          
          ${project.description ? `
            <div class="project-description-card">
              <h3>Description</h3>
              <p>${project.description}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Progress Tracker -->
        <div id="project-progress-tracker" class="progress-tracker-container"></div>
        
        <!-- Phase Content with Tabs -->
        <div class="phase-tabs-container">
          <div class="phase-tabs" id="phase-tabs">
            ${this.renderPhaseTabs(currentPhaseIndex)}
          </div>
          <div class="phase-tab-content" id="phase-tab-content">
            <!-- Phase content will be rendered here -->
          </div>
        </div>
      </div>
    `;
    
    // Initialize components
    this.initializeDetailedView(project, currentPhaseIndex);
  }

  renderPhaseTabs(currentPhaseIndex) {
    return this.phaseNames.map((phase, index) => {
      const isActive = index === currentPhaseIndex;
      const isCompleted = index < currentPhaseIndex;
      const isLocked = index > currentPhaseIndex;
      
      let statusClass = 'upcoming';
      if (isCompleted) statusClass = 'completed';
      else if (isActive) statusClass = 'active';
      else if (isLocked) statusClass = 'locked';
      
      return `
        <button class="phase-tab ${statusClass}" 
                data-phase-index="${index}" 
                ${isLocked ? 'disabled' : ''}>
          <span class="phase-tab-number">${index + 1}</span>
          <span class="phase-tab-name">${phase}</span>
          ${isCompleted ? '<span class="phase-tab-check">✓</span>' : ''}
        </button>
      `;
    }).join('');
  }

  async initializeDetailedView(project, currentPhaseIndex) {
    // Initialize progress tracker
    const trackerContainer = document.getElementById('project-progress-tracker');
    if (trackerContainer) {
      const progressTracker = new ProgressTracker({
        container: trackerContainer,
        phases: this.phaseNames,
        currentPhase: currentPhaseIndex,
        viewMode: 'horizontal',
        onPhaseClick: (index) => this.handlePhaseTabClick(index)
      });
      progressTracker.render();
    }
    
    // Add event listeners
    const backBtn = document.getElementById('back-to-projects');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.setupProjectsInterface());
    }
    
    // Add tab click handlers
    const tabs = document.querySelectorAll('.phase-tab:not(.locked)');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.phaseIndex);
        this.handlePhaseTabClick(index);
      });
    });
    
    // Show current phase content
    await this.loadPhaseContent(currentPhaseIndex);
  }
  
  async handlePhaseTabClick(phaseIndex) {
    // Update active tab
    const tabs = document.querySelectorAll('.phase-tab');
    tabs.forEach((tab, index) => {
      tab.classList.toggle('active', index === phaseIndex);
    });
    
    // Load phase content
    await this.loadPhaseContent(phaseIndex);
  }
  
  async loadPhaseContent(phaseIndex) {
    const project = this.selectedProject;
    const contentContainer = document.getElementById('phase-tab-content');
    if (!contentContainer || !project) return;
    
    // Show loading state
    contentContainer.innerHTML = '<div class="loading">Loading phase details...</div>';
    
    try {
      // Fetch phase details from API
      const response = await fetch(`/api/projects/${project.id}/phases/${phaseIndex + 1}`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch phase details');
      const phaseData = await response.json();
      
      // Clear loading state
      contentContainer.innerHTML = '';
      
      // Render phase card
      const phaseCardContainer = document.createElement('div');
      phaseCardContainer.className = 'phase-card-wrapper';
      contentContainer.appendChild(phaseCardContainer);
      
      const phaseCard = new PhaseCard({
        container: phaseCardContainer,
        phase: {
          id: phaseData.id || `${project.id}-phase-${phaseIndex + 1}`,
          name: this.phaseNames[phaseIndex],
          description: phaseData.description || this.getPhaseDescription(this.phaseNames[phaseIndex]),
          order: phaseIndex + 1,
          status: phaseData.status || this.getPhaseStatus(phaseIndex, project.current_phase_index),
          requires_approval: phaseData.requires_approval !== false,
          approved_by: phaseData.approved_by,
          approved_at: phaseData.approved_at,
          expected_completion: phaseData.expected_completion
        },
        deliverables: phaseData.deliverables || [],
        clientActions: phaseData.client_actions || [],
        isActive: phaseIndex === project.current_phase_index,
        commentCount: phaseData.comment_count || 0,
        isAdmin: false,
        authToken: this.portal.authToken,
        progressPercentage: phaseData.progress_percentage || 0,
        completedActions: phaseData.completed_actions || 0,
        totalActions: phaseData.total_actions || 0,
        deadline: phaseData.deadline,
        activityCount: phaseData.activity_count || 0,
        isLocked: phaseIndex > project.current_phase_index,
        previousPhaseComplete: phaseIndex === 0 || project.current_phase_index >= phaseIndex,
        onApprove: async (phaseId) => this.handlePhaseApproval(phaseId),
        onRequestChanges: async (phaseId, feedback) => this.handlePhaseChangesRequest(phaseId, feedback),
        onFileDownload: async (fileId) => this.handleFileDownload(fileId)
      });
      
      phaseCard.render();
      
      // Render deliverables section if there are files
      if (phaseData.deliverables && phaseData.deliverables.length > 0) {
        const deliverablesContainer = document.createElement('div');
        deliverablesContainer.className = 'phase-deliverables-wrapper';
        contentContainer.appendChild(deliverablesContainer);
        
        const phaseDeliverables = new PhaseDeliverables({
          container: deliverablesContainer,
          deliverables: phaseData.deliverables,
          phaseId: phaseData.id,
          phaseName: this.phaseNames[phaseIndex],
          authToken: this.portal.authToken,
          isAdmin: false,
          allowUploads: false,
          viewMode: 'grid',
          onFileDownload: async (fileId) => this.handleFileDownload(fileId),
          onFilePreview: async (fileId, file) => this.handleFilePreview(fileId, file)
        });
        
        phaseDeliverables.render();
      }
      
    } catch (error) {
      console.error('Error loading phase content:', error);
      contentContainer.innerHTML = `
        <div class="error-state">
          <span class="error-icon">⚠</span>
          <p>Unable to load phase details. Please try again.</p>
        </div>
      `;
    }
  }
  
  getPhaseStatus(phaseIndex, currentPhaseIndex) {
    if (phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'in_progress';
    return 'not_started';
  }
  
  async handlePhaseApproval(phaseId) {
    try {
      const response = await fetch(`/api/phases/${phaseId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          notes: 'Phase approved by client'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to approve phase');
      }
      
      // Refresh project data
      await this.showProjectDetails(this.selectedProject);
      this.portal.showNotification('Phase approved successfully!', 'success');
      
    } catch (error) {
      console.error('Phase approval error:', error);
      this.portal.showNotification('Unable to approve phase. Please try again.', 'error');
    }
  }
  
  async handlePhaseChangesRequest(phaseId, feedback) {
    try {
      const response = await fetch(`/api/phases/${phaseId}/request-changes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes_requested: feedback })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit change request');
      }
      
      // Refresh project data
      await this.showProjectDetails(this.selectedProject);
      this.portal.showNotification('Change request submitted successfully!', 'success');
      
    } catch (error) {
      console.error('Change request error:', error);
      throw error;
    }
  }
  
  async handleFileDownload(fileId) {
    window.location.href = `/api/files/${fileId}/download?token=${this.portal.authToken}`;
  }
  
  async handleFilePreview(fileId, file) {
    // File preview implementation
    console.log('Preview file:', fileId, file);
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