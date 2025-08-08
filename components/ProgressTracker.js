import { BRAND } from '../config/brand.js';

/**
 * Create a simple inline progress bar for project cards
 * @param {number} currentPhaseIndex - Current phase index (0-7)
 * @param {string} phaseKey - Current phase key
 * @returns {string} HTML string for inline progress bar
 */
export function createInlineProgressBar(currentPhaseIndex = 0, phaseKey = 'onboarding') {
  const progress = Math.round((currentPhaseIndex / 7) * 100);
  const phaseNames = [
    'Onboarding', 'Ideation', 'Design', 'Review',
    'Production', 'Payment', 'Sign-off', 'Delivery'
  ];
  
  return `
    <div class="inline-progress-tracker">
      <div class="inline-progress-info">
        <span class="phase-label">Phase: ${phaseNames[currentPhaseIndex] || 'Unknown'}</span>
        <span class="progress-percentage">${progress}%</span>
      </div>
      <div class="inline-progress-bar">
        <div class="inline-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="phase-dots">
        ${phaseNames.map((phase, index) => `
          <span class="phase-dot ${index === currentPhaseIndex ? 'active' : index < currentPhaseIndex ? 'completed' : ''}" 
                title="${phase}"></span>
        `).join('')}
      </div>
    </div>
  `;
}

export class ProgressTracker {
  constructor(options = {}) {
    this.options = {
      projectId: null,
      container: null,
      currentPhase: 0,
      phases: BRAND.phaseDefinitions,
      dynamicPhases: [], // Support for service-specific phases
      serviceType: null,
      onPhaseClick: () => {},
      onActionComplete: () => {},
      onPhaseTransition: () => {},
      authToken: null,
      enableDynamicNavigation: true,
      showNewComponents: true, // Enable new component integration
      ...options
    };
    
    this.projectData = null;
    this.phaseTracking = null;
    this.clientActions = [];
    this.isLoading = false;
    this.serviceConfig = null;
    this.dynamicComponents = {
      ProofChecklist: null,
      BatchStatus: null,
      StagingLink: null
    };
    this.websocketConnection = null;
  }

