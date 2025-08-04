import { BRAND } from '../config/brand.js';

/**
 * FeedbackModal Component - Modal for requesting changes on project phases
 * Production-ready component with proper form handling and validation
 */
export class FeedbackModal {
  constructor(options = {}) {
    this.options = {
      onSubmit: null,
      onCancel: null,
      phaseId: null,
      phaseName: '',
      maxLength: 1000,
      ...options
    };
    
    this.modalElement = null;
    this.textareaElement = null;
    this.isSubmitting = false;
  }

  /**
   * Open the feedback modal
   */
  open() {
    this.render();
    this.attachEventListeners();
    this.focusTextarea();
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the feedback modal
   */
  close() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    document.body.style.overflow = '';
  }

  /**
   * Render the modal HTML
   */
  render() {
    // Remove any existing modal
    this.close();
    
    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'feedback-modal-overlay';
    this.modalElement.innerHTML = this.generateHTML();
    
    // Append to body
    document.body.appendChild(this.modalElement);
  }

  /**
   * Generate modal HTML
   */
  generateHTML() {
    const { phaseName, maxLength } = this.options;
    
    return `
      <div class="feedback-modal-container">
        <div class="feedback-modal">
          <div class="feedback-modal-header">
            <h3>Request Changes</h3>
            <button class="feedback-modal-close" aria-label="Close modal">
              <span>×</span>
            </button>
          </div>
          
          <div class="feedback-modal-body">
            <p class="feedback-modal-phase">
              Phase: <strong>${this.escapeHtml(phaseName)}</strong>
            </p>
            
            <label for="feedback-textarea" class="feedback-modal-label">
              Please describe the changes needed:
            </label>
            
            <textarea
              id="feedback-textarea"
              class="feedback-modal-textarea"
              placeholder="Be specific about what needs to be changed or improved..."
              maxlength="${maxLength}"
              rows="6"
              required
            ></textarea>
            
            <div class="feedback-modal-counter">
              <span class="char-count">0</span> / ${maxLength} characters
            </div>
          </div>
          
          <div class="feedback-modal-footer">
            <button class="btn-secondary feedback-modal-cancel">
              Cancel
            </button>
            <button class="btn-primary feedback-modal-submit">
              <span class="btn-text">Submit Request</span>
              <span class="btn-loading" style="display: none;">Submitting...</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.modalElement) return;
    
    // Get elements
    this.textareaElement = this.modalElement.querySelector('#feedback-textarea');
    const closeBtn = this.modalElement.querySelector('.feedback-modal-close');
    const cancelBtn = this.modalElement.querySelector('.feedback-modal-cancel');
    const submitBtn = this.modalElement.querySelector('.feedback-modal-submit');
    const charCount = this.modalElement.querySelector('.char-count');
    
    // Close modal when clicking overlay
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.handleCancel();
      }
    });
    
    // Close button
    closeBtn.addEventListener('click', () => this.handleCancel());
    
    // Cancel button
    cancelBtn.addEventListener('click', () => this.handleCancel());
    
    // Submit button
    submitBtn.addEventListener('click', () => this.handleSubmit());
    
    // Character counter
    this.textareaElement.addEventListener('input', () => {
      const length = this.textareaElement.value.length;
      charCount.textContent = length;
      
      // Add warning class when near limit
      if (length > this.options.maxLength * 0.9) {
        charCount.classList.add('near-limit');
      } else {
        charCount.classList.remove('near-limit');
      }
    });
    
    // Submit on Ctrl/Cmd + Enter
    this.textareaElement.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.handleCancel();
      }
    });
  }

  /**
   * Focus textarea when modal opens
   */
  focusTextarea() {
    if (this.textareaElement) {
      setTimeout(() => {
        this.textareaElement.focus();
      }, 100);
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    if (this.isSubmitting || !this.textareaElement) return;
    
    const feedback = this.textareaElement.value.trim();
    
    // Validate input
    if (!feedback) {
      this.showError('Please describe the changes needed.');
      return;
    }
    
    if (feedback.length < 10) {
      this.showError('Please provide more detail (at least 10 characters).');
      return;
    }
    
    // Show loading state
    this.setSubmitting(true);
    
    try {
      // Call submit callback
      if (this.options.onSubmit) {
        await this.options.onSubmit(this.options.phaseId, feedback);
      }
      
      // Success - close modal
      this.close();
    } catch (error) {
      console.error('Feedback submission error:', error);
      this.showError('Failed to submit feedback. Please try again.');
      this.setSubmitting(false);
    }
  }

  /**
   * Handle cancel action
   */
  handleCancel() {
    // Check if there's unsaved content
    if (this.textareaElement && this.textareaElement.value.trim()) {
      const confirmed = confirm('Are you sure you want to cancel? Your feedback will be lost.');
      if (!confirmed) return;
    }
    
    // Call cancel callback
    if (this.options.onCancel) {
      this.options.onCancel();
    }
    
    // Clean up escape listener
    if (this.handleEscape) {
      document.removeEventListener('keydown', this.handleEscape);
    }
    
    this.close();
  }

  /**
   * Set submitting state
   */
  setSubmitting(isSubmitting) {
    this.isSubmitting = isSubmitting;
    
    if (!this.modalElement) return;
    
    const submitBtn = this.modalElement.querySelector('.feedback-modal-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const cancelBtn = this.modalElement.querySelector('.feedback-modal-cancel');
    
    if (isSubmitting) {
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      this.textareaElement.disabled = true;
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
    } else {
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
      this.textareaElement.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (!this.modalElement) return;
    
    // Remove any existing error
    const existingError = this.modalElement.querySelector('.feedback-modal-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'feedback-modal-error';
    errorDiv.innerHTML = `
      <span class="error-icon">⚠</span>
      <span class="error-text">${this.escapeHtml(message)}</span>
    `;
    
    // Insert before textarea
    const textarea = this.modalElement.querySelector('.feedback-modal-textarea');
    textarea.parentNode.insertBefore(errorDiv, textarea);
    
    // Remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
    
    // Focus textarea
    this.textareaElement.focus();
  }

  /**
   * Utility: Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}