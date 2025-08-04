import { BRAND } from '../config/brand.js';
import { FeedbackModal } from './FeedbackModal.js';

/**
 * PhaseCard Component - Displays project phase information with actions
 * Production-ready component with full error handling and real data
 */
export class PhaseCard {
  constructor(options = {}) {
    this.options = {
      container: null,
      phase: null,
      deliverables: [],
      isActive: false,
      onApprove: null,
      onRequestChanges: null,
      onFileDownload: null,
      commentCount: 0,
      isAdmin: false,
      authToken: null,
      completedActions: 0,
      totalActions: 0,
      progressPercentage: 0,
      deadline: null,
      clientActions: [],
      activityCount: 0,
      isLocked: false,
      previousPhaseComplete: true,
      ...options
    };
    
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Get status configuration for visual styling
   */
  getStatusConfig(status) {
    const configs = {
      'not_started': {
        label: 'Not Started',
        icon: '○',
        className: 'status-not-started',
        color: BRAND.colors.textSecondary,
        bgColor: 'rgba(102, 102, 102, 0.1)',
        priority: 0
      },
      'in_progress': {
        label: 'In Progress',
        icon: '◐',
        className: 'status-in-progress', 
        color: BRAND.colors.yellow,
        bgColor: 'rgba(247, 198, 0, 0.1)',
        priority: 2
      },
      'awaiting_approval': {
        label: 'Awaiting Approval',
        icon: '!',
        className: 'status-awaiting-approval',
        color: BRAND.colors.blue,
        bgColor: 'rgba(0, 87, 255, 0.1)',
        priority: 3
      },
      'completed': {
        label: 'Completed',
        icon: '✓',
        className: 'status-completed',
        color: BRAND.colors.green,
        bgColor: 'rgba(39, 174, 96, 0.1)',
        priority: 1
      },
      'changes_requested': {
        label: 'Changes Requested',
        icon: '✏',
        className: 'status-changes-requested',
        color: BRAND.colors.red,
        bgColor: 'rgba(230, 57, 70, 0.1)',
        priority: 4
      },
      'on_hold': {
        label: 'On Hold',
        icon: '⏸',
        className: 'status-on-hold',
        color: BRAND.colors.graphite,
        bgColor: 'rgba(102, 102, 102, 0.1)',
        priority: 1
      }
    };
    
    return configs[status] || configs['not_started'];
  }

  /**
   * Render the phase card
   */
  render() {
    if (!this.options.container || !this.options.phase) {
      console.error('PhaseCard: Missing required container or phase data');
      return;
    }

    const container = this.options.container;
    container.innerHTML = this.generateHTML();
    container.className = 'phase-card-container';
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Generate phase card HTML
   */
  generateHTML() {
    const { phase, deliverables, isActive, commentCount, isAdmin, isLocked, previousPhaseComplete } = this.options;
    const statusConfig = this.getStatusConfig(phase.status);
    
    return `
      <div class="phase-card ${isActive ? 'active' : ''} ${statusConfig.className} ${isLocked ? 'locked' : ''}" data-phase-id="${phase.id}">
        ${this.renderHeader(phase, statusConfig)}
        ${this.renderProgressBar()}
        ${this.renderDescription(phase)}
        ${this.renderClientActions()}
        ${this.renderDeliverables(deliverables)}
        ${this.renderActions(phase)}
        ${this.renderFooter(phase, commentCount)}
        ${isLocked ? this.renderLockedOverlay() : ''}
        ${this.isLoading ? this.renderLoadingOverlay() : ''}
        ${this.error ? this.renderError() : ''}
      </div>
    `;
  }

  /**
   * Render phase header with status
   */
  renderHeader(phase, statusConfig) {
    const { deadline, activityCount } = this.options;
    const isOverdue = deadline && new Date(deadline) < new Date() && phase.status !== 'completed';
    
    return `
      <div class="phase-header">
        <div class="phase-title-group">
          <span class="phase-number ${isOverdue ? 'overdue' : ''}">${phase.order}</span>
          <div>
            <h3 class="phase-title">${phase.name}</h3>
            ${this.renderDeadlineIndicator()}
          </div>
        </div>
        <div class="phase-header-right">
          <div class="phase-status-badge" style="background: ${statusConfig.bgColor}; color: ${statusConfig.color};">
            <span class="status-icon">${statusConfig.icon}</span>
            <span class="status-label">${statusConfig.label}</span>
          </div>
          ${activityCount > 0 ? `
            <div class="activity-indicator" title="${activityCount} new activities">
              <span class="activity-dot"></span>
              <span class="activity-count">${activityCount}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render phase description
   */
  renderDescription(phase) {
    if (!phase.description) return '';
    
    return `
      <div class="phase-description">
        <p>${this.escapeHtml(phase.description)}</p>
      </div>
    `;
  }

  /**
   * Render deliverables section
   */
  renderDeliverables(deliverables) {
    if (!deliverables || deliverables.length === 0) return '';
    
    return `
      <div class="phase-deliverables">
        <h4 class="deliverables-title">Deliverables</h4>
        <div class="deliverables-list">
          ${deliverables.map(file => this.renderDeliverable(file)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual deliverable
   */
  renderDeliverable(file) {
    const fileIcon = this.getFileIcon(file.type);
    const uploadDate = new Date(file.upload_timestamp).toLocaleDateString();
    
    return `
      <div class="deliverable-item" data-file-id="${file.id}">
        <span class="file-icon">${fileIcon}</span>
        <div class="file-info">
          <span class="file-name">${this.escapeHtml(file.name)}</span>
          <span class="file-meta">Uploaded ${uploadDate}</span>
        </div>
        <button class="btn-download" data-file-id="${file.id}" title="Download file">
          ↓
        </button>
      </div>
    `;
  }

  /**
   * Render action buttons based on phase status
   */
  renderActions(phase) {
    // Show different actions based on status
    if (phase.status === 'changes_requested' && !this.options.isAdmin) {
      return `
        <div class="phase-actions">
          <div class="changes-requested-info">
            <span class="warning-icon">⚠</span>
            <p>Changes were requested. Once updates are made, this phase will be ready for approval again.</p>
          </div>
        </div>
      `;
    }
    
    // Only show actions if phase requires approval and is awaiting it
    if (!phase.requires_approval || phase.status !== 'awaiting_approval') {
      return this.renderApprovalInfo(phase);
    }
    
    // Don't show actions to admin users
    if (this.options.isAdmin) {
      return '<div class="phase-actions"><p class="admin-note">Client approval required</p></div>';
    }
    
    // Check if all required actions are complete
    const { clientActions } = this.options;
    const requiredActions = clientActions.filter(a => !a.completed);
    if (requiredActions.length > 0) {
      return `
        <div class="phase-actions">
          <div class="actions-required-info">
            <span class="info-icon">ℹ</span>
            <p>Complete all required actions above before approving this phase.</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="phase-actions">
        <button class="btn-primary btn-approve" data-phase-id="${phase.id}">
          <span class="btn-icon">✓</span>
          Approve Phase
        </button>
        <button class="btn-secondary btn-request-changes" data-phase-id="${phase.id}">
          <span class="btn-icon">✏</span>
          Request Changes
        </button>
      </div>
    `;
  }

  /**
   * Render approval information for completed phases
   */
  renderApprovalInfo(phase) {
    if (phase.status === 'completed' && phase.approved_by && phase.approved_at) {
      const approvedDate = new Date(phase.approved_at).toLocaleDateString();
      const approvalText = this.options.isAdmin ? 
        `Approved by client on ${approvedDate}` : 
        `Approved by you on ${approvedDate}`;
      
      return `
        <div class="phase-approval-info">
          <span class="approval-icon">✓</span>
          ${approvalText}
        </div>
      `;
    }
    
    if (phase.status === 'in_progress' && !phase.requires_approval) {
      return `
        <div class="phase-info">
          <span class="info-icon">ℹ</span>
          This phase does not require client approval
        </div>
      `;
    }
    
    return '';
  }

  /**
   * Render progress bar
   */
  renderProgressBar() {
    const { progressPercentage, completedActions, totalActions } = this.options;
    
    if (totalActions === 0) return '';
    
    return `
      <div class="phase-progress">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
        </div>
        <div class="progress-text">
          <span class="progress-label">Progress</span>
          <span class="progress-value">${progressPercentage}% (${completedActions}/${totalActions} actions)</span>
        </div>
      </div>
    `;
  }

  /**
   * Render deadline indicator
   */
  renderDeadlineIndicator() {
    const { deadline } = this.options;
    if (!deadline) return '';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    
    return `
      <div class="deadline-indicator ${isOverdue ? 'overdue' : daysLeft <= 3 ? 'urgent' : ''}">
        <span class="deadline-icon">⏱</span>
        <span class="deadline-text">
          ${isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : 
            daysLeft === 0 ? 'Due today' : 
            daysLeft === 1 ? 'Due tomorrow' : 
            `${daysLeft} days left`}
        </span>
      </div>
    `;
  }

  /**
   * Render client actions checklist
   */
  renderClientActions() {
    const { clientActions } = this.options;
    
    if (!clientActions || clientActions.length === 0) return '';
    
    return `
      <div class="phase-client-actions">
        <h4 class="actions-title">Required Actions</h4>
        <div class="actions-list">
          ${clientActions.map(action => `
            <div class="action-item ${action.completed ? 'completed' : ''}">
              <span class="action-checkbox">${action.completed ? '✓' : '○'}</span>
              <span class="action-text">${this.escapeHtml(action.description)}</span>
              ${action.completed && action.completed_at ? `
                <span class="action-date">Completed ${new Date(action.completed_at).toLocaleDateString()}</span>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render locked overlay
   */
  renderLockedOverlay() {
    const { previousPhaseComplete } = this.options;
    
    return `
      <div class="phase-locked-overlay">
        <div class="locked-content">
          <span class="locked-icon">🔒</span>
          <p class="locked-message">
            ${previousPhaseComplete ? 
              'This phase will unlock when the previous phase is completed.' : 
              'Complete required actions in the current phase to proceed.'}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render phase footer with metadata
   */
  renderFooter(phase, commentCount) {
    const items = [];
    
    if (commentCount > 0) {
      items.push(`
        <a href="#comments" class="comment-link">
          <span class="comment-icon">◉</span>
          ${commentCount} comment${commentCount !== 1 ? 's' : ''}
        </a>
      `);
    }
    
    if (phase.expected_completion) {
      const expectedDate = new Date(phase.expected_completion).toLocaleDateString();
      items.push(`<span class="expected-date">Expected: ${expectedDate}</span>`);
    }
    
    if (items.length === 0) return '';
    
    return `
      <div class="phase-footer">
        ${items.join('<span class="separator">•</span>')}
      </div>
    `;
  }

  /**
   * Render loading overlay
   */
  renderLoadingOverlay() {
    return `
      <div class="phase-loading-overlay">
        <div class="loading-spinner"></div>
        <span>Processing...</span>
      </div>
    `;
  }

  /**
   * Render error message
   */
  renderError() {
    return `
      <div class="phase-error">
        <span class="error-icon">⚠</span>
        <span class="error-message">${this.escapeHtml(this.error)}</span>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = this.options.container;
    
    // Approve button
    const approveBtn = container.querySelector('.btn-approve');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleApprove());
    }
    
    // Request changes button
    const requestChangesBtn = container.querySelector('.btn-request-changes');
    if (requestChangesBtn) {
      requestChangesBtn.addEventListener('click', () => this.handleRequestChanges());
    }
    
    // Download buttons
    const downloadBtns = container.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        this.handleFileDownload(fileId);
      });
    });
  }

