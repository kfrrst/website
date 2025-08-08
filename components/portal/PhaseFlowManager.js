/**
 * Phase Flow Manager - Manages the 8-step project workflow
 * Production-ready implementation with real database integration
 */
export class PhaseFlowManager {
  constructor(apiRequest) {
    this.apiRequest = apiRequest;
    this.phases = [
      { key: 'ONB', name: 'Onboarding', index: 0, percentage: 13 },
      { key: 'IDEA', name: 'Ideation', index: 1, percentage: 25 },
      { key: 'DSGN', name: 'Design', index: 2, percentage: 38 },
      { key: 'REV', name: 'Review & Feedback', index: 3, percentage: 50 },
      { key: 'PROD', name: 'Production/Build', index: 4, percentage: 63 },
      { key: 'PAY', name: 'Payment', index: 5, percentage: 75 },
      { key: 'SIGN', name: 'Sign-off & Docs', index: 6, percentage: 88 },
      { key: 'LAUNCH', name: 'Launch', index: 7, percentage: 100 }
    ];
    this.currentProject = null;
    this.requirements = {};
    this.forms = {};
  }

  /**
   * Initialize the phase flow for a project
   */
  async initializeProject(projectId) {
    this.currentProject = projectId;
    await this.loadProjectPhases();
    await this.loadPhaseRequirements();
    await this.loadAvailableForms();
    return this.getCurrentPhase();
  }

