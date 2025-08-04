import { BaseModule } from './BaseModule.js';

/**
 * Files module for client portal
 * Handles file uploads, downloads, and file management
 */
export class FilesModule extends BaseModule {
  constructor(portal) {
    super(portal, 'FilesModule');
    this.files = [];
    this.currentFolder = '/';
    this.uploadQueue = [];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml',
      'application/pdf', 'application/zip',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
  }

  async doInit() {
    this.element = document.getElementById('files');
    if (this.element) {
      await this.loadFiles();
      this.setupFilesInterface();
      this.setupDragAndDrop();
    }
  }

  async loadFiles() {
    try {
      const data = await this.getCachedData(`files_${this.currentFolder}`, async () => {
        const response = await this.apiRequest(`/api/files?folder=${encodeURIComponent(this.currentFolder)}`);
        return await response.json();
      }, 60000); // 1 minute cache

      this.files = data.files || [];
    } catch (error) {
      console.error('Failed to load files:', error);
      this.files = [];
    }
  }

  setupFilesInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="files-container">
        <div class="files-header">
          <div class="files-breadcrumb">
            ${this.renderBreadcrumb()}
          </div>
          <div class="files-actions">
            <button class="upload-btn" onclick="portal.modules.files.openUploader()">
              <span class="icon">📁</span>
              Upload Files
            </button>
            <button class="new-folder-btn" onclick="portal.modules.files.createFolder()">
              <span class="icon">📂</span>
              New Folder
            </button>
          </div>
        </div>
        
        <div class="files-content">
          <div class="files-grid">
            ${this.renderFilesList()}
          </div>
        </div>

