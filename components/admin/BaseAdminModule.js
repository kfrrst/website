import { cacheManager } from '../../utils/CacheManager.js';

/**
 * Base Admin Module
 * Provides common functionality for all admin portal modules
 */
export class BaseAdminModule {
  constructor(admin, name) {
    this.admin = admin;
    this.name = name;
    this.initialized = false;
    this.eventListeners = [];
    this.refreshInterval = null;
    this.cacheNamespace = `admin_${name.toLowerCase()}`;
  }

  /**
   * Initialize the module
   */
  async init() {
    if (this.initialized) return;
    
    console.log(`🔧 Initializing ${this.name}...`);
    
    try {
      await this.doInit();
      this.initialized = true;
      console.log(`✅ ${this.name} initialized`);
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Override this method in child classes
   */
  async doInit() {
    // Override in child classes
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.admin.token) {
      console.error('No admin token available for API request');
      throw new Error('Authentication required');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.admin.token}`,
        ...options.headers
      },
      ...options
    };

    console.log(`🔐 API Request: ${endpoint} with token: ${this.admin.token?.substring(0, 20)}...`);

    try {
      const response = await fetch(`${this.admin.apiUrl}${endpoint}`, config);
      
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.admin.refreshToken();
        config.headers.Authorization = `Bearer ${this.admin.token}`;
        return fetch(`${this.admin.apiUrl}${endpoint}`, config);
      }
      
      return response;
      
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get cached data or fetch fresh data
   */
  async getCachedData(key, fetchFunction, ttl = 60000) {
    return cacheManager.getOrSet(key, fetchFunction, {
      ttl,
      namespace: this.cacheNamespace,
      storage: 'memory'
    });
  }

  /**
   * Clear cache for specific key or all cache
   */
  async clearCache(key = null) {
    if (key) {
      await cacheManager.delete(key, { namespace: this.cacheNamespace });
    } else {
      await cacheManager.clear({ namespace: this.cacheNamespace });
    }
  }

  /**
   * Add event listener and track it for cleanup
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  /**
   * Format date
   */
  formatDate(date, options = {}) {
    if (!date) return 'N/A';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(d);
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  /**
   * Show loading state
   */
  showLoading(element = null) {
    const target = element || this.element;
    if (target) {
      target.classList.add('loading');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(element = null) {
    const target = element || this.element;
    if (target) {
      target.classList.remove('loading');
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.admin.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.admin.showNotification(message, 'error');
  }

  /**
   * Show info message
   */
  showInfo(message) {
    this.admin.showNotification(message, 'info');
  }

  /**
   * Setup auto-refresh
   */
  setupAutoRefresh(interval = 30000) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      // Only refresh if we have a valid token and the page is visible
      if (document.visibilityState === 'visible' && this.admin && this.admin.token) {
        this.refresh();
      }
    }, interval);
  }

  /**
   * Override this method to implement refresh functionality
   */
  async refresh() {
    // Override in child classes
  }

  /**
   * Pause updates (when tab is hidden)
   */
  pause() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Resume updates (when tab becomes visible)
   */
  resume() {
    this.setupAutoRefresh();
  }

  /**
   * Handle connection restore
   */
  handleConnectionRestore() {
    this.clearCache();
    this.refresh();
  }

  /**
   * Handle connection loss
   */
  handleConnectionLoss() {
    // Override in child classes if needed
  }

  /**
   * Setup socket events for this module
   */
  setupSocketEvents(socket) {
    // Override in child classes
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];
    
    // Clear cache
    this.clearCache();
    
    console.log(`🧹 ${this.name} cleaned up`);
  }

  /**
   * Destroy the module completely
   */
  destroy() {
    this.cleanup();
    this.initialized = false;
  }
}