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
      'Onboarding', 'Ideation', 'Design', 'Review & Feedback', 
      'Production/Build', 'Payment', 'Sign-off & Docs', 'Launch'
    ];
    this.phaseKeys = ['ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'];
    this.phaseRequirements = {};
    this.phaseFlowManager = null;
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
        await this.loadPhaseRequirements();
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

  async loadPhaseRequirements() {
    try {
      const response = await this.apiRequest('/api/phases/requirements');
      const data = await response.json();
      
      if (data.requirements) {
        // Group requirements by phase
        data.requirements.forEach(req => {
          if (!this.phaseRequirements[req.phase_key]) {
            this.phaseRequirements[req.phase_key] = [];
          }
          this.phaseRequirements[req.phase_key].push(req);
        });
      }
    } catch (error) {
      console.error('Failed to load phase requirements:', error);
      this.setDefaultPhaseRequirements();
    }
  }

  setDefaultPhaseRequirements() {
    this.phaseRequirements = {
      'ONB': [
        { requirement_text: 'Complete intake form', is_mandatory: true },
        { requirement_text: 'Sign service agreement', is_mandatory: true },
        { requirement_text: 'Pay deposit invoice', is_mandatory: true }
      ],
      'IDEA': [
        { requirement_text: 'Review creative brief', is_mandatory: true },
        { requirement_text: 'Approve project direction', is_mandatory: true }
      ],
      'DSGN': [
        { requirement_text: 'Review initial designs', is_mandatory: false },
        { requirement_text: 'Provide feedback', is_mandatory: false }
      ],
      'REV': [
        { requirement_text: 'Approve all deliverables', is_mandatory: true },
        { requirement_text: 'Complete proof approval (if print)', is_mandatory: false }
      ],
      'PROD': [
        { requirement_text: 'Monitor production progress', is_mandatory: false }
      ],
      'PAY': [
        { requirement_text: 'Pay final invoice', is_mandatory: true }
      ],
      'SIGN': [
        { requirement_text: 'Sign completion agreement', is_mandatory: true },
        { requirement_text: 'Download final assets', is_mandatory: false }
      ],
      'LAUNCH': [
        { requirement_text: 'Confirm receipt of deliverables', is_mandatory: false },
        { requirement_text: 'Provide testimonial', is_mandatory: false }
      ]
    };
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
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        ${this.phaseNames.map((phase, index) => {
          let statusClass = 'upcoming';
          let bgColor = '#f0f0f0';
          let textColor = '#999999';
          let borderColor = '#e0e0e0';
          
          if (index < currentPhaseIndex) {
            statusClass = 'completed';
            bgColor = '#27AE60';
            textColor = '#ffffff';
            borderColor = '#27AE60';
          } else if (index === currentPhaseIndex) {
            statusClass = 'current';
            bgColor = '#0057FF';
            textColor = '#ffffff';
            borderColor = '#0057FF';
          }

          return `
            <div class="mini-phase-item ${statusClass}" style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="phase-number" style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: ${bgColor};
                color: ${textColor};
                border: 2px solid ${borderColor};
                font-size: 0.75rem;
                font-weight: 600;
              ">
                ${index + 1}
              </span>
              <span class="mini-phase-label" style="color: ${index <= currentPhaseIndex ? '#333' : '#999'}; font-size: 0.75rem; white-space: nowrap;">
                ${phase}
              </span>
              ${index < this.phaseNames.length - 1 ? `
                <span class="phase-connector" style="
                  width: 20px;
                  height: 2px;
                  background: ${index < currentPhaseIndex ? '#27AE60' : '#e0e0e0'};
                  margin: 0 -0.25rem;
                "></span>
              ` : ''}
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
    // Based on the project_flow.md specifications
    if (progressPercentage >= 100) return 7;  // Launch (Phase 8)
    if (progressPercentage >= 88) return 6;   // Sign-off & Docs (Phase 7)
    if (progressPercentage >= 75) return 5;   // Payment (Phase 6)
    if (progressPercentage >= 63) return 4;   // Production/Build (Phase 5)
    if (progressPercentage >= 50) return 3;   // Review & Feedback (Phase 4)
    if (progressPercentage >= 38) return 2;   // Design (Phase 3)
    if (progressPercentage >= 25) return 1;   // Ideation (Phase 2)
    if (progressPercentage >= 13) return 0;   // Onboarding (Phase 1)
    return 0;  // Default to Onboarding
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
    
    // Get the current phase from project data or calculate from progress
    const currentPhaseIndex = project.current_phase_index !== undefined ? 
      project.current_phase_index : 
      this.calculatePhaseFromProgress(project.progress_percentage || 0);
    
    const currentPhaseKey = this.phaseKeys[currentPhaseIndex];
    const progress = project.progress_percentage || Math.round((currentPhaseIndex / 7) * 100);
    
    // Clear current content and show detailed view
    this.element.innerHTML = `
      <div class="project-detail-view">
        <div class="project-detail-header" style="margin-bottom: 2rem;">
          <button class="btn-back" onclick="portal.modules.projects.backToProjectsList()" style="background: transparent; border: 1px solid #e9ecef; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-bottom: 1rem;">
            ← Back to Projects
          </button>
          <div class="project-detail-title" style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="color: #333; margin: 0;">${project.name}</h1>
            <span class="project-status ${this.getStatusClass(project.status)}" style="padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem;">${project.status}</span>
          </div>
        </div>
        
        <!-- 8-Step Progress Tracker -->
        <div class="phase-progress-tracker" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
          <h3 style="margin-bottom: 1.5rem; color: #333;">Project Progress</h3>
          <div class="overall-progress" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: #666;">Overall Progress</span>
              <span style="color: #0057FF; font-weight: 600;">${progress}%</span>
            </div>
            <div style="background: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
              <div style="width: ${progress}%; background: linear-gradient(90deg, #0057FF 0%, #0080FF 100%); height: 100%; border-radius: 6px; transition: width 0.5s ease;"></div>
            </div>
          </div>
          ${this.renderDetailedPhaseTracker(currentPhaseIndex)}
        </div>
        
        <!-- Current Phase Details -->
        <div class="current-phase-details" style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
          <h3 style="margin-bottom: 1.5rem; color: #333;">Phase ${currentPhaseIndex + 1}: ${this.phaseNames[currentPhaseIndex]}</h3>
          ${this.renderPhaseRequirements(currentPhaseKey)}
          ${this.renderPhaseActions(currentPhaseKey, project)}
        </div>
        
        <!-- Project Information Cards -->
        <div class="project-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          <div class="project-info-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h4 style="margin-bottom: 1rem; color: #666;">Project Details</h4>
            <div class="info-grid">
              <div class="info-item" style="margin-bottom: 1rem;">
                <label style="color: #999; font-size: 0.875rem;">Created</label>
                <div style="color: #333; font-weight: 500;">${this.formatDate(project.created_at)}</div>
              </div>
              ${project.due_date ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                  <label style="color: #999; font-size: 0.875rem;">Due Date</label>
                  <div style="color: #333; font-weight: 500;">${this.formatDate(project.due_date)}</div>
                </div>
              ` : ''}
              ${project.budget_amount ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                  <label style="color: #999; font-size: 0.875rem;">Budget</label>
                  <div style="color: #333; font-weight: 500;">$${project.budget_amount}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${project.description ? `
            <div class="project-description-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h4 style="margin-bottom: 1rem; color: #666;">Description</h4>
              <p style="color: #333; line-height: 1.6;">${project.description}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Quick Actions -->
        <div class="project-actions" style="display: flex; gap: 1rem; margin-top: 2rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewProjectFiles('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
            View Files
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.openProjectChat('${project.id}')" style="padding: 0.75rem 1.5rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
            Open Chat
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.viewInvoices('${project.id}')" style="padding: 0.75rem 1.5rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
            View Invoices
          </button>
        </div>
      </div>
    `;
  }

  renderDetailedPhaseTracker(currentPhaseIndex) {
    return `
      <div class="phases-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
        ${this.phaseNames.map((phase, index) => {
          const phaseKey = this.phaseKeys[index];
          let statusClass = 'upcoming';
          let bgColor = '#f8f9fa';
          let borderColor = '#e9ecef';
          let textColor = '#999';
          let numberBg = '#fff';
          let numberColor = '#999';
          let hoverBg = '#f0f0f0';
          
          if (index < currentPhaseIndex) {
            statusClass = 'completed';
            bgColor = '#e8f5e9';
            borderColor = '#27AE60';
            textColor = '#27AE60';
            numberBg = '#27AE60';
            numberColor = '#fff';
            hoverBg = '#d4edda';
          } else if (index === currentPhaseIndex) {
            statusClass = 'current';
            bgColor = '#e3f2fd';
            borderColor = '#0057FF';
            textColor = '#0057FF';
            numberBg = '#0057FF';
            numberColor = '#fff';
            hoverBg = '#cce5ff';
          }

          return `
            <div class="phase-card ${statusClass}" style="
              background: ${bgColor};
              border: 2px solid ${borderColor};
              border-radius: 8px;
              padding: 1rem;
              position: relative;
              cursor: pointer;
              transition: all 0.3s;
            " 
            onmouseover="this.style.background='${hoverBg}'"
            onmouseout="this.style.background='${bgColor}'"
            onclick="portal.modules.projects.showPhaseDetailsModal('${phaseKey}', ${index})">
              <div class="phase-number" style="
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: ${numberBg};
                color: ${numberColor};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
              ">${index + 1}</div>
              <div class="phase-name" style="
                color: ${textColor};
                font-weight: 500;
                margin-top: 0.5rem;
                text-align: center;
                font-size: 0.875rem;
              ">${phase}</div>
              ${index === currentPhaseIndex ? `
                <div class="phase-indicator" style="
                  position: absolute;
                  bottom: -8px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 8px solid ${borderColor};
                "></div>
              ` : ''}
              ${index < currentPhaseIndex ? `
                <div style="
                  position: absolute;
                  top: 5px;
                  right: 5px;
                  color: ${borderColor};
                  font-size: 1rem;
                ">✓</div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderPhaseRequirements(phaseKey, requirements = []) {
    // If no requirements passed, use the default static requirements
    if (!requirements || requirements.length === 0) {
      requirements = this.phaseRequirements[phaseKey] || [];
    }
    
    if (requirements.length === 0) {
      return '<p style="color: #999;">No specific requirements for this phase.</p>';
    }

    const project = this.selectedProject;
    const currentPhaseKey = project.current_phase_key || 'ONB';
    const isCurrentPhase = phaseKey === currentPhaseKey;

    return `
      <div class="phase-requirements">
        <h4 style="margin-bottom: 1rem; color: #666;">Client Actions Required:</h4>
        <ul style="list-style: none; padding: 0;">
          ${requirements.map(req => {
            const isCompleted = req.completed || false;
            const checkboxBg = isCompleted ? '#27AE60' : 'transparent';
            const checkboxBorder = req.is_mandatory ? '#F7C600' : '#999';
            const checkmark = isCompleted ? '✓' : '';
            const textDecoration = isCompleted ? 'line-through' : 'none';
            const textOpacity = isCompleted ? '0.7' : '1';
            
            // Determine if this requirement can be manually toggled
            const canToggle = isCurrentPhase && (
              req.requirement_type === 'monitor' || 
              req.requirement_type === 'review' || 
              req.requirement_type === 'confirm' ||
              req.requirement_type === 'feedback' ||
              req.requirement_type === 'launch' ||
              req.requirement_type === 'download'
            );
            
            return `
              <li style="
                display: flex;
                align-items: flex-start;
                margin-bottom: 0.75rem;
                padding: 0.75rem;
                background: ${req.is_mandatory && !isCompleted ? '#fff3cd' : '#f8f9fa'};
                border-radius: 6px;
                border-left: 3px solid ${isCompleted ? '#27AE60' : (req.is_mandatory ? '#F7C600' : '#e9ecef')};
              ">
                <span 
                  ${canToggle ? `onclick="portal.modules.projects.toggleRequirement('${project.id}', '${req.id}', ${!isCompleted})"` : ''}
                  style="
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 20px;
                  height: 20px;
                  background: ${checkboxBg};
                  border: 2px solid ${isCompleted ? '#27AE60' : checkboxBorder};
                  border-radius: 3px;
                  margin-right: 0.75rem;
                  flex-shrink: 0;
                  color: white;
                  font-weight: bold;
                  font-size: 14px;
                  ${canToggle ? 'cursor: pointer;' : ''}
                ">${checkmark}</span>
                <div style="flex: 1;">
                  <div style="opacity: ${textOpacity};">
                    <span style="color: #333; text-decoration: ${textDecoration};">${req.requirement_text}</span>
                    ${req.is_mandatory && !isCompleted ? '<span style="color: #F7C600; font-size: 0.75rem; margin-left: 0.5rem;">(Required)</span>' : ''}
                    ${isCompleted ? '<span style="color: #27AE60; font-size: 0.75rem; margin-left: 0.5rem;">✓ Completed</span>' : ''}
                  </div>
                  ${canToggle && !isCompleted ? `
                    <button onclick="portal.modules.projects.toggleRequirement('${project.id}', '${req.id}', true)" 
                      style="margin-top: 0.5rem; padding: 0.25rem 0.75rem; background: #0057FF; color: white; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
                      Mark as Complete
                    </button>
                  ` : ''}
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }

  renderPhaseActions(phaseKey, project) {
    const phaseActions = {
      'ONB': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.openIntakeForm('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            Complete Intake Form
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.viewAgreement('${project.id}')" style="padding: 0.75rem 1.5rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
            View Agreement
          </button>
        </div>
      `,
      'IDEA': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewCreativeBrief('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            View Creative Brief
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.approveBrief('${project.id}')" style="padding: 0.75rem 1.5rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Approve Brief
          </button>
        </div>
      `,
      'DSGN': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewDesigns('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
            View Design Drafts
          </button>
        </div>
      `,
      'REV': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.submitFeedback('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            Submit Feedback
          </button>
          <button class="btn-success" onclick="portal.modules.projects.approveDeliverables('${project.id}')" style="padding: 0.75rem 1.5rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Approve Deliverables
          </button>
        </div>
      `,
      'PROD': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewProductionStatus('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
            View Production Status
          </button>
        </div>
      `,
      'PAY': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewInvoice('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            View Invoice
          </button>
          <button class="btn-success" onclick="portal.modules.projects.payInvoice('${project.id}')" style="padding: 0.75rem 1.5rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Pay Now
          </button>
        </div>
      `,
      'SIGN': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.downloadAssets('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            Download Assets
          </button>
          <button class="btn-success" onclick="portal.modules.projects.signCompletion('${project.id}')" style="padding: 0.75rem 1.5rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Sign Completion
          </button>
        </div>
      `,
      'LAUNCH': `
        <div class="phase-action-buttons" style="margin-top: 1.5rem;">
          <button class="btn-primary" onclick="portal.modules.projects.viewLaunchDetails('${project.id}')" style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 1rem;">
            View Launch Details
          </button>
          <button class="btn-secondary" onclick="portal.modules.projects.leaveTestimonial('${project.id}')" style="padding: 0.75rem 1.5rem; background: #F7C600; color: #333; border: none; border-radius: 6px; cursor: pointer;">
            Leave Testimonial
          </button>
        </div>
      `
    };

    return phaseActions[phaseKey] || '';
  }

  backToProjectsList() {
    this.selectedProject = null;
    this.setupProjectsInterface();
  }

  // Phase Action Methods
  async openIntakeForm(projectId) {
    // Create intake form modal
    const modal = document.createElement('div');
    modal.className = 'intake-form-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;

    modalContent.innerHTML = `
      <button onclick="this.closest('.intake-form-modal').remove()" style="
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
      ">×</button>
      
      <h2 style="margin-bottom: 1.5rem; color: #333;">Project Intake Form</h2>
      
      <form id="intake-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Project Type*</label>
          <select name="project_type" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">Select project type...</option>
            <option value="website">Website Development</option>
            <option value="print">Print Design</option>
            <option value="branding">Branding Package</option>
            <option value="book-cover">Book Cover Design</option>
            <option value="screen-print">Screen Printing</option>
            <option value="large-format">Large Format Print</option>
          </select>
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Project Goals* <small style="color: #999; font-weight: normal;">(min. 10 characters)</small></label>
          <textarea name="project_goals" required minlength="10" rows="4" placeholder="What are your main goals for this project? Be specific about what you want to achieve." style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px; resize: vertical;"></textarea>
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Target Audience</label>
          <input type="text" name="target_audience" placeholder="Who is your target audience?" style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Timeline*</label>
          <select name="timeline" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">Select timeline...</option>
            <option value="asap">ASAP (Rush +25%)</option>
            <option value="1-week">1 Week</option>
            <option value="2-weeks">2 Weeks</option>
            <option value="1-month">1 Month</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Budget Range*</label>
          <select name="budget_range" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">Select budget...</option>
            <option value="500-1000">$500 - $1,000</option>
            <option value="1000-2500">$1,000 - $2,500</option>
            <option value="2500-5000">$2,500 - $5,000</option>
            <option value="5000-10000">$5,000 - $10,000</option>
            <option value="10000+">$10,000+</option>
          </select>
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Additional Details</label>
          <textarea name="additional_details" rows="4" placeholder="Any specific requirements or preferences?" style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px; resize: vertical;"></textarea>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
          <button type="submit" style="flex: 1; padding: 0.75rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Submit Form
          </button>
          <button type="button" onclick="this.closest('.intake-form-modal').remove()" style="flex: 1; padding: 0.75rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Cancel
          </button>
        </div>
      </form>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle form submission
    const form = document.getElementById('intake-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Client-side validation
      if (data.project_goals && data.project_goals.length < 10) {
        this.portal.showNotification('Project goals must be at least 10 characters long', 'error');
        return;
      }
      
      try {
        // Use the phase-specific endpoint
        const response = await this.apiRequest(`/api/forms/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId,
            phaseKey: 'ONB',  // Onboarding phase
            moduleId: 'intake_base',
            data: data
          })
        });
        
        // Parse the JSON response
        const result = await response.json();
        
        if (result.success) {
          this.portal.showNotification('Intake form submitted successfully!', 'success');
          modal.remove();
          
          // Refresh project data
          await this.loadProjects();
          if (this.selectedProject) {
            await this.showProjectDetails(this.selectedProject);
          }
        } else {
          throw new Error(result.error || 'Form submission failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        this.portal.showNotification(error.message || 'Failed to submit form. Please try again.', 'error');
      }
    });
  }

  async viewAgreement(projectId) {
    // Show service agreement in modal
    const modal = this.createModal('Service Agreement', `
      <div style="padding: 1rem;">
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <h3 style="margin: 0 0 1rem 0; color: #333;">Service Agreement & Statement of Work</h3>
          <p style="color: #666; line-height: 1.6;">This agreement outlines the terms and conditions for your project with [RE]Print Studios.</p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #333; margin-bottom: 0.5rem;">Project Scope</h4>
          <ul style="color: #666; line-height: 1.8;">
            <li>Design and development services as discussed</li>
            <li>Up to 2 rounds of revisions included</li>
            <li>Final deliverables in agreed formats</li>
            <li>Project timeline as specified in intake form</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #333; margin-bottom: 0.5rem;">Payment Terms</h4>
          <ul style="color: #666; line-height: 1.8;">
            <li>50% deposit required to begin work</li>
            <li>Remaining balance due upon completion</li>
            <li>Rush projects incur 25% additional fee</li>
            <li>Payment via credit card or ACH transfer</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #333; margin-bottom: 0.5rem;">Intellectual Property</h4>
          <p style="color: #666; line-height: 1.6;">Upon full payment, all rights to the final deliverables transfer to the client. [RE]Print Studios retains the right to showcase the work in portfolio materials.</p>
        </div>
        
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 3px solid #F7C600;">
          <p style="margin: 0; color: #856404;">
            <strong>Next Step:</strong> Sign this agreement to proceed with your project.
          </p>
        </div>
        
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
          <button onclick="portal.modules.projects.signAgreement('${projectId}')" style="flex: 1; padding: 0.75rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Sign Agreement
          </button>
          <button onclick="portal.modules.projects.downloadAgreementPDF('${projectId}')" style="flex: 1; padding: 0.75rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
            Download PDF
          </button>
        </div>
      </div>
    `);
  }

  async toggleRequirement(projectId, requirementId, completed) {
    try {
      const response = await this.apiRequest(`/api/phases/projects/${projectId}/requirements/${requirementId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed })
      });
      
      if (response.success) {
        this.portal.showNotification(
          completed ? 'Requirement marked as completed!' : 'Requirement marked as incomplete',
          'success'
        );
        
        // Check if phase should advance
        if (response.allMandatoryComplete) {
          this.portal.showNotification('All mandatory requirements completed! Ready to advance to next phase.', 'info');
          
          // Auto-advance if enabled
          if (response.autoAdvanced) {
            this.portal.showNotification(`Phase advanced to ${response.nextPhaseName}!`, 'success');
            // Refresh project data
            await this.loadProjects();
            if (this.selectedProject) {
              await this.showProjectDetails(this.selectedProject);
            }
          }
        }
        
        // Close and reopen the modal to refresh
        document.querySelector('.phase-details-modal')?.remove();
        const currentPhaseKey = this.selectedProject.current_phase_key;
        const currentPhaseIndex = this.phaseKeys.indexOf(currentPhaseKey);
        await this.showPhaseDetailsModal(currentPhaseKey, currentPhaseIndex);
      }
    } catch (error) {
      console.error('Error toggling requirement:', error);
      this.portal.showNotification('Failed to update requirement status', 'error');
    }
  }

  async submitSignedAgreement(projectId, signatureName) {
    try {
      const response = await this.apiRequest('/api/agreements/sign/' + projectId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signatureName,
          agreementType: 'service'
        })
      });
      
      if (response.success) {
        this.portal.showNotification('Agreement signed successfully!', 'success');
        
        // Refresh project data
        await this.loadProjects();
        if (this.selectedProject) {
          await this.showProjectDetails(this.selectedProject);
        }
        
        // Close modal
        document.querySelector('.modal')?.remove();
      }
    } catch (error) {
      console.error('Error signing agreement:', error);
      this.portal.showNotification('Failed to sign agreement', 'error');
    }
  }

  async signAgreement(projectId) {
    const signaturePad = `
      <div style="padding: 1rem;">
        <h3 style="margin-bottom: 1rem; color: #333;">Electronic Signature</h3>
        <p style="color: #666; margin-bottom: 1.5rem;">Please type your full name below to sign the agreement electronically.</p>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: #666;">Full Name*</label>
          <input type="text" id="signature-name" placeholder="Your Full Name" style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;" required>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: #666;">Today's Date</label>
          <input type="text" value="${new Date().toLocaleDateString()}" disabled style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px; background: #f8f9fa;">
        </div>
        
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <label style="display: flex; align-items: flex-start; cursor: pointer;">
            <input type="checkbox" id="agreement-checkbox" style="margin-right: 0.5rem; margin-top: 0.25rem;">
            <span style="color: #666; font-size: 0.875rem; line-height: 1.5;">
              I agree to the terms and conditions outlined in the Service Agreement and authorize [RE]Print Studios to begin work on my project upon receipt of the deposit payment.
            </span>
          </label>
        </div>
        
        <button onclick="portal.modules.projects.submitSignature('${projectId}')" style="width: 100%; padding: 0.75rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          Sign & Submit
        </button>
      </div>
    `;
    
    this.createModal('Sign Service Agreement', signaturePad);
  }

  async submitSignature(projectId) {
    const name = document.getElementById('signature-name')?.value;
    const agreed = document.getElementById('agreement-checkbox')?.checked;
    
    if (!name || !agreed) {
      this.portal.showNotification('Please enter your name and check the agreement box', 'error');
      return;
    }
    
    try {
      await this.apiRequest(`/api/projects/${projectId}/sign-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: name,
          timestamp: new Date().toISOString()
        })
      });
      
      this.portal.showNotification('Agreement signed successfully!', 'success');
      document.querySelector('.modal')?.remove();
      
      // Refresh project
      await this.loadProjects();
      if (this.selectedProject) {
        await this.showProjectDetails(this.selectedProject);
      }
    } catch (error) {
      this.portal.showNotification('Failed to sign agreement', 'error');
    }
  }

  createModal(title, content) {
    // Remove any existing modals
    document.querySelectorAll('.modal').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      ">
        <div style="padding: 1.5rem; border-bottom: 1px solid #e9ecef;">
          <button onclick="this.closest('.modal').remove()" style="
            position: absolute;
            top: 1.5rem;
            right: 1.5rem;
            background: transparent;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #999;
          ">×</button>
          <h2 style="margin: 0; color: #333;">${title}</h2>
        </div>
        <div>
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    return modal;
  }

  async downloadAgreementPDF(projectId) {
    this.portal.showNotification('Generating PDF...', 'info');
    try {
      const response = await this.apiRequest(`/api/pdf/agreement/${projectId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-agreement-${projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.portal.showNotification('Failed to generate PDF', 'error');
    }
  }

  async viewCreativeBrief(projectId) {
    const modal = this.createModal('Creative Brief', `
      <div style="padding: 1.5rem;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
          <h3 style="margin: 0; color: white;">Creative Direction</h3>
          <p style="color: rgba(255,255,255,0.9); margin-top: 0.5rem;">Establishing the vision for your project</p>
        </div>
        
        <div style="display: grid; gap: 1.5rem;">
          <div>
            <h4 style="color: #333; margin-bottom: 0.5rem;">Project Vision</h4>
            <p style="color: #666; line-height: 1.6;">
              Creating a modern, vibrant design that speaks to young creatives and aspiring artists. 
              The aesthetic should balance professionalism with creative energy.
            </p>
          </div>
          
          <div>
            <h4 style="color: #333; margin-bottom: 0.5rem;">Target Audience</h4>
            <ul style="color: #666; line-height: 1.8;">
              <li>Young adults (18-35)</li>
              <li>Creative professionals</li>
              <li>Small business owners</li>
              <li>Artists and designers</li>
            </ul>
          </div>
          
          <div>
            <h4 style="color: #333; margin-bottom: 0.5rem;">Key Messages</h4>
            <ul style="color: #666; line-height: 1.8;">
              <li>Professional quality meets creative vision</li>
              <li>Accessible design services for all</li>
              <li>Collaborative creative process</li>
            </ul>
          </div>
          
          <div>
            <h4 style="color: #333; margin-bottom: 0.5rem;">Visual Direction</h4>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
              <div style="width: 60px; height: 60px; background: #0057FF; border-radius: 8px;"></div>
              <div style="width: 60px; height: 60px; background: #F7C600; border-radius: 8px;"></div>
              <div style="width: 60px; height: 60px; background: #27AE60; border-radius: 8px;"></div>
              <div style="width: 60px; height: 60px; background: #E63946; border-radius: 8px;"></div>
            </div>
            <p style="color: #666; margin-top: 1rem; font-size: 0.875rem;">Bold, vibrant colors with clean typography</p>
          </div>
        </div>
        
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e9ecef;">
          <button onclick="portal.modules.projects.approveBrief('${projectId}')" style="width: 100%; padding: 0.75rem; background: #27AE60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Approve Creative Brief
          </button>
        </div>
      </div>
    `);
  }

  async approveBrief(projectId) {
    if (confirm('Are you sure you want to approve this creative brief?')) {
      try {
        await this.apiRequest(`/api/projects/${projectId}/approve-brief`, {
          method: 'POST'
        });
        this.portal.showNotification('Creative brief approved!', 'success');
        await this.loadProjects();
        this.setupProjectsInterface();
      } catch (error) {
        this.portal.showNotification('Failed to approve brief', 'error');
      }
    }
  }

  async viewDesigns(projectId) {
    this.portal.showNotification('Loading design drafts...', 'info');
    this.viewProjectFiles(projectId);
  }

  async submitFeedback(projectId) {
    const modal = this.createModal('Submit Feedback', `
      <div style="padding: 1.5rem;">
        <p style="color: #666; margin-bottom: 1.5rem;">Please provide your feedback on the current designs. Be as specific as possible to help us refine the work to your vision.</p>
        
        <form id="feedback-form">
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Overall Impression</label>
            <select id="feedback-rating" style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
              <option value="">Select...</option>
              <option value="love-it">Love it! Minor tweaks only</option>
              <option value="close">Close, but needs some changes</option>
              <option value="major-changes">Needs major changes</option>
              <option value="wrong-direction">Wrong direction entirely</option>
            </select>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Specific Feedback*</label>
            <textarea id="feedback-text" required rows="6" placeholder="What works? What doesn't? What changes would you like to see?" style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px; resize: vertical;"></textarea>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500;">Areas Needing Changes</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="colors" style="margin-right: 0.5rem;">
                <span style="color: #666;">Colors</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="typography" style="margin-right: 0.5rem;">
                <span style="color: #666;">Typography</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="layout" style="margin-right: 0.5rem;">
                <span style="color: #666;">Layout</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="imagery" style="margin-right: 0.5rem;">
                <span style="color: #666;">Imagery</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" value="content" style="margin-right: 0.5rem;">
                <span style="color: #666;">Content</span>
              </label>
            </div>
          </div>
          
          <button type="submit" style="width: 100%; padding: 0.75rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Submit Feedback
          </button>
        </form>
      </div>
    `);
    
    // Handle form submission
    const form = document.getElementById('feedback-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const feedbackText = document.getElementById('feedback-text')?.value;
        const rating = document.getElementById('feedback-rating')?.value;
        const areas = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        
        if (!feedbackText) {
          this.portal.showNotification('Please provide feedback', 'error');
          return;
        }
        
        try {
          await this.apiRequest(`/api/projects/${projectId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              feedback: feedbackText,
              rating,
              areas
            })
          });
          
          this.portal.showNotification('Feedback submitted successfully!', 'success');
          modal.remove();
        } catch (error) {
          this.portal.showNotification('Failed to submit feedback', 'error');
        }
      });
    }
  }

  async approveDeliverables(projectId) {
    if (confirm('Are you sure you want to approve all deliverables?')) {
      try {
        await this.apiRequest(`/api/projects/${projectId}/approve-deliverables`, {
          method: 'POST'
        });
        this.portal.showNotification('Deliverables approved!', 'success');
        await this.loadProjects();
        this.setupProjectsInterface();
      } catch (error) {
        this.portal.showNotification('Failed to approve deliverables', 'error');
      }
    }
  }

  async viewProductionStatus(projectId) {
    const modal = this.createModal('Production Status', `
      <div style="padding: 1.5rem;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
          <h3 style="margin: 0; color: white;">Production in Progress</h3>
          <p style="color: rgba(255,255,255,0.9); margin-top: 0.5rem;">Your project is being brought to life!</p>
        </div>
        
        <div style="margin-bottom: 2rem;">
          <h4 style="color: #333; margin-bottom: 1rem;">Current Status</h4>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 24px; height: 24px; background: #27AE60; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 14px;">✓</span>
              </div>
              <span style="color: #27AE60;">Pre-production setup complete</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 24px; height: 24px; background: #0057FF; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 14px;">●</span>
              </div>
              <span style="color: #0057FF; font-weight: 500;">Production/Printing in progress</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 24px; height: 24px; background: #e9ecef; border-radius: 50%;"></div>
              <span style="color: #999;">Quality check pending</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 24px; height: 24px; background: #e9ecef; border-radius: 50%;"></div>
              <span style="color: #999;">Ready for delivery</span>
            </div>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <h5 style="margin: 0 0 0.5rem 0; color: #333;">Production Details</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div>
              <span style="color: #999; font-size: 0.875rem;">Start Date</span>
              <div style="color: #333; font-weight: 500;">${new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <span style="color: #999; font-size: 0.875rem;">Est. Completion</span>
              <div style="color: #333; font-weight: 500;">${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
            </div>
            <div>
              <span style="color: #999; font-size: 0.875rem;">Production Type</span>
              <div style="color: #333; font-weight: 500;">Digital + Print</div>
            </div>
            <div>
              <span style="color: #999; font-size: 0.875rem;">Batch/Job #</span>
              <div style="color: #333; font-weight: 500;">#PRD-2025-${Math.floor(Math.random() * 1000)}</div>
            </div>
          </div>
        </div>
        
        <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; border-left: 3px solid #0057FF;">
          <p style="margin: 0; color: #1976d2;">
            <strong>Note:</strong> We'll notify you as soon as production is complete and ready for final review.
          </p>
        </div>
      </div>
    `);
  }

  async viewInvoice(projectId) {
    this.viewInvoices(projectId);
  }

  async payInvoice(projectId) {
    try {
      const response = await this.apiRequest(`/api/projects/${projectId}/invoices`);
      const data = await response.json();
      const unpaidInvoice = data.invoices?.find(inv => inv.status === 'sent' || inv.status === 'overdue');
      
      if (unpaidInvoice) {
        // TODO: Integrate with Stripe payment
        this.portal.showNotification('Redirecting to payment...', 'info');
        window.location.href = `#payment/${unpaidInvoice.id}`;
      } else {
        this.portal.showNotification('No pending invoices', 'info');
      }
    } catch (error) {
      this.portal.showNotification('Failed to load invoice', 'error');
    }
  }

  async downloadAssets(projectId) {
    try {
      const response = await this.apiRequest(`/api/projects/${projectId}/assets`);
      const data = await response.json();
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      } else {
        this.portal.showNotification('Assets not yet available', 'info');
      }
    } catch (error) {
      this.portal.showNotification('Failed to download assets', 'error');
    }
  }

  async signCompletion(projectId) {
    if (confirm('Are you ready to sign the project completion agreement?')) {
      try {
        await this.apiRequest(`/api/projects/${projectId}/sign-completion`, {
          method: 'POST'
        });
        this.portal.showNotification('Completion agreement signed!', 'success');
        await this.loadProjects();
        this.setupProjectsInterface();
      } catch (error) {
        this.portal.showNotification('Failed to sign completion', 'error');
      }
    }
  }

  async viewLaunchDetails(projectId) {
    try {
      const response = await this.apiRequest(`/api/projects/${projectId}/launch-details`);
      const data = await response.json();
      // TODO: Display launch details in modal
      this.portal.showNotification('Launch details loaded', 'success');
    } catch (error) {
      this.portal.showNotification('Failed to load launch details', 'error');
    }
  }

  async leaveTestimonial(projectId) {
    const testimonial = prompt('We would love to hear about your experience! Please share your testimonial:');
    if (testimonial) {
      try {
        await this.apiRequest(`/api/projects/${projectId}/testimonial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testimonial })
        });
        this.portal.showNotification('Thank you for your testimonial!', 'success');
      } catch (error) {
        this.portal.showNotification('Failed to submit testimonial', 'error');
      }
    }
  }

  async showPhaseDetailsModal(phaseKey, phaseIndex) {
    const project = this.selectedProject;
    if (!project) return;

    const currentPhaseIndex = project.current_phase_index || 0;
    const isAccessible = phaseIndex <= currentPhaseIndex || phaseIndex === 0; // Can always view onboarding
    
    // Fetch phase requirements with completion status
    let requirements = [];
    try {
      // Get all requirements for this phase
      const reqResponse = await this.apiRequest(`/api/phases/requirements/${phaseKey}`);
      const phaseRequirements = reqResponse.requirements || [];
      
      // Get completion status for this project
      const completionResponse = await this.apiRequest(`/api/projects/${project.id}/requirements`);
      const completedReqs = completionResponse.completedRequirements || [];
      
      // Merge requirements with completion status
      requirements = phaseRequirements.map(req => ({
        ...req,
        completed: completedReqs.some(cr => cr.requirement_id === req.id && cr.completed)
      }));
    } catch (error) {
      console.error('Error fetching requirements:', error);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'phase-details-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;

    // Phase status styling
    let statusBadge = '';
    if (phaseIndex < currentPhaseIndex) {
      statusBadge = '<span style="background: #27AE60; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">Completed</span>';
    } else if (phaseIndex === currentPhaseIndex) {
      statusBadge = '<span style="background: #0057FF; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">Current Phase</span>';
    } else {
      statusBadge = '<span style="background: #999; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">Upcoming</span>';
    }

    modalContent.innerHTML = `
      <button onclick="this.closest('.phase-details-modal').remove()" style="
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
      ">×</button>
      
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="
            background: ${phaseIndex <= currentPhaseIndex ? '#0057FF' : '#999'};
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 1.25rem;
          ">${phaseIndex + 1}</div>
          <h2 style="margin: 0; color: #333;">${this.phaseNames[phaseIndex]}</h2>
          ${statusBadge}
        </div>
        
        ${this.getPhaseDescription(phaseKey)}
      </div>

      ${isAccessible ? `
        <div style="margin-bottom: 2rem;">
          ${this.renderPhaseRequirements(phaseKey, requirements)}
        </div>
        
        <div>
          ${this.renderPhaseActions(phaseKey, project)}
        </div>
      ` : `
        <div style="
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          color: #666;
        ">
          <p style="margin: 0;">This phase will be accessible once previous phases are completed.</p>
        </div>
      `}
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  getPhaseDescription(phaseKey) {
    const descriptions = {
      'ONB': '<p style="color: #666; line-height: 1.6;">Capture project scope, establish terms, and collect initial deposit. This phase includes completing intake forms, signing the service agreement, and making the initial payment to begin work.</p>',
      'IDEA': '<p style="color: #666; line-height: 1.6;">Define project direction through moodboards, references, and creative briefs. We\'ll explore concepts and establish the visual direction for your project.</p>',
      'DSGN': '<p style="color: #666; line-height: 1.6;">Production of initial designs and drafts. You\'ll see the first versions of your project come to life with opportunities for feedback.</p>',
      'REV': '<p style="color: #666; line-height: 1.6;">Structured feedback collection and approval process. Review deliverables, request changes if needed, and approve final designs.</p>',
      'PROD': '<p style="color: #666; line-height: 1.6;">Execution of approved work. Your project moves into production, whether that\'s printing, development, or final asset creation.</p>',
      'PAY': '<p style="color: #666; line-height: 1.6;">Final invoice and payment collection. Complete payment for the project before final delivery.</p>',
      'SIGN': '<p style="color: #666; line-height: 1.6;">Transfer of rights and documentation. Sign completion agreements and receive all project documentation and assets.</p>',
      'LAUNCH': '<p style="color: #666; line-height: 1.6;">Project delivery and launch. Receive final deliverables and celebrate your project going live!</p>'
    };
    
    return descriptions[phaseKey] || '';
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