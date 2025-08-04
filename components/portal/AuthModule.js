import { BaseModule } from './BaseModule.js';

/**
 * Authentication module for client portal
 * Handles login, logout, token management, and session persistence
 */
export class AuthModule extends BaseModule {
  constructor(portal) {
    super(portal, 'AuthModule');
    this.refreshTokenTimer = null;
    this.tokenRefreshPromise = null;
  }

  async doInit() {
    this.setupLoginForm();
    this.checkAuthenticationStatus();
    this.setupAutoTokenRefresh();
  }

  /**
   * Check authentication status on page load
   */
  checkAuthenticationStatus() {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('userData');
    
    if (token && user) {
      try {
        this.portal.authToken = token;
        this.portal.refreshToken = refreshToken;
        this.portal.currentUser = JSON.parse(user);
        this.verifyTokenAndShowDashboard();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.showLoginScreen();
      }
    } else {
      this.showLoginScreen();
    }
  }

  /**
   * Setup login form event handlers
   */
  setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      this.addEventListener(loginForm, 'submit', this.handleLogin.bind(this));
    }

    // Setup register form if it exists
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      this.addEventListener(registerForm, 'submit', this.handleRegister.bind(this));
    }

    // Setup password visibility toggles
    this.setupPasswordToggles();
  }

  /**
   * Setup password visibility toggles
   */
  setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
      this.addEventListener(toggle, 'click', (e) => {
        const input = e.target.closest('.form-group').querySelector('input[type="password"], input[type="text"]');
        if (input.type === 'password') {
          input.type = 'text';
          e.target.textContent = '👁️';
        } else {
          input.type = 'password';
          e.target.textContent = '👁️‍🗨️';
        }
      });
    });
  }

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    
    const credentials = {
      email: formData.get('email'),
      password: formData.get('password')
    };

    // Validation
    if (!credentials.email || !credentials.password) {
      this.showError('Please fill in all fields');
      return;
    }

    try {
      // Show loading state
      submitButton.disabled = true;
      if (buttonText) buttonText.textContent = 'Signing in...';
      this.showLoading(form);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        this.portal.authToken = data.accessToken;
        this.portal.refreshToken = data.refreshToken;
        this.portal.currentUser = data.user;
        
        localStorage.setItem('authToken', this.portal.authToken);
        localStorage.setItem('refreshToken', this.portal.refreshToken);
        localStorage.setItem('userData', JSON.stringify(this.portal.currentUser));
        
        // Remember me functionality
        if (formData.get('remember')) {
          localStorage.setItem('rememberedEmail', credentials.email);
        }

        await this.showDashboard();
      } else {
        this.showError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Network error. Please try again.');
    } finally {
      // Reset button state
      submitButton.disabled = false;
      if (buttonText) buttonText.textContent = 'Sign In';
      this.hideLoading(form);
    }
  }

  /**
   * Handle registration form submission
   */
  async handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name')
    };

    // Client-side validation
    if (!userData.email || !userData.password || !userData.name) {
      this.showError('Please fill in all fields');
      return;
    }

    if (userData.password.length < 6) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    try {
      submitButton.disabled = true;
      this.showLoading(form);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess('Registration successful! Please log in.');
        // Switch to login form
        this.showLoginForm();
      } else {
        this.showError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showError('Network error. Please try again.');
    } finally {
      submitButton.disabled = false;
      this.hideLoading(form);
    }
  }

  /**
   * Verify token and show dashboard
   */
  async verifyTokenAndShowDashboard() {
    try {
      const response = await this.apiRequest('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        this.portal.currentUser = data.user;
        await this.showDashboard();
      } else if (response.status === 403) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.showLoginScreen();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this._performTokenRefresh();
    
    try {
      await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  async _performTokenRefresh() {
    const refreshToken = this.portal.refreshToken || localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      this.logout();
      return;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.portal.authToken = data.accessToken;
        this.portal.refreshToken = data.refreshToken;
        
        localStorage.setItem('authToken', this.portal.authToken);
        localStorage.setItem('refreshToken', this.portal.refreshToken);
        
        this.setupAutoTokenRefresh();
      } else {
        console.error('Token refresh failed');
        this.logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupAutoTokenRefresh() {
    // Clear existing timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
    }

    // Refresh token 2 minutes before expiry (JWT tokens expire in 15 minutes)
    const refreshInterval = 13 * 60 * 1000; // 13 minutes
    
    this.refreshTokenTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshInterval);
  }

  /**
   * Show dashboard after successful authentication
   */
  async showDashboard() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    
    if (loginScreen && dashboard) {
      loginScreen.classList.add('hidden');
      dashboard.classList.remove('hidden');
      
      // Initialize dashboard modules
      await this.portal.initializeDashboard();
    }
  }

  /**
   * Show login screen
   */
  showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    
    if (loginScreen && dashboard) {
      loginScreen.classList.remove('hidden');
      dashboard.classList.add('hidden');
    }

    // Pre-fill remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.value = rememberedEmail;
      }
    }
  }

  /**
   * Show login form (hide register form)
   */
  showLoginForm() {
    const loginForm = document.getElementById('login-section');
    const registerForm = document.getElementById('register-section');
    
    if (loginForm && registerForm) {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    }
  }

  /**
   * Logout user and clear session
   */
  async logout() {
    try {
      // Call logout endpoint
      if (this.portal.authToken) {
        await this.apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: this.portal.refreshToken
          })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with client-side logout even if server call fails
    }

    // Clear authentication data
    this.portal.authToken = null;
    this.portal.refreshToken = null;
    this.portal.currentUser = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    // Clear token refresh timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }

    // Disconnect socket
    if (this.portal.socket) {
      this.portal.socket.disconnect();
    }

    // Show login screen
    this.showLoginScreen();
    
    // Clear other modules' data
    Object.values(this.portal.modules).forEach(module => {
      if (module.clearCache) {
        module.clearCache();
      }
    });
  }

  /**
   * Get current user information
   */
  getCurrentUser() {
    return this.portal.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.portal.authToken && this.portal.currentUser);
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    if (!this.portal.authToken) {
      throw new Error('No authentication token available');
    }
    
    return {
      'Authorization': `Bearer ${this.portal.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  destroy() {
    // Clear token refresh timer
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
    
    super.destroy();
  }
}