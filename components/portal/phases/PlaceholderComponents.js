/**
 * Placeholder components for phase UI elements that need full implementation
 * These provide basic structure and can be enhanced with specific functionality
 * 
 * NOTE: MiroEmbed has been moved to its own production-ready file
 */

// Research Tools
export class ResearchList {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="research-list">
        <h3>Research & Insights</h3>
        <div class="research-items">
          <div class="research-item">
            <h4>Market Analysis</h4>
            <p>Competitive landscape and positioning</p>
          </div>
          <div class="research-item">
            <h4>User Research</h4>
            <p>Target audience insights and personas</p>
          </div>
          <div class="research-item">
            <h4>Brand Audit</h4>
            <p>Current brand assessment and opportunities</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Discovery Tools
export class NotionEmbed {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="embed-container">
        <h3>Discovery Documentation</h3>
        <p>Project requirements and specifications</p>
        <iframe src="https://notion.so/${this.phaseData.notionId || ''}" 
                width="100%" height="600" frameborder="0"></iframe>
      </div>
    `;
  }
}

// 3D/CAD Tools
export class ModelViewer {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="model-viewer">
        <h3>3D Model Preview</h3>
        <div class="viewer-container">
          <model-viewer src="${this.phaseData.modelUrl || ''}" 
                        alt="3D model" 
                        auto-rotate 
                        camera-controls></model-viewer>
        </div>
        <div class="model-info">
          <p>Use mouse to rotate, scroll to zoom</p>
        </div>
      </div>
    `;
  }
}

// Production Tools
export class ProofChecklist {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    const checklist = [
      { id: 'colors', label: 'Colors match brand guidelines', checked: false },
      { id: 'bleeds', label: 'Bleeds set correctly (0.125")', checked: false },
      { id: 'resolution', label: 'Images at 300 DPI minimum', checked: false },
      { id: 'fonts', label: 'All fonts outlined/embedded', checked: false },
      { id: 'spelling', label: 'Spelling and grammar checked', checked: false }
    ];

    container.innerHTML = `
      <div class="proof-checklist">
        <h3>Pre-Press Checklist</h3>
        <div class="checklist-items">
          ${checklist.map(item => `
            <label class="checklist-item">
              <input type="checkbox" ${item.checked ? 'checked' : ''}>
              <span>${item.label}</span>
            </label>
          `).join('')}
        </div>
        <button class="btn-primary">Approve for Production</button>
      </div>
    `;
  }
}

export class BatchStatus {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="batch-status">
        <h3>Production Status</h3>
        <div class="batch-progress">
          <div class="progress-item">
            <span>Setup</span>
            <div class="progress-bar"><div class="progress-fill" style="width: 100%"></div></div>
          </div>
          <div class="progress-item">
            <span>Printing</span>
            <div class="progress-bar"><div class="progress-fill" style="width: 75%"></div></div>
          </div>
          <div class="progress-item">
            <span>Quality Check</span>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
          </div>
        </div>
        <p class="status-message">Currently printing batch 3 of 4...</p>
      </div>
    `;
  }
}

// Development Tools
export class StagingLink {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="staging-link">
        <h3>Staging Environment</h3>
        <div class="staging-info">
          <p>Test your application before launch</p>
          <a href="${this.phaseData.stagingUrl || '#'}" target="_blank" class="btn-primary">
            Open Staging Site
          </a>
        </div>
        <div class="staging-credentials">
          <h4>Test Credentials</h4>
          <p>Username: demo@example.com</p>
          <p>Password: ••••••••</p>
        </div>
      </div>
    `;
  }
}

export class DeployCard {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="deploy-card">
        <h3>Deployment Status</h3>
        <div class="deploy-info">
          <div class="status-indicator active">
            <span class="status-dot"></span>
            <span>Live</span>
          </div>
          <p>Last deployed: ${new Date().toLocaleDateString()}</p>
          <div class="deploy-stats">
            <div class="stat">
              <span class="stat-value">99.9%</span>
              <span class="stat-label">Uptime</span>
            </div>
            <div class="stat">
              <span class="stat-value">23ms</span>
              <span class="stat-label">Response Time</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// QA Tools
export class LinearList {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    const issues = [
      { id: 1, title: 'Button alignment on mobile', status: 'open', priority: 'high' },
      { id: 2, title: 'Form validation message', status: 'resolved', priority: 'medium' },
      { id: 3, title: 'Page load performance', status: 'in_progress', priority: 'low' }
    ];

