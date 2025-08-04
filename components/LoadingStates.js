/**
 * Loading States & Skeleton Screens
 * Provides elegant loading experiences and skeleton placeholders
 */
export class LoadingStates {
  constructor(options = {}) {
    this.options = {
      // Default settings
      skeletonColor: options.skeletonColor || '#e5e7eb',
      skeletonHighlight: options.skeletonHighlight || '#f3f4f6',
      animationDuration: options.animationDuration || '1.5s',
      borderRadius: options.borderRadius || '6px',
      
      // Auto-detection
      autoDetectContent: options.autoDetectContent !== false,
      autoShowSkeletons: options.autoShowSkeletons !== false,
      
      // Performance
      useIntersectionObserver: options.useIntersectionObserver !== false,
      lazyLoadThreshold: options.lazyLoadThreshold || 0.1,
      
      // Debug
      debug: options.debug || false,
      
      ...options
    };

    this.activeSkeletons = new Map();
    this.loadingStates = new Map();
    this.observers = new Map();

    this.init();
  }

  /**
   * Initialize loading states system
   */
  init() {
    if (this.options.debug) {
      console.log('⏳ LoadingStates initializing...');
    }

    // Setup global skeleton styles
    this.setupSkeletonStyles();

    // Setup auto-detection for content loading
    if (this.options.autoDetectContent) {
      this.setupContentDetection();
    }

    // Setup intersection observer for lazy loading
    if (this.options.useIntersectionObserver) {
      this.setupIntersectionObserver();
    }

    // Setup global loading state handlers
    this.setupLoadingHandlers();

    if (this.options.debug) {
      console.log('✅ LoadingStates initialized');
    }
  }

