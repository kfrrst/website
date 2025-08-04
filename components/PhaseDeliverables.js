import { BRAND } from '../config/brand.js';

/**
 * PhaseDeliverables Component - Displays and manages project phase deliverables
 * Production-ready component with file preview, download, and organization
 */
export class PhaseDeliverables {
  constructor(options = {}) {
    this.options = {
      container: null,
      deliverables: [],
      phaseId: null,
      phaseName: '',
      onFileDownload: null,
      onFilePreview: null,
      onFileDelete: null,
      authToken: null,
      isAdmin: false,
      allowUploads: false,
      viewMode: 'grid', // 'grid' or 'list'
      ...options
    };
    
    this.isLoading = false;
    this.error = null;
    this.previewModal = null;
  }

  /**
   * Render the deliverables component
   */
  render() {
    if (!this.options.container) {
      console.error('PhaseDeliverables: Missing required container');
      return;
    }

    const container = this.options.container;
    container.innerHTML = this.generateHTML();
    container.className = 'phase-deliverables-container';
    
    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Generate deliverables HTML
   */
  generateHTML() {
    const { deliverables, phaseName, viewMode, allowUploads } = this.options;
    
    if (!deliverables || deliverables.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="phase-deliverables ${viewMode}">
        ${this.renderHeader()}
        ${this.renderViewToggle()}
        ${this.renderFileGrid(deliverables)}
        ${allowUploads ? this.renderUploadArea() : ''}
        ${this.isLoading ? this.renderLoadingOverlay() : ''}
        ${this.error ? this.renderError() : ''}
      </div>
    `;
  }

  /**
   * Render deliverables header
   */
  renderHeader() {
    const { deliverables, phaseName } = this.options;
    const fileCount = deliverables.length;
    const totalSize = this.calculateTotalSize(deliverables);

    return `
      <div class="deliverables-header">
        <div class="deliverables-title-group">
          <h4 class="deliverables-title">Deliverables</h4>
          <span class="deliverables-count">${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="deliverables-meta">
          <span class="total-size">${this.formatFileSize(totalSize)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render view toggle buttons
   */
  renderViewToggle() {
    const { viewMode } = this.options;
    
    return `
      <div class="deliverables-view-toggle">
        <button class="view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view">
          <span class="toggle-icon">⊞</span>
        </button>
        <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list" title="List view">
          <span class="toggle-icon">☰</span>
        </button>
      </div>
    `;
  }

  /**
   * Render file grid/list
   */
  renderFileGrid(deliverables) {
    const { viewMode } = this.options;
    
    return `
      <div class="deliverables-grid ${viewMode}">
        ${deliverables.map(file => this.renderDeliverable(file)).join('')}
      </div>
    `;
  }

  /**
   * Render individual deliverable
   */
  renderDeliverable(file) {
    const { viewMode, isAdmin } = this.options;
    const fileIcon = this.getFileIcon(file.type, file.name);
    const uploadDate = new Date(file.upload_timestamp).toLocaleDateString();
    const fileSize = this.formatFileSize(file.size || 0);
    const isImage = this.isImageFile(file.type, file.name);
    
    return `
      <div class="deliverable-item ${viewMode}" data-file-id="${file.id}">
        <div class="deliverable-preview">
          ${isImage ? this.renderImagePreview(file) : this.renderFileIcon(fileIcon, file.type)}
          ${isImage ? '<div class="preview-overlay"><span class="preview-icon">👁</span></div>' : ''}
        </div>
        <div class="deliverable-info">
          <div class="file-name-group">
            <span class="file-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
            ${file.version ? `<span class="file-version">v${file.version}</span>` : ''}
          </div>
          <div class="file-meta">
            <span class="file-size">${fileSize}</span>
            <span class="file-date">Uploaded ${uploadDate}</span>
          </div>
          ${file.description ? `<p class="file-description">${this.escapeHtml(file.description)}</p>` : ''}
        </div>
        <div class="deliverable-actions">
          <button class="btn-icon btn-download" data-file-id="${file.id}" title="Download file">
            <span class="action-icon">↓</span>
          </button>
          ${isImage ? `<button class="btn-icon btn-preview" data-file-id="${file.id}" title="Preview image"><span class="action-icon">👁</span></button>` : ''}
          ${isAdmin ? `<button class="btn-icon btn-delete" data-file-id="${file.id}" title="Delete file"><span class="action-icon">🗑</span></button>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render image preview thumbnail
   */
  renderImagePreview(file) {
    const thumbnailUrl = file.thumbnail_url || `/api/files/${file.id}/thumbnail?token=${this.options.authToken}`;
    
    return `
      <div class="image-thumbnail">
        <img src="${thumbnailUrl}" alt="${this.escapeHtml(file.name)}" loading="lazy" />
      </div>
    `;
  }

  /**
   * Render file icon
   */
  renderFileIcon(icon, fileType) {
    const iconColor = this.getFileTypeColor(fileType);
    
    return `
      <div class="file-icon-container">
        <span class="file-icon" style="color: ${iconColor};">${icon}</span>
      </div>
    `;
  }

  /**
   * Render upload area for admin users
   */
  renderUploadArea() {
    return `
      <div class="deliverables-upload-area">
        <div class="upload-dropzone" id="deliverables-dropzone">
          <div class="upload-content">
            <span class="upload-icon">⬆</span>
            <p class="upload-text">Drop files here or <button class="upload-browse-btn">browse</button></p>
            <p class="upload-help">Supports: Images, PDFs, Documents, Archives</p>
          </div>
          <input type="file" id="deliverables-file-input" multiple accept="*/*" style="display: none;" />
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const { phaseName, allowUploads } = this.options;
    
    return `
      <div class="phase-deliverables empty">
        <div class="empty-state">
          <span class="empty-icon">📁</span>
          <h4 class="empty-title">No deliverables yet</h4>
          <p class="empty-message">
            ${allowUploads 
              ? 'Upload files for this phase to get started.'
              : 'Deliverables will appear here once uploaded by the team.'
            }
          </p>
          ${allowUploads ? '<button class="btn-primary btn-upload-first">Upload Files</button>' : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render loading overlay
   */
  renderLoadingOverlay() {
    return `
      <div class="deliverables-loading-overlay">
        <div class="loading-spinner"></div>
        <span>Loading files...</span>
      </div>
    `;
  }

  /**
   * Render error message
   */
  renderError() {
    return `
      <div class="deliverables-error">
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
    
    // View toggle buttons
    const viewToggleBtns = container.querySelectorAll('.view-toggle-btn');
    viewToggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newView = e.currentTarget.dataset.view;
        this.changeViewMode(newView);
      });
    });
    
    // Download buttons
    const downloadBtns = container.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        this.handleFileDownload(fileId);
      });
    });
    
    // Preview buttons
    const previewBtns = container.querySelectorAll('.btn-preview');
    previewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        this.handleFilePreview(fileId);
      });
    });
    
    // Delete buttons (admin only)
    const deleteBtns = container.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.dataset.fileId;
        this.handleFileDelete(fileId);
      });
    });
    
    // Image thumbnails for preview
    const imageThumbnails = container.querySelectorAll('.image-thumbnail img');
    imageThumbnails.forEach(img => {
      img.addEventListener('click', (e) => {
        const fileId = e.currentTarget.closest('.deliverable-item').dataset.fileId;
        this.handleFilePreview(fileId);
      });
    });
    
    // Upload functionality
    this.attachUploadListeners();
  }

  /**
   * Attach upload event listeners
   */
  attachUploadListeners() {
    if (!this.options.allowUploads) return;
    
    const container = this.options.container;
    const dropzone = container.querySelector('#deliverables-dropzone');
    const fileInput = container.querySelector('#deliverables-file-input');
    const browseBtn = container.querySelector('.upload-browse-btn');
    const uploadFirstBtn = container.querySelector('.btn-upload-first');
    
    if (browseBtn) {
      browseBtn.addEventListener('click', () => fileInput?.click());
    }
    
    if (uploadFirstBtn) {
      uploadFirstBtn.addEventListener('click', () => fileInput?.click());
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(Array.from(e.target.files));
      });
    }
    
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      
      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
      
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        this.handleFileUpload(Array.from(e.dataTransfer.files));
      });
    }
  }

  /**
   * Change view mode
   */
  changeViewMode(newView) {
    this.options.viewMode = newView;
    this.render();
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
        const downloadUrl = `/api/files/${fileId}/download?token=${this.options.authToken}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('File download error:', error);
      this.setError('Unable to download file. Please try again.');
    }
  }

  /**
   * Handle file preview
   */
  async handleFilePreview(fileId) {
    const file = this.options.deliverables.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      if (this.options.onFilePreview) {
        await this.options.onFilePreview(fileId, file);
      } else {
        // Default preview implementation
        this.openImagePreviewModal(file);
      }
    } catch (error) {
      console.error('File preview error:', error);
      this.setError('Unable to preview file.');
    }
  }

  /**
   * Open image preview modal
   */
  openImagePreviewModal(file) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal-overlay';
    modal.innerHTML = `
      <div class="image-preview-modal">
        <div class="image-preview-header">
          <h3>${this.escapeHtml(file.name)}</h3>
          <button class="image-preview-close">×</button>
        </div>
        <div class="image-preview-content">
          <img src="/api/files/${file.id}/preview?token=${this.options.authToken}" alt="${this.escapeHtml(file.name)}" />
        </div>
        <div class="image-preview-footer">
          <button class="btn-secondary btn-download-from-preview" data-file-id="${file.id}">
            Download
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close handlers
    const closeBtn = modal.querySelector('.image-preview-close');
    closeBtn.addEventListener('click', () => this.closeImagePreviewModal(modal));
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeImagePreviewModal(modal);
      }
    });
    
    // Download from preview
    const downloadBtn = modal.querySelector('.btn-download-from-preview');
    downloadBtn.addEventListener('click', () => {
      this.handleFileDownload(file.id);
      this.closeImagePreviewModal(modal);
    });
    
    this.previewModal = modal;
  }

  /**
   * Close image preview modal
   */
  closeImagePreviewModal(modal) {
    if (modal && modal.parentNode) {
      modal.remove();
      document.body.style.overflow = '';
      this.previewModal = null;
    }
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(files) {
    if (!files || files.length === 0) return;
    
    try {
      this.setLoading(true);
      this.clearError();
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('phaseId', this.options.phaseId);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.authToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Add new files to deliverables
      this.options.deliverables.push(...result.files);
      this.render();
      
    } catch (error) {
      console.error('File upload error:', error);
      this.setError('Upload failed. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle file delete
   */
  async handleFileDelete(fileId) {
    const file = this.options.deliverables.find(f => f.id === fileId);
    if (!file) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmed) return;
    
    try {
      if (this.options.onFileDelete) {
        await this.options.onFileDelete(fileId);
      } else {
        // Default delete implementation
        const response = await fetch(`/api/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.options.authToken}`
          }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Delete failed');
        }
        
        // Remove from deliverables array
        this.options.deliverables = this.options.deliverables.filter(f => f.id !== fileId);
        this.render();
      }
    } catch (error) {
      console.error('File delete error:', error);
      this.setError('Unable to delete file. Please try again.');
    }
  }

  /**
   * Utility functions
   */
  
  getFileIcon(fileType, fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Image files
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return '🖼';
    }
    
    // Document files
    if (fileType.includes('pdf') || extension === 'pdf') return '📄';
    if (['doc', 'docx'].includes(extension)) return '📝';
    if (['xls', 'xlsx'].includes(extension)) return '📊';
    if (['ppt', 'pptx'].includes(extension)) return '📊';
    
    // Code files
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json'].includes(extension)) return '💻';
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return '🗜';
    
    // Video files
    if (fileType.includes('video') || ['mp4', 'avi', 'mov', 'wmv'].includes(extension)) return '🎥';
    
    // Audio files
    if (fileType.includes('audio') || ['mp3', 'wav', 'flac'].includes(extension)) return '🎵';
    
    return '📄'; // Default
  }

  getFileTypeColor(fileType) {
    if (fileType.includes('image')) return BRAND.colors.blue;
    if (fileType.includes('pdf')) return BRAND.colors.red;
    if (fileType.includes('video')) return BRAND.colors.purple;
    if (fileType.includes('audio')) return BRAND.colors.green;
    return BRAND.colors.textSecondary;
  }

  isImageFile(fileType, fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  calculateTotalSize(deliverables) {
    return deliverables.reduce((total, file) => total + (file.size || 0), 0);
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
}