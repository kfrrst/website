/**
 * Onboarding & Contextual Help System
 * Provides guided tours, contextual help, and user onboarding experiences
 */
export class OnboardingSystem {
  constructor(options = {}) {
    this.options = {
      // Tour settings
      enableTours: options.enableTours !== false,
      tourStepDelay: options.tourStepDelay || 800,
      autoStartTours: options.autoStartTours || false,
      
      // Help system settings
      enableContextualHelp: options.enableContextualHelp !== false,
      helpTrigger: options.helpTrigger || 'hover',
      helpDelay: options.helpDelay || 500,
      
      // Onboarding settings
      enableOnboarding: options.enableOnboarding !== false,
      checkOnboardingStatus: options.checkOnboardingStatus !== false,
      onboardingCookieName: options.onboardingCookieName || 'onboarding_completed',
      
      // UI settings
      theme: options.theme || 'light',
      animation: options.animation !== false,
      showProgress: options.showProgress !== false,
      
      // Accessibility
      enableA11y: options.enableA11y !== false,
      announceSteps: options.announceSteps !== false,
      
      // Debug
      debug: options.debug || false,
      
      ...options
    };

    this.tours = new Map();
    this.helpItems = new Map();
    this.currentTour = null;
    this.currentStep = 0;
    this.tourOverlay = null;
    this.helpTooltip = null;
    this.onboardingState = new Map();

    this.init();
  }

  /**
   * Initialize onboarding system
   */
  init() {
    if (this.options.debug) {
      console.log('🎯 OnboardingSystem initializing...');
    }

    // Setup onboarding styles
    this.setupOnboardingStyles();

    // Load onboarding state
    this.loadOnboardingState();

    // Setup contextual help
    if (this.options.enableContextualHelp) {
      this.setupContextualHelp();
    }

    // Setup global handlers
    this.setupGlobalHandlers();

    // Auto-start onboarding if needed
    if (this.options.autoStartTours && this.options.checkOnboardingStatus) {
      this.checkAndStartOnboarding();
    }

    // Register built-in tours
    this.registerBuiltInTours();

    if (this.options.debug) {
      console.log('✅ OnboardingSystem initialized');
    }
  }

