import { BRAND } from '../config/brand.js';

/**
 * PhaseTimeline Component - Displays activity timeline for project phases
 * Production-ready component with real-time updates and activity filtering
 */
export class PhaseTimeline {
  constructor(options = {}) {
    this.options = {
      container: null,
      projectId: null,
      phaseId: null,
      activities: [],
      showFilters: true,
      maxItems: 50,
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      onActivityClick: null,
      authToken: null,
      currentUserId: null,
      ...options
    };
    
    this.isLoading = false;
    this.error = null;
    this.refreshTimer = null;
    this.currentFilter = 'all';
  }

  /**
   * Render the timeline component
   */
  render() {
    if (!this.options.container) {
      console.error('PhaseTimeline: Missing required container');
      return;
    }

    const container = this.options.container;
    container.innerHTML = this.generateHTML();
    container.className = 'phase-timeline-container';
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Start auto-refresh if enabled
    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Generate timeline HTML
   */
  generateHTML() {
    const { activities, showFilters } = this.options;
    
    return `
      <div class="phase-timeline">
        ${this.renderHeader()}
        ${showFilters ? this.renderFilters() : ''}
        ${this.renderTimelineContent(activities)}
        ${this.isLoading ? this.renderLoadingOverlay() : ''}
        ${this.error ? this.renderError() : ''}
      </div>
    `;
  }

  /**
   * Render timeline header
   */
  renderHeader() {
    const { activities } = this.options;
    const activityCount = activities.length;
    
    return `
      <div class="timeline-header">
        <div class="timeline-title-group">
          <h4 class="timeline-title">Activity Timeline</h4>
          <span class="timeline-count">${activityCount} activit${activityCount !== 1 ? 'ies' : 'y'}</span>
        </div>
        <div class="timeline-actions">
          <button class="btn-refresh" title="Refresh timeline">
            <span class="refresh-icon">⟲</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render activity filters
   */
  renderFilters() {
    const filters = [
      { key: 'all', label: 'All Activities', icon: '📋' },
      { key: 'file_upload', label: 'File Uploads', icon: '📁' },
      { key: 'phase_transition', label: 'Phase Changes', icon: '🔄' },
      { key: 'approval', label: 'Approvals', icon: '✅' },
      { key: 'comment', label: 'Comments', icon: '💬' },
      { key: 'system', label: 'System', icon: '⚙️' }
    ];
    
    return `
      <div class="timeline-filters">
        ${filters.map(filter => `
          <button class="filter-btn ${this.currentFilter === filter.key ? 'active' : ''}" data-filter="${filter.key}">
            <span class="filter-icon">${filter.icon}</span>
            <span class="filter-label">${filter.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render timeline content
   */
  renderTimelineContent(activities) {
    if (!activities || activities.length === 0) {
      return this.renderEmptyState();
    }

    const filteredActivities = this.filterActivities(activities);
    
    if (filteredActivities.length === 0) {
      return this.renderEmptyFilterState();
    }

    return `
      <div class="timeline-content">
        <div class="timeline-list">
          ${filteredActivities.map((activity, index) => this.renderActivity(activity, index)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual activity
   */
  renderActivity(activity, index) {
    const timeAgo = this.getTimeAgo(activity.created_at);
    const activityIcon = this.getActivityIcon(activity.activity_type);
    const activityColor = this.getActivityColor(activity.activity_type);
    const isOwnActivity = activity.user_id === this.options.currentUserId;
    
    return `
      <div class="timeline-item ${activity.activity_type}" data-activity-id="${activity.id}">
        <div class="timeline-marker" style="background-color: ${activityColor};">
          <span class="timeline-icon">${activityIcon}</span>
        </div>
        <div class="timeline-content-item">
          <div class="timeline-header-item">
            <div class="timeline-meta">
              <span class="timeline-user ${isOwnActivity ? 'own-activity' : ''}">${this.escapeHtml(activity.user_name || 'System')}</span>
              <span class="timeline-time" title="${new Date(activity.created_at).toLocaleString()}">${timeAgo}</span>
            </div>
            ${activity.activity_type !== 'system' ? this.renderActivityActions(activity) : ''}
          </div>
          <div class="timeline-description">
            ${this.formatActivityDescription(activity)}
          </div>
          ${activity.metadata ? this.renderActivityMetadata(activity.metadata) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render activity actions (reply, like, etc.)
   */
  renderActivityActions(activity) {
    return `
      <div class="timeline-actions-item">
        <button class="btn-timeline-action" data-action="reply" data-activity-id="${activity.id}" title="Reply">
          <span class="action-icon">💬</span>
        </button>
        <button class="btn-timeline-action" data-action="like" data-activity-id="${activity.id}" title="Like">
          <span class="action-icon">👍</span>
          ${activity.likes_count ? `<span class="action-count">${activity.likes_count}</span>` : ''}
        </button>
      </div>
    `;
  }

  /**
   * Render activity metadata
   */
  renderActivityMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') return '';
    
    let metadataHtml = '';
    
    // File-related metadata
    if (metadata.file_name) {
      metadataHtml += `
        <div class="timeline-metadata">
          <span class="metadata-label">File:</span>
          <span class="metadata-value">${this.escapeHtml(metadata.file_name)}</span>
          ${metadata.file_size ? `<span class="metadata-size">(${this.formatFileSize(metadata.file_size)})</span>` : ''}
        </div>
      `;
    }
    
    // Phase-related metadata
    if (metadata.from_phase && metadata.to_phase) {
      metadataHtml += `
        <div class="timeline-metadata">
          <span class="metadata-label">Transition:</span>
          <span class="metadata-value">${this.escapeHtml(metadata.from_phase)} → ${this.escapeHtml(metadata.to_phase)}</span>
        </div>
      `;
    }
    
    // Duration metadata
    if (metadata.duration) {
      metadataHtml += `
        <div class="timeline-metadata">
          <span class="metadata-label">Duration:</span>
          <span class="metadata-value">${metadata.duration}</span>
        </div>
      `;
    }
    
    return metadataHtml ? `<div class="timeline-metadata-container">${metadataHtml}</div>` : '';
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="timeline-empty">
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <h4 class="empty-title">No activity yet</h4>
          <p class="empty-message">Activity will appear here as the project progresses.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render empty filter state
   */
  renderEmptyFilterState() {
    return `
      <div class="timeline-empty">
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <h4 class="empty-title">No activities match filter</h4>
          <p class="empty-message">Try selecting a different activity type or clear the filter.</p>
          <button class="btn-clear-filter">Show All Activities</button>
        </div>
      </div>
    `;
  }

  /**
   * Render loading overlay
   */
  renderLoadingOverlay() {
    return `
      <div class="timeline-loading-overlay">
        <div class="loading-spinner"></div>
        <span>Loading activity...</span>
      </div>
    `;
  }

  /**
   * Render error message
   */
  renderError() {
    return `
      <div class="timeline-error">
        <span class="error-icon">⚠</span>
        <span class="error-message">${this.escapeHtml(this.error)}</span>
        <button class="btn-retry">Retry</button>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = this.options.container;
    
    // Refresh button
    const refreshBtn = container.querySelector('.btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshTimeline());
    }
    
    // Filter buttons
    const filterBtns = container.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.setFilter(filter);
      });
    });
    
    // Clear filter button
    const clearFilterBtn = container.querySelector('.btn-clear-filter');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => this.setFilter('all'));
    }
    
    // Activity actions
    const actionBtns = container.querySelectorAll('.btn-timeline-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const activityId = e.currentTarget.dataset.activityId;
        this.handleActivityAction(action, activityId);
      });
    });
    
    // Activity items
    const activityItems = container.querySelectorAll('.timeline-item');
    activityItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-timeline-action')) return; // Skip if clicking action button
        
        const activityId = item.dataset.activityId;
        if (this.options.onActivityClick) {
          this.options.onActivityClick(activityId);
        }
      });
    });
    
    // Retry button
    const retryBtn = container.querySelector('.btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.clearError();
        this.refreshTimeline();
      });
    }
  }

  /**
   * Filter activities based on current filter
   */
  filterActivities(activities) {
    if (this.currentFilter === 'all') {
      return activities;
    }
    
    return activities.filter(activity => activity.activity_type === this.currentFilter);
  }

  /**
   * Set activity filter
   */
  setFilter(filter) {
    this.currentFilter = filter;
    this.render();
  }

  /**
   * Handle activity actions (reply, like, etc.)
   */
  async handleActivityAction(action, activityId) {
    try {
      console.log(`${action} action on activity:`, activityId);
      
      if (action === 'reply') {
        // Open reply modal or expand reply area
        this.showReplyDialog(activityId);
      } else if (action === 'like') {
        // Toggle like on activity
        await this.toggleActivityLike(activityId);
      }
    } catch (error) {
      console.error('Activity action error:', error);
      this.setError(`Failed to ${action} activity.`);
    }
  }

  /**
   * Show reply dialog
   */
  showReplyDialog(activityId) {
    const reply = prompt('Enter your reply:');
    if (reply && reply.trim()) {
      this.addActivityReply(activityId, reply.trim());
    }
  }

  /**
   * Add reply to activity
   */
  async addActivityReply(activityId, replyText) {
    try {
      const response = await fetch(`/api/activities/${activityId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reply: replyText })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add reply');
      }
      
      // Refresh timeline to show new reply
      this.refreshTimeline();
    } catch (error) {
      console.error('Reply error:', error);
      this.setError('Failed to add reply.');
    }
  }

  /**
   * Toggle activity like
   */
  async toggleActivityLike(activityId) {
    try {
      const response = await fetch(`/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }
      
      // Refresh timeline to show updated like count
      this.refreshTimeline();
    } catch (error) {
      console.error('Like error:', error);
      this.setError('Failed to update like.');
    }
  }

  /**
   * Refresh timeline data
   */
  async refreshTimeline() {
    try {
      this.setLoading(true);
      this.clearError();
      
      const endpoint = this.options.phaseId 
        ? `/api/phases/${this.options.phaseId}/activities`
        : `/api/projects/${this.options.projectId}/activities`;
        
      const response = await fetch(`${endpoint}?limit=${this.options.maxItems}`, {
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load activities');
      }
      
      const data = await response.json();
      this.options.activities = data.activities || [];
      this.render();
      
    } catch (error) {
      console.error('Timeline refresh error:', error);
      this.setError('Failed to refresh timeline.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh() {
    this.stopAutoRefresh(); // Clear any existing timer
    
    this.refreshTimer = setInterval(() => {
      this.refreshTimeline();
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Utility functions
   */
  
  getActivityIcon(activityType) {
    const icons = {
      'file_upload': '📁',
      'file_download': '⬇️',
      'file_delete': '🗑️',
      'phase_transition': '🔄',
      'phase_approval': '✅',
      'phase_rejection': '❌',
      'comment': '💬',
      'project_created': '🎯',
      'project_updated': '📝',
      'user_joined': '👋',
      'user_left': '👋',
      'system': '⚙️'
    };
    
    return icons[activityType] || '📝';
  }

  getActivityColor(activityType) {
    const colors = {
      'file_upload': BRAND.colors.blue,
      'file_download': BRAND.colors.green,
      'file_delete': BRAND.colors.red,
      'phase_transition': BRAND.colors.purple,
      'phase_approval': BRAND.colors.green,
      'phase_rejection': BRAND.colors.red,
      'comment': BRAND.colors.yellow,
      'project_created': BRAND.colors.blue,
      'project_updated': BRAND.colors.blue,
      'user_joined': BRAND.colors.green,
      'user_left': BRAND.colors.orange,
      'system': BRAND.colors.textSecondary
    };
    
    return colors[activityType] || BRAND.colors.textSecondary;
  }

  formatActivityDescription(activity) {
    let description = this.escapeHtml(activity.description);
    
    // Add emphasis to key terms
    description = description.replace(/(\w+\.(jpg|jpeg|png|gif|pdf|doc|docx|xlsx|zip))/gi, '<strong>$1</strong>');
    description = description.replace(/(approved|rejected|completed|started)/gi, '<strong>$1</strong>');
    
    return description;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return time.toLocaleDateString();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.render();
  }

  setError(error) {
    this.error = error;
    this.render();
  }

  clearError() {
    this.error = null;
  }

  /**
   * Cleanup when component is destroyed
   */
  destroy() {
    this.stopAutoRefresh();
  }
}