  /**
   * Setup skeleton styles
   */
  setupSkeletonStyles() {
    if (document.getElementById('loading-states-styles')) return;

    const style = document.createElement('style');
    style.id = 'loading-states-styles';
    style.textContent = `
      /* Loading States & Skeleton Styles */
      
      /* Base skeleton styles */
      .skeleton {
        background: linear-gradient(
          90deg,
          ${this.options.skeletonColor} 25%,
          ${this.options.skeletonHighlight} 50%,
          ${this.options.skeletonColor} 75%
        );
        background-size: 200% 100%;
        animation: skeletonShimmer ${this.options.animationDuration} infinite;
        border-radius: ${this.options.borderRadius};
        position: relative;
        overflow: hidden;
      }
      
      @keyframes skeletonShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      /* Skeleton variants */
      .skeleton-text {
        height: 1em;
        margin-bottom: 0.5em;
        border-radius: 4px;
      }
      
      .skeleton-text:last-child {
        margin-bottom: 0;
      }
      
      .skeleton-text-sm { height: 0.875em; }
      .skeleton-text-lg { height: 1.125em; }
      .skeleton-text-xl { height: 1.25em; }
      
      .skeleton-text-short { width: 60%; }
      .skeleton-text-medium { width: 80%; }
      .skeleton-text-long { width: 95%; }
      
      .skeleton-title {
        height: 2em;
        width: 70%;
        margin-bottom: 1em;
        border-radius: 8px;
      }
      
      .skeleton-paragraph {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
      }
      
      .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .skeleton-avatar-sm { width: 32px; height: 32px; }
      .skeleton-avatar-lg { width: 64px; height: 64px; }
      .skeleton-avatar-xl { width: 80px; height: 80px; }
      
      .skeleton-image {
        width: 100%;
        height: 200px;
        border-radius: ${this.options.borderRadius};
      }
      
      .skeleton-image-sm { height: 120px; }
      .skeleton-image-lg { height: 300px; }
      .skeleton-image-square { aspect-ratio: 1; height: auto; }
      .skeleton-image-wide { aspect-ratio: 16/9; height: auto; }
      
      .skeleton-button {
        height: 44px;
        width: 120px;
        border-radius: 6px;
      }
      
      .skeleton-button-sm { height: 36px; width: 100px; }
      .skeleton-button-lg { height: 52px; width: 140px; }
      .skeleton-button-wide { width: 200px; }
      .skeleton-button-full { width: 100%; }
      
      .skeleton-card {
        border-radius: ${this.options.borderRadius};
        padding: 1rem;
        border: 1px solid #e5e7eb;
        background: #ffffff;
      }
      
      .skeleton-list-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        gap: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .skeleton-list-item:last-child {
        border-bottom: none;
      }
      
      .skeleton-table-row {
        display: grid;
        grid-template-columns: repeat(var(--columns, 4), 1fr);
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .skeleton-table-cell {
        height: 1.5em;
      }
      
      /* Loading spinner variants */
      .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      .loading-spinner-sm { width: 16px; height: 16px; }
      .loading-spinner-lg { width: 32px; height: 32px; }
      .loading-spinner-xl { width: 48px; height: 48px; }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Loading dots */
      .loading-dots {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .loading-dots::before,
      .loading-dots::after,
      .loading-dots {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: loadingDots 1.4s infinite both;
      }
      
      .loading-dots::before { animation-delay: -0.32s; }
      .loading-dots::after { animation-delay: -0.16s; }
      
      @keyframes loadingDots {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      /* Loading pulse */
      .loading-pulse {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Loading bars */
      .loading-bars {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      
      .loading-bars span {
        width: 3px;
        height: 20px;
        background: currentColor;
        animation: loadingBars 1.2s infinite ease-in-out;
      }
      
      .loading-bars span:nth-child(2) { animation-delay: -1.1s; }
      .loading-bars span:nth-child(3) { animation-delay: -1.0s; }
      .loading-bars span:nth-child(4) { animation-delay: -0.9s; }
      .loading-bars span:nth-child(5) { animation-delay: -0.8s; }
      
      @keyframes loadingBars {
        0%, 40%, 100% { transform: scaleY(0.4); }
        20% { transform: scaleY(1); }
      }
      
      /* Progress indicators */
      .progress-bar {
        width: 100%;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }
      
      .progress-bar-fill {
        height: 100%;
        background: #3b82f6;
        border-radius: inherit;
        transition: width 0.3s ease;
      }
      
      .progress-bar-indeterminate .progress-bar-fill {
        width: 30%;
        animation: progressIndeterminate 2s infinite linear;
      }
      
      @keyframes progressIndeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(333%); }
      }
      
      .progress-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: conic-gradient(#3b82f6 var(--progress, 0%), #e5e7eb 0%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .progress-circle::before {
        content: '';
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
      }
      
      /* State transitions */
      .loading-enter {
        opacity: 0;
        transform: scale(0.9);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      
      .loading-enter-active {
        opacity: 1;
        transform: scale(1);
      }
      
      .loading-exit {
        opacity: 1;
        transform: scale(1);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      
      .loading-exit-active {
        opacity: 0;
        transform: scale(0.9);
      }
      
      /* Skeleton compositions */
      .skeleton-card-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .skeleton-card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .skeleton-card-body {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .skeleton-list {
        display: flex;
        flex-direction: column;
      }
      
      .skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }
      
      /* Loading overlay */
      .loading-overlay {
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
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
      }
      
      .loading-overlay-dark {
        background: rgba(0, 0, 0, 0.5);
        color: white;
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
          background: ${this.options.skeletonColor};
        }
        
        .loading-spinner,
        .loading-dots::before,
        .loading-dots::after,
        .loading-dots,
        .loading-bars span,
        .progress-bar-indeterminate .progress-bar-fill {
          animation: none;
        }
        
        .loading-pulse {
          animation: none;
          opacity: 0.7;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .skeleton {
          background: linear-gradient(
            90deg,
            #374151 25%,
            #4b5563 50%,
            #374151 75%
          );
          background-size: 200% 100%;
        }
        
        .skeleton-card {
          background: #1f2937;
          border-color: #374151;
        }
        
        .skeleton-list-item,
        .skeleton-table-row {
          border-color: #374151;
        }
        
        .loading-overlay {
          background: rgba(0, 0, 0, 0.8);
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup content detection
   */
  setupContentDetection() {
    // Monitor for elements with data-loading attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-loading') {
          const element = mutation.target;
          if (element.dataset.loading === 'true') {
            this.showSkeleton(element);
          } else {
            this.hideSkeleton(element);
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
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          this.loadContent(element);
          observer.unobserve(element);
        }
      });
    }, {
      threshold: this.options.lazyLoadThreshold,
      rootMargin: '50px 0px'
    });

    this.observers.set('lazy-load', observer);

    // Observe elements with data-lazy attribute
    document.querySelectorAll('[data-lazy]').forEach(element => {
      observer.observe(element);
      this.showSkeleton(element);
    });
  }

  /**
   * Setup loading handlers
   */
  setupLoadingHandlers() {
    // Handle form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.dataset.showLoading !== 'false') {
        this.showFormLoading(form);
      }
    });

    // Handle button clicks
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-loading-text], .btn[data-loading-text]');
      if (button && !button.disabled) {
        this.showButtonLoading(button);
      }
    });
  }

  /**
   * Show skeleton for element
   */
  showSkeleton(element, type = 'auto') {
    if (this.activeSkeletons.has(element)) return;

    let skeletonHTML = '';
    
    if (type === 'auto') {
      type = this.detectSkeletonType(element);
    }

    switch (type) {
      case 'card':
        skeletonHTML = this.createCardSkeleton();
        break;
      case 'list':
        skeletonHTML = this.createListSkeleton();
        break;
      case 'table':
        skeletonHTML = this.createTableSkeleton();
        break;
      case 'text':
        skeletonHTML = this.createTextSkeleton();
        break;
      case 'image':
        skeletonHTML = this.createImageSkeleton();
        break;
      case 'form':
        skeletonHTML = this.createFormSkeleton();
        break;
      default:
        skeletonHTML = this.createGenericSkeleton();
    }

    // Store original content
    const originalContent = element.innerHTML;
    this.activeSkeletons.set(element, {
      originalContent,
      type,
      timestamp: Date.now()
    });

    // Replace with skeleton
    element.innerHTML = skeletonHTML;
    element.classList.add('skeleton-container');

    if (this.options.debug) {
      console.log(`⏳ Showing ${type} skeleton for element:`, element);
    }
  }

  /**
   * Hide skeleton for element
   */
  hideSkeleton(element) {
    const skeletonData = this.activeSkeletons.get(element);
    if (!skeletonData) return;

    // Restore original content
    element.innerHTML = skeletonData.originalContent;
    element.classList.remove('skeleton-container');
    
    // Add fade-in animation
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease';
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      setTimeout(() => {
        element.style.opacity = '';
        element.style.transition = '';
      }, 300);
    });

    this.activeSkeletons.delete(element);

    if (this.options.debug) {
      const duration = Date.now() - skeletonData.timestamp;
      console.log(`✅ Hiding ${skeletonData.type} skeleton after ${duration}ms for element:`, element);
    }
  }

  /**
   * Detect skeleton type from element
   */
  detectSkeletonType(element) {
    // Check data attribute first
    if (element.dataset.skeletonType) {
      return element.dataset.skeletonType;
    }

    // Auto-detect based on element structure and classes
    if (element.classList.contains('card') || element.dataset.card !== undefined) {
      return 'card';
    }
    
    if (element.tagName === 'UL' || element.tagName === 'OL' || 
        element.classList.contains('list') || element.querySelector('li')) {
      return 'list';
    }
    
    if (element.tagName === 'TABLE' || element.classList.contains('table')) {
      return 'table';
    }
    
    if (element.tagName === 'IMG' || element.classList.contains('image')) {
      return 'image';
    }
    
    if (element.tagName === 'FORM' || element.classList.contains('form')) {
      return 'form';
    }
    
    if (element.tagName === 'P' || element.classList.contains('text')) {
      return 'text';
    }

    return 'generic';
  }

  /**
   * Create skeleton templates
   */
  createCardSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton-card-header">
          <div class="skeleton-avatar"></div>
          <div style="flex: 1;">
            <div class="skeleton-text skeleton-text-medium"></div>
            <div class="skeleton-text skeleton-text-sm skeleton-text-short"></div>
          </div>
        </div>
        <div class="skeleton-image skeleton-image-wide"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-text skeleton-text-long"></div>
          <div class="skeleton-text skeleton-text-medium"></div>
          <div class="skeleton-text skeleton-text-short"></div>
        </div>
      </div>
    `;
  }

