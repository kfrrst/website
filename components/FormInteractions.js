/**
 * Advanced Form Interactions
 * Enhanced form experiences with smart validation, auto-completion, and dynamic behavior
 */
export class FormInteractions {
  constructor(options = {}) {
    this.options = {
      // Validation settings
      realTimeValidation: options.realTimeValidation !== false,
      validationDelay: options.validationDelay || 300,
      showValidationOnBlur: options.showValidationOnBlur !== false,
      
      // Auto-completion settings
      enableAutoComplete: options.enableAutoComplete !== false,
      autoCompleteDelay: options.autoCompleteDelay || 200,
      maxSuggestions: options.maxSuggestions || 5,
      
      // Dynamic field settings
      enableDynamicFields: options.enableDynamicFields !== false,
      enableConditionalFields: options.enableConditionalFields !== false,
      enableFieldMasking: options.enableFieldMasking !== false,
      
      // UI enhancements
      enableFloatingLabels: options.enableFloatingLabels !== false,
      enableProgressIndicator: options.enableProgressIndicator !== false,
      enableSmartDefaults: options.enableSmartDefaults !== false,
      
      // Accessibility
      enableA11yEnhancements: options.enableA11yEnhancements !== false,
      announceValidation: options.announceValidation !== false,
      
      // Debug
      debug: options.debug || false,
      
      ...options
    };

    this.forms = new Map();
    this.validators = new Map();
    this.autoCompleteCache = new Map();
    this.debounceTimers = new Map();
    this.fieldDependencies = new Map();

    this.init();
  }

  /**
   * Initialize form interactions
   */
  init() {
    if (this.options.debug) {
      console.log('📝 FormInteractions initializing...');
    }

    // Setup form interaction styles
    this.setupFormStyles();

    // Setup validation rules
    this.setupValidationRules();

    // Setup auto-complete data sources
    this.setupAutoComplete();

    // Setup global form handlers
    this.setupGlobalHandlers();

    // Auto-enhance existing forms
    this.enhanceExistingForms();

    if (this.options.debug) {
      console.log('✅ FormInteractions initialized');
    }
  }