    container.innerHTML = `
      <div class="linear-list">
        <h3>QA Issues</h3>
        <div class="issues-list">
          ${issues.map(issue => `
            <div class="issue-item ${issue.status}">
              <span class="issue-id">#${issue.id}</span>
              <span class="issue-title">${issue.title}</span>
              <span class="issue-status ${issue.status}">${issue.status.replace('_', ' ')}</span>
              <span class="issue-priority ${issue.priority}">${issue.priority}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// Fabrication Tools
export class FabricationLog {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="fabrication-log">
        <h3>Fabrication Progress</h3>
        <div class="log-entries">
          <div class="log-entry">
            <span class="log-time">10:30 AM</span>
            <span class="log-message">Material cutting completed</span>
          </div>
          <div class="log-entry">
            <span class="log-time">11:45 AM</span>
            <span class="log-message">Assembly phase 1 started</span>
          </div>
          <div class="log-entry">
            <span class="log-time">2:15 PM</span>
            <span class="log-message">Quality check passed</span>
          </div>
        </div>
      </div>
    `;
  }
}

export class FinishChecklist {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    const finishingSteps = [
      { id: 'sand', label: 'Sanding complete', checked: true },
      { id: 'stain', label: 'Stain/paint applied', checked: true },
      { id: 'seal', label: 'Sealant applied', checked: false },
      { id: 'polish', label: 'Final polish', checked: false }
    ];

    container.innerHTML = `
      <div class="finish-checklist">
        <h3>Finishing Steps</h3>
        <div class="checklist-items">
          ${finishingSteps.map(step => `
            <label class="checklist-item">
              <input type="checkbox" ${step.checked ? 'checked' : ''}>
              <span>${step.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="finish-notes">
          <h4>Notes</h4>
          <textarea placeholder="Add finishing notes..."></textarea>
        </div>
      </div>
    `;
  }
}

// Launch Tools
export class LaunchChecklist {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    const launchItems = [
      { category: 'Technical', items: [
        { label: 'SSL certificate installed', checked: true },
        { label: 'Backups configured', checked: true },
        { label: 'Analytics installed', checked: false }
      ]},
      { category: 'Content', items: [
        { label: 'All pages reviewed', checked: true },
        { label: 'SEO meta tags added', checked: false },
        { label: 'Legal pages added', checked: false }
      ]},
      { category: 'Testing', items: [
        { label: 'Cross-browser tested', checked: true },
        { label: 'Mobile responsive', checked: true },
        { label: 'Forms tested', checked: false }
      ]}
    ];

    container.innerHTML = `
      <div class="launch-checklist">
        <h3>Launch Readiness</h3>
        ${launchItems.map(category => `
          <div class="checklist-category">
            <h4>${category.category}</h4>
            <div class="checklist-items">
              ${category.items.map(item => `
                <label class="checklist-item">
                  <input type="checkbox" ${item.checked ? 'checked' : ''}>
                  <span>${item.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <button class="btn-primary">Launch Project 🚀</button>
      </div>
    `;
  }
}

// Wrap-up Tools
export class WrapUp {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
  }

  async render(container) {
    container.innerHTML = `
      <div class="wrap-up">
        <h3>Project Wrap-up</h3>
        <div class="wrap-up-sections">
          <div class="section">
            <h4>Project Summary</h4>
            <p>Successfully delivered all project requirements on time and within budget.</p>
          </div>
          
          <div class="section">
            <h4>Key Achievements</h4>
            <ul>
              <li>Created cohesive brand identity</li>
              <li>Developed responsive website</li>
              <li>Delivered print-ready materials</li>
            </ul>
          </div>
          
          <div class="section">
            <h4>Future Opportunities</h4>
            <p>Consider social media templates and email campaign designs for next phase.</p>
          </div>
          
          <div class="section">
            <h4>Final Invoice</h4>
            <div class="invoice-summary">
              <p>Total: $5,500</p>
              <p>Status: <span class="status paid">Paid</span></p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}