  createListSkeleton(items = 5) {
    const listItems = Array.from({ length: items }, () => `
      <div class="skeleton-list-item">
        <div class="skeleton-avatar-sm"></div>
        <div style="flex: 1;">
          <div class="skeleton-text skeleton-text-medium"></div>
          <div class="skeleton-text skeleton-text-sm skeleton-text-short"></div>
        </div>
        <div class="skeleton-text skeleton-text-sm" style="width: 60px;"></div>
      </div>
    `).join('');

    return `<div class="skeleton-list">${listItems}</div>`;
  }

  createTableSkeleton(rows = 5, columns = 4) {
    const tableRows = Array.from({ length: rows }, () => `
      <div class="skeleton-table-row" style="--columns: ${columns};">
        ${Array.from({ length: columns }, () => '<div class="skeleton-table-cell skeleton"></div>').join('')}
      </div>
    `).join('');

    return `<div class="skeleton-table">${tableRows}</div>`;
  }

  createTextSkeleton(lines = 3) {
    const textLines = Array.from({ length: lines }, (_, index) => {
      const widthClass = index === lines - 1 ? 'skeleton-text-short' : 
                         index % 2 === 0 ? 'skeleton-text-long' : 'skeleton-text-medium';
      return `<div class="skeleton-text ${widthClass}"></div>`;
    }).join('');

    return `<div class="skeleton-paragraph">${textLines}</div>`;
  }