  /**
   * Setup form interaction styles
   */
  setupFormStyles() {
    if (document.getElementById('form-interactions-styles')) return;

    const style = document.createElement('style');
    style.id = 'form-interactions-styles';
    style.textContent = `
      /* Advanced Form Interactions Styles */
      
      /* Enhanced form containers */
      .form-enhanced {
        position: relative;
      }
      
      .form-progress {
        position: sticky;
        top: 0;
        background: #ffffff;
        border-bottom: 1px solid #e5e7eb;
        padding: 12px 0;
        margin-bottom: 24px;
        z-index: 10;
      }
      
      .form-progress-bar {
        width: 100%;
        height: 4px;
        background: #f3f4f6;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .form-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #0057FF, #F7C600);
        border-radius: inherit;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .form-progress-text {
        text-align: center;
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
      }
      
      /* Floating label fields */
      .field-floating {
        position: relative;
        margin-bottom: 24px;
      }
      
      .field-floating input,
      .field-floating textarea,
      .field-floating select {
        width: 100%;
        padding: 16px 12px 8px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 16px;
        background: #ffffff;
        transition: all 0.2s ease;
        outline: none;
      }
      
      .field-floating label {
        position: absolute;
        left: 12px;
        top: 16px;
        font-size: 16px;
        color: #6b7280;
        pointer-events: none;
        transition: all 0.2s ease;
        transform-origin: left top;
      }
      
      .field-floating input:focus,
      .field-floating textarea:focus,
      .field-floating select:focus,
      .field-floating input:not(:placeholder-shown),
      .field-floating textarea:not(:placeholder-shown),
      .field-floating select:not([value=""]) {
        border-color: #0057FF;
        box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
      }
      
      .field-floating input:focus + label,
      .field-floating textarea:focus + label,
      .field-floating select:focus + label,
      .field-floating input:not(:placeholder-shown) + label,
      .field-floating textarea:not(:placeholder-shown) + label,
      .field-floating select:not([value=""]) + label,
      .field-floating.has-value label {
        transform: translateY(-12px) scale(0.75);
        color: #0057FF;
        font-weight: 500;
      }
      
      /* Validation states */
      .field-valid input,
      .field-valid textarea,
      .field-valid select {
        border-color: #27AE60;
        box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
      }
      
      .field-valid label {
        color: #27AE60 !important;
      }
      
      .field-invalid input,
      .field-invalid textarea,
      .field-invalid select {
        border-color: #E63946;
        box-shadow: 0 0 0 3px rgba(230, 57, 70, 0.1);
      }
      
      .field-invalid label {
        color: #E63946 !important;
      }
      
      .field-validating input,
      .field-validating textarea,
      .field-validating select {
        border-color: #F7C600;
        box-shadow: 0 0 0 3px rgba(247, 196, 0, 0.1);
      }
      
      /* Validation messages */
      .field-message {
        margin-top: 6px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        transform: translateY(-4px);
        transition: all 0.2s ease;
      }
      
      .field-message.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .field-message-success {
        color: #27AE60;
      }
      
      .field-message-error {
        color: #E63946;
      }
      
      .field-message-warning {
        color: #F7C600;
      }
      
      .field-message-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
      
      /* Auto-complete dropdown */
      .autocomplete-container {
        position: relative;
      }
      
      .autocomplete-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-height: 240px;
        overflow-y: auto;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: all 0.2s ease;
      }
      
      .autocomplete-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .autocomplete-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6;
        transition: background-color 0.1s ease;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .autocomplete-item:last-child {
        border-bottom: none;
      }
      
      .autocomplete-item:hover,
      .autocomplete-item.highlighted {
        background: #f8fafc;
      }
      
      .autocomplete-item.selected {
        background: #eff6ff;
        color: #0057FF;
      }
      
      .autocomplete-main {
        flex: 1;
        font-weight: 500;
      }
      
      .autocomplete-secondary {
        font-size: 12px;
        color: #6b7280;
      }
      
      .autocomplete-icon {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      
      /* Field masking */
      .field-masked input {
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        letter-spacing: 0.05em;
      }
      
      /* Smart suggestions */
      .field-suggestions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      
      .suggestion-chip {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 4px 12px;
        font-size: 12px;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .suggestion-chip:hover {
        background: #e5e7eb;
        border-color: #d1d5db;
      }
      
      .suggestion-chip:active {
        transform: scale(0.95);
      }
      
      /* Character counter */
      .field-counter {
        position: absolute;
        bottom: -20px;
        right: 0;
        font-size: 12px;
        color: #6b7280;
      }
      
      .field-counter.warning {
        color: #F7C600;
      }
      
      .field-counter.error {
        color: #E63946;
      }
      
      /* Conditional fields */
      .field-conditional {
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .field-conditional.hidden {
        max-height: 0;
        margin: 0;
        padding: 0;
        opacity: 0;
      }
      
      .field-conditional.show {
        max-height: 500px;
        opacity: 1;
      }
      
      /* Dynamic field groups */
      .field-group-dynamic {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        position: relative;
      }
      
      .field-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .field-group-title {
        font-weight: 600;
        color: #111827;
      }
      
      .field-group-remove {
        background: #fef2f2;
        color: #E63946;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .field-group-remove:hover {
        background: #fee2e2;
        border-color: #fca5a5;
      }
      
      .field-add-group {
        background: #f0f9ff;
        color: #0057FF;
        border: 2px dashed #93c5fd;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 16px;
      }
      
      .field-add-group:hover {
        background: #dbeafe;
        border-color: #60a5fa;
      }
      
      /* Password strength indicator */
      .password-strength {
        margin-top: 8px;
      }
      
      .password-strength-bar {
        height: 4px;
        background: #f3f4f6;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .password-strength-fill {
        height: 100%;
        transition: all 0.3s ease;
        border-radius: inherit;
      }
      
      .password-strength-weak .password-strength-fill {
        width: 25%;
        background: #E63946;
      }
      
      .password-strength-fair .password-strength-fill {
        width: 50%;
        background: #F7C600;
      }
      
      .password-strength-good .password-strength-fill {
        width: 75%;
        background: #3b82f6;
      }
      
      .password-strength-strong .password-strength-fill {
        width: 100%;
        background: #27AE60;
      }
      
      .password-requirements {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 4px;
        font-size: 12px;
      }
      
      .password-requirement {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #6b7280;
      }
      
      .password-requirement.met {
        color: #27AE60;
      }
      
      .password-requirement-icon {
        font-size: 14px;
      }
      
      /* File upload enhancement */
      .file-upload-enhanced {
        position: relative;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 32px 16px;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      .file-upload-enhanced:hover {
        border-color: #0057FF;
        background: #f8fafc;
      }
      
      .file-upload-enhanced.dragover {
        border-color: #0057FF;
        background: #eff6ff;
        transform: scale(1.02);
      }
      
      .file-upload-icon {
        font-size: 48px;
        color: #9ca3af;
        margin-bottom: 16px;
      }
      
      .file-upload-text {
        font-weight: 500;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .file-upload-hint {
        font-size: 14px;
        color: #6b7280;
      }
      
      .file-list {
        margin-top: 16px;
        space-y: 8px;
      }
      
      .file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }
      
      .file-item-icon {
        font-size: 16px;
        color: #6b7280;
      }
      
      .file-item-info {
        flex: 1;
      }
      
      .file-item-name {
        font-weight: 500;
        font-size: 14px;
        color: #111827;
      }
      
      .file-item-size {
        font-size: 12px;
        color: #6b7280;
      }
      
      .file-item-remove {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .file-item-remove:hover {
        background: #f3f4f6;
        color: #E63946;
      }
      
      /* Mobile optimizations */
      @media (max-width: 640px) {
        .field-floating input,
        .field-floating textarea,
        .field-floating select {
          font-size: 16px; /* Prevents zoom on iOS */
        }
        
        .autocomplete-dropdown {
          max-height: 200px;
        }
        
        .field-suggestions {
          max-height: 100px;
          overflow-y: auto;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .form-progress {
          background: #1f2937;
          border-color: #374151;
        }
        
        .field-floating input,
        .field-floating textarea,
        .field-floating select {
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        }
        
        .field-floating label {
          color: #d1d5db;
        }
        
        .autocomplete-dropdown {
          background: #1f2937;
          border-color: #374151;
        }
        
        .autocomplete-item:hover,
        .autocomplete-item.highlighted {
          background: #374151;
        }
        
        .suggestion-chip {
          background: #374151;
          border-color: #4b5563;
          color: #d1d5db;
        }
        
        .field-group-dynamic {
          border-color: #374151;
        }
        
        .file-upload-enhanced {
          border-color: #4b5563;
        }
        
        .file-upload-enhanced:hover {
          background: #374151;
        }
        
        .file-item {
          background: #374151;
          border-color: #4b5563;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .field-floating input,
        .field-floating textarea,
        .field-floating select,
        .field-floating label,
        .field-message,
        .autocomplete-dropdown,
        .field-conditional,
        .file-upload-enhanced {
          transition: none;
        }
        
        .file-upload-enhanced.dragover {
          transform: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup validation rules
   */
  setupValidationRules() {
    // Email validation
    this.validators.set('email', {
      test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address'
    });

    // Phone validation
    this.validators.set('phone', {
      test: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, '')),
      message: 'Please enter a valid phone number'
    });

    // Password strength
    this.validators.set('password', {
      test: (value) => this.checkPasswordStrength(value).score >= 3,
      message: 'Password must be strong (8+ chars, uppercase, lowercase, number, symbol)'
    });

    // URL validation
    this.validators.set('url', {
      test: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    });

    // Credit card validation (basic Luhn algorithm)
    this.validators.set('creditcard', {
      test: (value) => this.validateCreditCard(value.replace(/\s/g, '')),
      message: 'Please enter a valid credit card number'
    });

    // Required field
    this.validators.set('required', {
      test: (value) => value && value.toString().trim().length > 0,
      message: 'This field is required'
    });

    // Minimum length
    this.validators.set('minlength', {
      test: (value, min) => value && value.length >= min,
      message: (min) => `Must be at least ${min} characters`
    });

    // Maximum length
    this.validators.set('maxlength', {
      test: (value, max) => !value || value.length <= max,
      message: (max) => `Must be no more than ${max} characters`
    });

    // Numeric validation
    this.validators.set('numeric', {
      test: (value) => !value || /^\d*\.?\d*$/.test(value),
      message: 'Please enter a valid number'
    });

    // Date validation
    this.validators.set('date', {
      test: (value) => !value || !isNaN(Date.parse(value)),
      message: 'Please enter a valid date'
    });
  }

  /**
   * Setup auto-complete data sources
   */
  setupAutoComplete() {
    // Common email domains
    this.autoCompleteCache.set('email-domains', [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
      'aol.com', 'protonmail.com', 'mail.com'
    ]);

    // Common company domains
    this.autoCompleteCache.set('company-domains', [
      'company.com', 'business.com', 'corp.com', 'inc.com', 'llc.com',
      'agency.com', 'studio.com', 'group.com'
    ]);

    // Countries
    this.autoCompleteCache.set('countries', [
      'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
      'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
    ]);

    // Job titles
    this.autoCompleteCache.set('job-titles', [
      'CEO', 'CTO', 'CMO', 'Manager', 'Director', 'Designer', 'Developer',
      'Marketing Manager', 'Sales Manager', 'Project Manager', 'Consultant'
    ]);
  }

  /**
   * Setup global form handlers
   */
  setupGlobalHandlers() {
    // Auto-enhance forms
    document.addEventListener('DOMContentLoaded', () => {
      this.enhanceExistingForms();
    });

    // Handle dynamic form additions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const forms = node.matches ? (node.matches('form') ? [node] : []) : [];
            forms.push(...(node.querySelectorAll ? Array.from(node.querySelectorAll('form')) : []));
            forms.forEach(form => this.enhanceForm(form));
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Enhance existing forms
   */
  enhanceExistingForms() {
    document.querySelectorAll('form').forEach(form => {
      this.enhanceForm(form);
    });
  }

  /**
   * Enhance a form with advanced interactions
   */
  enhanceForm(form) {
    if (form.dataset.enhanced) return;

    const formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    form.dataset.enhanced = 'true';
    form.dataset.formId = formId;
    form.classList.add('form-enhanced');

    const formConfig = {
      id: formId,
      element: form,
      fields: new Map(),
      validation: {
        realTime: this.options.realTimeValidation,
        onSubmit: true,
        showOnBlur: this.options.showValidationOnBlur
      },
      progress: {
        enabled: this.options.enableProgressIndicator,
        current: 0,
        total: 0
      }
    };

    // Enhance form fields
    this.enhanceFormFields(form, formConfig);

    // Setup form progress
    if (this.options.enableProgressIndicator) {
      this.setupFormProgress(form, formConfig);
    }

    // Setup form validation
    this.setupFormValidation(form, formConfig);

    // Setup form submission
    this.setupFormSubmission(form, formConfig);

    this.forms.set(formId, formConfig);

    if (this.options.debug) {
      console.log(`📝 Enhanced form with ID: ${formId}`);
    }
  }

  /**
   * Enhance form fields
   */
  enhanceFormFields(form, formConfig) {
    const fields = form.querySelectorAll('input, textarea, select');
    
    fields.forEach(field => {
      const fieldConfig = this.createFieldConfig(field);
      formConfig.fields.set(field, fieldConfig);

      // Apply enhancements
      this.enhanceField(field, fieldConfig);
      
      // Count valid fields for progress
      if (!field.disabled && field.type !== 'hidden') {
        formConfig.progress.total++;
      }
    });
  }

  /**
   * Create field configuration
   */
  createFieldConfig(field) {
    const config = {
      element: field,
      type: field.type || 'text',
      required: field.hasAttribute('required') || field.dataset.required === 'true',
      validators: [],
      autoComplete: field.dataset.autocomplete || null,
      mask: field.dataset.mask || null,
      maxLength: field.maxLength > 0 ? field.maxLength : null,
      suggestions: field.dataset.suggestions ? field.dataset.suggestions.split(',') : [],
      conditional: field.dataset.conditional || null,
      valid: false,
      pristine: true
    };

    // Parse validation rules from data attributes
    Object.keys(field.dataset).forEach(key => {
      if (key.startsWith('validate')) {
        const rule = key.replace('validate', '').toLowerCase();
        const value = field.dataset[key];
        config.validators.push({ rule, value });
      }
    });

    // Add built-in validators based on field type
    if (config.type === 'email') {
      config.validators.push({ rule: 'email' });
    }
    
    if (config.type === 'tel') {
      config.validators.push({ rule: 'phone' });
    }
    
    if (config.type === 'url') {
      config.validators.push({ rule: 'url' });
    }
    
    if (config.type === 'password') {
      config.validators.push({ rule: 'password' });
    }

    if (config.required) {
      config.validators.unshift({ rule: 'required' });
    }

    return config;
  }

  /**
   * Enhance individual field
   */
  enhanceField(field, config) {
    const container = this.createFieldContainer(field, config);
    
    // Apply floating labels
    if (this.options.enableFloatingLabels) {
      this.applyFloatingLabel(container, field, config);
    }

    // Apply field masking
    if (this.options.enableFieldMasking && config.mask) {
      this.applyFieldMask(field, config.mask);
    }

    // Setup auto-complete
    if (this.options.enableAutoComplete && config.autoComplete) {
      this.setupFieldAutoComplete(field, config);
    }

    // Setup character counter
    if (config.maxLength) {
      this.setupCharacterCounter(container, field, config);
    }

    // Setup password strength indicator
    if (config.type === 'password') {
      this.setupPasswordStrength(container, field, config);
    }

    // Setup file upload enhancement
    if (config.type === 'file') {
      this.enhanceFileUpload(container, field, config);
    }

    // Setup smart suggestions
    if (config.suggestions.length > 0) {
      this.setupSmartSuggestions(container, field, config);
    }

    // Setup conditional fields
    if (this.options.enableConditionalFields && config.conditional) {
      this.setupConditionalField(field, config);
    }

    // Setup real-time validation
    if (this.options.realTimeValidation) {
      this.setupRealTimeValidation(field, config);
    }
  }

  /**
   * Create field container
   */
  createFieldContainer(field, config) {
    if (field.parentNode.classList.contains('field-floating')) {
      return field.parentNode;
    }

    const container = document.createElement('div');
    container.className = 'field-floating';
    
    // Move field into container
    field.parentNode.insertBefore(container, field);
    container.appendChild(field);

    return container;
  }

  /**
   * Apply floating label
   */
  applyFloatingLabel(container, field, config) {
    let label = container.querySelector('label');
    
    if (!label) {
      // Create label from placeholder or field name
      label = document.createElement('label');
      label.textContent = field.placeholder || field.name || 'Field';
      label.setAttribute('for', field.id || `field-${Date.now()}`);
      
      if (!field.id) {
        field.id = label.getAttribute('for');
      }
      
      container.appendChild(label);
    } else {
      // Move existing label into container
      container.appendChild(label);
    }

    // Clear placeholder to avoid conflicts
    field.placeholder = ' ';

    // Setup value change detection
    const updateLabelState = () => {
      if (field.value && field.value.length > 0) {
        container.classList.add('has-value');
      } else {
        container.classList.remove('has-value');
      }
    };

    field.addEventListener('input', updateLabelState);
    field.addEventListener('change', updateLabelState);
    field.addEventListener('blur', updateLabelState);
    
    // Initial check
    updateLabelState();
  }

  /**
   * Apply field mask
   */
  applyFieldMask(field, mask) {
    field.classList.add('field-masked');
    
    const applyMask = (value, mask) => {
      let masked = '';
      let valueIndex = 0;
      
      for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
        if (mask[i] === '9') {
          if (/\d/.test(value[valueIndex])) {
            masked += value[valueIndex];
            valueIndex++;
          } else {
            break;
          }
        } else if (mask[i] === 'A') {
          if (/[A-Za-z]/.test(value[valueIndex])) {
            masked += value[valueIndex].toUpperCase();
            valueIndex++;
          } else {
            break;
          }
        } else if (mask[i] === 'a') {
          if (/[A-Za-z]/.test(value[valueIndex])) {
            masked += value[valueIndex].toLowerCase();
            valueIndex++;
          } else {
            break;
          }
        } else {
          masked += mask[i];
        }
      }
      
      return masked;
    };

    field.addEventListener('input', (e) => {
      const rawValue = e.target.value.replace(/[^\w]/g, '');
      const maskedValue = applyMask(rawValue, mask);
      
      if (e.target.value !== maskedValue) {
        e.target.value = maskedValue;
      }
    });
  }

  /**
   * Setup field auto-complete
   */
  setupFieldAutoComplete(field, config) {
    const container = field.closest('.field-floating');
    container.classList.add('autocomplete-container');

    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    container.appendChild(dropdown);

    let highlightedIndex = -1;
    let suggestions = [];

    const showSuggestions = (items) => {
      suggestions = items;
      dropdown.innerHTML = '';
      
      if (items.length === 0) {
        dropdown.classList.remove('show');
        return;
      }

      items.forEach((item, index) => {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'autocomplete-item';
        
        if (typeof item === 'object') {
          suggestionEl.innerHTML = `
            <div class="autocomplete-icon">${item.icon || '💼'}</div>
            <div>
              <div class="autocomplete-main">${item.label}</div>
              ${item.secondary ? `<div class="autocomplete-secondary">${item.secondary}</div>` : ''}
            </div>
          `;
          suggestionEl.dataset.value = item.value || item.label;
        } else {
          suggestionEl.innerHTML = `<div class="autocomplete-main">${item}</div>`;
          suggestionEl.dataset.value = item;
        }

        suggestionEl.addEventListener('click', () => {
          field.value = suggestionEl.dataset.value;
          dropdown.classList.remove('show');
          field.focus();
          this.validateField(field, config);
        });

        dropdown.appendChild(suggestionEl);
      });

      dropdown.classList.add('show');
      highlightedIndex = -1;
    };

    const getSuggestions = async (query) => {
      if (!query || query.length < 2) {
        dropdown.classList.remove('show');
        return;
      }

      // Get suggestions from cache or API
      let suggestions = [];
      
      if (config.autoComplete === 'email') {
        const [localPart, domain] = query.split('@');
        if (domain) {
          const domains = this.autoCompleteCache.get('email-domains');
          suggestions = domains
            .filter(d => d.startsWith(domain))
            .map(d => `${localPart}@${d}`)
            .slice(0, this.options.maxSuggestions);
        }
      } else if (this.autoCompleteCache.has(config.autoComplete)) {
        const cached = this.autoCompleteCache.get(config.autoComplete);
        suggestions = cached
          .filter(item => item.toLowerCase().includes(query.toLowerCase()))
          .slice(0, this.options.maxSuggestions);
      } else {
        // Try to fetch from API
        try {
          const response = await fetch(`/api/autocomplete/${config.autoComplete}?q=${encodeURIComponent(query)}`);
          if (response.ok) {
            suggestions = await response.json();
          }
        } catch (error) {
          if (this.options.debug) {
            console.warn('Autocomplete API error:', error);
          }
        }
      }

      showSuggestions(suggestions);
    };

    // Debounced input handler
    field.addEventListener('input', (e) => {
      const query = e.target.value;
      
      if (this.debounceTimers.has(field)) {
        clearTimeout(this.debounceTimers.get(field));
      }
      
      const timer = setTimeout(() => {
        getSuggestions(query);
      }, this.options.autoCompleteDelay);
      
      this.debounceTimers.set(field, timer);
    });

    // Keyboard navigation
    field.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
        updateHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        updateHighlight();
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        items[highlightedIndex].click();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('show');
        highlightedIndex = -1;
      }
    });

    const updateHighlight = () => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      items.forEach((item, index) => {
        item.classList.toggle('highlighted', index === highlightedIndex);
      });
    };

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  }

  /**
   * Setup character counter
   */
  setupCharacterCounter(container, field, config) {
    const counter = document.createElement('div');
    counter.className = 'field-counter';
    container.appendChild(counter);

    const updateCounter = () => {
      const current = field.value.length;
      const max = config.maxLength;
      
      counter.textContent = `${current}/${max}`;
      
      counter.classList.remove('warning', 'error');
      if (current > max * 0.9) {
        counter.classList.add('warning');
      }
      if (current > max) {
        counter.classList.add('error');
      }
    };

    field.addEventListener('input', updateCounter);
    updateCounter();
  }

  /**
   * Setup password strength indicator
   */
  setupPasswordStrength(container, field, config) {
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength';
    
    strengthContainer.innerHTML = `
      <div class="password-strength-bar">
        <div class="password-strength-fill"></div>
      </div>
      <div class="password-requirements">
        <div class="password-requirement" data-req="length">
          <span class="password-requirement-icon">○</span>
          At least 8 characters
        </div>
        <div class="password-requirement" data-req="uppercase">
          <span class="password-requirement-icon">○</span>
          Uppercase letter
        </div>
        <div class="password-requirement" data-req="lowercase">
          <span class="password-requirement-icon">○</span>
          Lowercase letter
        </div>
        <div class="password-requirement" data-req="number">
          <span class="password-requirement-icon">○</span>
          Number
        </div>
        <div class="password-requirement" data-req="symbol">
          <span class="password-requirement-icon">○</span>
          Special character
        </div>
      </div>
    `;
    
    container.appendChild(strengthContainer);

    field.addEventListener('input', () => {
      const strength = this.checkPasswordStrength(field.value);
      
      // Update strength bar
      strengthContainer.className = `password-strength password-strength-${strength.level}`;
      
      // Update requirements
      const requirements = strengthContainer.querySelectorAll('.password-requirement');
      requirements.forEach(req => {
        const reqType = req.dataset.req;
        const met = strength.requirements[reqType];
        const icon = req.querySelector('.password-requirement-icon');
        
        req.classList.toggle('met', met);
        icon.textContent = met ? '✓' : '○';
      });
    });
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    let level = 'weak';
    
    if (score >= 5) level = 'strong';
    else if (score >= 4) level = 'good';
    else if (score >= 3) level = 'fair';

    return { score, level, requirements };
  }

  /**
   * Setup smart suggestions
   */
  setupSmartSuggestions(container, field, config) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'field-suggestions';
    
    config.suggestions.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggestion-chip';
      chip.textContent = suggestion;
      
      chip.addEventListener('click', () => {
        field.value = suggestion;
        field.focus();
        this.validateField(field, config);
      });
      
      suggestionsContainer.appendChild(chip);
    });
    
    container.appendChild(suggestionsContainer);
  }

  /**
   * Setup form progress indicator
   */
  setupFormProgress(form, formConfig) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'form-progress';
    progressContainer.innerHTML = `
      <div class="form-progress-bar">
        <div class="form-progress-fill"></div>
      </div>
      <div class="form-progress-text">0% Complete</div>
    `;
    
    form.insertBefore(progressContainer, form.firstChild);
    
    formConfig.progressElement = progressContainer;
    this.updateFormProgress(formConfig);
  }

  /**
   * Update form progress
   */
  updateFormProgress(formConfig) {
    if (!formConfig.progressElement) return;

    let validFields = 0;
    formConfig.fields.forEach(fieldConfig => {
      if (fieldConfig.valid || fieldConfig.element.disabled || fieldConfig.element.type === 'hidden') {
        validFields++;
      }
    });

    const percentage = Math.round((validFields / formConfig.progress.total) * 100);
    
    const fill = formConfig.progressElement.querySelector('.form-progress-fill');
    const text = formConfig.progressElement.querySelector('.form-progress-text');
    
    fill.style.width = `${percentage}%`;
    text.textContent = `${percentage}% Complete`;
  }

  /**
   * Setup real-time validation
   */
  setupRealTimeValidation(field, config) {
    const validateOnInput = () => {
      if (!config.pristine) {
        this.validateField(field, config);
      }
    };

    const validateOnBlur = () => {
      config.pristine = false;
      this.validateField(field, config);
    };

    field.addEventListener('input', validateOnInput);
    if (this.options.showValidationOnBlur) {
      field.addEventListener('blur', validateOnBlur);
    }
  }

  /**
   * Validate field
   */
  async validateField(field, config) {
    const container = field.closest('.field-floating');
    const value = field.value;

    // Clear previous validation state
    container.classList.remove('field-valid', 'field-invalid', 'field-validating');
    
    // Show validating state
    container.classList.add('field-validating');

    let isValid = true;
    let errorMessage = '';

    // Run all validators
    for (const validator of config.validators) {
      const validatorFunc = this.validators.get(validator.rule);
      if (validatorFunc) {
        const result = validatorFunc.test(value, validator.value);
        if (!result) {
          isValid = false;
          errorMessage = typeof validatorFunc.message === 'function' 
            ? validatorFunc.message(validator.value)
            : validatorFunc.message;
          break;
        }
      }
    }

    // Custom async validation
    if (isValid && field.dataset.validateAsync) {
      try {
        const response = await fetch(`/api/validate/${field.dataset.validateAsync}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, field: field.name })
        });
        
        const result = await response.json();
        if (!result.valid) {
          isValid = false;
          errorMessage = result.message;
        }
      } catch (error) {
        // Handle validation error gracefully
        if (this.options.debug) {
          console.warn('Async validation error:', error);
        }
      }
    }

    // Update validation state
    container.classList.remove('field-validating');
    
    if (isValid) {
      container.classList.add('field-valid');
      config.valid = true;
    } else {
      container.classList.add('field-invalid');
      config.valid = false;
    }

    // Show/hide validation message
    this.showValidationMessage(container, isValid, errorMessage);

    // Update form progress
    const formConfig = this.getFormConfig(field);
    if (formConfig) {
      this.updateFormProgress(formConfig);
    }

    return isValid;
  }

  /**
   * Show validation message
   */
  showValidationMessage(container, isValid, message) {
    let messageEl = container.querySelector('.field-message');
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'field-message';
      container.appendChild(messageEl);
    }

    if (isValid) {
      messageEl.classList.remove('show', 'field-message-error');
      messageEl.classList.add('field-message-success');
      messageEl.innerHTML = `
        <span class="field-message-icon">✓</span>
        <span>Looks good!</span>
      `;
      
      // Show briefly then hide
      messageEl.classList.add('show');
      setTimeout(() => {
        messageEl.classList.remove('show');
      }, 2000);
    } else if (message) {
      messageEl.classList.remove('field-message-success');
      messageEl.classList.add('field-message-error', 'show');
      messageEl.innerHTML = `
        <span class="field-message-icon">⚠</span>
        <span>${message}</span>
      `;
    }
  }

  /**
   * Setup form validation
   */
  setupFormValidation(form, formConfig) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      let allValid = true;
      const validationPromises = [];

      // Validate all fields
      formConfig.fields.forEach((fieldConfig, field) => {
        const promise = this.validateField(field, fieldConfig);
        validationPromises.push(promise);
      });

      const results = await Promise.all(validationPromises);
      allValid = results.every(result => result);

      if (allValid) {
        // Announce success to screen readers
        if (this.options.announceValidation && this.options.enableA11yEnhancements) {
          this.announceToScreenReader('Form validation successful');
        }
        
        // Emit custom event
        form.dispatchEvent(new CustomEvent('form:valid', {
          detail: { formId: formConfig.id, formData: new FormData(form) }
        }));
        
        // Allow form submission to continue
        if (!form.dataset.preventSubmit) {
          form.submit();
        }
      } else {
        // Announce errors to screen readers
        if (this.options.announceValidation && this.options.enableA11yEnhancements) {
          this.announceToScreenReader('Form has validation errors');
        }
        
        // Focus first invalid field
        const firstInvalid = form.querySelector('.field-invalid input, .field-invalid textarea, .field-invalid select');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        
        // Emit custom event
        form.dispatchEvent(new CustomEvent('form:invalid', {
          detail: { formId: formConfig.id, errors: this.getFormErrors(formConfig) }
        }));
      }
    });
  }

  /**
   * Setup form submission
   */
  setupFormSubmission(form, formConfig) {
    form.addEventListener('form:valid', (e) => {
      if (this.options.debug) {
        console.log('Form submitted successfully:', e.detail);
      }
    });

    form.addEventListener('form:invalid', (e) => {
      if (this.options.debug) {
        console.log('Form validation failed:', e.detail);
      }
    });
  }

  /**
   * Enhance file upload
   */
  enhanceFileUpload(container, field, config) {
    const enhancedUpload = document.createElement('div');
    enhancedUpload.className = 'file-upload-enhanced';
    enhancedUpload.innerHTML = `
      <div class="file-upload-icon">📎</div>
      <div class="file-upload-text">Drop files here or click to browse</div>
      <div class="file-upload-hint">Supports: ${field.accept || 'all file types'}</div>
    `;

    const fileList = document.createElement('div');
    fileList.className = 'file-list';

    // Hide original input
    field.style.position = 'absolute';
    field.style.opacity = '0';
    field.style.pointerEvents = 'none';

    container.appendChild(enhancedUpload);
    container.appendChild(fileList);

    // Click to browse
    enhancedUpload.addEventListener('click', () => {
      field.click();
    });

    // Drag and drop
    enhancedUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      enhancedUpload.classList.add('dragover');
    });

    enhancedUpload.addEventListener('dragleave', () => {
      enhancedUpload.classList.remove('dragover');
    });

    enhancedUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      enhancedUpload.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer.files);
      this.handleFileSelection(files, field, fileList);
    });

    // File selection
    field.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.handleFileSelection(files, field, fileList);
    });
  }

  /**
   * Handle file selection
   */
  handleFileSelection(files, field, fileList) {
    fileList.innerHTML = '';

    files.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-item-icon">${this.getFileIcon(file.type)}</div>
        <div class="file-item-info">
          <div class="file-item-name">${file.name}</div>
          <div class="file-item-size">${this.formatFileSize(file.size)}</div>
        </div>
        <button type="button" class="file-item-remove" data-index="${index}">✕</button>
      `;

      fileList.appendChild(fileItem);
    });

    // Handle file removal
    fileList.addEventListener('click', (e) => {
      if (e.target.classList.contains('file-item-remove')) {
        const index = parseInt(e.target.dataset.index);
        const dt = new DataTransfer();
        
        Array.from(field.files).forEach((file, i) => {
          if (i !== index) {
            dt.items.add(file);
          }
        });
        
        field.files = dt.files;
        this.handleFileSelection(Array.from(field.files), field, fileList);
      }
    });
  }

  /**
   * Get file icon
   */
  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📄';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility methods
   */
  validateCreditCard(number) {
    // Basic Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
  }

  getFormConfig(field) {
    const form = field.closest('form');
    if (!form || !form.dataset.formId) return null;
    return this.forms.get(form.dataset.formId);
  }

  getFormErrors(formConfig) {
    const errors = [];
    formConfig.fields.forEach((fieldConfig, field) => {
      if (!fieldConfig.valid) {
        errors.push({
          field: field.name || field.id,
          message: field.closest('.field-floating').querySelector('.field-message-error')?.textContent || 'Invalid value'
        });
      }
    });
    return errors;
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Public API methods
   */
  validateForm(formId) {
    const formConfig = this.forms.get(formId);
    if (!formConfig) return false;

    const promises = [];
    formConfig.fields.forEach((fieldConfig, field) => {
      promises.push(this.validateField(field, fieldConfig));
    });

    return Promise.all(promises).then(results => results.every(r => r));
  }

  getFormData(formId) {
    const formConfig = this.forms.get(formId);
    if (!formConfig) return null;

    return new FormData(formConfig.element);
  }

  resetForm(formId) {
    const formConfig = this.forms.get(formId);
    if (!formConfig) return;

    formConfig.element.reset();
    formConfig.fields.forEach((fieldConfig, field) => {
      fieldConfig.valid = false;
      fieldConfig.pristine = true;
      
      const container = field.closest('.field-floating');
      container.classList.remove('field-valid', 'field-invalid', 'has-value');
      
      const message = container.querySelector('.field-message');
      if (message) {
        message.classList.remove('show');
      }
    });

    this.updateFormProgress(formConfig);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear form configurations
    this.forms.clear();

    // Remove styles
    const styles = document.getElementById('form-interactions-styles');
    if (styles) {
      styles.remove();
    }

    console.log('📝 FormInteractions destroyed');
  }
}

// Create global form interactions instance
export const formInteractions = new FormInteractions({
  debug: process.env.NODE_ENV !== 'production'
});