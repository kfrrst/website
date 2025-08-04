/**
 * Advanced Form System
 * Intelligent form interactions with validation, auto-completion, and dynamic behavior
 */
export class AdvancedFormSystem {
  constructor(options = {}) {
    this.options = {
      // Validation settings
      enableRealTimeValidation: options.enableRealTimeValidation !== false,
      validationDelay: options.validationDelay || 300,
      showValidationOnBlur: options.showValidationOnBlur !== false,
      
      // Auto-completion settings
      enableAutoComplete: options.enableAutoComplete !== false,
      autoCompleteDelay: options.autoCompleteDelay || 200,
      maxSuggestions: options.maxSuggestions || 8,
      
      // Form enhancement settings
      enableSmartDefaults: options.enableSmartDefaults !== false,
      enableFieldDependencies: options.enableFieldDependencies !== false,
      enableProgressTracking: options.enableProgressTracking !== false,
      
      // UX settings
      enableAnimations: options.enableAnimations !== false,
      enableSounds: options.enableSounds || false,
      soundVolume: options.soundVolume || 0.3,
      
      // Accessibility
      enableA11y: options.enableA11y !== false,
      announceValidation: options.announceValidation !== false,
      
      // Debug
      debug: options.debug || false,
      
      ...options
    };

    this.forms = new Map();
    this.validators = new Map();
    this.autoCompleteProviders = new Map();
    this.fieldDependencies = new Map();
    this.validationTimers = new Map();
    this.audioContext = null;

    this.init();
  }

  /**
   * Initialize advanced form system
   */
  init() {
    if (this.options.debug) {
      console.log('📝 AdvancedFormSystem initializing...');
    }

    // Setup form styles
    this.setupFormStyles();

    // Setup built-in validators
    this.setupBuiltInValidators();

    // Setup auto-complete providers
    this.setupAutoCompleteProviders();

    // Setup sound system
    if (this.options.enableSounds) {
      this.setupSoundSystem();
    }

    // Auto-enhance forms
    this.enhanceExistingForms();

    // Setup global event listeners
    this.setupGlobalEventListeners();

    if (this.options.debug) {
      console.log('✅ AdvancedFormSystem initialized');
    }
  }