  createImageSkeleton() {
    return '<div class="skeleton-image"></div>';
  }

  createFormSkeleton() {
    return `
      <div class="skeleton-form">
        <div class="skeleton-text skeleton-text-sm skeleton-text-short" style="margin-bottom: 0.5rem;"></div>
        <div class="skeleton skeleton-button-full" style="height: 44px; margin-bottom: 1rem;"></div>
        <div class="skeleton-text skeleton-text-sm skeleton-text-short" style="margin-bottom: 0.5rem;"></div>
        <div class="skeleton skeleton-button-full" style="height: 44px; margin-bottom: 1rem;"></div>
        <div class="skeleton-text skeleton-text-sm skeleton-text-short" style="margin-bottom: 0.5rem;"></div>
        <div class="skeleton skeleton-button-full" style="height: 120px; margin-bottom: 1.5rem;"></div>
        <div class="skeleton-button" style="margin-left: auto;"></div>
      </div>
    `;
  }

  createGenericSkeleton() {
    return `
      <div class="skeleton-generic">
        <div class="skeleton-title"></div>
        <div class="skeleton-paragraph">
          <div class="skeleton-text skeleton-text-long"></div>
          <div class="skeleton-text skeleton-text-medium"></div>
          <div class="skeleton-text skeleton-text-short"></div>
        </div>
      </div>
    `;
  }

  /**
   * Show form loading state
   */
  showFormLoading(form) {
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      this.showButtonLoading(submitButton);
    }

    // Disable all form inputs
    const inputs = form.querySelectorAll('input, textarea, select, button');
    inputs.forEach(input => {
      input.disabled = true;
    });

