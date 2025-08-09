import { BaseAdminModule } from './BaseAdminModule.js';
import { AdminAuthModule } from './AdminAuthModule.js';
import { AdminDashboardModule } from './AdminDashboardModule.js';
import { AdminClientsModule } from './AdminClientsModule.js';
import { AdminProjectsModule } from './AdminProjectsModule.js';
import { AdminInvoicesModule } from './AdminInvoicesModule.js';
import { AdminFilesModule } from './AdminFilesModule.js';
import { AdminMessagesModule } from './AdminMessagesModule.js';
import { AdminReportsModule } from './AdminReportsModule.js';
import { AdminSettingsModule } from './AdminSettingsModule.js';
import ServiceManagementModule from './ServiceManagementModule.js';

/**
 * Main Admin Portal class - coordinates all admin modules
 * Replaces the monolithic admin.js with a modular architecture
 */
export class AdminPortal {
  constructor() {
    this.modules = {};
    this.currentSection = 'overview';
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.socket = null;
    this.initialized = false;
    this.apiUrl = '/api';
    this.performanceMetrics = new Map();

    // Enhanced debugging
    console.log('=== AdminPortal Constructor START ===');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', window.location.href);

    // Try to get tokens from storage
    this.loadTokensFromStorage();
  }

  /**
   * Load tokens from various storage sources
   */
  loadTokensFromStorage() {
    // Try multiple sources with fallback names
    this.token = localStorage.getItem('adminToken') || 
                 localStorage.getItem('admin_session') || 
                 sessionStorage.getItem('adminToken') ||
                 sessionStorage.getItem('admin_session');
                 
    this.refreshToken = localStorage.getItem('adminRefreshToken') || 
                        localStorage.getItem('admin_refresh') ||
                        sessionStorage.getItem('adminRefreshToken') ||
                        sessionStorage.getItem('admin_refresh');

    // Try encoded session data
    if (!this.token) {
      const encodedSession = localStorage.getItem('adminSessionData');
      if (encodedSession) {
        try {
          const sessionData = JSON.parse(atob(encodedSession));
          if (sessionData.e > Date.now()) {
            this.token = sessionData.t;
            this.refreshToken = sessionData.r;
            this.currentUser = sessionData.u;
            console.log('Restored session from encoded data');
          } else {
            console.log('Encoded session expired');
            localStorage.removeItem('adminSessionData');
          }
        } catch (e) {
          console.error('Failed to decode session data:', e);
        }
      }
    }

    // Cookie fallback
    if (!this.token) {
      const tokenCookie = document.cookie.split('; ').find(row => row.startsWith('adminToken='));
      if (tokenCookie) {
        this.token = tokenCookie.split('=')[1];
      }
    }

    console.log('Token retrieved:', this.token ? 'YES' : 'NO');
    console.log('RefreshToken retrieved:', this.refreshToken ? 'YES' : 'NO');

    // Setup storage event listeners
    this.setupStorageEventListeners();
  }

  /**
   * Setup storage event listeners
   */
  setupStorageEventListeners() {
    window.addEventListener('beforeunload', (e) => {
      console.log('=== BEFOREUNLOAD EVENT ===');
      console.log('Tokens still in localStorage?', {
        adminToken: localStorage.getItem('adminToken') ? 'YES' : 'NO',
        adminRefreshToken: localStorage.getItem('adminRefreshToken') ? 'YES' : 'NO'
      });
    });

    window.addEventListener('storage', (e) => {
      console.log('=== STORAGE EVENT ===', {
        key: e.key,
        oldValue: e.oldValue ? 'had value' : 'null',
        newValue: e.newValue ? 'has value' : 'null',
        url: e.url
      });
    });
  }

