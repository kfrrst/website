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
    console.log('ProjectsModule.doInit called');
    // Find the projects list container within the projects section
    const projectsSection = document.getElementById('projects');
    console.log('Projects section found:', !!projectsSection);
    
    if (projectsSection) {
      // Log what's inside the projects section
      console.log('Projects section innerHTML:', projectsSection.innerHTML.substring(0, 200));
      
      this.element = projectsSection.querySelector('.projects-list');
      console.log('Projects list element found:', !!this.element);
      console.log('Projects list element:', this.element);
      
      if (this.element) {
        console.log('Loading projects data...');
        await this.loadProjects();
        console.log('Projects loaded:', this.projects.length);
        console.log('Projects data:', this.projects);
        this.setupProjectsInterface();
        console.log('Projects interface setup complete');
      } else {
        console.error('Could not find .projects-list element');
        console.error('Available elements in projects section:', projectsSection.querySelectorAll('*'));
      }
    } else {
      console.error('Could not find #projects section');
      console.error('Available sections:', document.querySelectorAll('section'));
    }
  }

  async activate() {
    console.log('ProjectsModule.activate called');
    
    // If element doesn't exist, try to find it again
    if (!this.element) {
      const projectsSection = document.getElementById('projects');
      if (projectsSection) {
        this.element = projectsSection.querySelector('.projects-list');
        console.log('ProjectsModule.activate: Found element on retry:', !!this.element);
      }
    }
    
    // Refresh projects when section becomes active
    if (this.element) {
      console.log('ProjectsModule.activate: Refreshing projects...');
      await this.refreshProjects();
    } else {
      console.error('ProjectsModule.activate: No element found, cannot refresh');
      // Try to initialize if not already done
      await this.doInit();
    }
  }

  async loadProjects() {
    try {
      console.log('ProjectsModule.loadProjects: starting');
      const response = await this.apiRequest('/api/projects');
      console.log('ProjectsModule.loadProjects: got response', response.status);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('ProjectsModule.loadProjects: API error', error);
        throw new Error(`API returned ${response.status}: ${error}`);
      }
      
      const result = await response.json();
      console.log('ProjectsModule.loadProjects: parsed JSON', result);
      const data = result.projects || [];
      console.log('ProjectsModule.loadProjects: got', data.length, 'projects');
      console.log('ProjectsModule.loadProjects: first project:', data[0]);

      this.projects = data;
    } catch (error) {
      console.error('Failed to load projects - Full error:', error);
      console.error('Error stack:', error.stack);
      this.projects = [];
      // Show error in UI
      if (this.element) {
        this.element.innerHTML = `
          <div class="error-message">
            <p>Failed to load projects. Please refresh the page or contact support.</p>
            <small>Error: ${error.message}</small>
          </div>
        `;
      }
    }
  }

  setupProjectsInterface() {
    console.log('ProjectsModule.setupProjectsInterface called, element:', this.element);
    console.log('ProjectsModule.setupProjectsInterface projects count:', this.projects.length);
    
    if (!this.element) {
      console.error('ProjectsModule.setupProjectsInterface: No element found!');
      return;
    }

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
    // Use current_phase_index from database, fallback to calculated_phase_index, then calculate from progress
    const phaseIndex = project.current_phase_index !== undefined ? 
      project.current_phase_index : 
      (project.calculated_phase_index !== undefined ? 
        project.calculated_phase_index : 
        this.calculatePhaseFromProgress(project.progress_percentage || 0));
    
    const currentPhase = this.phaseNames[phaseIndex] || 'Unknown';
    const progress = project.progress_percentage !== undefined ? 
      project.progress_percentage : 
      Math.round((phaseIndex / (this.phaseNames.length - 1)) * 100);
    const statusClass = this.getStatusClass(project.status);

    return `
      <div class="project-card" onclick="portal.modules.projects.selectProject('${project.id}')" style="background: #ffffff; border: 1px solid #e9ecef; padding: 1.5rem; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
        <div class="project-header">
          <h3 class="project-title" style="color: #333333;">${project.name}</h3>
          <span class="project-status ${statusClass}">${project.status}</span>
        </div>
        
        <div class="project-description" style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0;">
          <p style="color: #666666; margin: 0;">${project.description || 'No description available'}</p>
        </div>

        <div class="project-progress">
          <div class="progress-header">
            <span class="current-phase" style="color: #333333;">Current: ${currentPhase}</span>
            <span class="progress-percentage" style="color: #0057FF; font-weight: 600;">${progress}%</span>
          </div>
          <div class="progress-bar" style="background: #e9ecef; height: 8px; border-radius: 4px; margin: 0.5rem 0; overflow: hidden;">
            <div class="progress-fill" style="width: ${progress}%; background: #0057FF; height: 8px; border-radius: 4px; transition: width 0.3s;"></div>
          </div>
          <div class="phase-tracker" style="margin-top: 1rem; text-align: left;">
            ${this.renderMiniPhaseTracker(phaseIndex)}
          </div>
        </div>

        <div class="project-meta" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
          <div class="project-dates">
            <span class="created-date" style="color: #666666; font-size: 0.875rem;">Created: ${this.formatDate(project.created_at, { month: 'short', day: 'numeric' })}</span>
            ${project.due_date ? `<span class="due-date" style="color: #666666; font-size: 0.875rem; margin-left: 1rem;">Due: ${this.formatDate(project.due_date, { month: 'short', day: 'numeric' })}</span>` : ''}
          </div>
        </div>

        <div class="project-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); portal.modules.projects.viewProjectFiles('${project.id}')" style="background: #ffffff; border: 1px solid #e9ecef; color: #333333; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
            Files
          </button>
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); portal.modules.projects.openProjectChat('${project.id}')" style="background: #ffffff; border: 1px solid #e9ecef; color: #333333; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
            Chat
          </button>
        </div>
      </div>
    `;
  }

  renderMiniPhaseTracker(currentPhaseIndex) {
    return `
      <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
        ${this.phaseNames.map((phase, index) => {
          let statusClass = 'upcoming';
          let dotColor = '#e9ecef';
          let textColor = '#999999';
          let icon = '○';
          
          if (index < currentPhaseIndex) {
            statusClass = 'completed';
            dotColor = '#27AE60';
            textColor = '#27AE60';
            icon = '✓';
          } else if (index === currentPhaseIndex) {
            statusClass = 'current';
            dotColor = '#0057FF';
            textColor = '#0057FF';
            icon = '●';
          }

          return `
            <div class="mini-phase-item" style="display: flex; align-items: center; gap: 0.25rem;">
              <span class="mini-phase-dot ${statusClass}" style="color: ${dotColor}; font-size: 1.25rem; line-height: 1;">
                ${icon}
              </span>
              <span class="mini-phase-label" style="color: ${textColor}; font-size: 0.75rem; white-space: nowrap;">
                ${phase}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">[PROJECTS]</div>
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

  calculatePhaseFromProgress(progressPercentage) {
    // Calculate phase index based on progress percentage
    // 8 phases, so each phase is roughly 12.5% of progress
    if (progressPercentage >= 100) return 7;  // Delivery (Phase 8)
    if (progressPercentage >= 88) return 6;   // Sign-off (Phase 7)
    if (progressPercentage >= 75) return 5;   // Payment (Phase 6)
    if (progressPercentage >= 63) return 4;   // Production (Phase 5)
    if (progressPercentage >= 50) return 3;   // Review (Phase 4)
    if (progressPercentage >= 38) return 2;   // Design (Phase 3)
    if (progressPercentage >= 25) return 1;   // Ideation (Phase 2)
    if (progressPercentage >= 13) return 1;   // Still Ideation
    return 0;  // Onboarding (Phase 1)
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
      
      // The API returns { project: { ... } }, so extract the project data
      const detailedProject = data.project || data;
      
      // Merge detailed data with existing project
      this.selectedProject = { ...project, ...detailedProject };
      
      console.log('Project details loaded:', this.selectedProject);
      
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
    
    // Get the current phase from project data
    const currentPhaseIndex = project.current_phase || project.current_phase_index || 0;
    
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
        
        <!-- Phase Content with Tabs (single progress indicator) -->
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
      const responseData = await response.json();
      
      // Extract phase data from response (API returns { phase: {...}, deliverables: [...], ... })
      const phaseData = responseData.phase || responseData;
      
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
        deliverables: responseData.deliverables || [],
        clientActions: responseData.client_actions || responseData.actions || [],
        isActive: phaseIndex === project.current_phase_index,
        commentCount: phaseData.comment_count || 0,
        isAdmin: false,
        authToken: this.portal.authToken,
        progressPercentage: phaseData.progress_percentage || 0,
        completedActions: responseData.statistics?.completed_actions || 0,
        totalActions: responseData.statistics?.total_actions || 0,
        deadline: phaseData.deadline,
        activityCount: responseData.activity?.length || 0,
        isLocked: phaseIndex > project.current_phase_index,
        previousPhaseComplete: phaseIndex === 0 || project.current_phase_index >= phaseIndex,
        onApprove: async (phaseId) => this.handlePhaseApproval(phaseId),
        onRequestChanges: async (phaseId, feedback) => this.handlePhaseChangesRequest(phaseId, feedback),
        onFileDownload: async (fileId) => this.handleFileDownload(fileId)
      });
      
      phaseCard.render();
      
      // Render deliverables section if there are files
      if (responseData.deliverables && responseData.deliverables.length > 0) {
        const deliverablesContainer = document.createElement('div');
        deliverablesContainer.className = 'phase-deliverables-wrapper';
        contentContainer.appendChild(deliverablesContainer);
        
        const phaseDeliverables = new PhaseDeliverables({
          container: deliverablesContainer,
          deliverables: responseData.deliverables,
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
      console.error('Error details:', {
        projectId: project?.id,
        phaseIndex,
        phaseNumber: phaseIndex + 1,
        errorMessage: error.message,
        stack: error.stack
      });
      
      // Show a simple phase view as fallback
      const phaseName = this.phaseNames[phaseIndex];
      const phaseStatus = this.getPhaseStatus(phaseIndex, project.current_phase_index);
      const statusIcon = phaseStatus === 'completed' ? '✓' : phaseStatus === 'in_progress' ? '🔄' : '⏳';
      
      contentContainer.innerHTML = `
        <div class="phase-content-fallback" style="background: #ffffff; padding: 2rem; border-radius: 8px; border: 1px solid #e9ecef;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <span style="font-size: 1.5rem;">${phaseIndex + 1}</span>
            <h3 style="color: #333; margin: 0;">${phaseName}</h3>
            <span style="font-size: 1.25rem;">${statusIcon}</span>
            <span style="color: ${phaseStatus === 'completed' ? '#27AE60' : phaseStatus === 'in_progress' ? '#0057FF' : '#999'}; 
                   background: ${phaseStatus === 'completed' ? '#27AE6020' : phaseStatus === 'in_progress' ? '#0057FF20' : '#f8f9fa'};
                   padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">
              ${phaseStatus === 'completed' ? 'Completed' : phaseStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
            </span>
          </div>
          
          <p style="color: #666; margin-bottom: 1.5rem;">${this.getPhaseDescription(phaseName)}</p>
          
          <div class="phase-info" style="display: grid; gap: 1rem;">
            ${this.getPhaseActions(phaseIndex, phaseStatus)}
          </div>
          
          ${phaseStatus === 'in_progress' ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background: #FFF3CD; border: 1px solid #FFC107; border-radius: 6px;">
              <strong style="color: #856404;">Action Required:</strong>
              <p style="color: #856404; margin: 0.5rem 0 0 0;">${this.getClientActionText(phaseIndex)}</p>
              ${this.getPhaseActionButtons(phaseIndex)}
            </div>
          ` : ''}
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
    
    return descriptions[phaseName] || '';
  }
  
  getClientActionText(phaseIndex) {
    const actions = [
      'Please complete the intake form and provide project requirements',  // Onboarding
      'Review mood boards and provide feedback on creative direction',      // Ideation
      'Review initial designs and concepts',                              // Design
      'Provide feedback on designs and request any changes',              // Review
      'Monitor production progress',                                      // Production
      'Review and pay outstanding invoices',                             // Payment
      'Provide final approval and sign-off on deliverables',            // Sign-off
      'Download final deliverables and assets'                          // Delivery
    ];
    return actions[phaseIndex] || 'No action required at this time';
  }
  
  getPhaseActionButtons(phaseIndex) {
    const buttons = [
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Complete Intake Form</button>',
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Review Concepts</button>',
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Review Designs</button>',
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Submit Feedback</button>',
      '',  // No button for production
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Make Payment</button>',
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Approve & Sign Off</button>',
      '<button class="btn btn-primary" style="margin-top: 1rem; background: #0057FF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Download Assets</button>'
    ];
    return buttons[phaseIndex] || '';
  }
  
  getPhaseActions(phaseIndex, status) {
    const requiresAction = [true, true, false, true, false, true, true, true];
    const isActionRequired = requiresAction[phaseIndex];
    
    return `
      <div style="padding: 1rem; background: #f8f9fa; border-radius: 6px;">
        <strong style="color: #333;">Phase ${phaseIndex + 1} of ${this.phaseNames.length}</strong>
        <p style="color: #666; margin: 0.5rem 0 0 0;">Status: ${status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Not Started'}</p>
      </div>
      
      <div style="padding: 1rem; background: #f8f9fa; border-radius: 6px;">
        <strong style="color: #333;">Client Action Required</strong>
        <p style="color: #666; margin: 0.5rem 0 0 0;">${isActionRequired && status === 'in_progress' ? 'Yes - Action needed' : 'No action required'}</p>
      </div>
    `;
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