        <div class="upload-drop-zone" id="upload-drop-zone" style="display: none;">
          <div class="drop-zone-content">
            <div class="drop-zone-icon">📁</div>
            <h3>Drop files here to upload</h3>
            <p>Or click to select files</p>
          </div>
        </div>
      </div>
    `;

    this.setupFileEvents();
  }

  renderBreadcrumb() {
    const pathParts = this.currentFolder.split('/').filter(part => part);
    const breadcrumbs = [{ name: 'Files', path: '/' }];
    
    let currentPath = '';
    pathParts.forEach(part => {
      currentPath += '/' + part;
      breadcrumbs.push({ name: part, path: currentPath });
    });

    return breadcrumbs.map((crumb, index) => {
      const isLast = index === breadcrumbs.length - 1;
      return `
        <span class="breadcrumb-item ${isLast ? 'active' : ''}">
          ${isLast ? crumb.name : `<a href="#" onclick="portal.modules.files.navigateToFolder('${crumb.path}')">${crumb.name}</a>`}
        </span>
      `;
    }).join('<span class="breadcrumb-separator">›</span>');
  }

  renderFilesList() {
    if (this.files.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>No files in this folder</h3>
          <p>Upload files or create folders to get started</p>
        </div>
      `;
    }

    return this.files.map(file => `
      <div class="file-item ${file.type === 'folder' ? 'folder' : 'file'}" 
           onclick="portal.modules.files.${file.type === 'folder' ? 'navigateToFolder' : 'previewFile'}('${file.path || file.id}')">
        <div class="file-icon">
          ${this.getFileIcon(file)}
        </div>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-meta">
            ${file.type === 'folder' ? `${file.file_count || 0} items` : this.formatFileSize(file.size)}
            <span class="file-date">${this.formatDate(file.updated_at, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="file-action-btn" onclick="event.stopPropagation(); portal.modules.files.showFileMenu('${file.id}')">
            <span class="icon">⋯</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  getFileIcon(file) {
    if (file.type === 'folder') return '📂';
    
    const mimeType = file.mime_type || '';
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Image files
    if (mimeType.startsWith('image/')) return '🖼️';
    
    // Documents
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
    if (mimeType.includes('spreadsheet') || extension === 'xls' || extension === 'xlsx') return '📊';
    if (mimeType.includes('presentation') || extension === 'ppt' || extension === 'pptx') return '📽️';
    
    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    
    // Text files
    if (mimeType.startsWith('text/')) return '📄';
    
    // Default
    return '📄';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  setupFileEvents() {
    // File upload input
    const uploadInput = document.getElementById('file-upload-input');
    if (uploadInput) {
      this.addEventListener(uploadInput, 'change', (e) => {
        this.handleFileSelection(e.target.files);
      });
    }
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById('upload-drop-zone');
    if (!dropZone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.addEventListener(dropZone, eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      this.addEventListener(dropZone, eventName, () => {
        dropZone.classList.add('drag-over');
        dropZone.style.display = 'flex';
      });
    });

    // Remove highlight when dragging leaves
    ['dragleave', 'drop'].forEach(eventName => {
      this.addEventListener(dropZone, eventName, () => {
        dropZone.classList.remove('drag-over');
        if (eventName === 'drop') {
          setTimeout(() => {
            dropZone.style.display = 'none';
          }, 500);
        }
      });
    });

    // Handle dropped files
    this.addEventListener(dropZone, 'drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFileSelection(files);
    });

    // Show drop zone when dragging files over the page
    this.addEventListener(document, 'dragenter', (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        dropZone.style.display = 'flex';
      }
    });

    // Hide drop zone when dragging leaves the page
    this.addEventListener(document, 'dragleave', (e) => {
      if (!document.elementFromPoint(e.clientX, e.clientY)) {
        dropZone.style.display = 'none';
      }
    });
  }

  handleFileSelection(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > this.maxFileSize) {
        errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.maxFileSize)})`);
        return;
      }

      // Check file type
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      this.showError(`Upload errors:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      this.uploadFiles(validFiles);
    }
  }

  async uploadFiles(files) {
    const progressContainer = this.createProgressContainer();
    
    for (const file of files) {
      try {
        await this.uploadSingleFile(file, progressContainer);
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
        this.showError(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    // Refresh file list after uploads
    this.clearCache();
    await this.loadFiles();
    this.setupFilesInterface();
    
    // Remove progress container
    setTimeout(() => {
      progressContainer.remove();
    }, 2000);
  }

  async uploadSingleFile(file, progressContainer) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', this.currentFolder);

    const progressItem = this.createProgressItem(file.name, progressContainer);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      progressItem.classList.add('success');
      progressItem.querySelector('.progress-status').textContent = 'Complete';
      
    } catch (error) {
      progressItem.classList.add('error');
      progressItem.querySelector('.progress-status').textContent = 'Failed';
      throw error;
    }
  }

  createProgressContainer() {
    const container = document.createElement('div');
    container.className = 'upload-progress-container';
    container.innerHTML = `
      <div class="upload-progress-header">
        <h3>Uploading Files</h3>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="upload-progress-list"></div>
    `;
    
    document.body.appendChild(container);
    return container;
  }

  createProgressItem(fileName, container) {
    const item = document.createElement('div');
    item.className = 'upload-progress-item';
    item.innerHTML = `
      <div class="progress-file-name">${fileName}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 100%"></div>
      </div>
      <div class="progress-status">Uploading...</div>
    `;
    
    container.querySelector('.upload-progress-list').appendChild(item);
    return item;
  }

  openUploader() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = this.allowedTypes.join(',');
    
    input.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });
    
    input.click();
  }

  navigateToFolder(folderPath) {
    this.currentFolder = folderPath;
    this.clearCache();
    this.loadFiles().then(() => {
      this.setupFilesInterface();
    });
  }

  previewFile(fileId) {
    console.log(`Previewing file: ${fileId}`);
    // Implementation for file preview modal
  }

  showFileMenu(fileId) {
    console.log(`Showing menu for file: ${fileId}`);
    // Implementation for file context menu
  }

  createFolder() {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      console.log(`Creating folder: ${folderName}`);
      // Implementation for folder creation
    }
  }
}