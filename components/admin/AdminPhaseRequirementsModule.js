class AdminPhaseRequirementsModule {
  constructor(portal) {
    this.portal = portal;
    this.requirements = [];
    this.phases = [
      { key: 'ONB', name: 'Onboarding' },
      { key: 'IDEA', name: 'Ideation' },
      { key: 'DSGN', name: 'Design' },
      { key: 'REV', name: 'Review & Feedback' },
      { key: 'PROD', name: 'Production/Build' },
      { key: 'PAY', name: 'Payment' },
      { key: 'SIGN', name: 'Sign-off & Docs' },
      { key: 'LAUNCH', name: 'Launch' }
    ];
    this.requirementTypes = [
      'form', 'agreement', 'payment', 'review', 
      'approval', 'feedback', 'monitor', 'check',
      'download', 'confirm', 'launch', 'proof'
    ];
  }

  async init() {
    await this.loadRequirements();
    this.setupInterface();
  }

  async loadRequirements() {
    try {
      const response = await fetch('/api/phases/requirements', {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });
      
      const data = await response.json();
      this.requirements = data.requirements || [];
    } catch (error) {
      console.error('Error loading requirements:', error);
      this.portal.showNotification('Failed to load phase requirements', 'error');
    }
  }

  setupInterface() {
    const container = document.getElementById('module-content');
    if (!container) return;

    container.innerHTML = `
      <div class="phase-requirements-admin">
        <div class="module-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h2 style="margin: 0; color: #333;">Phase Requirements Management</h2>
          <button onclick="portal.modules.phaseRequirements.showAddRequirementModal()" 
            style="padding: 0.75rem 1.5rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Add New Requirement
          </button>
        </div>

        <div class="requirements-filters" style="display: flex; gap: 1rem; margin-bottom: 2rem;">
          <select id="phase-filter" onchange="portal.modules.phaseRequirements.filterRequirements()" 
            style="padding: 0.5rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">All Phases</option>
            ${this.phases.map(phase => `
              <option value="${phase.key}">${phase.name}</option>
            `).join('')}
          </select>
          
          <select id="type-filter" onchange="portal.modules.phaseRequirements.filterRequirements()" 
            style="padding: 0.5rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">All Types</option>
            ${this.requirementTypes.map(type => `
              <option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>
            `).join('')}
          </select>
          
          <select id="mandatory-filter" onchange="portal.modules.phaseRequirements.filterRequirements()" 
            style="padding: 0.5rem; border: 1px solid #e9ecef; border-radius: 6px;">
            <option value="">All Requirements</option>
            <option value="true">Mandatory Only</option>
            <option value="false">Optional Only</option>
          </select>
        </div>

        <div id="requirements-list">
          ${this.renderRequirementsList()}
        </div>
      </div>
    `;
  }

  renderRequirementsList() {
    const phaseFilter = document.getElementById('phase-filter')?.value || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const mandatoryFilter = document.getElementById('mandatory-filter')?.value || '';
    
    let filteredRequirements = this.requirements;
    
    if (phaseFilter) {
      filteredRequirements = filteredRequirements.filter(req => req.phase_key === phaseFilter);
    }
    if (typeFilter) {
      filteredRequirements = filteredRequirements.filter(req => req.requirement_type === typeFilter);
    }
    if (mandatoryFilter) {
      filteredRequirements = filteredRequirements.filter(req => 
        req.is_mandatory === (mandatoryFilter === 'true')
      );
    }

    // Group by phase
    const groupedByPhase = {};
    this.phases.forEach(phase => {
      groupedByPhase[phase.key] = {
        name: phase.name,
        requirements: []
      };
    });
    
    filteredRequirements.forEach(req => {
      if (groupedByPhase[req.phase_key]) {
        groupedByPhase[req.phase_key].requirements.push(req);
      }
    });

    return Object.entries(groupedByPhase).map(([phaseKey, phaseData]) => {
      if (phaseData.requirements.length === 0 && phaseFilter) return '';
      
      return `
        <div class="phase-requirements-group" style="margin-bottom: 2rem;">
          <h3 style="color: #666; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e9ecef;">
            ${phaseData.name} (${phaseKey})
            <span style="font-size: 0.875rem; color: #999; margin-left: 1rem;">
              ${phaseData.requirements.length} requirements
            </span>
          </h3>
          
          ${phaseData.requirements.length > 0 ? `
            <div class="requirements-table" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 1rem; text-align: left; color: #666; font-weight: 600;">Requirement</th>
                    <th style="padding: 1rem; text-align: left; color: #666; font-weight: 600;">Type</th>
                    <th style="padding: 1rem; text-align: left; color: #666; font-weight: 600;">Key</th>
                    <th style="padding: 1rem; text-align: center; color: #666; font-weight: 600;">Mandatory</th>
                    <th style="padding: 1rem; text-align: center; color: #666; font-weight: 600;">Order</th>
                    <th style="padding: 1rem; text-align: center; color: #666; font-weight: 600;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${phaseData.requirements.sort((a, b) => a.sort_order - b.sort_order).map(req => `
                    <tr style="border-top: 1px solid #e9ecef;">
                      <td style="padding: 1rem; color: #333;">
                        ${req.requirement_text}
                      </td>
                      <td style="padding: 1rem;">
                        <span style="padding: 0.25rem 0.5rem; background: #e3f2fd; color: #0057FF; border-radius: 4px; font-size: 0.75rem;">
                          ${req.requirement_type}
                        </span>
                      </td>
                      <td style="padding: 1rem; color: #666; font-family: monospace; font-size: 0.875rem;">
                        ${req.requirement_key || '-'}
                      </td>
                      <td style="padding: 1rem; text-align: center;">
                        ${req.is_mandatory ? 
                          '<span style="color: #F7C600;">✓ Required</span>' : 
                          '<span style="color: #999;">Optional</span>'
                        }
                      </td>
                      <td style="padding: 1rem; text-align: center; color: #666;">
                        ${req.sort_order}
                      </td>
                      <td style="padding: 1rem; text-align: center;">
                        <button onclick="portal.modules.phaseRequirements.editRequirement('${req.id}')" 
                          style="padding: 0.25rem 0.75rem; background: white; color: #0057FF; border: 1px solid #0057FF; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                          Edit
                        </button>
                        <button onclick="portal.modules.phaseRequirements.deleteRequirement('${req.id}')" 
                          style="padding: 0.25rem 0.75rem; background: white; color: #E63946; border: 1px solid #E63946; border-radius: 4px; cursor: pointer;">
                          Delete
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <p style="color: #999; padding: 2rem; text-align: center; background: #f8f9fa; border-radius: 8px;">
              No requirements defined for this phase yet.
            </p>
          `}
        </div>
      `;
    }).join('');
  }

  filterRequirements() {
    const container = document.getElementById('requirements-list');
    if (container) {
      container.innerHTML = this.renderRequirementsList();
    }
  }

  showAddRequirementModal() {
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
      <div style="background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; padding: 2rem;">
        <h2 style="margin: 0 0 1.5rem 0; color: #333;">Add New Requirement</h2>
        
        <form id="add-requirement-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Phase*</label>
            <select name="phase_key" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
              <option value="">Select phase...</option>
              ${this.phases.map(phase => `
                <option value="${phase.key}">${phase.name}</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Text*</label>
            <input type="text" name="requirement_text" required 
              placeholder="e.g., Complete intake form" 
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Type*</label>
            <select name="requirement_type" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
              <option value="">Select type...</option>
              ${this.requirementTypes.map(type => `
                <option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Key</label>
            <input type="text" name="requirement_key" 
              placeholder="e.g., intake_form (for programmatic reference)" 
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Sort Order*</label>
            <input type="number" name="sort_order" required value="1" min="1" 
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="is_mandatory" style="margin-right: 0.5rem;">
              <span style="color: #666;">This is a mandatory requirement</span>
            </label>
          </div>
          
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button type="submit" style="flex: 1; padding: 0.75rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
              Add Requirement
            </button>
            <button type="button" onclick="this.closest('.modal').remove()" 
              style="flex: 1; padding: 0.75rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('add-requirement-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        phase_key: formData.get('phase_key'),
        requirement_text: formData.get('requirement_text'),
        requirement_type: formData.get('requirement_type'),
        requirement_key: formData.get('requirement_key'),
        sort_order: parseInt(formData.get('sort_order')),
        is_mandatory: formData.get('is_mandatory') === 'on'
      };

      await this.saveRequirement(data);
      modal.remove();
    });
  }

  async saveRequirement(data) {
    try {
      const response = await fetch('/api/phases/requirements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        this.portal.showNotification('Requirement added successfully', 'success');
        await this.loadRequirements();
        this.setupInterface();
      } else {
        throw new Error('Failed to add requirement');
      }
    } catch (error) {
      console.error('Error saving requirement:', error);
      this.portal.showNotification('Failed to save requirement', 'error');
    }
  }

  async editRequirement(requirementId) {
    const requirement = this.requirements.find(r => r.id === requirementId);
    if (!requirement) return;

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
      <div style="background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; padding: 2rem;">
        <h2 style="margin: 0 0 1.5rem 0; color: #333;">Edit Requirement</h2>
        
        <form id="edit-requirement-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Phase*</label>
            <select name="phase_key" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
              ${this.phases.map(phase => `
                <option value="${phase.key}" ${requirement.phase_key === phase.key ? 'selected' : ''}>
                  ${phase.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Text*</label>
            <input type="text" name="requirement_text" required value="${requirement.requirement_text}"
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Type*</label>
            <select name="requirement_type" required style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
              ${this.requirementTypes.map(type => `
                <option value="${type}" ${requirement.requirement_type === type ? 'selected' : ''}>
                  ${type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Requirement Key</label>
            <input type="text" name="requirement_key" value="${requirement.requirement_key || ''}"
              placeholder="e.g., intake_form (for programmatic reference)" 
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 0.5rem; color: #666; font-weight: 500;">Sort Order*</label>
            <input type="number" name="sort_order" required value="${requirement.sort_order}" min="1" 
              style="width: 100%; padding: 0.75rem; border: 1px solid #e9ecef; border-radius: 6px;">
          </div>
          
          <div>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="checkbox" name="is_mandatory" ${requirement.is_mandatory ? 'checked' : ''} 
                style="margin-right: 0.5rem;">
              <span style="color: #666;">This is a mandatory requirement</span>
            </label>
          </div>
          
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button type="submit" style="flex: 1; padding: 0.75rem; background: #0057FF; color: white; border: none; border-radius: 6px; cursor: pointer;">
              Update Requirement
            </button>
            <button type="button" onclick="this.closest('.modal').remove()" 
              style="flex: 1; padding: 0.75rem; background: white; color: #333; border: 1px solid #e9ecef; border-radius: 6px; cursor: pointer;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle form submission
    document.getElementById('edit-requirement-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        phase_key: formData.get('phase_key'),
        requirement_text: formData.get('requirement_text'),
        requirement_type: formData.get('requirement_type'),
        requirement_key: formData.get('requirement_key'),
        sort_order: parseInt(formData.get('sort_order')),
        is_mandatory: formData.get('is_mandatory') === 'on'
      };

      await this.updateRequirement(requirementId, data);
      modal.remove();
    });
  }

  async updateRequirement(requirementId, data) {
    try {
      const response = await fetch(`/api/phases/requirements/${requirementId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        this.portal.showNotification('Requirement updated successfully', 'success');
        await this.loadRequirements();
        this.setupInterface();
      } else {
        throw new Error('Failed to update requirement');
      }
    } catch (error) {
      console.error('Error updating requirement:', error);
      this.portal.showNotification('Failed to update requirement', 'error');
    }
  }

  async deleteRequirement(requirementId) {
    if (!confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/phases/requirements/${requirementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      if (response.ok) {
        this.portal.showNotification('Requirement deleted successfully', 'success');
        await this.loadRequirements();
        this.setupInterface();
      } else {
        throw new Error('Failed to delete requirement');
      }
    } catch (error) {
      console.error('Error deleting requirement:', error);
      this.portal.showNotification('Failed to delete requirement', 'error');
    }
  }
}

// Export for use in admin portal
window.AdminPhaseRequirementsModule = AdminPhaseRequirementsModule;