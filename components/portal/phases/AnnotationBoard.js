/**
 * AnnotationBoard Component
 * Used in REV (Review) phase for providing feedback on deliverables
 */
export class AnnotationBoard {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.deliverables = [];
    this.currentDeliverable = null;
    this.annotations = [];
    this.annotationMode = false;
    this.currentTool = 'point'; // point, rectangle, text
  }

  async render(container) {
    await this.loadDeliverables();
    
    container.innerHTML = `
      <div class="annotation-board">
        <div class="board-header">
          <h2>Review & Feedback</h2>
          <p>Click on deliverables to add annotations and feedback</p>
        </div>

        <div class="deliverables-grid">
          ${this.renderDeliverables()}
        </div>

        ${this.currentDeliverable ? this.renderAnnotationModal() : ''}
      </div>
    `;
  }

  renderDeliverables() {
    if (this.deliverables.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No deliverables for review</h3>
          <p>Deliverables will appear here when ready for your feedback</p>
        </div>
      `;
    }

    return this.deliverables.map(deliverable => `
      <div class="deliverable-card ${deliverable.status}" 
           onclick="window.portal.modules.phases.annotationBoard.openDeliverable('${deliverable.id}')">
        <div class="deliverable-preview">
          ${this.renderPreview(deliverable)}
        </div>
        <div class="deliverable-info">
          <h3>${deliverable.name}</h3>
          <p>${deliverable.type} • ${deliverable.annotations.length} comments</p>
          <span class="status-badge ${deliverable.status}">${this.getStatusLabel(deliverable.status)}</span>
        </div>
      </div>
    `).join('');
  }

  renderPreview(deliverable) {
    if (deliverable.type === 'image') {
      return `<img src="${deliverable.thumbnailUrl}" alt="${deliverable.name}">`;
    } else if (deliverable.type === 'pdf') {
      return `<div class="file-icon">📄</div>`;
    } else if (deliverable.type === 'video') {
      return `
        <video poster="${deliverable.thumbnailUrl}">
          <source src="${deliverable.url}" type="video/mp4">
        </video>
      `;
    }
    return `<div class="file-icon">📎</div>`;
  }

  renderAnnotationModal() {
    return `
      <div class="annotation-modal-overlay" onclick="window.portal.modules.phases.annotationBoard.closeModal(event)">
        <div class="annotation-modal">
          <div class="modal-header">
            <h3>${this.currentDeliverable.name}</h3>
            <div class="header-actions">
              <button class="btn-icon ${this.annotationMode ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.annotationBoard.toggleAnnotationMode()">
                ✏️ Annotate
              </button>
              <button class="modal-close" onclick="window.portal.modules.phases.annotationBoard.closeDeliverable()">×</button>
            </div>
          </div>

          <div class="modal-body">
            <div class="annotation-toolbar ${this.annotationMode ? 'active' : ''}">
              <button class="tool-btn ${this.currentTool === 'point' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.annotationBoard.setTool('point')">
                📍 Point
              </button>
              <button class="tool-btn ${this.currentTool === 'rectangle' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.annotationBoard.setTool('rectangle')">
                ⬜ Rectangle
              </button>
              <button class="tool-btn ${this.currentTool === 'text' ? 'active' : ''}" 
                      onclick="window.portal.modules.phases.annotationBoard.setTool('text')">
                💬 Text
              </button>
              <div class="toolbar-separator"></div>
              <button class="tool-btn" onclick="window.portal.modules.phases.annotationBoard.clearAnnotations()">
                🗑️ Clear All
              </button>
            </div>

            <div class="annotation-workspace">
              <div class="deliverable-viewer" id="deliverable-viewer">
                ${this.renderDeliverableViewer()}
              </div>

              <div class="annotation-sidebar">
                <h4>Comments & Feedback</h4>
                <div class="annotations-list">
                  ${this.renderAnnotationsList()}
                </div>
                
                <div class="feedback-form">
                  <textarea id="general-feedback" placeholder="Add general feedback..."
                            rows="4"></textarea>
                  <div class="feedback-actions">
                    <button class="btn-secondary" onclick="window.portal.modules.phases.annotationBoard.requestRevision()">
                      Request Revision
                    </button>
                    <button class="btn-primary" onclick="window.portal.modules.phases.annotationBoard.approveDeliverable()">
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDeliverableViewer() {
    if (this.currentDeliverable.type === 'image') {
      return `
        <div class="image-viewer" onclick="window.portal.modules.phases.annotationBoard.addAnnotation(event)">
          <img src="${this.currentDeliverable.url}" alt="${this.currentDeliverable.name}">
          <svg class="annotation-layer" id="annotation-layer">
            ${this.renderAnnotationShapes()}
          </svg>
        </div>
      `;
    } else if (this.currentDeliverable.type === 'pdf') {
      return `
        <iframe src="${this.currentDeliverable.url}" width="100%" height="100%"></iframe>
      `;
    }
    return `<p>Preview not available</p>`;
  }

  renderAnnotationShapes() {
    return this.annotations.map((annotation, index) => {
      if (annotation.type === 'point') {
        return `
          <g class="annotation-group" data-id="${annotation.id}">
            <circle cx="${annotation.x}%" cy="${annotation.y}%" r="12" 
                    class="annotation-point" fill="#0057FF" stroke="white" stroke-width="2"/>
            <text x="${annotation.x}%" y="${annotation.y}%" 
                  text-anchor="middle" dominant-baseline="middle" 
                  fill="white" font-size="12" font-weight="bold">${index + 1}</text>
          </g>
        `;
      } else if (annotation.type === 'rectangle') {
        return `
          <g class="annotation-group" data-id="${annotation.id}">
            <rect x="${annotation.x}%" y="${annotation.y}%" 
                  width="${annotation.width}%" height="${annotation.height}%" 
                  fill="rgba(0, 87, 255, 0.2)" stroke="#0057FF" stroke-width="2"/>
            <text x="${annotation.x + 1}%" y="${annotation.y + 3}%" 
                  fill="#0057FF" font-size="12" font-weight="bold">${index + 1}</text>
          </g>
        `;
      }
      return '';
    }).join('');
  }

  renderAnnotationsList() {
    if (this.annotations.length === 0) {
      return '<p class="no-annotations">No annotations yet. Click "Annotate" to add feedback.</p>';
    }

    return this.annotations.map((annotation, index) => `
      <div class="annotation-item" data-id="${annotation.id}">
        <div class="annotation-header">
          <span class="annotation-number">${index + 1}</span>
          <span class="annotation-author">${annotation.author.name}</span>
          <button class="btn-icon-small" onclick="window.portal.modules.phases.annotationBoard.deleteAnnotation('${annotation.id}')">
            🗑️
          </button>
        </div>
        <p class="annotation-text">${annotation.comment}</p>
        <span class="annotation-time">${this.formatDate(annotation.created_at)}</span>
      </div>
    `).join('');
  }

  async loadDeliverables() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/deliverables?phase=REV`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.deliverables = data.deliverables;
      }
    } catch (error) {
      console.error('Error loading deliverables:', error);
    }
  }

  async openDeliverable(deliverableId) {
    this.currentDeliverable = this.deliverables.find(d => d.id === deliverableId);
    if (!this.currentDeliverable) return;

    // Load annotations for this deliverable
    await this.loadAnnotations(deliverableId);
    
    // Re-render to show modal
    const container = document.querySelector('.annotation-board');
    if (container) {
      this.render(container.parentElement);
    }
  }

  async loadAnnotations(deliverableId) {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/deliverables/${deliverableId}/annotations`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.annotations = data.annotations;
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  }

  closeDeliverable() {
    this.currentDeliverable = null;
    this.annotations = [];
    this.annotationMode = false;
    
    const container = document.querySelector('.annotation-board');
    if (container) {
      this.render(container.parentElement);
    }
  }

  closeModal(event) {
    if (event.target.classList.contains('annotation-modal-overlay')) {
      this.closeDeliverable();
    }
  }

  toggleAnnotationMode() {
    this.annotationMode = !this.annotationMode;
    
    const toolbar = document.querySelector('.annotation-toolbar');
    const annotateBtn = document.querySelector('.header-actions .btn-icon');
    
    if (toolbar) toolbar.classList.toggle('active', this.annotationMode);
    if (annotateBtn) annotateBtn.classList.toggle('active', this.annotationMode);
  }

  setTool(tool) {
    this.currentTool = tool;
    
    // Update active state
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
  }

  async addAnnotation(event) {
    if (!this.annotationMode) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const img = event.currentTarget.querySelector('img');
    const imgRect = img.getBoundingClientRect();
    
    const x = ((event.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((event.clientY - imgRect.top) / imgRect.height) * 100;

    const comment = prompt('Add your comment:');
    if (!comment) return;

    const annotation = {
      type: this.currentTool,
      x,
      y,
      comment,
      deliverable_id: this.currentDeliverable.id,
      author: {
        id: this.portal.currentUser.id,
        name: `${this.portal.currentUser.firstName} ${this.portal.currentUser.lastName}`
      },
      created_at: new Date().toISOString()
    };

    // If rectangle tool, allow drawing
    if (this.currentTool === 'rectangle') {
      // This would involve mouse drag events for rectangle drawing
      annotation.width = 20; // Default for now
      annotation.height = 15;
    }

    try {
      const response = await fetch(`/api/projects/${this.projectId}/deliverables/${this.currentDeliverable.id}/annotations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(annotation)
      });

      const data = await response.json();
      
      if (data.success) {
        annotation.id = data.annotation.id;
        this.annotations.push(annotation);
        
        // Update UI
        document.getElementById('annotation-layer').innerHTML = this.renderAnnotationShapes();
        document.querySelector('.annotations-list').innerHTML = this.renderAnnotationsList();
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
      this.portal.showNotification('Failed to add annotation', 'error');
    }
  }

  async deleteAnnotation(annotationId) {
    if (!confirm('Delete this annotation?')) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      if (response.ok) {
        this.annotations = this.annotations.filter(a => a.id !== annotationId);
        
        // Update UI
        document.getElementById('annotation-layer').innerHTML = this.renderAnnotationShapes();
        document.querySelector('.annotations-list').innerHTML = this.renderAnnotationsList();
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  }

  clearAnnotations() {
    if (!confirm('Clear all annotations?')) return;
    
    this.annotations = [];
    document.getElementById('annotation-layer').innerHTML = '';
    document.querySelector('.annotations-list').innerHTML = this.renderAnnotationsList();
  }

  async requestRevision() {
    const feedback = document.getElementById('general-feedback').value;
    if (!feedback && this.annotations.length === 0) {
      alert('Please add feedback or annotations before requesting revision');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${this.projectId}/deliverables/${this.currentDeliverable.id}/revision`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback,
          annotations: this.annotations
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Revision request sent', 'success');
        this.closeDeliverable();
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
      this.portal.showNotification('Failed to request revision', 'error');
    }
  }

  async approveDeliverable() {
    const feedback = document.getElementById('general-feedback').value;
    
    if (!confirm('Approve this deliverable?')) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/deliverables/${this.currentDeliverable.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback })
      });

      const data = await response.json();
      
      if (data.success) {
        this.portal.showNotification('Deliverable approved!', 'success');
        this.closeDeliverable();
        await this.loadDeliverables();
      }
    } catch (error) {
      console.error('Error approving deliverable:', error);
      this.portal.showNotification('Failed to approve deliverable', 'error');
    }
  }

  getStatusLabel(status) {
    const labels = {
      'pending': 'Pending Review',
      'approved': 'Approved',
      'revision': 'Revision Requested',
      'in_progress': 'In Progress'
    };
    return labels[status] || status;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export default AnnotationBoard;