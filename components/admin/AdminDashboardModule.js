import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Dashboard Module
 * Handles overview statistics, charts, and main dashboard functionality
 */
export class AdminDashboardModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminDashboardModule');
    this.stats = {};
    this.charts = {};
    this.recentActivity = [];
  }

  async doInit() {
    this.element = document.getElementById('overview');
    if (this.element) {
      // Only load stats if we have a token (i.e., user is authenticated)
      if (this.admin && this.admin.token) {
        await this.loadStats();
      }
      this.setupDashboard();
      this.setupAutoRefresh(30000); // Refresh every 30 seconds
    }
  }

  /**
   * Load dashboard statistics
   */
  async loadStats() {
    try {
      const data = await this.getCachedData('dashboard_stats', async () => {
        const response = await this.apiRequest('/dashboard/stats');
        return await response.json();
      }, 30000); // Cache for 30 seconds

      this.stats = data;
      this.recentActivity = data.recentActivity || [];
      
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      this.showError('Failed to load dashboard statistics');
    }
  }

  /**
   * Setup dashboard interface
   */
  setupDashboard() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-overview">
        <div class="overview-header">
          <h1>Admin Dashboard</h1>
          <div class="overview-actions">
            <button class="refresh-btn" id="btn-refresh-dashboard">
              Refresh
            </button>
            <div class="last-updated">
              Last updated: ${this.formatDate(new Date(), { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>

        <div class="stats-grid">
          ${this.renderStatsCards()}
        </div>

        <div class="dashboard-content">
          <div class="dashboard-left">
            <div class="chart-container">
              <h3>Revenue Overview</h3>
              <div id="revenue-chart" class="chart-placeholder">
                ${this.renderRevenueChart()}
              </div>
            </div>
            
            <div class="project-status-container">
              <h3>Project Status Distribution</h3>
              <div id="project-status-chart" class="chart-placeholder">
                ${this.renderProjectStatusChart()}
              </div>
            </div>
          </div>

          <div class="dashboard-right">
            <div class="recent-activity">
              <h3>Recent Activity</h3>
              <div class="activity-list">
                ${this.renderRecentActivity()}
              </div>
            </div>

            <div class="quick-actions">
              <h3>Quick Actions</h3>
              <div class="action-buttons">
                ${this.renderQuickActions()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initializeCharts();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
      this.addEventListener(refreshBtn, 'click', () => this.refresh());
    }

    // Quick action buttons
    const quickActionBtns = this.element.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        const action = btn.getAttribute('data-action');
        this.handleQuickAction(action);
      });
    });
  }

  /**
   * Render statistics cards
   */
  renderStatsCards() {
    const stats = this.stats?.stats || {};
    const cards = [
      {
        title: 'Total Clients',
        value: stats.total_clients || stats.total_users || 0,
        icon: '',
        trend: null,
        color: 'blue'
      },
      {
        title: 'Active Projects',
        value: stats.active_projects || 0,
        icon: '',
        trend: null,
        color: 'green'
      },
      {
        title: 'Monthly Revenue',
        value: this.formatCurrency(stats.revenue_month || 0),
        icon: '',
        trend: null,
        color: 'purple'
      },
      {
        title: 'Pending Invoices',
        value: stats.pending_invoices || 0,
        icon: '',
        trend: null,
        color: 'orange'
      },
      {
        title: 'Total Files',
        value: stats.total_files || 0,
        icon: '',
        trend: null,
        color: 'red'
      },
      {
        title: 'Recent Activities',
        value: stats.recent_activities || 0,
        icon: '',
        trend: null,
        color: 'cyan'
      }
    ];

    return cards.map(card => `
      <div class="stat-card ${card.color}">
        <div class="stat-header">
          <span class="stat-title">${card.title}</span>
        </div>
        <div class="stat-value">${card.value}</div>
        ${card.trend !== null ? `
          <div class="stat-trend ${card.trend >= 0 ? 'positive' : 'negative'}">
            <span class="trend-icon">${card.trend >= 0 ? '↑' : '↓'}</span>
            <span class="trend-value">${Math.abs(card.trend)}%</span>
            <span class="trend-period">vs last month</span>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  /**
   * Render revenue chart (simplified)
   */
  renderRevenueChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const stats = this.stats?.stats || {};
    const revenue = [0, 0, 0, 0, 0, stats.revenue_month || 0]; // Only show current month revenue
    
    return `
      <div class="simple-chart">
        <div class="chart-bars">
          ${months.map((month, index) => `
            <div class="chart-bar-container">
              <div class="chart-bar" 
                   style="height: ${(revenue[index] / Math.max(...revenue)) * 100}%"
                   title="${month}: ${this.formatCurrency(revenue[index])}">
              </div>
              <div class="chart-label">${month}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render project status chart
   */
  renderProjectStatusChart() {
    const stats = this.stats?.stats || {};
    const statuses = {
      active: stats.active_projects || 0,
      completed: stats.total_projects - (stats.active_projects || 0) || 0,
      on_hold: 0,
      cancelled: 0
    };

    const total = Object.values(statuses).reduce((sum, count) => sum + count, 0);
    
    return `
      <div class="status-chart">
        ${Object.entries(statuses).map(([status, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return `
            <div class="status-item">
              <div class="status-indicator ${status}"></div>
              <div class="status-info">
                <span class="status-label">${this.formatStatusLabel(status)}</span>
                <span class="status-count">${count} (${percentage.toFixed(1)}%)</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render recent activity list
   */
  renderRecentActivity() {
    if (!this.recentActivity.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon"></div>
          <p>No recent activity</p>
        </div>
      `;
    }

    return this.recentActivity.slice(0, 10).map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render quick actions
   */
  renderQuickActions() {
    const actions = [
      {
        label: 'New Client',
        icon: '',
        action: 'createClient',
        color: 'blue'
      },
      {
        label: 'New Project',
        icon: '',
        action: 'createProject',
        color: 'green'
      },
      {
        label: 'Send Invoice',
        icon: '',
        action: 'createInvoice',
        color: 'purple'
      },
      {
        label: 'View Reports',
        icon: '',
        action: 'viewReports',
        color: 'orange'
      }
    ];

    return actions.map(action => `
      <button class="quick-action-btn ${action.color}" 
              data-action="${action.action}">
        <span class="action-label">${action.label}</span>
      </button>
    `).join('');
  }

  /**
   * Initialize charts (placeholder for future chart library integration)
   */
  initializeCharts() {
    // This would integrate with Chart.js or similar library
    console.log('Charts initialized (using simplified version)');
  }

  /**
   * Handle quick actions
   */
  handleQuickAction(action) {
    switch (action) {
      case 'createClient':
        this.admin.showSection('clients');
        // Wait for section to be visible then trigger modal
        setTimeout(() => {
          if (this.admin.modules.clients && this.admin.modules.clients.showCreateModal) {
            this.admin.modules.clients.showCreateModal();
          }
        }, 100);
        break;
      case 'createProject':
        this.admin.showSection('projects');
        setTimeout(() => {
          if (this.admin.modules.projects && this.admin.modules.projects.showCreateModal) {
            this.admin.modules.projects.showCreateModal();
          }
        }, 100);
        break;
      case 'createInvoice':
        this.admin.showSection('invoices');
        setTimeout(() => {
          if (this.admin.modules.invoices && this.admin.modules.invoices.showCreateModal) {
            this.admin.modules.invoices.showCreateModal();
          }
        }, 100);
        break;
      case 'viewReports':
        this.admin.showSection('reports');
        break;
      default:
        console.log(`Quick action: ${action}`);
    }
  }

  /**
   * Format status labels
   */
  formatStatusLabel(status) {
    const labels = {
      active: 'Active',
      completed: 'Completed',
      on_hold: 'On Hold',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Get activity icon
   */
  getActivityIcon(type) {
    const icons = {
      client_created: '',
      project_created: '',
      project_updated: '',
      invoice_sent: '',
      payment_received: '',
      inquiry_received: '',
      file_uploaded: '',
      user_login: ''
    };
    return icons[type] || '';
  }

  /**
   * Format uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  }

  /**
   * Refresh dashboard data
   */
  async refresh() {
    this.showLoading();
    this.clearCache();
    
    try {
      await this.loadStats();
      this.setupDashboard();
      this.showSuccess('Dashboard refreshed');
    } catch (error) {
      this.showError('Failed to refresh dashboard');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('stats_updated', (stats) => {
      this.stats = { ...this.stats, ...stats };
      this.clearCache();
      this.setupDashboard();
    });

    socket.on('new_activity', (activity) => {
      this.recentActivity.unshift(activity);
      // Keep only last 50 activities
      this.recentActivity = this.recentActivity.slice(0, 50);
      this.setupDashboard();
    });
  }
}