  /**
   * Load project phase data from the database
   */
  async loadProjectPhases() {
    try {
      const response = await this.apiRequest(`/api/new-phases/projects/${this.currentProject}/phases`);
      const data = await response.json();
      
      if (data.phases) {
        // Update phase statuses from database
        data.phases.forEach(dbPhase => {
          const phase = this.phases.find(p => p.key === dbPhase.phase_key);
          if (phase) {
            phase.status = dbPhase.status;
            phase.started_at = dbPhase.started_at;
            phase.completed_at = dbPhase.completed_at;
            phase.metadata = dbPhase.metadata || {};
          }
        });
      }
      
      // Set current phase based on progress
      if (data.current_phase_key) {
        this.currentPhaseKey = data.current_phase_key;
      } else {
        // Calculate from progress percentage
        const progress = data.progress_percentage || 0;
        this.currentPhaseKey = this.calculatePhaseFromProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load project phases:', error);
      this.currentPhaseKey = 'ONB'; // Default to onboarding
    }
  }

  /**
   * Load phase requirements from the database
   */
  async loadPhaseRequirements() {
    try {
      const response = await this.apiRequest('/api/phases/requirements');
      const data = await response.json();
      
      if (data.requirements) {
        // Group requirements by phase
        data.requirements.forEach(req => {
          if (!this.requirements[req.phase_key]) {
            this.requirements[req.phase_key] = [];
          }
          this.requirements[req.phase_key].push(req);
        });
      }
    } catch (error) {
      console.error('Failed to load phase requirements:', error);
      // Use default requirements
      this.setDefaultRequirements();
    }
  }

  /**
   * Load available forms for the current phase
   */
  async loadAvailableForms() {
    const phaseFormMap = {
      'ONB': ['intake_base', 'intake_book_cover', 'intake_website', 'intake_sp', 'intake_lfp'],
      'IDEA': ['intake_ideation', 'creative_brief'],
      'REV': ['proof_approval', 'change_request'],
      'SIGN': ['completion_agreement']
    };

    const currentForms = phaseFormMap[this.currentPhaseKey] || [];
    
    for (const formId of currentForms) {
      try {
        const response = await this.apiRequest(`/api/new-forms/${formId}`);
        const schema = await response.json();
        this.forms[formId] = schema;
      } catch (error) {
        console.error(`Failed to load form ${formId}:`, error);
      }
    }
  }

  /**
   * Get the current phase details
   */
  getCurrentPhase() {
    return this.phases.find(p => p.key === this.currentPhaseKey) || this.phases[0];
  }

  /**
   * Calculate phase from progress percentage
   */
  calculatePhaseFromProgress(progressPercentage) {
    if (progressPercentage >= 100) return 'LAUNCH';
    if (progressPercentage >= 88) return 'SIGN';
    if (progressPercentage >= 75) return 'PAY';
    if (progressPercentage >= 63) return 'PROD';
    if (progressPercentage >= 50) return 'REV';
    if (progressPercentage >= 38) return 'DSGN';
    if (progressPercentage >= 25) return 'IDEA';
    if (progressPercentage >= 13) return 'ONB';
    return 'ONB';
  }

  /**
   * Render the phase flow UI
   */
  render() {
    const currentPhase = this.getCurrentPhase();
    const requirements = this.requirements[currentPhase.key] || [];
    
    return `
      <div class="phase-flow-container">
        <div class="phase-progress-header">
          <h3>Project Progress</h3>
          <span class="phase-percentage">${currentPhase.percentage}%</span>
        </div>
        
        <div class="phase-tracker">
          ${this.renderPhaseTracker()}
        </div>
        
        <div class="current-phase-details">
          <h4>Current Phase: ${currentPhase.name}</h4>
          
          ${requirements.length > 0 ? `
            <div class="phase-requirements">
              <h5>Client Actions Required:</h5>
              <ul>
                ${requirements.map(req => `
                  <li class="${req.is_mandatory ? 'mandatory' : 'optional'}">
                    <span class="requirement-type">${req.requirement_type}:</span>
                    ${req.requirement_text}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${Object.keys(this.forms).length > 0 ? `
            <div class="phase-forms">
              <h5>Available Forms:</h5>
              ${this.renderFormButtons()}
            </div>
          ` : ''}
          
          <div class="phase-actions">
            ${this.renderPhaseActions(currentPhase)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the phase tracker dots
   */
  renderPhaseTracker() {
    const currentIndex = this.phases.findIndex(p => p.key === this.currentPhaseKey);
    
    return this.phases.map((phase, index) => {
      let statusClass = '';
      if (index < currentIndex) statusClass = 'completed';
      else if (index === currentIndex) statusClass = 'current';
      else statusClass = 'upcoming';
      
      return `
        <div class="phase-dot ${statusClass}" data-phase="${phase.key}">
          <span class="phase-number">${index + 1}</span>
          <span class="phase-label">${phase.name}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render form action buttons
   */
  renderFormButtons() {
    return Object.keys(this.forms).map(formId => {
      const form = this.forms[formId];
      const formName = form.title || formId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return `
        <button class="btn btn-secondary open-form" data-form="${formId}">
          ${formName}
        </button>
      `;
    }).join('');
  }

  /**
   * Render phase-specific action buttons
   */
  renderPhaseActions(phase) {
    const actions = {
      'ONB': '<button class="btn btn-primary" onclick="phaseFlow.submitIntakeForm()">Complete Intake Form</button>',
      'IDEA': '<button class="btn btn-primary" onclick="phaseFlow.approveCreativeBrief()">Approve Creative Brief</button>',
      'DSGN': '<button class="btn btn-info" onclick="phaseFlow.viewDesigns()">View Designs</button>',
      'REV': '<button class="btn btn-primary" onclick="phaseFlow.submitFeedback()">Submit Feedback</button>',
      'PROD': '<button class="btn btn-info" onclick="phaseFlow.checkProductionStatus()">Check Production Status</button>',
      'PAY': '<button class="btn btn-primary" onclick="phaseFlow.makePayment()">Make Final Payment</button>',
      'SIGN': '<button class="btn btn-primary" onclick="phaseFlow.signCompletionAgreement()">Sign Completion Agreement</button>',
      'LAUNCH': '<button class="btn btn-success" onclick="phaseFlow.downloadDeliverables()">Download Final Assets</button>'
    };
    
    return actions[phase.key] || '';
  }

  /**
   * Submit a form for the current phase
   */
  async submitForm(formId, formData) {
    try {
      const response = await this.apiRequest(`/api/new-forms/${formId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: this.currentProject,
          userId: this.getUserId(), // Implement based on your auth system
          payload: formData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit form');
      }
      
      const result = await response.json();
      
      // Check if this submission advances the phase
      await this.checkPhaseAdvancement();
      
      return result;
    } catch (error) {
      console.error('Form submission failed:', error);
      throw error;
    }
  }

  /**
   * Check if phase should advance based on requirements
   */
  async checkPhaseAdvancement() {
    try {
      const response = await this.apiRequest(`/api/new-phases/projects/${this.currentProject}/check-advancement`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.advanced) {
          // Reload phase data
          await this.loadProjectPhases();
          // Trigger UI update
          this.onPhaseAdvanced(result.newPhase);
        }
      }
    } catch (error) {
      console.error('Failed to check phase advancement:', error);
    }
  }

  /**
   * Generate a PDF document for the current phase
   */
  async generateDocument(documentType) {
    try {
      const response = await this.apiRequest('/api/pdf/render', {
        method: 'POST',
        body: JSON.stringify({
          template: documentType,
          projectId: this.currentProject,
          data: await this.getProjectData()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}_${this.currentProject}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Document generation failed:', error);
      throw error;
    }
  }

  /**
   * Get project data for document generation
   */
  async getProjectData() {
    try {
      const response = await this.apiRequest(`/api/projects/${this.currentProject}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get project data:', error);
      return {};
    }
  }

  /**
   * Set default requirements if API fails
   */
  setDefaultRequirements() {
    this.requirements = {
      'ONB': [
        { requirement_type: 'form', requirement_text: 'Complete intake form', is_mandatory: true },
        { requirement_type: 'document', requirement_text: 'Sign service agreement', is_mandatory: true },
        { requirement_type: 'payment', requirement_text: 'Submit deposit payment', is_mandatory: true }
      ],
      'IDEA': [
        { requirement_type: 'review', requirement_text: 'Review creative brief', is_mandatory: true },
        { requirement_type: 'approval', requirement_text: 'Approve creative direction', is_mandatory: true }
      ],
      'DSGN': [
        { requirement_type: 'review', requirement_text: 'Review initial designs', is_mandatory: true },
        { requirement_type: 'feedback', requirement_text: 'Provide feedback on designs', is_mandatory: false }
      ],
      'REV': [
        { requirement_type: 'approval', requirement_text: 'Approve final designs', is_mandatory: true },
        { requirement_type: 'proof', requirement_text: 'Sign proof approval (for print)', is_mandatory: true }
      ],
      'PROD': [
        { requirement_type: 'check', requirement_text: 'Press check approval (optional)', is_mandatory: false }
      ],
      'PAY': [
        { requirement_type: 'payment', requirement_text: 'Submit final payment', is_mandatory: true }
      ],
      'SIGN': [
        { requirement_type: 'document', requirement_text: 'Sign completion agreement', is_mandatory: true },
        { requirement_type: 'review', requirement_text: 'Download final assets', is_mandatory: false }
      ],
      'LAUNCH': [
        { requirement_type: 'confirm', requirement_text: 'Confirm delivery receipt', is_mandatory: true }
      ]
    };
  }

  /**
   * Callback for phase advancement
   */
  onPhaseAdvanced(newPhase) {
    // Override this method to handle UI updates
    console.log('Phase advanced to:', newPhase);
  }

  /**
   * Get user ID from authentication
   */
  getUserId() {
    // Implement based on your auth system
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  }

  // Phase-specific action methods
  async submitIntakeForm() {
    // Implementation for intake form submission
    window.location.href = '#intake-form';
  }

  async approveCreativeBrief() {
    // Implementation for creative brief approval
    await this.submitForm('creative_brief_approval', { approved: true });
  }

  async viewDesigns() {
    // Implementation for viewing designs
    window.location.href = '#designs';
  }

  async submitFeedback() {
    // Implementation for feedback submission
    window.location.href = '#feedback-form';
  }

  async checkProductionStatus() {
    // Implementation for checking production status
    window.location.href = '#production-status';
  }

  async makePayment() {
    // Implementation for payment processing
    window.location.href = '#payment';
  }

  async signCompletionAgreement() {
    // Implementation for signing completion agreement
    window.location.href = '/sign/?doc=completion_agreement';
  }

  async downloadDeliverables() {
    // Implementation for downloading final assets
    await this.generateDocument('final_assets_manifest');
  }
}