  /**
   * Initialize the admin portal
   */
  async init() {
    if (this.initialized) {
      console.log('Already initialized, skipping...');
      return;
    }

    this.initialized = true;
    console.log('🚀 AdminPortal initialization starting...');
    const startTime = performance.now();

    try {
      // Initialize modules in dependency order
      await this.initializeModules();
      
      // Setup global event handlers
      this.setupGlobalEvents();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      const initTime = performance.now() - startTime;
      console.log(`AdminPortal initialization completed in ${Math.round(initTime)}ms`);
      
    } catch (error) {
      console.error('❌ AdminPortal initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize all admin modules
   */
  async initializeModules() {
    // Only initialize auth module on initial load
    const authOnly = !this.token;
    
    const moduleConfigs = [
      // Core modules first
      { name: 'auth', module: AdminAuthModule, critical: true, alwaysInit: true },
      
      // Feature modules (only init after authentication)
      { name: 'dashboard', module: AdminDashboardModule, critical: false, alwaysInit: false },
      { name: 'clients', module: AdminClientsModule, critical: false, alwaysInit: false },
      { name: 'serviceManager', module: ServiceManagementModule, critical: false, alwaysInit: false }
      // More modules will be added here as we break down admin.js further
    ];

    for (const config of moduleConfigs) {
      // Skip non-auth modules if not authenticated
      if (authOnly && !config.alwaysInit) {
        continue;
      }
      try {
        const startTime = performance.now();
        
        console.log(`Initializing ${config.name} module...`);
        
        // Create module instance
        this.modules[config.name] = new config.module(this);
        
        // Initialize module with timeout
        const initPromise = this.modules[config.name].init();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Module initialization timeout`)), 5000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        
        const initTime = performance.now() - startTime;
        this.performanceMetrics.set(`${config.name}_init`, initTime);
        
        console.log(`${config.name} module initialized in ${Math.round(initTime)}ms`);
        
      } catch (error) {
        console.error(`❌ ${config.name} module initialization failed:`, error);
        
        if (config.critical) {
          throw new Error(`Critical module ${config.name} failed to initialize: ${error.message}`);
        } else {
          console.warn(`Non-critical module ${config.name} will be unavailable`);
          this.modules[config.name] = null;
        }
      }
    }
  }

  /**
   * Initialize dashboard after authentication
   */
  async initializeDashboard() {
    console.log('🎯 initializeDashboard called');
    try {
      // Hide login section and show dashboard
      const loginSection = document.getElementById('login-section');
      const adminDashboard = document.getElementById('admin-dashboard');
      
      console.log('Login section found:', !!loginSection);
      console.log('Admin dashboard found:', !!adminDashboard);
      
      if (loginSection) {
        console.log('Hiding login section');
        loginSection.style.display = 'none';
      }
      
      if (adminDashboard) {
        console.log('Showing admin dashboard');
        adminDashboard.classList.remove('hidden');
        adminDashboard.style.display = 'block';
      }
      
      // Initialize socket connection for real-time features
      await this.initializeSocket();
      
      // Load initial dashboard data
      if (this.modules.dashboard) {
        await this.modules.dashboard.refresh();
      }
      
      // Setup navigation - start with overview section
      await this.showSection('overview', false);
      
      console.log('Admin dashboard initialized successfully');
      
    } catch (error) {
      console.error('❌ Admin dashboard initialization failed:', error);
    }
  }

  /**
   * Initialize modules that require authentication
   */
  async initializeAuthenticatedModules() {
    console.log('Initializing authenticated modules...');
    
    const authenticatedModules = [
      { name: 'dashboard', module: AdminDashboardModule, critical: false },
      { name: 'clients', module: AdminClientsModule, critical: false },
      { name: 'projects', module: AdminProjectsModule, critical: false },
      { name: 'invoices', module: AdminInvoicesModule, critical: false },
      { name: 'files', module: AdminFilesModule, critical: false },
      { name: 'messages', module: AdminMessagesModule, critical: false },
      { name: 'reports', module: AdminReportsModule, critical: false },
      { name: 'settings', module: AdminSettingsModule, critical: false },
      { name: 'serviceManager', module: ServiceManagementModule, critical: false },
      { name: 'phaseRequirements', module: window.AdminPhaseRequirementsModule, critical: false }
    ];
    
    for (const config of authenticatedModules) {
      if (this.modules[config.name]) {
        // Module already initialized, skip
        continue;
      }
      
      try {
        const startTime = performance.now();
        
        console.log(`Initializing ${config.name} module...`);
        
        // Create module instance
        this.modules[config.name] = new config.module(this);
        
        // Initialize module with timeout
        const initPromise = this.modules[config.name].init();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Module initialization timeout`)), 5000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        
        const initTime = performance.now() - startTime;
        this.performanceMetrics.set(`${config.name}_init`, initTime);
        
        console.log(`${config.name} module initialized in ${Math.round(initTime)}ms`);
        
      } catch (error) {
        console.error(`❌ ${config.name} module initialization failed:`, error);
        
        if (config.critical) {
          throw new Error(`Critical module ${config.name} failed to initialize: ${error.message}`);
        } else {
          console.warn(`Non-critical module ${config.name} will be unavailable`);
          this.modules[config.name] = null;
        }
      }
    }
  }

  /**
   * Initialize WebSocket connection
   */
  async initializeSocket() {
    if (this.socket && this.socket.connected) {
      return; // Already connected
    }

    try {
      if (typeof io !== 'undefined') {
        this.socket = io({
          auth: {
            token: this.token,
            type: 'admin'
          },
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          console.log('Admin socket connected');
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Admin socket disconnected');
        });

        this.socket.on('error', (error) => {
          console.error('Admin socket error:', error);
        });

        // Let modules register their socket event handlers
        Object.values(this.modules).forEach(module => {
          if (module && typeof module.setupSocketEvents === 'function') {
            module.setupSocketEvents(this.socket);
          }
        });
      }
    } catch (error) {
      console.error('Admin socket initialization failed:', error);
    }
  }

  /**
   * Setup global event handlers
   */
  setupGlobalEvents() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.section) {
        this.showSection(event.state.section, false);
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K for quick search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.showQuickSearch();
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        this.closeActiveModal();
      }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Admin connection restored');
      this.handleConnectionRestore();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Admin connection lost');
      this.handleConnectionLoss();
    });

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleTabHidden();
      } else {
        this.handleTabVisible();
      }
    });

    // Setup navigation clicks
    this.setupNavigationHandlers();
  }

  /**
   * Setup navigation handlers
   */
  setupNavigationHandlers() {
    // Handle nav links in admin header
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('.nav-link');
      if (navLink) {
        e.preventDefault();
        const href = navLink.getAttribute('href');
        if (href && href.startsWith('#')) {
          const section = href.substring(1);
          this.showSection(section);
        }
      }
      
      // Also handle data-section attributes
      const dataLink = e.target.closest('[data-section]');
      if (dataLink) {
        e.preventDefault();
        const section = dataLink.dataset.section;
        this.showSection(section);
      }
    });
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor navigation performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log(`Admin page load time: ${Math.round(entry.loadEventEnd - entry.fetchStart)}ms`);
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Performance monitoring not available');
      }
    }
  }

  /**
   * Show a specific section of the admin portal
   */
  async showSection(sectionName, pushHistory = true) {
    try {
      const startTime = performance.now();
      
      // Hide current section
      this.hideAllSections();
      
      // Show target section
      const sectionElement = document.getElementById(sectionName);
      if (!sectionElement) {
        throw new Error(`Section ${sectionName} not found`);
      }
      
      sectionElement.classList.add('active');
      sectionElement.classList.remove('hidden');
      this.currentSection = sectionName;
      
      // Update navigation
      this.updateActiveSection(sectionName);
      
      // Initialize section module if needed
      const module = this.modules[sectionName];
      if (module && typeof module.refresh === 'function') {
        await module.refresh();
      }
      
      // Update browser history
      if (pushHistory) {
        history.pushState(
          { section: sectionName }, 
          `${sectionName} - Admin Portal`, 
          `#${sectionName}`
        );
      }
      
      const renderTime = performance.now() - startTime;
      this.performanceMetrics.set(`${sectionName}_switch`, renderTime);
      
      console.log(`Admin section ${sectionName} rendered in ${Math.round(renderTime)}ms`);
      
    } catch (error) {
      console.error(`Failed to show admin section ${sectionName}:`, error);
      // Fallback to overview
      if (sectionName !== 'overview') {
        this.showSection('overview');
      }
    }
  }

  /**
   * Hide all sections
   */
  hideAllSections() {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
      section.classList.remove('active');
      section.classList.add('hidden');
    });
  }

  /**
   * Update active navigation section
   */
  updateActiveSection(sectionName) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to current section - try both href and data-section
    const activeNavItem = document.querySelector(`.nav-link[href="#${sectionName}"]`) || 
                         document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }
  }

  /**
   * Show quick search modal
   */
  showQuickSearch() {
    console.log('Quick search triggered');
    // Implementation would show a search modal
  }

  /**
   * Close active modal
   */
  closeActiveModal() {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      activeModal.classList.remove('active');
    }
  }

  /**
   * Handle connection restore
   */
  handleConnectionRestore() {
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.handleConnectionRestore === 'function') {
        module.handleConnectionRestore();
      }
    });
    
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * Handle connection loss
   */
  handleConnectionLoss() {
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.handleConnectionLoss === 'function') {
        module.handleConnectionLoss();
      }
    });
  }

  /**
   * Handle tab being hidden
   */
  handleTabHidden() {
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.pause === 'function') {
        module.pause();
      }
    });
  }

  /**
   * Handle tab becoming visible
   */
  handleTabVisible() {
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.resume === 'function') {
        module.resume();
      }
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('admin-notification-container') || this.createNotificationContainer();
    
    const notificationEl = document.createElement('div');
    notificationEl.className = `admin-notification ${type}`;
    notificationEl.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${this.getNotificationIcon(type)}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
      </div>
    `;

    container.appendChild(notificationEl);

    // Auto-remove after delay
    setTimeout(() => {
      if (notificationEl.parentElement) {
        notificationEl.remove();
      }
    }, type === 'error' ? 8000 : 4000);
  }

  /**
   * Create notification container
   */
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'admin-notification-container';
    container.className = 'admin-notification-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(type) {
    const icons = {
      'success': '',
      'error': '',
      'warning': '',
      'info': 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    document.body.innerHTML = `
      <div class="admin-error-screen">
        <div class="error-content">
          <h1>Admin Portal Error</h1>
          <p>Failed to initialize the admin portal. Please try refreshing the page.</p>
          <div class="error-details">
            <strong>Error:</strong> ${error.message}
          </div>
          <div class="error-actions">
            <button onclick="window.location.reload()" class="btn-primary">
              Refresh Page
            </button>
            <button onclick="window.location.href='/admin.html'" class="btn-secondary">
              Return to Login
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }

  /**
   * Refresh token (delegated to auth module)
   */
  async refreshToken() {
    if (this.modules.auth && typeof this.modules.auth.refreshToken === 'function') {
      return this.modules.auth.refreshToken();
    }
  }

  /**
   * Show email templates manager
   */
  showEmailTemplates() {
    document.getElementById('settings').style.display = 'none';
    document.getElementById('email-templates').style.display = 'block';
    // The email templates functionality is handled by the legacy admin.js
  }

  /**
   * Show service management interface
   */
  showServiceManager() {
    document.getElementById('settings').style.display = 'none';
    document.getElementById('service-manager').style.display = 'block';
    
    if (this.modules.serviceManager) {
      this.modules.serviceManager.switchTab('services');
    }
  }

  /**
   * Show service type modal
   */
  showServiceTypeModal() {
    if (this.modules.serviceManager) {
      this.modules.serviceManager.showServiceTypeModal();
    }
  }

  /**
   * Show phase modal
   */
  showPhaseModal() {
    if (this.modules.serviceManager) {
      this.modules.serviceManager.showPhaseModal();
    }
  }

  /**
   * Show form module modal
   */
  showFormModuleModal() {
    if (this.modules.serviceManager) {
      this.modules.serviceManager.showFormModuleModal();
    }
  }

  /**
   * Show document template modal
   */
  showDocumentTemplateModal() {
    if (this.modules.serviceManager) {
      this.modules.serviceManager.showDocumentTemplateModal();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Destroy all modules
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear references
    this.modules = {};
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.initialized = false;
    
    console.log('AdminPortal destroyed');
  }
  
  /**
   * Alias for cleanup (for compatibility)
   */
  destroy() {
    this.cleanup();
  }
}