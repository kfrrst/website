/**
 * Animation System
 * Comprehensive animation and micro-interaction system for delightful UX
 */
export class AnimationSystem {
  constructor(options = {}) {
    this.options = {
      // Animation settings
      enableAnimations: options.enableAnimations !== false,
      respectReducedMotion: options.respectReducedMotion !== false,
      defaultDuration: options.defaultDuration || 300,
      defaultEasing: options.defaultEasing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      
      // Performance settings
      useGPUAcceleration: options.useGPUAcceleration !== false,
      optimizeForTouch: options.optimizeForTouch !== false,
      batchAnimations: options.batchAnimations !== false,
      
      // Debug settings
      debug: options.debug || false,
      showPerformanceMetrics: options.showPerformanceMetrics || false,
      
      ...options
    };

    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.performanceMetrics = {
      totalAnimations: 0,
      completedAnimations: 0,
      averageFrameTime: 0,
      droppedFrames: 0
    };

    this.easingFunctions = new Map();
    this.animationObserver = null;
    this.reducedMotion = false;

    this.init();
  }

  /**
   * Initialize animation system
   */
  init() {
    if (this.options.debug) {
      console.log('🎬 AnimationSystem initializing...');
    }

    // Check for reduced motion preference
    this.checkReducedMotion();

    // Setup easing functions
    this.setupEasingFunctions();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    // Setup CSS custom properties for animations
    this.setupCSSProperties();

    // Setup global animation styles
    this.setupGlobalStyles();

    // Setup micro-interaction handlers
    this.setupMicroInteractions();

    // Setup gesture animations
    this.setupGestureAnimations();

    if (this.options.debug) {
      console.log('✅ AnimationSystem initialized');
    }
  }

  /**
   * Check for reduced motion preference
   */
  checkReducedMotion() {
    if (!this.options.respectReducedMotion) return;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addListener((e) => {
      this.reducedMotion = e.matches;
      if (this.reducedMotion) {
        this.pauseAllAnimations();
      }
    });
  }

