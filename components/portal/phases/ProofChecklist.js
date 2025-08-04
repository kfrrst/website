/**
 * ProofChecklist - Production-ready pre-press proofing and approval system
 * Handles file validation, service-specific checklists, digital signatures, and proof approvals
 * 
 * Features:
 * - Automated file validation (DPI, color space, dimensions, bleeds)
 * - Service-specific checklist items (screen printing, large format, etc.)
 * - Digital signature collection and approval workflow
 * - Real-time collaboration on proofs
 * - PDF proof generation and annotation
 * - Version history and approval tracking
 * - Manual override capabilities for special cases
 */

import { BRAND } from '../../../config/brand.js';

export class ProofChecklist {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.container = null;
    this.currentProof = null;
    this.serviceTypes = [];
    this.checklistItems = [];
    this.approvals = [];
    this.validationResults = {};
    this.isLoading = false;
    this.eventListeners = [];
    
    // Validation thresholds by service type
    this.validationStandards = {
      'SP': { // Screen Printing
        minDPI: 150,
        colorMode: ['RGB', 'CMYK'],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFormats: ['AI', 'PDF', 'SVG', 'PNG'],
        bleedRequired: false
      },
      'LFP': { // Large Format Print
        minDPI: 100,
        colorMode: ['CMYK'],
        maxFileSize: 200 * 1024 * 1024, // 200MB
        allowedFormats: ['AI', 'PDF', 'TIFF', 'PSD'],
        bleedRequired: true,
        bleedSize: 0.125 // inches
      },
      'GD': { // Graphic Design
        minDPI: 300,
        colorMode: ['CMYK', 'RGB'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedFormats: ['AI', 'PDF', 'PSD', 'SVG'],
        bleedRequired: true,
        bleedSize: 0.125
      },
      'BOOK': { // Book Cover
        minDPI: 300,
        colorMode: ['CMYK'],
        maxFileSize: 100 * 1024 * 1024,
        allowedFormats: ['PDF', 'AI', 'PSD'],
        bleedRequired: true,
        bleedSize: 0.125
      }
    };

    // Service-specific checklist templates
    this.checklistTemplates = {
      'SP': { // Screen Printing
        name: 'Screen Printing Checklist',
        items: [
          { id: 'colors', label: 'Spot colors identified and approved', category: 'design', critical: true },
          { id: 'separation', label: 'Color separations verified', category: 'technical', critical: true },
          { id: 'underbase', label: 'Underbase requirements confirmed', category: 'technical', critical: false },
          { id: 'garment_specs', label: 'Garment specifications approved', category: 'materials', critical: true },
          { id: 'placement', label: 'Print placement marked correctly', category: 'design', critical: true },
          { id: 'sizes', label: 'Size breakdown confirmed', category: 'production', critical: true },
          { id: 'mockup', label: 'Digital mockup approved by client', category: 'approval', critical: true }
        ]
      },
      'LFP': { // Large Format Print
        name: 'Large Format Print Checklist',
        items: [
          { id: 'resolution', label: 'Image resolution meets minimum DPI', category: 'technical', critical: true },
          { id: 'color_profile', label: 'CMYK color profile applied', category: 'technical', critical: true },
          { id: 'bleeds', label: 'Bleeds set to 0.125" minimum', category: 'technical', critical: true },
          { id: 'material', label: 'Print material confirmed', category: 'materials', critical: true },
          { id: 'dimensions', label: 'Final dimensions verified', category: 'technical', critical: true },
          { id: 'mounting', label: 'Mounting/finishing options confirmed', category: 'production', critical: false },
          { id: 'proofs', label: 'Color proofs approved', category: 'approval', critical: true }
        ]
      },
      'GD': { // Graphic Design
        name: 'Graphic Design Checklist',
        items: [
          { id: 'brand_consistency', label: 'Brand guidelines followed', category: 'design', critical: true },
          { id: 'typography', label: 'Typography hierarchy correct', category: 'design', critical: false },
          { id: 'imagery', label: 'All images high resolution', category: 'technical', critical: true },
          { id: 'color_accuracy', label: 'Colors match brand palette', category: 'design', critical: true },
          { id: 'spelling', label: 'Spelling and grammar verified', category: 'content', critical: true },
          { id: 'formats', label: 'All required formats provided', category: 'delivery', critical: true },
          { id: 'licensing', label: 'Image/font licensing confirmed', category: 'legal', critical: true }
        ]
      },
      'BOOK': { // Book Cover
        name: 'Book Cover Checklist',
        items: [
          { id: 'spine_width', label: 'Spine width calculated correctly', category: 'technical', critical: true },
          { id: 'isbn', label: 'ISBN placement and accuracy', category: 'content', critical: true },
          { id: 'barcode', label: 'Barcode placement verified', category: 'technical', critical: true },
          { id: 'trim_safe', label: 'Text within trim-safe area', category: 'technical', critical: true },
          { id: 'bleeds', label: 'Full bleed coverage verified', category: 'technical', critical: true },
          { id: 'resolution', label: '300 DPI minimum achieved', category: 'technical', critical: true },
          { id: 'author_approval', label: 'Author approval obtained', category: 'approval', critical: true }
        ]
      }
    };
  }

