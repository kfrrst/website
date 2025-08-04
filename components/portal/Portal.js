import { AuthModule } from './AuthModule.js';
import { DashboardModule } from './DashboardModule.js';
import { NavigationModule } from './NavigationModule.js';
import { MessagingModule } from './MessagingModule.js';
import { FilesModule } from './FilesModule.js';
import { ProjectsModule } from './ProjectsModule.js';
import { InvoicesModule } from './InvoicesModule.js';
import { DocumentGenerationModule } from './DocumentGenerationModule.js';

/**
 * Main Portal class that manages all modules
 * Provides a modular, maintainable architecture for the client portal
 */
export class Portal {
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
      console.log('🚀 Portal initialization starting...');

      // Initialize modules in dependency order
      await this.initializeModules();
      
      // Setup global event handlers
      this.setupGlobalEvents();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      this.initialized = true;
      
      const initTime = performance.now() - this.performanceMetrics.initStart;
      console.log(`✅ Portal initialization completed in ${Math.round(initTime)}ms`);
      
    } catch (error) {
      console.error('❌ Portal initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize all portal modules
   */
  async initializeModules() {
    const moduleConfigs = [
      // Core modules first
      { name: 'auth', module: AuthModule, critical: true },
      { name: 'navigation', module: NavigationModule, critical: true },
      
      // Feature modules
      { name: 'dashboard', module: DashboardModule, critical: false },
      { name: 'messaging', module: MessagingModule, critical: false },
      { name: 'files', module: FilesModule, critical: false },
      { name: 'projects', module: ProjectsModule, critical: false },
      { name: 'invoices', module: InvoicesModule, critical: false },
      { name: 'documentModule', module: DocumentGenerationModule, critical: false }
    ];

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
        
        console.log(`✅ ${config.name} module initialized in ${Math.round(initTime)}ms`);
        
      } catch (error) {
        console.error(`❌ ${config.name} module initialization failed:`, error);
        
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
      // Initialize socket connection for real-time features
      await this.initializeSocket();
      
      // Load initial dashboard data
      if (this.modules.dashboard) {
        await this.modules.dashboard.setupDashboard();
      }
      
      // Setup navigation
      if (this.modules.navigation) {
        this.modules.navigation.updateActiveSection('dashboard');
      }
      
      console.log('✅ Dashboard initialized successfully');
      
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
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
          console.log('✅ Socket connected');
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Socket disconnected');
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
      console.log('🌐 Connection restored');
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
          console.log(`📊 Page load time: ${Math.round(entry.loadEventEnd - entry.fetchStart)}ms`);
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
      
      sectionElement.classList.remove('hidden');
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
      const module = this.modules[moduleName];
      
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
      
      console.log(`📊 Section ${sectionName} rendered in ${Math.round(renderTime)}ms`);
      
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
      section.classList.add('hidden');
    });
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

// Global portal instance
window.portal = new Portal();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.portal.init();
  });
} else {
  // DOM already loaded
  window.portal.init();
}