  /**
   * Setup easing functions
   */
  setupEasingFunctions() {
    // Standard easing functions
    this.easingFunctions.set('linear', 'linear');
    this.easingFunctions.set('ease', 'ease');
    this.easingFunctions.set('ease-in', 'ease-in');
    this.easingFunctions.set('ease-out', 'ease-out');
    this.easingFunctions.set('ease-in-out', 'ease-in-out');
    
    // Custom easing functions
    this.easingFunctions.set('smooth', 'cubic-bezier(0.4, 0, 0.2, 1)');
    this.easingFunctions.set('bounce', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    this.easingFunctions.set('elastic', 'cubic-bezier(0.175, 0.885, 0.32, 1.275)');
    this.easingFunctions.set('spring', 'cubic-bezier(0.25, 0.46, 0.45, 0.94)');
    this.easingFunctions.set('sharp', 'cubic-bezier(0.4, 0, 0.6, 1)');
    this.easingFunctions.set('gentle', 'cubic-bezier(0.25, 0.1, 0.25, 1)');
  }

  /**
   * Setup CSS custom properties
   */
  setupCSSProperties() {
    const root = document.documentElement;
    
    // Animation durations
    root.style.setProperty('--anim-duration-fast', '150ms');
    root.style.setProperty('--anim-duration-normal', '300ms');
    root.style.setProperty('--anim-duration-slow', '500ms');
    root.style.setProperty('--anim-duration-slower', '700ms');
    
    // Easing functions
    root.style.setProperty('--anim-ease-smooth', this.easingFunctions.get('smooth'));
    root.style.setProperty('--anim-ease-bounce', this.easingFunctions.get('bounce'));
    root.style.setProperty('--anim-ease-elastic', this.easingFunctions.get('elastic'));
    root.style.setProperty('--anim-ease-spring', this.easingFunctions.get('spring'));
    
    // Animation delays
    root.style.setProperty('--anim-delay-short', '50ms');
    root.style.setProperty('--anim-delay-medium', '100ms');
    root.style.setProperty('--anim-delay-long', '150ms');
  }

  /**
   * Setup global animation styles
   */
  setupGlobalStyles() {
    if (document.getElementById('animation-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'animation-system-styles';
    style.textContent = `
      /* Animation System Global Styles */
      
      /* Base animation classes */
      .animate {
        will-change: transform, opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      .animate-gpu {
        transform: translate3d(0, 0, 0);
        will-change: transform, opacity;
      }
      
      /* Fade animations */
      .fade-in {
        animation: fadeIn var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      .fade-out {
        animation: fadeOut var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      /* Slide animations */
      .slide-in-up {
        animation: slideInUp var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      .slide-in-down {
        animation: slideInDown var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      .slide-in-left {
        animation: slideInLeft var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      .slide-in-right {
        animation: slideInRight var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      @keyframes slideInUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes slideInDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      /* Scale animations */
      .scale-in {
        animation: scaleIn var(--anim-duration-normal) var(--anim-ease-bounce) forwards;
      }
      
      .scale-out {
        animation: scaleOut var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes scaleOut {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.8); opacity: 0; }
      }
      
      /* Bounce animations */
      .bounce-in {
        animation: bounceIn var(--anim-duration-slow) var(--anim-ease-bounce) forwards;
      }
      
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); opacity: 0.8; }
        70% { transform: scale(0.9); opacity: 0.9; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      /* Pulse animation */
      .pulse {
        animation: pulse 2s var(--anim-ease-smooth) infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      /* Shake animation */
      .shake {
        animation: shake var(--anim-duration-normal) var(--anim-ease-smooth);
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      /* Rotate animations */
      .rotate-in {
        animation: rotateIn var(--anim-duration-normal) var(--anim-ease-smooth) forwards;
      }
      
      @keyframes rotateIn {
        from { transform: rotate(-180deg) scale(0.8); opacity: 0; }
        to { transform: rotate(0deg) scale(1); opacity: 1; }
      }
      
      /* Flip animations */
      .flip-in-x {
        animation: flipInX var(--anim-duration-slow) var(--anim-ease-smooth) forwards;
      }
      
      .flip-in-y {
        animation: flipInY var(--anim-duration-slow) var(--anim-ease-smooth) forwards;
      }
      
      @keyframes flipInX {
        from { transform: perspective(400px) rotateX(90deg); opacity: 0; }
        40% { transform: perspective(400px) rotateX(-20deg); }
        60% { transform: perspective(400px) rotateX(10deg); opacity: 1; }
        80% { transform: perspective(400px) rotateX(-5deg); }
        to { transform: perspective(400px) rotateX(0deg); opacity: 1; }
      }
      
      @keyframes flipInY {
        from { transform: perspective(400px) rotateY(90deg); opacity: 0; }
        40% { transform: perspective(400px) rotateY(-20deg); }
        60% { transform: perspective(400px) rotateY(10deg); opacity: 1; }
        80% { transform: perspective(400px) rotateY(-5deg); }
        to { transform: perspective(400px) rotateY(0deg); opacity: 1; }
      }
      
      /* Micro-interactions */
      .hover-lift {
        transition: transform var(--anim-duration-fast) var(--anim-ease-smooth);
      }
      
      .hover-lift:hover {
        transform: translateY(-2px);
      }
      
      .hover-grow {
        transition: transform var(--anim-duration-fast) var(--anim-ease-smooth);
      }
      
      .hover-grow:hover {
        transform: scale(1.05);
      }
      
      .hover-glow {
        transition: box-shadow var(--anim-duration-fast) var(--anim-ease-smooth);
      }
      
      .hover-glow:hover {
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
      }
      
      .button-press {
        transition: transform var(--anim-duration-fast) var(--anim-ease-smooth);
      }
      
      .button-press:active {
        transform: scale(0.98);
      }
      
      /* Loading animations */
      .loading-dots {
        display: inline-flex;
        align-items: center;
      }
      
      .loading-dots::after {
        content: '';
        display: inline-block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: currentColor;
        animation: loadingDots 1.4s infinite both;
        margin-left: 4px;
      }
      
      @keyframes loadingDots {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Progress bar animation */
      .progress-bar {
        overflow: hidden;
        position: relative;
      }
      
      .progress-bar::before {
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
      
      /* Stagger animations */
      .stagger-children > * {
        animation-delay: calc(var(--stagger-delay, 100ms) * var(--stagger-index, 0));
      }
      
      /* Reduced motion overrides */
      @media (prefers-reduced-motion: reduce) {
        .animate,
        .animate-gpu,
        .fade-in,
        .fade-out,
        .slide-in-up,
        .slide-in-down,
        .slide-in-left,
        .slide-in-right,
        .scale-in,
        .scale-out,
        .bounce-in,
        .rotate-in,
        .flip-in-x,
        .flip-in-y {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
        
        .pulse,
        .loading-dots::after,
        .loading-spinner,
        .progress-bar::before {
          animation: none !important;
        }
        
        .hover-lift:hover,
        .hover-grow:hover,
        .button-press:active {
          transform: none !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup micro-interactions
   */
  setupMicroInteractions() {
    // Auto-apply hover effects to interactive elements
    this.setupHoverEffects();
    
    // Button press effects
    this.setupButtonEffects();
    
    // Input focus effects
    this.setupInputEffects();
    
    // Card hover effects
    this.setupCardEffects();
    
    // Loading state effects
    this.setupLoadingEffects();
  }

  /**
   * Setup hover effects
   */
  setupHoverEffects() {
    // Auto-apply hover effects based on element type
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            this.applyAutoHoverEffects(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Apply to existing elements
    this.applyAutoHoverEffects(document.body);
  }

  /**
   * Apply automatic hover effects
   */
  applyAutoHoverEffects(container) {
    // Buttons get lift and press effects
    const buttons = container.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach(button => {
      if (!button.classList.contains('no-hover-effects')) {
        button.classList.add('hover-lift', 'button-press');
      }
    });

    // Cards get subtle lift effect
    const cards = container.querySelectorAll('.card, .mobile-card, [data-card]');
    cards.forEach(card => {
      if (!card.classList.contains('no-hover-effects')) {
        card.classList.add('hover-lift');
      }
    });

    // Interactive elements get grow effect
    const interactive = container.querySelectorAll('a:not(.btn), .interactive, [data-interactive]');
    interactive.forEach(element => {
      if (!element.classList.contains('no-hover-effects')) {
        element.classList.add('hover-grow');
      }
    });
  }

  /**
   * Setup button effects
   */
  setupButtonEffects() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button, .btn, [role="button"]');
      if (button && !button.classList.contains('no-click-effect')) {
        this.createRippleEffect(button, e);
      }
    });
  }

  /**
   * Create ripple effect
   */
  createRippleEffect(element, event) {
    if (this.reducedMotion) return;

    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 600ms ease-out;
      pointer-events: none;
      z-index: 1;
    `;

    // Add ripple keyframes if not exists
    if (!document.getElementById('ripple-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ripple-keyframes';
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const currentPosition = window.getComputedStyle(element).position;
    if (currentPosition === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Setup input effects
   */
  setupInputEffects() {
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.animateInputFocus(e.target, true);
      }
    });

    document.addEventListener('focusout', (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.animateInputFocus(e.target, false);
      }
    });
  }

  /**
   * Animate input focus
   */
  animateInputFocus(input, focused) {
    if (this.reducedMotion) return;

    const label = input.previousElementSibling;
    if (label && label.tagName === 'LABEL') {
      if (focused) {
        label.style.transform = 'translateY(-8px) scale(0.85)';
        label.style.color = 'var(--primary-color, #2563eb)';
      } else if (!input.value) {
        label.style.transform = '';
        label.style.color = '';
      }
    }

    // Add glow effect
    if (focused) {
      input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
    } else {
      input.style.boxShadow = '';
    }
  }

  /**
   * Setup card effects
   */
  setupCardEffects() {
    document.addEventListener('mouseenter', (e) => {
      const card = e.target.closest('.card, .mobile-card, [data-card]');
      if (card) {
        this.animateCardHover(card, true);
      }
    });

    document.addEventListener('mouseleave', (e) => {
      const card = e.target.closest('.card, .mobile-card, [data-card]');
      if (card) {
        this.animateCardHover(card, false);
      }
    });
  }

  /**
   * Animate card hover
   */
  animateCardHover(card, hovered) {
    if (this.reducedMotion) return;

    if (hovered) {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
    } else {
      card.style.transform = '';
      card.style.boxShadow = '';
    }
  }

  /**
   * Setup loading effects
   */
  setupLoadingEffects() {
    // Auto-apply loading animations to elements with loading states
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-loading') {
          const element = mutation.target;
          if (element.dataset.loading === 'true') {
            this.showLoadingState(element);
          } else {
            this.hideLoadingState(element);
          }
        }
      });
    });

    observer.observe(document.body, { 
      attributes: true, 
      subtree: true, 
      attributeFilter: ['data-loading'] 
    });
  }

  /**
   * Show loading state
   */
  showLoadingState(element) {
    if (!element.querySelector('.loading-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border-radius: inherit;
      `;

      const currentPosition = window.getComputedStyle(element).position;
      if (currentPosition === 'static') {
        element.style.position = 'relative';
      }

      element.appendChild(overlay);
      
      if (!this.reducedMotion) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 200ms ease';
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
        });
      }
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (overlay) {
      if (!this.reducedMotion) {
        overlay.style.transition = 'opacity 200ms ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      } else {
        overlay.remove();
      }
    }
  }

  /**
   * Setup gesture animations
   */
  setupGestureAnimations() {
    // Swipe animations
    document.addEventListener('swipe', (e) => {
      const element = e.target.closest('[data-swipe-animate]');
      if (element) {
        this.animateSwipe(element, e.detail.direction);
      }
    });

    // Long press animations
    document.addEventListener('longpress', (e) => {
      const element = e.target.closest('[data-longpress-animate]');
      if (element) {
        this.animateLongPress(element);
      }
    });
  }

  /**
   * Animate swipe gesture
   */
  animateSwipe(element, direction) {
    if (this.reducedMotion) return;

    const animations = {
      left: 'slide-out-left',
      right: 'slide-out-right',
      up: 'slide-out-up',
      down: 'slide-out-down'
    };

    const animationClass = animations[direction];
    if (animationClass) {
      element.classList.add(animationClass);
      element.addEventListener('animationend', () => {
        element.classList.remove(animationClass);
      }, { once: true });
    }
  }

  /**
   * Animate long press
   */
  animateLongPress(element) {
    if (this.reducedMotion) return;

    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 150ms ease';
    
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (!this.options.showPerformanceMetrics) return;

    // Monitor animation performance
    let lastFrame = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;

    const monitorFrameRate = () => {
      const currentFrame = performance.now();
      const frameTime = currentFrame - lastFrame;
      
      totalFrameTime += frameTime;
      frameCount++;

      if (frameTime > 16.67) { // More than 60fps
        this.performanceMetrics.droppedFrames++;
      }

      this.performanceMetrics.averageFrameTime = totalFrameTime / frameCount;
      
      lastFrame = currentFrame;
      requestAnimationFrame(monitorFrameRate);
    };

    if (this.options.debug) {
      requestAnimationFrame(monitorFrameRate);
    }
  }

  /**
   * Public API methods
   */

  /**
   * Animate element with custom options
   */
  animate(element, animation, options = {}) {
    if (this.reducedMotion && !options.forceAnimation) {
      return Promise.resolve();
    }

    const animationId = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const config = {
      duration: options.duration || this.options.defaultDuration,
      easing: options.easing || this.options.defaultEasing,
      delay: options.delay || 0,
      fill: options.fill || 'both',
      ...options
    };

    return new Promise((resolve) => {
      let animationInstance;

      if (typeof animation === 'string') {
        // CSS class animation
        element.classList.add(animation);
        element.addEventListener('animationend', () => {
          element.classList.remove(animation);
          this.activeAnimations.delete(animationId);
          resolve();
        }, { once: true });
      } else if (typeof animation === 'object') {
        // Web Animations API
        animationInstance = element.animate(animation, config);
        this.activeAnimations.set(animationId, animationInstance);
        
        animationInstance.addEventListener('finish', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
      }

      this.performanceMetrics.totalAnimations++;
    });
  }

  /**
   * Animate multiple elements with stagger
   */
  staggerAnimate(elements, animation, options = {}) {
    const staggerDelay = options.staggerDelay || 100;
    const promises = [];

    elements.forEach((element, index) => {
      const elementOptions = {
        ...options,
        delay: (options.delay || 0) + (index * staggerDelay)
      };
      promises.push(this.animate(element, animation, elementOptions));
    });

    return Promise.all(promises);
  }

  /**
   * Create entrance animation
   */
  enter(element, type = 'fade', options = {}) {
    const entranceAnimations = {
      fade: 'fade-in',
      slideUp: 'slide-in-up',
      slideDown: 'slide-in-down',
      slideLeft: 'slide-in-left',
      slideRight: 'slide-in-right',
      scale: 'scale-in',
      bounce: 'bounce-in',
      rotate: 'rotate-in',
      flipX: 'flip-in-x',
      flipY: 'flip-in-y'
    };

    const animationClass = entranceAnimations[type] || entranceAnimations.fade;
    return this.animate(element, animationClass, options);
  }

  /**
   * Create exit animation
   */
  exit(element, type = 'fade', options = {}) {
    const exitAnimations = {
      fade: 'fade-out',
      slideUp: 'slide-out-up',
      slideDown: 'slide-out-down',
      slideLeft: 'slide-out-left',
      slideRight: 'slide-out-right',
      scale: 'scale-out'
    };

    const animationClass = exitAnimations[type] || exitAnimations.fade;
    return this.animate(element, animationClass, options);
  }

  /**
   * Shake element (for errors, notifications)
   */
  shake(element, options = {}) {
    return this.animate(element, 'shake', options);
  }

  /**
   * Pulse element (for attention)
   */
  pulse(element, options = {}) {
    element.classList.add('pulse');
    
    if (options.duration) {
      setTimeout(() => {
        element.classList.remove('pulse');
      }, options.duration);
    }

    return Promise.resolve();
  }

  /**
   * Pause all animations
   */
  pauseAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.pause) {
        animation.pause();
      }
    });
  }

  /**
   * Resume all animations
   */
  resumeAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.play) {
        animation.play();
      }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Cancel all active animations
    this.activeAnimations.forEach(animation => {
      if (animation.cancel) {
        animation.cancel();
      }
    });
    this.activeAnimations.clear();

    // Remove styles
    const styles = document.getElementById('animation-system-styles');
    if (styles) {
      styles.remove();
    }

    const rippleStyles = document.getElementById('ripple-keyframes');
    if (rippleStyles) {
      rippleStyles.remove();
    }

    console.log('🎬 AnimationSystem destroyed');
  }
}

// Create global animation system instance
export const animationSystem = new AnimationSystem({
  debug: process.env.NODE_ENV !== 'production'
});