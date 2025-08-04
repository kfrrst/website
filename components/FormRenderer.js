/**
 * Form Renderer Component
 * Renders dynamic forms from JSON Schema with bone white styling
 */

class FormRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element #${containerId} not found`);
    }

    this.options = {
      onSubmit: null,
      onChange: null,
      readOnly: false,
      showValidation: true,
      submitText: 'Submit',
      cancelText: 'Cancel',
      ...options
    };

    this.schema = null;
    this.uiSchema = null;
    this.formData = {};
    this.errors = {};
    this.touched = new Set();
  }

  /**
   * Set the schema and UI hints
   */
  setSchema(schema, uiSchema = {}) {
    this.schema = schema;
    this.uiSchema = uiSchema;
    this.errors = {};
    this.touched = new Set();
  }

  /**
   * Set initial form data
   */
  setData(data) {
    this.formData = { ...data };
  }

  /**
   * Render the form
   */
  render() {
    if (!this.schema) {
      this.container.innerHTML = '<p class="error-message">No form schema provided</p>';
      return;
    }

    const formHtml = `
      <form class="dynamic-form" id="${this.container.id}-form">
        <div class="form-header">
          <h3>${this.schema.title || 'Form'}</h3>
          ${this.schema.description ? `<p class="form-description">${this.schema.description}</p>` : ''}
        </div>
        
        <div class="form-fields">
          ${this.renderFields()}
        </div>
        
        ${!this.options.readOnly ? `
          <div class="form-actions">
            <button type="submit" class="btn-primary" id="${this.container.id}-submit">
              ${this.options.submitText}
            </button>
            ${this.options.onCancel ? `
              <button type="button" class="btn-secondary" id="${this.container.id}-cancel">
                ${this.options.cancelText}
              </button>
            ` : ''}
          </div>
        ` : ''}
      </form>
    `;

    this.container.innerHTML = formHtml;
    this.attachEventListeners();
  }

  /**
   * Render all fields based on schema properties
   */
  renderFields() {
    if (!this.schema.properties) return '';

    return Object.entries(this.schema.properties)
      .map(([key, fieldSchema]) => this.renderField(key, fieldSchema))
      .join('');
  }

  /**
   * Render a single field based on its schema
   */
  renderField(key, fieldSchema) {
    const uiOptions = this.uiSchema[key] || {};
    const value = this.formData[key] || '';
    const error = this.errors[key];
    const isRequired = this.schema.required && this.schema.required.includes(key);
    const hasError = error && this.touched.has(key);

    let fieldHtml = '';
    const fieldId = `${this.container.id}-${key}`;
    const commonAttrs = `
      id="${fieldId}"
      name="${key}"
      ${this.options.readOnly ? 'readonly' : ''}
      ${isRequired ? 'required' : ''}
      ${uiOptions.placeholder ? `placeholder="${uiOptions.placeholder}"` : ''}
      class="form-control ${hasError ? 'error' : ''}"
    `;

    // Determine field type and render accordingly
    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enum) {
          // Select dropdown
          fieldHtml = `
            <select ${commonAttrs}>
              <option value="">Choose...</option>
              ${fieldSchema.enum.map(opt => `
                <option value="${opt}" ${value === opt ? 'selected' : ''}>
                  ${fieldSchema.enumNames ? fieldSchema.enumNames[fieldSchema.enum.indexOf(opt)] : opt}
                </option>
              `).join('')}
            </select>
          `;
        } else if (fieldSchema.format === 'date') {
          fieldHtml = `<input type="date" ${commonAttrs} value="${value}">`;
        } else if (fieldSchema.format === 'email') {
          fieldHtml = `<input type="email" ${commonAttrs} value="${value}">`;
        } else if (fieldSchema.format === 'uri') {
          fieldHtml = `<input type="url" ${commonAttrs} value="${value}">`;
        } else if (uiOptions.widget === 'textarea') {
          fieldHtml = `<textarea ${commonAttrs} rows="${uiOptions.rows || 4}">${value}</textarea>`;
        } else if (uiOptions.widget === 'color') {
          fieldHtml = `<input type="color" ${commonAttrs} value="${value || '#000000'}">`;
        } else {
          fieldHtml = `<input type="text" ${commonAttrs} value="${value}">`;
        }
        break;

      case 'number':
      case 'integer':
        fieldHtml = `
          <input 
            type="number" 
            ${commonAttrs} 
            value="${value}"
            ${fieldSchema.minimum !== undefined ? `min="${fieldSchema.minimum}"` : ''}
            ${fieldSchema.maximum !== undefined ? `max="${fieldSchema.maximum}"` : ''}
            ${fieldSchema.multipleOf ? `step="${fieldSchema.multipleOf}"` : ''}
          >
        `;
        break;

      case 'boolean':
        fieldHtml = `
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              id="${fieldId}"
              name="${key}"
              ${value ? 'checked' : ''}
              ${this.options.readOnly ? 'disabled' : ''}
            >
            <span>${fieldSchema.title || key}</span>
          </label>
        `;
        return `<div class="form-group checkbox-group">${fieldHtml}</div>`;

      case 'array':
        if (fieldSchema.items && fieldSchema.items.type === 'string') {
          // Simple string array - render as tags input
          fieldHtml = this.renderArrayField(key, fieldSchema, value);
        }
        break;

      case 'object':
        // Nested object - render sub-fields
        fieldHtml = this.renderObjectField(key, fieldSchema, value);
        break;
    }

    // Wrap in form group (except for checkboxes which handle their own wrapper)
    if (fieldSchema.type !== 'boolean') {
      return `
        <div class="form-group ${hasError ? 'has-error' : ''}">
          <label for="${fieldId}">
            ${fieldSchema.title || this.humanizeKey(key)}
            ${isRequired ? '<span class="required">*</span>' : ''}
          </label>
          ${fieldSchema.description ? `<p class="field-description">${fieldSchema.description}</p>` : ''}
          ${fieldHtml}
          ${hasError ? `<span class="error-message">${error}</span>` : ''}
        </div>
      `;
    }

    return fieldHtml;
  }

  /**
   * Render array field as tags input
   */
  renderArrayField(key, fieldSchema, value = []) {
    const fieldId = `${this.container.id}-${key}`;
    const items = Array.isArray(value) ? value : [];

    return `
      <div class="array-field" id="${fieldId}-container">
        <div class="tags-container">
          ${items.map((item, index) => `
            <span class="tag" data-index="${index}">
              ${item}
              ${!this.options.readOnly ? `<button type="button" class="tag-remove" data-key="${key}" data-index="${index}">×</button>` : ''}
            </span>
          `).join('')}
        </div>
        ${!this.options.readOnly ? `
          <div class="tag-input-container">
            <input 
              type="text" 
              class="tag-input form-control" 
              placeholder="Type and press Enter"
              data-key="${key}"
            >
            <button type="button" class="btn-secondary btn-small add-tag" data-key="${key}">Add</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render nested object field
   */
  renderObjectField(key, fieldSchema, value = {}) {
    if (!fieldSchema.properties) return '';

    return `
      <fieldset class="object-field">
        <legend>${fieldSchema.title || this.humanizeKey(key)}</legend>
        ${Object.entries(fieldSchema.properties).map(([subKey, subSchema]) => {
          const fullKey = `${key}.${subKey}`;
          return this.renderField(fullKey, subSchema);
        }).join('')}
      </fieldset>
    `;
  }

  /**
   * Convert key to human-readable label
   */
  humanizeKey(key) {
    return key
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = this.container.querySelector('form');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Field changes
    form.addEventListener('change', (e) => {
      this.handleFieldChange(e.target);
    });

    // Field blur (for validation)
    form.addEventListener('blur', (e) => {
      if (e.target.name) {
        this.touched.add(e.target.name);
        this.validateField(e.target.name);
      }
    }, true);

    // Cancel button
    const cancelBtn = this.container.querySelector(`#${this.container.id}-cancel`);
    if (cancelBtn && this.options.onCancel) {
      cancelBtn.addEventListener('click', this.options.onCancel);
    }

    // Array field handlers
    this.attachArrayFieldHandlers();
  }

  /**
   * Attach handlers for array fields
   */
  attachArrayFieldHandlers() {
    // Tag removal
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-remove')) {
        const key = e.target.dataset.key;
        const index = parseInt(e.target.dataset.index);
        this.removeArrayItem(key, index);
      }

      if (e.target.classList.contains('add-tag')) {
        const key = e.target.dataset.key;
        this.addArrayItem(key);
      }
    });

    // Enter key in tag input
    this.container.addEventListener('keypress', (e) => {
      if (e.target.classList.contains('tag-input') && e.key === 'Enter') {
        e.preventDefault();
        const key = e.target.dataset.key;
        this.addArrayItem(key);
      }
    });
  }

  /**
   * Handle field value changes
   */
  handleFieldChange(field) {
    const { name, value, type, checked } = field;
    
    if (type === 'checkbox') {
      this.formData[name] = checked;
    } else if (type === 'number') {
      this.formData[name] = value ? parseFloat(value) : null;
    } else {
      this.formData[name] = value;
    }

    // Validate on change if field was touched
    if (this.touched.has(name)) {
      this.validateField(name);
    }

    // Call onChange callback
    if (this.options.onChange) {
      this.options.onChange(this.formData, name);
    }
  }

  /**
   * Add item to array field
   */
  addArrayItem(key) {
    const input = this.container.querySelector(`.tag-input[data-key="${key}"]`);
    if (!input || !input.value.trim()) return;

    if (!this.formData[key]) {
      this.formData[key] = [];
    }

    this.formData[key].push(input.value.trim());
    input.value = '';

    // Re-render the array field
    const container = this.container.querySelector(`#${this.container.id}-${key}-container`);
    if (container) {
      const fieldSchema = this.schema.properties[key];
      container.innerHTML = this.renderArrayField(key, fieldSchema, this.formData[key]);
    }

    if (this.options.onChange) {
      this.options.onChange(this.formData, key);
    }
  }

  /**
   * Remove item from array field
   */
  removeArrayItem(key, index) {
    if (this.formData[key] && Array.isArray(this.formData[key])) {
      this.formData[key].splice(index, 1);

      // Re-render the array field
      const container = this.container.querySelector(`#${this.container.id}-${key}-container`);
      if (container) {
        const fieldSchema = this.schema.properties[key];
        container.innerHTML = this.renderArrayField(key, fieldSchema, this.formData[key]);
      }

      if (this.options.onChange) {
        this.options.onChange(this.formData, key);
      }
    }
  }

  /**
   * Validate a single field
   */
  validateField(fieldName) {
    const fieldSchema = this.schema.properties[fieldName];
    if (!fieldSchema) return true;

    const value = this.formData[fieldName];
    const errors = [];

    // Required validation
    if (this.schema.required && this.schema.required.includes(fieldName)) {
      if (value === undefined || value === null || value === '') {
        errors.push('This field is required');
      }
    }

    // Type-specific validation
    if (value !== undefined && value !== null && value !== '') {
      // String validations
      if (fieldSchema.type === 'string') {
        if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
          errors.push(`Must be at least ${fieldSchema.minLength} characters`);
        }
        if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
          errors.push(`Must be no more than ${fieldSchema.maxLength} characters`);
        }
        if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
          errors.push('Invalid format');
        }
      }

      // Number validations
      if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
        const numValue = parseFloat(value);
        if (fieldSchema.minimum !== undefined && numValue < fieldSchema.minimum) {
          errors.push(`Must be at least ${fieldSchema.minimum}`);
        }
        if (fieldSchema.maximum !== undefined && numValue > fieldSchema.maximum) {
          errors.push(`Must be no more than ${fieldSchema.maximum}`);
        }
      }
    }

    // Update errors
    if (errors.length > 0) {
      this.errors[fieldName] = errors[0]; // Show first error
    } else {
      delete this.errors[fieldName];
    }

    // Update UI
    this.updateFieldError(fieldName);

    return errors.length === 0;
  }

  /**
   * Update field error display
   */
  updateFieldError(fieldName) {
    const field = this.container.querySelector(`[name="${fieldName}"]`);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    const errorSpan = formGroup.querySelector('.error-message');
    const error = this.errors[fieldName];

    if (error && this.touched.has(fieldName)) {
      formGroup.classList.add('has-error');
      field.classList.add('error');
      if (errorSpan) {
        errorSpan.textContent = error;
      } else {
        formGroup.insertAdjacentHTML('beforeend', `<span class="error-message">${error}</span>`);
      }
    } else {
      formGroup.classList.remove('has-error');
      field.classList.remove('error');
      if (errorSpan) {
        errorSpan.remove();
      }
    }
  }

  /**
   * Validate entire form
   */
  validateForm() {
    let isValid = true;

    // Validate all fields
    Object.keys(this.schema.properties).forEach(fieldName => {
      this.touched.add(fieldName);
      if (!this.validateField(fieldName)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    // Validate form
    if (!this.validateForm()) {
      this.showMessage('Please correct the errors before submitting', 'error');
      return;
    }

    // Disable submit button
    const submitBtn = this.container.querySelector(`#${this.container.id}-submit`);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      // Call onSubmit callback
      if (this.options.onSubmit) {
        await this.options.onSubmit(this.formData);
      }

      this.showMessage('Form submitted successfully!', 'success');
    } catch (error) {
      console.error('Form submission error:', error);
      this.showMessage(error.message || 'Failed to submit form', 'error');
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = this.options.submitText;
      }
    }
  }

  /**
   * Show message
   */
  showMessage(message, type = 'info') {
    const messageHtml = `
      <div class="form-message ${type}">
        ${message}
      </div>
    `;

    // Remove existing messages
    const existingMessage = this.container.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Insert new message
    const form = this.container.querySelector('form');
    if (form) {
      form.insertAdjacentHTML('afterbegin', messageHtml);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        const msg = this.container.querySelector('.form-message');
        if (msg) msg.remove();
      }, 5000);
    }
  }

  /**
   * Get current form data
   */
  getData() {
    return { ...this.formData };
  }

  /**
   * Get validation errors
   */
  getErrors() {
    return { ...this.errors };
  }

  /**
   * Reset form
   */
  reset() {
    this.formData = {};
    this.errors = {};
    this.touched = new Set();
    this.render();
  }
}