    this.loadingStates.set(form, {
      type: 'form',
      elements: inputs,
      timestamp: Date.now()
    });
  }

  /**
   * Hide form loading state
   */
  hideFormLoading(form) {
    const loadingData = this.loadingStates.get(form);
    if (!loadingData) return;

    // Re-enable form inputs
    loadingData.elements.forEach(input => {
      input.disabled = false;
    });

    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      this.hideButtonLoading(submitButton);
    }

    this.loadingStates.delete(form);
  }

  /**
   * Show button loading state
   */
  showButtonLoading(button) {
    if (this.loadingStates.has(button)) return;

    const originalText = button.textContent;
    const loadingText = button.dataset.loadingText || 'Loading...';
    
    this.loadingStates.set(button, {
      type: 'button',
      originalText,
      timestamp: Date.now()
    });

    button.disabled = true;
    button.innerHTML = `
      <span class="loading-spinner loading-spinner-sm" style="margin-right: 8px;"></span>
      ${loadingText}
    `;
  }

  /**
   * Hide button loading state
   */
  hideButtonLoading(button) {
    const loadingData = this.loadingStates.get(button);
    if (!loadingData) return;

    button.disabled = false;
    button.textContent = loadingData.originalText;
    
    this.loadingStates.delete(button);
  }

  /**
   * Show loading overlay
   */
  showLoadingOverlay(element, options = {}) {
    if (element.querySelector('.loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = `loading-overlay ${options.dark ? 'loading-overlay-dark' : ''}`;
    
    const spinnerSize = options.size === 'large' ? 'loading-spinner-xl' : 
                       options.size === 'small' ? 'loading-spinner-sm' : 'loading-spinner';
    
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div class="loading-spinner ${spinnerSize}"></div>
        ${options.message ? `<div style="margin-top: 12px; font-size: 14px;">${options.message}</div>` : ''}
      </div>
    `;

    const currentPosition = window.getComputedStyle(element).position;
    if (currentPosition === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(overlay);

    // Fade in
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (!overlay) return;

    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';
    
    setTimeout(() => {
      overlay.remove();
    }, 200);
  }

  /**
   * Load content for lazy-loaded element
   */
  async loadContent(element) {
    const src = element.dataset.lazy;
    if (!src) return;

    try {
      if (element.tagName === 'IMG') {
        await this.loadImage(element, src);
      } else {
        await this.loadElementContent(element, src);
      }
      
      this.hideSkeleton(element);
    } catch (error) {
      console.error('Failed to load content:', error);
      this.showError(element, 'Failed to load content');
    }
  }

  /**
   * Load image
   */
  loadImage(img, src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        img.src = src;
        img.removeAttribute('data-lazy');
        resolve();
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  /**
   * Load element content
   */
  async loadElementContent(element, url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    element.innerHTML = content;
    element.removeAttribute('data-lazy');
  }

  /**
   * Show error state
   */
  showError(element, message) {
    element.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #ef4444;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <div style="font-weight: 500; margin-bottom: 0.5rem;">Error</div>
        <div style="font-size: 0.875rem; opacity: 0.8;">${message}</div>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }

  /**
   * Public API methods
   */

  /**
   * Set loading state for element
   */
  setLoading(element, loading = true) {
    if (loading) {
      element.dataset.loading = 'true';
    } else {
      delete element.dataset.loading;
    }
  }

  /**
   * Create progress indicator
   */
  createProgressIndicator(type = 'bar', options = {}) {
    const progress = document.createElement('div');
    
    if (type === 'circle') {
      progress.className = 'progress-circle';
      progress.style.setProperty('--progress', `${options.value || 0}%`);
    } else {
      progress.className = `progress-bar ${options.indeterminate ? 'progress-bar-indeterminate' : ''}`;
      progress.innerHTML = '<div class="progress-bar-fill"></div>';
      
      if (options.value !== undefined && !options.indeterminate) {
        progress.querySelector('.progress-bar-fill').style.width = `${options.value}%`;
      }
    }

    return progress;
  }

  /**
   * Update progress indicator
   */
  updateProgress(progressElement, value) {
    if (progressElement.classList.contains('progress-circle')) {
      progressElement.style.setProperty('--progress', `${value}%`);
    } else {
      const fill = progressElement.querySelector('.progress-bar-fill');
      if (fill) {
        fill.style.width = `${value}%`;
      }
    }
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      activeSkeletons: this.activeSkeletons.size,
      activeLoadingStates: this.loadingStates.size,
      totalSkeletons: Array.from(this.activeSkeletons.values()).length,
      averageSkeletonDuration: this.calculateAverageSkeletonDuration()
    };
  }

  /**
   * Calculate average skeleton duration
   */
  calculateAverageSkeletonDuration() {
    const now = Date.now();
    const durations = Array.from(this.activeSkeletons.values())
      .map(data => now - data.timestamp);
    
    return durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all active skeletons
    this.activeSkeletons.forEach((data, element) => {
      this.hideSkeleton(element);
    });

    // Clear all loading states
    this.loadingStates.forEach((data, element) => {
      if (data.type === 'form') {
        this.hideFormLoading(element);
      } else if (data.type === 'button') {
        this.hideButtonLoading(element);
      }
    });

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove styles
    const styles = document.getElementById('loading-states-styles');
    if (styles) {
      styles.remove();
    }

    console.log('⏳ LoadingStates destroyed');
  }
}

// Create global loading states instance
export const loadingStates = new LoadingStates({
  debug: process.env.NODE_ENV !== 'production'
});