  /**
   * Setup onboarding styles
   */
  setupOnboardingStyles() {
    if (document.getElementById('onboarding-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'onboarding-system-styles';
    style.textContent = `
      /* Onboarding & Help System Styles */
      
      /* Tour overlay */
      .tour-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
      }
      
      .tour-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      /* Tour spotlight */
      .tour-spotlight {
        position: absolute;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      
      /* Tour step popup */
      .tour-step {
        position: absolute;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 360px;
        min-width: 280px;
        z-index: 10001;
        opacity: 0;
        visibility: hidden;
        transform: scale(0.9) translateY(8px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .tour-step.active {
        opacity: 1;
        visibility: visible;
        transform: scale(1) translateY(0);
      }
      
      .tour-step::before {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        background: #ffffff;
        transform: rotate(45deg);
        z-index: -1;
      }
      
      .tour-step.placement-top::before {
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
      }
      
      .tour-step.placement-bottom::before {
        top: -6px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
      }
      
      .tour-step.placement-left::before {
        right: -6px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
      }
      
      .tour-step.placement-right::before {
        left: -6px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
      }
      
      .tour-step-header {
        padding: 20px 20px 0;
        position: relative;
      }
      
      .tour-step-badge {
        background: linear-gradient(135deg, #0057FF, #F7C600);
        color: white;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 12px;
        display: inline-block;
        margin-bottom: 12px;
      }
      
      .tour-step-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
        line-height: 1.3;
      }
      
      .tour-step-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }
      
      .tour-step-close:hover {
        background: #f3f4f6;
        color: #6b7280;
      }
      
      .tour-step-body {
        padding: 0 20px 20px;
      }
      
      .tour-step-content {
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
        margin-bottom: 20px;
      }
      
      .tour-step-media {
        margin: 16px 0;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .tour-step-media img,
      .tour-step-media video {
        width: 100%;
        height: auto;
        display: block;
      }
      
      .tour-step-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      
      .tour-step-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }
      
      .tour-step-progress-bar {
        flex: 1;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .tour-step-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #0057FF, #F7C600);
        border-radius: inherit;
        transition: width 0.3s ease;
      }
      
      .tour-step-progress-text {
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
      }
      
      .tour-step-buttons {
        display: flex;
        gap: 8px;
      }
      
      .tour-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .tour-btn-primary {
        background: #0057FF;
        color: white;
      }
      
      .tour-btn-primary:hover {
        background: #0041CC;
      }
      
      .tour-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      
      .tour-btn-secondary:hover {
        background: #e5e7eb;
      }
      
      .tour-btn-ghost {
        background: none;
        color: #6b7280;
      }
      
      .tour-btn-ghost:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      /* Contextual help tooltip */
      .help-tooltip {
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.4;
        max-width: 240px;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transform: translateY(4px);
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .help-tooltip.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .help-tooltip::before {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        background: #1f2937;
        transform: rotate(45deg);
      }
      
      .help-tooltip.placement-top::before {
        bottom: -3px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
      }
      
      .help-tooltip.placement-bottom::before {
        top: -3px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
      }
      
      .help-tooltip.placement-left::before {
        right: -3px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
      }
      
      .help-tooltip.placement-right::before {
        left: -3px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
      }
      
      /* Help trigger elements */
      .help-trigger {
        position: relative;
        cursor: help;
      }
      
      .help-trigger::after {
        content: '?';
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s ease;
      }
      
      .help-trigger:hover::after {
        opacity: 1;
      }
      
      /* Onboarding checklist */
      .onboarding-checklist {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        width: 320px;
        max-height: 400px;
        z-index: 9998;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }
      
      .onboarding-checklist.show {
        transform: translateX(0);
      }
      
      .onboarding-checklist-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .onboarding-checklist-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
      
      .onboarding-checklist-close {
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .onboarding-checklist-close:hover {
        background: #f3f4f6;
        color: #6b7280;
      }
      
      .onboarding-checklist-body {
        padding: 16px 20px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .onboarding-checklist-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .onboarding-checklist-item:last-child {
        border-bottom: none;
      }
      
      .onboarding-checklist-item:hover {
        background: #f9fafb;
        margin: 0 -20px;
        padding-left: 20px;
        padding-right: 20px;
      }
      
      .onboarding-checklist-checkbox {
        width: 20px;
        height: 20px;
        border: 2px solid #d1d5db;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
        transition: all 0.2s ease;
      }
      
      .onboarding-checklist-item.completed .onboarding-checklist-checkbox {
        background: #27AE60;
        border-color: #27AE60;
        color: white;
      }
      
      .onboarding-checklist-content {
        flex: 1;
      }
      
      .onboarding-checklist-label {
        font-size: 14px;
        font-weight: 500;
        color: #111827;
        margin-bottom: 2px;
        line-height: 1.4;
      }
      
      .onboarding-checklist-item.completed .onboarding-checklist-label {
        text-decoration: line-through;
        color: #6b7280;
      }
      
      .onboarding-checklist-description {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.3;
      }
      
      .onboarding-progress-summary {
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        border-radius: 0 0 12px 12px;
      }
      
      .onboarding-progress-text {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        text-align: center;
      }
      
      .onboarding-progress-bar {
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .onboarding-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #0057FF, #F7C600);
        border-radius: inherit;
        transition: width 0.3s ease;
      }
      
      /* Tour launcher */
      .tour-launcher {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #0057FF, #F7C600);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 87, 255, 0.3);
        transition: all 0.3s ease;
        z-index: 9997;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: tourLauncherPulse 3s infinite;
      }
      
      .tour-launcher:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(0, 87, 255, 0.4);
      }
      
      @keyframes tourLauncherPulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(0, 87, 255, 0.3); }
        50% { box-shadow: 0 4px 20px rgba(0, 87, 255, 0.3), 0 0 0 10px rgba(0, 87, 255, 0.1); }
      }
      
      /* Mobile optimizations */
      @media (max-width: 640px) {
        .tour-step {
          max-width: calc(100vw - 40px);
          min-width: calc(100vw - 40px);
        }
        
        .onboarding-checklist {
          width: calc(100vw - 40px);
          right: 20px;
        }
        
        .tour-launcher {
          bottom: 20px;
          right: 20px;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .tour-step {
          background: #1f2937;
        }
        
        .tour-step-title {
          color: #f9fafb;
        }
        
        .tour-step-content {
          color: #d1d5db;
        }
        
        .tour-btn-secondary {
          background: #374151;
          color: #d1d5db;
        }
        
        .tour-btn-secondary:hover {
          background: #4b5563;
        }
        
        .onboarding-checklist {
          background: #1f2937;
        }
        
        .onboarding-checklist-title,
        .onboarding-checklist-label {
          color: #f9fafb;
        }
        
        .onboarding-checklist-item:hover {
          background: #374151;
        }
        
        .onboarding-progress-summary {
          background: #374151;
          border-color: #4b5563;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .tour-overlay,
        .tour-step,
        .tour-spotlight,
        .help-tooltip,
        .onboarding-checklist,
        .tour-launcher {
          transition: none;
        }
        
        .tour-launcher {
          animation: none;
        }
      }
      
      /* High contrast mode */
      @media (prefers-contrast: high) {
        .tour-step {
          border: 2px solid #000000;
        }
        
        .tour-btn-primary {
          background: #000000;
          border: 2px solid #000000;
        }
        
        .tour-btn-secondary {
          background: #ffffff;
          color: #000000;
          border: 2px solid #000000;
        }
        
        .help-tooltip {
          background: #000000;
          border: 1px solid #ffffff;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Load onboarding state
   */
  loadOnboardingState() {
    try {
      const stored = localStorage.getItem('onboarding_state');
      if (stored) {
        const state = JSON.parse(stored);
        Object.entries(state).forEach(([key, value]) => {
          this.onboardingState.set(key, value);
        });
      }
    } catch (error) {
      if (this.options.debug) {
        console.warn('Failed to load onboarding state:', error);
      }
    }
  }

  /**
   * Save onboarding state
   */
  saveOnboardingState() {
    try {
      const state = Object.fromEntries(this.onboardingState);
      localStorage.setItem('onboarding_state', JSON.stringify(state));
    } catch (error) {
      if (this.options.debug) {
        console.warn('Failed to save onboarding state:', error);
      }
    }
  }

  /**
   * Setup contextual help
   */
  setupContextualHelp() {
    // Auto-enhance elements with help attributes
    document.querySelectorAll('[data-help]').forEach(element => {
      this.addContextualHelp(element, element.dataset.help);
    });

    // Monitor for new help elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const helpElements = node.matches ? (node.matches('[data-help]') ? [node] : []) : [];
            helpElements.push(...(node.querySelectorAll ? Array.from(node.querySelectorAll('[data-help]')) : []));
            helpElements.forEach(element => {
              this.addContextualHelp(element, element.dataset.help);
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Setup global handlers
   */
  setupGlobalHandlers() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to close tour
      if (e.key === 'Escape' && this.currentTour) {
        this.endTour();
      }
      
      // F1 to show help
      if (e.key === 'F1') {
        e.preventDefault();
        this.showContextualHelp();
      }
      
      // ? key to show help
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        this.showContextualHelp();
      }
    });

    // Handle custom events
    document.addEventListener('onboarding:start', (e) => {
      this.startTour(e.detail.tourId);
    });

    document.addEventListener('onboarding:complete', (e) => {
      this.markOnboardingComplete(e.detail.stepId);
    });
  }

  /**
   * Register built-in tours
   */
  registerBuiltInTours() {
    // Welcome tour for new users
    this.registerTour('welcome', {
      title: 'Welcome to [RE]Print Studios',
      description: 'Let\'s get you started with your first project',
      steps: [
        {
          target: 'nav, .mobile-nav',
          title: 'Navigation',
          content: 'Use the navigation menu to access different areas of your project dashboard.',
          placement: 'bottom'
        },
        {
          target: '.btn-primary, .btn-mobile-primary',
          title: 'Primary Actions',
          content: 'Blue buttons are your primary actions - they help you create and submit important items.',
          placement: 'bottom'
        },
        {
          target: '.progress-tracker, [data-phase]',
          title: 'Project Progress',
          content: 'Track your project through our 8-phase workflow. Each phase has specific deliverables and actions.',
          placement: 'left'
        }
      ]
    });

    // Project management tour
    this.registerTour('project-management', {
      title: 'Managing Your Project',
      description: 'Learn how to effectively manage your design project',
      steps: [
        {
          target: '.phase-card, .mobile-card',
          title: 'Phase Overview',
          content: 'Each phase card shows your current status, required actions, and progress indicators.',
          placement: 'top'
        },
        {
          target: '.file-upload, .upload-area',
          title: 'File Uploads',
          content: 'Upload your files, references, and feedback directly to your project. We support drag & drop!',
          placement: 'top'
        },
        {
          target: '.messaging, .chat',
          title: 'Communication',
          content: 'Use the messaging system to communicate directly with your design team in real-time.',
          placement: 'left'
        }
      ]
    });
  }

  /**
   * Check and start onboarding
   */
  checkAndStartOnboarding() {
    const completed = this.getCookie(this.options.onboardingCookieName);
    
    if (!completed) {
      // Show tour launcher
      this.showTourLauncher();
      
      // Auto-start welcome tour after delay
      setTimeout(() => {
        if (!this.currentTour) {
          this.startTour('welcome');
        }
      }, 2000);
    }
  }

  /**
   * Register a tour
   */
  registerTour(id, tourConfig) {
    this.tours.set(id, {
      id,
      ...tourConfig,
      steps: tourConfig.steps || []
    });

    if (this.options.debug) {
      console.log(`🎯 Registered tour: ${id}`);
    }
  }

  /**
   * Start a tour
   */
  startTour(tourId) {
    const tour = this.tours.get(tourId);
    if (!tour) {
      console.warn(`Tour not found: ${tourId}`);
      return;
    }

    if (this.currentTour) {
      this.endTour();
    }

    this.currentTour = tour;
    this.currentStep = 0;

    // Create tour overlay
    this.createTourOverlay();

    // Start first step
    this.showStep(0);

    // Announce to screen readers
    if (this.options.announceSteps && this.options.enableA11y) {
      this.announceToScreenReader(`Starting tour: ${tour.title}`);
    }

    // Track tour start
    this.trackEvent('tour_started', { tourId });

    if (this.options.debug) {
      console.log(`🎯 Started tour: ${tourId}`);
    }
  }

  /**
   * Create tour overlay
   */
  createTourOverlay() {
    this.tourOverlay = document.createElement('div');
    this.tourOverlay.className = 'tour-overlay';
    
    // Create spotlight
    const spotlight = document.createElement('div');
    spotlight.className = 'tour-spotlight';
    this.tourOverlay.appendChild(spotlight);

    document.body.appendChild(this.tourOverlay);
    
    // Activate overlay
    requestAnimationFrame(() => {
      this.tourOverlay.classList.add('active');
    });
  }

  /**
   * Show tour step
   */
  showStep(stepIndex) {
    const tour = this.currentTour;
    const step = tour.steps[stepIndex];
    
    if (!step) {
      this.endTour();
      return;
    }

    this.currentStep = stepIndex;

    // Find target element
    const target = document.querySelector(step.target);
    if (!target) {
      console.warn(`Tour step target not found: ${step.target}`);
      this.nextStep();
      return;
    }

    // Position spotlight
    this.positionSpotlight(target);

    // Create step popup
    this.createStepPopup(step, target, stepIndex, tour.steps.length);

    // Announce step to screen readers
    if (this.options.announceSteps && this.options.enableA11y) {
      this.announceToScreenReader(`Step ${stepIndex + 1} of ${tour.steps.length}: ${step.title}`);
    }

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Position spotlight on target
   */
  positionSpotlight(target) {
    const spotlight = this.tourOverlay.querySelector('.tour-spotlight');
    const rect = target.getBoundingClientRect();
    
    const padding = 8;
    spotlight.style.left = `${rect.left - padding}px`;
    spotlight.style.top = `${rect.top - padding}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;
  }

  /**
   * Create step popup
   */
  createStepPopup(step, target, stepIndex, totalSteps) {
    // Remove existing popup
    const existingPopup = this.tourOverlay.querySelector('.tour-step');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.className = 'tour-step';
    
    const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
    
    popup.innerHTML = `
      <div class="tour-step-header">
        <div class="tour-step-badge">Step ${stepIndex + 1} of ${totalSteps}</div>
        <h3 class="tour-step-title">${step.title}</h3>
        <button class="tour-step-close" aria-label="Close tour">×</button>
      </div>
      <div class="tour-step-body">
        <div class="tour-step-content">
          ${step.content}
          ${step.media ? `<div class="tour-step-media">${step.media}</div>` : ''}
        </div>
        <div class="tour-step-actions">
          ${this.options.showProgress ? `
            <div class="tour-step-progress">
              <div class="tour-step-progress-bar">
                <div class="tour-step-progress-fill" style="width: ${progress}%"></div>
              </div>
              <div class="tour-step-progress-text">${progress}%</div>
            </div>
          ` : ''}
          <div class="tour-step-buttons">
            ${stepIndex > 0 ? '<button class="tour-btn tour-btn-ghost" data-action="prev">← Back</button>' : ''}
            ${stepIndex < totalSteps - 1 ? 
              '<button class="tour-btn tour-btn-primary" data-action="next">Next →</button>' :
              '<button class="tour-btn tour-btn-primary" data-action="finish">Finish 🎉</button>'
            }
          </div>
        </div>
      </div>
    `;

    // Position popup
    this.positionPopup(popup, target, step.placement || 'bottom');

    // Add event listeners
    popup.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'prev':
          this.prevStep();
          break;
        case 'next':
          this.nextStep();
          break;
        case 'finish':
          this.finishTour();
          break;
      }
    });

