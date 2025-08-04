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
            <button class="refresh-btn" onclick="admin.modules.dashboard.refresh()">
              <span class="icon">🔄</span>
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
  }

  /**
   * Render statistics cards
   */
  renderStatsCards() {
    const cards = [
      {
        title: 'Total Clients',
        value: this.stats.totalClients || 0,
        icon: '👥',
        trend: this.stats.clientsTrend || 0,
        color: 'blue'
      },
      {
        title: 'Active Projects',
        value: this.stats.activeProjects || 0,
        icon: '📋',
        trend: this.stats.projectsTrend || 0,
        color: 'green'
      },
      {
        title: 'Monthly Revenue',
        value: this.formatCurrency(this.stats.monthlyRevenue || 0),
        icon: '💰',
        trend: this.stats.revenueTrend || 0,
        color: 'purple'
      },
      {
        title: 'Pending Invoices',
        value: this.stats.pendingInvoices || 0,
        icon: '💳',
        trend: this.stats.invoicesTrend || 0,
        color: 'orange'
      },
      {
        title: 'Open Inquiries',
        value: this.stats.openInquiries || 0,
        icon: '💬',
        trend: this.stats.inquiriesTrend || 0,
        color: 'red'
      },
      {
        title: 'Server Uptime',
        value: this.formatUptime(this.stats.serverUptime || 0),
        icon: '⚡',
        trend: null,
        color: 'cyan'
      }
    ];

    return cards.map(card => `
      <div class="stat-card ${card.color}">
        <div class="stat-header">
          <span class="stat-icon">${card.icon}</span>
          <span class="stat-title">${card.title}</span>
        </div>
        <div class="stat-value">${card.value}</div>
        ${card.trend !== null ? `
          <div class="stat-trend ${card.trend >= 0 ? 'positive' : 'negative'}">
            <span class="trend-icon">${card.trend >= 0 ? '↗️' : '↘️'}</span>
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
    const revenue = this.stats.monthlyRevenueData || [0, 0, 0, 0, 0, 0];
    
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
    const statuses = this.stats.projectStatusData || {
      active: 0,
      completed: 0,
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
          <div class="empty-icon">📋</div>
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
        icon: '👤',
        action: 'createClient',
        color: 'blue'
      },
      {
        label: 'New Project',
        icon: '📋',
        action: 'createProject',
        color: 'green'
      },
      {
        label: 'Send Invoice',
        icon: '💳',
        action: 'createInvoice',
        color: 'purple'
      },
      {
        label: 'View Reports',
        icon: '📊',
        action: 'viewReports',
        color: 'orange'
      }
    ];

    return actions.map(action => `
      <button class="quick-action-btn ${action.color}" 
              onclick="admin.modules.dashboard.handleQuickAction('${action.action}')">
        <span class="action-icon">${action.icon}</span>
        <span class="action-label">${action.label}</span>
      </button>
    `).join('');
  }

  /**
   * Initialize charts (placeholder for future chart library integration)
   */
  initializeCharts() {
    // This would integrate with Chart.js or similar library
    console.log('📊 Charts initialized (using simplified version)');
  }

  /**
   * Handle quick actions
   */
  handleQuickAction(action) {
    switch (action) {
      case 'createClient':
        this.admin.showSection('clients');
        // Trigger client creation modal
        break;
      case 'createProject':
        this.admin.showSection('projects');
        // Trigger project creation modal
        break;
      case 'createInvoice':
        this.admin.showSection('invoices');
        // Trigger invoice creation modal
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
      client_created: '👤',
      project_created: '📋',
      project_updated: '✏️',
      invoice_sent: '💳',
      payment_received: '💰',
      inquiry_received: '💬',
      file_uploaded: '📁',
      user_login: '🔐'
    };
    return icons[type] || '📋';
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