/**
 * ResearchList Component
 * Used in RESEARCH phase for brand and market research management
 * Production-ready component with full CRUD operations, file uploads, and export functionality
 */

import { BRAND } from '../../../config/brand.js';

export class ResearchList {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.researchItems = [];
    this.filteredItems = [];
    this.currentFilter = 'all';
    this.currentSearch = '';
    this.selectedItems = new Set();
    this.uploadingFiles = new Map();
    this.editingItem = null;
    this.showingModal = false;
    
    // Research types configuration
    this.researchTypes = [
      {
        id: 'market_analysis',
        name: 'Market Analysis',
        description: 'Market size, trends, and opportunity analysis',
        icon: 'trending-up',
        color: BRAND.colors.blue
      },
      {
        id: 'user_research',
        name: 'User Research',
        description: 'User interviews, surveys, and behavior analysis',
        icon: 'users',
        color: BRAND.colors.green
      },
      {
        id: 'competitive_analysis',
        name: 'Competitive Analysis',
        description: 'Competitor research and positioning analysis',
        icon: 'zap',
        color: BRAND.colors.yellow
      },
      {
        id: 'brand_audit',
        name: 'Brand Audit',
        description: 'Current brand assessment and gap analysis',
        icon: 'search',
        color: BRAND.colors.red
      }
    ];