  /**
   * Setup form styles
   */
  setupFormStyles() {
    if (document.getElementById('advanced-form-styles')) return;

    const style = document.createElement('style');
    style.id = 'advanced-form-styles';
    style.textContent = `
      /* Advanced Form System Styles */
      
      /* Enhanced form container */
      .advanced-form {
        position: relative;
        max-width: 600px;
        margin: 0 auto;
      }
      
      .form-progress {
        width: 100%;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        margin-bottom: 24px;
        overflow: hidden;
      }
      
      .form-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #0057FF, #F7C600);
        border-radius: inherit;
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      .form-progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: progressShimmer 2s infinite;
      }
      
      @keyframes progressShimmer {
        to { left: 100%; }
      }
      
      /* Enhanced form groups */
      .form-group {
        position: relative;
        margin-bottom: 24px;
      }
      
      .form-group.has-error {
        margin-bottom: 32px;
      }
      
      .form-group.required .form-label::after {
        content: ' *';
        color: #ef4444;
        font-weight: 600;
      }
      
      /* Floating labels */
      .form-group-floating {
        position: relative;
      }
      
      .form-input-floating {
        width: 100%;
        padding: 16px 12px 8px 12px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        background: #ffffff;
        transition: all 0.2s ease;
        outline: none;
      }
      
      .form-label-floating {
        position: absolute;
        left: 12px;
        top: 16px;
        color: #6b7280;
        font-size: 16px;
        transition: all 0.2s ease;
        pointer-events: none;
        background: #ffffff;
        padding: 0 4px;
        transform-origin: left top;
      }
      
      .form-input-floating:focus,
      .form-input-floating:not(:placeholder-shown) {
        border-color: #0057FF;
        box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
      }
      
      .form-input-floating:focus + .form-label-floating,
      .form-input-floating:not(:placeholder-shown) + .form-label-floating {
        transform: translateY(-24px) scale(0.85);
        color: #0057FF;
      }
      
      /* Enhanced inputs */
      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        background: #ffffff;
        transition: all 0.2s ease;
        outline: none;
        position: relative;
      }
      
      .form-input:focus {
        border-color: #0057FF;
        box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.1);
      }
      
      .form-input.valid {
        border-color: #27AE60;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2327AE60'%3E%3Cpath fill-rule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clip-rule='evenodd'/%3E%3C/svg%3E");
        background-position: right 12px center;
        background-repeat: no-repeat;
        background-size: 20px;
        padding-right: 44px;
      }
      
      .form-input.invalid {
        border-color: #E63946;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23E63946'%3E%3Cpath fill-rule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E");
        background-position: right 12px center;
        background-repeat: no-repeat;
        background-size: 20px;
        padding-right: 44px;
      }
      
      .form-input:disabled {
        background: #f3f4f6;
        color: #9ca3af;
        cursor: not-allowed;
      }
      
      /* Form labels */
      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 6px;
      }
      
      /* Validation messages */
      .form-validation {
        margin-top: 6px;
        font-size: 14px;
        display: flex;
        align-items: flex-start;
        gap: 6px;
        opacity: 0;
        transform: translateY(-4px);
        transition: all 0.2s ease;
      }
      
      .form-validation.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .form-validation-error {
        color: #E63946;
      }
      
      .form-validation-success {
        color: #27AE60;
      }
      
      .form-validation-warning {
        color: #F7C600;
      }
      
      .form-validation-icon {
        margin-top: 1px;
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
        border: 1px solid #d1d5db;
        border-top: none;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        opacity: 0;
        transform: translateY(-4px);
        transition: all 0.2s ease;
        pointer-events: none;
      }
      
      .autocomplete-dropdown.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      
      .autocomplete-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6;
        transition: background-color 0.15s ease;
        display: flex;
        align-items: center;
        gap: 8px;
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
      
      .autocomplete-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        opacity: 0.6;
      }
      
      .autocomplete-text {
        flex: 1;
      }
      
      .autocomplete-match {
        background: #fef3c7;
        padding: 1px 2px;
        border-radius: 2px;
      }
      
      /* Form sections */
      .form-section {
        margin-bottom: 32px;
        padding: 24px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #f9fafb;
        position: relative;
      }
      
      .form-section-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #0057FF;
        display: inline-block;
      }
      
      .form-section-description {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      /* Conditional fields */
      .form-conditional {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: all 0.3s ease;
        margin-top: 0;
      }
      
      .form-conditional.show {
        opacity: 1;
        max-height: 500px;
        margin-top: 16px;
      }
      
      /* Multi-step forms */
      .form-steps {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 32px;
        position: relative;
      }
      
      .form-step {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        background: #f3f4f6;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        position: relative;
        z-index: 2;
      }
      
      .form-step.active {
        background: #0057FF;
        color: white;
      }
      
      .form-step.completed {
        background: #27AE60;
        color: white;
      }
      
      .form-step-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      }
      
      .form-step-connector {
        height: 2px;
        background: #e5e7eb;
        flex: 1;
        margin: 0 8px;
        position: relative;
        z-index: 1;
      }
      
      .form-step-connector.completed {
        background: #27AE60;
      }
      
      /* Form actions */
      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
        margin-top: 32px;
      }
      
      .form-button {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        min-width: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .form-button-primary {
        background: #0057FF;
        color: white;
      }
      
      .form-button-primary:hover {
        background: #0046CC;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 87, 255, 0.3);
      }
      
      .form-button-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .form-button-secondary:hover {
        background: #e5e7eb;
      }
      
      .form-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      
      .form-button-loading {
        pointer-events: none;
      }
      
      .form-button-loading::before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Smart suggestions */
      .form-suggestion {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 12px;
        margin-top: 8px;
        font-size: 14px;
        color: #1e40af;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .form-suggestion:hover {
        background: #dbeafe;
        border-color: #93c5fd;
      }
      
      .form-suggestion-icon {
        font-size: 16px;
      }
      
      .form-suggestion-dismiss {
        margin-left: auto;
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .form-suggestion-dismiss:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      
      /* Password strength indicator */
      .password-strength {
        margin-top: 8px;
      }
      
      .password-strength-bar {
        height: 4px;
        background: #e5e7eb;
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
        background: #ef4444;
      }
      
      .password-strength-fair .password-strength-fill {
        width: 50%;
        background: #f59e0b;
      }
      
      .password-strength-good .password-strength-fill {
        width: 75%;
        background: #eab308;
      }
      
      .password-strength-strong .password-strength-fill {
        width: 100%;
        background: #22c55e;
      }
      
      .password-requirements {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
      }
      
      .password-requirement {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #6b7280;
        transition: color 0.2s ease;
      }
      
      .password-requirement.met {
        color: #22c55e;
      }
      
      .password-requirement-icon {
        width: 12px;
        height: 12px;
      }
      
      /* File upload enhancements */
      .file-upload-zone {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        background: #f9fafb;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      .file-upload-zone:hover,
      .file-upload-zone.dragover {
        border-color: #0057FF;
        background: #eff6ff;
      }
      
      .file-upload-icon {
        font-size: 48px;
        color: #9ca3af;
        margin-bottom: 12px;
      }
      
      .file-upload-text {
        font-size: 16px;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .file-upload-hint {
        font-size: 14px;
        color: #6b7280;
      }
      
      .file-upload-progress {
        margin-top: 16px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .file-upload-progress.show {
        opacity: 1;
      }
      
      /* Mobile optimizations */
      @media (max-width: 640px) {
        .advanced-form {
          padding: 0 16px;
        }
        
        .form-actions {
          flex-direction: column;
        }
        
        .form-button {
          width: 100%;
        }
        
        .form-steps {
          flex-direction: column;
          gap: 8px;
        }
        
        .form-step-connector {
          display: none;
        }
        
        .autocomplete-dropdown {
          max-height: 150px;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .form-input,
        .form-input-floating,
        .autocomplete-dropdown {
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        }
        
        .form-label,
        .form-label-floating {
          color: #d1d5db;
        }
        
        .form-section {
          background: #111827;
          border-color: #374151;
        }
        
        .form-section-title {
          color: #f9fafb;
        }
        
        .autocomplete-item:hover,
        .autocomplete-item.highlighted {
          background: #374151;
        }
        
        .file-upload-zone {
          background: #111827;
          border-color: #374151;
        }
        
        .file-upload-zone:hover,
        .file-upload-zone.dragover {
          background: #1f2937;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .form-input,
        .form-validation,
        .autocomplete-dropdown,
        .form-conditional,
        .form-step,
        .form-button {
          transition: none;
        }
        
        .form-progress-bar::after,
        .form-button-loading::before {
          animation: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup built-in validators
   */
  setupBuiltInValidators() {
    // Email validator
    this.addValidator('email', {
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: 'Please enter a valid email address'
    });

    // Phone validator
    this.addValidator('phone', {
      validate: (value) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid phone number'
    });

    // URL validator
    this.addValidator('url', {
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Please enter a valid URL'
    });

    // Password strength validator
    this.addValidator('password', {
      validate: (value) => {
        const strength = this.calculatePasswordStrength(value);
        return strength >= 3; // Require at least "good" strength
      },
      message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    });

    // Required validator
    this.addValidator('required', {
      validate: (value) => {
        return value && value.toString().trim().length > 0;
      },
      message: 'This field is required'
    });

    // Min length validator
    this.addValidator('minLength', {
      validate: (value, minLength) => {
        return value && value.length >= minLength;
      },
      message: (minLength) => `Must be at least ${minLength} characters long`
    });

    // Max length validator
    this.addValidator('maxLength', {
      validate: (value, maxLength) => {
        return !value || value.length <= maxLength;
      },
      message: (maxLength) => `Must be no more than ${maxLength} characters long`
    });

    // Pattern validator
    this.addValidator('pattern', {
      validate: (value, pattern) => {
        const regex = new RegExp(pattern);
        return !value || regex.test(value);
      },
      message: 'Invalid format'
    });
  }

  /**
   * Setup auto-complete providers
   */
  setupAutoCompleteProviders() {
    // Countries provider
    this.addAutoCompleteProvider('countries', async (query) => {
      const countries = [
        'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
        'Italy', 'Spain', 'Netherlands', 'Australia', 'Japan', 'South Korea',
        'Brazil', 'Mexico', 'India', 'China', 'Russia', 'South Africa'
      ];
      
      return countries
        .filter(country => country.toLowerCase().includes(query.toLowerCase()))
        .slice(0, this.options.maxSuggestions)
        .map(country => ({
          value: country,
          label: country,
          icon: '🌍'
        }));
    });

    // Email domains provider
    this.addAutoCompleteProvider('emailDomains', async (query) => {
      const domains = [
        'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
        'icloud.com', 'aol.com', 'protonmail.com', 'company.com'
      ];
      
      const atIndex = query.lastIndexOf('@');
      if (atIndex === -1) return [];
      
      const localPart = query.substring(0, atIndex + 1);
      const domainQuery = query.substring(atIndex + 1).toLowerCase();
      
      return domains
        .filter(domain => domain.startsWith(domainQuery))
        .slice(0, this.options.maxSuggestions)
        .map(domain => ({
          value: localPart + domain,
          label: localPart + domain,
          icon: '📧'
        }));
    });

    // Industry provider
    this.addAutoCompleteProvider('industries', async (query) => {
      const industries = [
        'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
        'Design', 'Construction', 'Manufacturing', 'Retail', 'Hospitality',
        'Consulting', 'Real Estate', 'Legal', 'Media', 'Transportation'
      ];
      
      return industries
        .filter(industry => industry.toLowerCase().includes(query.toLowerCase()))
        .slice(0, this.options.maxSuggestions)
        .map(industry => ({
          value: industry,
          label: industry,
          icon: '🏢'
        }));
    });
  }

  /**
   * Setup sound system
   */
  setupSoundSystem() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (error) {
      console.warn('Audio context not supported:', error);
      this.options.enableSounds = false;
    }
  }

  /**
   * Enhance existing forms
   */
  enhanceExistingForms() {
    document.querySelectorAll('form[data-enhance="true"], .advanced-form').forEach(form => {
      this.enhanceForm(form);
    });
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEventListeners() {
    // Handle dynamic form additions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const forms = node.matches && node.matches('form[data-enhance="true"], .advanced-form') 
              ? [node] 
              : Array.from(node.querySelectorAll ? node.querySelectorAll('form[data-enhance="true"], .advanced-form') : []);
            
            forms.forEach(form => {
              if (!this.forms.has(form)) {
                this.enhanceForm(form);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Enhance form with advanced features
   */
  enhanceForm(form) {
    if (this.forms.has(form)) return;

    const formId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    form.dataset.formId = formId;

    const formConfig = {
      id: formId,
      element: form,
      fields: new Map(),
      validators: new Map(),
      progress: 0,
      isValid: false,
      stepIndex: 0,
      totalSteps: 1
    };

    // Add form classes
    if (!form.classList.contains('advanced-form')) {
      form.classList.add('advanced-form');
    }

    // Setup form progress tracking
    if (this.options.enableProgressTracking) {
      this.setupFormProgress(formConfig);
    }

    // Setup multi-step functionality
    this.setupMultiStepForm(formConfig);

    // Enhance form fields
    this.enhanceFormFields(formConfig);

    // Setup form validation
    this.setupFormValidation(formConfig);

    // Setup smart defaults
    if (this.options.enableSmartDefaults) {
      this.setupSmartDefaults(formConfig);
    }

    // Setup field dependencies
    if (this.options.enableFieldDependencies) {
      this.setupFieldDependencies(formConfig);
    }

    // Setup form submission
    this.setupFormSubmission(formConfig);

    this.forms.set(form, formConfig);

    if (this.options.debug) {
      console.log(`📝 Enhanced form: ${formId}`);
    }
  }

  /**
   * Setup form progress tracking
   */
  setupFormProgress(formConfig) {
    const { element } = formConfig;
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'form-progress';
    progressContainer.innerHTML = '<div class="form-progress-bar" style="width: 0%"></div>';
    
    element.insertBefore(progressContainer, element.firstChild);
    formConfig.progressBar = progressContainer.querySelector('.form-progress-bar');
  }

  /**
   * Setup multi-step form
   */
  setupMultiStepForm(formConfig) {
    const { element } = formConfig;
    const steps = element.querySelectorAll('[data-step]');
    
    if (steps.length <= 1) return;

    formConfig.totalSteps = steps.length;
    formConfig.steps = Array.from(steps);

    // Create step navigation
    const stepsNav = document.createElement('div');
    stepsNav.className = 'form-steps';

    formConfig.steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = `form-step ${index === 0 ? 'active' : ''}`;
      stepElement.innerHTML = `
        <div class="form-step-number">${index + 1}</div>
        <span>${step.dataset.stepTitle || `Step ${index + 1}`}</span>
      `;
      
      stepsNav.appendChild(stepElement);
      
      if (index < formConfig.steps.length - 1) {
        const connector = document.createElement('div');
        connector.className = 'form-step-connector';
        stepsNav.appendChild(connector);
      }
    });

    element.insertBefore(stepsNav, element.firstChild);
    formConfig.stepsNav = stepsNav;

    // Hide all steps except first
    formConfig.steps.forEach((step, index) => {
      if (index > 0) {
        step.style.display = 'none';
      }
    });

    // Add navigation buttons
    this.addStepNavigation(formConfig);
  }

  /**
   * Add step navigation
   */
  addStepNavigation(formConfig) {
    const { element, steps } = formConfig;
    
    const actions = element.querySelector('.form-actions') || document.createElement('div');
    if (!actions.classList.contains('form-actions')) {
      actions.className = 'form-actions';
      element.appendChild(actions);
    }

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'form-button form-button-secondary';
    prevButton.textContent = 'Previous';
    prevButton.style.display = 'none';
    prevButton.addEventListener('click', () => this.previousStep(formConfig));

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'form-button form-button-primary';
    nextButton.textContent = 'Next';
    nextButton.addEventListener('click', () => this.nextStep(formConfig));

    const submitButton = element.querySelector('button[type="submit"]') || document.createElement('button');
    if (!submitButton.parentNode) {
      submitButton.type = 'submit';
      submitButton.className = 'form-button form-button-primary';
      submitButton.textContent = 'Submit';
    }
    submitButton.style.display = steps.length > 1 ? 'none' : 'flex';

    actions.innerHTML = '';
    actions.appendChild(prevButton);
    actions.appendChild(nextButton);
    actions.appendChild(submitButton);

    formConfig.prevButton = prevButton;
    formConfig.nextButton = nextButton;
    formConfig.submitButton = submitButton;
  }

  /**
   * Navigate to next step
   */
  nextStep(formConfig) {
    const { stepIndex, steps, stepsNav } = formConfig;
    
    // Validate current step
    if (!this.validateStep(formConfig, stepIndex)) {
      this.playSound('error');
      return;
    }

    if (stepIndex < steps.length - 1) {
      // Hide current step
      steps[stepIndex].style.display = 'none';
      stepsNav.children[stepIndex * 2].classList.remove('active');
      stepsNav.children[stepIndex * 2].classList.add('completed');
      
      if (stepIndex * 2 + 1 < stepsNav.children.length) {
        stepsNav.children[stepIndex * 2 + 1].classList.add('completed');
      }

      // Show next step
      formConfig.stepIndex++;
      steps[formConfig.stepIndex].style.display = 'block';
      stepsNav.children[formConfig.stepIndex * 2].classList.add('active');

      // Update navigation buttons
      formConfig.prevButton.style.display = 'flex';
      
      if (formConfig.stepIndex === steps.length - 1) {
        formConfig.nextButton.style.display = 'none';
        formConfig.submitButton.style.display = 'flex';
      }

      this.playSound('success');
      this.updateFormProgress(formConfig);
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep(formConfig) {
    const { stepIndex, steps, stepsNav } = formConfig;
    
    if (stepIndex > 0) {
      // Hide current step
      steps[stepIndex].style.display = 'none';
      stepsNav.children[stepIndex * 2].classList.remove('active');

      // Show previous step
      formConfig.stepIndex--;
      steps[formConfig.stepIndex].style.display = 'block';
      stepsNav.children[formConfig.stepIndex * 2].classList.add('active');
      stepsNav.children[formConfig.stepIndex * 2].classList.remove('completed');

      // Update navigation buttons
      if (formConfig.stepIndex === 0) {
        formConfig.prevButton.style.display = 'none';
      }

      formConfig.nextButton.style.display = 'flex';
      formConfig.submitButton.style.display = 'none';

      this.updateFormProgress(formConfig);
    }
  }

  /**
   * Validate step
   */
  validateStep(formConfig, stepIndex) {
    const { steps } = formConfig;
    const step = steps[stepIndex];
    const fields = step.querySelectorAll('input, textarea, select');
    
    let isValid = true;
    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Enhance form fields
   */
  enhanceFormFields(formConfig) {
    const { element } = formConfig;
    const fields = element.querySelectorAll('input, textarea, select');

    fields.forEach(field => {
      this.enhanceField(field, formConfig);
    });
  }

  /**
   * Enhance individual field
   */
  enhanceField(field, formConfig) {
    const fieldConfig = {
      element: field,
      validators: [],
      autoComplete: null,
      dependencies: []
    };

    // Setup field validation
    this.setupFieldValidation(field, fieldConfig, formConfig);

    // Setup auto-complete
    if (this.options.enableAutoComplete && field.dataset.autocomplete) {
      this.setupFieldAutoComplete(field, fieldConfig);
    }

    // Setup floating labels
    if (field.dataset.floatingLabel !== 'false') {
      this.setupFloatingLabel(field);
    }

    // Setup password strength indicator
    if (field.type === 'password' && field.dataset.showStrength !== 'false') {
      this.setupPasswordStrength(field);
    }

    // Setup file upload enhancements
    if (field.type === 'file') {
      this.setupFileUpload(field);
    }

    formConfig.fields.set(field, fieldConfig);
  }

  /**
   * Setup field validation
   */
  setupFieldValidation(field, fieldConfig, formConfig) {
    // Parse validation rules from data attributes
    const rules = [];

    if (field.required || field.dataset.required === 'true') {
      rules.push({ validator: 'required' });
    }

    if (field.type === 'email' || field.dataset.validate === 'email') {
      rules.push({ validator: 'email' });
    }

    if (field.dataset.validate === 'phone') {
      rules.push({ validator: 'phone' });
    }

    if (field.dataset.validate === 'url') {
      rules.push({ validator: 'url' });
    }

    if (field.type === 'password' || field.dataset.validate === 'password') {
      rules.push({ validator: 'password' });
    }

    if (field.dataset.minLength) {
      rules.push({ validator: 'minLength', param: parseInt(field.dataset.minLength) });
    }

    if (field.dataset.maxLength || field.maxLength > 0) {
      rules.push({ validator: 'maxLength', param: field.dataset.maxLength || field.maxLength });
    }

    if (field.dataset.pattern) {
      rules.push({ validator: 'pattern', param: field.dataset.pattern });
    }

    fieldConfig.validators = rules;

    // Setup real-time validation
    if (this.options.enableRealTimeValidation) {
      field.addEventListener('input', () => {
        clearTimeout(this.validationTimers.get(field));
        this.validationTimers.set(field, setTimeout(() => {
          this.validateField(field);
          this.updateFormProgress(formConfig);
        }, this.options.validationDelay));
      });
    }

    if (this.options.showValidationOnBlur) {
      field.addEventListener('blur', () => {
        this.validateField(field);
        this.updateFormProgress(formConfig);
      });
    }
  }

  /**
   * Setup field auto-complete
   */
  setupFieldAutoComplete(field, fieldConfig) {
    const provider = field.dataset.autocomplete;
    if (!this.autoCompleteProviders.has(provider)) return;

    // Create autocomplete container
    const container = document.createElement('div');
    container.className = 'autocomplete-container';
    field.parentNode.insertBefore(container, field);
    container.appendChild(field);

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    container.appendChild(dropdown);

    fieldConfig.autoComplete = {
      provider,
      container,
      dropdown,
      highlightedIndex: -1,
      suggestions: []
    };

    // Setup event listeners
    field.addEventListener('input', (e) => {
      this.handleAutoCompleteInput(field, fieldConfig, e.target.value);
    });

    field.addEventListener('keydown', (e) => {
      this.handleAutoCompleteKeydown(field, fieldConfig, e);
    });

    field.addEventListener('blur', () => {
      setTimeout(() => {
        this.hideAutoComplete(fieldConfig);
      }, 150);
    });
  }

  /**
   * Handle auto-complete input
   */
  async handleAutoCompleteInput(field, fieldConfig, query) {
    if (query.length < 2) {
      this.hideAutoComplete(fieldConfig);
      return;
    }

    try {
      const provider = this.autoCompleteProviders.get(fieldConfig.autoComplete.provider);
      const suggestions = await provider(query);
      
      fieldConfig.autoComplete.suggestions = suggestions;
      fieldConfig.autoComplete.highlightedIndex = -1;
      
      this.renderAutoCompleteSuggestions(fieldConfig, query);
    } catch (error) {
      console.error('Auto-complete error:', error);
    }
  }

  /**
   * Render auto-complete suggestions
   */
  renderAutoCompleteSuggestions(fieldConfig, query) {
    const { dropdown, suggestions } = fieldConfig.autoComplete;
    
    if (suggestions.length === 0) {
      this.hideAutoComplete(fieldConfig);
      return;
    }

    dropdown.innerHTML = suggestions.map((suggestion, index) => {
      const highlightedLabel = this.highlightMatch(suggestion.label, query);
      return `
        <div class="autocomplete-item" data-index="${index}">
          ${suggestion.icon ? `<span class="autocomplete-icon">${suggestion.icon}</span>` : ''}
          <span class="autocomplete-text">${highlightedLabel}</span>
        </div>
      `;
    }).join('');

    // Add click listeners
    dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectAutoCompleteSuggestion(fieldConfig, index);
      });
    });

    this.showAutoComplete(fieldConfig);
  }

  /**
   * Highlight matching text
   */
  highlightMatch(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="autocomplete-match">$1</span>');
  }

  /**
   * Show auto-complete dropdown
   */
  showAutoComplete(fieldConfig) {
    fieldConfig.autoComplete.dropdown.classList.add('show');
  }

  /**
   * Hide auto-complete dropdown
   */
  hideAutoComplete(fieldConfig) {
    fieldConfig.autoComplete.dropdown.classList.remove('show');
  }

  /**
   * Handle auto-complete keydown
   */
  handleAutoCompleteKeydown(field, fieldConfig, e) {
    const { suggestions, highlightedIndex } = fieldConfig.autoComplete;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        fieldConfig.autoComplete.highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
        this.updateAutoCompleteHighlight(fieldConfig);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        fieldConfig.autoComplete.highlightedIndex = Math.max(highlightedIndex - 1, -1);
        this.updateAutoCompleteHighlight(fieldConfig);
        break;
        
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          this.selectAutoCompleteSuggestion(fieldConfig, highlightedIndex);
        }
        break;
        
      case 'Escape':
        this.hideAutoComplete(fieldConfig);
        break;
    }
  }

  /**
   * Update auto-complete highlight
   */
  updateAutoCompleteHighlight(fieldConfig) {
    const { dropdown, highlightedIndex } = fieldConfig.autoComplete;
    
    dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
      item.classList.toggle('highlighted', index === highlightedIndex);
    });
  }

  /**
   * Select auto-complete suggestion
   */
  selectAutoCompleteSuggestion(fieldConfig, index) {
    const suggestion = fieldConfig.autoComplete.suggestions[index];
    fieldConfig.element.value = suggestion.value;
    fieldConfig.element.dispatchEvent(new Event('input', { bubbles: true }));
    this.hideAutoComplete(fieldConfig);
    this.playSound('click');
  }

  /**
   * Setup floating label
   */
  setupFloatingLabel(field) {
    const label = field.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;

    const group = field.parentNode;
    group.classList.add('form-group-floating');
    field.classList.add('form-input-floating');
    label.classList.add('form-label-floating');
    
    // Add placeholder for CSS selector
    if (!field.placeholder) {
      field.placeholder = ' ';
    }
  }

  /**
   * Setup password strength indicator
   */
  setupPasswordStrength(field) {
    const strengthContainer = document.createElement('div');
    strengthContainer.className = 'password-strength';
    strengthContainer.innerHTML = `
      <div class="password-strength-bar">
        <div class="password-strength-fill"></div>
      </div>
      <div class="password-requirements">
        <div class="password-requirement" data-requirement="length">
          <span class="password-requirement-icon">○</span>
          <span>At least 8 characters</span>
        </div>
        <div class="password-requirement" data-requirement="uppercase">
          <span class="password-requirement-icon">○</span>
          <span>Uppercase letter</span>
        </div>
        <div class="password-requirement" data-requirement="lowercase">
          <span class="password-requirement-icon">○</span>
          <span>Lowercase letter</span>
        </div>
        <div class="password-requirement" data-requirement="number">
          <span class="password-requirement-icon">○</span>
          <span>Number</span>
        </div>
        <div class="password-requirement" data-requirement="special">
          <span class="password-requirement-icon">○</span>
          <span>Special character</span>
        </div>
      </div>
    `;

    field.parentNode.appendChild(strengthContainer);

    field.addEventListener('input', () => {
      this.updatePasswordStrength(field, strengthContainer);
    });
  }

  /**
   * Update password strength
   */
  updatePasswordStrength(field, container) {
    const password = field.value;
    const strength = this.calculatePasswordStrength(password);
    const requirements = this.checkPasswordRequirements(password);

    // Update strength bar
    const strengthClasses = ['password-strength-weak', 'password-strength-fair', 'password-strength-good', 'password-strength-strong'];
    container.className = `password-strength ${strengthClasses[strength - 1] || ''}`;

    // Update requirements
    Object.entries(requirements).forEach(([requirement, met]) => {
      const element = container.querySelector(`[data-requirement="${requirement}"]`);
      if (element) {
        element.classList.toggle('met', met);
        const icon = element.querySelector('.password-requirement-icon');
        icon.textContent = met ? '✓' : '○';
      }
    });
  }

  /**
   * Calculate password strength
   */
  calculatePasswordStrength(password) {
    const requirements = this.checkPasswordRequirements(password);
    const metCount = Object.values(requirements).filter(Boolean).length;
    
    if (metCount <= 2) return 1; // Weak
    if (metCount === 3) return 2; // Fair
    if (metCount === 4) return 3; // Good
    return 4; // Strong
  }

  /**
   * Check password requirements
   */
  checkPasswordRequirements(password) {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }

  /**
   * Setup file upload enhancements
   */
  setupFileUpload(field) {
    // Create upload zone
    const zone = document.createElement('div');
    zone.className = 'file-upload-zone';
    zone.innerHTML = `
      <div class="file-upload-icon">📁</div>
      <div class="file-upload-text">Drop files here or click to browse</div>
      <div class="file-upload-hint">Supports JPG, PNG, PDF up to 10MB</div>
      <div class="file-upload-progress">
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    `;

    field.style.display = 'none';
    field.parentNode.insertBefore(zone, field);

    // Setup drag and drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      field.files = e.dataTransfer.files;
      this.handleFileSelection(field, zone);
    });

    zone.addEventListener('click', () => {
      field.click();
    });

    field.addEventListener('change', () => {
      this.handleFileSelection(field, zone);
    });
  }

  /**
   * Handle file selection
   */
  handleFileSelection(field, zone) {
    const files = Array.from(field.files);
    if (files.length === 0) return;

    const progress = zone.querySelector('.file-upload-progress');
    progress.classList.add('show');

    // Simulate upload progress
    const progressBar = progress.querySelector('.progress-bar-fill');
    let width = 0;
    const interval = setInterval(() => {
      width += Math.random() * 10;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
        setTimeout(() => {
          progress.classList.remove('show');
        }, 1000);
      }
      progressBar.style.width = `${width}%`;
    }, 100);

    // Update zone text
    const text = zone.querySelector('.file-upload-text');
    text.textContent = files.length === 1 ? files[0].name : `${files.length} files selected`;
  }

  /**
   * Setup smart defaults
   */
  setupSmartDefaults(formConfig) {
    const { element } = formConfig;
    
    // Auto-fill based on previous form data
    const formName = element.dataset.formName || element.name || 'default';
    const savedData = localStorage.getItem(`form-defaults-${formName}`);
    
    if (savedData) {
      try {
        const defaults = JSON.parse(savedData);
        Object.entries(defaults).forEach(([name, value]) => {
          const field = element.querySelector(`[name="${name}"]`);
          if (field && !field.value) {
            field.value = value;
          }
        });
      } catch (error) {
        console.warn('Failed to parse saved form defaults:', error);
      }
    }

    // Save form data on input
    element.addEventListener('input', () => {
      this.saveFormDefaults(formConfig);
    });
  }

  /**
   * Save form defaults
   */
  saveFormDefaults(formConfig) {
    const { element } = formConfig;
    const formName = element.dataset.formName || element.name || 'default';
    const formData = new FormData(element);
    const defaults = {};

    for (const [name, value] of formData.entries()) {
      if (value && typeof value === 'string') {
        defaults[name] = value;
      }
    }

    localStorage.setItem(`form-defaults-${formName}`, JSON.stringify(defaults));
  }

  /**
   * Setup field dependencies
   */
  setupFieldDependencies(formConfig) {
    const { element } = formConfig;
    const dependentFields = element.querySelectorAll('[data-depends-on]');

    dependentFields.forEach(field => {
      const dependsOn = field.dataset.dependsOn;
      const dependsValue = field.dataset.dependsValue;
      const controlField = element.querySelector(`[name="${dependsOn}"]`);

      if (controlField) {
        const updateVisibility = () => {
          const shouldShow = dependsValue ? 
            controlField.value === dependsValue : 
            controlField.value && controlField.value.trim() !== '';

          const container = field.closest('.form-group') || field.parentNode;
          if (shouldShow) {
            container.classList.add('show');
          } else {
            container.classList.remove('show');
            field.value = ''; // Clear dependent field when hidden
          }
        };

        // Add conditional class to container
        const container = field.closest('.form-group') || field.parentNode;
        container.classList.add('form-conditional');

        controlField.addEventListener('change', updateVisibility);
        controlField.addEventListener('input', updateVisibility);
        
        // Initial check
        updateVisibility();
      }
    });
  }

  /**
   * Setup form submission
   */
  setupFormSubmission(formConfig) {
    const { element } = formConfig;
    
    element.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmission(formConfig);
    });
  }

  /**
   * Handle form submission
   */
  async handleFormSubmission(formConfig) {
    const { element } = formConfig;

    // Validate entire form
    if (!this.validateForm(formConfig)) {
      this.playSound('error');
      return;
    }

    // Show loading state
    const submitButton = formConfig.submitButton || element.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.classList.add('form-button-loading');
      submitButton.disabled = true;
    }

    try {
      // Emit form submission event
      const submitEvent = new CustomEvent('form:submit', {
        detail: { formConfig, formData: new FormData(element) },
        bubbles: true,
        cancelable: true
      });

      if (element.dispatchEvent(submitEvent)) {
        // If not prevented, proceed with default submission
        this.playSound('success');
        
        // Simulate submission delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success message
        this.showFormSuccess(formConfig);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showFormError(formConfig, error.message);
      this.playSound('error');
    } finally {
      // Remove loading state
      if (submitButton) {
        submitButton.classList.remove('form-button-loading');
        submitButton.disabled = false;
      }
    }
  }

  /**
   * Validate entire form
   */
  validateForm(formConfig) {
    const { element, steps } = formConfig;
    let isValid = true;

    if (steps) {
      // Validate all steps
      steps.forEach((step, index) => {
        if (!this.validateStep(formConfig, index)) {
          isValid = false;
        }
      });
    } else {
      // Validate all fields
      const fields = element.querySelectorAll('input, textarea, select');
      fields.forEach(field => {
        if (!this.validateField(field)) {
          isValid = false;
        }
      });
    }

    return isValid;
  }

  /**
   * Validate individual field
   */
  validateField(field) {
    const form = field.closest('form');
    const formConfig = this.forms.get(form);
    if (!formConfig) return true;

    const fieldConfig = formConfig.fields.get(field);
    if (!fieldConfig) return true;

    const value = field.value;
    let isValid = true;
    let errorMessage = '';

    // Run validators
    for (const rule of fieldConfig.validators) {
      const validator = this.validators.get(rule.validator);
      if (validator) {
        const result = validator.validate(value, rule.param);
        if (!result) {
          isValid = false;
          errorMessage = typeof validator.message === 'function' 
            ? validator.message(rule.param) 
            : validator.message;
          break;
        }
      }
    }

    // Update field UI
    this.updateFieldValidation(field, isValid, errorMessage);
    
    return isValid;
  }

  /**
   * Update field validation UI
   */
  updateFieldValidation(field, isValid, message) {
    const group = field.closest('.form-group');
    if (!group) return;

    // Update field classes
    field.classList.toggle('valid', isValid && field.value);
    field.classList.toggle('invalid', !isValid);

    // Update validation message
    let validationEl = group.querySelector('.form-validation');
    if (!validationEl) {
      validationEl = document.createElement('div');
      validationEl.className = 'form-validation';
      group.appendChild(validationEl);
    }

    if (!isValid && message) {
      validationEl.className = 'form-validation form-validation-error show';
      validationEl.innerHTML = `
        <span class="form-validation-icon">⚠</span>
        <span>${message}</span>
      `;
      
      // Announce to screen readers
      if (this.options.announceValidation) {
        this.announceToScreenReader(`Validation error: ${message}`);
      }
    } else if (isValid && field.value) {
      validationEl.className = 'form-validation form-validation-success show';
      validationEl.innerHTML = `
        <span class="form-validation-icon">✓</span>
        <span>Valid</span>
      `;
    } else {
      validationEl.classList.remove('show');
    }
  }

  /**
   * Update form progress
   */
  updateFormProgress(formConfig) {
    if (!formConfig.progressBar) return;

    const { element, steps, totalSteps, stepIndex } = formConfig;
    let progress = 0;

    if (steps) {
      // Multi-step progress
      const currentStepProgress = this.calculateStepProgress(steps[stepIndex]);
      progress = ((stepIndex + currentStepProgress) / totalSteps) * 100;
    } else {
      // Single form progress
      progress = this.calculateFormProgress(element);
    }

    formConfig.progress = progress;
    formConfig.progressBar.style.width = `${progress}%`;
  }

  /**
   * Calculate step progress
   */
  calculateStepProgress(step) {
    const fields = step.querySelectorAll('input, textarea, select');
    if (fields.length === 0) return 1;

    let filledFields = 0;
    fields.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        filledFields++;
      }
    });

    return filledFields / fields.length;
  }

  /**
   * Calculate form progress
   */
  calculateFormProgress(form) {
    const fields = form.querySelectorAll('input, textarea, select');
    if (fields.length === 0) return 100;

    let filledFields = 0;
    let validFields = 0;

    fields.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        filledFields++;
        if (this.validateField(field)) {
          validFields++;
        }
      }
    });

    // Weight valid fields more heavily
    return (filledFields * 0.5 + validFields * 0.5) / fields.length * 100;
  }

  /**
   * Show form success
   */
  showFormSuccess(formConfig) {
    const { element } = formConfig;
    
    // Create success message
    const success = document.createElement('div');
    success.className = 'form-success';
    success.innerHTML = `
      <div style="text-align: center; padding: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Success!</div>
        <div style="font-size: 14px;">Your form has been submitted successfully.</div>
      </div>
    `;

    element.innerHTML = '';
    element.appendChild(success);
  }

  /**
   * Show form error
   */
  showFormError(formConfig, message) {
    const { element } = formConfig;
    
    // Show error at top of form
    let errorEl = element.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      element.insertBefore(errorEl, element.firstChild);
    }

    errorEl.innerHTML = `
      <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>❌</span>
          <strong>Error:</strong> ${message}
        </div>
      </div>
    `;
  }

  /**
   * Play sound effect
   */
  playSound(type) {
    if (!this.options.enableSounds || !this.audioContext) return;

    const frequencies = {
      success: [523.25, 659.25, 783.99],
      error: [349.23, 293.66],
      click: [800],
      warning: [440, 523.25]
    };

    const freqs = frequencies[type] || frequencies.click;
    
    freqs.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.options.soundVolume * 0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      
      const startTime = this.audioContext.currentTime + (index * 0.1);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }

  /**
   * Announce to screen reader
   */
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Public API methods
   */

  /**
   * Add custom validator
   */
  addValidator(name, validator) {
    this.validators.set(name, validator);
  }

  /**
   * Add auto-complete provider
   */
  addAutoCompleteProvider(name, provider) {
    this.autoCompleteProviders.set(name, provider);
  }

  /**
   * Validate form programmatically
   */
  validateFormById(formId) {
    const formConfig = Array.from(this.forms.values()).find(config => config.id === formId);
    return formConfig ? this.validateForm(formConfig) : false;
  }

  /**
   * Reset form
   */
  resetForm(form) {
    const formConfig = this.forms.get(form);
    if (!formConfig) return;

    form.reset();
    
    // Clear validation states
    formConfig.fields.forEach((fieldConfig, field) => {
      field.classList.remove('valid', 'invalid');
      const group = field.closest('.form-group');
      if (group) {
        const validation = group.querySelector('.form-validation');
        if (validation) {
          validation.classList.remove('show');
        }
      }
    });

    // Reset progress
    formConfig.progress = 0;
    if (formConfig.progressBar) {
      formConfig.progressBar.style.width = '0%';
    }

    // Reset to first step
    if (formConfig.steps) {
      formConfig.stepIndex = 0;
      formConfig.steps.forEach((step, index) => {
        step.style.display = index === 0 ? 'block' : 'none';
      });
      
      // Reset step navigation
      if (formConfig.stepsNav) {
        formConfig.stepsNav.querySelectorAll('.form-step').forEach((step, index) => {
          step.classList.toggle('active', index === 0);
          step.classList.remove('completed');
        });
      }
    }
  }

  /**
   * Get form statistics
   */
  getStats() {
    return {
      totalForms: this.forms.size,
      totalValidators: this.validators.size,
      totalAutoCompleteProviders: this.autoCompleteProviders.size,
      averageProgress: this.calculateAverageProgress()
    };
  }

  /**
   * Calculate average progress across all forms
   */
  calculateAverageProgress() {
    const progresses = Array.from(this.forms.values()).map(config => config.progress);
    return progresses.length > 0 
      ? progresses.reduce((sum, progress) => sum + progress, 0) / progresses.length 
      : 0;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear timers
    this.validationTimers.forEach(timer => clearTimeout(timer));
    this.validationTimers.clear();

    // Clear forms
    this.forms.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }

    // Remove styles
    const styles = document.getElementById('advanced-form-styles');
    if (styles) {
      styles.remove();
    }

    console.log('📝 AdvancedFormSystem destroyed');
  }
}

// Create global advanced form system instance
export const advancedFormSystem = new AdvancedFormSystem({
  debug: process.env.NODE_ENV !== 'production'
});