    // Close button
    popup.querySelector('.tour-step-close').addEventListener('click', () => {
      this.endTour();
    });

    this.tourOverlay.appendChild(popup);
    
    // Activate popup
    requestAnimationFrame(() => {
      popup.classList.add('active');
    });
  }

  /**
   * Position popup relative to target
   */
  positionPopup(popup, target, placement) {
    const rect = target.getBoundingClientRect();
    const popupRect = { width: 320, height: 200 }; // Estimated size
    
    popup.classList.add(`placement-${placement}`);
    
    let left, top;
    
    switch (placement) {
      case 'top':
        left = rect.left + rect.width / 2 - popupRect.width / 2;
        top = rect.top - popupRect.height - 16;
        break;
      case 'bottom':
        left = rect.left + rect.width / 2 - popupRect.width / 2;
        top = rect.bottom + 16;
        break;
      case 'left':
        left = rect.left - popupRect.width - 16;
        top = rect.top + rect.height / 2 - popupRect.height / 2;
        break;
      case 'right':
        left = rect.right + 16;
        top = rect.top + rect.height / 2 - popupRect.height / 2;
        break;
    }

    // Ensure popup stays within viewport
    left = Math.max(20, Math.min(left, window.innerWidth - popupRect.width - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - popupRect.height - 20));
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * Next step
   */
  nextStep() {
    if (this.currentStep < this.currentTour.steps.length - 1) {
      setTimeout(() => {
        this.showStep(this.currentStep + 1);
      }, this.options.tourStepDelay);
    } else {
      this.finishTour();
    }
  }

  /**
   * Previous step
   */
  prevStep() {
    if (this.currentStep > 0) {
      setTimeout(() => {
        this.showStep(this.currentStep - 1);
      }, this.options.tourStepDelay);
    }
  }

  /**
   * Finish tour
   */
  finishTour() {
    if (this.currentTour) {
      // Mark tour as completed
      this.markOnboardingComplete(`tour_${this.currentTour.id}`);
      
      // Track completion
      this.trackEvent('tour_completed', { tourId: this.currentTour.id });
      
      // Set completion cookie for main onboarding
      if (this.currentTour.id === 'welcome') {
        this.setCookie(this.options.onboardingCookieName, 'true', 30);
      }
    }

    this.endTour();
    
    // Show completion message
    if (window.feedbackSystem) {
      window.feedbackSystem.success('Tour completed! You\'re all set to get started.', {
        duration: 5000
      });
    }
  }

  /**
   * End tour
   */
  endTour() {
    if (this.tourOverlay) {
      this.tourOverlay.classList.remove('active');
      setTimeout(() => {
        if (this.tourOverlay.parentNode) {
          this.tourOverlay.parentNode.removeChild(this.tourOverlay);
        }
        this.tourOverlay = null;
      }, 300);
    }

    if (this.currentTour) {
      this.trackEvent('tour_ended', { 
        tourId: this.currentTour.id,
        stepCompleted: this.currentStep + 1,
        totalSteps: this.currentTour.steps.length
      });
    }

    this.currentTour = null;
    this.currentStep = 0;
  }

  /**
   * Add contextual help
   */
  addContextualHelp(element, helpText, options = {}) {
    if (element.dataset.helpAdded) return;
    
    element.dataset.helpAdded = 'true';
    element.classList.add('help-trigger');

    const helpId = `help-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.helpItems.set(helpId, {
      element,
      text: helpText,
      options: { placement: 'top', ...options }
    });

    const showHelp = () => {
      this.showHelpTooltip(helpId);
    };

    const hideHelp = () => {
      this.hideHelpTooltip();
    };

    if (this.options.helpTrigger === 'hover') {
      element.addEventListener('mouseenter', showHelp);
      element.addEventListener('mouseleave', hideHelp);
    } else if (this.options.helpTrigger === 'click') {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showHelp();
      });
    }

    // Keyboard accessibility
    element.addEventListener('focus', showHelp);
    element.addEventListener('blur', hideHelp);
  }

  /**
   * Show help tooltip
   */
  showHelpTooltip(helpId) {
    const helpItem = this.helpItems.get(helpId);
    if (!helpItem) return;

    this.hideHelpTooltip();

    this.helpTooltip = document.createElement('div');
    this.helpTooltip.className = `help-tooltip placement-${helpItem.options.placement}`;
    this.helpTooltip.textContent = helpItem.text;

    document.body.appendChild(this.helpTooltip);

    // Position tooltip
    this.positionTooltip(this.helpTooltip, helpItem.element, helpItem.options.placement);

    // Show tooltip
    requestAnimationFrame(() => {
      this.helpTooltip.classList.add('show');
    });

    // Auto-hide after delay
    setTimeout(() => {
      this.hideHelpTooltip();
    }, 5000);
  }

  /**
   * Hide help tooltip
   */
  hideHelpTooltip() {
    if (this.helpTooltip) {
      this.helpTooltip.classList.remove('show');
      setTimeout(() => {
        if (this.helpTooltip && this.helpTooltip.parentNode) {
          this.helpTooltip.parentNode.removeChild(this.helpTooltip);
        }
        this.helpTooltip = null;
      }, 200);
    }
  }

  /**
   * Position tooltip
   */
  positionTooltip(tooltip, target, placement) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left, top;
    
    switch (placement) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.bottom + 8;
        break;
      case 'left':
        left = rect.left - tooltipRect.width - 8;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        left = rect.right + 8;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Show tour launcher
   */
  showTourLauncher() {
    if (document.querySelector('.tour-launcher')) return;

    const launcher = document.createElement('button');
    launcher.className = 'tour-launcher';
    launcher.innerHTML = '🎯';
    launcher.title = 'Take a guided tour';
    launcher.setAttribute('aria-label', 'Start guided tour');

    launcher.addEventListener('click', () => {
      this.startTour('welcome');
      launcher.remove();
    });

    document.body.appendChild(launcher);
  }

  /**
   * Show onboarding checklist
   */
  showOnboardingChecklist(items) {
    const checklist = document.createElement('div');
    checklist.className = 'onboarding-checklist';
    
    const completed = items.filter(item => this.isOnboardingComplete(item.id)).length;
    const progress = Math.round((completed / items.length) * 100);
    
    checklist.innerHTML = `
      <div class="onboarding-checklist-header">
        <div class="onboarding-checklist-title">Getting Started</div>
        <button class="onboarding-checklist-close">×</button>
      </div>
      <div class="onboarding-checklist-body">
        ${items.map(item => `
          <div class="onboarding-checklist-item ${this.isOnboardingComplete(item.id) ? 'completed' : ''}" data-item-id="${item.id}">
            <div class="onboarding-checklist-checkbox">
              ${this.isOnboardingComplete(item.id) ? '✓' : ''}
            </div>
            <div class="onboarding-checklist-content">
              <div class="onboarding-checklist-label">${item.title}</div>
              <div class="onboarding-checklist-description">${item.description}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="onboarding-progress-summary">
        <div class="onboarding-progress-text">${completed} of ${items.length} completed (${progress}%)</div>
        <div class="onboarding-progress-bar">
          <div class="onboarding-progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;

    // Add event listeners
    checklist.querySelector('.onboarding-checklist-close').addEventListener('click', () => {
      checklist.classList.remove('show');
      setTimeout(() => {
        if (checklist.parentNode) {
          checklist.parentNode.removeChild(checklist);
        }
      }, 300);
    });

    // Handle item clicks
    checklist.addEventListener('click', (e) => {
      const item = e.target.closest('.onboarding-checklist-item');
      if (item && !item.classList.contains('completed')) {
        const itemId = item.dataset.itemId;
        const itemConfig = items.find(i => i.id === itemId);
        
        if (itemConfig && itemConfig.action) {
          itemConfig.action();
        }
      }
    });

    document.body.appendChild(checklist);
    
    // Show checklist
    requestAnimationFrame(() => {
      checklist.classList.add('show');
    });
  }

  /**
   * Mark onboarding step as complete
   */
  markOnboardingComplete(stepId) {
    this.onboardingState.set(stepId, {
      completed: true,
      timestamp: Date.now()
    });
    
    this.saveOnboardingState();
    
    // Emit event
    document.dispatchEvent(new CustomEvent('onboarding:stepCompleted', {
      detail: { stepId }
    }));
  }

  /**
   * Check if onboarding step is complete
   */
  isOnboardingComplete(stepId) {
    const state = this.onboardingState.get(stepId);
    return state && state.completed;
  }

  /**
   * Show contextual help for current page
   */
  showContextualHelp() {
    const helpElements = document.querySelectorAll('[data-help]');
    
    if (helpElements.length === 0) {
      if (window.feedbackSystem) {
        window.feedbackSystem.info('No help available for this page.');
      }
      return;
    }

    // Show help for all elements briefly
    helpElements.forEach((element, index) => {
      setTimeout(() => {
        element.dispatchEvent(new Event('mouseenter'));
        setTimeout(() => {
          element.dispatchEvent(new Event('mouseleave'));
        }, 2000);
      }, index * 500);
    });
  }

  /**
   * Utility methods
   */
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
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

  trackEvent(eventName, data) {
    if (this.options.debug) {
      console.log(`🎯 Onboarding event: ${eventName}`, data);
    }
    
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', eventName, data);
    }
  }

  /**
   * Public API methods
   */
  startWelcomeTour() {
    this.startTour('welcome');
  }

  addHelpItem(selector, helpText, options = {}) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      this.addContextualHelp(element, helpText, options);
    });
  }

  resetOnboarding() {
    this.onboardingState.clear();
    this.saveOnboardingState();
    this.setCookie(this.options.onboardingCookieName, '', -1);
    
    if (this.options.debug) {
      console.log('🎯 Onboarding reset');
    }
  }

  getOnboardingProgress() {
    const completed = Array.from(this.onboardingState.values()).filter(state => state.completed).length;
    const total = this.onboardingState.size;
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // End current tour
    this.endTour();
    
    // Hide help tooltip
    this.hideHelpTooltip();
    
    // Remove tour launcher
    const launcher = document.querySelector('.tour-launcher');
    if (launcher) {
      launcher.remove();
    }
    
    // Clear references
    this.tours.clear();
    this.helpItems.clear();
    
    // Remove styles
    const styles = document.getElementById('onboarding-system-styles');
    if (styles) {
      styles.remove();
    }

    console.log('🎯 OnboardingSystem destroyed');
  }
}

// Create global onboarding system instance
export const onboardingSystem = new OnboardingSystem({
  debug: process.env.NODE_ENV !== 'production'
});