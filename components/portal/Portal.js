import { AuthModule } from './AuthModule.js';
import { DashboardModule } from './DashboardModule.js';
import { NavigationModule } from './NavigationModule.js';
import { MessagingModule } from './MessagingModule.js';
import { FilesModule } from './FilesModule.js';
import { ProjectsModule } from './ProjectsModule.js';
import { InvoicesModule } from './InvoicesModule.js';
import { DocumentGenerationModule } from './DocumentGenerationModule.js';
import { updateUserDisplay } from './updateUserDisplay.js';

/**
 * Main Portal class that manages all modules
 * Provides a modular, maintainable architecture for the client portal
 */
export class ClientPortal {
  constructor() {
    this.modules = {};
    this.currentSection = 'dashboard';
    this.authToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.socket = null;
    this.initialized = false;
    
    // Performance monitoring
    this.performanceMetrics = {
      initStart: performance.now(),
      moduleInitTimes: {},
      lastRender: null
    };
  }

  /**
   * Initialize the portal and all modules
   */
  async init() {
    if (this.initialized) {
      console.warn('Portal already initialized');
      return;
    }

    try {
      console.log('Portal initialization starting...');

      // Initialize modules in dependency order
      await this.initializeModules();
      
      // Setup global event handlers
      this.setupGlobalEvents();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      this.initialized = true;
      
      const initTime = performance.now() - this.performanceMetrics.initStart;
      console.log(`Portal initialization completed in ${Math.round(initTime)}ms`);
      
    } catch (error) {
      console.error('Portal initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize all portal modules
   */
  async initializeModules() {
    // Only initialize core modules initially
    const coreModules = [
      { name: 'auth', module: AuthModule, critical: true },
      { name: 'navigation', module: NavigationModule, critical: true }
    ];
    
    // Dashboard modules to initialize after authentication
    this.dashboardModules = [
      { name: 'dashboard', module: DashboardModule, critical: false },
      { name: 'messaging', module: MessagingModule, critical: false },
      { name: 'files', module: FilesModule, critical: false },
      { name: 'projects', module: ProjectsModule, critical: false },
      { name: 'invoices', module: InvoicesModule, critical: false },
      { name: 'documentModule', module: DocumentGenerationModule, critical: false }
    ];

    // Initialize only core modules
    const moduleConfigs = coreModules;

    for (const config of moduleConfigs) {
      try {
        const startTime = performance.now();
        
        console.log(`Initializing ${config.name} module...`);
        
        // Create module instance
        this.modules[config.name] = new config.module(this);
        
        // Initialize module
        await this.modules[config.name].init();
        
        const initTime = performance.now() - startTime;
        this.performanceMetrics.moduleInitTimes[config.name] = initTime;
        
        console.log(`${config.name} module initialized in ${Math.round(initTime)}ms`);
        
      } catch (error) {
        console.error(`${config.name} module initialization failed:`, error);
        
        if (config.critical) {
          throw new Error(`Critical module ${config.name} failed to initialize: ${error.message}`);
        } else {
          // Non-critical modules can fail without stopping the portal
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
    try {
      console.log('Initializing dashboard modules...');
      
      // Update user display in header
      updateUserDisplay(this.currentUser);
      
      // Initialize dashboard modules that require authentication
      console.log('Dashboard modules to initialize:', this.dashboardModules.length);
      for (const config of this.dashboardModules) {
        try {
          const startTime = performance.now();
          
          console.log(`Initializing ${config.name} module...`);
          
          // Create module instance if not already created
          if (!this.modules[config.name]) {
            console.log(`Creating instance of ${config.name}`);
            this.modules[config.name] = new config.module(this);
            
            // Initialize module
            console.log(`Calling init() for ${config.name}`);
            await this.modules[config.name].init();
            
            const initTime = performance.now() - startTime;
            this.performanceMetrics.moduleInitTimes[config.name] = initTime;
            
            console.log(`${config.name} module initialized in ${Math.round(initTime)}ms`);
          } else {
            console.log(`${config.name} module already exists`);
          }
        } catch (error) {
          console.error(`${config.name} module initialization failed:`, error);
          if (!config.critical) {
            // Non-critical modules can fail without stopping the dashboard
            console.warn(`Non-critical module ${config.name} will be unavailable`);
            this.modules[config.name] = null;
          }
        }
      }
      
      // Initialize socket connection for real-time features
      await this.initializeSocket();
      
      // Setup navigation
      if (this.modules.navigation) {
        this.modules.navigation.updateActiveSection('dashboard');
      }
      
      console.log('Dashboard initialized successfully');
      
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      // Dashboard failure shouldn't prevent login
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
      // Import socket.io client
      if (typeof io !== 'undefined') {
        this.socket = io({
          auth: {
            token: this.authToken
          },
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        // Let modules register their socket event handlers
        Object.values(this.modules).forEach(module => {
          if (module && typeof module.setupSocketEvents === 'function') {
            module.setupSocketEvents(this.socket);
          }
        });
      }
    } catch (error) {
      console.error('Socket initialization failed:', error);
      // Socket failure shouldn't prevent portal functionality
    }
  }

  /**
   * Setup global event handlers
   */
  setupGlobalEvents() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.section) {
        this.showSection(event.state.section, false); // Don't push to history again
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
      console.log('Connection restored');
      this.handleConnectionRestore();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost');
      this.handleConnectionLoss();
    });

    // Handle tab visibility changes (pause/resume updates)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleTabHidden();
      } else {
        this.handleTabVisible();
      }
    });
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor navigation performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.log(`Page load time: ${Math.round(entry.loadEventEnd - entry.fetchStart)}ms`);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      // Performance API might not be available in all browsers
      console.warn('Performance monitoring not available');
    }
  }

  /**
   * Show a specific section of the portal
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
      this.currentSection = sectionName;
      
      // Update navigation
      if (this.modules.navigation) {
        this.modules.navigation.updateActiveSection(sectionName);
      }
      
      // Initialize section if needed
      // Map section names to module names (for cases where they differ)
      const moduleMapping = {
        'documents': 'documentModule'
      };
      const moduleName = moduleMapping[sectionName] || sectionName;
      let module = this.modules[moduleName];
      
      // If module doesn't exist but we're authenticated, try to initialize it
      if (!module && this.authToken && sectionName === 'projects') {
        console.log(`Module ${moduleName} not initialized, initializing now...`);
        const ProjectsModule = (await import('./ProjectsModule.js')).ProjectsModule;
        this.modules.projects = new ProjectsModule(this);
        await this.modules.projects.init();
        module = this.modules.projects;
      }
      
      if (module && typeof module.activate === 'function') {
        await module.activate();
      } else if (sectionName === 'documents' && this.modules.documentModule) {
        // Special handling for documents section
        const currentProjectId = this.currentProject?.id || 
          (this.modules.projects?.currentProject?.id);
        
        if (currentProjectId) {
          await this.modules.documentModule.initialize(currentProjectId);
          this.modules.documentModule.render();
        }
      }
      
      // Update browser history
      if (pushHistory) {
        history.pushState(
          { section: sectionName }, 
          `${sectionName} - [RE]Print Studios`, 
          `#${sectionName}`
        );
      }
      
      const renderTime = performance.now() - startTime;
      this.performanceMetrics.lastRender = renderTime;
      
      console.log(`Section ${sectionName} rendered in ${Math.round(renderTime)}ms`);
      
    } catch (error) {
      console.error(`Failed to show section ${sectionName}:`, error);
      // Fallback to dashboard
      if (sectionName !== 'dashboard') {
        this.showSection('dashboard');
      }
    }
  }

  /**
   * Hide all sections
   */
  hideAllSections() {
    const sections = document.querySelectorAll('.portal-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
  }

  /**
   * Show notification to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of notification (success, error, warning, info)
   * @param {number} duration - How long to show the notification in milliseconds
   */
  showNotification(message, type = 'info', duration = 5000) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.portal-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `portal-notification portal-notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles if not already present
    if (!document.querySelector('#portal-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'portal-notification-styles';
      styles.textContent = `
        .portal-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 500px;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          background: white;
          border-left: 4px solid;
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }

        .portal-notification-success {
          border-left-color: #27AE60;
          background: #f0f9ff;
        }

        .portal-notification-error {
          border-left-color: #E63946;
          background: #fef2f2;
        }

        .portal-notification-warning {
          border-left-color: #F7C600;
          background: #fffbeb;
        }

        .portal-notification-info {
          border-left-color: #0057FF;
          background: #f0f9ff;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notification-icon {
          font-size: 20px;
        }

        .notification-message {
          flex: 1;
          color: #333;
          font-size: 14px;
        }

        .notification-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #666;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-close:hover {
          color: #333;
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to document
    document.body.appendChild(notification);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.animation = 'slideOut 0.3s ease-out';
          notification.style.animationFillMode = 'forwards';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Show quick search modal
   */
  showQuickSearch() {
    // Implementation would show a search modal
    console.log('Quick search triggered');
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
    // Refresh data when connection is restored
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.handleConnectionRestore === 'function') {
        module.handleConnectionRestore();
      }
    });
    
    // Reconnect socket
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * Handle connection loss
   */
  handleConnectionLoss() {
    // Notify modules about connection loss
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
    // Pause non-essential updates
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
    // Resume updates
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.resume === 'function') {
        module.resume();
      }
    });
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    // Show a fallback UI
    document.body.innerHTML = `
      <div class="error-screen">
        <div class="error-content">
          <h1>Something went wrong</h1>
          <p>We're having trouble loading the portal. Please try refreshing the page.</p>
          <button onclick="window.location.reload()" class="btn-primary">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      totalInitTime: performance.now() - this.performanceMetrics.initStart,
      moduleCount: Object.keys(this.modules).length,
      activeModules: Object.values(this.modules).filter(m => m !== null).length
    };
  }

  /**
   * Destroy portal and cleanup resources
   */
  destroy() {
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
    this.authToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.initialized = false;
    
    console.log('Portal destroyed');
  }
}

// Export as Portal for backward compatibility
export const Portal = ClientPortal;