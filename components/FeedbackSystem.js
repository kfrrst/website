/**
 * Feedback System
 * Provides delightful UI transitions, notifications, and user feedback
 */
export class FeedbackSystem {
  constructor(options = {}) {
    this.options = {
      // Notification settings
      notificationDuration: options.notificationDuration || 5000,
      maxNotifications: options.maxNotifications || 5,
      notificationPosition: options.notificationPosition || 'top-right',
      
      // Animation settings
      enableAnimations: options.enableAnimations !== false,
      animationDuration: options.animationDuration || 300,
      
      // Sound settings
      enableSounds: options.enableSounds || false,
      soundVolume: options.soundVolume || 0.3,
      
      // Haptic feedback
      enableHaptics: options.enableHaptics !== false,
      
      // Debug settings
      debug: options.debug || false,
      
      ...options
    };

    this.notifications = new Map();
    this.feedbackQueue = [];
    this.soundEffects = new Map();
    this.notificationContainer = null;
    this.reducedMotion = false;

    this.init();
  }

  /**
   * Initialize feedback system
   */
  init() {
    if (this.options.debug) {
      console.log('🎯 FeedbackSystem initializing...');
    }

    // Check for reduced motion
    this.checkReducedMotion();

    // Setup notification container
    this.setupNotificationContainer();

    // Setup feedback styles
    this.setupFeedbackStyles();

    // Setup sound effects
    if (this.options.enableSounds) {
      this.setupSoundEffects();
    }

    // Setup global feedback handlers
    this.setupGlobalHandlers();

    // Setup custom event listeners
    this.setupCustomEvents();

    if (this.options.debug) {
      console.log('✅ FeedbackSystem initialized');
    }
  }

