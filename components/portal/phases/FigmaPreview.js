/**
 * FigmaPreview Component
 * Used in DSGN (Design) phase for displaying and interacting with Figma designs
 */
export class FigmaPreview {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.figmaFiles = [];
    this.currentFile = null;
    this.comments = [];
    this.activeView = 'preview'; // preview, prototype, comments
  }

  async render(container) {
    await this.loadFigmaFiles();
    
    container.innerHTML = `
      <div class="figma-preview-module">
        <div class="figma-header">
          <h2>Design Files</h2>
          <p>View and provide feedback on design concepts</p>
        </div>

        <div class="figma-toolbar">
          <div class="view-tabs">
            <button class="tab-button ${this.activeView === 'preview' ? 'active' : ''}" 
                    onclick="window.portal.modules.phases.figmaPreview.setView('preview')">
              Preview
            </button>
            <button class="tab-button ${this.activeView === 'prototype' ? 'active' : ''}" 
                    onclick="window.portal.modules.phases.figmaPreview.setView('prototype')">
              Prototype
            </button>
            <button class="tab-button ${this.activeView === 'comments' ? 'active' : ''}" 
                    onclick="window.portal.modules.phases.figmaPreview.setView('comments')">
              Comments (${this.comments.length})
            </button>
          </div>

          <div class="file-selector">
            <select onchange="window.portal.modules.phases.figmaPreview.selectFile(this.value)">
              <option value="">Select a design file</option>
              ${this.figmaFiles.map(file => `
                <option value="${file.id}" ${this.currentFile?.id === file.id ? 'selected' : ''}>
                  ${file.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="figma-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  renderContent() {
    if (!this.currentFile) {
      return this.renderEmptyState();
    }

    switch (this.activeView) {
      case 'preview':
        return this.renderPreview();
      case 'prototype':
        return this.renderPrototype();
      case 'comments':
        return this.renderComments();
      default:
        return this.renderPreview();
    }
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3>No design files yet</h3>
        <p>Design files will appear here once your designer shares them</p>
        <button class="btn-secondary" onclick="window.portal.modules.phases.figmaPreview.requestAccess()">
          Request Access
        </button>
      </div>
    `;
  }

  renderPreview() {
    return `
      <div class="design-preview">
        <div class="preview-sidebar">
          <h3>Pages</h3>
          <div class="page-list">
            ${this.currentFile.pages.map(page => `
              <div class="page-item ${page.id === this.currentFile.activePage ? 'active' : ''}" 
                   onclick="window.portal.modules.phases.figmaPreview.selectPage('${page.id}')">
                <span class="page-icon">📄</span>
                <span class="page-name">${page.name}</span>
              </div>
            `).join('')}
          </div>

          <div class="design-info">
            <h4>File Information</h4>
            <div class="info-item">
              <span class="info-label">Last Updated:</span>
              <span class="info-value">${this.formatDate(this.currentFile.updated_at)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Version:</span>
              <span class="info-value">${this.currentFile.version || '1.0'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="status-badge ${this.currentFile.status}">${this.currentFile.status}</span>
            </div>
          </div>

          <div class="design-actions">
            <button class="btn-primary" onclick="window.portal.modules.phases.figmaPreview.approveDesign()">
              Approve Design
            </button>
            <button class="btn-secondary" onclick="window.portal.modules.phases.figmaPreview.requestChanges()">
              Request Changes
            </button>
          </div>
        </div>

        <div class="preview-main">
          <div class="preview-controls">
            <button class="control-btn" onclick="window.portal.modules.phases.figmaPreview.zoomOut()">
              <span>-</span>
            </button>
            <span class="zoom-level">${this.currentFile.zoomLevel || 100}%</span>
            <button class="control-btn" onclick="window.portal.modules.phases.figmaPreview.zoomIn()">
              <span>+</span>
            </button>
            <button class="control-btn" onclick="window.portal.modules.phases.figmaPreview.fitToScreen()">
              Fit
            </button>
            <button class="control-btn" onclick="window.portal.modules.phases.figmaPreview.toggleFullscreen()">
              ⛶
            </button>
          </div>

          <div class="design-canvas" id="design-canvas">
            ${this.renderDesignCanvas()}
          </div>
        </div>
      </div>
    `;
  }

  renderDesignCanvas() {
    const activePage = this.currentFile.pages.find(p => p.id === this.currentFile.activePage);
    
    if (!activePage) return '<p>No page selected</p>';

    if (activePage.embedUrl) {
      return `
        <iframe 
          src="${activePage.embedUrl}" 
          style="border: 1px solid rgba(0, 0, 0, 0.1);" 
          width="100%" 
          height="100%" 
          allowfullscreen>
        </iframe>
      `;
    } else if (activePage.imageUrl) {
      return `
        <div class="design-image-container" style="transform: scale(${(this.currentFile.zoomLevel || 100) / 100})">
          <img src="${activePage.imageUrl}" alt="${activePage.name}" 
               onclick="window.portal.modules.phases.figmaPreview.addComment(event)">
          ${this.renderCommentPins(activePage.id)}
        </div>
      `;
    }

    return '<p>Preview not available</p>';
  }

  renderCommentPins(pageId) {
    const pageComments = this.comments.filter(c => c.pageId === pageId);
    
    return pageComments.map(comment => `
      <div class="comment-pin" 
           style="left: ${comment.x}%; top: ${comment.y}%"
           onclick="window.portal.modules.phases.figmaPreview.showComment('${comment.id}')">
        <span class="pin-number">${comment.number}</span>
      </div>
    `).join('');
  }

  renderPrototype() {
    if (!this.currentFile.prototypeUrl) {
      return `
        <div class="prototype-unavailable">
          <p>No prototype available for this design</p>
          <button class="btn-secondary" onclick="window.portal.modules.phases.figmaPreview.requestPrototype()">
            Request Prototype
          </button>
        </div>
      `;
    }

    return `
      <div class="prototype-viewer">
        <iframe 
          src="${this.currentFile.prototypeUrl}" 
          style="border: none;" 
          width="100%" 
          height="100%" 
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  renderComments() {
    return `
      <div class="comments-view">
        <div class="comments-header">
          <h3>Design Feedback</h3>
          <button class="btn-primary" onclick="window.portal.modules.phases.figmaPreview.addGeneralComment()">
            Add Comment
          </button>
        </div>

        <div class="comments-list">
          ${this.comments.length === 0 ? 
            '<p class="no-comments">No comments yet. Click on the design to add feedback.</p>' :
            this.comments.map(comment => this.renderComment(comment)).join('')
          }
        </div>
      </div>
    `;
  }

  renderComment(comment) {
    return `
      <div class="comment-thread" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-author">
            <img src="${comment.author.avatar || '/assets/default-avatar.png'}" 
                 alt="${comment.author.name}" class="author-avatar">
            <span class="author-name">${comment.author.name}</span>
          </div>
          <span class="comment-time">${this.formatDate(comment.created_at)}</span>
        </div>

        <div class="comment-body">
          ${comment.pageId ? `<span class="comment-location">On ${comment.pageName}</span>` : ''}
          <p>${comment.text}</p>
          ${comment.resolved ? '<span class="resolved-badge">Resolved</span>' : ''}
        </div>

        <div class="comment-actions">
          ${!comment.resolved ? `
            <button class="btn-link" onclick="window.portal.modules.phases.figmaPreview.resolveComment('${comment.id}')">
              Mark Resolved
            </button>
          ` : ''}
          <button class="btn-link" onclick="window.portal.modules.phases.figmaPreview.replyToComment('${comment.id}')">
            Reply
          </button>
        </div>

        ${comment.replies && comment.replies.length > 0 ? `
          <div class="comment-replies">
            ${comment.replies.map(reply => `
              <div class="reply">
                <div class="reply-author">
                  <img src="${reply.author.avatar || '/assets/default-avatar.png'}" 
                       alt="${reply.author.name}" class="author-avatar small">
                  <span class="author-name">${reply.author.name}</span>
                  <span class="reply-time">${this.formatDate(reply.created_at)}</span>
                </div>
                <p>${reply.text}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  async loadFigmaFiles() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/figma-files`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.figmaFiles = data.files;
        if (this.figmaFiles.length > 0 && !this.currentFile) {
          this.currentFile = this.figmaFiles[0];
          await this.loadComments();
        }
      }
    } catch (error) {
      console.error('Error loading Figma files:', error);
    }
  }

  async loadComments() {
    if (!this.currentFile) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/figma/${this.currentFile.id}/comments`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.comments = data.comments;
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  setView(view) {
    this.activeView = view;
    const container = document.querySelector('.figma-preview-module');
    if (container) {
      this.render(container.parentElement);
    }
  }

  async selectFile(fileId) {
    this.currentFile = this.figmaFiles.find(f => f.id === fileId);
    if (this.currentFile) {
      await this.loadComments();
      const container = document.querySelector('.figma-preview-module');
      if (container) {
        this.render(container.parentElement);
      }
    }
  }

  selectPage(pageId) {
    if (this.currentFile) {
      this.currentFile.activePage = pageId;
      const canvas = document.getElementById('design-canvas');
      if (canvas) {
        canvas.innerHTML = this.renderDesignCanvas();
      }
    }
  }

  zoomIn() {
    if (this.currentFile) {
      this.currentFile.zoomLevel = Math.min((this.currentFile.zoomLevel || 100) + 10, 200);
      this.updateZoom();
    }
  }

  zoomOut() {
    if (this.currentFile) {
      this.currentFile.zoomLevel = Math.max((this.currentFile.zoomLevel || 100) - 10, 25);
      this.updateZoom();
    }
  }

  fitToScreen() {
    if (this.currentFile) {
      this.currentFile.zoomLevel = 100;
      this.updateZoom();
    }
  }

  updateZoom() {
    const zoomDisplay = document.querySelector('.zoom-level');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${this.currentFile.zoomLevel}%`;
    }
    
    const canvas = document.getElementById('design-canvas');
    if (canvas) {
      canvas.innerHTML = this.renderDesignCanvas();
    }
  }

  async addComment(event) {
    if (!event.target.matches('img')) return;

    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const text = prompt('Add your comment:');
    if (!text) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/figma/${this.currentFile.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          pageId: this.currentFile.activePage,
          x,
          y
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.comments.push(data.comment);
        const canvas = document.getElementById('design-canvas');
        if (canvas) {
          canvas.innerHTML = this.renderDesignCanvas();
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      this.portal.showNotification('Failed to add comment', 'error');
    }
  }

  async approveDesign() {
    if (!confirm('Are you sure you want to approve this design?')) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/figma/${this.currentFile.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentFile.status = 'approved';
        this.portal.showNotification('Design approved successfully!', 'success');
        
        const container = document.querySelector('.figma-preview-module');
        if (container) {
          this.render(container.parentElement);
        }
      }
    } catch (error) {
      console.error('Error approving design:', error);
      this.portal.showNotification('Failed to approve design', 'error');
    }
  }

  requestChanges() {
    const reason = prompt('Please describe the changes needed:');
    if (!reason) return;

    // This would send the change request to the backend
    this.portal.showNotification('Change request sent to designer', 'success');
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export default FigmaPreview;