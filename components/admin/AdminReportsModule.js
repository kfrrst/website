import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Reports Module
 * Handles analytics, reporting, and data visualization
 */
export class AdminReportsModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminReportsModule');
    this.reportData = {};
    this.currentReport = 'overview';
    this.dateRange = 'last30days';
    this.customStartDate = null;
    this.customEndDate = null;
  }

  async doInit() {
    this.element = document.getElementById('reports');
    if (this.element) {
      // Only load reports if we have a token
      if (this.admin && this.admin.token) {
        await this.loadReportData();
      }
      this.setupReportsInterface();
      this.setupAutoRefresh(300000); // Refresh every 5 minutes
    }
  }

  /**
   * Load report data
   */
  async loadReportData() {
    try {
      const params = new URLSearchParams({
        range: this.dateRange,
        ...(this.customStartDate && { start: this.customStartDate }),
        ...(this.customEndDate && { end: this.customEndDate })
      });

      const data = await this.getCachedData(`reports_${this.currentReport}_${this.dateRange}`, async () => {
        const response = await this.apiRequest(`/analytics/reports/${this.currentReport}?${params}`);
        return await response.json();
      }, 300000); // Cache for 5 minutes

      this.reportData = data;
      
    } catch (error) {
      console.error('Failed to load report data:', error);
      this.showError('Failed to load report data');
    }
  }

  /**
   * Setup reports interface
   */
  setupReportsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-reports">
        <div class="reports-header">
          <h1>Reports & Analytics</h1>
          <div class="reports-actions">
            <button class="btn-secondary" onclick="admin.modules.reports.exportReport()">
              <span class="icon">📥</span>
              Export Report
            </button>
            <button class="btn-primary" onclick="admin.modules.reports.showScheduleModal()">
              <span class="icon">📅</span>
              Schedule Report
            </button>
          </div>
        </div>

        <div class="reports-controls">
          <div class="report-selector">
            <label>Report Type:</label>
            <select onchange="admin.modules.reports.changeReport(this.value)">
              <option value="overview" ${this.currentReport === 'overview' ? 'selected' : ''}>Overview Dashboard</option>
              <option value="revenue" ${this.currentReport === 'revenue' ? 'selected' : ''}>Revenue Analysis</option>
              <option value="projects" ${this.currentReport === 'projects' ? 'selected' : ''}>Project Performance</option>
              <option value="clients" ${this.currentReport === 'clients' ? 'selected' : ''}>Client Analytics</option>
              <option value="phases" ${this.currentReport === 'phases' ? 'selected' : ''}>Phase Analysis</option>
              <option value="files" ${this.currentReport === 'files' ? 'selected' : ''}>File Usage</option>
            </select>
          </div>
          
          <div class="date-range-selector">
            <label>Date Range:</label>
            <select onchange="admin.modules.reports.changeDateRange(this.value)">
              <option value="today" ${this.dateRange === 'today' ? 'selected' : ''}>Today</option>
              <option value="yesterday" ${this.dateRange === 'yesterday' ? 'selected' : ''}>Yesterday</option>
              <option value="last7days" ${this.dateRange === 'last7days' ? 'selected' : ''}>Last 7 Days</option>
              <option value="last30days" ${this.dateRange === 'last30days' ? 'selected' : ''}>Last 30 Days</option>
              <option value="last90days" ${this.dateRange === 'last90days' ? 'selected' : ''}>Last 90 Days</option>
              <option value="lastYear" ${this.dateRange === 'lastYear' ? 'selected' : ''}>Last Year</option>
              <option value="custom" ${this.dateRange === 'custom' ? 'selected' : ''}>Custom Range</option>
            </select>
          </div>
          
          ${this.dateRange === 'custom' ? `
            <div class="custom-date-range">
              <input type="date" id="custom-start-date" value="${this.customStartDate || ''}" 
                     onchange="admin.modules.reports.setCustomDates()">
              <span>to</span>
              <input type="date" id="custom-end-date" value="${this.customEndDate || ''}" 
                     onchange="admin.modules.reports.setCustomDates()">
            </div>
          ` : ''}
        </div>

        <div class="report-content">
          ${this.renderReportContent()}
        </div>
      </div>

      <!-- Schedule Report Modal -->
      <div id="schedule-report-modal" class="modal">
        <div class="modal-overlay" onclick="admin.modules.reports.closeScheduleModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Schedule Report</h2>
            <button class="modal-close" onclick="admin.modules.reports.closeScheduleModal()">×</button>
          </div>
          <div class="modal-body">
            ${this.renderScheduleForm()}
          </div>
        </div>
      </div>
    `;

    this.setupCharts();
  }

  /**
   * Render report content based on current report type
   */
  renderReportContent() {
    switch (this.currentReport) {
      case 'overview':
        return this.renderOverviewReport();
      case 'revenue':
        return this.renderRevenueReport();
      case 'projects':
        return this.renderProjectsReport();
      case 'clients':
        return this.renderClientsReport();
      case 'phases':
        return this.renderPhasesReport();
      case 'files':
        return this.renderFilesReport();
      default:
        return '<p>Select a report type to view analytics.</p>';
    }
  }

  /**
   * Render overview report
   */
  renderOverviewReport() {
    const data = this.reportData;
    
    return `
      <div class="overview-report">
        <div class="kpi-cards">
          <div class="kpi-card">
            <div class="kpi-icon">💰</div>
            <div class="kpi-content">
              <h3>Total Revenue</h3>
              <div class="kpi-value">$${this.formatNumber(data.totalRevenue || 0)}</div>
              <div class="kpi-change ${(data.revenueChange || 0) >= 0 ? 'positive' : 'negative'}">
                ${(data.revenueChange || 0) >= 0 ? '↑' : '↓'} ${Math.abs(data.revenueChange || 0)}%
              </div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-icon">📊</div>
            <div class="kpi-content">
              <h3>Active Projects</h3>
              <div class="kpi-value">${data.activeProjects || 0}</div>
              <div class="kpi-change">${data.completedThisPeriod || 0} completed</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-icon">👥</div>
            <div class="kpi-content">
              <h3>Total Clients</h3>
              <div class="kpi-value">${data.totalClients || 0}</div>
              <div class="kpi-change">+${data.newClients || 0} new</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-icon">📈</div>
            <div class="kpi-content">
              <h3>Avg Project Value</h3>
              <div class="kpi-value">$${this.formatNumber(data.avgProjectValue || 0)}</div>
              <div class="kpi-change ${(data.avgValueChange || 0) >= 0 ? 'positive' : 'negative'}">
                ${(data.avgValueChange || 0) >= 0 ? '↑' : '↓'} ${Math.abs(data.avgValueChange || 0)}%
              </div>
            </div>
          </div>
        </div>
        
        <div class="chart-grid">
          <div class="chart-container">
            <h3>Revenue Trend</h3>
            <canvas id="revenue-trend-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Project Status Distribution</h3>
            <canvas id="project-status-chart"></canvas>
          </div>
        </div>
        
        <div class="recent-activity">
          <h3>Recent Activity</h3>
          ${this.renderActivityFeed(data.recentActivity || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render revenue report
   */
  renderRevenueReport() {
    const data = this.reportData;
    
    return `
      <div class="revenue-report">
        <div class="revenue-summary">
          <div class="summary-card">
            <h3>Revenue Summary</h3>
            <div class="summary-stats">
              <div class="stat-row">
                <span>Total Revenue:</span>
                <strong>$${this.formatNumber(data.totalRevenue || 0)}</strong>
              </div>
              <div class="stat-row">
                <span>Paid Invoices:</span>
                <strong>${data.paidInvoices || 0}</strong>
              </div>
              <div class="stat-row">
                <span>Outstanding:</span>
                <strong class="text-warning">$${this.formatNumber(data.outstanding || 0)}</strong>
              </div>
              <div class="stat-row">
                <span>Overdue:</span>
                <strong class="text-danger">$${this.formatNumber(data.overdue || 0)}</strong>
              </div>
            </div>
          </div>
          
          <div class="summary-card">
            <h3>Payment Methods</h3>
            <canvas id="payment-methods-chart"></canvas>
          </div>
        </div>
        
        <div class="revenue-charts">
          <div class="chart-container full-width">
            <h3>Revenue Over Time</h3>
            <canvas id="revenue-timeline-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Revenue by Service</h3>
            <canvas id="revenue-service-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Revenue by Client</h3>
            <canvas id="revenue-client-chart"></canvas>
          </div>
        </div>
        
        <div class="revenue-table">
          <h3>Top Revenue Sources</h3>
          ${this.renderRevenueTable(data.topRevenueSources || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render projects report
   */
  renderProjectsReport() {
    const data = this.reportData;
    
    return `
      <div class="projects-report">
        <div class="project-metrics">
          <div class="metric-card">
            <h4>Completion Rate</h4>
            <div class="metric-value">${data.completionRate || 0}%</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${data.completionRate || 0}%"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <h4>On-Time Delivery</h4>
            <div class="metric-value">${data.onTimeRate || 0}%</div>
            <div class="progress-bar">
              <div class="progress-fill success" style="width: ${data.onTimeRate || 0}%"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <h4>Avg Duration</h4>
            <div class="metric-value">${data.avgDuration || 0} days</div>
          </div>
          
          <div class="metric-card">
            <h4>Active Projects</h4>
            <div class="metric-value">${data.activeCount || 0}</div>
          </div>
        </div>
        
        <div class="project-charts">
          <div class="chart-container">
            <h3>Projects by Phase</h3>
            <canvas id="projects-phase-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Project Timeline</h3>
            <canvas id="project-timeline-chart"></canvas>
          </div>
        </div>
        
        <div class="project-breakdown">
          <h3>Project Performance</h3>
          ${this.renderProjectPerformanceTable(data.projectPerformance || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render clients report
   */
  renderClientsReport() {
    const data = this.reportData;
    
    return `
      <div class="clients-report">
        <div class="client-overview">
          <div class="overview-card">
            <h3>Client Overview</h3>
            <div class="overview-stats">
              <div class="stat">
                <span class="stat-label">Total Clients</span>
                <span class="stat-value">${data.totalClients || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Active Clients</span>
                <span class="stat-value">${data.activeClients || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">New This Period</span>
                <span class="stat-value">+${data.newClients || 0}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Retention Rate</span>
                <span class="stat-value">${data.retentionRate || 0}%</span>
              </div>
            </div>
          </div>
          
          <div class="chart-container">
            <h3>Client Distribution</h3>
            <canvas id="client-distribution-chart"></canvas>
          </div>
        </div>
        
        <div class="client-value">
          <h3>Client Lifetime Value</h3>
          <div class="value-chart">
            <canvas id="client-ltv-chart"></canvas>
          </div>
        </div>
        
        <div class="top-clients">
          <h3>Top Clients by Revenue</h3>
          ${this.renderTopClientsTable(data.topClients || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render phases report
   */
  renderPhasesReport() {
    const data = this.reportData;
    
    return `
      <div class="phases-report">
        <div class="phase-overview">
          <h3>Phase Analysis</h3>
          <div class="phase-grid">
            ${this.renderPhaseCards(data.phaseBreakdown || [])}
          </div>
        </div>
        
        <div class="phase-charts">
          <div class="chart-container">
            <h3>Average Time per Phase</h3>
            <canvas id="phase-duration-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Phase Completion Rates</h3>
            <canvas id="phase-completion-chart"></canvas>
          </div>
        </div>
        
        <div class="phase-bottlenecks">
          <h3>Phase Bottlenecks</h3>
          ${this.renderBottlenecksTable(data.bottlenecks || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render files report
   */
  renderFilesReport() {
    const data = this.reportData;
    
    return `
      <div class="files-report">
        <div class="storage-overview">
          <div class="storage-card">
            <h3>Storage Usage</h3>
            <div class="storage-meter">
              <div class="meter-fill" style="width: ${data.storageUsagePercent || 0}%"></div>
            </div>
            <div class="storage-stats">
              <span>${this.formatFileSize(data.usedStorage || 0)} / ${this.formatFileSize(data.totalStorage || 0)}</span>
            </div>
          </div>
          
          <div class="file-stats">
            <div class="stat">
              <span class="stat-label">Total Files</span>
              <span class="stat-value">${data.totalFiles || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">This Period</span>
              <span class="stat-value">+${data.newFiles || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Avg Size</span>
              <span class="stat-value">${this.formatFileSize(data.avgFileSize || 0)}</span>
            </div>
          </div>
        </div>
        
        <div class="file-charts">
          <div class="chart-container">
            <h3>Files by Type</h3>
            <canvas id="file-type-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>Upload Activity</h3>
            <canvas id="file-upload-chart"></canvas>
          </div>
        </div>
        
        <div class="large-files">
          <h3>Largest Files</h3>
          ${this.renderLargeFilesTable(data.largestFiles || [])}
        </div>
      </div>
    `;
  }

  /**
   * Render activity feed
   */
  renderActivityFeed(activities) {
    if (activities.length === 0) {
      return '<p class="no-activity">No recent activity</p>';
    }

    return `
      <div class="activity-feed">
        ${activities.map(activity => `
          <div class="activity-item">
            <div class="activity-icon ${activity.type}">
              ${this.getActivityIcon(activity.type)}
            </div>
            <div class="activity-content">
              <p>${activity.description}</p>
              <span class="activity-time">${this.formatRelativeTime(activity.created_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render revenue table
   */
  renderRevenueTable(sources) {
    if (sources.length === 0) {
      return '<p>No revenue data available</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Projects</th>
            <th>Revenue</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${sources.map(source => `
            <tr>
              <td>${source.name}</td>
              <td>${source.projectCount}</td>
              <td>$${this.formatNumber(source.revenue)}</td>
              <td>
                <div class="percentage-bar">
                  <div class="percentage-fill" style="width: ${source.percentage}%"></div>
                  <span>${source.percentage}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render project performance table
   */
  renderProjectPerformanceTable(projects) {
    if (projects.length === 0) {
      return '<p>No project data available</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${projects.map(project => `
            <tr>
              <td>${project.name}</td>
              <td>${project.client}</td>
              <td>${project.duration} days</td>
              <td><span class="status-badge status-${project.status}">${project.status}</span></td>
              <td>$${this.formatNumber(project.revenue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render top clients table
   */
  renderTopClientsTable(clients) {
    if (clients.length === 0) {
      return '<p>No client data available</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Projects</th>
            <th>Total Revenue</th>
            <th>Avg Project Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${clients.map(client => `
            <tr>
              <td>${client.name}</td>
              <td>${client.projectCount}</td>
              <td>$${this.formatNumber(client.totalRevenue)}</td>
              <td>$${this.formatNumber(client.avgProjectValue)}</td>
              <td><span class="status-badge status-${client.status}">${client.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render phase cards
   */
  renderPhaseCards(phases) {
    return phases.map((phase, index) => `
      <div class="phase-card">
        <div class="phase-number">${index + 1}</div>
        <h4>${phase.name}</h4>
        <div class="phase-stats">
          <div class="stat">
            <span>Active</span>
            <strong>${phase.activeCount}</strong>
          </div>
          <div class="stat">
            <span>Avg Time</span>
            <strong>${phase.avgDuration}d</strong>
          </div>
          <div class="stat">
            <span>Completion</span>
            <strong>${phase.completionRate}%</strong>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render bottlenecks table
   */
  renderBottlenecksTable(bottlenecks) {
    if (bottlenecks.length === 0) {
      return '<p>No bottlenecks detected</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Phase</th>
            <th>Avg Duration</th>
            <th>Expected Duration</th>
            <th>Delay</th>
            <th>Projects Affected</th>
          </tr>
        </thead>
        <tbody>
          ${bottlenecks.map(bottleneck => `
            <tr class="bottleneck-row">
              <td>${bottleneck.phase}</td>
              <td>${bottleneck.avgDuration} days</td>
              <td>${bottleneck.expectedDuration} days</td>
              <td class="text-danger">+${bottleneck.delay} days</td>
              <td>${bottleneck.affectedProjects}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render large files table
   */
  renderLargeFilesTable(files) {
    if (files.length === 0) {
      return '<p>No files found</p>';
    }

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Project</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          ${files.map(file => `
            <tr>
              <td>${file.name}</td>
              <td>${file.type}</td>
              <td>${this.formatFileSize(file.size)}</td>
              <td>${file.project || '-'}</td>
              <td>${this.formatDate(file.uploaded_at, { month: 'short', day: 'numeric' })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render schedule form
   */
  renderScheduleForm() {
    return `
      <form id="schedule-report-form" onsubmit="event.preventDefault(); admin.modules.reports.scheduleReport();">
        <div class="form-group">
          <label for="schedule-report-type">Report Type</label>
          <select id="schedule-report-type" name="report_type" required>
            <option value="overview">Overview Dashboard</option>
            <option value="revenue">Revenue Analysis</option>
            <option value="projects">Project Performance</option>
            <option value="clients">Client Analytics</option>
            <option value="phases">Phase Analysis</option>
            <option value="files">File Usage</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="schedule-frequency">Frequency</label>
          <select id="schedule-frequency" name="frequency" required>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="schedule-recipients">Recipients (comma-separated emails)</label>
          <input type="text" id="schedule-recipients" name="recipients" 
                 placeholder="admin@reprintstudios.com, team@reprintstudios.com" required>
        </div>
        
        <div class="form-group">
          <label for="schedule-format">Format</label>
          <select id="schedule-format" name="format" required>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="admin.modules.reports.closeScheduleModal()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Schedule Report
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Setup charts
   */
  setupCharts() {
    // This would initialize Chart.js or another charting library
    // For now, we'll add placeholder logic
    setTimeout(() => {
      this.renderCharts();
    }, 100);
  }

  /**
   * Render charts based on current report
   */
  renderCharts() {
    // Placeholder for chart rendering
    // In production, this would use Chart.js or similar
    console.log('Charts would be rendered here');
  }

  /**
   * Change report type
   */
  async changeReport(reportType) {
    this.currentReport = reportType;
    this.clearCache();
    await this.loadReportData();
    this.setupReportsInterface();
  }

  /**
   * Change date range
   */
  async changeDateRange(range) {
    this.dateRange = range;
    this.clearCache();
    await this.loadReportData();
    this.setupReportsInterface();
  }

  /**
   * Set custom dates
   */
  async setCustomDates() {
    const startDate = document.getElementById('custom-start-date').value;
    const endDate = document.getElementById('custom-end-date').value;
    
    if (startDate && endDate) {
      this.customStartDate = startDate;
      this.customEndDate = endDate;
      this.clearCache();
      await this.loadReportData();
      this.setupReportsInterface();
    }
  }

  /**
   * Export report
   */
  async exportReport() {
    try {
      const params = new URLSearchParams({
        report: this.currentReport,
        range: this.dateRange,
        format: 'pdf',
        ...(this.customStartDate && { start: this.customStartDate }),
        ...(this.customEndDate && { end: this.customEndDate })
      });
      
      const response = await this.apiRequest(`/analytics/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentReport}_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess('Report exported successfully');
      } else {
        this.showError('Failed to export report');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export report');
    }
  }

  /**
   * Show schedule modal
   */
  showScheduleModal() {
    document.getElementById('schedule-report-modal').classList.add('active');
  }

  /**
   * Close schedule modal
   */
  closeScheduleModal() {
    document.getElementById('schedule-report-modal').classList.remove('active');
    document.getElementById('schedule-report-form').reset();
  }

  /**
   * Schedule report
   */
  async scheduleReport() {
    const form = document.getElementById('schedule-report-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/analytics/schedule', {
        method: 'POST',
        body: JSON.stringify({
          report_type: formData.get('report_type'),
          frequency: formData.get('frequency'),
          recipients: formData.get('recipients').split(',').map(e => e.trim()),
          format: formData.get('format')
        })
      });
      
      if (response.ok) {
        this.showSuccess('Report scheduled successfully');
        this.closeScheduleModal();
      } else {
        this.showError('Failed to schedule report');
      }
      
    } catch (error) {
      console.error('Schedule failed:', error);
      this.showError('Failed to schedule report');
    }
  }

  /**
   * Get activity icon
   */
  getActivityIcon(type) {
    const icons = {
      'project_created': '📊',
      'invoice_paid': '💰',
      'client_added': '👥',
      'file_uploaded': '📄',
      'phase_completed': '✅',
      'message_sent': '💬'
    };
    return icons[type] || '📌';
  }

  /**
   * Format number
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    
    return this.formatDate(date, { month: 'short', day: 'numeric' });
  }

  /**
   * Refresh reports data
   */
  async refresh() {
    this.clearCache();
    await this.loadReportData();
    this.setupReportsInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('analytics_update', (data) => {
      // Real-time analytics updates
      this.refresh();
    });
  }
}