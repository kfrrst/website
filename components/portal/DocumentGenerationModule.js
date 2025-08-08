import { BaseModule } from './BaseModule.js';

/**
 * Document Generation Module for Client Portal
 * Allows clients to view and download project documents
 */
export class DocumentGenerationModule extends BaseModule {
  constructor(portal) {
    super(portal, 'DocumentGenerationModule');
    this.currentProject = null;
    this.availableTemplates = [];
    this.generatedDocuments = [];
  }

  async doInit() {
    // Find the documents section container
    const documentsSection = document.getElementById('documents');
    if (documentsSection) {
      this.element = documentsSection.querySelector('#documents-section');
      if (this.element) {
        await this.setupDocumentsInterface();
      }
    }
  }

  /**
   * Initialize the module for a specific project
   */
  async initialize(projectId) {
    this.currentProject = projectId;
    await this.loadAvailableTemplates();
    await this.loadGeneratedDocuments();
  }

  /**
   * Setup documents interface
   */
  async setupDocumentsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="documents-container">
        <div class="documents-header">
          <h2>Project Documents</h2>
        </div>
        <div class="documents-content">
          <p>Select a project to view available documents.</p>
        </div>
      </div>
    `;
  }

  /**
   * Load available templates for the current project
   */
  async loadAvailableTemplates() {
    try {
      const response = await this.apiRequest('/api/documents/templates');

      const data = await response.json();
      
      if (data.success) {
        // Filter templates based on current project's services and phase
        const project = this.portal.currentProject;
        this.availableTemplates = data.templates.filter(template => {
          // Check service filter
          if (template.service_filters && template.service_filters.length > 0) {
            const hasMatchingService = template.service_filters.some(service => 
              project.services?.includes(service)
            );
            if (!hasMatchingService) return false;
          }
          
          // Check phase filter
          if (template.phase_filters && template.phase_filters.length > 0) {
            const currentPhase = project.current_phase_key;
            if (!template.phase_filters.includes(currentPhase)) return false;
          }
          
          return true;
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  /**
   * Load previously generated documents
   */
  async loadGeneratedDocuments() {
    try {
      const response = await fetch(`/api/documents/project/${this.currentProject}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.generatedDocuments = data.documents;
        this.renderDocumentHistory();
      }
    } catch (error) {
      console.error('Error loading generated documents:', error);
    }
  }

  /**
   * Render the document generation UI
   */
  render() {
    const container = document.getElementById('documents-section');
    if (!container) return;

    container.innerHTML = `
      <div class="documents-container">
        <h2>Project Documents</h2>
        
        <div class="document-generation-section">
          <h3>Generate New Document</h3>
          <div class="available-templates">
            ${this.renderAvailableTemplates()}
          </div>
        </div>
        
        <div class="document-history-section">
          <h3>Document History</h3>
          <div id="document-history-list">
            <!-- Document history will be rendered here -->
          </div>
        </div>
      </div>
    `;

    this.renderDocumentHistory();
  }

  /**
   * Render available templates
   */
  renderAvailableTemplates() {
    if (this.availableTemplates.length === 0) {
      return '<p class="no-templates">No documents available for the current project phase.</p>';
    }

    return `
      <div class="template-grid">
        ${this.availableTemplates.map(template => `
          <div class="template-card">
            <div class="template-icon">
              ${this.getTemplateIcon(template.template_type)}
            </div>
            <h4>${template.name}</h4>
            <p>${template.description || 'Generate this document for your project'}</p>
            <div class="template-actions">
              <button class="btn-secondary" onclick="window.portal.modules.documentModule.previewDocument('${template.module_id}')">
                Preview
              </button>
              <button class="btn-primary" onclick="window.portal.modules.documentModule.generateDocument('${template.module_id}')">
                Generate PDF
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render document history
   */
  renderDocumentHistory() {
    const container = document.getElementById('document-history-list');
    if (!container) return;

    if (this.generatedDocuments.length === 0) {
      container.innerHTML = '<p class="no-history">No documents have been generated yet.</p>';
      return;
    }

    container.innerHTML = `
      <div class="document-list">
        ${this.generatedDocuments.map(doc => `
          <div class="document-item">
            <div class="document-info">
              <div class="document-icon">
                ${this.getTemplateIcon(doc.template_type)}
              </div>
              <div>
                <h4>${doc.template_name}</h4>
                <p class="document-meta">
                  Generated on ${new Date(doc.created_at).toLocaleDateString()} 
                  by ${doc.generated_by_name}
                </p>
              </div>
            </div>
            <div class="document-actions">
              <button class="btn-link" onclick="window.portal.modules.documentModule.downloadDocument('${doc.id}')">
                Download
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Get icon for template type
   */
  getTemplateIcon(type) {
    const icons = {
      'proposal': '[DOC]',
      'contract': '[CONTRACT]',
      'invoice': '[INVOICE]',
      'brief': '[BRIEF]',
      'report': '[REPORT]',
      'other': '[FILE]'
    };
    return icons[type] || icons.other;
  }

  /**
   * Preview a document template
   */
  async previewDocument(templateId) {
    try {
      this.showLoading('Generating preview...');
      
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: this.currentProject,
          template_id: templateId,
          format: 'html'
        })
      });

      const data = await response.json();
      
      if (data.success && data.document.html) {
        this.showDocumentPreview(data.document.html);
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      this.portal.showNotification('Failed to generate preview', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Generate and download a document
   */
  async generateDocument(templateId) {
    try {
      this.showLoading('Generating document...');
      
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: this.currentProject,
          template_id: templateId,
          format: 'pdf'
        })
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateId}_${this.currentProject}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.portal.showNotification('Document generated successfully', 'success');
        
        // Reload document history
        await this.loadGeneratedDocuments();
      } else {
        throw new Error('Failed to generate document');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      this.portal.showNotification('Failed to generate document', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Download a previously generated document
   */
  async downloadDocument(documentId) {
    try {
      const doc = this.generatedDocuments.find(d => d.id === documentId);
      if (!doc) return;
      
      // Re-generate the document
      await this.generateDocument(doc.template_id);
    } catch (error) {
      console.error('Error downloading document:', error);
      this.portal.showNotification('Failed to download document', 'error');
    }
  }

  /**
   * Show document preview modal
   */
  showDocumentPreview(html) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h2>Document Preview</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body" style="padding: 0;">
          <iframe 
            srcdoc="${html.replace(/"/g, '&quot;')}" 
            style="width: 100%; height: 70vh; border: none; background: white;"
          ></iframe>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Show loading state
   */
  showLoading(message = 'Loading...') {
    const loader = document.createElement('div');
    loader.id = 'document-loader';
    loader.className = 'document-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loader = document.getElementById('document-loader');
    if (loader) {
      loader.remove();
    }
  }
}

export default DocumentGenerationModule;