  async init(projectId) {
    this.options.projectId = projectId;
    this.isLoading = true;
    
    try {
      // Initialize WebSocket connection if available
      if (window.io && this.options.enableDynamicNavigation) {
        this.initializeWebSocket();
      }
      
      // Debug auth token
      console.log('ProgressTracker auth token:', this.options.authToken ? `${this.options.authToken.substring(0, 20)}...` : 'NO TOKEN!');
      
      // Fetch project phase data with service configuration
      const response = await fetch(`/api/phases/project/${projectId}/tracking?include_service=true`, {
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Phase tracking API response:', response.status, response.headers.get('content-type'));
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Failed to load phase data: ${response.status}`;
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else if (contentType && contentType.includes('text/html')) {
            errorMessage = `API returned HTML instead of JSON (${response.status}). Check if the route exists.`;
          }
        } catch (parseError) {
          // Keep the default error message if we can't parse the response
        }
        
        if (response.status === 403) {
          errorMessage = 'Access denied. You may not have permission to view this project, or it may not exist.';
        } else if (response.status === 404) {
          errorMessage = 'Project not found or has been deleted.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      this.projectData = data.project;
      this.phaseTracking = data.tracking;
      this.clientActions = data.actions || [];
      this.serviceConfig = data.service_config || null;
      
      // Use dynamic phases if available
      if (data.service_config && data.service_config.phases) {
        this.options.dynamicPhases = data.service_config.phases;
        this.options.serviceType = data.service_config.service_type;
      }
      
      // Initialize new components if enabled
      if (this.options.showNewComponents) {
        this.initializeNewComponents();
      }
      
      this.render();
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing progress tracker:', error);
      this.renderError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async initWithData(projectId, phasesData) {
    this.options.projectId = projectId;
    this.isLoading = true;
    
    try {
      // Use the provided phase data directly
      this.projectData = {
        id: projectId,
        phases: phasesData.phases,
        project: phasesData.project
      };
      this.phaseTracking = phasesData.tracking || {};
      this.clientActions = [];
      
      this.render();
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing progress tracker with data:', error);
      this.renderError(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  updateWithData(phasesData) {
    try {
      // Update the internal data
      this.projectData.phases = phasesData.phases;
      this.phaseTracking = phasesData.tracking || {};
      
      // Re-render with updated data
      this.render();
      
      console.log('Progress tracker updated with new data');
    } catch (error) {
      console.error('Error updating progress tracker with data:', error);
    }
  }

  render() {
    if (!this.options.container) return;
    
    const container = this.options.container;
    container.innerHTML = this.generateHTML();
    container.classList.add('progress-tracker-container');
    
    // Store reference for external access
    container._progressTracker = this;
  }

  generateHTML() {
    const currentPhaseIndex = this.phaseTracking?.current_phase_index || 0;
    const phases = this.getEffectivePhases();
    
    // Check if we're in tab mode
    if (this.options.orientation === 'tabs') {
      return this.generateTabsHTML(phases, currentPhaseIndex);
    }
    
    return `
      <div class="progress-tracker ${this.isLoading ? 'loading' : ''}">
        <div class="progress-header">
          <h3>Project Progress</h3>
          <span class="progress-percentage">${this.calculateProgress()}% Complete</span>
        </div>
        
        <div class="phase-timeline">
          <div class="progress-line">
            <div class="progress-fill" style="width: ${this.calculateProgress()}%"></div>
          </div>
          
          <div class="phase-nodes">
            ${phases.map((phase, index) => this.renderPhaseNode(phase, index, currentPhaseIndex)).join('')}
          </div>
        </div>
        
        <div class="phase-details">
          ${this.renderCurrentPhaseDetails(phases[currentPhaseIndex], currentPhaseIndex)}
        </div>
      </div>
    `;
  }

  generateTabsHTML(phases, currentPhaseIndex) {
    return `
      <div class="phase-tabs-container">
        <div class="phase-tabs-nav">
          ${phases.map((phase, index) => this.renderPhaseTab(phase, index, currentPhaseIndex)).join('')}
        </div>
        <div class="phase-tabs-content">
          ${this.renderCurrentPhaseDetails(phases[currentPhaseIndex], currentPhaseIndex)}
        </div>
        ${this.options.serviceType ? `<div class="service-type-indicator">Service: ${this.options.serviceType}</div>` : ''}
      </div>
    `;
  }

  renderPhaseTab(phase, index, currentIndex) {
    const status = this.getPhaseStatus(index, currentIndex);
    const isClickable = this.options.onPhaseClick;
    const isActive = index === currentIndex;
    const activityCount = phase.activity_count || 0;
    
    return `
      <button class="phase-tab ${status} ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}" 
              data-phase="${phase.key}" 
              data-phase-index="${index}"
              ${!isClickable ? 'disabled' : ''}>
        <span class="tab-icon">${this.getPhaseIcon(phase.key)}</span>
        <span class="tab-label">${phase.name}</span>
        ${status === 'completed' ? '<span class="tab-check">✓</span>' : ''}
        ${activityCount > 0 ? `<span class="tab-comment-badge" title="${activityCount} activities">${activityCount}</span>` : ''}
      </button>
    `;
  }

  renderPhaseNode(phase, index, currentIndex) {
    const status = this.getPhaseStatus(index, currentIndex);
    const isClickable = status !== 'locked' && this.options.onPhaseClick;
    
    return `
      <div class="phase-node ${status} ${isClickable ? 'clickable' : ''}" 
           data-phase="${phase.key}" 
           data-phase-index="${index}">
        <div class="node-icon">${this.getPhaseIcon(phase.key)}</div>
        <div class="node-label">${phase.name}</div>
        ${status === 'completed' ? '<div class="node-check">✓</div>' : ''}
        ${status === 'current' ? '<div class="node-pulse"></div>' : ''}
      </div>
    `;
  }

  renderCurrentPhaseDetails(phase, phaseIndex) {
    if (!phase) return '';
    
    const actions = this.getPhaseActions(phase.key);
    const completedActions = actions.filter(a => this.isActionCompleted(a.id));
    const progress = actions.length > 0 ? (completedActions.length / actions.length) * 100 : 0;
    
    return `
      <div class="current-phase-info">
        <div class="phase-header">
          <div class="phase-title">
            <span class="phase-icon">${this.getPhaseIcon(phase.key)}</span>
            <h4>${phase.name}</h4>
          </div>
          <div class="phase-progress">
            <span>${completedActions.length} of ${actions.length} tasks complete</span>
          </div>
        </div>
        
        ${phase.description ? `<p class="phase-description">${phase.description}</p>` : ''}
        
        ${this.renderNewComponents(phase.key, phaseIndex)}
        
        ${actions.length > 0 ? this.renderPhaseActions(actions, phase) : ''}
        
        ${this.renderPhaseDocuments(phase.key)}
        
        ${this.canAdvancePhase(phaseIndex) ? this.renderAdvanceButton(phaseIndex) : ''}
      </div>
    `;
  }

  renderPhaseActions(actions, phase) {
    return `
      <div class="phase-actions">
        <h5>Required Actions:</h5>
        <div class="actions-list">
          ${actions.map(action => `
            <div class="action-item ${this.isActionCompleted(action.id) ? 'completed' : ''}" 
                 data-action-id="${action.id}">
              <label class="action-checkbox">
                <input type="checkbox" 
                       ${this.isActionCompleted(action.id) ? 'checked' : ''}
                       ${action.is_required ? '' : 'data-optional="true"'}
                       onchange="window.portalApp?.handleActionToggle('${action.id}', this.checked)">
                <span class="checkbox-custom"></span>
              </label>
              <div class="action-content">
                <span class="action-title">${action.action_name}</span>
                ${action.description ? `<p class="action-description">${action.description}</p>` : ''}
                ${action.due_date ? `<span class="action-due">Due: ${this.formatDate(action.due_date)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderPhaseDocuments(phaseKey) {
    const documents = this.getPhaseDocuments(phaseKey);
    if (documents.length === 0) return '';
    
    return `
      <div class="phase-documents">
        <h5>Phase Documents:</h5>
        <div class="documents-list">
          ${documents.map(doc => `
            <div class="document-item">
              <span class="doc-icon">↓</span>
              <span class="doc-name">${doc.name}</span>
              <button class="btn-sm" onclick="window.portalApp?.downloadFile('${doc.id}', '${doc.name}')">
                Download
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderAdvanceButton(currentIndex) {
    const nextPhase = this.options.phases[currentIndex + 1];
    if (!nextPhase) return '';
    
    return `
      <div class="phase-advance">
        <button class="btn-primary advance-phase-btn" 
                onclick="window.portalApp?.requestPhaseAdvance('${this.options.projectId}', ${currentIndex + 1})">
          Advance to ${nextPhase.name || `Phase ${currentIndex + 2}`}
        </button>
      </div>
    `;
  }

  renderError(message) {
    if (!this.options.container) return;
    
    this.options.container.innerHTML = `
      <div class="progress-tracker-error">
        <p>⚠️ ${message}</p>
        <button onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }

  // Status calculation methods
  getPhaseStatus(phaseIndex, currentIndex) {
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    if (phaseIndex === currentIndex + 1) return 'next';
    return 'locked';
  }
  
  getPhaseIcon(phaseKey) {
    // Simple text-based icons without emojis
    const icons = {
      'onboarding': '1',
      'ideation': '2',
      'design': '3',
      'review': '4',
      'production': '5',
      'payment': '6',
      'signoff': '7',
      'delivery': '8'
    };
    return icons[phaseKey] || '•';
  }
  
  setupEventListeners() {
    if (!this.options.container) return;
    const container = this.options.container;
    
    // Handle both tab and node clicks
    const clickableElements = container.querySelectorAll('.phase-tab.clickable, .phase-node.clickable');
    clickableElements.forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const phaseKey = element.dataset.phase;
        const phaseIndex = parseInt(element.dataset.phaseIndex);
        
        // Call the callback
        if (this.options.onPhaseClick) {
          this.options.onPhaseClick(phaseKey, phaseIndex);
        }
        
        // Update display to show clicked phase content
        this.showPhaseContent(phaseIndex);
      });
    });
    
    // Action checkbox handling
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const actionItem = e.target.closest('.action-item');
        if (actionItem) {
          const actionId = actionItem.dataset.actionId;
          if (this.options.onActionComplete) {
            this.options.onActionComplete(actionId, e.target.checked);
          }
        }
      });
    });
  }
  
  showPhaseContent(phaseIndex) {
    const phase = this.options.phases[phaseIndex];
    if (!phase) return;
    
    // Update current phase index for tracking
    this.phaseTracking = this.phaseTracking || {};
    this.phaseTracking.current_phase_index = phaseIndex;
    
    // Re-render the component to update active states
    this.render();
    
    // Re-attach event listeners after re-render
    this.setupEventListeners();
  }

  calculateProgress() {
    if (!this.phaseTracking) return 0;
    const phases = this.getEffectivePhases();
    const totalPhases = phases.length;
    const currentIndex = this.phaseTracking.current_phase_index || 0;
    const phaseProgress = (currentIndex / (totalPhases - 1)) * 100;
    
    // Set CSS variable for progress line
    if (this.options.container) {
      this.options.container.style.setProperty('--progress-width', `${phaseProgress}%`);
      // For mobile vertical layout
      this.options.container.style.setProperty('--progress-height', `${phaseProgress}%`);
    }
    
    // Add progress within current phase
    const effectivePhases = this.getEffectivePhases();
    const currentPhaseActions = this.getPhaseActions(effectivePhases[currentIndex]?.key);
    if (currentPhaseActions.length > 0) {
      const completedActions = currentPhaseActions.filter(a => this.isActionCompleted(a.id));
      const actionProgress = (completedActions.length / currentPhaseActions.length) * (100 / totalPhases);
      return Math.round(phaseProgress + actionProgress);
    }
    
    return Math.round(phaseProgress);
  }

  getPhaseActions(phaseKey) {
    return this.clientActions.filter(action => action.phase_key === phaseKey);
  }

  getPhaseDocuments(phaseKey) {
    // This would be populated from project files with phase metadata
    return [];
  }

  isActionCompleted(actionId) {
    const status = this.phaseTracking?.action_statuses?.find(s => s.action_id === actionId);
    return status?.is_completed || false;
  }

  canAdvancePhase(currentIndex) {
    const currentPhase = this.options.phases[currentIndex];
    if (!currentPhase) return false;
    
    // Check if all required actions are completed
    const actions = this.getPhaseActions(currentPhase.key);
    const requiredActions = actions.filter(a => a.is_required);
    const completedRequired = requiredActions.filter(a => this.isActionCompleted(a.id));
    
    return requiredActions.length === completedRequired.length;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  // New component rendering
  renderNewComponents(phaseKey, phaseIndex) {
    if (!this.options.showNewComponents) return '';
    
    let componentsHTML = '';
    
    // ProofChecklist for review phase
    if (phaseKey === 'review' && this.dynamicComponents.ProofChecklist) {
      componentsHTML += `
        <div class="phase-component proof-checklist-container">
          <h5>Proof Approval Checklist</h5>
          <div id="proof-checklist-${this.options.projectId}" class="component-placeholder">
            <!-- ProofChecklist component will be mounted here -->
          </div>
        </div>
      `;
    }
    
    // BatchStatus for production phase
    if ((phaseKey === 'production' || phaseKey === 'design') && this.dynamicComponents.BatchStatus) {
      componentsHTML += `
        <div class="phase-component batch-status-container">
          <h5>Processing Status</h5>
          <div id="batch-status-${this.options.projectId}" class="component-placeholder">
            <!-- BatchStatus component will be mounted here -->
          </div>
        </div>
      `;
    }
    
    // StagingLink for review and delivery phases
    if ((phaseKey === 'review' || phaseKey === 'delivery') && this.dynamicComponents.StagingLink) {
      componentsHTML += `
        <div class="phase-component staging-link-container">
          <h5>Preview Links</h5>
          <div id="staging-link-${this.options.projectId}" class="component-placeholder">
            <!-- StagingLink component will be mounted here -->
          </div>
        </div>
      `;
    }
    
    return componentsHTML;
  }
  
  // Initialize WebSocket connection
  initializeWebSocket() {
    try {
      this.websocketConnection = window.io();
      
      this.websocketConnection.on('phase_transition', (data) => {
        if (data.project_id === this.options.projectId) {
          this.handlePhaseTransition(data);
        }
      });
      
      this.websocketConnection.on('project_update', (data) => {
        if (data.project_id === this.options.projectId) {
          this.handleProjectUpdate(data);
        }
      });
      
      console.log('ProgressTracker WebSocket initialized');
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
    }
  }
  
  // Initialize new components
  initializeNewComponents() {
    // Mark components as available for rendering
    this.dynamicComponents.ProofChecklist = true;
    this.dynamicComponents.BatchStatus = true;
    this.dynamicComponents.StagingLink = true;
  }
  
  // Handle phase transitions
  handlePhaseTransition(data) {
    console.log('Phase transition received:', data);
    
    // Update phase tracking
    if (this.phaseTracking) {
      this.phaseTracking.current_phase_index = data.to_phase_index;
    }
    
    // Re-render with new phase
    this.render();
    this.setupEventListeners();
    
    // Notify parent application
    if (this.options.onPhaseTransition) {
      this.options.onPhaseTransition(data);
    }
    
    // Show phase transition notification
    this.showPhaseTransitionNotification(data);
  }
  
  // Handle project updates
  handleProjectUpdate(data) {
    console.log('Project update received:', data);
    
    // Update project data
    if (data.tracking) {
      this.phaseTracking = { ...this.phaseTracking, ...data.tracking };
    }
    
    if (data.actions) {
      this.clientActions = data.actions;
    }
    
    // Re-render with updated data
    this.render();
    this.setupEventListeners();
  }
  
  // Show phase transition notification
  showPhaseTransitionNotification(data) {
    const phaseList = this.getEffectivePhases();
    const fromPhase = phaseList[data.from_phase_index];
    const toPhase = phaseList[data.to_phase_index];
    
    if (fromPhase && toPhase) {
      const notification = document.createElement('div');
      notification.className = 'phase-transition-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <span class="notification-icon">🎉</span>
          <div class="notification-text">
            <strong>Phase Advanced!</strong>
            <p>Moved from ${fromPhase.name} to ${toPhase.name}</p>
          </div>
          <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
    }
  }
  
  // Get effective phases (dynamic or default)
  getEffectivePhases() {
    return this.options.dynamicPhases.length > 0 ? this.options.dynamicPhases : this.options.phases;
  }
  
  // Enhanced phase advancement
  async advancePhase(targetPhaseIndex) {
    const currentIndex = this.phaseTracking?.current_phase_index || 0;
    const availablePhases = this.getEffectivePhases();
    
    if (targetPhaseIndex <= currentIndex || targetPhaseIndex >= availablePhases.length) {
      console.warn('Invalid phase advancement target:', targetPhaseIndex);
      return false;
    }
    
    try {
      const response = await fetch(`/api/projects/${this.options.projectId}/advance-phase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target_phase_index: targetPhaseIndex,
          service_type: this.options.serviceType
        })
      });
      
      if (!response.ok) {
        throw new Error(`Phase advancement failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Phase advanced successfully:', result);
      
      return true;
    } catch (error) {
      console.error('Phase advancement error:', error);
      return false;
    }
  }
  
  // Event handling
  attachEventListeners() {
    const container = this.options.container;
    if (!container) return;
    
    // Phase node clicks
    container.querySelectorAll('.phase-node.clickable').forEach(node => {
      node.addEventListener('click', (e) => {
        const phaseKey = e.currentTarget.dataset.phase;
        const phaseIndex = parseInt(e.currentTarget.dataset.phaseIndex);
        this.options.onPhaseClick(phaseKey, phaseIndex);
      });
    });
  }

  // Public methods for external updates
  updateProgress(newPhaseIndex) {
    if (this.phaseTracking) {
      this.phaseTracking.current_phase_index = newPhaseIndex;
      this.render();
    }
  }

  markActionComplete(actionId, isCompleted) {
    if (!this.phaseTracking.action_statuses) {
      this.phaseTracking.action_statuses = [];
    }
    
    const existingStatus = this.phaseTracking.action_statuses.find(s => s.action_id === actionId);
    if (existingStatus) {
      existingStatus.is_completed = isCompleted;
    } else {
      this.phaseTracking.action_statuses.push({
        action_id: actionId,
        is_completed: isCompleted
      });
    }
    
    this.render();
    this.options.onActionComplete(actionId, isCompleted);
  }
}

// Add styles
const style = document.createElement('style');
style.textContent = `
.progress-tracker-container {
  width: 100%;
  margin: 2rem 0;
}

.progress-tracker {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 2rem;
}

/* Remove styling when in tabs mode */
.project-phase-tabs .progress-tracker {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
}

.progress-tracker.loading {
  opacity: 0.6;
  pointer-events: none;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.progress-header h3 {
  margin: 0;
  color: #333;
}

.progress-percentage {
  font-size: 1.2rem;
  font-weight: bold;
  color: #4CAF50;
}

.phase-timeline {
  position: relative;
  margin: 3rem 0;
}

.progress-line {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.phase-nodes {
  position: relative;
  display: flex;
  justify-content: space-between;
}

.phase-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  cursor: default;
  transition: transform 0.2s ease;
}

.phase-node.clickable {
  cursor: pointer;
}

.phase-node.clickable:hover {
  transform: translateY(-2px);
}

.node-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f5f5;
  border: 3px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  position: relative;
  z-index: 2;
}

.phase-node.completed .node-icon {
  background: #4CAF50;
  border-color: #4CAF50;
}

.phase-node.current .node-icon {
  background: #2196F3;
  border-color: #2196F3;
  box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2);
}

.phase-node.next .node-icon {
  background: white;
  border-color: #2196F3;
}

.node-label {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  text-align: center;
  max-width: 100px;
}

.node-check {
  position: absolute;
  top: -5px;
  right: -5px;
  background: white;
  color: #4CAF50;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

.node-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(33, 150, 243, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.phase-details {
  margin-top: 3rem;
}

.current-phase-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.phase-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.phase-title h4 {
  margin: 0;
}

.phase-icon {
  font-size: 1.5rem;
}

.phase-description {
  color: #666;
  margin: 1rem 0;
}

.phase-actions {
  margin: 1.5rem 0;
}

.phase-actions h5 {
  margin-bottom: 1rem;
  color: #333;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-item.completed {
  opacity: 0.6;
  background: #f5f5f5;
}

.action-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.action-checkbox input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
}

.action-checkbox input:checked + .checkbox-custom {
  background: #4CAF50;
  border-color: #4CAF50;
}

.action-checkbox input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.8rem;
}

.action-content {
  flex: 1;
}

.action-title {
  font-weight: 500;
  color: #333;
}

.action-description {
  font-size: 0.9rem;
  color: #666;
  margin: 0.25rem 0;
}

.action-due {
  font-size: 0.85rem;
  color: #999;
}

.phase-documents {
  margin: 1.5rem 0;
}

.phase-documents h5 {
  margin-bottom: 1rem;
  color: #333;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.doc-icon {
  font-size: 1.2rem;
}

.doc-name {
  flex: 1;
  color: #333;
}

.phase-advance {
  margin-top: 2rem;
  text-align: center;
}

.advance-phase-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  gap: 0.5rem;
}

.progress-tracker-error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.progress-tracker-error button {
  margin-top: 1rem;
}

/* New component integration styles */
.phase-component {
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.phase-component h5 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
}

.component-placeholder {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-style: italic;
}

.service-type-indicator {
  text-align: center;
  padding: 0.5rem;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 4px;
  margin-top: 1rem;
  color: #0ea5e9;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Phase transition notification */
.phase-transition-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  border: 1px solid #4CAF50;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  min-width: 300px;
}

.notification-icon {
  font-size: 1.5rem;
}

.notification-text {
  flex: 1;
}

.notification-text strong {
  color: #4CAF50;
  font-size: 1rem;
  display: block;
  margin-bottom: 0.25rem;
}

.notification-text p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: #f5f5f5;
  color: #333;
}

/* Enhanced phase nodes for dynamic navigation */
.phase-node.dynamic {
  transition: all 0.3s ease;
}

.phase-node.dynamic:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.phase-node.dynamic .node-icon {
  transition: all 0.3s ease;
}

.phase-node.dynamic:hover .node-icon {
  box-shadow: 0 0 0 6px rgba(33, 150, 243, 0.15);
}
`;

document.head.appendChild(style);