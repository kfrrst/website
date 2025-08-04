/**
 * MiroEmbed Component
 * Production-ready Miro whiteboarding integration for collaborative ideation
 * Used across multiple phases for visual collaboration and brainstorming
 */
import { BRAND } from '../../../config/brand.js';

export class MiroEmbed {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    
    // Component state
    this.currentBoard = null;
    this.boards = [];
    this.boardMembers = [];
    this.boardActivity = [];
    this.isLoading = false;
    this.error = null;
    this.viewMode = 'board'; // board, activity, settings
    this.permissions = null;
    
    // Miro API configuration
    this.miroApiBase = 'https://api.miro.com/v2';
    this.embedContainer = null;
    this.lastActivityCheck = null;
    
    // Real-time activity tracking
    this.activityPollingInterval = null;
    this.activityUpdateInterval = 30000; // 30 seconds
    
    // Initialize WebSocket for real-time updates if available
    this.initializeWebSocket();
  }

  async render(container) {
    this.container = container;
    
    container.innerHTML = `
      <div class="miro-embed-module">
        <div class="miro-header">
          <div class="header-content">
            <h2>
              <span class="miro-icon">🎯</span>
              Collaborative Whiteboard
            </h2>
            <p>Visual brainstorming and ideation space</p>
          </div>
          
          <div class="header-actions">
            <div class="view-tabs">
              <button class="tab-button ${this.viewMode === 'board' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.miroembed.setViewMode('board')"
                      data-tooltip="Whiteboard view">
                Board
              </button>
              <button class="tab-button ${this.viewMode === 'activity' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.miroembed.setViewMode('activity')"
                      data-tooltip="Recent activity">
                Activity
                ${this.boardActivity.length > 0 ? `<span class="activity-count">${this.boardActivity.length}</span>` : ''}
              </button>
              <button class="tab-button ${this.viewMode === 'settings' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.miroembed.setViewMode('settings')"
                      data-tooltip="Board settings">
                Settings
              </button>
            </div>
            
            <div class="board-actions">
              <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.createNewBoard()"
                      ${this.isLoading ? 'disabled' : ''}>
                <span class="btn-icon">+</span>
                New Board
              </button>
              <button class="btn-primary" onclick="window.portal.modules.phases.miroembed.openInMiro()"
                      ${!this.currentBoard || this.isLoading ? 'disabled' : ''}>
                <span class="btn-icon">↗</span>
                Open in Miro
              </button>
            </div>
          </div>
        </div>

        <div class="miro-toolbar">
          <div class="board-selector">
            <label for="board-select">Active Board:</label>
            <select id="board-select" onchange="window.portal.modules.phases.miroembed.selectBoard(this.value)"
                    ${this.isLoading ? 'disabled' : ''}>
              <option value="">Select a board</option>
              ${this.boards.map(board => `
                <option value="${board.id}" ${this.currentBoard?.id === board.id ? 'selected' : ''}>
                  ${board.name} ${board.policy.sharingPolicy.access === 'private' ? '🔒' : '🌐'}
                </option>
              `).join('')}
            </select>
          </div>

          ${this.currentBoard ? `
            <div class="board-info">
              <div class="board-stats">
                <span class="stat-item" data-tooltip="Board members">
                  <span class="stat-icon">👥</span>
                  ${this.boardMembers.length}
                </span>
                <span class="stat-item" data-tooltip="Last updated">
                  <span class="stat-icon">🕐</span>
                  ${this.formatDate(this.currentBoard.modifiedAt)}
                </span>
                <span class="stat-item" data-tooltip="Board access">
                  <span class="stat-icon">${this.currentBoard.policy.sharingPolicy.access === 'private' ? '🔒' : '🌐'}</span>
                  ${this.currentBoard.policy.sharingPolicy.access}
                </span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="miro-content">
          ${this.renderContent()}
        </div>

        <div class="miro-status-bar">
          <div class="status-left">
            ${this.error ? `<span class="error-indicator">⚠ ${this.error}</span>` : ''}
            ${this.isLoading ? '<span class="loading-indicator">⟳ Loading...</span>' : ''}
          </div>
          <div class="status-right">
            ${this.currentBoard ? `
              <span class="board-id" data-tooltip="Board ID for sharing">ID: ${this.currentBoard.id}</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Initialize the component
    await this.initialize();
  }

  renderContent() {
    if (this.isLoading) {
      return this.renderLoadingState();
    }

    if (this.error) {
      return this.renderErrorState();
    }

    switch (this.viewMode) {
      case 'board':
        return this.renderBoardView();
      case 'activity':
        return this.renderActivityView();
      case 'settings':
        return this.renderSettingsView();
      default:
        return this.renderBoardView();
    }
  }

  renderLoadingState() {
    return `
      <div class="loading-state">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <h3>Loading Miro Integration</h3>
        <p>Connecting to your collaborative workspace...</p>
      </div>
    `;
  }

  renderErrorState() {
    return `
      <div class="error-state">
        <div class="error-icon">⚠</div>
        <h3>Connection Error</h3>
        <p>${this.error}</p>
        <div class="error-actions">
          <button class="btn-primary" onclick="window.portal.modules.phases.miroembed.retryConnection()">
            Retry Connection
          </button>
          <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.showSetupInstructions()">
            Setup Instructions
          </button>
        </div>
      </div>
    `;
  }

  renderBoardView() {
    if (!this.currentBoard) {
      return this.renderEmptyBoardState();
    }

    const embedUrl = this.buildEmbedUrl(this.currentBoard);
    
    return `
      <div class="board-view">
        <div class="board-embed-container">
          <iframe 
            id="miro-board-iframe"
            src="${embedUrl}"
            width="100%" 
            height="800"
            frameborder="0" 
            scrolling="no" 
            allowfullscreen
            allow="clipboard-read; clipboard-write">
          </iframe>
          
          <div class="embed-overlay ${this.permissions?.canEdit ? '' : 'view-only'}">
            ${!this.permissions?.canEdit ? `
              <div class="view-only-banner">
                <span class="banner-icon">👁</span>
                View Only Mode - Contact your project manager for edit access
              </div>
            ` : ''}
          </div>
        </div>

        <div class="board-sidebar">
          <div class="sidebar-section">
            <h4>Board Members</h4>
            <div class="members-list">
              ${this.boardMembers.map(member => `
                <div class="member-item">
                  <img src="${member.picture || '/assets/default-avatar.png'}" 
                       alt="${member.name}" class="member-avatar">
                  <div class="member-info">
                    <span class="member-name">${member.name}</span>
                    <span class="member-role">${member.role}</span>
                  </div>
                  <span class="member-status ${member.isOnline ? 'online' : 'offline'}"></span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="sidebar-section">
            <h4>Quick Actions</h4>
            <div class="quick-actions">
              <button class="action-btn" onclick="window.portal.modules.phases.miroembed.addStickyNote()"
                      ${!this.permissions?.canEdit ? 'disabled' : ''}>
                <span class="action-icon">📝</span>
                Add Sticky Note
              </button>
              <button class="action-btn" onclick="window.portal.modules.phases.miroembed.addShape()"
                      ${!this.permissions?.canEdit ? 'disabled' : ''}>
                <span class="action-icon">⭕</span>
                Add Shape
              </button>
              <button class="action-btn" onclick="window.portal.modules.phases.miroembed.addConnector()"
                      ${!this.permissions?.canEdit ? 'disabled' : ''}>
                <span class="action-icon">↔</span>
                Add Connector
              </button>
              <button class="action-btn" onclick="window.portal.modules.phases.miroembed.takeScreenshot()">
                <span class="action-icon">📷</span>
                Screenshot
              </button>
            </div>
          </div>

          <div class="sidebar-section">
            <h4>Export Options</h4>
            <div class="export-actions">
              <button class="export-btn" onclick="window.portal.modules.phases.miroembed.exportBoard('pdf')">
                <span class="export-icon">📄</span>
                Export PDF
              </button>
              <button class="export-btn" onclick="window.portal.modules.phases.miroembed.exportBoard('image')">
                <span class="export-icon">🖼</span>
                Export Image
              </button>
              <button class="export-btn" onclick="window.portal.modules.phases.miroembed.shareBoard()">
                <span class="export-icon">🔗</span>
                Share Link
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyBoardState() {
    return `
      <div class="empty-board-state">
        <div class="empty-icon">🎨</div>
        <h3>No Active Board</h3>
        <p>Create a new collaborative whiteboard or select an existing one to get started</p>
        <div class="empty-actions">
          <button class="btn-primary" onclick="window.portal.modules.phases.miroembed.createNewBoard()">
            <span class="btn-icon">+</span>
            Create New Board
          </button>
          <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.browseTemplates()">
            <span class="btn-icon">📋</span>
            Browse Templates
          </button>
        </div>
      </div>
    `;
  }

  renderActivityView() {
    return `
      <div class="activity-view">
        <div class="activity-header">
          <h3>Recent Board Activity</h3>
          <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.refreshActivity()">
            <span class="btn-icon">🔄</span>
            Refresh
          </button>
        </div>

        <div class="activity-list">
          ${this.boardActivity.length === 0 ? `
            <div class="no-activity">
              <p>No recent activity on this board</p>
            </div>
          ` : this.boardActivity.map(activity => `
            <div class="activity-item">
              <div class="activity-avatar">
                <img src="${activity.user.picture || '/assets/default-avatar.png'}" 
                     alt="${activity.user.name}">
              </div>
              <div class="activity-content">
                <div class="activity-description">
                  <strong>${activity.user.name}</strong> ${activity.action}
                  ${activity.itemName ? `"${activity.itemName}"` : ''}
                </div>
                <div class="activity-time">${this.formatDate(activity.createdAt)}</div>
              </div>
              <div class="activity-type">
                <span class="type-badge ${activity.type}">${this.getActivityIcon(activity.type)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="activity-filters">
          <h4>Filter Activity</h4>
          <div class="filter-buttons">
            <button class="filter-btn active" onclick="window.portal.modules.phases.miroembed.filterActivity('all')">
              All
            </button>
            <button class="filter-btn" onclick="window.portal.modules.phases.miroembed.filterActivity('created')">
              Created Items
            </button>
            <button class="filter-btn" onclick="window.portal.modules.phases.miroembed.filterActivity('updated')">
              Updates
            </button>
            <button class="filter-btn" onclick="window.portal.modules.phases.miroembed.filterActivity('comments')">
              Comments
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderSettingsView() {
    return `
      <div class="settings-view">
        <div class="settings-section">
          <h3>Board Configuration</h3>
          
          <div class="setting-group">
            <label class="setting-label">Board Name</label>
            <input type="text" id="board-name" value="${this.currentBoard?.name || ''}" 
                   placeholder="Enter board name"
                   ${!this.permissions?.canEdit ? 'readonly' : ''}>
            <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.updateBoardName()"
                    ${!this.permissions?.canEdit ? 'disabled' : ''}>
              Update
            </button>
          </div>

          <div class="setting-group">
            <label class="setting-label">Board Description</label>
            <textarea id="board-description" rows="3" 
                      placeholder="Describe this board's purpose"
                      ${!this.permissions?.canEdit ? 'readonly' : ''}>${this.currentBoard?.description || ''}</textarea>
            <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.updateBoardDescription()"
                    ${!this.permissions?.canEdit ? 'disabled' : ''}>
              Update
            </button>
          </div>
        </div>

        <div class="settings-section">
          <h3>Access & Permissions</h3>
          
          <div class="permission-grid">
            <div class="permission-item">
              <span class="permission-label">Your Access Level:</span>
              <span class="permission-value ${this.permissions?.role || 'viewer'}">${this.permissions?.role || 'Viewer'}</span>
            </div>
            <div class="permission-item">
              <span class="permission-label">Can Edit:</span>
              <span class="permission-value">${this.permissions?.canEdit ? 'Yes' : 'No'}</span>
            </div>
            <div class="permission-item">
              <span class="permission-label">Can Share:</span>
              <span class="permission-value">${this.permissions?.canShare ? 'Yes' : 'No'}</span>
            </div>
            <div class="permission-item">
              <span class="permission-label">Board Access:</span>
              <span class="permission-value">${this.currentBoard?.policy?.sharingPolicy?.access || 'Private'}</span>
            </div>
          </div>

          ${this.permissions?.canShare ? `
            <div class="sharing-controls">
              <h4>Share Board</h4>
              <div class="share-options">
                <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.shareWithClient()">
                  <span class="btn-icon">👤</span>
                  Share with Client
                </button>
                <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.shareWithTeam()">
                  <span class="btn-icon">👥</span>
                  Share with Team
                </button>
                <button class="btn-secondary" onclick="window.portal.modules.phases.miroembed.generateShareLink()">
                  <span class="btn-icon">🔗</span>
                  Generate Link
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="settings-section">
          <h3>Integration Settings</h3>
          
          <div class="integration-options">
            <div class="option-item">
              <input type="checkbox" id="auto-save" ${this.phaseData.autoSave ? 'checked' : ''}>
              <label for="auto-save">Auto-save board snapshots to project files</label>
            </div>
            <div class="option-item">
              <input type="checkbox" id="notifications" ${this.phaseData.notifications ? 'checked' : ''}>
              <label for="notifications">Receive notifications for board changes</label>
            </div>
            <div class="option-item">
              <input type="checkbox" id="activity-tracking" ${this.phaseData.activityTracking !== false ? 'checked' : ''}>
              <label for="activity-tracking">Track board activity in project timeline</label>
            </div>
          </div>

          <button class="btn-primary" onclick="window.portal.modules.phases.miroembed.saveIntegrationSettings()">
            Save Settings
          </button>
        </div>
      </div>
    `;
  }

  async initialize() {
    try {
      this.setLoading(true);
      this.clearError();

      // Load Miro boards for this project
      await this.loadProjectBoards();
      
      // Load board members and activity if we have a current board
      if (this.currentBoard) {
        await Promise.all([
          this.loadBoardMembers(),
          this.loadBoardActivity(),
          this.loadBoardPermissions()
        ]);
      }

      // Start activity polling
      this.startActivityPolling();

    } catch (error) {
      console.error('Error initializing Miro integration:', error);
      this.setError('Failed to initialize Miro integration. Please check your connection and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async loadProjectBoards() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to load boards`);
      }

      if (data.success) {
        this.boards = data.boards || [];
        
        // Set current board to the first one if none selected
        if (this.boards.length > 0 && !this.currentBoard) {
          this.currentBoard = this.boards[0];
        }
      } else {
        throw new Error(data.error || 'Failed to load Miro boards');
      }
    } catch (error) {
      console.error('Error loading project boards:', error);
      throw error;
    }
  }

  async loadBoardMembers() {
    if (!this.currentBoard) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/members`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.boardMembers = data.members || [];
      }
    } catch (error) {
      console.error('Error loading board members:', error);
    }
  }

  async loadBoardActivity() {
    if (!this.currentBoard) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/activity`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.boardActivity = data.activities || [];
        this.lastActivityCheck = new Date();
      }
    } catch (error) {
      console.error('Error loading board activity:', error);
    }
  }

  async loadBoardPermissions() {
    if (!this.currentBoard) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.permissions = data.permissions || { canEdit: false, canShare: false, role: 'viewer' };
      }
    } catch (error) {
      console.error('Error loading board permissions:', error);
      // Default to read-only permissions on error
      this.permissions = { canEdit: false, canShare: false, role: 'viewer' };
    }
  }

  async createNewBoard() {
    const boardName = prompt('Enter a name for the new board:', `${this.phaseData.name || 'Project'} Whiteboard`);
    if (!boardName) return;

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: boardName,
          description: `Collaborative whiteboard for ${this.phaseData.name || 'project phase'}`,
          policy: {
            sharingPolicy: {
              access: 'private'
            }
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to create board`);
      }

      if (data.success) {
        this.boards.push(data.board);
        this.currentBoard = data.board;
        
        // Load initial data for the new board
        await Promise.all([
          this.loadBoardMembers(),
          this.loadBoardPermissions()
        ]);
        
        this.portal.showNotification('Board created successfully!', 'success');
        this.refreshView();
      } else {
        throw new Error(data.error || 'Failed to create board');
      }
    } catch (error) {
      console.error('Error creating board:', error);
      this.portal.showNotification('Failed to create board. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async selectBoard(boardId) {
    if (!boardId || this.currentBoard?.id === boardId) return;

    try {
      this.setLoading(true);
      
      this.currentBoard = this.boards.find(board => board.id === boardId);
      
      if (this.currentBoard) {
        // Load data for the selected board
        await Promise.all([
          this.loadBoardMembers(),
          this.loadBoardActivity(),
          this.loadBoardPermissions()
        ]);
        
        this.refreshView();
      }
    } catch (error) {
      console.error('Error selecting board:', error);
      this.portal.showNotification('Failed to load selected board', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async exportBoard(format) {
    if (!this.currentBoard) return;

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ format })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Export failed`);
      }

      if (data.success && data.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `${this.currentBoard.name}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.portal.showNotification(`Board exported as ${format.toUpperCase()}`, 'success');
      } else {
        throw new Error(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting board:', error);
      this.portal.showNotification('Failed to export board. Please try again.', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async shareBoard() {
    if (!this.currentBoard || !this.permissions?.canShare) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access: 'view' // Can be 'view' or 'edit'
        })
      });

      const data = await response.json();
      
      if (data.success && data.shareUrl) {
        // Copy to clipboard
        await navigator.clipboard.writeText(data.shareUrl);
        this.portal.showNotification('Share link copied to clipboard!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error sharing board:', error);
      this.portal.showNotification('Failed to generate share link', 'error');
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.refreshView();
  }

  openInMiro() {
    if (!this.currentBoard) return;
    
    const miroUrl = `https://miro.com/app/board/${this.currentBoard.id}/`;
    window.open(miroUrl, '_blank', 'noopener,noreferrer');
  }

  buildEmbedUrl(board) {
    if (!board) return '';
    
    const baseUrl = `https://miro.com/app/embed/${board.id}/`;
    const params = new URLSearchParams({
      'pres': '1',
      'frameId': '3458764518384657486',
      'allowFullScreen': 'true'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  startActivityPolling() {
    if (this.activityPollingInterval) {
      clearInterval(this.activityPollingInterval);
    }
    
    this.activityPollingInterval = setInterval(() => {
      if (this.currentBoard && this.viewMode === 'activity') {
        this.loadBoardActivity();
      }
    }, this.activityUpdateInterval);
  }

  stopActivityPolling() {
    if (this.activityPollingInterval) {
      clearInterval(this.activityPollingInterval);
      this.activityPollingInterval = null;
    }
  }

  initializeWebSocket() {
    // Initialize WebSocket connection for real-time updates if available
    if (window.WebSocket && this.portal.websocket) {
      this.portal.websocket.on('miro_board_update', (data) => {
        if (data.boardId === this.currentBoard?.id) {
          this.handleRealTimeUpdate(data);
        }
      });
    }
  }

  handleRealTimeUpdate(data) {
    // Handle real-time board updates
    switch (data.type) {
      case 'member_joined':
      case 'member_left':
        this.loadBoardMembers();
        break;
      case 'board_updated':
        this.loadBoardActivity();
        break;
      case 'board_shared':
        this.loadBoardPermissions();
        break;
    }
    
    // Update UI if we're in the activity view
    if (this.viewMode === 'activity') {
      this.refreshView();
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
  }

  setError(error) {
    this.error = error;
  }

  clearError() {
    this.error = null;
  }

  refreshView() {
    if (this.container) {
      this.render(this.container);
    }
  }

  getActivityIcon(type) {
    const icons = {
      'created': '➕',
      'updated': '✏️',
      'deleted': '🗑️',
      'commented': '💬',
      'shared': '🔗',
      'exported': '📤'
    };
    return icons[type] || '📝';
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Additional production methods
  async retryConnection() {
    this.clearError();
    await this.initialize();
  }

  showSetupInstructions() {
    const instructions = `
      <div class="setup-instructions">
        <h3>Miro Integration Setup</h3>
        <p>To connect your Miro boards, follow these steps:</p>
        <ol>
          <li>Ensure your Miro account is connected to this project</li>
          <li>Verify you have access to the Miro workspace</li>
          <li>Check your internet connection</li>
          <li>Contact support if issues persist</li>
        </ol>
        <button class="btn-primary" onclick="this.parentElement.remove()">Close</button>
      </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = instructions;
    document.body.appendChild(modal);
  }

  async addStickyNote() {
    if (!this.currentBoard || !this.permissions?.canEdit) return;
    
    const noteText = prompt('Enter sticky note text:');
    if (!noteText) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'sticky_note',
          content: noteText,
          position: { x: 0, y: 0 }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Sticky note added successfully!', 'success');
        await this.loadBoardActivity();
      } else {
        throw new Error(data.error || 'Failed to add sticky note');
      }
    } catch (error) {
      console.error('Error adding sticky note:', error);
      this.portal.showNotification('Failed to add sticky note', 'error');
    }
  }

  async addShape() {
    if (!this.currentBoard || !this.permissions?.canEdit) return;
    
    const shapes = ['rectangle', 'circle', 'triangle', 'diamond'];
    const shape = prompt(`Select shape (${shapes.join(', ')}):`, 'rectangle');
    if (!shape || !shapes.includes(shape)) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'shape',
          shape: shape,
          position: { x: 0, y: 0 },
          width: 100,
          height: 100
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification(`${shape} shape added successfully!`, 'success');
        await this.loadBoardActivity();
      } else {
        throw new Error(data.error || 'Failed to add shape');
      }
    } catch (error) {
      console.error('Error adding shape:', error);
      this.portal.showNotification('Failed to add shape', 'error');
    }
  }

  async addConnector() {
    if (!this.currentBoard || !this.permissions?.canEdit) return;
    
    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'connector',
          startPosition: { x: 0, y: 0 },
          endPosition: { x: 100, y: 100 }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Connector added successfully!', 'success');
        await this.loadBoardActivity();
      } else {
        throw new Error(data.error || 'Failed to add connector');
      }
    } catch (error) {
      console.error('Error adding connector:', error);
      this.portal.showNotification('Failed to add connector', 'error');
    }
  }

  async takeScreenshot() {
    if (!this.currentBoard) return;

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Screenshot failed`);
      }

      if (data.success && data.imageUrl) {
        // Open screenshot in new tab
        window.open(data.imageUrl, '_blank');
        this.portal.showNotification('Screenshot captured successfully!', 'success');
      } else {
        throw new Error(data.error || 'Screenshot failed');
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      this.portal.showNotification('Failed to capture screenshot', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async browseTemplates() {
    try {
      const response = await fetch(`/api/miro/templates`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.templates) {
        this.showTemplateSelector(data.templates);
      } else {
        throw new Error(data.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      this.portal.showNotification('Failed to load templates', 'error');
    }
  }

  showTemplateSelector(templates) {
    const templateHtml = `
      <div class="template-selector">
        <h3>Choose a Template</h3>
        <div class="template-grid">
          ${templates.map(template => `
            <div class="template-item" onclick="window.portal.modules.phases.miroembed.createFromTemplate('${template.id}')">
              <img src="${template.thumbnail}" alt="${template.name}">
              <h4>${template.name}</h4>
              <p>${template.description}</p>
            </div>
          `).join('')}
        </div>
        <button class="btn-secondary" onclick="this.parentElement.remove()">Cancel</button>
      </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = templateHtml;
    document.body.appendChild(modal);
  }

  async createFromTemplate(templateId) {
    const boardName = prompt('Enter a name for the new board:', `${this.phaseData.name || 'Project'} Board`);
    if (!boardName) return;

    try {
      this.setLoading(true);
      
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/from-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: templateId,
          name: boardName,
          description: `Board created from template for ${this.phaseData.name || 'project phase'}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.boards.push(data.board);
        this.currentBoard = data.board;
        
        // Load initial data for the new board
        await Promise.all([
          this.loadBoardMembers(),
          this.loadBoardPermissions()
        ]);
        
        this.portal.showNotification('Board created from template successfully!', 'success');
        this.refreshView();
        
        // Close template modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
      } else {
        throw new Error(data.error || 'Failed to create board from template');
      }
    } catch (error) {
      console.error('Error creating board from template:', error);
      this.portal.showNotification('Failed to create board from template', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async refreshActivity() {
    if (this.currentBoard) {
      await this.loadBoardActivity();
      this.refreshView();
      this.portal.showNotification('Activity refreshed', 'success');
    }
  }

  filterActivity(type) {
    // Update active filter button
    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = this.container.querySelector(`button[onclick*="'${type}'"]`);
    if (activeButton) activeButton.classList.add('active');

    // Filter activity items
    const activityItems = this.container.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
      const typeElement = item.querySelector('.type-badge');
      if (!typeElement) return;
      
      if (type === 'all') {
        item.style.display = 'flex';
      } else {
        const itemType = Array.from(typeElement.classList).find(cls => 
          ['created', 'updated', 'deleted', 'commented', 'shared', 'exported'].includes(cls)
        );
        item.style.display = itemType === type ? 'flex' : 'none';
      }
    });
  }

  async updateBoardName() {
    if (!this.currentBoard || !this.permissions?.canEdit) return;
    
    const nameInput = this.container.querySelector('#board-name');
    const newName = nameInput?.value?.trim();
    
    if (!newName || newName === this.currentBoard.name) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentBoard.name = newName;
        this.portal.showNotification('Board name updated successfully!', 'success');
        this.refreshView();
      } else {
        throw new Error(data.error || 'Failed to update board name');
      }
    } catch (error) {
      console.error('Error updating board name:', error);
      this.portal.showNotification('Failed to update board name', 'error');
    }
  }

  async updateBoardDescription() {
    if (!this.currentBoard || !this.permissions?.canEdit) return;
    
    const descInput = this.container.querySelector('#board-description');
    const newDescription = descInput?.value?.trim();
    
    if (newDescription === this.currentBoard.description) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: newDescription })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentBoard.description = newDescription;
        this.portal.showNotification('Board description updated successfully!', 'success');
        this.refreshView();
      } else {
        throw new Error(data.error || 'Failed to update board description');
      }
    } catch (error) {
      console.error('Error updating board description:', error);
      this.portal.showNotification('Failed to update board description', 'error');
    }
  }

  async shareWithClient() {
    if (!this.currentBoard || !this.permissions?.canShare) return;
    
    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/share-with-client`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Board shared with client successfully!', 'success');
        await this.loadBoardMembers();
        this.refreshView();
      } else {
        throw new Error(data.error || 'Failed to share board with client');
      }
    } catch (error) {
      console.error('Error sharing with client:', error);
      this.portal.showNotification('Failed to share board with client', 'error');
    }
  }

  async shareWithTeam() {
    if (!this.currentBoard || !this.permissions?.canShare) return;
    
    try {
      const response = await fetch(`/api/projects/${this.projectId}/miro/boards/${this.currentBoard.id}/share-with-team`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Board shared with team successfully!', 'success');
        await this.loadBoardMembers();
        this.refreshView();
      } else {
        throw new Error(data.error || 'Failed to share board with team');
      }
    } catch (error) {
      console.error('Error sharing with team:', error);
      this.portal.showNotification('Failed to share board with team', 'error');
    }
  }

  async generateShareLink() {
    await this.shareBoard(); // Reuse existing shareBoard method
  }

  async saveIntegrationSettings() {
    const autoSave = this.container.querySelector('#auto-save')?.checked;
    const notifications = this.container.querySelector('#notifications')?.checked;
    const activityTracking = this.container.querySelector('#activity-tracking')?.checked;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/phases/${this.phaseData.key}/miro-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoSave,
          notifications,
          activityTracking
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.phaseData.autoSave = autoSave;
        this.phaseData.notifications = notifications;
        this.phaseData.activityTracking = activityTracking;
        
        this.portal.showNotification('Integration settings saved successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving integration settings:', error);
      this.portal.showNotification('Failed to save integration settings', 'error');
    }
  }

  // Cleanup method called when component is destroyed
  destroy() {
    this.stopActivityPolling();
    
    if (this.portal.websocket) {
      this.portal.websocket.off('miro_board_update');
    }
  }
}

export default MiroEmbed;