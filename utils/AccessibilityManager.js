/**
 * Accessibility Manager
 * Comprehensive WCAG 2.1 AA compliance implementation
 * Handles keyboard navigation, screen readers, focus management, and more
 */
export class AccessibilityManager {
  constructor(options = {}) {
    this.options = {
      // WCAG 2.1 settings
      focusManagement: options.focusManagement !== false,
      keyboardNavigation: options.keyboardNavigation !== false,
      screenReaderSupport: options.screenReaderSupport !== false,
      colorContrastCheck: options.colorContrastCheck !== false,
      motionReduction: options.motionReduction !== false,
      textScaling: options.textScaling !== false,
      highContrastMode: options.highContrastMode !== false,
      announcements: options.announcements !== false,
      
      // Debug mode
      debug: options.debug || false,
      ...options
    };

    this.focusHistory = [];
    this.liveRegions = new Map();
    this.skipLinks = [];
    this.landmarkNavigation = [];
    this.keyboardTraps = [];
    
    // User preferences
    this.userPreferences = {
      reducedMotion: this.detectReducedMotion(),
      highContrast: this.detectHighContrast(),
      fontSize: this.getPreferredFontSize(),
      screenReader: this.detectScreenReader()
    };

    this.init();
  }

  /**
   * Initialize accessibility features
   */
  init() {
    if (this.options.debug) {
      console.log('🦾 AccessibilityManager initializing...');
    }

    // Core features
    this.setupFocusManagement();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
    this.setupSkipLinks();
    this.setupLandmarkNavigation();
    this.setupLiveRegions();
    this.setupMotionReduction();
    this.setupTextScaling();
    this.setupHighContrastMode();
    this.setupColorContrastMonitoring();

    // Event listeners
    this.setupEventListeners();
    
    // ARIA live announcements
    this.createAnnouncementRegion();

    if (this.options.debug) {
      console.log('✅ AccessibilityManager initialized');
      this.auditPageAccessibility();
    }

    // Announce to screen readers
    this.announce('Page loaded with accessibility enhancements', 'polite');
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    if (!this.options.focusManagement) return;

    // Enhanced focus indicators
    this.addGlobalFocusStyles();
    
    // Focus trap management
    this.manageFocusTraps();
    
    // Focus restoration
    this.setupFocusRestoration();
    
    // Focus visible polyfill
    this.setupFocusVisible();

    // Skip to main content functionality
    this.setupMainContentSkip();
  }

  /**
   * Add global focus styles
   */
  addGlobalFocusStyles() {
    if (document.getElementById('a11y-focus-styles')) return;

    const focusStyles = document.createElement('style');
    focusStyles.id = 'a11y-focus-styles';
    focusStyles.textContent = `
      /* Enhanced focus indicators */
      .focus-visible,
      *:focus-visible {
        outline: 3px solid #005fcc !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 5px rgba(0, 95, 204, 0.3) !important;
      }
      
      /* High contrast focus for dark mode */
      @media (prefers-color-scheme: dark) {
        .focus-visible,
        *:focus-visible {
          outline-color: #66b3ff !important;
          box-shadow: 0 0 0 5px rgba(102, 179, 255, 0.3) !important;
        }
      }
      
      /* Focus indicators for interactive elements */
      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible,
      [tabindex]:focus-visible,
      [role="button"]:focus-visible,
      [role="link"]:focus-visible {
        outline: 3px solid #005fcc !important;
        outline-offset: 2px !important;
      }
      
      /* Skip link styling */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.3s;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      /* Focus trap indicator */
      .focus-trap-active {
        position: relative;
      }
      
      .focus-trap-active::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px dashed #005fcc;
        pointer-events: none;
        z-index: 1000;
      }
    `;
    
    document.head.appendChild(focusStyles);
  }

  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    if (!this.options.keyboardNavigation) return;

    // Arrow key navigation for grids and lists
    this.setupArrowKeyNavigation();
    
    // Tab management for custom components
    this.setupTabManagement();
    
    // Escape key handling
    this.setupEscapeKeyHandling();
    
