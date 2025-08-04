/**
 * IntakeWizard Component
 * Used in ONB (Onboarding) phase for initial project kickoff
 */
export class IntakeWizard {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.currentStep = 0;
    this.formData = {};
    this.steps = [
      { id: 'contact', title: 'Contact Information', icon: '📞' },
      { id: 'project', title: 'Project Details', icon: '📋' },
      { id: 'goals', title: 'Goals & Timeline', icon: '🎯' },
      { id: 'budget', title: 'Budget & Scope', icon: '💰' },
      { id: 'review', title: 'Review & Submit', icon: '✅' }
    ];
  }

  async render(container) {
    container.innerHTML = `
      <div class="intake-wizard">
        <div class="wizard-header">
          <h2>Project Intake Form</h2>
          <p>Let's gather some initial information about your project</p>
        </div>

        <div class="wizard-progress">
          ${this.renderProgressSteps()}
        </div>

        <div class="wizard-content">
          <div id="wizard-step-content">
            ${this.renderCurrentStep()}
          </div>
        </div>

        <div class="wizard-actions">
          <button class="btn-secondary" onclick="window.portal.modules.phases.intakeWizard.previousStep()" 
                  ${this.currentStep === 0 ? 'disabled' : ''}>
            Previous
          </button>
          <button class="btn-primary" onclick="window.portal.modules.phases.intakeWizard.nextStep()">
            ${this.currentStep === this.steps.length - 1 ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>
    `;
  }

  renderProgressSteps() {
    return `
      <div class="wizard-steps">
        ${this.steps.map((step, index) => `
          <div class="wizard-step ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}">
            <div class="step-number">${index + 1}</div>
            <div class="step-info">
              <div class="step-icon">${step.icon}</div>
              <div class="step-title">${step.title}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderCurrentStep() {
    const step = this.steps[this.currentStep];
    
    switch (step.id) {
      case 'contact':
        return this.renderContactStep();
      case 'project':
        return this.renderProjectStep();
      case 'goals':
        return this.renderGoalsStep();
      case 'budget':
        return this.renderBudgetStep();
      case 'review':
        return this.renderReviewStep();
      default:
        return '<p>Step not found</p>';
    }
  }

  renderContactStep() {
    return `
      <div class="wizard-step-content">
        <h3>Contact Information</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Company Name</label>
            <input type="text" id="company_name" value="${this.formData.company_name || ''}" 
                   placeholder="Your company name">
          </div>
          <div class="form-group">
            <label>Primary Contact</label>
            <input type="text" id="contact_name" value="${this.formData.contact_name || ''}" 
                   placeholder="Your name">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="phone" value="${this.formData.phone || ''}" 
                   placeholder="(555) 123-4567">
          </div>
          <div class="form-group">
            <label>Preferred Communication</label>
            <select id="preferred_contact">
              <option value="email" ${this.formData.preferred_contact === 'email' ? 'selected' : ''}>Email</option>
              <option value="phone" ${this.formData.preferred_contact === 'phone' ? 'selected' : ''}>Phone</option>
              <option value="text" ${this.formData.preferred_contact === 'text' ? 'selected' : ''}>Text</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  renderProjectStep() {
    return `
      <div class="wizard-step-content">
        <h3>Project Details</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Project Name</label>
            <input type="text" id="project_name" value="${this.formData.project_name || ''}" 
                   placeholder="Give your project a name">
          </div>
          <div class="form-group full-width">
            <label>Project Description</label>
            <textarea id="project_description" rows="4" 
                      placeholder="Tell us about your project">${this.formData.project_description || ''}</textarea>
          </div>
          <div class="form-group full-width">
            <label>Services Needed</label>
            <div class="checkbox-group">
              ${this.renderServiceCheckboxes()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderServiceCheckboxes() {
    const services = [
      { code: 'SP', label: 'Screen Printing' },
      { code: 'WEB', label: 'Website Design' },
      { code: 'LOGO', label: 'Logo Design' },
      { code: 'GD', label: 'Graphic Design' },
      { code: 'SAAS', label: 'Software Development' }
    ];

    return services.map(service => `
      <label class="checkbox-label">
        <input type="checkbox" value="${service.code}" 
               ${this.formData.services?.includes(service.code) ? 'checked' : ''}>
        <span>${service.label}</span>
      </label>
    `).join('');
  }

  renderGoalsStep() {
    return `
      <div class="wizard-step-content">
        <h3>Goals & Timeline</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Project Goals</label>
            <textarea id="project_goals" rows="4" 
                      placeholder="What are your main objectives?">${this.formData.project_goals || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Desired Start Date</label>
            <input type="date" id="start_date" value="${this.formData.start_date || ''}">
          </div>
          <div class="form-group">
            <label>Target Completion</label>
            <input type="date" id="end_date" value="${this.formData.end_date || ''}">
          </div>
          <div class="form-group full-width">
            <label>Timeline Flexibility</label>
            <select id="timeline_flexibility">
              <option value="fixed" ${this.formData.timeline_flexibility === 'fixed' ? 'selected' : ''}>Fixed deadline</option>
              <option value="flexible" ${this.formData.timeline_flexibility === 'flexible' ? 'selected' : ''}>Some flexibility</option>
              <option value="open" ${this.formData.timeline_flexibility === 'open' ? 'selected' : ''}>Open timeline</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  renderBudgetStep() {
    return `
      <div class="wizard-step-content">
        <h3>Budget & Scope</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Budget Range</label>
            <select id="budget_range">
              <option value="">Select a range</option>
              <option value="1000-2500" ${this.formData.budget_range === '1000-2500' ? 'selected' : ''}>$1,000 - $2,500</option>
              <option value="2500-5000" ${this.formData.budget_range === '2500-5000' ? 'selected' : ''}>$2,500 - $5,000</option>
              <option value="5000-10000" ${this.formData.budget_range === '5000-10000' ? 'selected' : ''}>$5,000 - $10,000</option>
              <option value="10000+" ${this.formData.budget_range === '10000+' ? 'selected' : ''}>$10,000+</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Additional Information</label>
            <textarea id="additional_info" rows="4" 
                      placeholder="Any specific requirements or constraints?">${this.formData.additional_info || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderReviewStep() {
    return `
      <div class="wizard-step-content">
        <h3>Review Your Information</h3>
        <div class="review-summary">
          <div class="review-section">
            <h4>Contact Information</h4>
            <p><strong>Company:</strong> ${this.formData.company_name || 'Not provided'}</p>
            <p><strong>Contact:</strong> ${this.formData.contact_name || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${this.formData.phone || 'Not provided'}</p>
          </div>
          
          <div class="review-section">
            <h4>Project Details</h4>
            <p><strong>Project Name:</strong> ${this.formData.project_name || 'Not provided'}</p>
            <p><strong>Description:</strong> ${this.formData.project_description || 'Not provided'}</p>
            <p><strong>Services:</strong> ${this.formData.services?.join(', ') || 'None selected'}</p>
          </div>
          
          <div class="review-section">
            <h4>Timeline & Budget</h4>
            <p><strong>Start Date:</strong> ${this.formData.start_date || 'Not specified'}</p>
            <p><strong>End Date:</strong> ${this.formData.end_date || 'Not specified'}</p>
            <p><strong>Budget:</strong> ${this.formData.budget_range || 'Not specified'}</p>
          </div>
        </div>
      </div>
    `;
  }

  async nextStep() {
    // Save current step data
    this.saveCurrentStepData();

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateStepContent();
    } else {
      // Submit form
      await this.submitForm();
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateStepContent();
    }
  }

  saveCurrentStepData() {
    const step = this.steps[this.currentStep];
    
    switch (step.id) {
      case 'contact':
        this.formData.company_name = document.getElementById('company_name')?.value || '';
        this.formData.contact_name = document.getElementById('contact_name')?.value || '';
        this.formData.phone = document.getElementById('phone')?.value || '';
        this.formData.preferred_contact = document.getElementById('preferred_contact')?.value || '';
        break;
        
      case 'project':
        this.formData.project_name = document.getElementById('project_name')?.value || '';
        this.formData.project_description = document.getElementById('project_description')?.value || '';
        
        // Get selected services
        const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
        this.formData.services = Array.from(checkboxes).map(cb => cb.value);
        break;
        
      case 'goals':
        this.formData.project_goals = document.getElementById('project_goals')?.value || '';
        this.formData.start_date = document.getElementById('start_date')?.value || '';
        this.formData.end_date = document.getElementById('end_date')?.value || '';
        this.formData.timeline_flexibility = document.getElementById('timeline_flexibility')?.value || '';
        break;
        
      case 'budget':
        this.formData.budget_range = document.getElementById('budget_range')?.value || '';
        this.formData.additional_info = document.getElementById('additional_info')?.value || '';
        break;
    }
  }

  updateStepContent() {
    const container = document.querySelector('.intake-wizard');
    if (container) {
      this.render(container.parentElement);
    }
  }

  async submitForm() {
    try {
      this.portal.showNotification('Submitting intake form...', 'info');
      
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: this.projectId,
          phase_key: 'ONB',
          module_id: 'intake_base',
          payload: this.formData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Intake form submitted successfully!', 'success');
        
        // Refresh project data
        if (this.portal.modules.projects) {
          await this.portal.modules.projects.loadProject(this.projectId);
        }
      } else {
        throw new Error(data.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting intake form:', error);
      this.portal.showNotification('Failed to submit form. Please try again.', 'error');
    }
  }
}

export default IntakeWizard;