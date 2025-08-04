/**
 * FormBuilder Component
 * Visual form builder for creating dynamic JSON schema forms
 * Supports drag-and-drop, field validation, and conditional logic
 */

import { BRAND } from '../../config/brand.js';

export class FormBuilder {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      onSave: () => {},
      onPreview: () => {},
      onFieldAdd: () => {},
      onFieldRemove: () => {},
      showPreview: true,
      allowAdvanced: true,
      ...options
    };
    
    this.currentForm = {
      id: null,
      name: '',
      description: '',
      schema: {
        type: 'object',
        properties: {},
        required: []
      },
      uiSchema: {},
      formData: {}
    };
    
    this.fieldTypes = {
      text: { label: 'Text Input', icon: '📝', category: 'basic' },
      textarea: { label: 'Textarea', icon: '📄', category: 'basic' },
      email: { label: 'Email', icon: '📧', category: 'basic' },
      number: { label: 'Number', icon: '🔢', category: 'basic' },
      select: { label: 'Dropdown', icon: '📋', category: 'basic' },
      radio: { label: 'Radio Buttons', icon: '🔘', category: 'basic' },
      checkbox: { label: 'Checkboxes', icon: '☑️', category: 'basic' },
      date: { label: 'Date Picker', icon: '📅', category: 'basic' },
      file: { label: 'File Upload', icon: '📎', category: 'advanced' },
      rating: { label: 'Rating Scale', icon: '⭐', category: 'advanced' },
      signature: { label: 'Signature', icon: '✍️', category: 'advanced' },
      section: { label: 'Section Header', icon: '📋', category: 'layout' },
      divider: { label: 'Divider', icon: '➖', category: 'layout' },
      html: { label: 'HTML Block', icon: '🔗', category: 'advanced' }
    };
    
    this.draggedField = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    this.render();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="form-builder">
        <div class="form-builder-header">
          <div class="form-info">
            <input type="text" 
                   class="form-name-input" 
                   placeholder="Form Name" 
                   value="${this.currentForm.name}"
                   data-field="name">
            <input type="text" 
                   class="form-description-input" 
                   placeholder="Form Description" 
                   value="${this.currentForm.description}"
                   data-field="description">
          </div>
          <div class="form-actions">
            ${this.options.showPreview ? '<button class="btn-secondary preview-btn">👁️ Preview</button>' : ''}
            <button class="btn-primary save-btn">💾 Save Form</button>
          </div>
        </div>
        
        <div class="form-builder-content">
          <div class="field-palette">
            <h4>Field Types</h4>
            ${this.renderFieldPalette()}
          </div>
          
          <div class="form-canvas">
            <div class="canvas-header">
              <h4>Form Builder</h4>
              <span class="field-count">${Object.keys(this.currentForm.schema.properties).length} fields</span>
            </div>
            <div class="form-fields" id="form-fields">
              ${this.renderFormFields()}
            </div>
            <div class="drop-zone ${Object.keys(this.currentForm.schema.properties).length === 0 ? 'empty' : ''}">
              ${Object.keys(this.currentForm.schema.properties).length === 0 ? 
                '<p>Drag field types here to build your form</p>' : 
                '<p>Drop new fields here</p>'
              }
            </div>
          </div>
          
          ${this.options.showPreview ? this.renderPreviewPane() : ''}
        </div>
      </div>
    `;
  }

  renderFieldPalette() {
    const categories = {
      basic: 'Basic Fields',
      advanced: 'Advanced Fields',
      layout: 'Layout Elements'
    };
    
    let html = '';
    
    for (const [categoryKey, categoryLabel] of Object.entries(categories)) {
      const fields = Object.entries(this.fieldTypes).filter(([_, config]) => config.category === categoryKey);
      
      if (fields.length === 0) continue;
      
      html += `
        <div class="field-category">
          <h5>${categoryLabel}</h5>
          <div class="field-list">
            ${fields.map(([type, config]) => `
              <div class="field-type" 
                   draggable="true" 
                   data-field-type="${type}">
                <span class="field-icon">${config.icon}</span>
                <span class="field-label">${config.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  renderFormFields() {
    const properties = this.currentForm.schema.properties;
    
    return Object.entries(properties).map(([fieldKey, fieldSchema]) => {
      return this.renderFormField(fieldKey, fieldSchema);
    }).join('');
  }

  renderFormField(fieldKey, fieldSchema) {
    const fieldType = this.getFieldTypeFromSchema(fieldSchema);
    const typeConfig = this.fieldTypes[fieldType];
    const isRequired = this.currentForm.schema.required.includes(fieldKey);
    
    return `
      <div class="form-field" data-field-key="${fieldKey}">
        <div class="field-header">
          <div class="field-info">
            <span class="field-type-icon">${typeConfig?.icon || '📝'}</span>
            <span class="field-title">${fieldSchema.title || fieldKey}</span>
            ${isRequired ? '<span class="required-badge">Required</span>' : ''}
          </div>
          <div class="field-actions">
            <button class="field-action edit-field" data-action="edit" title="Edit field">⚙️</button>
            <button class="field-action duplicate-field" data-action="duplicate" title="Duplicate field">📄</button>
            <button class="field-action delete-field" data-action="delete" title="Delete field">🗑️</button>
            <button class="field-action move-field" data-action="move" title="Drag to reorder">⋮⋮</button>
          </div>
        </div>
        
        <div class="field-preview">
          ${this.renderFieldPreview(fieldKey, fieldSchema, fieldType)}
        </div>
        
        ${fieldSchema.description ? `<p class="field-description">${fieldSchema.description}</p>` : ''}
      </div>
    `;
  }

  renderFieldPreview(fieldKey, fieldSchema, fieldType) {
    switch (fieldType) {
      case 'text':
      case 'email':
        return `<input type="${fieldType}" placeholder="${fieldSchema.placeholder || ''}" disabled>`;
      
      case 'textarea':
        return `<textarea placeholder="${fieldSchema.placeholder || ''}" rows="3" disabled></textarea>`;
      
      case 'number':
        return `<input type="number" placeholder="${fieldSchema.placeholder || ''}" disabled>`;
      
      case 'select':
        const options = fieldSchema.enum || ['Option 1', 'Option 2'];
        return `
          <select disabled>
            <option value="">Choose...</option>
            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        `;
      
      case 'radio':
        const radioOptions = fieldSchema.enum || ['Option 1', 'Option 2'];
        return `
          <div class="radio-group">
            ${radioOptions.map((opt, i) => `
              <label class="radio-option">
                <input type="radio" name="${fieldKey}_preview" value="${opt}" disabled>
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
        `;
      
      case 'checkbox':
        if (fieldSchema.type === 'boolean') {
          return `
            <label class="checkbox-option">
              <input type="checkbox" disabled>
              <span>${fieldSchema.title || 'Checkbox option'}</span>
            </label>
          `;
        } else {
          const checkboxOptions = fieldSchema.items?.enum || ['Option 1', 'Option 2'];
          return `
            <div class="checkbox-group">
              ${checkboxOptions.map(opt => `
                <label class="checkbox-option">
                  <input type="checkbox" value="${opt}" disabled>
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          `;
        }
      
      case 'date':
        return `<input type="date" disabled>`;
      
      case 'file':
        return `<input type="file" disabled> <span class="file-note">Upload files</span>`;
      
      case 'rating':
        return `
          <div class="rating-preview">
            ${'★'.repeat(5).split('').map((star, i) => `<span class="star" data-value="${i+1}">${star}</span>`).join('')}
          </div>
        `;
      
      case 'signature':
        return `<div class="signature-preview">📝 Signature pad would appear here</div>`;
      
      case 'section':
        return `<h3 class="section-header">${fieldSchema.title || 'Section Header'}</h3>`;
      
      case 'divider':
        return `<hr class="form-divider">`;
      
      case 'html':
        return `<div class="html-preview">🔗 Custom HTML content</div>`;
      
      default:
        return `<input type="text" placeholder="${fieldSchema.placeholder || ''}" disabled>`;
    }
  }

  renderPreviewPane() {
    return `
      <div class="form-preview-pane">
        <div class="preview-header">
          <h4>Live Preview</h4>
          <div class="preview-actions">
            <button class="btn-link refresh-preview">🔄 Refresh</button>
            <button class="btn-link test-form">🧪 Test Form</button>
          </div>
        </div>
        <div class="preview-content">
          <iframe id="form-preview-frame" class="form-preview-iframe"></iframe>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    if (!this.container) return;
    
    // Form info updates
    this.container.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        this.currentForm[field] = e.target.value;
      });
    });
    
    // Field palette drag and drop
    this.container.querySelectorAll('.field-type').forEach(field => {
      field.addEventListener('dragstart', (e) => {
        this.draggedField = {
          type: e.target.dataset.fieldType,
          isNew: true
        };
        e.target.style.opacity = '0.5';
      });
      
      field.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
        this.draggedField = null;
      });
    });
    
    // Drop zone handling
    const dropZone = this.container.querySelector('.drop-zone');
    const formFields = this.container.querySelector('.form-fields');
    
    [dropZone, formFields].forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      
      zone.addEventListener('dragleave', (e) => {
        zone.classList.remove('drag-over');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        
        if (this.draggedField && this.draggedField.isNew) {
          this.addField(this.draggedField.type);
        }
      });
    });
    
    // Field actions
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('field-action')) {
        const action = e.target.dataset.action;
        const fieldElement = e.target.closest('.form-field');
        const fieldKey = fieldElement.dataset.fieldKey;
        
        this.handleFieldAction(action, fieldKey);
      }
    });
    
    // Form actions
    const saveBtn = this.container.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveForm());
    }
    
    const previewBtn = this.container.querySelector('.preview-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.showPreview());
    }
  }

  addField(fieldType, fieldKey = null) {
    if (!fieldKey) {
      // Generate unique field key
      fieldKey = `field_${Date.now()}`;
    }
    
    const fieldSchema = this.createFieldSchema(fieldType);
    
    // Add to schema
    this.currentForm.schema.properties[fieldKey] = fieldSchema;
    
    // Add to UI schema if needed
    this.currentForm.uiSchema[fieldKey] = this.createUISchema(fieldType);
    
    // Re-render and open field editor
    this.render();
    this.setupEventListeners();
    this.editField(fieldKey);
    
    // Notify of field addition
    this.options.onFieldAdd(fieldKey, fieldSchema);
  }

  createFieldSchema(fieldType) {
    const baseSchema = {
      title: `New ${this.fieldTypes[fieldType]?.label || 'Field'}`,
      description: ''
    };
    
    switch (fieldType) {
      case 'text':
        return { ...baseSchema, type: 'string', placeholder: 'Enter text...' };
      
      case 'email':
        return { ...baseSchema, type: 'string', format: 'email', placeholder: 'Enter email...' };
      
      case 'textarea':
        return { ...baseSchema, type: 'string', placeholder: 'Enter text...', multiline: true };
      
      case 'number':
        return { ...baseSchema, type: 'number', placeholder: 'Enter number...' };
      
      case 'select':
        return { ...baseSchema, type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'] };
      
      case 'radio':
        return { ...baseSchema, type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'] };
      
      case 'checkbox':
        return { ...baseSchema, type: 'array', items: { type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'] } };
      
      case 'date':
        return { ...baseSchema, type: 'string', format: 'date' };
      
      case 'file':
        return { ...baseSchema, type: 'string', format: 'data-url' };
      
      case 'rating':
        return { ...baseSchema, type: 'number', minimum: 1, maximum: 5 };
      
      case 'signature':
        return { ...baseSchema, type: 'string', format: 'data-url' };
      
      case 'section':
        return { ...baseSchema, type: 'null', title: 'Section Header' };
      
      case 'divider':
        return { ...baseSchema, type: 'null', title: 'Divider' };
      
      case 'html':
        return { ...baseSchema, type: 'null', content: '<p>Custom HTML content</p>' };
      
      default:
        return { ...baseSchema, type: 'string', placeholder: 'Enter text...' };
    }
  }

  createUISchema(fieldType) {
    switch (fieldType) {
      case 'textarea':
        return { 'ui:widget': 'textarea', 'ui:options': { rows: 4 } };
      
      case 'radio':
        return { 'ui:widget': 'radio' };
      
      case 'checkbox':
        return { 'ui:widget': 'checkboxes' };
      
      case 'file':
        return { 'ui:widget': 'file' };
      
      case 'rating':
        return { 'ui:widget': 'range' };
      
      case 'signature':
        return { 'ui:widget': 'signature' };
      
      case 'section':
        return { 'ui:widget': 'section' };
      
      case 'divider':
        return { 'ui:widget': 'divider' };
      
      case 'html':
        return { 'ui:widget': 'html' };
      
      default:
        return {};
    }
  }

  getFieldTypeFromSchema(fieldSchema) {
    if (fieldSchema.format === 'email') return 'email';
    if (fieldSchema.format === 'date') return 'date';
    if (fieldSchema.format === 'data-url') return fieldSchema.title?.includes('Signature') ? 'signature' : 'file';
    if (fieldSchema.multiline) return 'textarea';
    if (fieldSchema.enum && fieldSchema.type === 'string') return 'select';
    if (fieldSchema.type === 'array' && fieldSchema.items?.enum) return 'checkbox';
    if (fieldSchema.type === 'number' && fieldSchema.maximum === 5) return 'rating';
    if (fieldSchema.type === 'number') return 'number';
    if (fieldSchema.type === 'null' && fieldSchema.title?.includes('Section')) return 'section';
    if (fieldSchema.type === 'null' && fieldSchema.title?.includes('Divider')) return 'divider';
    if (fieldSchema.type === 'null' && fieldSchema.content) return 'html';
    
    return 'text';
  }

  handleFieldAction(action, fieldKey) {
    switch (action) {
      case 'edit':
        this.editField(fieldKey);
        break;
      
      case 'duplicate':
        this.duplicateField(fieldKey);
        break;
      
      case 'delete':
        this.deleteField(fieldKey);
        break;
      
      case 'move':
        // Handle in drag/drop
        break;
    }
  }

  editField(fieldKey) {
    const fieldSchema = this.currentForm.schema.properties[fieldKey];
    if (!fieldSchema) return;
    
    // Create and show field editor modal
    this.showFieldEditorModal(fieldKey, fieldSchema);
  }

  showFieldEditorModal(fieldKey, fieldSchema) {
    const modal = document.createElement('div');
    modal.className = 'field-editor-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit Field: ${fieldSchema.title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>Field Label</label>
              <input type="text" class="field-prop" data-prop="title" value="${fieldSchema.title || ''}">
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <input type="text" class="field-prop" data-prop="description" value="${fieldSchema.description || ''}">
            </div>
            
            <div class="form-group">
              <label>Placeholder</label>
              <input type="text" class="field-prop" data-prop="placeholder" value="${fieldSchema.placeholder || ''}">
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" class="field-required" ${this.currentForm.schema.required.includes(fieldKey) ? 'checked' : ''}>
                Required Field
              </label>
            </div>
            
            ${this.renderFieldSpecificOptions(fieldKey, fieldSchema)}
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary cancel-btn">Cancel</button>
            <button class="btn-primary save-field-btn">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup modal event listeners
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    
    modal.querySelector('.save-field-btn').addEventListener('click', () => {
      this.saveFieldChanges(fieldKey, modal);
      closeModal();
    });
  }

  renderFieldSpecificOptions(fieldKey, fieldSchema) {
    const fieldType = this.getFieldTypeFromSchema(fieldSchema);
    
    switch (fieldType) {
      case 'select':
      case 'radio':
      case 'checkbox':
        return `
          <div class="form-group">
            <label>Options (one per line)</label>
            <textarea class="field-prop" data-prop="enum" rows="4">${(fieldSchema.enum || fieldSchema.items?.enum || []).join('\\n')}</textarea>
          </div>
        `;
      
      case 'number':
      case 'rating':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Minimum Value</label>
              <input type="number" class="field-prop" data-prop="minimum" value="${fieldSchema.minimum || ''}">
            </div>
            <div class="form-group">
              <label>Maximum Value</label>
              <input type="number" class="field-prop" data-prop="maximum" value="${fieldSchema.maximum || ''}">
            </div>
          </div>
        `;
      
      case 'html':
        return `
          <div class="form-group">
            <label>HTML Content</label>
            <textarea class="field-prop" data-prop="content" rows="6">${fieldSchema.content || ''}</textarea>
          </div>
        `;
      
      default:
        return '';
    }
  }

  saveFieldChanges(fieldKey, modal) {
    const fieldSchema = this.currentForm.schema.properties[fieldKey];
    
    // Update basic properties
    modal.querySelectorAll('.field-prop').forEach(input => {
      const prop = input.dataset.prop;
      let value = input.value;
      
      if (prop === 'enum') {
        value = value.split('\\n').filter(v => v.trim()).map(v => v.trim());
        if (fieldSchema.type === 'array') {
          fieldSchema.items = fieldSchema.items || {};
          fieldSchema.items.enum = value;
        } else {
          fieldSchema[prop] = value;
        }
      } else if (prop === 'minimum' || prop === 'maximum') {
        if (value) fieldSchema[prop] = parseInt(value, 10);
      } else {
        fieldSchema[prop] = value;
      }
    });
    
    // Update required status
    const isRequired = modal.querySelector('.field-required').checked;
    const requiredIndex = this.currentForm.schema.required.indexOf(fieldKey);
    
    if (isRequired && requiredIndex === -1) {
      this.currentForm.schema.required.push(fieldKey);
    } else if (!isRequired && requiredIndex !== -1) {
      this.currentForm.schema.required.splice(requiredIndex, 1);
    }
    
    // Re-render form
    this.render();
    this.setupEventListeners();
  }

  duplicateField(fieldKey) {
    const originalSchema = this.currentForm.schema.properties[fieldKey];
    const newFieldKey = `${fieldKey}_copy_${Date.now()}`;
    
    // Deep copy the schema
    const newSchema = JSON.parse(JSON.stringify(originalSchema));
    newSchema.title = `${newSchema.title} (Copy)`;
    
    this.currentForm.schema.properties[newFieldKey] = newSchema;
    
    if (this.currentForm.uiSchema[fieldKey]) {
      this.currentForm.uiSchema[newFieldKey] = JSON.parse(JSON.stringify(this.currentForm.uiSchema[fieldKey]));
    }
    
    this.render();
    this.setupEventListeners();
  }

  deleteField(fieldKey) {
    if (confirm(`Are you sure you want to delete the field "${this.currentForm.schema.properties[fieldKey]?.title}"?`)) {
      delete this.currentForm.schema.properties[fieldKey];
      delete this.currentForm.uiSchema[fieldKey];
      
      // Remove from required fields
      const requiredIndex = this.currentForm.schema.required.indexOf(fieldKey);
      if (requiredIndex !== -1) {
        this.currentForm.schema.required.splice(requiredIndex, 1);
      }
      
      this.render();
      this.setupEventListeners();
      
      this.options.onFieldRemove(fieldKey);
    }
  }

  saveForm() {
    if (!this.currentForm.name.trim()) {
      alert('Please enter a form name');
      return;
    }
    
    const formData = {
      ...this.currentForm,
      updated_at: new Date().toISOString()
    };
    
    this.options.onSave(formData);
  }

  showPreview() {
    // Generate preview HTML
    const previewHTML = this.generatePreviewHTML();
    
    // Update preview iframe
    const previewFrame = document.getElementById('form-preview-frame');
    if (previewFrame) {
      const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
      doc.open();
      doc.write(previewHTML);
      doc.close();
    }
    
    this.options.onPreview(this.currentForm);
  }

  generatePreviewHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Form Preview</title>
        <style>
          body { font-family: ${BRAND.typography.fontFamily}; padding: 20px; background: ${BRAND.colors.bone}; }
          .form-container { background: white; padding: 24px; border-radius: 8px; border: 1px solid ${BRAND.colors.border}; }
          .form-group { margin-bottom: 16px; }
          label { display: block; margin-bottom: 4px; font-weight: 500; color: ${BRAND.colors.text}; }
          input, textarea, select { width: 100%; padding: 8px 12px; border: 1px solid ${BRAND.colors.border}; border-radius: 4px; }
          .required { color: ${BRAND.colors.red}; }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h2>${this.currentForm.name}</h2>
          ${this.currentForm.description ? `<p>${this.currentForm.description}</p>` : ''}
          
          <form>
            ${Object.entries(this.currentForm.schema.properties).map(([key, schema]) => 
              this.renderPreviewField(key, schema)
            ).join('')}
            
            <button type="submit">Submit Form</button>
          </form>
        </div>
      </body>
      </html>
    `;
  }

  renderPreviewField(fieldKey, fieldSchema) {
    const isRequired = this.currentForm.schema.required.includes(fieldKey);
    const fieldType = this.getFieldTypeFromSchema(fieldSchema);
    
    return `
      <div class="form-group">
        <label for="${fieldKey}">
          ${fieldSchema.title}
          ${isRequired ? '<span class="required">*</span>' : ''}
        </label>
        ${fieldSchema.description ? `<small>${fieldSchema.description}</small>` : ''}
        ${this.renderPreviewInput(fieldKey, fieldSchema, fieldType)}
      </div>
    `;
  }

  renderPreviewInput(fieldKey, fieldSchema, fieldType) {
    switch (fieldType) {
      case 'textarea':
        return `<textarea id="${fieldKey}" name="${fieldKey}" placeholder="${fieldSchema.placeholder || ''}" ${this.currentForm.schema.required.includes(fieldKey) ? 'required' : ''}></textarea>`;
      
      case 'select':
        return `
          <select id="${fieldKey}" name="${fieldKey}" ${this.currentForm.schema.required.includes(fieldKey) ? 'required' : ''}>
            <option value="">Choose...</option>
            ${(fieldSchema.enum || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        `;
      
      default:
        return `<input type="${fieldType === 'text' ? 'text' : fieldType}" id="${fieldKey}" name="${fieldKey}" placeholder="${fieldSchema.placeholder || ''}" ${this.currentForm.schema.required.includes(fieldKey) ? 'required' : ''}>`;
    }
  }

  loadForm(formData) {
    this.currentForm = {
      id: formData.id || null,
      name: formData.name || '',
      description: formData.description || '',
      schema: formData.schema || { type: 'object', properties: {}, required: [] },
      uiSchema: formData.uiSchema || {},
      formData: formData.formData || {}
    };
    
    this.render();
    this.setupEventListeners();
  }

  clearForm() {
    this.currentForm = {
      id: null,
      name: '',
      description: '',
      schema: { type: 'object', properties: {}, required: [] },
      uiSchema: {},
      formData: {}
    };
    
    this.render();
    this.setupEventListeners();
  }

  getFormData() {
    return { ...this.currentForm };
  }
}

export default FormBuilder;