    // Bind event handlers
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.handleItemSelection = this.handleItemSelection.bind(this);
  }

  async render(container) {
    await this.loadResearchItems();
    
    container.innerHTML = `
      <div class="research-list">
        <div class="research-header">
          <div class="header-content">
            <h2>Research Management</h2>
            <p>Organize and track research insights for informed decision-making</p>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" onclick="window.portal.modules.phases.researchList.exportResearch()">
              <i class="icon-download"></i>
              Export Research
            </button>
            <button class="btn-primary" onclick="window.portal.modules.phases.researchList.createResearchItem()">
              <i class="icon-plus"></i>
              Add Research
            </button>
          </div>
        </div>

        <div class="research-controls">
          <div class="search-container">
            <div class="search-input-wrapper">
              <i class="icon-search"></i>
              <input 
                type="text" 
                id="research-search" 
                placeholder="Search research items, findings, or tags..."
                value="${this.currentSearch}"
              >
            </div>
          </div>
          
          <div class="filter-container">
            <select id="research-filter" value="${this.currentFilter}">
              <option value="all">All Research</option>
              ${this.researchTypes.map(type => `
                <option value="${type.id}">${type.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="view-options">
            <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" 
                    onclick="window.portal.modules.phases.researchList.setViewMode('grid')"
                    title="Grid View">
              <i class="icon-grid-3x3"></i>
            </button>
            <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" 
                    onclick="window.portal.modules.phases.researchList.setViewMode('list')"
                    title="List View">
              <i class="icon-list"></i>
            </button>
          </div>
        </div>

        <div class="research-stats">
          ${this.renderResearchStats()}
        </div>

        <div class="research-content">
          ${this.filteredItems.length > 0 ? this.renderResearchItems() : this.renderEmptyState()}
        </div>

        ${this.renderBulkActions()}
      </div>

      <!-- Research Item Modal -->
      <div id="research-modal" class="modal ${this.showingModal ? 'active' : ''}">
        <div class="modal-overlay" onclick="window.portal.modules.phases.researchList.closeModal()"></div>
        <div class="modal-content research-modal-content">
          ${this.renderModalContent()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderResearchStats() {
    const stats = this.researchTypes.map(type => {
      const count = this.researchItems.filter(item => item.research_type === type.id).length;
      return { ...type, count };
    });

    const totalItems = this.researchItems.length;
    const totalFindings = this.researchItems.reduce((sum, item) => sum + (item.findings_count || 0), 0);
    const totalDocuments = this.researchItems.reduce((sum, item) => sum + (item.documents_count || 0), 0);

    return `
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">
            <i class="icon-file-text"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${totalItems}</div>
            <div class="stat-label">Research Items</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="icon-lightbulb"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${totalFindings}</div>
            <div class="stat-label">Key Findings</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="icon-file-plus"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">${totalDocuments}</div>
            <div class="stat-label">Documents</div>
          </div>
        </div>

        ${stats.map(stat => `
          <div class="stat-card type-stat">
            <div class="stat-icon" style="color: ${stat.color}">
              <i class="icon-${stat.icon}"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">${stat.count}</div>
              <div class="stat-label">${stat.name}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderResearchItems() {
    if (this.viewMode === 'grid') {
      return `
        <div class="research-grid">
          ${this.filteredItems.map(item => this.renderResearchCard(item)).join('')}
        </div>
      `;
    } else {
      return `
        <div class="research-table">
          <div class="table-header">
            <div class="table-cell checkbox-cell">
              <input type="checkbox" id="select-all" 
                     ${this.selectedItems.size === this.filteredItems.length && this.filteredItems.length > 0 ? 'checked' : ''}
                     onchange="window.portal.modules.phases.researchList.toggleSelectAll(this.checked)">
            </div>
            <div class="table-cell">Research Item</div>
            <div class="table-cell">Type</div>
            <div class="table-cell">Findings</div>
            <div class="table-cell">Documents</div>
            <div class="table-cell">Updated</div>
            <div class="table-cell">Actions</div>
          </div>
          
          <div class="table-body">
            ${this.filteredItems.map(item => this.renderResearchRow(item)).join('')}
          </div>
        </div>
      `;
    }
  }

  renderResearchCard(item) {
    const type = this.researchTypes.find(t => t.id === item.research_type);
    const isSelected = this.selectedItems.has(item.id);
    
    return `
      <div class="research-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="card-header">
          <div class="card-select">
            <input type="checkbox" 
                   ${isSelected ? 'checked' : ''}
                   onchange="window.portal.modules.phases.researchList.toggleItemSelection('${item.id}', this.checked)">
          </div>
          <div class="card-type" style="color: ${type?.color || BRAND.colors.textSecondary}">
            <i class="icon-${type?.icon || 'file-text'}"></i>
            <span>${type?.name || 'Unknown'}</span>
          </div>
          <div class="card-actions">
            <button class="btn-icon" onclick="window.portal.modules.phases.researchList.editResearchItem('${item.id}')" title="Edit">
              <i class="icon-edit-2"></i>
            </button>
          </div>
        </div>

        <div class="card-content">
          <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
          ${item.description ? `
            <p class="card-description">${this.escapeHtml(item.description)}</p>
          ` : ''}
          
          ${item.tags && item.tags.length > 0 ? `
            <div class="card-tags">
              ${item.tags.map(tag => `
                <span class="tag">${this.escapeHtml(tag)}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="card-stats">
          <div class="stat-item" title="Key Findings">
            <i class="icon-lightbulb"></i>
            <span>${item.findings_count || 0}</span>
          </div>
          <div class="stat-item" title="Documents">
            <i class="icon-file-text"></i>
            <span>${item.documents_count || 0}</span>
          </div>
          <div class="stat-item" title="Last Updated">
            <i class="icon-clock"></i>
            <span>${this.formatDate(item.updated_at)}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn-text" onclick="window.portal.modules.phases.researchList.viewResearchItem('${item.id}')">
            View Details
          </button>
          ${item.documents_count > 0 ? `
            <button class="btn-text" onclick="window.portal.modules.phases.researchList.downloadDocuments('${item.id}')">
              <i class="icon-download"></i>
              Download
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderResearchRow(item) {
    const type = this.researchTypes.find(t => t.id === item.research_type);
    const isSelected = this.selectedItems.has(item.id);
    
    return `
      <div class="table-row ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="table-cell checkbox-cell">
          <input type="checkbox" 
                 ${isSelected ? 'checked' : ''}
                 onchange="window.portal.modules.phases.researchList.toggleItemSelection('${item.id}', this.checked)">
        </div>
        
        <div class="table-cell">
          <div class="item-info">
            <div class="item-title">${this.escapeHtml(item.title)}</div>
            ${item.description ? `
              <div class="item-description">${this.escapeHtml(item.description.substring(0, 100))}${item.description.length > 100 ? '...' : ''}</div>
            ` : ''}
            ${item.tags && item.tags.length > 0 ? `
              <div class="item-tags">
                ${item.tags.slice(0, 3).map(tag => `
                  <span class="tag small">${this.escapeHtml(tag)}</span>
                `).join('')}
                ${item.tags.length > 3 ? `<span class="tag-more">+${item.tags.length - 3}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="table-cell">
          <div class="type-badge" style="color: ${type?.color || BRAND.colors.textSecondary}">
            <i class="icon-${type?.icon || 'file-text'}"></i>
            <span>${type?.name || 'Unknown'}</span>
          </div>
        </div>
        
        <div class="table-cell">
          <span class="count-badge">${item.findings_count || 0}</span>
        </div>
        
        <div class="table-cell">
          <span class="count-badge">${item.documents_count || 0}</span>
        </div>
        
        <div class="table-cell">
          <span class="date-text">${this.formatDate(item.updated_at)}</span>
        </div>
        
        <div class="table-cell actions-cell">
          <button class="btn-icon" onclick="window.portal.modules.phases.researchList.viewResearchItem('${item.id}')" title="View">
            <i class="icon-eye"></i>
          </button>
          <button class="btn-icon" onclick="window.portal.modules.phases.researchList.editResearchItem('${item.id}')" title="Edit">
            <i class="icon-edit-2"></i>
          </button>
          <button class="btn-icon danger" onclick="window.portal.modules.phases.researchList.deleteResearchItem('${item.id}')" title="Delete">
            <i class="icon-trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="icon-search"></i>
        </div>
        <h3>No Research Items</h3>
        <p>Start building your research foundation by adding market analysis, user research, or competitive insights.</p>
        
        <div class="empty-actions">
          <button class="btn-primary" onclick="window.portal.modules.phases.researchList.createResearchItem()">
            <i class="icon-plus"></i>
            Add Your First Research Item
          </button>
        </div>

        <div class="research-type-suggestions">
          <h4>Get started with:</h4>
          <div class="suggestion-grid">
            ${this.researchTypes.map(type => `
              <div class="suggestion-card" onclick="window.portal.modules.phases.researchList.createResearchItem('${type.id}')">
                <div class="suggestion-icon" style="color: ${type.color}">
                  <i class="icon-${type.icon}"></i>
                </div>
                <div class="suggestion-content">
                  <div class="suggestion-title">${type.name}</div>
                  <div class="suggestion-description">${type.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderBulkActions() {
    if (this.selectedItems.size === 0) return '';

    return `
      <div class="bulk-actions">
        <div class="bulk-info">
          <span>${this.selectedItems.size} item${this.selectedItems.size !== 1 ? 's' : ''} selected</span>
        </div>
        <div class="bulk-buttons">
          <button class="btn-secondary" onclick="window.portal.modules.phases.researchList.bulkExport()">
            <i class="icon-download"></i>
            Export Selected
          </button>
          <button class="btn-secondary" onclick="window.portal.modules.phases.researchList.bulkTag()">
            <i class="icon-tag"></i>
            Add Tags
          </button>
          <button class="btn-danger" onclick="window.portal.modules.phases.researchList.bulkDelete()">
            <i class="icon-trash-2"></i>
            Delete Selected
          </button>
        </div>
      </div>
    `;
  }

  renderModalContent() {
    if (!this.showingModal) return '';

    if (this.editingItem) {
      return this.renderEditModal();
    }

    return this.renderCreateModal();
  }

  renderCreateModal() {
    return `
      <div class="modal-header">
        <h3>Add Research Item</h3>
        <button class="modal-close" onclick="window.portal.modules.phases.researchList.closeModal()">
          <i class="icon-x"></i>
        </button>
      </div>

      <div class="modal-body">
        <form id="research-form" class="research-form">
          <div class="form-row">
            <div class="form-group">
              <label for="research-title">Title *</label>
              <input type="text" id="research-title" required 
                     placeholder="e.g., Target Audience Analysis, Competitor Landscape Review">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-type">Research Type *</label>
              <select id="research-type" required>
                <option value="">Choose research type...</option>
                ${this.researchTypes.map(type => `
                  <option value="${type.id}">${type.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-description">Description</label>
              <textarea id="research-description" rows="3" 
                        placeholder="Brief description of this research item and its purpose"></textarea>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-tags">Tags</label>
              <input type="text" id="research-tags" 
                     placeholder="audience, demographics, competitors (comma-separated)">
              <small>Add tags to help organize and find your research items</small>
            </div>
          </div>

          <div class="form-section">
            <h4>Key Findings</h4>
            <div id="findings-list">
              <div class="finding-item">
                <textarea name="finding" rows="2" placeholder="Key finding or insight..."></textarea>
                <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
                  <i class="icon-trash-2"></i>
                </button>
              </div>
            </div>
            <button type="button" class="btn-secondary small" onclick="window.portal.modules.phases.researchList.addFinding()">
              <i class="icon-plus"></i>
              Add Finding
            </button>
          </div>

          <div class="form-section">
            <h4>Research Documents</h4>
            <div class="file-upload-area" ondrop="window.portal.modules.phases.researchList.handleFileDrop(event)" 
                 ondragover="event.preventDefault()" ondragenter="event.preventDefault()">
              <div class="upload-content">
                <i class="icon-upload"></i>
                <p>Drag & drop files here or <button type="button" class="btn-link" onclick="document.getElementById('research-files').click()">browse</button></p>
                <small>Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 50MB each)</small>
              </div>
              <input type="file" id="research-files" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" style="display: none">
            </div>
            <div id="uploaded-files-list"></div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="window.portal.modules.phases.researchList.closeModal()">
          Cancel
        </button>
        <button class="btn-primary" onclick="window.portal.modules.phases.researchList.saveResearchItem()">
          <i class="icon-save"></i>
          Save Research Item
        </button>
      </div>
    `;
  }

  renderEditModal() {
    const item = this.editingItem;
    
    return `
      <div class="modal-header">
        <h3>Edit Research Item</h3>
        <button class="modal-close" onclick="window.portal.modules.phases.researchList.closeModal()">
          <i class="icon-x"></i>
        </button>
      </div>

      <div class="modal-body">
        <form id="research-form" class="research-form">
          <div class="form-row">
            <div class="form-group">
              <label for="research-title">Title *</label>
              <input type="text" id="research-title" required value="${this.escapeHtml(item.title)}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-type">Research Type *</label>
              <select id="research-type" required>
                ${this.researchTypes.map(type => `
                  <option value="${type.id}" ${item.research_type === type.id ? 'selected' : ''}>${type.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-description">Description</label>
              <textarea id="research-description" rows="3">${this.escapeHtml(item.description || '')}</textarea>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="research-tags">Tags</label>
              <input type="text" id="research-tags" 
                     value="${item.tags ? item.tags.join(', ') : ''}">
            </div>
          </div>

          <div class="form-section">
            <h4>Key Findings</h4>
            <div id="findings-list">
              ${item.findings && item.findings.length > 0 ? 
                item.findings.map(finding => `
                  <div class="finding-item">
                    <textarea name="finding" rows="2">${this.escapeHtml(finding.text)}</textarea>
                    <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
                      <i class="icon-trash-2"></i>
                    </button>
                  </div>
                `).join('') : 
                `<div class="finding-item">
                  <textarea name="finding" rows="2" placeholder="Key finding or insight..."></textarea>
                  <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
                    <i class="icon-trash-2"></i>
                  </button>
                </div>`
              }
            </div>
            <button type="button" class="btn-secondary small" onclick="window.portal.modules.phases.researchList.addFinding()">
              <i class="icon-plus"></i>
              Add Finding
            </button>
          </div>

          <div class="form-section">
            <h4>Research Documents</h4>
            ${item.documents && item.documents.length > 0 ? `
              <div class="existing-documents">
                ${item.documents.map(doc => `
                  <div class="document-item" data-id="${doc.id}">
                    <div class="document-info">
                      <i class="icon-file-text"></i>
                      <span class="document-name">${this.escapeHtml(doc.original_name)}</span>
                      <span class="document-size">${this.formatFileSize(doc.file_size)}</span>
                    </div>
                    <div class="document-actions">
                      <button type="button" class="btn-icon" onclick="window.portal.modules.phases.researchList.downloadDocument('${doc.id}')" title="Download">
                        <i class="icon-download"></i>
                      </button>
                      <button type="button" class="btn-icon danger" onclick="window.portal.modules.phases.researchList.removeDocument('${doc.id}')" title="Remove">
                        <i class="icon-trash-2"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div class="file-upload-area" ondrop="window.portal.modules.phases.researchList.handleFileDrop(event)" 
                 ondragover="event.preventDefault()" ondragenter="event.preventDefault()">
              <div class="upload-content">
                <i class="icon-upload"></i>
                <p>Drag & drop files here or <button type="button" class="btn-link" onclick="document.getElementById('research-files').click()">browse</button></p>
                <small>Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 50MB each)</small>
              </div>
              <input type="file" id="research-files" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" style="display: none">
            </div>
            <div id="uploaded-files-list"></div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="window.portal.modules.phases.researchList.closeModal()">
          Cancel
        </button>
        <button class="btn-primary" onclick="window.portal.modules.phases.researchList.updateResearchItem()">
          <i class="icon-save"></i>
          Update Research Item
        </button>
      </div>
    `;
  }

  attachEventListeners() {
    // Search input
    const searchInput = document.getElementById('research-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearchInput);
    }

    // Filter select
    const filterSelect = document.getElementById('research-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', this.handleFilterChange);
    }

    // File upload
    const fileInput = document.getElementById('research-files');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileUpload);
    }

    // View mode is already set via this.viewMode, default to grid
    if (!this.viewMode) {
      this.viewMode = 'grid';
    }
  }

  async loadResearchItems() {
    try {
      const response = await fetch(`/api/research/items?project_id=${this.projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load research items');
      }

      const data = await response.json();
      this.researchItems = data.items || [];
      this.applyFilters();
    } catch (error) {
      console.error('Error loading research items:', error);
      this.portal.showNotification('Failed to load research items. Please try again.', 'error');
      this.researchItems = [];
      this.filteredItems = [];
    }
  }

  applyFilters() {
    let filtered = [...this.researchItems];

    // Apply search filter
    if (this.currentSearch) {
      const search = this.currentSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(search) ||
        (item.description && item.description.toLowerCase().includes(search)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(search))) ||
        (item.findings && item.findings.some(finding => finding.text.toLowerCase().includes(search)))
      );
    }

    // Apply type filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(item => item.research_type === this.currentFilter);
    }

    this.filteredItems = filtered;
  }

  handleSearchInput(event) {
    this.currentSearch = event.target.value;
    this.applyFilters();
    this.updateContent();
  }

  handleFilterChange(event) {
    this.currentFilter = event.target.value;
    this.applyFilters();
    this.updateContent();
  }

  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const uploadList = document.getElementById('uploaded-files-list');
    if (!uploadList) return;

    for (const file of files) {
      await this.uploadFile(file, uploadList);
    }

    // Clear the input
    event.target.value = '';
  }

  async uploadFile(file, container) {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.uploadingFiles.set(fileId, file);

    // Add file to UI immediately with upload progress
    const fileElement = document.createElement('div');
    fileElement.className = 'uploaded-file-item';
    fileElement.innerHTML = `
      <div class="file-info">
        <i class="icon-file-text"></i>
        <span class="file-name">${this.escapeHtml(file.name)}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
      </div>
      <div class="file-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <span class="progress-text">0%</span>
      </div>
      <button type="button" class="btn-icon danger" onclick="window.portal.modules.phases.researchList.cancelUpload('${fileId}')">
        <i class="icon-x"></i>
      </button>
    `;
    container.appendChild(fileElement);

    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('project_id', this.projectId);
      formData.append('description', `Research document: ${file.name}`);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update file element to show success
      fileElement.innerHTML = `
        <div class="file-info">
          <i class="icon-file-text"></i>
          <span class="file-name">${this.escapeHtml(file.name)}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </div>
        <div class="file-status success">
          <i class="icon-check"></i>
          <span>Uploaded</span>
        </div>
      `;

      // Store file reference for saving
      fileElement.dataset.fileId = result.files[0].id;
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file element to show error
      fileElement.innerHTML = `
        <div class="file-info">
          <i class="icon-file-text"></i>
          <span class="file-name">${this.escapeHtml(file.name)}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
        </div>
        <div class="file-status error">
          <i class="icon-alert-circle"></i>
          <span>Failed</span>
        </div>
        <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
          <i class="icon-trash-2"></i>
        </button>
      `;
    } finally {
      this.uploadingFiles.delete(fileId);
    }
  }

  handleItemSelection(itemId, checked) {
    if (checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
    this.updateBulkActions();
  }

  toggleSelectAll(checked) {
    if (checked) {
      this.filteredItems.forEach(item => this.selectedItems.add(item.id));
    } else {
      this.selectedItems.clear();
    }
    this.updateContent();
  }

  toggleItemSelection(itemId, checked) {
    this.handleItemSelection(itemId, checked);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.updateContent();
  }

  createResearchItem(typeId = null) {
    this.editingItem = null;
    this.showingModal = true;
    this.updateModal();

    // If a type was specified, pre-select it
    setTimeout(() => {
      if (typeId) {
        const typeSelect = document.getElementById('research-type');
        if (typeSelect) {
          typeSelect.value = typeId;
        }
      }
    }, 100);
  }

  async editResearchItem(itemId) {
    try {
      const response = await fetch(`/api/research/items/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load research item');
      }

      const data = await response.json();
      this.editingItem = data.item;
      this.showingModal = true;
      this.updateModal();
    } catch (error) {
      console.error('Error loading research item:', error);
      this.portal.showNotification('Failed to load research item. Please try again.', 'error');
    }
  }

  async viewResearchItem(itemId) {
    // Implementation for viewing research item details
    // This could open a detailed view modal or navigate to a dedicated page
    await this.editResearchItem(itemId);
  }

  async deleteResearchItem(itemId) {
    if (!confirm('Are you sure you want to delete this research item? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/research/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete research item');
      }

      this.portal.showNotification('Research item deleted successfully', 'success');
      await this.loadResearchItems();
      this.updateContent();
    } catch (error) {
      console.error('Error deleting research item:', error);
      this.portal.showNotification('Failed to delete research item. Please try again.', 'error');
    }
  }

  async saveResearchItem() {
    const form = document.getElementById('research-form');
    if (!form) return;

    const formData = new FormData(form);
    const title = document.getElementById('research-title')?.value?.trim();
    const type = document.getElementById('research-type')?.value;
    const description = document.getElementById('research-description')?.value?.trim();
    const tagsInput = document.getElementById('research-tags')?.value?.trim();

    if (!title || !type) {
      this.portal.showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Get findings
    const findingInputs = document.querySelectorAll('textarea[name="finding"]');
    const findings = Array.from(findingInputs)
      .map(input => input.value.trim())
      .filter(text => text.length > 0)
      .map(text => ({ text }));

    // Get tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Get uploaded file IDs
    const uploadedFiles = Array.from(document.querySelectorAll('#uploaded-files-list .uploaded-file-item[data-file-id]'))
      .map(element => element.dataset.fileId);

    try {
      const response = await fetch('/api/research/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: this.projectId,
          title,
          research_type: type,
          description,
          tags,
          findings,
          document_ids: uploadedFiles
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save research item');
      }

      this.portal.showNotification('Research item saved successfully', 'success');
      this.closeModal();
      await this.loadResearchItems();
      this.updateContent();
    } catch (error) {
      console.error('Error saving research item:', error);
      this.portal.showNotification('Failed to save research item. Please try again.', 'error');
    }
  }

  async updateResearchItem() {
    if (!this.editingItem) return;

    const form = document.getElementById('research-form');
    if (!form) return;

    const title = document.getElementById('research-title')?.value?.trim();
    const type = document.getElementById('research-type')?.value;
    const description = document.getElementById('research-description')?.value?.trim();
    const tagsInput = document.getElementById('research-tags')?.value?.trim();

    if (!title || !type) {
      this.portal.showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Get findings
    const findingInputs = document.querySelectorAll('textarea[name="finding"]');
    const findings = Array.from(findingInputs)
      .map(input => input.value.trim())
      .filter(text => text.length > 0)
      .map(text => ({ text }));

    // Get tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Get uploaded file IDs
    const uploadedFiles = Array.from(document.querySelectorAll('#uploaded-files-list .uploaded-file-item[data-file-id]'))
      .map(element => element.dataset.fileId);

    try {
      const response = await fetch(`/api/research/items/${this.editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          research_type: type,
          description,
          tags,
          findings,
          document_ids: uploadedFiles
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update research item');
      }

      this.portal.showNotification('Research item updated successfully', 'success');
      this.closeModal();
      await this.loadResearchItems();
      this.updateContent();
    } catch (error) {
      console.error('Error updating research item:', error);
      this.portal.showNotification('Failed to update research item. Please try again.', 'error');
    }
  }

  addFinding() {
    const findingsList = document.getElementById('findings-list');
    if (!findingsList) return;

    const findingElement = document.createElement('div');
    findingElement.className = 'finding-item';
    findingElement.innerHTML = `
      <textarea name="finding" rows="2" placeholder="Key finding or insight..."></textarea>
      <button type="button" class="btn-icon danger" onclick="this.parentElement.remove()">
        <i class="icon-trash-2"></i>
      </button>
    `;
    findingsList.appendChild(findingElement);

    // Focus the new textarea
    const textarea = findingElement.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }

  async handleFileDrop(event) {
    event.preventDefault();
    
    const files = Array.from(event.dataTransfer.files);
    const uploadList = document.getElementById('uploaded-files-list');
    
    if (!uploadList) return;

    for (const file of files) {
      await this.uploadFile(file, uploadList);
    }
  }

  cancelUpload(fileId) {
    this.uploadingFiles.delete(fileId);
    // Remove the file element from UI
    const fileElement = document.querySelector(`[onclick*="${fileId}"]`);
    if (fileElement) {
      fileElement.closest('.uploaded-file-item').remove();
    }
  }

  async downloadDocument(documentId) {
    try {
      const response = await fetch(`/api/files/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // Let browser determine filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      this.portal.showNotification('Failed to download document. Please try again.', 'error');
    }
  }

  async removeDocument(documentId) {
    if (!confirm('Are you sure you want to remove this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/research/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove document');
      }

      // Remove from UI
      const documentElement = document.querySelector(`[data-id="${documentId}"]`);
      if (documentElement) {
        documentElement.remove();
      }

      this.portal.showNotification('Document removed successfully', 'success');
    } catch (error) {
      console.error('Error removing document:', error);
      this.portal.showNotification('Failed to remove document. Please try again.', 'error');
    }
  }

  async downloadDocuments(itemId) {
    try {
      const response = await fetch(`/api/research/items/${itemId}/documents/download`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-documents-${itemId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      this.portal.showNotification('Failed to download documents. Please try again.', 'error');
    }
  }

  async exportResearch() {
    try {
      this.portal.showNotification('Generating research export...', 'info');

      const response = await fetch(`/api/research/export?project_id=${this.projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-export-${this.projectId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.portal.showNotification('Research export downloaded successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      this.portal.showNotification('Failed to export research. Please try again.', 'error');
    }
  }

  async bulkExport() {
    const selectedIds = Array.from(this.selectedItems);
    if (selectedIds.length === 0) return;

    try {
      this.portal.showNotification('Generating export for selected items...', 'info');

      const response = await fetch('/api/research/bulk-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item_ids: selectedIds })
      });

      if (!response.ok) {
        throw new Error('Bulk export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-selection-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.portal.showNotification('Selected research exported successfully', 'success');
    } catch (error) {
      console.error('Bulk export error:', error);
      this.portal.showNotification('Failed to export selected research. Please try again.', 'error');
    }
  }

  async bulkTag() {
    const selectedIds = Array.from(this.selectedItems);
    if (selectedIds.length === 0) return;

    const tags = prompt('Enter tags to add (comma-separated):');
    if (!tags) return;

    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagList.length === 0) return;

    try {
      const response = await fetch('/api/research/bulk-tag', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          item_ids: selectedIds,
          tags: tagList
        })
      });

      if (!response.ok) {
        throw new Error('Bulk tagging failed');
      }

      this.portal.showNotification(`Tags added to ${selectedIds.length} research items`, 'success');
      await this.loadResearchItems();
      this.updateContent();
    } catch (error) {
      console.error('Bulk tag error:', error);
      this.portal.showNotification('Failed to add tags. Please try again.', 'error');
    }
  }

  async bulkDelete() {
    const selectedIds = Array.from(this.selectedItems);
    if (selectedIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} research item${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/research/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item_ids: selectedIds })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      this.portal.showNotification(`${selectedIds.length} research items deleted successfully`, 'success');
      this.selectedItems.clear();
      await this.loadResearchItems();
      this.updateContent();
    } catch (error) {
      console.error('Bulk delete error:', error);
      this.portal.showNotification('Failed to delete research items. Please try again.', 'error');
    }
  }

  closeModal() {
    this.showingModal = false;
    this.editingItem = null;
    this.updateModal();
  }

  updateContent() {
    const container = document.querySelector('.research-content');
    if (container) {
      container.innerHTML = this.filteredItems.length > 0 ? this.renderResearchItems() : this.renderEmptyState();
    }

    const statsContainer = document.querySelector('.research-stats');
    if (statsContainer) {
      statsContainer.innerHTML = this.renderResearchStats();
    }

    this.updateBulkActions();
  }

  updateModal() {
    const modal = document.getElementById('research-modal');
    if (modal) {
      modal.className = `modal ${this.showingModal ? 'active' : ''}`;
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.innerHTML = this.renderModalContent();
      }
    }
  }

  updateBulkActions() {
    const bulkContainer = document.querySelector('.bulk-actions');
    if (bulkContainer) {
      if (this.selectedItems.size > 0) {
        bulkContainer.innerHTML = this.renderBulkActions();
        bulkContainer.style.display = 'flex';
      } else {
        bulkContainer.style.display = 'none';
      }
    }
  }

  // Utility functions
  escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatDate(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ResearchList;