import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Files Module
 * Handles file management, uploads, and organization
 */
export class AdminFilesModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminFilesModule');
    this.files = [];
    this.filteredFiles = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.sortBy = 'created';
    this.sortDirection = 'desc';
    this.viewMode = 'grid'; // grid or list
  }

  async doInit() {
    this.element = document.getElementById('files');
    if (this.element) {
      // Only load files if we have a token
      if (this.admin && this.admin.token) {
        await this.loadFiles();
      }
      this.setupFilesInterface();
      this.setupAutoRefresh(60000); // Refresh every minute
    }
  }

  /**
   * Load files data
   */
  async loadFiles() {
    try {
      const data = await this.getCachedData('files', async () => {
        const response = await this.apiRequest('/files');
        return await response.json();
      }, 60000); // Cache for 1 minute

      this.files = data.files || [];
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load files:', error);
      this.showError('Failed to load files');
    }
  }

  /**
   * Setup files interface
   */
  setupFilesInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-files">
        <div class="files-header">
          <h1>File Management</h1>
          <div class="files-actions">
            <button class="btn-primary" id="btn-upload-files">
              <span class="icon">⬆️</span>
              Upload Files
            </button>
            <button class="btn-secondary" id="btn-create-folder">
              <span class="icon">📁</span>
              New Folder
            </button>
          </div>
        </div>

        <div class="files-filters">
          <div class="filter-group">
            <select class="type-filter" id="type-filter">
              <option value="all">All Files</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
              <option value="pdf">PDFs</option>
              <option value="archive">Archives</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="filter-group">
            <select class="project-filter" id="project-filter">
              <option value="all">All Projects</option>
              ${this.renderProjectFilterOptions()}
            </select>
          </div>
          
          <div class="search-group">
            <input type="text" 
                   class="search-input" 
                   id="search-input"
                   placeholder="Search files...">
            <span class="search-icon">🔍</span>
          </div>

          <div class="view-toggle">
            <button class="${this.viewMode === 'grid' ? 'active' : ''}" 
                    id="btn-view-grid">
              <span class="icon">⊞</span>
            </button>
            <button class="${this.viewMode === 'list' ? 'active' : ''}" 
                    id="btn-view-list">
              <span class="icon">☰</span>
            </button>
          </div>
        </div>

        <div class="files-stats">
          ${this.renderFilesStats()}
        </div>

        <div class="files-content">
          ${this.viewMode === 'grid' ? this.renderFilesGrid() : this.renderFilesList()}
        </div>
      </div>

      <!-- Upload Modal -->
      <div id="upload-modal" class="modal">
        <div class="modal-overlay" id="upload-modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Upload Files</h2>
            <button class="modal-close" id="upload-modal-close">×</button>
          </div>
          <div class="modal-body">
            ${this.renderUploadForm()}
          </div>
        </div>
      </div>

      <!-- File Preview Modal -->
      <div id="file-preview-modal" class="modal">
        <div class="modal-overlay" id="preview-modal-overlay"></div>
        <div class="modal-content large">
          <div class="modal-header">
            <h2 id="preview-file-name">File Preview</h2>
            <button class="modal-close" id="preview-modal-close">×</button>
          </div>
          <div class="modal-body" id="file-preview-content">
            <!-- Preview content will be rendered here -->
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Render project filter options
   */
  renderProjectFilterOptions() {
    // This would be populated from projects data
    return `
      <option value="1">Project 1</option>
      <option value="2">Project 2</option>
    `;
  }

  /**
   * Render files statistics
   */
  renderFilesStats() {
    const stats = {
      total: this.files.length,
      images: this.files.filter(f => this.getFileType(f) === 'image').length,
      documents: this.files.filter(f => this.getFileType(f) === 'document').length,
      totalSize: this.files.reduce((sum, f) => sum + (f.size || 0), 0)
    };

    return `
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Total Files</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.images}</span>
          <span class="stat-label">Images</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.documents}</span>
          <span class="stat-label">Documents</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${this.formatFileSize(stats.totalSize)}</span>
          <span class="stat-label">Total Storage</span>
        </div>
      </div>
    `;
  }

  /**
   * Render files grid view
   */
  renderFilesGrid() {
    if (this.filteredFiles.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="files-grid">
        ${this.filteredFiles.map(file => this.renderFileCard(file)).join('')}
      </div>
    `;
  }

  /**
   * Render individual file card
   */
  renderFileCard(file) {
    const fileType = this.getFileType(file);
    const thumbnail = this.getFileThumbnail(file);
    
    return `
      <div class="file-card" data-file-id="${file.id}">
        <div class="file-preview" data-action="preview" data-file-id="${file.id}">
          ${thumbnail}
        </div>
        
        <div class="file-info">
          <h4 class="file-name" title="${file.original_name}">${file.original_name}</h4>
          <div class="file-meta">
            <span class="file-size">${this.formatFileSize(file.size)}</span>
            <span class="file-date">${this.formatDate(file.created_at, { month: 'short', day: 'numeric' })}</span>
          </div>
          ${file.project_name ? `<div class="file-project">${file.project_name}</div>` : ''}
        </div>
        
        <div class="file-actions">
          <button class="action-btn" data-action="download" data-file-id="${file.id}" title="Download">
            ⬇️
          </button>
          <button class="action-btn" data-action="share" data-file-id="${file.id}" title="Share">
            🔗
          </button>
          <button class="action-btn" data-action="edit" data-file-id="${file.id}" title="Edit">
            ✏️
          </button>
          <button class="action-btn danger" data-action="delete" data-file-id="${file.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render files list view
   */
  renderFilesList() {
    if (this.filteredFiles.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="files-list-container">
        <table class="files-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Project</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.filteredFiles.map(file => this.renderFileRow(file)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render individual file row
   */
  renderFileRow(file) {
    const fileType = this.getFileType(file);
    const icon = this.getFileIcon(fileType);
    
    return `
      <tr class="file-row" data-file-id="${file.id}">
        <td class="file-name">
          <span class="file-icon">${icon}</span>
          <span class="name-text">${file.original_name}</span>
        </td>
        <td class="file-type">${fileType}</td>
        <td class="file-size">${this.formatFileSize(file.size)}</td>
        <td class="file-project">${file.project_name || '-'}</td>
        <td class="file-date">${this.formatDate(file.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="file-actions">
          <div class="action-buttons">
            <button class="action-btn" data-action="preview" data-file-id="${file.id}" title="Preview">
              👁️
            </button>
            <button class="action-btn" data-action="download" data-file-id="${file.id}" title="Download">
              ⬇️
            </button>
            <button class="action-btn" data-action="share" data-file-id="${file.id}" title="Share">
              🔗
            </button>
            <button class="action-btn danger" data-action="delete" data-file-id="${file.id}" title="Delete">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const isFiltered = this.currentFilter !== 'all' || this.searchTerm;
    
    return `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>${isFiltered ? 'No files found' : 'No files yet'}</h3>
        <p>${isFiltered ? 'Try adjusting your filters or search term.' : 'Upload your first file to get started.'}</p>
        ${!isFiltered ? `
          <button class="btn-primary" id="btn-upload-first">
            Upload First File
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render upload form
   */
  renderUploadForm() {
    return `
      <div class="upload-form">
        <div class="form-group">
          <label for="upload-project">Project (Optional)</label>
          <select id="upload-project" name="project_id">
            <option value="">No Project</option>
            ${this.renderProjectOptions()}
          </select>
        </div>
        
        <div class="upload-area" id="upload-area">
          <div class="upload-icon">⬆️</div>
          <h3>Drag & Drop Files Here</h3>
          <p>or click to browse</p>
          <input type="file" id="file-input" multiple hidden>
          <button class="btn-secondary" id="btn-browse-files">
            Browse Files
          </button>
        </div>
        
        <div id="upload-queue" class="upload-queue" style="display: none;">
          <h4>Files to Upload:</h4>
          <div id="file-list"></div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btn-upload-cancel">
            Cancel
          </button>
          <button type="button" class="btn-primary" id="upload-btn" disabled>
            Upload Files
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render project options
   */
  renderProjectOptions() {
    // This would be populated from projects data
    return `
      <option value="1">Project 1</option>
      <option value="2">Project 2</option>
    `;
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Setup buttons
    const uploadBtn = document.getElementById('btn-upload-files');
    if (uploadBtn) {
      this.addEventListener(uploadBtn, 'click', () => this.showUploadModal());
    }
    
    const createFolderBtn = document.getElementById('btn-create-folder');
    if (createFolderBtn) {
      this.addEventListener(createFolderBtn, 'click', () => this.createFolder());
    }
    
    // Setup filters
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
      this.addEventListener(typeFilter, 'change', (e) => this.filterByType(e.target.value));
    }
    
    const projectFilter = document.getElementById('project-filter');
    if (projectFilter) {
      this.addEventListener(projectFilter, 'change', (e) => this.filterByProject(e.target.value));
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
    }
    
    // Setup view toggle
    const gridBtn = document.getElementById('btn-view-grid');
    if (gridBtn) {
      this.addEventListener(gridBtn, 'click', () => this.setViewMode('grid'));
    }
    
    const listBtn = document.getElementById('btn-view-list');
    if (listBtn) {
      this.addEventListener(listBtn, 'click', () => this.setViewMode('list'));
    }
    
    // Setup modal close buttons
    const uploadModalOverlay = document.getElementById('upload-modal-overlay');
    if (uploadModalOverlay) {
      this.addEventListener(uploadModalOverlay, 'click', () => this.closeUploadModal());
    }
    
    const uploadModalClose = document.getElementById('upload-modal-close');
    if (uploadModalClose) {
      this.addEventListener(uploadModalClose, 'click', () => this.closeUploadModal());
    }
    
    const previewModalOverlay = document.getElementById('preview-modal-overlay');
    if (previewModalOverlay) {
      this.addEventListener(previewModalOverlay, 'click', () => this.closePreviewModal());
    }
    
    const previewModalClose = document.getElementById('preview-modal-close');
    if (previewModalClose) {
      this.addEventListener(previewModalClose, 'click', () => this.closePreviewModal());
    }
    
    // Setup drag and drop
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
      this.addEventListener(uploadArea, 'dragover', this.handleDragOver.bind(this));
      this.addEventListener(uploadArea, 'dragleave', this.handleDragLeave.bind(this));
      this.addEventListener(uploadArea, 'drop', this.handleDrop.bind(this));
    }
    
    // Setup file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      this.addEventListener(fileInput, 'change', this.handleFileSelect.bind(this));
    }
    
    // Setup upload form buttons
    const browseBtn = document.getElementById('btn-browse-files');
    if (browseBtn) {
      this.addEventListener(browseBtn, 'click', () => {
        const input = document.getElementById('file-input');
        if (input) input.click();
      });
    }
    
    const uploadFirstBtn = document.getElementById('btn-upload-first');
    if (uploadFirstBtn) {
      this.addEventListener(uploadFirstBtn, 'click', () => this.showUploadModal());
    }
    
    const uploadCancelBtn = document.getElementById('btn-upload-cancel');
    if (uploadCancelBtn) {
      this.addEventListener(uploadCancelBtn, 'click', () => this.closeUploadModal());
    }
    
    const uploadSubmitBtn = document.getElementById('upload-btn');
    if (uploadSubmitBtn) {
      this.addEventListener(uploadSubmitBtn, 'click', () => this.uploadFiles());
    }
    
    // Setup file action delegated events
    const filesContent = this.element.querySelector('.files-content');
    if (filesContent) {
      this.addEventListener(filesContent, 'click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const fileId = target.dataset.fileId;
        
        switch (action) {
          case 'preview':
            this.previewFile(fileId);
            break;
          case 'download':
            this.downloadFile(fileId);
            break;
          case 'share':
            this.shareFile(fileId);
            break;
          case 'edit':
            this.editFile(fileId);
            break;
          case 'delete':
            this.deleteFile(fileId);
            break;
        }
      });
    }
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
  }

  /**
   * Handle drag leave
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
  }

  /**
   * Handle file drop
   */
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    this.handleFiles(files);
  }

  /**
   * Handle file selection
   */
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.handleFiles(files);
  }

  /**
   * Handle files
   */
  handleFiles(files) {
    this.selectedFiles = files;
    
    const fileList = document.getElementById('file-list');
    const uploadQueue = document.getElementById('upload-queue');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (files.length > 0) {
      uploadQueue.style.display = 'block';
      uploadBtn.disabled = false;
      
      fileList.innerHTML = files.map(file => `
        <div class="queue-item">
          <span class="queue-name">${file.name}</span>
          <span class="queue-size">${this.formatFileSize(file.size)}</span>
        </div>
      `).join('');
    }
  }

  /**
   * Show upload modal
   */
  showUploadModal() {
    document.getElementById('upload-modal').classList.add('active');
    this.setupEventHandlers();
  }

  /**
   * Close upload modal
   */
  closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('active');
    this.selectedFiles = null;
    
    // Reset form
    document.getElementById('upload-queue').style.display = 'none';
    document.getElementById('file-list').innerHTML = '';
    document.getElementById('upload-btn').disabled = true;
    document.getElementById('file-input').value = '';
  }

  /**
   * Upload files
   */
  async uploadFiles() {
    if (!this.selectedFiles || this.selectedFiles.length === 0) return;
    
    const projectId = document.getElementById('upload-project').value;
    const uploadBtn = document.getElementById('upload-btn');
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    try {
      for (const file of this.selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        if (projectId) {
          formData.append('project_id', projectId);
        }
        
        const response = await this.apiRequest('/files/upload', {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for multipart
        });
        
        if (response.ok) {
          const result = await response.json();
          this.files.unshift(result.file);
        } else {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }
      
      this.showSuccess(`Successfully uploaded ${this.selectedFiles.length} file(s)`);
      this.applyFilters();
      this.setupFilesInterface();
      this.closeUploadModal();
      this.clearCache();
      
    } catch (error) {
      console.error('Upload failed:', error);
      this.showError(error.message || 'Failed to upload files');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload Files';
    }
  }

  /**
   * Preview file
   */
  async previewFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    const modal = document.getElementById('file-preview-modal');
    const content = document.getElementById('file-preview-content');
    const fileName = document.getElementById('preview-file-name');
    
    fileName.textContent = file.original_name;
    
    const fileType = this.getFileType(file);
    
    if (fileType === 'image') {
      content.innerHTML = `<img src="/api/files/${fileId}/preview" alt="${file.original_name}">`;
    } else if (fileType === 'pdf') {
      content.innerHTML = `<iframe src="/api/files/${fileId}/preview" width="100%" height="600px"></iframe>`;
    } else {
      content.innerHTML = `
        <div class="file-preview-info">
          <div class="preview-icon">${this.getFileIcon(fileType)}</div>
          <h3>${file.original_name}</h3>
          <p>File size: ${this.formatFileSize(file.size)}</p>
          <p>Uploaded: ${this.formatDate(file.created_at)}</p>
          <button class="btn-primary" onclick="admin.modules.files.downloadFile('${fileId}')">
            Download File
          </button>
        </div>
      `;
    }
    
    modal.classList.add('active');
  }

  /**
   * Close preview modal
   */
  closePreviewModal() {
    document.getElementById('file-preview-modal').classList.remove('active');
  }

  /**
   * Download file
   */
  async downloadFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      const response = await this.apiRequest(`/files/${fileId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        this.showError('Failed to download file');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showError('Failed to download file');
    }
  }

  /**
   * Share file
   */
  async shareFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      const response = await this.apiRequest(`/files/${fileId}/share`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        const shareUrl = `${window.location.origin}/share/${result.shareId}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        this.showSuccess('Share link copied to clipboard!');
      } else {
        this.showError('Failed to create share link');
      }
      
    } catch (error) {
      console.error('Share failed:', error);
      this.showError('Failed to create share link');
    }
  }

  /**
   * Edit file
   */
  editFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    const newName = prompt('Enter new file name:', file.original_name);
    if (!newName || newName === file.original_name) return;
    
    this.updateFileName(fileId, newName);
  }

  /**
   * Update file name
   */
  async updateFileName(fileId, newName) {
    try {
      const response = await this.apiRequest(`/files/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
          file.original_name = newName;
          this.applyFilters();
          this.setupFilesInterface();
          this.showSuccess('File renamed successfully');
          this.clearCache();
        }
      } else {
        this.showError('Failed to rename file');
      }
      
    } catch (error) {
      console.error('Rename failed:', error);
      this.showError('Failed to rename file');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${file.original_name}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
      const response = await this.apiRequest(`/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.applyFilters();
        this.setupFilesInterface();
        this.showSuccess('File deleted successfully');
        this.clearCache();
      } else {
        this.showError('Failed to delete file');
      }
      
    } catch (error) {
      console.error('Delete failed:', error);
      this.showError('Failed to delete file');
    }
  }

  /**
   * Create folder
   */
  createFolder() {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    // Implementation would create a folder structure
    this.showInfo('Folder creation coming soon');
  }

  /**
   * Filter files by type
   */
  filterByType(type) {
    this.currentFilter = type;
    this.applyFilters();
    this.setupFilesInterface();
  }

  /**
   * Filter files by project
   */
  filterByProject(projectId) {
    this.projectFilter = projectId;
    this.applyFilters();
    this.setupFilesInterface();
  }

  /**
   * Handle search
   */
  handleSearch(term) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
    this.setupFilesInterface();
  }

  /**
   * Set view mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.setupFilesInterface();
  }

  /**
   * Apply filters and sorting
   */
  applyFilters() {
    let filtered = [...this.files];
    
    // Apply type filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(file => this.getFileType(file) === this.currentFilter);
    }
    
    // Apply project filter
    if (this.projectFilter && this.projectFilter !== 'all') {
      filtered = filtered.filter(file => file.project_id === this.projectFilter);
    }
    
    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(file => 
        file.original_name.toLowerCase().includes(this.searchTerm)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (this.sortBy) {
        case 'name':
          aVal = a.original_name.toLowerCase();
          bVal = b.original_name.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'size':
          aVal = a.size || 0;
          bVal = b.size || 0;
          break;
        default:
          aVal = a[this.sortBy];
          bVal = b[this.sortBy];
      }
      
      if (this.sortDirection === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
    
    this.filteredFiles = filtered;
  }

  /**
   * Get file type
   */
  getFileType(file) {
    const mime = file.mime_type || '';
    const ext = file.original_name.split('.').pop().toLowerCase();
    
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return 'image';
    } else if (mime === 'application/pdf' || ext === 'pdf') {
      return 'pdf';
    } else if (mime.startsWith('application/') || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      return 'document';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return 'archive';
    } else {
      return 'other';
    }
  }

  /**
   * Get file icon
   */
  getFileIcon(type) {
    const icons = {
      image: '🖼️',
      pdf: '📄',
      document: '📃',
      archive: '🗜️',
      other: '📎'
    };
    return icons[type] || icons.other;
  }

  /**
   * Get file thumbnail
   */
  getFileThumbnail(file) {
    const type = this.getFileType(file);
    
    if (type === 'image') {
      return `<img src="/api/files/${file.id}/thumbnail" alt="${file.original_name}" loading="lazy">`;
    } else {
      return `<div class="file-type-icon">${this.getFileIcon(type)}</div>`;
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Refresh files data
   */
  async refresh() {
    this.clearCache();
    await this.loadFiles();
    this.setupFilesInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('file_uploaded', (file) => {
      this.files.unshift(file);
      this.applyFilters();
      this.setupFilesInterface();
      this.showSuccess(`New file uploaded: ${file.original_name}`);
    });

    socket.on('file_updated', (file) => {
      const index = this.files.findIndex(f => f.id === file.id);
      if (index !== -1) {
        this.files[index] = file;
        this.applyFilters();
        this.setupFilesInterface();
      }
    });

    socket.on('file_deleted', (fileId) => {
      this.files = this.files.filter(f => f.id !== fileId);
      this.applyFilters();
      this.setupFilesInterface();
    });
  }
}