    // Custom keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Setup arrow key navigation
   */
  setupArrowKeyNavigation() {
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const role = target.getAttribute('role');
      
      // Grid navigation
      if (role === 'grid' || target.closest('[role="grid"]')) {
        this.handleGridNavigation(e);
      }
      
      // Listbox navigation
      if (role === 'listbox' || target.closest('[role="listbox"]')) {
        this.handleListboxNavigation(e);
      }
      
      // Menu navigation
      if (role === 'menu' || target.closest('[role="menu"]')) {
        this.handleMenuNavigation(e);
      }
      
      // Tab navigation
      if (role === 'tablist' || target.closest('[role="tablist"]')) {
        this.handleTabNavigation(e);
      }
    });
  }

  /**
   * Handle grid navigation
   */
  handleGridNavigation(e) {
    const grid = e.target.closest('[role="grid"]');
    if (!grid) return;

    const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
    const currentCell = e.target.closest('[role="gridcell"]');
    const currentIndex = cells.indexOf(currentCell);
    
    if (currentIndex === -1) return;

    const columns = parseInt(grid.getAttribute('aria-colcount')) || 
                   grid.querySelectorAll('[role="row"]:first-child [role="gridcell"]').length;
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, cells.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + columns, cells.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - columns, 0);
        break;
      case 'Home':
        nextIndex = currentIndex % columns === 0 ? currentIndex : 
                   currentIndex - (currentIndex % columns);
        break;
      case 'End':
        const rowEnd = currentIndex + (columns - 1 - (currentIndex % columns));
        nextIndex = Math.min(rowEnd, cells.length - 1);
        break;
      default:
        return;
    }
    
    if (nextIndex !== currentIndex) {
      e.preventDefault();
      cells[nextIndex].focus();
      this.announce(`Cell ${Math.floor(nextIndex / columns) + 1}, ${(nextIndex % columns) + 1}`, 'assertive');
    }
  }

  /**
   * Setup screen reader support
   */
  setupScreenReaderSupport() {
    if (!this.options.screenReaderSupport) return;

    // ARIA live regions
    this.setupLiveRegions();
    
    // ARIA labels and descriptions
    this.enhanceARIALabels();
    
    // Role enhancements
    this.enhanceSemanticRoles();
    
    // Screen reader only content
    this.setupScreenReaderContent();
  }

  /**
   * Setup live regions for announcements
   */
  setupLiveRegions() {
    // Polite announcements
    const politeRegion = document.createElement('div');
    politeRegion.id = 'a11y-live-polite';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    document.body.appendChild(politeRegion);
    this.liveRegions.set('polite', politeRegion);

    // Assertive announcements
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'a11y-live-assertive';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    document.body.appendChild(assertiveRegion);
    this.liveRegions.set('assertive', assertiveRegion);

    // Status region
    const statusRegion = document.createElement('div');
    statusRegion.id = 'a11y-live-status';
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.className = 'sr-only';
    document.body.appendChild(statusRegion);
    this.liveRegions.set('status', statusRegion);
  }

  /**
   * Create announcement region
   */
  createAnnouncementRegion() {
    if (document.getElementById('a11y-announcements')) return;

    const region = document.createElement('div');
    region.id = 'a11y-announcements';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'false');
    region.className = 'sr-only';
    document.body.appendChild(region);
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    if (!this.options.announcements) return;

    const region = this.liveRegions.get(priority);
    if (region) {
      // Clear and set new message
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 10);

      if (this.options.debug) {
        console.log(`📢 Announced (${priority}): ${message}`);
      }
    }
  }

  /**
   * Setup skip links
   */
  setupSkipLinks() {
    if (document.querySelector('.skip-link')) return;

    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.getElementById('main-content') || 
                   document.querySelector('main') ||
                   document.querySelector('[role="main"]');
      if (main) {
        main.focus();
        main.scrollIntoView();
      }
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Setup main content skip functionality
   */
  setupMainContentSkip() {
    const main = document.getElementById('main-content') || 
                 document.querySelector('main') ||
                 document.querySelector('[role="main"]');
                 
    if (main && !main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
    }
  }

  /**
   * Setup motion reduction
   */
  setupMotionReduction() {
    if (!this.options.motionReduction) return;

    if (this.userPreferences.reducedMotion) {
      this.applyReducedMotion();
    }

    // Listen for preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addListener((e) => {
      this.userPreferences.reducedMotion = e.matches;
      if (e.matches) {
        this.applyReducedMotion();
      } else {
        this.removeReducedMotion();
      }
    });
  }

  /**
   * Apply reduced motion styles
   */
  applyReducedMotion() {
    if (document.getElementById('a11y-reduced-motion')) return;

    const style = document.createElement('style');
    style.id = 'a11y-reduced-motion';
    style.textContent = `
      /* Reduced motion styles */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
      
      /* Allow essential animations */
      .a11y-motion-essential {
        animation-duration: initial !important;
        transition-duration: initial !important;
      }
    `;
    
    document.head.appendChild(style);
    document.body.classList.add('reduced-motion');
  }

  /**
   * Setup text scaling
   */
  setupTextScaling() {
    if (!this.options.textScaling) return;

    // Ensure text scales up to 200% without horizontal scrolling
    this.ensureTextScaling();
    
    // Add zoom controls
    this.addZoomControls();
  }

  /**
   * Ensure proper text scaling
   */
  ensureTextScaling() {
    const style = document.createElement('style');
    style.id = 'a11y-text-scaling';
    style.textContent = `
      /* Text scaling support */
      html {
        font-size: 16px; /* Base font size */
      }
      
      @media (min-width: 320px) {
        html {
          font-size: calc(16px + 0.5vw);
        }
      }
      
      @media (min-width: 1200px) {
        html {
          font-size: 18px;
        }
      }
      
      /* Ensure text can scale to 200% */
      body {
        line-height: 1.5;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      /* Prevent text from being too small */
      small, .small {
        font-size: max(0.875em, 14px);
      }
      
      /* Ensure interactive elements are large enough */
      button, input, select, textarea, a {
        min-height: 44px;
        min-width: 44px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup high contrast mode
   */
  setupHighContrastMode() {
    if (!this.options.highContrastMode) return;

    if (this.userPreferences.highContrast) {
      this.applyHighContrastMode();
    }

    // Listen for high contrast preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addListener((e) => {
      this.userPreferences.highContrast = e.matches;
      if (e.matches) {
        this.applyHighContrastMode();
      } else {
        this.removeHighContrastMode();
      }
    });
  }

  /**
   * Apply high contrast mode
   */
  applyHighContrastMode() {
    if (document.getElementById('a11y-high-contrast')) return;

    const style = document.createElement('style');
    style.id = 'a11y-high-contrast';
    style.textContent = `
      /* High contrast mode */
      @media (prefers-contrast: high) {
        * {
          background-color: white !important;
          color: black !important;
          border-color: black !important;
        }
        
        a, button, [role="button"] {
          background-color: black !important;
          color: white !important;
          text-decoration: underline !important;
        }
        
        input, textarea, select {
          background-color: white !important;
          color: black !important;
          border: 2px solid black !important;
        }
        
        :focus, :focus-visible {
          outline: 3px solid black !important;
          background-color: yellow !important;
          color: black !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.classList.add('high-contrast');
  }

  /**
   * Setup color contrast monitoring
   */
  setupColorContrastMonitoring() {
    if (!this.options.colorContrastCheck || !this.options.debug) return;

    // Check contrast ratios in development
    setTimeout(() => {
      this.auditColorContrast();
    }, 1000);
  }

  /**
   * Audit color contrast
   */
  auditColorContrast() {
    const elements = document.querySelectorAll('*');
    const issues = [];

    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const ratio = this.calculateContrastRatio(color, backgroundColor);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
        const requiredRatio = isLargeText ? 3 : 4.5;
        
        if (ratio < requiredRatio) {
          issues.push({
            element,
            ratio: ratio.toFixed(2),
            required: requiredRatio,
            color,
            backgroundColor
          });
        }
      }
    });

    if (issues.length > 0) {
      console.warn('🎨 Color contrast issues found:', issues);
    }
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrastRatio(color1, color2) {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Parse color string to RGB
   */
  parseColor(colorStr) {
    const div = document.createElement('div');
    div.style.color = colorStr;
    document.body.appendChild(div);
    const color = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  /**
   * Get luminance of RGB color
   */
  getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Focus tracking
    document.addEventListener('focusin', (e) => {
      this.focusHistory.push(e.target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleGlobalKeyboardShortcuts(e);
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.announce('Page is now visible', 'polite');
      }
    });
  }

  /**
   * Handle global keyboard shortcuts
   */
  handleGlobalKeyboardShortcuts(e) {
    // Alt + 1: Skip to main content
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      const main = document.querySelector('main, [role="main"], #main-content');
      if (main) {
        main.focus();
        this.announce('Skipped to main content', 'assertive');
      }
    }

    // Alt + 2: Skip to navigation
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      const nav = document.querySelector('nav, [role="navigation"]');
      if (nav) {
        const firstLink = nav.querySelector('a, button, [tabindex="0"]');
        if (firstLink) {
          firstLink.focus();
          this.announce('Skipped to navigation', 'assertive');
        }
      }
    }

    // Escape key handling
    if (e.key === 'Escape') {
      this.handleEscapeKey(e);
    }
  }

  /**
   * Handle escape key
   */
  handleEscapeKey(e) {
    // Close modals
    const modal = document.querySelector('.modal.active, [role="dialog"][aria-hidden="false"]');
    if (modal) {
      const closeButton = modal.querySelector('.modal-close, [aria-label*="close"]');
      if (closeButton) {
        closeButton.click();
        return;
      }
    }

    // Close dropdowns
    const dropdown = document.querySelector('.dropdown.open, [aria-expanded="true"]');
    if (dropdown) {
      dropdown.setAttribute('aria-expanded', 'false');
      dropdown.classList.remove('open');
      
      // Focus the trigger
      const trigger = document.querySelector(`[aria-controls="${dropdown.id}"]`);
      if (trigger) {
        trigger.focus();
      }
    }
  }

  /**
   * Detect user preferences
   */
  detectReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  detectHighContrast() {
    return window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(-ms-high-contrast: active)').matches;
  }

  detectScreenReader() {
    return window.navigator.userAgent.includes('NVDA') ||
           window.navigator.userAgent.includes('JAWS') ||
           window.speechSynthesis;
  }

  getPreferredFontSize() {
    return parseInt(window.getComputedStyle(document.documentElement).fontSize);
  }

  /**
   * Audit page accessibility
   */
  auditPageAccessibility() {
    const issues = [];

    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }

    // Check for missing form labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const unlabeledInputs = Array.from(inputs).filter(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      return !label && input.type !== 'hidden' && input.type !== 'submit';
    });
    if (unlabeledInputs.length > 0) {
      issues.push(`${unlabeledInputs.length} form inputs missing labels`);
    }

    // Check for missing headings hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('No headings found on page');
    }

    // Check for missing main content
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      issues.push('No main content landmark found');
    }

    if (issues.length > 0) {
      console.warn('♿ Accessibility issues found:', issues);
    } else {
      console.log('✅ No major accessibility issues detected');
    }
  }

  /**
   * Focus management methods
   */
  trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', trapHandler);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', trapHandler);
    };
  }

  restoreFocus() {
    if (this.focusHistory.length > 0) {
      const lastFocused = this.focusHistory[this.focusHistory.length - 2];
      if (lastFocused && lastFocused.focus) {
        lastFocused.focus();
      }
    }
  }

  /**
   * Screen reader utilities
   */
  setARIALabel(element, label) {
    element.setAttribute('aria-label', label);
  }

  setARIADescription(element, description) {
    const descriptionId = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const descElement = document.createElement('div');
    descElement.id = descriptionId;
    descElement.className = 'sr-only';
    descElement.textContent = description;
    
    document.body.appendChild(descElement);
    element.setAttribute('aria-describedby', descriptionId);
  }

  /**
   * Update live region content
   */
  updateLiveRegion(type, content) {
    const region = this.liveRegions.get(type);
    if (region) {
      region.textContent = content;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove live regions
    this.liveRegions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.liveRegions.clear();

    // Remove styles
    const styles = document.querySelectorAll('#a11y-focus-styles, #a11y-reduced-motion, #a11y-high-contrast, #a11y-text-scaling');
    styles.forEach(style => style.remove());

    // Clear references
    this.focusHistory = [];
    this.keyboardTraps = [];
    this.skipLinks = [];

    console.log('♿ AccessibilityManager destroyed');
  }
}

// Create global accessibility manager instance
export const accessibilityManager = new AccessibilityManager({
  debug: process.env.NODE_ENV !== 'production'
});