  /**
   * Handle phase approval
   */
  async handleApprove() {
    if (this.isLoading) return;
    
    try {
      this.setLoading(true);
      this.clearError();
      
      if (this.options.onApprove) {
        await this.options.onApprove(this.options.phase.id);
      } else {
        // Default approval implementation
        const response = await fetch(`/api/phases/${this.options.phase.id}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.options.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            notes: 'Phase approved by client'
          })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to approve phase');
        }
        
        // Update phase status locally
        this.options.phase.status = 'completed';
        this.options.phase.approved_at = result.phase.approved_at;
        this.options.phase.approved_by = result.phase.approved_by;
        
        // Show success notification
        this.showSuccessNotification('Phase approved successfully! Moving to next phase...');
        
        // Reload after 2 seconds to show new phase
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Phase approval error:', error);
      this.setError(error.message || 'Unable to approve phase. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle request changes
   */
  async handleRequestChanges() {
    if (this.isLoading) return;
    
    // Create and show feedback modal
    const modal = new FeedbackModal({
      phaseId: this.options.phase.id,
      phaseName: this.options.phase.name,
      onSubmit: async (phaseId, feedback) => {
        try {
          this.setLoading(true);
          this.clearError();
          
          if (this.options.onRequestChanges) {
            await this.options.onRequestChanges(phaseId, feedback);
          } else {
            // Default implementation
            const response = await fetch(`/api/phases/${phaseId}/request-changes`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.options.authToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ changes_requested: feedback })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Failed to submit change request');
            }
            
            // Update phase status locally
            this.options.phase.status = 'changes_requested';
            this.options.phase.last_feedback = feedback;
            this.options.phase.last_feedback_at = result.phase.last_feedback_at;
            
            // Show success notification
            this.showSuccessNotification('Change request submitted successfully!');
            
            // Re-render the card
            this.render();
          }
        } catch (error) {
          console.error('Change request error:', error);
          this.setError('Unable to submit change request. Please try again.');
          throw error; // Re-throw to let modal handle it
        } finally {
          this.setLoading(false);
        }
      },
      onCancel: () => {
        // Modal handles cleanup
      }
    });
    
    modal.open();
  }

  /**
   * Handle file download
   */
  async handleFileDownload(fileId) {
    try {
      if (this.options.onFileDownload) {
        await this.options.onFileDownload(fileId);
      } else {
        // Default download implementation
        window.location.href = `/api/files/${fileId}/download?token=${this.options.authToken}`;
      }
    } catch (error) {
      console.error('File download error:', error);
      this.setError('Unable to download file. Please try again.');
    }
  }

  /**
   * Utility: Get file icon based on type
   */
  getFileIcon(fileType) {
    const icons = {
      'image': '◻',
      'pdf': '▤',
      'video': '▶',
      'archive': '◫',
      'document': '▦'
    };
    
    // Determine type from MIME or extension
    if (fileType.includes('image')) return icons.image;
    if (fileType.includes('pdf')) return icons.pdf;
    if (fileType.includes('video')) return icons.video;
    if (fileType.includes('zip') || fileType.includes('rar')) return icons.archive;
    
    return icons.document;
  }

  /**
   * Utility: Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.render();
  }

  /**
   * Set error message
   */
  setError(error) {
    this.error = error;
    this.render();
  }

  /**
   * Clear error message
   */
  clearError() {
    this.error = null;
  }

  /**
   * Show success notification
   */
  showSuccessNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'phase-success-notification';
    notification.innerHTML = `
      <span class="success-icon">✓</span>
      <span class="success-message">${this.escapeHtml(message)}</span>
    `;
    
    // Insert at top of card
    const card = this.options.container.querySelector('.phase-card');
    if (card) {
      card.insertBefore(notification, card.firstChild);
      
      // Remove after 4 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 4000);
    }
  }
}