import { BaseModule } from './BaseModule.js';

/**
 * Dashboard module for client portal
 * Handles main dashboard display, project overview, and stats
 */
export class DashboardModule extends BaseModule {
  constructor(portal) {
    super(portal, 'DashboardModule');
    this.projects = [];
    this.stats = {};
    this.refreshInterval = null;
  }

  async doInit() {
    this.element = document.getElementById('dashboard');
    if (!this.element) {
      throw new Error('Dashboard element not found');
    }

    await this.setupDashboard();
    this.setupRefreshInterval();
  }

  /**
   * Setup dashboard components
   */
  async setupDashboard() {
    try {
      this.showLoading();
      
      // Load dashboard data
      await Promise.all([
        this.loadProjects(),
        this.loadStats(),
        this.loadRecentActivity()
      ]);

      this.renderDashboard();
      this.setupDashboardEvents();
      
      this.hideLoading();
    } catch (error) {
      console.error('Dashboard setup error:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  /**
   * Load user's projects
   */
  async loadProjects() {
    try {
      const data = await this.getCachedData('projects', async () => {
        const response = await this.apiRequest('/api/projects');
        const result = await response.json();
        return result.projects || [];
      }, 120000); // 2 minutes cache

      this.projects = data;
      return data;
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projects = [];
      throw error;
    }
  }

  /**
   * Load dashboard statistics
   */
  async loadStats() {
    try {
      const data = await this.getCachedData('stats', async () => {
        const response = await this.apiRequest('/api/dashboard/stats');
        return await response.json();
      }, 300000); // 5 minutes cache

      this.stats = data;
      return data;
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = {};
      throw error;
    }
  }

  /**
   * Load recent activity
   */
  async loadRecentActivity() {
    try {
      const data = await this.getCachedData('activity', async () => {
        const response = await this.apiRequest('/api/activity?limit=10');
        const result = await response.json();
        return result.activities || [];
      }, 60000); // 1 minute cache

      this.recentActivity = data;
      return data;
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      this.recentActivity = [];
      throw error;
    }
  }

  /**
   * Render the dashboard content
   */
  renderDashboard() {
    const dashboardContent = this.element.querySelector('.dashboard-content');
    if (!dashboardContent) return;

    dashboardContent.innerHTML = `
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1>Welcome back, ${this.portal.currentUser?.firstName || 'there'}!</h1>
          <p class="welcome-subtitle">Here's what's happening with your projects</p>
        </div>
        <div class="dashboard-stats">
          ${this.renderStatsCards()}
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-main">
          <section class="projects-overview">
            <div class="section-header">
              <h2>Active Projects</h2>
              <button class="btn-secondary" onclick="portal.showSection('projects')">
                View All
              </button>
            </div>
            <div class="projects-list">
              ${this.renderProjectsList()}
            </div>
          </section>

          <section class="recent-activity">
            <div class="section-header">
              <h2>Recent Activity</h2>
            </div>
            <div class="activity-list">
              ${this.renderActivityList()}
            </div>
          </section>
        </div>

        <div class="dashboard-sidebar">
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button class="action-btn" onclick="portal.modules.messaging.openComposer()">
                <i class="icon-message">💬</i>
                <span>Send Message</span>
              </button>
              <button class="action-btn" onclick="portal.modules.files.openUploader()">
                <i class="icon-upload">📁</i>
                <span>Upload Files</span>
              </button>
              <button class="action-btn" onclick="portal.showSection('invoices')">
                <i class="icon-invoice">💳</i>
                <span>View Invoices</span>
              </button>
            </div>
          </div>

          <div class="notifications-panel">
            <h3>Notifications</h3>
            <div class="notifications-list" id="notifications-list">
              ${this.renderNotifications()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render statistics cards
   */
  renderStatsCards() {
    const stats = this.stats;
    
    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.activeProjects || 0}</div>
          <div class="stat-label">Active Projects</div>
          <div class="stat-change positive">+${stats.newProjects || 0} this month</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.completedProjects || 0}</div>
          <div class="stat-label">Completed</div>
          <div class="stat-change">${stats.completionRate || 0}% completion rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.formatCurrency(stats.totalInvoiced || 0)}</div>
          <div class="stat-label">Total Invoiced</div>
          <div class="stat-change">${this.formatCurrency(stats.pendingAmount || 0)} pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.unreadMessages || 0}</div>
          <div class="stat-label">Unread Messages</div>
          <div class="stat-change ${stats.unreadMessages > 0 ? 'attention' : ''}">
            ${stats.unreadMessages > 0 ? 'Needs attention' : 'All caught up'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render projects list
   */
  renderProjectsList() {
    if (!this.projects || this.projects.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Active Projects</h3>
          <p>Your projects will appear here once they're created.</p>
        </div>
      `;
    }

    return this.projects.slice(0, 6).map(project => `
      <div class="project-card" onclick="portal.showProjectDetails('${project.id}')">
        <div class="project-header">
          <h4 class="project-name">${project.name}</h4>
          <span class="project-status status-${project.status}">${project.status}</span>
        </div>
        <div class="project-progress">
          ${this.renderProjectProgress(project)}
        </div>
        <div class="project-meta">
          <span class="project-date">Updated ${this.formatDate(project.updated_at, { month: 'short', day: 'numeric' })}</span>
          <span class="project-priority priority-${project.priority}">${project.priority}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render project progress
   */
  renderProjectProgress(project) {
    const phaseIndex = project.current_phase_index || 0;
    const phases = ['Onboarding', 'Ideation', 'Design', 'Review', 'Production', 'Payment', 'Sign-off', 'Delivery'];
    const currentPhase = phases[phaseIndex] || 'Unknown';
    const progress = Math.round((phaseIndex / (phases.length - 1)) * 100);

    return `
      <div class="progress-info">
        <div class="progress-label">
          <span class="current-phase">${currentPhase}</span>
          <span class="progress-percentage">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render activity list
   */
  renderActivityList() {
    if (!this.recentActivity || this.recentActivity.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No Recent Activity</h3>
          <p>Your activity will appear here as you interact with projects.</p>
        </div>
      `;
    }

    return this.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          ${this.getActivityIcon(activity.action)}
        </div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${this.formatDate(activity.created_at)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get icon for activity type
   */
  getActivityIcon(action) {
    const icons = {
      'project_created': '🆕',
      'phase_updated': '🔄',
      'file_uploaded': '📁',
      'message_sent': '💬',
      'invoice_created': '💳',
      'payment_received': '💰',
      'project_completed': '✅'
    };
    
    return icons[action] || '📋';
  }

  /**
   * Render notifications
   */
  renderNotifications() {
    // This would typically come from a notifications API
    const notifications = [
      {
        id: 1,
        title: 'Project Update',
        message: 'Your project "Brand Redesign" has moved to Review phase',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        type: 'info'
      },
      {
        id: 2,
        title: 'Payment Due',
        message: 'Invoice #1001 is due in 3 days',
        time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        type: 'warning'
      }
    ];

    if (notifications.length === 0) {
      return `
        <div class="empty-state small">
          <div class="empty-icon">🔔</div>
          <p>No new notifications</p>
        </div>
      `;
    }

    return notifications.map(notification => `
      <div class="notification-item ${notification.type}">
        <div class="notification-content">
          <h4 class="notification-title">${notification.title}</h4>
          <p class="notification-message">${notification.message}</p>
          <span class="notification-time">${this.formatDate(notification.time)}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
      </div>
    `).join('');
  }

  /**
   * Setup dashboard event handlers
   */
  setupDashboardEvents() {
    // Refresh button
    const refreshBtn = this.element.querySelector('.refresh-btn');
    if (refreshBtn) {
      this.addEventListener(refreshBtn, 'click', this.refreshDashboard.bind(this));
    }

    // Project cards click handling is done via onclick attributes in renderProjectsList
    // for simplicity, but could be refactored to use event delegation
  }

  /**
   * Setup automatic refresh interval
   */
  setupRefreshInterval() {
    // Refresh dashboard every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.refreshDashboard(true); // Silent refresh
    }, 5 * 60 * 1000);
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(silent = false) {
    try {
      if (!silent) {
        this.showLoading();
      }

      // Clear cache to force fresh data
      this.clearCache();

      // Reload data
      await Promise.all([
        this.loadProjects(),
        this.loadStats(),
        this.loadRecentActivity()
      ]);

      // Re-render
      this.renderDashboard();

      if (!silent) {
        this.showSuccess('Dashboard refreshed');
        this.hideLoading();
      }
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      if (!silent) {
        this.showError('Failed to refresh dashboard');
      }
    }
  }

  /**
   * Show project details
   */
  showProjectDetails(projectId) {
    // This would typically navigate to a project details view
    // For now, we'll just switch to the projects section
    this.portal.showSection('projects');
    
    // Could also emit an event or call a method to highlight the specific project
    setTimeout(() => {
      const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
      if (projectCard) {
        projectCard.scrollIntoView({ behavior: 'smooth' });
        projectCard.classList.add('highlighted');
        setTimeout(() => projectCard.classList.remove('highlighted'), 2000);
      }
    }, 100);
  }

  destroy() {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    super.destroy();
  }
}