  /**
   * Check for reduced motion preference
   */
  checkReducedMotion() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addListener((e) => {
      this.reducedMotion = e.matches;
    });
  }

  /**
   * Setup notification container
   */
  setupNotificationContainer() {
    if (document.getElementById('feedback-notifications')) return;

    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'feedback-notifications';
    this.notificationContainer.className = `notification-container notification-${this.options.notificationPosition}`;
    
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * Setup feedback styles
   */
  setupFeedbackStyles() {
    if (document.getElementById('feedback-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'feedback-system-styles';
    style.textContent = `
      /* Feedback System Styles */
      
      /* Notification Container */
      .notification-container {
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        max-width: 420px;
        width: 100%;
      }
      
      .notification-top-right {
        top: 20px;
        right: 20px;
      }
      
      .notification-top-left {
        top: 20px;
        left: 20px;
      }
      
      .notification-top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .notification-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .notification-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .notification-bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      /* Notification Styles */
      .notification {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      
      .notification.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .notification.hide {
        transform: translateX(100%);
        opacity: 0;
        margin-bottom: 0;
        padding-top: 0;
        padding-bottom: 0;
        max-height: 0;
      }
      
      /* Notification variants */
      .notification-success {
        border-left: 4px solid #10b981;
        background: #f0fdf4;
      }
      
      .notification-error {
        border-left: 4px solid #ef4444;
        background: #fef2f2;
      }
      
      .notification-warning {
        border-left: 4px solid #f59e0b;
        background: #fffbeb;
      }
      
      .notification-info {
        border-left: 4px solid #3b82f6;
        background: #eff6ff;
      }
      
      /* Notification content */
      .notification-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 2px;
        font-size: 18px;
      }
      
      .notification-content {
        flex: 1;
        min-width: 0;
      }
      
      .notification-title {
        font-weight: 600;
        font-size: 14px;
        margin: 0 0 4px 0;
        color: #111827;
      }
      
      .notification-message {
        font-size: 13px;
        line-height: 1.4;
        color: #6b7280;
        margin: 0;
      }
      
      .notification-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      
      .notification-action {
        background: none;
        border: none;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .notification-action-primary {
        background: #3b82f6;
        color: white;
      }
      
      .notification-action-primary:hover {
        background: #2563eb;
      }
      
      .notification-action-secondary {
        color: #6b7280;
      }
      
      .notification-action-secondary:hover {
        background: #f3f4f6;
      }
      
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
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
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .notification-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #6b7280;
      }
      
      /* Progress bar */
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: rgba(0, 0, 0, 0.1);
        transition: width linear;
      }
      
      .notification-success .notification-progress {
        background: #10b981;
      }
      
      .notification-error .notification-progress {
        background: #ef4444;
      }
      
      .notification-warning .notification-progress {
        background: #f59e0b;
      }
      
      .notification-info .notification-progress {
        background: #3b82f6;
      }
      
      /* Toast styles (minimal notifications) */
      .toast {
        background: #374151;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 14px;
        max-width: 320px;
      }
      
      .toast .notification-title {
        color: white;
      }
      
      .toast .notification-message {
        color: #d1d5db;
      }
      
      .toast .notification-close {
        color: #9ca3af;
      }
      
      .toast .notification-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      
      /* Confirmation dialog */
      .confirmation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      
      .confirmation-overlay.show {
        opacity: 1;
        visibility: visible;
      }
      
      .confirmation-dialog {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }
      
      .confirmation-overlay.show .confirmation-dialog {
        transform: scale(1);
      }
      
      .confirmation-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin: 0 auto 16px;
      }
      
      .confirmation-icon-warning {
        background: #fef3c7;
        color: #d97706;
      }
      
      .confirmation-icon-danger {
        background: #fee2e2;
        color: #dc2626;
      }
      
      .confirmation-icon-info {
        background: #dbeafe;
        color: #2563eb;
      }
      
      .confirmation-title {
        font-size: 18px;
        font-weight: 600;
        text-align: center;
        margin: 0 0 8px 0;
        color: #111827;
      }
      
      .confirmation-message {
        font-size: 14px;
        text-align: center;
        color: #6b7280;
        line-height: 1.5;
        margin: 0 0 24px 0;
      }
      
      .confirmation-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .confirmation-button {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
      }
      
      .confirmation-button-primary {
        background: #3b82f6;
        color: white;
      }
      
      .confirmation-button-primary:hover {
        background: #2563eb;
      }
      
      .confirmation-button-danger {
        background: #ef4444;
        color: white;
      }
      
      .confirmation-button-danger:hover {
        background: #dc2626;
      }
      
      .confirmation-button-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      
      .confirmation-button-secondary:hover {
        background: #e5e7eb;
      }
      
      /* Status indicators */
      .status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-online {
        background: #dcfce7;
        color: #166534;
      }
      
      .status-offline {
        background: #fef2f2;
        color: #991b1b;
      }
      
      .status-away {
        background: #fef3c7;
        color: #92400e;
      }
      
      .status-busy {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: statusPulse 2s infinite;
      }
      
      @keyframes statusPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Feedback animations */
      .feedback-bounce {
        animation: feedbackBounce 0.6s ease;
      }
      
      @keyframes feedbackBounce {
        0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); }
        40%, 43% { transform: translate3d(0, -10px, 0); }
        70% { transform: translate3d(0, -5px, 0); }
        90% { transform: translate3d(0, -2px, 0); }
      }
      
      .feedback-shake {
        animation: feedbackShake 0.5s ease;
      }
      
      @keyframes feedbackShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }
      
      .feedback-flash {
        animation: feedbackFlash 0.3s ease;
      }
      
      @keyframes feedbackFlash {
        0%, 100% { background-color: transparent; }
        50% { background-color: #fef3c7; }
      }
      
      .feedback-glow {
        animation: feedbackGlow 1s ease;
      }
      
      @keyframes feedbackGlow {
        0%, 100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
        50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
      }
      
      /* Mobile optimizations */
      @media (max-width: 640px) {
        .notification-container {
          left: 12px;
          right: 12px;
          max-width: none;
        }
        
        .notification-top-right,
        .notification-top-left,
        .notification-bottom-right,
        .notification-bottom-left {
          left: 12px;
          right: 12px;
        }
        
        .notification-top-center,
        .notification-bottom-center {
          transform: none;
        }
        
        .confirmation-dialog {
          margin: 20px;
          width: calc(100% - 40px);
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .notification {
          background: #1f2937;
          border-color: #374151;
        }
        
        .notification-title {
          color: #f9fafb;
        }
        
        .notification-message {
          color: #d1d5db;
        }
        
        .notification-success {
          background: rgba(16, 185, 129, 0.1);
        }
        
        .notification-error {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .notification-warning {
          background: rgba(245, 158, 11, 0.1);
        }
        
        .notification-info {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .confirmation-dialog {
          background: #1f2937;
        }
        
        .confirmation-title {
          color: #f9fafb;
        }
        
        .confirmation-message {
          color: #d1d5db;
        }
        
        .confirmation-button-secondary {
          background: #374151;
          color: #d1d5db;
        }
        
        .confirmation-button-secondary:hover {
          background: #4b5563;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .notification {
          transition: opacity 0.1s ease;
          transform: none !important;
        }
        
        .confirmation-overlay,
        .confirmation-dialog {
          transition: opacity 0.1s ease;
        }
        
        .confirmation-dialog {
          transform: none !important;
        }
        
        .feedback-bounce,
        .feedback-shake,
        .feedback-flash,
        .feedback-glow {
          animation: none;
        }
        
        .status-dot {
          animation: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup sound effects
   */
  setupSoundEffects() {
    // Create audio context for sound effects
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Generate sound effects programmatically
      this.generateSoundEffects();
    } catch (error) {
      console.warn('Audio context not supported:', error);
      this.options.enableSounds = false;
    }
  }

  /**
   * Generate sound effects
   */
  generateSoundEffects() {
    // Success sound (pleasant chime)
    this.soundEffects.set('success', this.createTone([523.25, 659.25, 783.99], 0.3));
    
    // Error sound (descending tones)
    this.soundEffects.set('error', this.createTone([349.23, 293.66, 246.94], 0.4));
    
    // Warning sound (two-tone)
    this.soundEffects.set('warning', this.createTone([440, 523.25], 0.2));
    
    // Info sound (gentle beep)
    this.soundEffects.set('info', this.createTone([523.25], 0.2));
    
    // Click sound (short click)
    this.soundEffects.set('click', this.createTone([800], 0.1));
  }

  /**
   * Create tone sequence
   */
  createTone(frequencies, duration) {
    return () => {
      if (!this.audioContext || this.audioContext.state === 'suspended') return;
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.options.soundVolume * 0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        const startTime = this.audioContext.currentTime + (index * 0.1);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    };
  }

  /**
   * Setup global handlers
   */
  setupGlobalHandlers() {
    // Handle form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.dataset.feedback !== 'false') {
        this.handleFormSubmission(form);
      }
    });

    // Handle clicks for feedback
    document.addEventListener('click', (e) => {
      const element = e.target.closest('[data-feedback]');
      if (element) {
        const feedbackType = element.dataset.feedback;
        this.provideFeedback(element, feedbackType);
      }
    });

    // Handle errors
    window.addEventListener('error', (e) => {
      if (this.options.debug) {
        this.showNotification({
          type: 'error',
          title: 'JavaScript Error',
          message: e.message,
          duration: 8000
        });
      }
    });
  }

  /**
   * Setup custom events
   */
  setupCustomEvents() {
    // Listen for custom feedback events
    document.addEventListener('feedback:success', (e) => {
      this.success(e.detail.message, e.detail.options);
    });

    document.addEventListener('feedback:error', (e) => {
      this.error(e.detail.message, e.detail.options);
    });

    document.addEventListener('feedback:warning', (e) => {
      this.warning(e.detail.message, e.detail.options);
    });

    document.addEventListener('feedback:info', (e) => {
      this.info(e.detail.message, e.detail.options);
    });
  }

  /**
   * Handle form submission feedback
   */
  handleFormSubmission(form) {
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      this.provideFeedback(submitButton, 'loading');
    }

    // Listen for form completion
    form.addEventListener('formdata', () => {
      this.info('Form submitted successfully!');
    }, { once: true });
  }

  /**
   * Provide immediate feedback for interactions
   */
  provideFeedback(element, type) {
    switch (type) {
      case 'click':
        this.animateClick(element);
        this.playSound('click');
        this.hapticFeedback('light');
        break;
      case 'success':
        this.animateSuccess(element);
        this.playSound('success');
        this.hapticFeedback('success');
        break;
      case 'error':
        this.animateError(element);
        this.playSound('error');
        this.hapticFeedback('error');
        break;
      case 'loading':
        this.animateLoading(element);
        break;
      case 'bounce':
        this.animateBounce(element);
        break;
      case 'shake':
        this.animateShake(element);
        break;
    }
  }

  /**
   * Animation methods
   */
  animateClick(element) {
    if (this.reducedMotion) return;
    
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
      element.style.transform = '';
      setTimeout(() => {
        element.style.transition = '';
      }, 100);
    }, 100);
  }

  animateSuccess(element) {
    if (this.reducedMotion) return;
    
    element.classList.add('feedback-glow');
    setTimeout(() => {
      element.classList.remove('feedback-glow');
    }, 1000);
  }

  animateError(element) {
    if (this.reducedMotion) return;
    
    element.classList.add('feedback-shake');
    setTimeout(() => {
      element.classList.remove('feedback-shake');
    }, 500);
  }

  animateLoading(element) {
    element.style.opacity = '0.7';
    element.style.pointerEvents = 'none';
    element.dataset.originalText = element.textContent;
    element.innerHTML = '<span class="loading-spinner loading-spinner-sm"></span> Loading...';
  }

  animateBounce(element) {
    if (this.reducedMotion) return;
    
    element.classList.add('feedback-bounce');
    setTimeout(() => {
      element.classList.remove('feedback-bounce');
    }, 600);
  }

  animateShake(element) {
    if (this.reducedMotion) return;
    
    element.classList.add('feedback-shake');
    setTimeout(() => {
      element.classList.remove('feedback-shake');
    }, 500);
  }

  /**
   * Sound methods
   */
  playSound(type) {
    if (!this.options.enableSounds) return;
    
    const soundEffect = this.soundEffects.get(type);
    if (soundEffect) {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      soundEffect();
    }
  }

  /**
   * Haptic feedback
   */
  hapticFeedback(type) {
    if (!this.options.enableHaptics || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [40],
      success: [10, 50, 10],
      error: [100, 50, 100],
      warning: [50, 30, 50]
    };
    
    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * Notification methods
   */
  showNotification(options) {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const config = {
      id,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      duration: options.duration || this.options.notificationDuration,
      actions: options.actions || [],
      closable: options.closable !== false,
      sound: options.sound !== false,
      style: options.style || 'notification'
    };

    // Limit number of notifications
    if (this.notifications.size >= this.options.maxNotifications) {
      const oldestId = Array.from(this.notifications.keys())[0];
      this.hideNotification(oldestId);
    }

    // Create notification element
    const notification = this.createNotificationElement(config);
    this.notificationContainer.appendChild(notification);
    
    // Store notification
    this.notifications.set(id, {
      element: notification,
      config,
      timeout: null
    });

    // Play sound
    if (config.sound) {
      this.playSound(config.type);
    }

    // Show notification
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-hide after duration
    if (config.duration > 0) {
      const timeout = setTimeout(() => {
        this.hideNotification(id);
      }, config.duration);
      
      this.notifications.get(id).timeout = timeout;
    }

    return id;
  }

  /**
   * Create notification element
   */
  createNotificationElement(config) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${config.type} ${config.style}`;
    notification.dataset.notificationId = config.id;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const icon = icons[config.type] || icons.info;

    let actionsHTML = '';
    if (config.actions.length > 0) {
      actionsHTML = `
        <div class="notification-actions">
          ${config.actions.map(action => `
            <button class="notification-action notification-action-${action.type || 'secondary'}" 
                    data-notification-id="${config.id}" data-action="${action.action}">
              ${action.text}
            </button>
          `).join('')}
        </div>
      `;
    }

    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        ${config.title ? `<div class="notification-title">${config.title}</div>` : ''}
        ${config.message ? `<div class="notification-message">${config.message}</div>` : ''}
        ${actionsHTML}
      </div>
      ${config.closable ? `
        <button class="notification-close" data-notification-id="${config.id}" data-action="close">
          ×
        </button>
      ` : ''}
      ${config.duration > 0 ? '<div class="notification-progress"></div>' : ''}
    `;

    // Setup progress bar
    if (config.duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${config.duration}ms linear`;
        
        requestAnimationFrame(() => {
          progressBar.style.width = '0%';
        });
      }
    }

    // Add event listeners for notification actions
    notification.addEventListener('click', (e) => {
      const button = e.target.closest('[data-notification-id]');
      if (button) {
        const notificationId = button.dataset.notificationId;
        const action = button.dataset.action;
        
        if (action === 'close') {
          this.hideNotification(notificationId);
        } else {
          this.handleNotificationAction(notificationId, action);
        }
      }
    });

    return notification;
  }

  /**
   * Hide notification
   */
  hideNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Cancel timeout
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }

    // Hide notification
    notification.element.classList.add('hide');
    
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Handle notification actions
   */
  handleNotificationAction(notificationId, action) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Emit custom event
    document.dispatchEvent(new CustomEvent('notification:action', {
      detail: { notificationId, action, notification: notification.config }
    }));

    // Hide notification
    this.hideNotification(notificationId);
  }

  /**
   * Show confirmation dialog
   */
  showConfirmation(options) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirmation-overlay';
      
      const iconTypes = {
        warning: { class: 'confirmation-icon-warning', icon: '⚠️' },
        danger: { class: 'confirmation-icon-danger', icon: '🚨' },
        info: { class: 'confirmation-icon-info', icon: 'ℹ️' }
      };
      
      const iconConfig = iconTypes[options.type] || iconTypes.info;

      overlay.innerHTML = `
        <div class="confirmation-dialog">
          <div class="confirmation-icon ${iconConfig.class}">
            ${iconConfig.icon}
          </div>
          <h3 class="confirmation-title">${options.title || 'Confirm Action'}</h3>
          <p class="confirmation-message">${options.message || 'Are you sure?'}</p>
          <div class="confirmation-actions">
            <button class="confirmation-button confirmation-button-secondary" data-action="cancel">
              ${options.cancelText || 'Cancel'}
            </button>
            <button class="confirmation-button confirmation-button-${options.type === 'danger' ? 'danger' : 'primary'}" data-action="confirm">
              ${options.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Handle clicks
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.dataset.action) {
          const action = e.target.dataset.action;
          resolve(action === 'confirm');
          
          overlay.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(overlay);
          }, 300);
        }
      });

      // Show dialog
      requestAnimationFrame(() => {
        overlay.classList.add('show');
      });

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          resolve(false);
          overlay.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(overlay);
          }, 300);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      
      document.addEventListener('keydown', handleEscape);
    });
  }

  /**
   * Convenience methods
   */
  success(message, options = {}) {
    return this.showNotification({
      type: 'success',
      message,
      ...options
    });
  }

  error(message, options = {}) {
    return this.showNotification({
      type: 'error',
      message,
      duration: options.duration || 8000,
      ...options
    });
  }

  warning(message, options = {}) {
    return this.showNotification({
      type: 'warning',
      message,
      ...options
    });
  }

  info(message, options = {}) {
    return this.showNotification({
      type: 'info',
      message,
      ...options
    });
  }

  toast(message, options = {}) {
    return this.showNotification({
      message,
      style: 'toast',
      duration: 3000,
      ...options
    });
  }

  /**
   * Status methods
   */
  showStatus(type, message) {
    const status = document.createElement('div');
    status.className = `status-indicator status-${type}`;
    status.innerHTML = `<div class="status-dot"></div>${message}`;
    return status;
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    Array.from(this.notifications.keys()).forEach(id => {
      this.hideNotification(id);
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeNotifications: this.notifications.size,
      totalNotifications: this.feedbackQueue.length,
      soundsEnabled: this.options.enableSounds,
      hapticsEnabled: this.options.enableHaptics
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all notifications
    this.clearAll();

    // Remove container
    if (this.notificationContainer && this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }

    // Remove styles
    const styles = document.getElementById('feedback-system-styles');
    if (styles) {
      styles.remove();
    }

    console.log('🎯 FeedbackSystem destroyed');
  }
}

// Create global feedback system instance
export const feedbackSystem = new FeedbackSystem({
  debug: process.env.NODE_ENV !== 'production'
});

// Make it globally available for notification actions
window.feedbackSystem = feedbackSystem;