// Add styles if not already present
if (!document.getElementById('form-renderer-styles')) {
  const styles = `
    <style id="form-renderer-styles">
      .dynamic-form {
        max-width: 800px;
        margin: 0 auto;
      }

      .form-header {
        margin-bottom: 2rem;
      }

      .form-header h3 {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary);
      }

      .form-description {
        color: var(--text-secondary);
        margin: 0;
      }

      .form-fields {
        margin-bottom: 2rem;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group.has-error .form-control {
        border-color: var(--red);
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      .required {
        color: var(--red);
        margin-left: 0.25rem;
      }

      .field-description {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0.25rem 0 0.5rem 0;
      }

      .form-control {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-light);
        border-radius: 6px;
        font-size: 1rem;
        font-family: var(--font-family);
        background: var(--white);
        transition: border-color 0.2s;
      }

      .form-control:focus {
        outline: none;
        border-color: var(--blue);
        box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
      }

      .form-control.error {
        border-color: var(--red);
      }

      .form-control[readonly] {
        background: var(--bone);
        cursor: not-allowed;
      }

      select.form-control {
        cursor: pointer;
      }

      textarea.form-control {
        resize: vertical;
        min-height: 100px;
      }

      .checkbox-group {
        margin-bottom: 1rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      .checkbox-label input[type="checkbox"] {
        margin-right: 0.5rem;
      }

      .error-message {
        display: block;
        color: var(--red);
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--border-light);
      }

      .form-message {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.95rem;
      }

      .form-message.success {
        background: rgba(39, 174, 96, 0.1);
        border: 1px solid rgba(39, 174, 96, 0.2);
        color: var(--green);
      }

      .form-message.error {
        background: rgba(230, 57, 70, 0.1);
        border: 1px solid rgba(230, 57, 70, 0.2);
        color: var(--red);
      }

      .form-message.info {
        background: rgba(0, 87, 255, 0.1);
        border: 1px solid rgba(0, 87, 255, 0.2);
        color: var(--blue);
      }

      /* Array field styles */
      .array-field {
        border: 1px solid var(--border-light);
        border-radius: 6px;
        padding: 1rem;
        background: var(--bone);
      }

      .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.75rem;
        background: var(--white);
        border: 1px solid var(--border-light);
        border-radius: 20px;
        font-size: 0.875rem;
      }

      .tag-remove {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        font-size: 1.25rem;
        line-height: 1;
      }

      .tag-remove:hover {
        color: var(--red);
      }

      .tag-input-container {
        display: flex;
        gap: 0.5rem;
      }

      .tag-input {
        flex: 1;
      }

      .btn-small {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
      }

      /* Object field styles */
      .object-field {
        border: 1px solid var(--border-light);
        border-radius: 6px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        background: var(--bone);
      }

      .object-field legend {
        font-weight: 600;
        color: var(--text-primary);
        padding: 0 0.5rem;
      }
    </style>
  `;
  document.head.insertAdjacentHTML('beforeend', styles);
}

// Export for use
window.FormRenderer = FormRenderer;