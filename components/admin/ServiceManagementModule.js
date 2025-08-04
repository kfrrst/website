/**
 * Service Management Module
 * Handles service types, phases, forms, and documents UI
 */

import { BaseAdminModule } from './BaseAdminModule.js';
import { FormBuilder } from './FormBuilder.js';

export class ServiceManagementModule extends BaseAdminModule {
  constructor(adminPortal) {
    super(adminPortal, 'ServiceManagementModule');
    this.currentTab = 'services';
    this.selectedFormModule = null;
    this.formBuilder = null;
  }

  async initialize() {
    console.log('Initializing Service Management Module');
    this.attachEventListeners();
    await this.loadServiceTypes();
  }

  attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.service-manager-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  async switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.service-manager-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Show current tab
    document.getElementById(`${tab}-tab`).style.display = 'block';

    // Load tab data
    switch (tab) {
      case 'services':
        await this.loadServiceTypes();
        break;
      case 'phases':
        await this.loadPhases();
        break;
      case 'forms':
        await this.loadFormModules();
        break;
      case 'documents':
        await this.loadDocumentTemplates();
        break;
    }
  }

  // Service Types Management
  async loadServiceTypes() {
    try {
      const response = await this.fetchWithAuth('/api/forms/service-types');
      const data = await response.json();

      if (data.success) {
        this.renderServiceTypes(data.serviceTypes);
      }
    } catch (error) {
      console.error('Error loading service types:', error);
      this.showMessage('Failed to load service types', 'error');
    }
  }

  renderServiceTypes(serviceTypes) {
    const container = document.getElementById('service-types-list');
    
    container.innerHTML = serviceTypes.map(service => `
      <div class="service-card" data-code="${service.code}">
        <div class="service-header">
          <h4>${service.display_name}</h4>
          <span class="service-code">${service.code}</span>
        </div>
        <p class="service-description">${service.description || 'No description'}</p>
        <div class="service-phases">
          <strong>Default Phases:</strong>
          <div class="phase-tags">
            ${service.default_phase_keys.map(key => `<span class="phase-tag">${key}</span>`).join('')}
          </div>
        </div>
        <div class="service-actions">
          <button class="btn-link" onclick="window.adminPortal.serviceManager.editServiceType('${service.code}')">Edit</button>
          <button class="btn-link danger" onclick="window.adminPortal.serviceManager.toggleServiceType('${service.code}', ${service.is_active})">
            ${service.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    `).join('');
  }

  async editServiceType(code) {
    try {
      const response = await this.fetchWithAuth(`/api/forms/service-types/${code}`);
      const data = await response.json();
      
      if (data.success) {
        this.showServiceTypeModal(data.serviceType);
      }
    } catch (error) {
      console.error('Error loading service type:', error);
      this.showMessage('Failed to load service type', 'error');
    }
  }

  async toggleServiceType(code, currentStatus) {
    try {
      const response = await this.fetchWithAuth(
        `/api/forms/service-types/${code}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ is_active: !currentStatus })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        this.showMessage(`Service type ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
        await this.loadServiceTypes();
      } else {
        throw new Error(data.error || 'Failed to toggle service type');
      }
    } catch (error) {
      console.error('Error toggling service type:', error);
      this.showMessage(error.message || 'Failed to toggle service type', 'error');
    }
  }

  // Phase Library Management
  async loadPhases() {
    try {
      const response = await this.fetchWithAuth('/api/forms/phases');
      const data = await response.json();
      
      if (data.success) {
        this.renderPhases(data.phases);
      } else {
        throw new Error(data.error || 'Failed to load phases');
      }
    } catch (error) {
      console.error('Error loading phases:', error);
      this.showMessage('Failed to load phases', 'error');
    }
  }

  renderPhases(phases) {
    const container = document.getElementById('phases-list');
    
    container.innerHTML = phases.map(phase => `
      <div class="phase-card" data-key="${phase.key}">
        <div class="phase-header">
          <div class="phase-icon">${this.getPhaseIcon(phase.icon)}</div>
          <div>
            <h4>${phase.label}</h4>
            <span class="phase-key">${phase.key}</span>
          </div>
        </div>
        <p class="phase-description">${phase.description || 'No description'}</p>
        <div class="phase-modules">
          <div class="module-section">
            <strong>UI Components:</strong>
            <div class="component-tags">
              ${(phase.ui_components || []).map(comp => `<span class="component-tag">${comp}</span>`).join('') || '<em>None</em>'}
            </div>
          </div>
          <div class="module-section">
            <strong>Form Modules:</strong>
            <div class="module-tags">
              ${(phase.form_modules || []).map(mod => `<span class="module-tag">${mod}</span>`).join('') || '<em>None</em>'}
            </div>
          </div>
        </div>
        <div class="phase-actions">
          <button class="btn-link" onclick="window.adminPortal.serviceManager.editPhase('${phase.key}')">Edit</button>
        </div>
      </div>
    `).join('');
  }

  getPhaseIcon(iconName) {
    // Map icon names to actual icons or emojis
    const iconMap = {
      'user-plus': '👤',
      'users': '👥',
      'lightbulb': '💡',
      'search': '🔍',
      'compass': '🧭',
      'palette': '🎨',
      'box': '📦',
      'file-check': '✓',
      'printer': '🖨',
      'package': '📦',
      'code': '💻',
      'bug': '🐛',
      'hammer': '🔨',
      'sparkles': '✨',
      'rocket': '🚀',
      'message-circle': '💬',
      'party-popper': '🎉',
      'check-circle': '✅'
    };
    
    return iconMap[iconName] || '📋';
  }

  async editPhase(key) {
    try {
      const response = await this.fetchWithAuth(`/api/forms/phases/${key}`);
      const data = await response.json();
      
      if (data.success) {
        this.showPhaseModal(data.phase);
      }
    } catch (error) {
      console.error('Error loading phase:', error);
      this.showMessage('Failed to load phase', 'error');
    }
  }

  // Form Modules Management
  async loadFormModules() {
    try {
      const response = await this.fetchWithAuth('/api/forms/modules');
      const data = await response.json();

      if (data.success) {
        this.renderFormModules(data.modules);
      }
    } catch (error) {
      console.error('Error loading form modules:', error);
      this.showMessage('Failed to load form modules', 'error');
    }
  }

  renderFormModules(modules) {
    const sidebar = document.getElementById('form-modules-list');
    
    sidebar.innerHTML = modules.map(module => `
      <div class="module-item ${this.selectedFormModule?.module_id === module.module_id ? 'active' : ''}" 
           data-module-id="${module.module_id}"
           onclick="window.adminPortal.serviceManager.selectFormModule('${module.module_id}')">
        <div class="module-header">
          <h5>${module.name}</h5>
          <span class="module-version">v${module.version}</span>
        </div>
        <p class="module-description">${module.description || 'No description'}</p>
        <div class="module-meta">
          <span class="usage-count">${module.usage_count} uses</span>
          ${module.service_filters ? `<span class="service-filter">${module.service_filters.join(', ')}</span>` : ''}
        </div>
      </div>
    `).join('');

    // Store modules for later reference
    this.formModules = modules;
  }

  async selectFormModule(moduleId) {
    const module = this.formModules.find(m => m.module_id === moduleId);
    if (!module) return;

    this.selectedFormModule = module;
    
    // Update UI
    document.querySelectorAll('.module-item').forEach(item => {
      item.classList.toggle('active', item.dataset.moduleId === moduleId);
    });

    // Show form builder
    this.showFormBuilder(module);
  }

  showFormBuilder(module) {
    const container = document.getElementById('form-builder');
    
    // Create module settings header
    container.innerHTML = `
      <div class="form-module-settings">
        <div class="module-settings-header">
          <h3>Edit Form Module: ${module.name}</h3>
          <div class="module-actions">
            <button class="btn-secondary" onclick="window.adminPortal.serviceManager.saveFormModule()">Save Module</button>
          </div>
        </div>
        
        <div class="module-settings-content">
          <div class="settings-row">
            <div class="form-group">
              <label>Module ID</label>
              <input type="text" id="module-id" class="form-control" value="${module.module_id}" readonly>
            </div>
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="module-name" class="form-control" value="${module.name}">
            </div>
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea id="module-description" class="form-control" rows="2">${module.description || ''}</textarea>
          </div>
          
          <div class="settings-row">
            <div class="form-group">
              <label>Service Filters</label>
              <select id="module-services" class="form-control" multiple>
                <option value="">All Services</option>
                ${this.renderServiceOptions(module.service_filters)}
              </select>
            </div>
            <div class="form-group">
              <label>Phase Filters</label>
              <select id="module-phases" class="form-control" multiple>
                <option value="">All Phases</option>
                ${this.renderPhaseOptions(module.phase_filters)}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div id="visual-form-builder-container"></div>
    `;
    
    // Initialize the visual FormBuilder component
    this.initializeVisualFormBuilder(module);
  }

  initializeVisualFormBuilder(module) {
    // Create FormBuilder instance with module data
    this.formBuilder = new FormBuilder('visual-form-builder-container', {
      onSave: (formData) => {
        this.updateModuleSchema(formData);
      },
      onPreview: (formData) => {
        this.previewModuleForm(formData);
      },
      onFieldAdd: (fieldKey, fieldSchema) => {
        console.log(`Field added: ${fieldKey}`, fieldSchema);
      },
      onFieldRemove: (fieldKey) => {
        console.log(`Field removed: ${fieldKey}`);
      },
      showPreview: true,
      allowAdvanced: true
    });
    
    // Load module data into form builder
    const formData = {
      id: module.module_id,
      name: module.name,
      description: module.description || '',
      schema: module.schema || { type: 'object', properties: {}, required: [] },
      uiSchema: module.ui_schema || {},
      formData: {}
    };
    
    this.formBuilder.loadForm(formData);
    this.formBuilder.init();
  }

  updateModuleSchema(formData) {
    // Update the current module with form builder data
    if (this.selectedFormModule) {
      this.selectedFormModule.schema = formData.schema;
      this.selectedFormModule.ui_schema = formData.uiSchema;
      this.selectedFormModule.name = formData.name;
      this.selectedFormModule.description = formData.description;
      
      console.log('Module schema updated from visual form builder', formData);
    }
  }

  previewModuleForm(formData) {
    // Show preview using existing preview functionality
    this.showFormPreviewModal(formData.schema, formData.uiSchema);
  }

  async renderServiceOptions(selected = []) {
    try {
      const response = await this.fetchWithAuth('/api/forms/service-types');
      const data = await response.json();
      
      if (data.success) {
        return data.serviceTypes.map(service => 
          `<option value="${service.code}" ${selected?.includes(service.code) ? 'selected' : ''}>${service.code} - ${service.display_name}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error loading service options:', error);
    }
    
    // Fallback to known services
    const services = ['SP', 'LFP', 'GD', 'WW', 'SAAS', 'WEB', 'BOOK', 'LOGO', 'PY', 'COL', 'IDE'];
    return services.map(code => 
      `<option value="${code}" ${selected?.includes(code) ? 'selected' : ''}>${code}</option>`
    ).join('');
  }

  async renderPhaseOptions(selected = []) {
    try {
      const response = await this.fetchWithAuth('/api/forms/phases');
      const data = await response.json();
      
      if (data.success) {
        return data.phases.map(phase => 
          `<option value="${phase.key}" ${selected?.includes(phase.key) ? 'selected' : ''}>${phase.key} - ${phase.label}</option>`
        ).join('');
      } else {
        throw new Error('Failed to load phases');
      }
    } catch (error) {
      console.error('Error loading phase options:', error);
      // Fallback to basic phases
      const phases = [
        { key: 'ONB', label: 'Onboarding' },
        { key: 'IDEA', label: 'Ideation' },
        { key: 'DISC', label: 'Discovery' },
        { key: 'DSGN', label: 'Design' },
        { key: 'REV', label: 'Review' },
        { key: 'LAUNCH', label: 'Launch' },
        { key: 'WRAP', label: 'Wrap-up' }
      ];
      return phases.map(phase => 
        `<option value="${phase.key}" ${selected?.includes(phase.key) ? 'selected' : ''}>${phase.key} - ${phase.label}</option>`
      ).join('');
    }
  }

  // Note: addField() and humanizeKey() methods have been replaced by the visual FormBuilder component

  async previewForm() {
    try {
      // Get data from visual form builder if available
      if (this.formBuilder) {
        const formData = this.formBuilder.getFormData();
        this.showFormPreviewModal(formData.schema, formData.uiSchema);
      } else {
        // Fallback to textarea method for compatibility
        const schema = JSON.parse(document.getElementById('module-schema').value);
        const uiSchema = JSON.parse(document.getElementById('module-ui-schema').value || '{}');
        this.showFormPreviewModal(schema, uiSchema);
      }
    } catch (error) {
      this.showMessage('Unable to preview form. Please check the form configuration.', 'error');
    }
  }

  showFormPreviewModal(schema, uiSchema) {
    const modalHtml = `
      <div class="modal-overlay" id="form-preview-modal">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Form Preview</h2>
            <button class="modal-close" onclick="document.getElementById('form-preview-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div id="form-preview-container"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Load FormRenderer if not already loaded
    if (!window.FormRenderer) {
      const script = document.createElement('script');
      script.src = '/components/FormRenderer.js';
      script.onload = () => {
        this.renderFormPreview(schema, uiSchema);
      };
      document.head.appendChild(script);
    } else {
      this.renderFormPreview(schema, uiSchema);
    }
  }

  renderFormPreview(schema, uiSchema) {
    const renderer = new FormRenderer('form-preview-container', {
      readOnly: false,
      onSubmit: (data) => {
        console.log('Preview form data:', data);
        this.showMessage('Form submitted (preview only)', 'info');
      }
    });
    
    renderer.setSchema(schema, uiSchema);
    renderer.render();
  }

  async saveFormModule() {
    try {
      // Get data from both the form builder and module settings
      const formBuilderData = this.formBuilder ? this.formBuilder.getFormData() : null;
      
      const moduleData = {
        name: document.getElementById('module-name').value,
        description: document.getElementById('module-description').value,
        schema: formBuilderData ? formBuilderData.schema : this.selectedFormModule.schema,
        ui_schema: formBuilderData ? formBuilderData.uiSchema : (this.selectedFormModule.ui_schema || {}),
        service_filters: Array.from(document.getElementById('module-services').selectedOptions)
          .map(opt => opt.value).filter(Boolean) || null,
        phase_filters: Array.from(document.getElementById('module-phases').selectedOptions)
          .map(opt => opt.value).filter(Boolean) || null
      };

      const response = await this.fetchWithAuth(
        `/api/forms/modules/${this.selectedFormModule.module_id}`,
        {
          method: 'PUT',
          body: JSON.stringify(moduleData)
        }
      );

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Form module updated successfully', 'success');
        
        // Update the selected module with new data
        Object.assign(this.selectedFormModule, moduleData);
        
        await this.loadFormModules();
      } else {
        throw new Error(data.error || 'Failed to save form module');
      }
    } catch (error) {
      console.error('Error saving form module:', error);
      this.showMessage(error.message || 'Failed to save form module', 'error');
    }
  }

  // Document Templates Management
  async loadDocumentTemplates() {
    try {
      const response = await this.fetchWithAuth('/api/forms/document-templates');
      const data = await response.json();

      if (data.success) {
        this.renderDocumentTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading document templates:', error);
      this.showMessage('Failed to load document templates', 'error');
    }
  }

  renderDocumentTemplates(templates) {
    const container = document.getElementById('document-templates-list');
    
    if (templates.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No document templates yet. Create your first template to get started.</p>';
      return;
    }
    
    container.innerHTML = templates.map(template => `
      <div class="template-card" data-template-id="${template.template_id}">
        <div class="template-header">
          <h4>${template.name}</h4>
          <span class="template-version">v${template.version}</span>
        </div>
        <p class="template-description">${template.description || 'No description'}</p>
        <div class="template-meta">
          <div class="template-services">
            <strong>Services:</strong>
            ${template.service_filters ? template.service_filters.map(s => `<span class="service-tag">${s}</span>`).join('') : '<em>All</em>'}
          </div>
          <div class="template-phases">
            <strong>Phases:</strong>
            ${template.phase_filters ? template.phase_filters.map(p => `<span class="phase-tag">${p}</span>`).join('') : '<em>All</em>'}
          </div>
        </div>
        <div class="template-actions">
          <button class="btn-link" onclick="window.adminPortal.serviceManager.editDocumentTemplate('${template.template_id}')">Edit</button>
          <button class="btn-link" onclick="window.adminPortal.serviceManager.previewDocument('${template.template_id}')">Preview</button>
          <button class="btn-link danger" onclick="window.adminPortal.serviceManager.deleteDocumentTemplate('${template.template_id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  // Modal Methods
  showServiceTypeModal(service = null) {
    const modalHtml = `
      <div class="modal-overlay" id="service-type-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${service ? 'Edit' : 'Add'} Service Type</h2>
            <button class="modal-close" onclick="document.getElementById('service-type-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="service-type-form">
              <div class="form-group">
                <label>Service Code</label>
                <input type="text" name="code" class="form-control" 
                       value="${service?.code || ''}" 
                       ${service ? 'readonly' : ''}
                       placeholder="e.g., SP, WEB, LOGO"
                       maxlength="10" required>
                <small>Short code (max 10 characters)</small>
              </div>
              <div class="form-group">
                <label>Display Name</label>
                <input type="text" name="display_name" class="form-control" 
                       value="${service?.display_name || ''}" 
                       placeholder="e.g., Screen Printing" required>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="form-control" rows="3"
                          placeholder="Brief description of this service type">${service?.description || ''}</textarea>
              </div>
              <div class="form-group">
                <label>Default Phases</label>
                <div class="phase-selector">
                  ${this.renderPhaseCheckboxes(service?.default_phase_keys)}
                </div>
              </div>
              <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" class="form-control" 
                       value="${service?.sort_order || 0}" min="0">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('service-type-modal').remove()">Cancel</button>
            <button class="btn-primary" onclick="window.adminPortal.serviceManager.saveServiceType(${service ? `'${service.code}'` : 'null'})">
              ${service ? 'Update' : 'Create'} Service Type
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async renderPhaseCheckboxes(selected = []) {
    try {
      const response = await this.fetchWithAuth('/api/forms/phases');
      const data = await response.json();
      
      if (data.success) {
        return data.phases.map(phase => `
          <label class="checkbox-label">
            <input type="checkbox" name="phases" value="${phase.key}" 
                   ${selected.includes(phase.key) ? 'checked' : ''}>
            <span>${phase.label} (${phase.key})</span>
          </label>
        `).join('');
      } else {
        throw new Error('Failed to load phases');
      }
    } catch (error) {
      console.error('Error loading phases:', error);
      // Fallback
      const phases = [
        { key: 'ONB', label: 'Onboarding' },
        { key: 'IDEA', label: 'Ideation' },
        { key: 'DISC', label: 'Discovery' },
        { key: 'DSGN', label: 'Design' },
        { key: 'REV', label: 'Review' },
        { key: 'LAUNCH', label: 'Launch' },
        { key: 'WRAP', label: 'Wrap-up' }
      ];
      
      return phases.map(phase => `
        <label class="checkbox-label">
          <input type="checkbox" name="phases" value="${phase.key}" 
                 ${selected.includes(phase.key) ? 'checked' : ''}>
          <span>${phase.label} (${phase.key})</span>
        </label>
      `).join('');
    }
  }

  async saveServiceType(code = null) {
    try {
      const form = document.getElementById('service-type-form');
      const formData = new FormData(form);
      
      const serviceData = {
        code: formData.get('code'),
        display_name: formData.get('display_name'),
        description: formData.get('description'),
        default_phase_keys: Array.from(form.querySelectorAll('input[name="phases"]:checked'))
          .map(cb => cb.value),
        sort_order: parseInt(formData.get('sort_order')) || 0
      };

      const url = code 
        ? `/api/forms/service-types/${code}`
        : '/api/forms/service-types';
      
      const method = code ? 'PUT' : 'POST';

      const response = await this.fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(serviceData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage(`Service type ${code ? 'updated' : 'created'} successfully`, 'success');
        document.getElementById('service-type-modal').remove();
        await this.loadServiceTypes();
      } else {
        throw new Error(data.error || 'Failed to save service type');
      }
    } catch (error) {
      console.error('Error saving service type:', error);
      this.showMessage(error.message || 'Failed to save service type', 'error');
    }
  }

  showFormModuleModal() {
    const modalHtml = `
      <div class="modal-overlay" id="form-module-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Create Form Module</h2>
            <button class="modal-close" onclick="document.getElementById('form-module-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="form-module-form">
              <div class="form-group">
                <label>Module ID</label>
                <input type="text" name="module_id" class="form-control" 
                       placeholder="e.g., intake_woodworking" 
                       pattern="[a-z0-9_]+" required>
                <small>Lowercase letters, numbers, and underscores only</small>
              </div>
              <div class="form-group">
                <label>Name</label>
                <input type="text" name="name" class="form-control" 
                       placeholder="e.g., Woodworking Intake Form" required>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="form-control" rows="2"
                          placeholder="Brief description of this form module"></textarea>
              </div>
              <div class="form-group">
                <label>Initial Schema</label>
                <select name="template" class="form-control">
                  <option value="basic">Basic Form (contact info)</option>
                  <option value="project">Project Details</option>
                  <option value="custom">Custom (empty)</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('form-module-modal').remove()">Cancel</button>
            <button class="btn-primary" onclick="window.adminPortal.serviceManager.createFormModule()">
              Create Form Module
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async createFormModule() {
    const form = document.getElementById('form-module-form');
    const formData = new FormData(form);
    
    // Get template schema
    let schema = {};
    switch (formData.get('template')) {
      case 'basic':
        schema = {
          type: 'object',
          title: formData.get('name'),
          properties: {
            company: { type: 'string', title: 'Company Name' },
            contact_name: { type: 'string', title: 'Contact Name' },
            email: { type: 'string', format: 'email', title: 'Email' },
            phone: { type: 'string', title: 'Phone' }
          },
          required: ['contact_name', 'email']
        };
        break;
      case 'project':
        schema = {
          type: 'object',
          title: formData.get('name'),
          properties: {
            project_name: { type: 'string', title: 'Project Name' },
            project_description: { type: 'string', title: 'Description' },
            timeline: { type: 'string', title: 'Timeline' },
            budget_range: { 
              type: 'string', 
              title: 'Budget Range',
              enum: ['Under $1k', '$1k-$5k', '$5k-$10k', '$10k+']
            }
          },
          required: ['project_name']
        };
        break;
      default:
        schema = {
          type: 'object',
          title: formData.get('name'),
          properties: {}
        };
    }

    try {
      const moduleData = {
        module_id: formData.get('module_id'),
        name: formData.get('name'),
        description: formData.get('description'),
        schema: schema
      };

      const response = await this.fetchWithAuth('/api/forms/modules', {
        method: 'POST',
        body: JSON.stringify(moduleData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Form module created successfully', 'success');
        document.getElementById('form-module-modal').remove();
        await this.loadFormModules();
      } else {
        throw new Error(data.error || 'Failed to create form module');
      }
    } catch (error) {
      console.error('Error creating form module:', error);
      this.showMessage(error.message || 'Failed to create form module', 'error');
    }
  }

  // Phase Modal Methods
  showPhaseModal(phase = null) {
    const modalHtml = `
      <div class="modal-overlay" id="phase-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${phase ? 'Edit' : 'Add'} Phase</h2>
            <button class="modal-close" onclick="document.getElementById('phase-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="phase-form">
              <div class="form-group">
                <label>Phase Key</label>
                <input type="text" name="key" class="form-control" 
                       value="${phase?.key || ''}" 
                       ${phase ? 'readonly' : ''}
                       placeholder="e.g., ONB, IDEA, DSGN"
                       maxlength="10" required>
                <small>Uppercase, max 10 characters</small>
              </div>
              <div class="form-group">
                <label>Label</label>
                <input type="text" name="label" class="form-control" 
                       value="${phase?.label || ''}" 
                       placeholder="e.g., Onboarding" required>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="form-control" rows="3"
                          placeholder="Brief description of this phase">${phase?.description || ''}</textarea>
              </div>
              <div class="form-group">
                <label>Icon</label>
                <select name="icon" class="form-control">
                  ${this.renderIconOptions(phase?.icon)}
                </select>
              </div>
              <div class="form-group">
                <label>Sort Order</label>
                <input type="number" name="sort_order" class="form-control" 
                       value="${phase?.sort_order || 0}" min="0">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('phase-modal').remove()">Cancel</button>
            <button class="btn-primary" onclick="window.adminPortal.serviceManager.savePhase(${phase ? `'${phase.key}'` : 'null'})">
              ${phase ? 'Update' : 'Create'} Phase
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  renderIconOptions(selected) {
    const icons = [
      { value: 'user-plus', label: 'User Plus' },
      { value: 'users', label: 'Users' },
      { value: 'lightbulb', label: 'Lightbulb' },
      { value: 'search', label: 'Search' },
      { value: 'compass', label: 'Compass' },
      { value: 'palette', label: 'Palette' },
      { value: 'box', label: 'Box' },
      { value: 'file-check', label: 'File Check' },
      { value: 'printer', label: 'Printer' },
      { value: 'package', label: 'Package' },
      { value: 'code', label: 'Code' },
      { value: 'bug', label: 'Bug' },
      { value: 'hammer', label: 'Hammer' },
      { value: 'sparkles', label: 'Sparkles' },
      { value: 'rocket', label: 'Rocket' },
      { value: 'message-circle', label: 'Message Circle' },
      { value: 'party-popper', label: 'Party Popper' },
      { value: 'check-circle', label: 'Check Circle' }
    ];
    
    return icons.map(icon => 
      `<option value="${icon.value}" ${selected === icon.value ? 'selected' : ''}>${icon.label}</option>`
    ).join('');
  }

  async savePhase(key = null) {
    try {
      const form = document.getElementById('phase-form');
      const formData = new FormData(form);
      
      const phaseData = {
        key: formData.get('key'),
        label: formData.get('label'),
        description: formData.get('description'),
        icon: formData.get('icon'),
        sort_order: parseInt(formData.get('sort_order')) || 0
      };

      const url = key 
        ? `/api/forms/phases/${key}`
        : '/api/forms/phases';
      
      const method = key ? 'PUT' : 'POST';

      const response = await this.fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(phaseData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage(`Phase ${key ? 'updated' : 'created'} successfully`, 'success');
        document.getElementById('phase-modal').remove();
        await this.loadPhases();
      } else {
        throw new Error(data.error || 'Failed to save phase');
      }
    } catch (error) {
      console.error('Error saving phase:', error);
      this.showMessage(error.message || 'Failed to save phase', 'error');
    }
  }

  // Document Template Methods
  showDocumentTemplateModal(template = null) {
    const modalHtml = `
      <div class="modal-overlay" id="document-template-modal">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>${template ? 'Edit' : 'Create'} Document Template</h2>
            <button class="modal-close" onclick="document.getElementById('document-template-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="document-template-form">
              <div class="form-group">
                <label>Template ID</label>
                <input type="text" name="template_id" class="form-control" 
                       value="${template?.module_id || ''}"
                       ${template ? 'readonly' : ''}
                       placeholder="e.g., proposal_screenprint" 
                       pattern="[a-z0-9_]+" required>
                <small>Lowercase letters, numbers, and underscores only</small>
              </div>
              <div class="form-group">
                <label>Name</label>
                <input type="text" name="name" class="form-control" 
                       value="${template?.name || ''}"
                       placeholder="e.g., Screen Printing Proposal" required>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="form-control" rows="2"
                          placeholder="Brief description of this template">${template?.description || ''}</textarea>
              </div>
              <div class="form-group">
                <label>Template Type</label>
                <select name="template_type" class="form-control">
                  <option value="proposal" ${template?.template_type === 'proposal' ? 'selected' : ''}>Proposal</option>
                  <option value="contract" ${template?.template_type === 'contract' ? 'selected' : ''}>Contract</option>
                  <option value="invoice" ${template?.template_type === 'invoice' ? 'selected' : ''}>Invoice</option>
                  <option value="brief" ${template?.template_type === 'brief' ? 'selected' : ''}>Project Brief</option>
                  <option value="report" ${template?.template_type === 'report' ? 'selected' : ''}>Status Report</option>
                  <option value="other" ${template?.template_type === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Service Filters</label>
                <select name="service_filters" class="form-control" multiple>
                  <option value="">All Services</option>
                  ${this.renderServiceFilterOptions(template?.service_filters)}
                </select>
                <small>Leave empty to apply to all services</small>
              </div>
              <div class="form-group">
                <label>Phase Filters</label>
                <select name="phase_filters" class="form-control" multiple>
                  <option value="">All Phases</option>
                  ${this.renderPhaseFilterOptions(template?.phase_filters)}
                </select>
                <small>Leave empty to apply to all phases</small>
              </div>
              <div class="form-group">
                <label>Template HTML (Handlebars)</label>
                <div class="template-helpers">
                  <small>Available helpers: {{formatDate}}, {{formatCurrency}}, {{capitalize}}, {{> header}}, {{> footer}}</small>
                </div>
                <textarea name="template" class="code-editor" rows="15" 
                          placeholder="Enter Handlebars template HTML...">${template?.template || ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('document-template-modal').remove()">Cancel</button>
            <button class="btn-secondary" onclick="window.adminPortal.serviceManager.previewTemplate()">Preview</button>
            <button class="btn-primary" onclick="window.adminPortal.serviceManager.${template ? `updateDocumentTemplate('${template.module_id}')` : 'createDocumentTemplate()'}">
              ${template ? 'Update' : 'Create'} Template
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  async renderServiceFilterOptions(selected = []) {
    try {
      const response = await this.fetchWithAuth('/api/forms/service-types');
      const data = await response.json();
      
      if (data.success) {
        return data.serviceTypes.map(service => 
          `<option value="${service.code}" ${selected?.includes(service.code) ? 'selected' : ''}>${service.code} - ${service.display_name}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error loading service options:', error);
    }
    
    return '';
  }
  
  async renderPhaseFilterOptions(selected = []) {
    try {
      const response = await this.fetchWithAuth('/api/forms/phases');
      const data = await response.json();
      
      if (data.success) {
        return data.phases.map(phase => 
          `<option value="${phase.key}" ${selected?.includes(phase.key) ? 'selected' : ''}>${phase.key} - ${phase.label}</option>`
        ).join('');
      } else {
        throw new Error('Failed to load phases');
      }
    } catch (error) {
      console.error('Error loading phase options:', error);
    }
    
    return '';
  }

  async createDocumentTemplate() {
    try {
      const form = document.getElementById('document-template-form');
      const formData = new FormData(form);
      
      const templateData = {
        module_id: formData.get('template_id'),
        name: formData.get('name'),
        description: formData.get('description'),
        template_type: formData.get('template_type'),
        template: formData.get('template'),
        service_filters: Array.from(form.querySelectorAll('select[name="service_filters"] option:checked'))
          .map(opt => opt.value).filter(Boolean) || null,
        phase_filters: Array.from(form.querySelectorAll('select[name="phase_filters"] option:checked'))
          .map(opt => opt.value).filter(Boolean) || null
      };

      const response = await this.fetchWithAuth('/api/documents/templates', {
        method: 'POST',
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Document template created successfully', 'success');
        document.getElementById('document-template-modal').remove();
        await this.loadDocumentTemplates();
      } else {
        throw new Error(data.error || 'Failed to create document template');
      }
    } catch (error) {
      console.error('Error creating document template:', error);
      this.showMessage(error.message || 'Failed to create document template', 'error');
    }
  }
  
  async updateDocumentTemplate(templateId) {
    try {
      const form = document.getElementById('document-template-form');
      const formData = new FormData(form);
      
      const templateData = {
        name: formData.get('name'),
        description: formData.get('description'),
        template_type: formData.get('template_type'),
        template: formData.get('template'),
        service_filters: Array.from(form.querySelectorAll('select[name="service_filters"] option:checked'))
          .map(opt => opt.value).filter(Boolean) || null,
        phase_filters: Array.from(form.querySelectorAll('select[name="phase_filters"] option:checked'))
          .map(opt => opt.value).filter(Boolean) || null
      };

      const response = await this.fetchWithAuth(`/api/documents/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(templateData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Document template updated successfully', 'success');
        document.getElementById('document-template-modal').remove();
        await this.loadDocumentTemplates();
      } else {
        throw new Error(data.error || 'Failed to update document template');
      }
    } catch (error) {
      console.error('Error updating document template:', error);
      this.showMessage(error.message || 'Failed to update document template', 'error');
    }
  }
  
  async previewTemplate() {
    try {
      const form = document.getElementById('document-template-form');
      const formData = new FormData(form);
      const template = formData.get('template');
      
      if (!template) {
        this.showMessage('Please enter template content', 'error');
        return;
      }
      
      const response = await this.fetchWithAuth('/api/documents/preview', {
        method: 'POST',
        body: JSON.stringify({
          template: template,
          sample_data: this.getSampleData(formData.get('template_type'))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showDocumentPreviewModal(data.html);
      } else {
        throw new Error(data.error || 'Failed to preview template');
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      this.showMessage(error.message || 'Failed to preview template', 'error');
    }
  }

  async editDocumentTemplate(templateId) {
    try {
      const response = await this.fetchWithAuth(`/api/documents/templates/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        this.showDocumentTemplateModal(data.template);
      }
    } catch (error) {
      console.error('Error loading document template:', error);
      this.showMessage('Failed to load document template', 'error');
    }
  }

  async previewDocument(templateId) {
    try {
      const response = await this.fetchWithAuth(`/api/documents/templates/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        // Generate preview with sample data
        const previewResponse = await this.fetchWithAuth('/api/documents/preview', {
          method: 'POST',
          body: JSON.stringify({
            template: data.template.template,
            sample_data: this.getSampleData(data.template.template_type)
          })
        });
        
        const previewData = await previewResponse.json();
        
        if (previewData.success) {
          this.showDocumentPreviewModal(previewData.html);
        }
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      this.showMessage('Failed to preview document', 'error');
    }
  }
  
  getSampleData(templateType) {
    const baseData = {
      project: {
        name: 'Sample Project',
        description: 'This is a sample project for preview purposes',
        services: ['WEB', 'LOGO'],
        status: 'in_progress',
        total_budget: 5000,
        paid_amount: 2500,
        created_at: new Date()
      },
      client: {
        name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        company: 'Example Company Inc.'
      },
      phases: [
        { name: 'Onboarding', estimated_duration: 2, is_completed: true },
        { name: 'Design', estimated_duration: 5, is_current: true },
        { name: 'Development', estimated_duration: 10 }
      ],
      form_data: {
        project_goals: 'Create a modern website with e-commerce capabilities',
        quantity: 100,
        setup_fee: 500,
        unit_cost: 15,
        frontend_tech: 'React',
        backend_tech: 'Node.js',
        database_tech: 'PostgreSQL',
        hosting_solution: 'AWS'
      }
    };
    
    // Add template-specific data
    switch (templateType) {
      case 'proposal':
        baseData.form_data.development_cost = 3000;
        baseData.form_data.content_cost = 1000;
        baseData.form_data.testing_cost = 1000;
        break;
      case 'report':
        baseData.current_phase = 'Design';
        baseData.phase_progress = 60;
        baseData.recent_activities = [
          { date: new Date(), description: 'Completed wireframes' },
          { date: new Date(Date.now() - 86400000), description: 'Client feedback received' }
        ];
        baseData.deliverables = [
          { name: 'Wireframes', status: 'completed', due_date: new Date() },
          { name: 'Mockups', status: 'in_progress', due_date: new Date(Date.now() + 86400000) }
        ];
        break;
    }
    
    return baseData;
  }
  
  showDocumentPreviewModal(html) {
    const modalHtml = `
      <div class="modal-overlay" id="document-preview-modal">
        <div class="modal-content large">
          <div class="modal-header">
            <h2>Document Preview</h2>
            <button class="modal-close" onclick="document.getElementById('document-preview-modal').remove()">×</button>
          </div>
          <div class="modal-body" style="padding: 0;">
            <iframe 
              srcdoc="${html.replace(/"/g, '&quot;')}" 
              style="width: 100%; height: 70vh; border: none;"
            ></iframe>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="document.getElementById('document-preview-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async deleteDocumentTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await this.fetchWithAuth(`/api/forms/document-templates/${templateId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('Document template deleted successfully', 'success');
        await this.loadDocumentTemplates();
      } else {
        throw new Error(data.error || 'Failed to delete document template');
      }
    } catch (error) {
      console.error('Error deleting document template:', error);
      this.showMessage(error.message || 'Failed to delete document template', 'error');
    }
  }
}

export default ServiceManagementModule;