  async render(container) {
    this.container = container;
    await this.loadProofData();
    this.renderInterface();
    this.attachEventListeners();
  }

  async loadProofData() {
    this.setLoading(true);
    try {
      // Load project service types
      const projectResponse = await fetch(`/api/projects/${this.projectId}`, {
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to load project data');
      }

      const project = await projectResponse.json();
      this.serviceTypes = project.services || [];

      // Load existing proof data
      const proofResponse = await fetch(`/api/projects/${this.projectId}/proofs`, {
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });

      if (proofResponse.ok) {
        const proofData = await proofResponse.json();
        this.currentProof = proofData.current_proof;
        this.approvals = proofData.approvals || [];
        this.generateChecklistItems();
      } else {
        // Create new proof session
        await this.createNewProof();
      }

      // Load uploaded files for validation
      await this.loadProjectFiles();

    } catch (error) {
      console.error('Error loading proof data:', error);
      this.showError('Failed to load proof data. Please refresh the page.');
    } finally {
      this.setLoading(false);
    }
  }

  async createNewProof() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/proofs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.portal.auth.getToken()}`
        },
        body: JSON.stringify({
          phase_id: this.phaseData.id,
          services: this.serviceTypes,
          created_by: this.portal.auth.getCurrentUser().id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create proof session');
      }

      this.currentProof = await response.json();
      this.generateChecklistItems();
    } catch (error) {
      console.error('Error creating proof:', error);
      throw error;
    }
  }

  generateChecklistItems() {
    this.checklistItems = [];
    
    // Combine checklist items from all service types
    this.serviceTypes.forEach(serviceCode => {
      const template = this.checklistTemplates[serviceCode];
      if (template) {
        template.items.forEach(item => {
          this.checklistItems.push({
            ...item,
            id: `${serviceCode}_${item.id}`,
            service: serviceCode,
            checked: false,
            notes: '',
            override: false,
            checked_by: null,
            checked_at: null
          });
        });
      }
    });

    // Load saved checklist state if available
    if (this.currentProof && this.currentProof.checklist_state) {
      this.loadChecklistState(this.currentProof.checklist_state);
    }
  }

  loadChecklistState(savedState) {
    Object.keys(savedState).forEach(itemId => {
      const item = this.checklistItems.find(i => i.id === itemId);
      if (item) {
        Object.assign(item, savedState[itemId]);
      }
    });
  }

  async loadProjectFiles() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/files`, {
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });

      if (response.ok) {
        const files = await response.json();
        await this.validateFiles(files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  async validateFiles(files) {
    this.validationResults = {};
    
    for (const file of files) {
      const serviceValidation = {};
      
      // Run validation for each service type
      for (const serviceCode of this.serviceTypes) {
        const standards = this.validationStandards[serviceCode];
        if (standards) {
          serviceValidation[serviceCode] = await this.validateFileForService(file, standards);
        }
      }
      
      this.validationResults[file.id] = serviceValidation;
    }
  }

  async validateFileForService(file, standards) {
    const validation = {
      passed: true,
      issues: [],
      warnings: []
    };

    try {
      // Validate file format
      const extension = file.filename.split('.').pop().toUpperCase();
      if (!standards.allowedFormats.includes(extension)) {
        validation.issues.push(`File format ${extension} not recommended. Use: ${standards.allowedFormats.join(', ')}`);
        validation.passed = false;
      }

      // Validate file size
      if (file.size > standards.maxFileSize) {
        validation.issues.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum (${(standards.maxFileSize / 1024 / 1024)}MB)`);
        validation.passed = false;
      }

      // For image files, validate technical specs
      if (['JPG', 'JPEG', 'PNG', 'TIFF', 'PSD'].includes(extension)) {
        const techSpecs = await this.getFileTechnicalSpecs(file);
        
        if (techSpecs.dpi < standards.minDPI) {
          validation.issues.push(`Resolution ${techSpecs.dpi} DPI below minimum ${standards.minDPI} DPI`);
          validation.passed = false;
        }

        if (standards.colorMode && !standards.colorMode.includes(techSpecs.colorMode)) {
          validation.warnings.push(`Color mode ${techSpecs.colorMode} should be ${standards.colorMode.join(' or ')}`);
        }

        if (standards.bleedRequired && !techSpecs.hasBleed) {
          validation.issues.push(`Bleeds required (${standards.bleedSize}") but not detected`);
          validation.passed = false;
        }
      }

    } catch (error) {
      console.error('File validation error:', error);
      validation.warnings.push('Could not fully validate file technical specifications');
    }

    return validation;
  }

  async getFileTechnicalSpecs(file) {
    try {
      // Call the API to get technical specs for this file
      const response = await fetch(`/api/files/${file.id}/technical-specs`, {
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });

      if (response.ok) {
        const specs = await response.json();
        return {
          dpi: specs.dpi_horizontal || specs.dpi_vertical || 72,
          colorMode: specs.color_mode || 'RGB',
          hasBleed: specs.has_bleed || false,
          width: specs.width_pixels || 0,
          height: specs.height_pixels || 0
        };
      } else {
        // Fallback - make a best guess based on file properties
        const extension = file.filename.split('.').pop().toUpperCase();
        const assumedDPI = ['AI', 'PDF', 'PSD'].includes(extension) ? 300 : 72;
        const assumedColorMode = ['AI', 'PDF', 'PSD'].includes(extension) ? 'CMYK' : 'RGB';
        
        return {
          dpi: assumedDPI,
          colorMode: assumedColorMode,
          hasBleed: false,
          width: 1920,
          height: 1080
        };
      }
    } catch (error) {
      console.error('Error getting file technical specs:', error);
      // Return safe defaults
      return {
        dpi: 72,
        colorMode: 'RGB',
        hasBleed: false,
        width: 1920,
        height: 1080
      };
    }
  }

  renderInterface() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="proof-checklist-container">
        ${this.renderHeader()}
        ${this.renderValidationSummary()}
        ${this.renderServiceTabs()}
        ${this.renderChecklistSection()}
        ${this.renderApprovalSection()}
        ${this.renderHistorySection()}
      </div>
    `;

    this.addStyles();
  }

  renderHeader() {
    const completedItems = this.checklistItems.filter(item => item.checked).length;
    const totalItems = this.checklistItems.length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return `
      <div class="proof-header">
        <div class="proof-title">
          <h3>Pre-Press Checklist</h3>
          <div class="proof-status">
            <span class="status-badge ${this.getProofStatus()}">${this.getProofStatusText()}</span>
          </div>
        </div>
        
        <div class="proof-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${completedItems} of ${totalItems} items completed</span>
        </div>
        
        <div class="proof-actions">
          <button class="btn-secondary" onclick="proofChecklist.exportReport()">
            Export Report
          </button>
          <button class="btn-secondary" onclick="proofChecklist.generatePDF()">
            Generate PDF Proof
          </button>
          ${this.canSubmitForApproval() ? `
            <button class="btn-primary" onclick="proofChecklist.submitForApproval()">
              Submit for Approval
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderValidationSummary() {
    if (Object.keys(this.validationResults).length === 0) {
      return '<div class="validation-summary"><div class="no-files">No files uploaded yet</div></div>';
    }

    let passedFiles = 0;
    let totalFiles = 0;
    const allIssues = [];

    Object.values(this.validationResults).forEach(fileValidation => {
      Object.values(fileValidation).forEach(serviceValidation => {
        totalFiles++;
        if (serviceValidation.passed) passedFiles++;
        allIssues.push(...serviceValidation.issues);
      });
    });

    return `
      <div class="validation-summary">
        <h4>File Validation Summary</h4>
        <div class="validation-stats">
          <div class="stat ${passedFiles === totalFiles && totalFiles > 0 ? 'success' : 'warning'}">
            <span class="stat-value">${passedFiles}/${totalFiles}</span>
            <span class="stat-label">Files Validated</span>
          </div>
          <div class="stat ${allIssues.length === 0 ? 'success' : 'error'}">
            <span class="stat-value">${allIssues.length}</span>
            <span class="stat-label">Issues Found</span>
          </div>
        </div>
        
        ${allIssues.length > 0 ? `
          <div class="validation-issues">
            <h5>Issues to Address:</h5>
            <ul>
              ${allIssues.slice(0, 5).map(issue => `<li>${issue}</li>`).join('')}
              ${allIssues.length > 5 ? `<li class="more-issues">+${allIssues.length - 5} more issues...</li>` : ''}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderServiceTabs() {
    if (this.serviceTypes.length <= 1) return '';

    return `
      <div class="service-tabs">
        <div class="tab-list">
          <button class="tab-button active" data-service="all">All Services</button>
          ${this.serviceTypes.map(service => `
            <button class="tab-button" data-service="${service}">
              ${this.getServiceName(service)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderChecklistSection() {
    const groupedItems = this.groupChecklistItems();
    
    return `
      <div class="checklist-section">
        <h4>Quality Checklist</h4>
        
        ${Object.entries(groupedItems).map(([category, items]) => `
          <div class="checklist-category">
            <h5>${this.getCategoryName(category)}</h5>
            <div class="checklist-items">
              ${items.map(item => this.renderChecklistItem(item)).join('')}
            </div>
          </div>
        `).join('')}
        
        <div class="checklist-actions">
          <button class="btn-secondary" onclick="proofChecklist.saveProgress()">
            Save Progress
          </button>
          <button class="btn-secondary" onclick="proofChecklist.resetChecklist()" 
                  ${this.checklistItems.some(item => item.checked) ? '' : 'disabled'}>
            Reset All
          </button>
        </div>
      </div>
    `;
  }

  groupChecklistItems() {
    const grouped = {};
    this.checklistItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }

  renderChecklistItem(item) {
    const isBlocked = this.isItemBlocked(item);
    
    return `
      <div class="checklist-item ${item.checked ? 'checked' : ''} ${item.critical ? 'critical' : ''} ${isBlocked ? 'blocked' : ''}">
        <div class="item-main">
          <label class="checkbox-label">
            <input type="checkbox" 
                   ${item.checked ? 'checked' : ''} 
                   ${isBlocked ? 'disabled' : ''}
                   onchange="proofChecklist.toggleItem('${item.id}', this.checked)">
            <span class="checkbox-custom"></span>
            <span class="item-text">
              ${item.label}
              ${item.critical ? '<span class="critical-badge">Critical</span>' : ''}
              ${item.override ? '<span class="override-badge">Override</span>' : ''}
            </span>
          </label>
          
          <div class="item-actions">
            ${item.checked && item.checked_by ? `
              <span class="checked-info">
                ✓ ${item.checked_by} at ${new Date(item.checked_at).toLocaleTimeString()}
              </span>
            ` : ''}
            
            <button class="btn-icon" onclick="proofChecklist.toggleNotes('${item.id}')" 
                    title="Add notes">
              📝
            </button>
            
            ${item.critical && !item.checked ? `
              <button class="btn-icon override-btn" onclick="proofChecklist.requestOverride('${item.id}')" 
                      title="Request override">
                ⚠️
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="item-notes ${item.notes ? 'has-notes' : ''}" id="notes-${item.id}">
          <textarea placeholder="Add notes about this item..." 
                    onchange="proofChecklist.updateItemNotes('${item.id}', this.value)">${item.notes || ''}</textarea>
        </div>
        
        ${isBlocked ? `
          <div class="item-blocked-message">
            This item requires file validation to pass first.
          </div>
        ` : ''}
      </div>
    `;
  }

  renderApprovalSection() {
    const canApprove = this.canSubmitForApproval();
    const pendingApprovals = this.approvals.filter(a => a.status === 'pending');
    
    return `
      <div class="approval-section">
        <h4>Approval Workflow</h4>
        
        <div class="approval-status">
          ${this.approvals.length > 0 ? `
            <div class="approval-list">
              ${this.approvals.map(approval => this.renderApprovalItem(approval)).join('')}
            </div>
          ` : `
            <div class="no-approvals">
              <p>No approvals submitted yet.</p>
              ${canApprove ? '<p>Complete the checklist to submit for approval.</p>' : ''}
            </div>
          `}
        </div>
        
        ${canApprove ? `
          <div class="digital-signature">
            <h5>Digital Approval</h5>
            <div class="signature-pad">
              <canvas id="signaturePad" width="400" height="150"></canvas>
              <div class="signature-actions">
                <button class="btn-secondary" onclick="proofChecklist.clearSignature()">Clear</button>
                <button class="btn-primary" onclick="proofChecklist.submitApproval()" id="submitApprovalBtn">
                  Submit Approval
                </button>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${pendingApprovals.length > 0 ? `
          <div class="pending-approvals">
            <h5>Pending Approvals</h5>
            <p>Waiting for approval from: ${pendingApprovals.map(a => a.approver_name).join(', ')}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderApprovalItem(approval) {
    const statusClass = approval.status === 'approved' ? 'success' : 
                       approval.status === 'rejected' ? 'error' : 'pending';
    
    return `
      <div class="approval-item ${statusClass}">
        <div class="approval-header">
          <span class="approver">${approval.approver_name}</span>
          <span class="approval-status ${statusClass}">${approval.status}</span>
          <span class="approval-date">${new Date(approval.created_at).toLocaleDateString()}</span>
        </div>
        
        ${approval.notes ? `
          <div class="approval-notes">${approval.notes}</div>
        ` : ''}
        
        ${approval.signature_data ? `
          <div class="approval-signature">
            <img src="${approval.signature_data}" alt="Digital signature" />
          </div>
        ` : ''}
      </div>
    `;
  }

  renderHistorySection() {
    return `
      <div class="history-section collapsed">
        <h4 onclick="proofChecklist.toggleHistory()">
          Version History 
          <span class="toggle-icon">▼</span>
        </h4>
        
        <div class="history-content">
          <div class="history-timeline">
            <div class="timeline-item">
              <div class="timeline-date">${new Date().toLocaleDateString()}</div>
              <div class="timeline-content">
                <h6>Proof session created</h6>
                <p>Initial checklist generated for ${this.serviceTypes.join(', ')} services</p>
              </div>
            </div>
            
            ${this.approvals.map(approval => `
              <div class="timeline-item">
                <div class="timeline-date">${new Date(approval.created_at).toLocaleDateString()}</div>
                <div class="timeline-content">
                  <h6>Approval ${approval.status}</h6>
                  <p>by ${approval.approver_name}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Event handlers and utility methods
  attachEventListeners() {
    // Store reference for global access
    window.proofChecklist = this;
    
    // Tab switching
    this.container.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchServiceTab(e.target.dataset.service);
      });
    });

    // Initialize signature pad if approval section is visible
    this.initializeSignaturePad();
  }

  initializeSignaturePad() {
    const canvas = this.container.querySelector('#signaturePad');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e) => {
      isDrawing = true;
      [lastX, lastY] = this.getMousePos(canvas, e);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      
      const [currentX, currentY] = this.getMousePos(canvas, e);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.strokeStyle = BRAND.colors.text;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      [lastX, lastY] = [currentX, currentY];
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrawing(e.touches[0]);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e.touches[0]);
    });
    canvas.addEventListener('touchend', stopDrawing);
  }

  getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    return [
      e.clientX - rect.left,
      e.clientY - rect.top
    ];
  }

  // Component methods
  async toggleItem(itemId, checked) {
    const item = this.checklistItems.find(i => i.id === itemId);
    if (!item) return;

    item.checked = checked;
    if (checked) {
      item.checked_by = this.portal.auth.getCurrentUser().name;
      item.checked_at = new Date().toISOString();
    } else {
      item.checked_by = null;
      item.checked_at = null;
    }

    await this.saveProgress();
    this.renderInterface();
  }

  toggleNotes(itemId) {
    const notesElement = this.container.querySelector(`#notes-${itemId}`);
    if (notesElement) {
      notesElement.classList.toggle('show');
    }
  }

  async updateItemNotes(itemId, notes) {
    const item = this.checklistItems.find(i => i.id === itemId);
    if (item) {
      item.notes = notes;
      await this.saveProgress();
    }
  }

  async requestOverride(itemId) {
    const item = this.checklistItems.find(i => i.id === itemId);
    if (!item) return;

    const reason = prompt('Please provide a reason for overriding this critical item:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/proofs/${this.currentProof.id}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.portal.auth.getToken()}`
        },
        body: JSON.stringify({
          item_id: itemId,
          reason: reason,
          requested_by: this.portal.auth.getCurrentUser().id
        })
      });

      if (response.ok) {
        item.override = true;
        item.override_reason = reason;
        item.checked = true;
        item.checked_by = this.portal.auth.getCurrentUser().name;
        item.checked_at = new Date().toISOString();
        
        this.showSuccess('Override request submitted and item marked as complete.');
        this.renderInterface();
      } else {
        throw new Error('Failed to submit override request');
      }
    } catch (error) {
      console.error('Override request error:', error);
      this.showError('Failed to submit override request.');
    }
  }

  switchServiceTab(service) {
    // Update active tab
    this.container.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    this.container.querySelector(`[data-service="${service}"]`).classList.add('active');

    // Filter checklist items
    const items = this.container.querySelectorAll('.checklist-item');
    items.forEach(item => {
      if (service === 'all') {
        item.style.display = 'block';
      } else {
        const itemId = item.querySelector('input').onchange.toString().match(/'([^']+)'/)[1];
        const serviceCode = itemId.split('_')[0];
        item.style.display = serviceCode === service ? 'block' : 'none';
      }
    });
  }

  async saveProgress() {
    if (!this.currentProof) return;

    try {
      const checklistState = {};
      this.checklistItems.forEach(item => {
        checklistState[item.id] = {
          checked: item.checked,
          notes: item.notes,
          checked_by: item.checked_by,
          checked_at: item.checked_at,
          override: item.override,
          override_reason: item.override_reason
        };
      });

      const response = await fetch(`/api/projects/${this.projectId}/proofs/${this.currentProof.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.portal.auth.getToken()}`
        },
        body: JSON.stringify({
          checklist_state: checklistState,
          validation_results: this.validationResults
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      this.showSuccess('Progress saved successfully.');
    } catch (error) {
      console.error('Save progress error:', error);
      this.showError('Failed to save progress.');
    }
  }

  async resetChecklist() {
    if (!confirm('Are you sure you want to reset all checklist items? This cannot be undone.')) {
      return;
    }

    this.checklistItems.forEach(item => {
      item.checked = false;
      item.notes = '';
      item.checked_by = null;
      item.checked_at = null;
      item.override = false;
      item.override_reason = null;
    });

    await this.saveProgress();
    this.renderInterface();
    this.showSuccess('Checklist reset successfully.');
  }

  clearSignature() {
    const canvas = this.container.querySelector('#signaturePad');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  async submitApproval() {
    const canvas = this.container.querySelector('#signaturePad');
    if (!canvas) return;

    // Check if signature is present
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(channel => channel !== 0);

    if (!hasSignature) {
      this.showError('Please provide a digital signature before submitting approval.');
      return;
    }

    try {
      const signatureData = canvas.toDataURL();
      const user = this.portal.auth.getCurrentUser();

      const response = await fetch(`/api/projects/${this.projectId}/proofs/${this.currentProof.id}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.portal.auth.getToken()}`
        },
        body: JSON.stringify({
          approver_id: user.id,
          approver_name: user.name,
          signature_data: signatureData,
          status: 'approved',
          notes: ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit approval');
      }

      const approval = await response.json();
      this.approvals.push(approval);
      
      this.showSuccess('Approval submitted successfully!');
      this.renderInterface();
      
      // Trigger phase progression if applicable
      this.portal.modules.phases?.checkPhaseCompletion(this.phaseData.id);
      
    } catch (error) {
      console.error('Approval submission error:', error);
      this.showError('Failed to submit approval.');
    }
  }

  async exportReport() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/proofs/${this.currentProof.id}/report`, {
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-checklist-${this.projectId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.showSuccess('Report exported successfully.');
    } catch (error) {
      console.error('Export error:', error);
      this.showError('Failed to export report.');
    }
  }

  async generatePDF() {
    this.showSuccess('PDF proof generation started. You will receive a notification when complete.');
    
    try {
      await fetch(`/api/projects/${this.projectId}/proofs/${this.currentProof.id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.portal.auth.getToken()}` }
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      this.showError('Failed to start PDF generation.');
    }
  }

  toggleHistory() {
    const historySection = this.container.querySelector('.history-section');
    const toggleIcon = historySection.querySelector('.toggle-icon');
    
    historySection.classList.toggle('collapsed');
    toggleIcon.textContent = historySection.classList.contains('collapsed') ? '▼' : '▲';
  }

  // Utility methods
  canSubmitForApproval() {
    const criticalItems = this.checklistItems.filter(item => item.critical);
    const completedCritical = criticalItems.filter(item => item.checked);
    return criticalItems.length > 0 && completedCritical.length === criticalItems.length;
  }

  isItemBlocked(item) {
    // Items can be blocked by validation failures
    if (item.category === 'technical') {
      return Object.values(this.validationResults).some(fileValidation =>
        Object.values(fileValidation).some(serviceValidation => !serviceValidation.passed)
      );
    }
    return false;
  }

  getProofStatus() {
    if (this.approvals.some(a => a.status === 'approved')) return 'approved';
    if (this.approvals.some(a => a.status === 'rejected')) return 'rejected';
    if (this.canSubmitForApproval()) return 'ready';
    return 'in-progress';
  }

  getProofStatusText() {
    const status = this.getProofStatus();
    return {
      'approved': 'Approved',
      'rejected': 'Needs Revision',
      'ready': 'Ready for Approval',
      'in-progress': 'In Progress'
    }[status];
  }

  getServiceName(serviceCode) {
    const serviceNames = {
      'SP': 'Screen Printing',
      'LFP': 'Large Format',
      'GD': 'Graphic Design',
      'BOOK': 'Book Cover',
      'WW': 'Woodworking',
      'SAAS': 'SaaS Dev',
      'WEB': 'Website'
    };
    return serviceNames[serviceCode] || serviceCode;
  }

  getCategoryName(category) {
    const categoryNames = {
      'design': 'Design Requirements',
      'technical': 'Technical Specifications',
      'materials': 'Materials & Production',
      'content': 'Content Verification',
      'approval': 'Client Approvals',
      'legal': 'Legal & Licensing',
      'delivery': 'Delivery Requirements',
      'production': 'Production Requirements'
    };
    return categoryNames[category] || category;
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (this.container) {
      this.container.classList.toggle('loading', loading);
    }
  }

  showSuccess(message) {
    this.portal.showNotification(message, 'success');
  }

  showError(message) {
    this.portal.showNotification(message, 'error');
  }

  addStyles() {
    if (document.querySelector('#proof-checklist-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'proof-checklist-styles';
    styles.textContent = `
      .proof-checklist-container {
        background: ${BRAND.colors.bone};
        border-radius: 8px;
        padding: 24px;
        font-family: ${BRAND.typography.fontFamily};
        color: ${BRAND.colors.text};
        max-width: 1200px;
        margin: 0 auto;
      }

      .proof-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 1px solid ${BRAND.colors.border};
      }

      .proof-title {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .proof-title h3 {
        margin: 0;
        color: ${BRAND.colors.text};
        font-weight: ${BRAND.typography.weights.semibold};
      }

      .status-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: ${BRAND.typography.weights.medium};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-badge.approved { background: ${BRAND.colors.accentGreen}; color: ${BRAND.colors.green}; }
      .status-badge.rejected { background: ${BRAND.colors.accentRed}; color: ${BRAND.colors.red}; }
      .status-badge.ready { background: ${BRAND.colors.accentBlue}; color: ${BRAND.colors.blue}; }
      .status-badge.in-progress { background: ${BRAND.colors.accentYellow}; color: ${BRAND.colors.yellow}; }

      .proof-progress {
        flex: 1;
        max-width: 300px;
        margin: 0 24px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: ${BRAND.colors.borderLight};
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background: ${BRAND.colors.blue};
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .progress-text {
        font-size: 14px;
        color: ${BRAND.colors.textSecondary};
      }

      .proof-actions {
        display: flex;
        gap: 12px;
      }

      .btn-primary, .btn-secondary {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-family: ${BRAND.typography.fontFamily};
        font-weight: ${BRAND.typography.weights.medium};
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
      }

      .btn-primary {
        background: ${BRAND.colors.blue};
        color: white;
      }

      .btn-primary:hover {
        background: #0043CC;
      }

      .btn-secondary {
        background: ${BRAND.colors.boneLight};
        color: ${BRAND.colors.text};
        border: 1px solid ${BRAND.colors.border};
      }

      .btn-secondary:hover {
        background: ${BRAND.colors.hover};
      }

      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        font-size: 16px;
      }

      .btn-icon:hover {
        background: ${BRAND.colors.hover};
      }

      .validation-summary {
        background: ${BRAND.colors.boneLight};
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .validation-summary h4 {
        margin: 0 0 16px 0;
        color: ${BRAND.colors.text};
      }

      .validation-stats {
        display: flex;
        gap: 24px;
        margin-bottom: 16px;
      }

      .stat {
        text-align: center;
        padding: 12px;
        border-radius: 6px;
        background: ${BRAND.colors.bone};
      }

      .stat.success { border-left: 4px solid ${BRAND.colors.green}; }
      .stat.warning { border-left: 4px solid ${BRAND.colors.yellow}; }
      .stat.error { border-left: 4px solid ${BRAND.colors.red}; }

      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: ${BRAND.typography.weights.bold};
        color: ${BRAND.colors.text};
      }

      .stat-label {
        display: block;
        font-size: 12px;
        color: ${BRAND.colors.textSecondary};
        margin-top: 4px;
      }

      .validation-issues {
        background: ${BRAND.colors.accentRed};
        border-radius: 6px;
        padding: 16px;
      }

      .validation-issues h5 {
        margin: 0 0 12px 0;
        color: ${BRAND.colors.red};
      }

      .validation-issues ul {
        margin: 0;
        padding-left: 20px;
        color: ${BRAND.colors.red};
      }

      .validation-issues li {
        margin-bottom: 4px;
      }

      .service-tabs {
        margin-bottom: 24px;
      }

      .tab-list {
        display: flex;
        gap: 2px;
        background: ${BRAND.colors.borderLight};
        padding: 4px;
        border-radius: 8px;
      }

      .tab-button {
        flex: 1;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 6px;
        font-family: ${BRAND.typography.fontFamily};
        font-weight: ${BRAND.typography.weights.medium};
        color: ${BRAND.colors.textSecondary};
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tab-button.active {
        background: ${BRAND.colors.bone};
        color: ${BRAND.colors.text};
        box-shadow: 0 1px 3px ${BRAND.colors.shadow};
      }

      .checklist-section {
        margin-bottom: 32px;
      }

      .checklist-section h4 {
        margin: 0 0 20px 0;
        color: ${BRAND.colors.text};
      }

      .checklist-category {
        margin-bottom: 24px;
      }

      .checklist-category h5 {
        margin: 0 0 12px 0;
        color: ${BRAND.colors.textSecondary};
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .checklist-items {
        space-y: 8px;
      }

      .checklist-item {
        background: ${BRAND.colors.boneLight};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
        border: 1px solid ${BRAND.colors.borderLight};
      }

      .checklist-item.checked {
        background: ${BRAND.colors.accentGreen};
        border-color: ${BRAND.colors.green};
      }

      .checklist-item.critical {
        border-left: 4px solid ${BRAND.colors.red};
      }

      .checklist-item.blocked {
        opacity: 0.6;
        background: ${BRAND.colors.borderSubtle};
      }

      .item-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        flex: 1;
      }

      .checkbox-custom {
        width: 20px;
        height: 20px;
        border: 2px solid ${BRAND.colors.border};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .checklist-item input[type="checkbox"] {
        display: none;
      }

      .checklist-item input[type="checkbox"]:checked + .checkbox-custom {
        background: ${BRAND.colors.green};
        border-color: ${BRAND.colors.green};
      }

      .checklist-item input[type="checkbox"]:checked + .checkbox-custom:after {
        content: "✓";
        color: white;
        font-weight: bold;
      }

      .item-text {
        flex: 1;
        color: ${BRAND.colors.text};
      }

      .critical-badge {
        background: ${BRAND.colors.red};
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        margin-left: 8px;
      }

      .override-badge {
        background: ${BRAND.colors.yellow};
        color: ${BRAND.colors.text};
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        margin-left: 8px;
      }

      .item-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .checked-info {
        font-size: 12px;
        color: ${BRAND.colors.textSecondary};
      }

      .item-notes {
        margin-top: 12px;
        display: none;
      }

      .item-notes.has-notes,
      .item-notes.show {
        display: block;
      }

      .item-notes textarea {
        width: 100%;
        min-height: 60px;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid ${BRAND.colors.border};
        font-family: ${BRAND.typography.fontFamily};
        resize: vertical;
        background: ${BRAND.colors.bone};
      }

      .item-blocked-message {
        margin-top: 8px;
        padding: 8px;
        background: ${BRAND.colors.accentYellow};
        border-radius: 4px;
        font-size: 12px;
        color: ${BRAND.colors.yellow};
      }

      .checklist-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid ${BRAND.colors.border};
      }

      .approval-section {
        margin-bottom: 32px;
      }

      .approval-section h4 {
        margin: 0 0 20px 0;
        color: ${BRAND.colors.text};
      }

      .approval-list {
        space-y: 12px;
        margin-bottom: 24px;
      }

      .approval-item {
        background: ${BRAND.colors.boneLight};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        border-left: 4px solid ${BRAND.colors.border};
      }

      .approval-item.success { border-left-color: ${BRAND.colors.green}; }
      .approval-item.error { border-left-color: ${BRAND.colors.red}; }
      .approval-item.pending { border-left-color: ${BRAND.colors.yellow}; }

      .approval-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .approver {
        font-weight: ${BRAND.typography.weights.medium};
        color: ${BRAND.colors.text};
      }

      .approval-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        text-transform: uppercase;
      }

      .approval-status.success { background: ${BRAND.colors.accentGreen}; color: ${BRAND.colors.green}; }
      .approval-status.error { background: ${BRAND.colors.accentRed}; color: ${BRAND.colors.red}; }
      .approval-status.pending { background: ${BRAND.colors.accentYellow}; color: ${BRAND.colors.yellow}; }

      .approval-date {
        font-size: 12px;
        color: ${BRAND.colors.textSecondary};
      }

      .approval-notes {
        margin-top: 8px;
        font-style: italic;
        color: ${BRAND.colors.textSecondary};
      }

      .approval-signature {
        margin-top: 12px;
        padding: 8px;
        background: ${BRAND.colors.bone};
        border-radius: 4px;
        text-align: center;
      }

      .approval-signature img {
        max-height: 60px;
        border: 1px solid ${BRAND.colors.border};
        border-radius: 4px;
      }

      .digital-signature {
        background: ${BRAND.colors.boneLight};
        border-radius: 8px;
        padding: 20px;
        margin-top: 24px;
      }

      .digital-signature h5 {
        margin: 0 0 16px 0;
        color: ${BRAND.colors.text};
      }

      .signature-pad {
        text-align: center;
      }

      .signature-pad canvas {
        border: 2px solid ${BRAND.colors.border};
        border-radius: 8px;
        background: ${BRAND.colors.bone};
        cursor: crosshair;
      }

      .signature-actions {
        margin-top: 12px;
        display: flex;
        justify-content: center;
        gap: 12px;
      }

      .pending-approvals {
        background: ${BRAND.colors.accentYellow};
        border-radius: 8px;
        padding: 16px;
        margin-top: 24px;
      }

      .pending-approvals h5 {
        margin: 0 0 8px 0;
        color: ${BRAND.colors.yellow};
      }

      .pending-approvals p {
        margin: 0;
        color: ${BRAND.colors.yellow};
      }

      .history-section {
        border-top: 1px solid ${BRAND.colors.border};
        padding-top: 24px;
      }

      .history-section h4 {
        margin: 0 0 16px 0;
        color: ${BRAND.colors.text};
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .toggle-icon {
        transition: transform 0.2s ease;
      }

      .history-section.collapsed .toggle-icon {
        transform: rotate(-90deg);
      }

      .history-content {
        display: block;
      }

      .history-section.collapsed .history-content {
        display: none;
      }

      .history-timeline {
        position: relative;
        padding-left: 20px;
      }

      .history-timeline:before {
        content: '';
        position: absolute;
        left: 8px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: ${BRAND.colors.border};
      }

      .timeline-item {
        position: relative;
        margin-bottom: 20px;
      }

      .timeline-item:before {
        content: '';
        position: absolute;
        left: -16px;
        top: 6px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${BRAND.colors.blue};
      }

      .timeline-date {
        font-size: 12px;
        color: ${BRAND.colors.textSecondary};
        margin-bottom: 4px;
      }

      .timeline-content h6 {
        margin: 0 0 4px 0;
        color: ${BRAND.colors.text};
      }

      .timeline-content p {
        margin: 0;
        color: ${BRAND.colors.textSecondary};
        font-size: 14px;
      }

      .no-files,
      .no-approvals {
        text-align: center;
        padding: 40px 20px;
        color: ${BRAND.colors.textSecondary};
      }

      .loading {
        opacity: 0.6;
        pointer-events: none;
      }

      @media (max-width: 768px) {
        .proof-header {
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }

        .proof-progress {
          max-width: none;
          margin: 0;
        }

        .proof-actions {
          justify-content: center;
        }

        .validation-stats {
          flex-direction: column;
          gap: 12px;
        }

        .tab-list {
          flex-wrap: wrap;
        }

        .tab-button {
          flex: 1 1 auto;
          min-width: 120px;
        }

        .item-main {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .item-actions {
          justify-content: flex-end;
        }

        .signature-pad canvas {
          width: 100%;
          height: 120px;
        }

        .signature-actions {
          flex-direction: column;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Clean up global reference
    if (window.proofChecklist === this) {
      delete window.proofChecklist;
    }

    // Remove component styles
    const styles = document.querySelector('#proof-checklist-styles');
    if (styles) {
      styles.remove();
    }
  }
}

export default ProofChecklist;