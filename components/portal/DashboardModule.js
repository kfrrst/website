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
    console.log('DashboardModule.doInit called');
    this.element = document.getElementById('dashboard');
    console.log('Dashboard element found:', !!this.element);
    
    if (!this.element) {
      throw new Error('Dashboard element not found');
    }

    console.log('Setting up dashboard...');
    await this.setupDashboard();
    console.log('Dashboard setup complete');
    
    this.setupRefreshInterval();
    console.log('Refresh interval setup');
  }

  /**
   * Setup dashboard components
   */
  async setupDashboard() {
    try {
      console.log('setupDashboard: starting');
      this.showLoading();
      
      console.log('Loading dashboard data...');
      // Load dashboard data
      await Promise.all([
        this.loadProjects().catch(err => { console.error('loadProjects failed:', err); return []; }),
        this.loadStats().catch(err => { console.error('loadStats failed:', err); return {}; }),
        this.loadRecentActivity().catch(err => { console.error('loadRecentActivity failed:', err); return []; })
      ]);

      console.log('Dashboard data loaded, rendering...');
      this.renderDashboard();
      this.setupDashboardEvents();
      
      this.hideLoading();
      console.log('setupDashboard: complete');
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
      console.log('loadProjects: starting');
      
      // Bypass cache for debugging
      console.log('loadProjects: making direct API request');
      const response = await this.apiRequest('/api/projects');
      console.log('loadProjects: got response', response.status);
      const result = await response.json();
      console.log('loadProjects: parsed JSON', result);
      const data = result.projects || [];
      
      console.log('loadProjects: complete, got', data.length, 'projects');

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
      console.log('loadStats: starting');
      const response = await this.apiRequest('/api/dashboard/stats');
      console.log('loadStats: got response', response.status);
      const data = await response.json();
      console.log('loadStats: parsed JSON', data);
      this.stats = data;
      console.log('loadStats: complete');
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
      console.log('loadRecentActivity: starting');
      const response = await this.apiRequest('/api/activity?limit=10');
      console.log('loadRecentActivity: got response', response.status);
      const result = await response.json();
      console.log('loadRecentActivity: parsed JSON', result);
      const data = result.activities || [];
      this.recentActivity = data;
      console.log('loadRecentActivity: complete');
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
        </div>

        <div class="dashboard-sidebar">
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button class="action-btn" onclick="portal.modules.messaging.openComposer()">
                <i class="icon-message">[MSG]</i>
                <span>Send Message</span>
              </button>
              <button class="action-btn" onclick="portal.modules.files.openUploader()">
                <i class="icon-upload">[FILE]</i>
                <span>Upload Files</span>
              </button>
              <button class="action-btn" onclick="portal.showSection('invoices')">
                <i class="icon-invoice">[INV]</i>
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

          <section class="recent-activity">
            <div class="section-header">
              <h3>Recent Activity</h3>
              <button class="btn-link-small" onclick="portal.modules.dashboard.loadMoreActivity()">
                View All
              </button>
            </div>
            <div class="activity-list">
              ${this.renderActivityList()}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  /**
   * Render statistics cards
   */
  renderStatsCards() {
    const stats = this.stats?.stats || {};
    
    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.active_projects || 0}</div>
          <div class="stat-label">Active Projects</div>
          <div class="stat-change">${stats.total_projects || 0} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.projects_in_progress || 0}</div>
          <div class="stat-label">In Progress</div>
          <div class="stat-change">${stats.recent_activities || 0} activities this week</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.pending_invoices || 0}</div>
          <div class="stat-label">Pending Invoices</div>
          <div class="stat-change">${this.formatCurrency(stats.total_due || 0)} due</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.unread_messages || 0}</div>
          <div class="stat-label">Unread Messages</div>
          <div class="stat-change ${stats.unread_messages > 0 ? 'attention' : ''}">
            ${stats.unread_messages > 0 ? 'Needs attention' : 'All caught up'}
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
          <div class="empty-icon">[PROJECTS]</div>
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
        <div class="empty-state small">
          <p>No recent activity</p>
        </div>
      `;
    }

    // Show only first 5 activities initially
    const visibleActivities = this.recentActivity.slice(0, 5);
    const hasMore = this.recentActivity.length > 5;

    return `
      ${visibleActivities.map(activity => `
        <div class="activity-item">
          <div class="activity-icon">
            ${this.getActivityIcon(activity.type || activity.action)}
          </div>
          <div class="activity-content">
            <div class="activity-description">${activity.description}</div>
            <div class="activity-time">${activity.timeAgo || this.formatRelativeTime(activity.timestamp || activity.created_at)}</div>
          </div>
        </div>
      `).join('')}
      ${hasMore ? `
        <div class="activity-show-more">
          <button class="btn-link" onclick="portal.modules.dashboard.expandActivity()">
            Show ${this.recentActivity.length - 5} more activities
          </button>
        </div>
      ` : ''}
    `;
  }

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(timestamp, { hour: undefined, minute: undefined });
    }
  }

  /**
   * Expand activity list to show all
   */
  expandActivity() {
    const activityList = this.element.querySelector('.activity-list');
    if (!activityList) return;

    activityList.innerHTML = this.recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          ${this.getActivityIcon(activity.type || activity.action)}
        </div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${activity.timeAgo || this.formatRelativeTime(activity.timestamp || activity.created_at)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get icon for activity type
   */
  getActivityIcon(action) {
    const icons = {
      'project_created': '[NEW]',
      'phase_updated': '[UPDATE]',
      'file_uploaded': '[FILE]',
      'message_sent': '[MSG]',
      'invoice_created': '[INV]',
      'payment_received': '[PAY]',
      'project_completed': '[DONE]'
    };
    
    return icons[action] || '[ACTION]';
  }

  /**
   * Render notifications
   */
  renderNotifications() {
    // For now, show empty state - notifications will be loaded from API in future
    const notifications = [];

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