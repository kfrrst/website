import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Authentication Module
 * Handles admin login, logout, token management, and session persistence
 */
export class AdminAuthModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminAuthModule');
    this.sessionCheckInterval = null;
    this.tokenRefreshPromise = null;
  }

  async doInit() {
    // Check if already authenticated
    if (this.admin.token) {
      console.log('🔐 Existing admin token found, verifying...');
      const isValid = await this.verifyToken();
      
      if (isValid) {
        console.log('✅ Admin token valid, proceeding with dashboard');
        await this.admin.initializeAuthenticatedModules();
        await this.admin.initializeDashboard();
        this.setupTokenRefresh();
        return;
      } else {
        console.log('❌ Admin token invalid, clearing and redirecting to login');
        this.clearSession();
        this.redirectToLogin();
        return;
      }
    }

    // Check for auto-login parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const password = urlParams.get('password');
    
    if (email && password) {
      console.log('🔑 Auto-login parameters detected, attempting login...');
      // Auto-fill and submit the form after a short delay
      setTimeout(() => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput && passwordInput) {
          emailInput.value = email;
          passwordInput.value = password;
          // Trigger login
          this.handleLogin();
        }
      }, 500);
    }

    // No token found, check if we're on login page
    if (window.location.pathname !== '/admin.html') {
      console.log('🔄 No admin token, redirecting to login');
      this.redirectToLogin();
      return;
    }

    // We're on login page, setup login form
    this.setupLoginForm();
  }

  /**
   * Verify admin token with server
   */
  async verifyToken() {
    if (!this.admin.token) return false;

    try {
      const response = await this.apiRequest('/auth/verify');
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Setup login form
   */
  setupLoginForm() {
    const loginForm = document.getElementById('admin-login-form');
    if (!loginForm) {
      console.error('Login form not found');
      return;
    }

    this.addEventListener(loginForm, 'submit', this.handleLogin.bind(this));

    // Handle Enter key
    const usernameInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput && passwordInput) {
      this.addEventListener(usernameInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          passwordInput.focus();
        }
      });

      this.addEventListener(passwordInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleLogin(e);
        }
      });
    }

    // Clear any error messages on input
    [usernameInput, passwordInput].forEach(input => {
      if (input) {
        this.addEventListener(input, 'input', () => {
          this.clearLoginError();
        });
      }
    });
  }

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const loginButton = document.querySelector('button[type="submit"]');
    
    if (!email || !password) {
      this.showLoginError('Please enter both email and password');
      return;
    }

    // Show loading state
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.innerHTML = '<span class="loading-spinner"></span> Signing in...';
    }

    try {
      console.log('🔐 Attempting admin login...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Admin login successful');
        console.log('👤 User data:', data.user);
        console.log('🔑 Token:', data.accessToken?.substring(0, 20) + '...');
        
        // Store tokens (using accessToken as the main token)
        this.admin.token = data.accessToken;
        this.admin.refreshToken = data.refreshToken;
        this.admin.currentUser = data.user;
        
        // Save to storage with multiple fallback strategies
        const rememberMe = document.getElementById('remember')?.checked || false;
        this.saveSession(data, rememberMe);
        
        // Setup token refresh
        this.setupTokenRefresh();
        
        // Small delay to ensure token is properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Show dashboard UI first (so elements exist for modules)
        await this.admin.initializeDashboard();
        
        // Then initialize other modules that require authentication
        await this.admin.initializeAuthenticatedModules();
        
        // Clean up URL parameters if they exist
        if (window.location.search.includes('email=') || window.location.search.includes('password=')) {
          const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
      } else {
        console.error('❌ Admin login failed:', data.error);
        this.showLoginError(data.error || 'Invalid credentials');
      }
      
    } catch (error) {
      console.error('Login request failed:', error);
      this.showLoginError('Connection error. Please try again.');
    } finally {
      // Reset login button
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = 'Sign In';
      }
    }
  }

  /**
   * Save admin session with multiple storage strategies
   */
  saveSession(data, rememberMe = false) {
    const expireDuration = rememberMe ? (30 * 24 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000); // 30 days or 1 day
    const sessionData = {
      token: data.accessToken || data.token, // Support both accessToken and legacy token
      refreshToken: data.refreshToken,
      user: data.user,
      timestamp: Date.now(),
      expiresAt: Date.now() + expireDuration
    };

    try {
      // Primary storage - localStorage
      localStorage.setItem('adminToken', data.accessToken || data.token);
      localStorage.setItem('adminRefreshToken', data.refreshToken);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      
      // Backup storage - sessionStorage
      sessionStorage.setItem('adminToken', data.accessToken || data.token);
      sessionStorage.setItem('adminRefreshToken', data.refreshToken);
      
      // Encoded backup - base64 encoded JSON
      const encodedSession = btoa(JSON.stringify({
        t: data.accessToken || data.token,
        r: data.refreshToken,
        u: data.user,
        e: sessionData.expiresAt
      }));
      localStorage.setItem('adminSessionData', encodedSession);
      
      // Cookie fallback (httpOnly would be better but we need JS access)
      const maxAge = rememberMe ? (30*24*60*60) : (24*60*60); // 30 days or 1 day
      document.cookie = `adminToken=${data.accessToken || data.token}; path=/; max-age=${maxAge}; secure; samesite=strict`;
      
      console.log('💾 Admin session saved with multiple storage strategies');
      
    } catch (error) {
      console.error('Failed to save admin session:', error);
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    // Clear existing interval
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check token validity every 5 minutes
    this.sessionCheckInterval = setInterval(() => {
      this.checkTokenExpiry();
    }, 5 * 60 * 1000);

    // Set up refresh 5 minutes before expiry
    this.scheduleTokenRefresh();
  }

  /**
   * Schedule token refresh before expiry
   */
  scheduleTokenRefresh() {
    if (!this.admin.token) return;

    try {
      // Decode token to get expiry
      const tokenPayload = JSON.parse(atob(this.admin.token.split('.')[1]));
      const expiryTime = tokenPayload.exp * 1000;
      const refreshTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
      const timeUntilRefresh = refreshTime - Date.now();

      if (timeUntilRefresh > 0) {
        setTimeout(() => {
          this.refreshToken();
        }, timeUntilRefresh);
        
        console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      } else {
        // Token expires soon, refresh immediately
        this.refreshToken();
      }
    } catch (error) {
      console.error('Failed to schedule token refresh:', error);
    }
  }

  /**
   * Check if token is expiring soon
   */
  async checkTokenExpiry() {
    if (!this.admin.token) {
      this.logout();
      return;
    }

    try {
      const tokenPayload = JSON.parse(atob(this.admin.token.split('.')[1]));
      const expiryTime = tokenPayload.exp * 1000;
      const timeUntilExpiry = expiryTime - Date.now();

      // If token expires in less than 10 minutes, refresh it
      if (timeUntilExpiry < 10 * 60 * 1000) {
        await this.refreshToken();
      }
    } catch (error) {
      console.error('Token expiry check failed:', error);
      this.logout();
    }
  }

  /**
   * Refresh admin access token
   */
  async refreshToken() {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.performTokenRefresh();
    
    try {
      await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  async performTokenRefresh() {
    if (!this.admin.refreshToken) {
      console.error('No refresh token available');
      this.logout();
      return;
    }

    try {
      console.log('🔄 Refreshing admin token...');
      
      const response = await fetch(`${this.admin.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.admin.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update tokens
        this.admin.token = data.accessToken || data.token;
        if (data.refreshToken) {
          this.admin.refreshToken = data.refreshToken;
        }
        
        // Update storage
        this.saveSession({
          accessToken: data.accessToken || data.token,
          refreshToken: this.admin.refreshToken,
          user: this.admin.currentUser
        });
        
        console.log('✅ Admin token refreshed successfully');
        
        // Schedule next refresh
        this.scheduleTokenRefresh();
        
      } else {
        console.error('❌ Token refresh failed');
        this.logout();
      }
      
    } catch (error) {
      console.error('Token refresh request failed:', error);
      this.logout();
    }
  }

  /**
   * Logout admin user
   */
  async logout() {
    console.log('🚪 Admin logging out...');

    try {
      // Notify server
      if (this.admin.token) {
        await this.apiRequest('/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    // Clear session
    this.clearSession();
    
    // Redirect to login
    this.redirectToLogin();
  }

  /**
   * Clear admin session data
   */
  clearSession() {
    // Clear tokens
    this.admin.token = null;
    this.admin.refreshToken = null;
    this.admin.currentUser = null;

    // Clear all storage
    const keysToRemove = [
      'adminToken', 'adminRefreshToken', 'adminUser', 'adminSessionData',
      'admin_session', 'admin_refresh'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear cookies
    document.cookie = 'adminToken=; path=/; max-age=0';

    // Clear intervals
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    console.log('🧹 Admin session cleared');
  }

  /**
   * Redirect to admin login page
   */
  redirectToLogin() {
    const currentPath = window.location.pathname;
    
    if (currentPath !== '/admin.html' && currentPath !== '/admin-login.html') {
      window.location.href = '/admin.html';
    }
  }

  /**
   * Show login error message
   */
  showLoginError(message) {
    const errorElement = document.getElementById('admin-login-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
   * Clear login error message
   */
  clearLoginError() {
    const errorElement = document.getElementById('admin-login-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * Setup socket events for admin auth
   */
  setupSocketEvents(socket) {
    socket.on('admin_session_expired', () => {
      console.log('🚨 Admin session expired remotely');
      this.logout();
    });

    socket.on('admin_force_logout', () => {
      console.log('🚨 Admin force logout received');
      this.logout();
    });
  }

  /**
   * Cleanup auth module
   */
  cleanup() {
    super.cleanup();
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
}