/**
 * LaunchGallery Component
 * Used in LAUNCH phase to showcase final deliverables and celebrate project completion
 */
export class LaunchGallery {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.deliverables = [];
    this.testimonial = null;
    this.shareableLink = null;
    this.currentView = 'gallery'; // gallery, downloads, success
  }

  async render(container) {
    await this.loadDeliverables();
    
    container.innerHTML = `
      <div class="launch-gallery">
        <div class="launch-header">
          <div class="celebration-banner">
            <div class="confetti-animation"></div>
            <h1>🎉 Project Complete!</h1>
            <p>Congratulations on your successful project launch</p>
          </div>
        </div>

        <div class="launch-navigation">
          <button class="nav-btn ${this.currentView === 'gallery' ? 'active' : ''}" 
                  onclick="window.portal.modules.phases.launchGallery.setView('gallery')">
            Gallery
          </button>
          <button class="nav-btn ${this.currentView === 'downloads' ? 'active' : ''}" 
                  onclick="window.portal.modules.phases.launchGallery.setView('downloads')">
            Downloads
          </button>
          <button class="nav-btn ${this.currentView === 'success' ? 'active' : ''}" 
                  onclick="window.portal.modules.phases.launchGallery.setView('success')">
            Success Kit
          </button>
        </div>

        <div class="launch-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
    
    // Start confetti animation
    this.startConfetti();
  }

  renderContent() {
    switch (this.currentView) {
      case 'gallery':
        return this.renderGallery();
      case 'downloads':
        return this.renderDownloads();
      case 'success':
        return this.renderSuccessKit();
      default:
        return this.renderGallery();
    }
  }

  renderGallery() {
    return `
      <div class="deliverables-gallery">
        <div class="gallery-header">
          <h2>Final Deliverables Gallery</h2>
          <div class="gallery-actions">
            <button class="btn-secondary" onclick="window.portal.modules.phases.launchGallery.createShareLink()">
              🔗 Share Gallery
            </button>
            <button class="btn-primary" onclick="window.portal.modules.phases.launchGallery.downloadAll()">
              ⬇️ Download All
            </button>
          </div>
        </div>

        <div class="gallery-grid">
          ${this.deliverables.map(item => this.renderGalleryItem(item)).join('')}
        </div>

        ${this.renderTestimonialSection()}
      </div>
    `;
  }

  renderGalleryItem(item) {
    return `
      <div class="gallery-item" onclick="window.portal.modules.phases.launchGallery.viewItem('${item.id}')">
        <div class="item-preview">
          ${this.renderItemPreview(item)}
        </div>
        <div class="item-info">
          <h4>${item.name}</h4>
          <p>${item.type} • ${this.formatFileSize(item.size)}</p>
        </div>
        <div class="item-overlay">
          <button class="btn-icon" onclick="window.portal.modules.phases.launchGallery.downloadItem('${item.id}', event)">
            ⬇️
          </button>
          <button class="btn-icon" onclick="window.portal.modules.phases.launchGallery.shareItem('${item.id}', event)">
            🔗
          </button>
        </div>
      </div>
    `;
  }

  renderItemPreview(item) {
    if (item.type.startsWith('image/')) {
      return `<img src="${item.thumbnailUrl || item.url}" alt="${item.name}">`;
    } else if (item.type === 'application/pdf') {
      return `
        <div class="pdf-preview">
          <div class="pdf-icon">📄</div>
          <span>PDF Document</span>
        </div>
      `;
    } else if (item.type.startsWith('video/')) {
      return `
        <video poster="${item.thumbnailUrl}">
          <source src="${item.url}" type="${item.type}">
        </video>
      `;
    } else if (item.type === 'folder') {
      return `
        <div class="folder-preview">
          <div class="folder-icon">📁</div>
          <span>${item.fileCount} files</span>
        </div>
      `;
    }
    return `
      <div class="generic-preview">
        <div class="file-icon">📎</div>
        <span>${item.extension.toUpperCase()}</span>
      </div>
    `;
  }

  renderTestimonialSection() {
    return `
      <div class="testimonial-section">
        <h3>Share Your Experience</h3>
        <div class="testimonial-form">
          <textarea id="testimonial-text" rows="4" 
                    placeholder="We'd love to hear about your experience working with us..."
                    ${this.testimonial ? 'disabled' : ''}>${this.testimonial?.text || ''}</textarea>
          
          <div class="rating-input">
            <label>Rate your experience:</label>
            <div class="star-rating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star ${this.testimonial && star <= this.testimonial.rating ? 'filled' : ''}" 
                      onclick="window.portal.modules.phases.launchGallery.setRating(${star})"
                      ${this.testimonial ? 'style="pointer-events: none"' : ''}>★</span>
              `).join('')}
            </div>
          </div>
          
          ${!this.testimonial ? `
            <button class="btn-primary" onclick="window.portal.modules.phases.launchGallery.submitTestimonial()">
              Submit Testimonial
            </button>
          ` : `
            <div class="testimonial-submitted">
              <p>✅ Thank you for your testimonial!</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderDownloads() {
    return `
      <div class="downloads-section">
        <div class="downloads-header">
          <h2>Download Center</h2>
          <p>All your project files organized and ready for download</p>
        </div>

        <div class="download-categories">
          ${this.renderDownloadCategories()}
        </div>

        <div class="bulk-download">
          <div class="bulk-info">
            <h3>Complete Project Package</h3>
            <p>Download all deliverables in a single ZIP file</p>
            <span class="file-size">Total size: ${this.calculateTotalSize()}</span>
          </div>
          <button class="btn-primary large" onclick="window.portal.modules.phases.launchGallery.downloadAll()">
            Download Everything (ZIP)
          </button>
        </div>
      </div>
    `;
  }

  renderDownloadCategories() {
    const categories = this.groupDeliverablesByCategory();
    
    return Object.entries(categories).map(([category, items]) => `
      <div class="download-category">
        <div class="category-header">
          <h3>${category}</h3>
          <span class="item-count">${items.length} items</span>
        </div>
        <div class="download-list">
          ${items.map(item => `
            <div class="download-item">
              <div class="item-details">
                <span class="item-icon">${this.getFileIcon(item.type)}</span>
                <div class="item-text">
                  <p class="item-name">${item.name}</p>
                  <span class="item-meta">${this.formatFileSize(item.size)}</span>
                </div>
              </div>
              <button class="btn-link" onclick="window.portal.modules.phases.launchGallery.downloadItem('${item.id}')">
                Download
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderSuccessKit() {
    return `
      <div class="success-kit">
        <div class="kit-header">
          <h2>Your Success Kit</h2>
          <p>Everything you need to make the most of your new assets</p>
        </div>

        <div class="success-cards">
          <div class="success-card">
            <div class="card-icon">📋</div>
            <h3>Brand Guidelines</h3>
            <p>Complete guide on how to use your new brand assets consistently</p>
            <button class="btn-secondary" onclick="window.portal.modules.phases.launchGallery.downloadGuidelines()">
              Download PDF
            </button>
          </div>

          <div class="success-card">
            <div class="card-icon">🎨</div>
            <h3>Asset Library</h3>
            <p>Organized folder structure with all variations and formats</p>
            <button class="btn-secondary" onclick="window.portal.modules.phases.launchGallery.viewAssetStructure()">
              View Structure
            </button>
          </div>

          <div class="success-card">
            <div class="card-icon">📱</div>
            <h3>Implementation Guide</h3>
            <p>Step-by-step instructions for implementing across platforms</p>
            <button class="btn-secondary" onclick="window.portal.modules.phases.launchGallery.viewImplementationGuide()">
              View Guide
            </button>
          </div>

          <div class="success-card">
            <div class="card-icon">🔧</div>
            <h3>Support Resources</h3>
            <p>FAQ, troubleshooting, and how to request future updates</p>
            <button class="btn-secondary" onclick="window.portal.modules.phases.launchGallery.viewSupport()">
              View Resources
            </button>
          </div>
        </div>

        <div class="next-steps">
          <h3>What's Next?</h3>
          <div class="steps-timeline">
            <div class="step completed">
              <div class="step-icon">✅</div>
              <div class="step-content">
                <h4>Project Delivered</h4>
                <p>All deliverables are ready</p>
              </div>
            </div>
            <div class="step current">
              <div class="step-icon">📥</div>
              <div class="step-content">
                <h4>Download & Backup</h4>
                <p>Save all files to your systems</p>
              </div>
            </div>
            <div class="step">
              <div class="step-icon">🚀</div>
              <div class="step-content">
                <h4>Implementation</h4>
                <p>Start using your new assets</p>
              </div>
            </div>
            <div class="step">
              <div class="step-icon">📈</div>
              <div class="step-content">
                <h4>Measure Success</h4>
                <p>Track the impact of your new brand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadDeliverables() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/final-deliverables`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.deliverables = data.deliverables;
        this.testimonial = data.testimonial;
        this.shareableLink = data.shareableLink;
      }
    } catch (error) {
      console.error('Error loading deliverables:', error);
    }
  }

  setView(view) {
    this.currentView = view;
    const container = document.querySelector('.launch-gallery');
    if (container) {
      this.render(container.parentElement);
    }
  }

  async viewItem(itemId) {
    const item = this.deliverables.find(d => d.id === itemId);
    if (!item) return;

    // Open in lightbox or new tab depending on type
    if (item.type.startsWith('image/')) {
      this.openImageLightbox(item);
    } else {
      window.open(item.url, '_blank');
    }
  }

  openImageLightbox(item) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay lightbox';
    modal.innerHTML = `
      <div class="lightbox-content">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <img src="${item.url}" alt="${item.name}">
        <div class="lightbox-info">
          <h3>${item.name}</h3>
          <p>${item.dimensions || ''} • ${this.formatFileSize(item.size)}</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async downloadItem(itemId, event) {
    if (event) {
      event.stopPropagation();
    }

    const item = this.deliverables.find(d => d.id === itemId);
    if (!item) return;

    // Create download link
    const a = document.createElement('a');
    a.href = item.downloadUrl || item.url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.portal.showNotification(`Downloading ${item.name}`, 'success');
  }

  async downloadAll() {
    try {
      this.portal.showNotification('Preparing download package...', 'info');
      
      const response = await fetch(`/api/projects/${this.projectId}/download-all`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.phaseData.projectName}_complete.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.portal.showNotification('Download started!', 'success');
      }
    } catch (error) {
      console.error('Error downloading all files:', error);
      this.portal.showNotification('Failed to download files', 'error');
    }
  }

  async shareItem(itemId, event) {
    if (event) {
      event.stopPropagation();
    }

    const item = this.deliverables.find(d => d.id === itemId);
    if (!item) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/share-item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId })
      });

      const data = await response.json();
      
      if (data.success) {
        navigator.clipboard.writeText(data.shareUrl);
        this.portal.showNotification('Share link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    }
  }

  async createShareLink() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/create-gallery-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        navigator.clipboard.writeText(data.galleryUrl);
        this.portal.showNotification('Gallery link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error creating gallery link:', error);
    }
  }

  setRating(rating) {
    if (this.testimonial) return;
    
    document.querySelectorAll('.star').forEach((star, index) => {
      star.classList.toggle('filled', index < rating);
    });
    
    this.currentRating = rating;
  }

  async submitTestimonial() {
    const text = document.getElementById('testimonial-text').value;
    if (!text || !this.currentRating) {
      alert('Please provide both a testimonial and rating');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${this.projectId}/testimonial`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          rating: this.currentRating
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.testimonial = data.testimonial;
        this.portal.showNotification('Thank you for your testimonial!', 'success');
        
        // Re-render testimonial section
        const container = document.querySelector('.testimonial-section');
        if (container) {
          container.outerHTML = this.renderTestimonialSection();
        }
      }
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      this.portal.showNotification('Failed to submit testimonial', 'error');
    }
  }

  groupDeliverablesByCategory() {
    const categories = {};
    
    this.deliverables.forEach(item => {
      const category = this.getCategory(item);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });
    
    return categories;
  }

  getCategory(item) {
    if (item.category) return item.category;
    
    if (item.type.startsWith('image/')) return 'Images';
    if (item.type === 'application/pdf') return 'Documents';
    if (item.type.startsWith('video/')) return 'Videos';
    if (item.type === 'folder') return 'Folders';
    
    return 'Other Files';
  }

  getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('video/')) return '🎥';
    if (type === 'folder') return '📁';
    return '📎';
  }

  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  calculateTotalSize() {
    const total = this.deliverables.reduce((sum, item) => sum + (item.size || 0), 0);
    return this.formatFileSize(total);
  }

  startConfetti() {
    // Simple CSS confetti animation
    const banner = document.querySelector('.celebration-banner');
    if (banner) {
      banner.classList.add('celebrating');
      setTimeout(() => {
        banner.classList.remove('celebrating');
      }, 5000);
    }
  }
}

export default LaunchGallery;