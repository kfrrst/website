// Enhanced navigation and interaction handling
class ClientPortal {
  constructor() {
    this.isLoading = false;
    this.observers = [];
    this.parallaxElements = [];
    this.init();
  }

  init() {
    this.setYear();
    this.checkAuthStatus();
    this.setupEventListeners();
    this.setupFormValidation();
    this.setupScrollAnimations();
    this.setupParallaxEffects();
    this.setupMouseTracker();
    this.setupAdvancedInteractions();
  }

  // Set year in footer
  setYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }

  // Setup advanced mouse tracking for subtle interactions
  setupMouseTracker() {
    document.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const deltaX = (clientX - centerX) / centerX;
      const deltaY = (clientY - centerY) / centerY;

      // Apply subtle transformations to elements
      document.querySelectorAll('.feature-item').forEach((item, index) => {
        const intensity = 0.02 * (index + 1);
        item.style.transform = `translate(${deltaX * intensity}px, ${deltaY * intensity}px)`;
      });
    });
  }

  // Setup parallax scrolling effects
  setupParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.hero-content, .feature-item');
    
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.3;
      
      parallaxElements.forEach((element, index) => {
        element.style.transform = `translateY(${rate * (index * 0.1 + 0.1)}px)`;
      });
    });
  }

  // Setup advanced interactions and micro-animations
  setupAdvancedInteractions() {
    // Add hover effects to buttons with magnetic behavior
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
      button.addEventListener('mouseenter', (e) => {
        e.target.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      });

      button.addEventListener('mousemove', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        e.target.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.05)`;
      });

      button.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'translate(0, 0) scale(1)';
      });
    });

    // Advanced form field animations
    this.setupAdvancedFormAnimations();
  }

  // Setup advanced form field animations
  setupAdvancedFormAnimations() {
    const formFields = document.querySelectorAll('input, textarea, select');
    
    formFields.forEach(field => {
      // Create floating labels effect
      const parent = field.parentElement;
      const label = parent.querySelector('label');
      
      if (label) {
        // Add focus and blur animations
        field.addEventListener('focus', () => {
          label.style.transform = 'translateY(-8px) scale(0.85)';
          label.style.color = '#333';
          field.style.borderBottom = '2px solid #333';
        });

        field.addEventListener('blur', () => {
          if (!field.value) {
            label.style.transform = 'translateY(0) scale(1)';
            label.style.color = '#666';
          }
          field.style.borderBottom = '1px solid rgba(51, 51, 51, 0.2)';
        });

        // Typing animation feedback
        field.addEventListener('input', () => {
          field.style.background = 'rgba(51, 51, 51, 0.02)';
          setTimeout(() => {
            field.style.background = 'transparent';
          }, 200);
        });
      }
    });
  }

  // Setup all event listeners
  setupEventListeners() {
    // Event delegation for data-action attributes
    document.addEventListener('click', (e) => {
      const element = e.target.closest('[data-action]');
      if (!element) return;

      const action = element.dataset.action;
      
      switch (action) {
        case 'toggle-menu':
          this.toggleMenu();
          break;
        case 'show-inquiry-form':
          this.showInquiryForm();
          break;
        case 'show-client-login':
          this.showClientLogin();
          break;
        case 'hide-client-login':
          this.hideClientLogin();
          break;
      }
    });

    // Close modal on outside click
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideClientLogin();
        }
      });
    }

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideClientLogin();
        this.hideInquiryForm();
      }
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Enhanced menu toggle
  toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
      navLinks.classList.toggle('hidden');
      
      // Add animation class
      if (!navLinks.classList.contains('hidden')) {
        navLinks.style.animation = 'slideIn 0.3s ease forwards';
      }
    }
  }

  // Show inquiry form with enhanced animation
  showInquiryForm() {
    const section = document.getElementById('inquiry');
    if (section) {
      section.classList.remove('hidden');
      
      // Trigger animation after a brief delay
      setTimeout(() => {
        section.classList.add('visible');
      }, 10);
      
      // Smooth scroll with offset for fixed header
      setTimeout(() => {
        const headerHeight = document.getElementById('site-header').offsetHeight;
        const elementPosition = section.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight - 20;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  // Hide inquiry form
  hideInquiryForm() {
    const section = document.getElementById('inquiry');
    if (section) {
      section.classList.remove('visible');
      setTimeout(() => {
        section.classList.add('hidden');
      }, 300);
    }
  }

  // Enhanced client login modal
  showClientLogin() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Trigger animation
      setTimeout(() => {
        modal.classList.add('visible');
      }, 10);
      
      // Focus on email input
      setTimeout(() => {
        const emailInput = document.getElementById('login-email');
        if (emailInput) emailInput.focus();
      }, 300);
    }
  }

  hideClientLogin() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('visible');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
  }

  // Enhanced form validation
  setupFormValidation() {
    this.setupInquiryForm();
    this.setupLoginForm();
  }

  setupInquiryForm() {
    const form = document.getElementById('inquiry-form');
    if (!form) return;

    // Real-time validation for each field
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleInquirySubmit(form);
    });
  }

  setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLoginSubmit(form);
    });
  }

  // Validate individual field
  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';

    // Remove existing error styles
    this.clearFieldError(field);

    // Validation rules
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          message = 'Please enter a valid email address';
        }
        break;
      case 'text':
        if (field.required && value.length < 2) {
          isValid = false;
          message = 'This field must be at least 2 characters';
        }
        break;
      case 'password':
        if (value.length < 6) {
          isValid = false;
          message = 'Password must be at least 6 characters';
        }
        break;
    }

    // Check required fields
    if (field.required && !value) {
      isValid = false;
      message = 'This field is required';
    }

    // Show error if invalid
    if (!isValid) {
      this.showFieldError(field, message);
    }

    return isValid;
  }

  showFieldError(field, message) {
    field.classList.add('error');
    field.style.borderColor = '#e74c3c';
    
    // Create or update error message
    let errorElement = field.parentNode.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.style.color = '#e74c3c';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = '0.25rem';
  }

  clearFieldError(field) {
    field.classList.remove('error');
    field.style.borderColor = '';
    
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }

  // Handle inquiry form submission
  async handleInquirySubmit(form) {
    if (this.isLoading) return;

    // Validate all fields
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isFormValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      this.showMessage('Please fix the errors above', 'error');
      return;
    }

    // Show loading state
    this.setLoadingState(form, true);

    // Collect form data
    const formData = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      'project-type': form['project-type'].value,
      budget: form.budget.value,
      timeline: form.timeline.value,
      message: form.message.value.trim()
    };

    try {
      // Submit to backend API
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // Success
        this.showMessage(result.message || 'Thank you! Your inquiry has been sent. I\'ll get back to you within 24 hours.', 'success');
        form.reset();
        
        // Clear any existing validation errors
        const errorElements = form.querySelectorAll('.error-message');
        errorElements.forEach(el => el.remove());
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => {
          field.classList.remove('error');
          field.style.borderColor = '';
        });
        
        // Hide form after success
        setTimeout(() => {
          this.hideInquiryForm();
        }, 3000);
      } else {
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach(error => {
            const field = form.querySelector(`[name="${error.path || error.param}"]`);
            if (field) {
              this.showFieldError(field, error.msg);
            }
          });
          this.showMessage('Please fix the errors in the form', 'error');
        } else {
          this.showMessage(result.error || 'There was an error sending your inquiry. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Inquiry submission error:', error);
      if (error.name === 'NetworkError' || !navigator.onLine) {
        this.showMessage('Please check your internet connection and try again.', 'error');
      } else {
        this.showMessage('Sorry, there was an error sending your inquiry. Please try again.', 'error');
      }
    } finally {
      this.setLoadingState(form, false);
    }
  }

  // Handle login form submission
  async handleLoginSubmit(form) {
    if (this.isLoading) return;

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      this.showMessage('Please enter both email and password', 'error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showMessage('Please enter a valid email address', 'error');
      return;
    }

    this.setLoadingState(form, true);

    try {
      // Submit login to backend API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (response.ok) {
        // Success - store tokens and redirect (using portal-compatible keys)
        if (result.accessToken) {
          localStorage.setItem('authToken', result.accessToken);
        }
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken);
        }
        if (result.user) {
          localStorage.setItem('userData', JSON.stringify(result.user));
        }

        this.showMessage(result.message || 'Login successful! Redirecting to your portal...', 'success');
        
        // Redirect to portal
        setTimeout(() => {
          window.location.href = '/portal';
        }, 1000);
      } else {
        // Handle login errors
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessage = result.errors.map(err => err.msg).join(', ');
          this.showMessage(errorMessage, 'error');
        } else {
          this.showMessage(result.error || 'Invalid credentials. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'NetworkError' || !navigator.onLine) {
        this.showMessage('Please check your internet connection and try again.', 'error');
      } else {
        this.showMessage('Unable to connect to the server. Please try again later.', 'error');
      }
    } finally {
      this.setLoadingState(form, false);
    }
  }

  // Check if user is already logged in on page load
  checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('userData');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Could add token validation here
        console.log('User already logged in:', userData.email);
      } catch (error) {
        // Clear invalid stored data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
      }
    }
  }

  // Logout function
  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Call logout endpoint if refresh token exists
    if (refreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ refreshToken })
      }).catch(err => console.warn('Logout API call failed:', err));
    }
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    // Redirect to home
    window.location.href = '/';
  }

  // Set loading state for forms
  setLoadingState(form, loading) {
    this.isLoading = loading;
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (loading) {
      form.classList.add('loading');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent;
        // Different loading text based on form type
        if (form.id === 'inquiry-form') {
          submitButton.textContent = 'Sending Inquiry...';
        } else if (form.id === 'login-form') {
          submitButton.textContent = 'Signing In...';
        } else {
          submitButton.textContent = 'Processing...';
        }
      }
      
      // Disable all form inputs during loading
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.disabled = true;
        input.dataset.wasDisabled = input.disabled;
      });
    } else {
      form.classList.remove('loading');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
      }
      
      // Re-enable form inputs
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.disabled = input.dataset.wasDisabled === 'true';
        delete input.dataset.wasDisabled;
      });
    }
  }

  // Show success/error messages
  showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.message-notification');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message-notification ${type}`;
    messageElement.innerHTML = `
      <div class="message-content">
        <span class="message-text">${message}</span>
        <button class="message-close" onclick="this.parentElement.parentElement.remove()" aria-label="Close message">×</button>
      </div>
    `;

    // Add styles
    Object.assign(messageElement.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '10000',
      maxWidth: '400px',
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      transform: 'translateX(420px)',
      transition: 'transform 0.3s ease',
      backgroundColor: type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db',
      color: 'white',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '0.9rem',
      lineHeight: '1.4'
    });

    // Add ARIA attributes for accessibility
    messageElement.setAttribute('role', 'alert');
    messageElement.setAttribute('aria-live', 'polite');

    document.body.appendChild(messageElement);

    // Animate in
    setTimeout(() => {
      messageElement.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 5 seconds (8 seconds for error messages)
    const autoRemoveTime = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.style.transform = 'translateX(420px)';
        setTimeout(() => messageElement.remove(), 300);
      }
    }, autoRemoveTime);
  }

  // Setup scroll animations
  setupScrollAnimations() {
    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe feature items for animation
    document.querySelectorAll('.feature-item').forEach((item, index) => {
      // Stagger the animations
      item.style.animationDelay = `${index * 0.1}s`;
      observer.observe(item);
    });

    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const heroContent = document.querySelector('.hero-content');
      
      if (heroContent && scrolled < window.innerHeight) {
        const parallax = scrolled * 0.5;
        heroContent.style.transform = `translateY(${parallax}px)`;
        heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
      }
    });

    // Add magnetic effect to CTA buttons
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary');
    ctaButtons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
          button.style.transform = 'scale(1.05)';
        }
      });
      
      button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
          button.style.transform = 'scale(1)';
        }
      });

      button.addEventListener('mousemove', (e) => {
        if (!button.disabled) {
          const rect = button.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          
          button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.05)`;
        }
      });
    });
    
    // Network detection for better error handling
    this.setupNetworkDetection();
  }

  // Network detection for better error handling
  setupNetworkDetection() {
    // Check online/offline status
    window.addEventListener('online', () => {
      this.showMessage('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.showMessage('You are offline. Please check your internet connection.', 'error');
    });

    // Initial network check
    if (!navigator.onLine) {
      this.showMessage('You appear to be offline. Some features may not work properly.', 'error');
    }
  }
}

// Initialize the client portal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.clientPortal = new ClientPortal();
});

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior
  event.preventDefault();
  
  // Show user-friendly error message
  if (window.clientPortal) {
    window.clientPortal.showMessage('An unexpected error occurred. Please refresh the page and try again.', 'error');
  }
});

// Add global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('JavaScript error:', event.error);
  
  // Show user-friendly error message for critical errors
  if (window.clientPortal && event.error && !event.error.toString().includes('ResizeObserver')) {
    window.clientPortal.showMessage('A technical error occurred. Please refresh the page.', 'error');
  }
});

// Expose functions globally for onclick handlers
function toggleMenu() {
  window.clientPortal.toggleMenu();
}

function showInquiryForm() {
  window.clientPortal.showInquiryForm();
}

function showClientLogin() {
  window.clientPortal.showClientLogin();
}

function hideClientLogin() {
  window.clientPortal.hideClientLogin();
}

// Expose logout function globally
function logout() {
  if (window.clientPortal) {
    window.clientPortal.logout();
  }
}
