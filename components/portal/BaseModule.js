import { cacheManager } from '../../utils/CacheManager.js';

/**
 * Base module class for portal components
 * Provides common functionality and lifecycle management
 */
export class BaseModule {
  constructor(portal, name) {
    this.portal = portal;
    this.name = name;
    this.initialized = false;
    this.eventListeners = [];
    this.element = null;
    this.cacheNamespace = `portal_${name.toLowerCase()}`;
  }

  /**
   * Initialize the module
   * Override in subclasses
   */
  async init() {
    if (this.initialized) {
      console.warn(`Module ${this.name} already initialized`);
      return;
    }

    console.log(`BaseModule.init called for ${this.name}`);
    try {
      await this.beforeInit();
      console.log(`${this.name}: beforeInit complete`);
      
      await this.doInit();
      console.log(`${this.name}: doInit complete`);
      
      await this.afterInit();
      console.log(`${this.name}: afterInit complete`);
      
      this.initialized = true;
      console.log(`Module ${this.name} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Called before initialization
   * Override for setup tasks
   */
  async beforeInit() {
    // Override in subclasses
  }

  /**
   * Main initialization logic
   * Override in subclasses
   */
  async doInit() {
    // Override in subclasses
  }

  /**
   * Called after initialization
   * Override for cleanup tasks
   */
  async afterInit() {
    // Override in subclasses
  }

  /**
   * Called when the module's section becomes active
   * Override to refresh data or update UI
   */
  async activate() {
    // Override in subclasses to refresh content
    console.log(`${this.name} activated`);
  }

  /**
   * Destroy the module and cleanup resources
   */
  destroy() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Clear cache
    this.clearCache();

    // Remove DOM references
    this.element = null;

    this.initialized = false;
    console.log(`Module ${this.name} destroyed`);
  }

  /**
   * Add event listener with automatic cleanup tracking
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * Get data from cache or fetch if not available
   */
  async getCachedData(key, fetchFunction, ttl = 300000) { // 5 minutes default TTL
    return cacheManager.getOrSet(key, fetchFunction, {
      ttl,
      namespace: this.cacheNamespace,
      storage: 'memory'
    });
  }

  /**
   * Clear specific cache entry
   */
  async clearCache(key) {
    if (key) {
      await cacheManager.delete(key, { namespace: this.cacheNamespace });
    } else {
      await cacheManager.clear({ namespace: this.cacheNamespace });
    }
  }

  /**
   * Show loading state
   */
  showLoading(element = this.element) {
    if (!element) return;
    
    element.classList.add('loading');
    const loadingSpinner = element.querySelector('.loading-spinner');
    if (!loadingSpinner) {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.innerHTML = '<div class="spinner"></div>';
      element.appendChild(spinner);
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(element = this.element) {
    if (!element) return;
    
    element.classList.remove('loading');
    const loadingSpinner = element.querySelector('.loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.remove();
    }
  }

  /**
   * Show error message
   */
  showError(message, element = this.element) {
    if (!element) {
      console.error(`[${this.name}] ${message}`);
      return;
    }

    this.hideLoading(element);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.innerHTML = `
      <div class="error-content">
        <i class="error-icon">[!]</i>
        <span class="error-text">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    element.appendChild(errorElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement.parentElement) {
        errorElement.remove();
      }
    }, 5000);
  }

  /**
   * Show success message
   */
  showSuccess(message, element = this.element) {
    if (!element) {
      console.log(`[${this.name}] ${message}`);
      return;
    }

    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.innerHTML = `
      <div class="success-content">
        <i class="success-icon">[OK]</i>
        <span class="success-text">${message}</span>
        <button class="success-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    element.appendChild(successElement);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successElement.parentElement) {
        successElement.remove();
      }
    }, 3000);
  }

  /**
   * Debounce function calls
   */
  debounce(func, wait = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Format date for display
   */
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(url, options = {}) {
    const token = this.portal.authToken;
    console.log(`apiRequest to ${url}, token available:`, !!token);
    if (!token) {
      throw new Error('No authentication token available');
    }

    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    const response = await fetch(url, finalOptions);
    
    if (response.status === 401) {
      // Token expired, try to refresh
      await this.portal.refreshAccessToken();
      // Retry with new token
      const newToken = this.portal.authToken;
      finalOptions.headers.Authorization = `Bearer ${newToken}`;
      return fetch(url, finalOptions);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}