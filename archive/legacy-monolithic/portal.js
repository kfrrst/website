// Client Portal JavaScript
import { ProgressTracker } from './components/ProgressTracker.js';
import { PhaseCard } from './components/PhaseCard.js';
import { PhaseDeliverables } from './components/PhaseDeliverables.js';
import { PhaseTimeline } from './components/PhaseTimeline.js';
import { BRAND } from './config/brand.js';

class ClientPortalDashboard {
  constructor() {
    this.currentSection = 'dashboard';
    this.fabMenuOpen = false;
    this.animations = new Map();
    this.dataCache = new Map();
    this.wsConnection = null;
    this.socket = null;
    this.currentUser = null;
    this.authToken = null;
    this.conversations = [];
    this.currentConversation = null;
    this.typingIndicators = new Map();
    this.unreadCount = 0;
    this.onlineUsers = new Set();
    this.stripe = null;
    this.stripeElements = null;
    this.cardElement = null;
    this.invoices = [];
    this.init();
  }

  async init() {
    try {
      console.log('Portal initialization starting...');
      
      // Load ProgressTracker module
      await this.loadProgressTracker();
      
      // Check authentication status first
      console.log('Checking authentication status...');
      this.checkAuthenticationStatus();
      
      // Set up all components
      console.log('Setting up portal components...');
      this.setupLoginForm();
      this.setupNavigation();
      this.setupFloatingActions();
      this.setupRealTimeUpdates();
      this.setupAdvancedInteractions();
      this.setupDataVisualization();
      this.setupKeyboardShortcuts();
      this.setupEventDelegation();
      this.setupProgressBars();
      this.initializeWebSocket();
      this.initializeStripe();
      this.setupPhaseUpdateListeners();
      
      console.log('Portal initialization completed successfully');
    } catch (error) {
      console.error('Portal initialization failed:', error);
      // Still show login screen if initialization fails
      this.showLoginScreen();
    }
  }
  
  // Load ProgressTracker module dynamically
  async loadProgressTracker() {
    try {
      const module = await import('./components/ProgressTracker.js');
      this.ProgressTracker = module.ProgressTracker;
      this.createInlineProgressBar = module.createInlineProgressBar;
      console.log('ProgressTracker loaded successfully');
    } catch (error) {
      console.error('Failed to load ProgressTracker:', error);
      // Fallback functions for when ProgressTracker fails to load
      this.createInlineProgressBar = (currentPhaseIndex, phaseKey) => {
        const progress = (currentPhaseIndex / 7) * 100;
        return `
          <div class="inline-progress-tracker fallback">
            <div class="inline-progress-bar">
              <div class="inline-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="inline-progress-info">
              <span class="current-phase">${phaseKey}</span>
              <span class="progress-percentage">${Math.round(progress)}%</span>
            </div>
          </div>
        `;
      };
    }
  }

  // Check authentication status on page load
  checkAuthenticationStatus() {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('userData');
    
    if (token && user) {
      try {
        this.authToken = token;
        this.refreshToken = refreshToken;
        this.currentUser = JSON.parse(user);
        // Verify token is still valid
        this.verifyTokenAndShowDashboard();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.showLoginScreen();
        this.clearAuthData();
      }
    } else {
      this.showLoginScreen();
    }
  }

  // Verify token and show dashboard
  async verifyTokenAndShowDashboard() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.user;
        this.showPortalContent();
        this.updateUserInfo();
        this.loadDashboardData();
        
        // Set up automatic token refresh (refresh 2 minutes before expiry)
        this.setupTokenRefreshTimer();
      } else if (response.status === 403) {
        // Try to refresh token
        await this.refreshAccessToken();
      } else {
        this.showLoginScreen();
        this.clearAuthData();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.showLoginScreen();
      this.clearAuthData();
    }
  }

  // Setup automatic token refresh
  setupTokenRefreshTimer() {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    
    // Refresh token 2 minutes before it expires (token expires in 15 minutes)
    const refreshInterval = 13 * 60 * 1000; // 13 minutes
    
    this.tokenRefreshTimer = setTimeout(async () => {
      console.log('Auto-refreshing access token...');
      await this.refreshAccessToken();
    }, refreshInterval);
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      this.showLoginScreen();
      this.clearAuthData();
      return;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        localStorage.setItem('authToken', this.authToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        this.showPortalContent();
        this.updateUserInfo();
        this.loadDashboardData();
        
        // Set up next automatic refresh
        this.setupTokenRefreshTimer();
      } else {
        this.showLoginScreen();
        this.clearAuthData();
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      this.showLoginScreen();
      this.clearAuthData();
    }
  }

  // Setup login form handling
  setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
  }

  // Handle login form submission
  async handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginButton = document.querySelector('.btn-login');
    const btnText = loginButton.querySelector('.btn-text');
    const btnLoading = loginButton.querySelector('.btn-loading');
    
    if (!email || !password) {
      this.showLoginError('Please fill in all fields');
      return;
    }

    // Show loading state
    loginButton.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.accessToken && data.user) {
        // Store authentication data
        this.authToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.currentUser = data.user;
        localStorage.setItem('authToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        // Show success and redirect to portal
        this.showLoginSuccess();
        setTimeout(() => {
          this.showPortalContent();
          this.updateUserInfo();
          this.loadDashboardData();
          // Set up automatic token refresh
          this.setupTokenRefreshTimer();
        }, 1000);
        
      } else {
        // Handle login error
        const errorMessage = data.message || 'Invalid email or password';
        this.showLoginError(errorMessage);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.showLoginError('Connection error. Please try again.');
    } finally {
      // Reset button state
      loginButton.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  // Show login screen
  showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('portal-content').classList.add('hidden');
  }

  // Show portal content after successful login
  showPortalContent() {
    console.log('Showing portal content...');
    const loginScreen = document.getElementById('login-screen');
    const portalContent = document.getElementById('portal-content');
    
    if (loginScreen) {
      loginScreen.classList.add('hidden');
      console.log('Login screen hidden');
    } else {
      console.warn('Login screen element not found');
    }
    
    if (portalContent) {
      portalContent.classList.remove('hidden');
      console.log('Portal content shown');
    } else {
      console.error('Portal content element not found!');
    }
    
    // Initialize Socket.IO after authentication is confirmed
    this.initializeSocketIO();
  }

  // Update user info in the portal header
  updateUserInfo() {
    if (this.currentUser) {
      const userNameElement = document.querySelector('.user-name');
      const userAvatarElement = document.querySelector('.user-avatar');
      
      if (userNameElement) {
        userNameElement.textContent = this.currentUser.name || this.currentUser.email;
      }
      
      if (userAvatarElement) {
        // Create initials from name or email
        const name = this.currentUser.name || this.currentUser.email;
        const initials = name.split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2);
        userAvatarElement.textContent = initials;
      }
    }
  }

  // Show login error message
  showLoginError(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.login-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Create and show new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-error';
    errorDiv.style.cssText = `
      color: #ff4444;
      background: rgba(255, 68, 68, 0.1);
      padding: 0.75rem;
      margin: 1rem 0;
      border-radius: 4px;
      border: 1px solid rgba(255, 68, 68, 0.2);
      font-size: 0.9rem;
      text-align: center;
    `;
    errorDiv.textContent = message;
    
    const loginForm = document.getElementById('login-form');
    loginForm.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // Show login success message
  showLoginSuccess() {
    const successDiv = document.createElement('div');
    successDiv.className = 'login-success';
    successDiv.style.cssText = `
      color: #00aa44;
      background: rgba(0, 170, 68, 0.1);
      padding: 0.75rem;
      margin: 1rem 0;
      border-radius: 4px;
      border: 1px solid rgba(0, 170, 68, 0.2);
      font-size: 0.9rem;
      text-align: center;
    `;
    successDiv.textContent = 'Login successful! Redirecting...';
    
    const loginForm = document.getElementById('login-form');
    loginForm.appendChild(successDiv);
  }

  // Clear authentication data
  clearAuthData() {
    this.authToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.disconnectSocket();
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }

  // Logout function
  logout() {
    this.clearAuthData();
    this.showMessage('Logged out successfully', 'info');
    setTimeout(() => {
      this.showLoginScreen();
      // Clear form
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.reset();
      }
      // Remove any error messages
      const errorMessages = document.querySelectorAll('.login-error, .login-success');
      errorMessages.forEach(msg => msg.remove());
    }, 1000);
  }

  // Setup data visualization components
  setupDataVisualization() {
    // Initialize charts and data visualization components
    // This method can be expanded later to include actual chart libraries
    console.log('Data visualization components initialized');
    
    // Set up any dashboard charts or graphs here
    this.initializeDashboardCharts();
  }

  // Initialize dashboard charts (placeholder for future implementation)
  initializeDashboardCharts() {
    // Placeholder for chart initialization
    // This could include Chart.js, D3.js, or other visualization libraries
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
      // Add any default styling or placeholder content
      if (!container.hasChildNodes()) {
        container.innerHTML = '<div class="chart-placeholder">Chart loading...</div>';
      }
    });
  }

  // Setup advanced keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            this.showSection('dashboard');
            break;
          case '2':
            e.preventDefault();
            this.showSection('projects');
            break;
          case '3':
            e.preventDefault();
            this.showSection('files');
            break;
          case '4':
            e.preventDefault();
            this.showSection('messages');
            break;
          case '5':
            e.preventDefault();
            this.showSection('invoices');
            break;
          case '/':
            e.preventDefault();
            this.openSearch();
            break;
        }
      }
    });
  }

  /**
   * Setup event delegation for data-action attributes
   */
  setupEventDelegation() {
    document.addEventListener('click', (e) => {
      const element = e.target.closest('[data-action]');
      if (!element) return;

      const action = element.dataset.action;
      
      switch (action) {
        case 'toggle-notifications':
          this.toggleNotifications();
          break;
        case 'logout':
          this.logout();
          break;
        case 'toggle-quick-actions':
          this.toggleQuickActions();
          break;
        case 'start-new-message':
          this.startNewMessage();
          break;
        case 'upload-file':
          this.uploadFile();
          break;
        case 'test-function':
          this.testFunction();
          break;
        case 'view-project':
          this.viewProject(element.dataset.projectId);
          break;
        case 'download-project-assets':
          this.downloadProjectAssets(element.dataset.projectId);
          break;
        case 'preview-file':
          this.previewFile(element.dataset.fileId, element.dataset.fileName);
          break;
        case 'download-file':
          this.downloadFile(element.dataset.fileId, element.dataset.fileName);
          break;
        case 'delete-file':
          this.deleteFile(element.dataset.fileId, element.dataset.fileName);
          break;
        case 'select-conversation':
          this.selectConversation(element.dataset.conversationId);
          break;
        case 'view-invoice':
          this.viewInvoice(element.dataset.invoiceId);
          break;
        case 'download-invoice-pdf':
          this.downloadInvoicePDF(element.dataset.invoiceId);
          break;
        case 'open-payment-modal':
          this.openPaymentModal(element.dataset.invoiceId);
          break;
        case 'show-project-overview':
          this.showProjectOverview(element.dataset.projectId);
          break;
        case 'close-project-details-modal':
          this.closeProjectDetailsModal();
          break;
        case 'download-project-file':
          this.downloadProjectFile(element.dataset.fileId, element.dataset.fileName);
          break;
        case 'select-conversation-recipient':
          this.selectConversationRecipient(element.dataset.userId, element.dataset.userName);
          break;
        case 'trigger-file-upload':
          this.triggerFileUpload();
          break;
        case 'filter-files':
          this.filterFiles(element.value);
          break;
        case 'start-new-conversation':
          this.startNewConversation();
          break;
        case 'click-message-attachment':
          document.getElementById('message-attachment').click();
          break;
        case 'send-message':
          this.sendMessage();
          break;
        case 'close-payment-modal':
          this.closePaymentModal();
          break;
        case 'close-modal':
          element.closest('.modal-overlay').remove();
          break;
      }
    });

    // Handle change events for form elements
    document.addEventListener('change', (e) => {
      const element = e.target.closest('[data-action]');
      if (!element) return;

      const action = element.dataset.action;
      
      switch (action) {
        case 'filter-files':
          this.filterFiles(element.value);
          break;
      }
    });
  }

  /**
   * Toggle notifications dropdown
   */
  toggleNotifications() {
    console.log('Toggle notifications clicked');
    // Implementation for notifications dropdown
  }

  /**
   * Start new message
   */
  startNewMessage() {
    console.log('Start new message clicked');
    this.showSection('messages');
    this.toggleQuickActions(); // Close the fab menu
  }

  /**
   * Upload file action
   */
  uploadFile() {
    console.log('Upload file clicked');
    // Trigger file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.zip';
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.uploadFiles(e.target.files);
      }
    });
    fileInput.click();
    this.toggleQuickActions(); // Close the fab menu
  }

  /**
   * Test function for debugging
   */
  testFunction() {
    console.log('Test function called!');
    alert('Test function works! JavaScript is loaded and working.');
  }

  /**
   * View project details
   */
  viewProject(projectId) {
    this.openProjectDetailsModal(projectId);
  }

  /**
   * Download project assets
   */
  downloadProjectAssets(projectId) {
    console.log('Downloading assets for project:', projectId);
    // Implementation for downloading project assets
    this.showMessage('Preparing project assets for download...', 'info');
    // TODO: Implement actual download logic
  }

  /**
   * Preview file
   */
  previewFile(fileId, fileName) {
    console.log('Previewing file:', fileId, fileName);
    // Implementation for file preview
    // TODO: Implement file preview modal
  }

  /**
   * Delete file
   */
  deleteFile(fileId, fileName) {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      console.log('Deleting file:', fileId, fileName);
      // TODO: Implement file deletion
      this.showMessage(`File ${fileName} deleted successfully`, 'success');
    }
  }

  /**
   * View invoice
   */
  viewInvoice(invoiceId) {
    console.log('Viewing invoice:', invoiceId);
    // TODO: Implement invoice viewing modal
  }

  /**
   * Download invoice PDF
   */
  downloadInvoicePDF(invoiceId) {
    console.log('Downloading invoice PDF:', invoiceId);
    this.showMessage('Generating invoice PDF...', 'info');
    // TODO: Implement PDF download
  }

  /**
   * Show project overview
   */
  showProjectOverview(projectId) {
    console.log('Showing project overview:', projectId);
    // TODO: Implement project overview view
  }

  /**
   * Close project details modal
   */
  closeProjectDetailsModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Download project file
   */
  downloadProjectFile(fileId, fileName) {
    this.downloadFile(fileId, fileName);
  }

  /**
   * Select conversation recipient
   */
  selectConversationRecipient(userId, userName) {
    console.log('Selecting conversation recipient:', userId, userName);
    this.startNewConversation();
    // TODO: Pre-select the recipient in the new conversation
  }

  /**
   * Trigger file upload
   */
  triggerFileUpload() {
    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Filter files
   */
  filterFiles(filterType) {
    console.log('Filtering files by:', filterType);
    // TODO: Implement file filtering
  }

  /**
   * Close payment modal
   */
  closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Setup progress bars from data attributes
   */
  setupProgressBars() {
    document.querySelectorAll('.progress-fill[data-progress]').forEach(progressBar => {
      const progress = progressBar.dataset.progress;
      progressBar.style.width = `${progress}%`;
    });
  }

  // Initialize WebSocket for real-time updates
  initializeWebSocket() {
    // Simulate WebSocket connection for demo
    this.simulateRealTimeUpdates();
  }

  // Initialize Socket.IO for real-time messaging
  initializeSocketIO() {
    if (!this.authToken) return;

    // Load Socket.io from CDN if not already loaded
    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = '/socket.io/socket.io.js';
      script.onload = () => this.connectSocket();
      document.head.appendChild(script);
    } else {
      this.connectSocket();
    }
  }

  // Connect to Socket.IO server
  connectSocket() {
    if (!this.authToken || this.socket?.connected) {
      if (!this.authToken) {
        console.warn('Socket.IO connection skipped: No auth token available');
      }
      return;
    }

    console.log('Connecting to Socket.IO server with token:', this.authToken.substring(0, 20) + '...');
    this.socket = io({
      auth: {
        token: this.authToken
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.updateOnlineStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.updateOnlineStatus(false);
    });

    // Real-time message events
    this.socket.on('new_message', (message) => {
      this.handleNewMessage(message);
    });

    this.socket.on('message_sent', (message) => {
      this.handleMessageSent(message);
    });

    this.socket.on('message_read', (data) => {
      this.handleMessageRead(data);
    });

    this.socket.on('message_deleted', (data) => {
      this.handleMessageDeleted(data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.handleTypingIndicator(data);
    });

    // Presence updates
    this.socket.on('presence_update', (data) => {
      this.handlePresenceUpdate(data);
    });

    // Unread count updates
    this.socket.on('unread_count_updated', (data) => {
      this.updateUnreadCount(data.count);
    });

    // Phase progress updates
    this.socket.on('phase_approved', (data) => {
      this.handlePhaseApproved(data);
    });

    this.socket.on('phase_changes_requested', (data) => {
      this.handlePhaseChangesRequested(data);
    });

    this.socket.on('phase_activity_added', (data) => {
      this.handlePhaseActivityAdded(data);
    });

    this.socket.on('project_phase_updated', (data) => {
      this.handleProjectPhaseUpdated(data);
    });

    this.socket.on('file_uploaded', (data) => {
      this.handleFileUploaded(data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Handle incoming new message
  handleNewMessage(message) {
    // Update conversations list
    this.updateConversationsList(message);
    
    // If currently viewing this conversation, add message to thread
    if (this.currentConversation && 
        (message.sender_id === this.currentConversation.id || message.recipient_id === this.currentConversation.id)) {
      this.addMessageToThread(message);
      this.markMessageAsRead(message.id);
    }
    
    // Show notification if not in messages section
    if (this.currentSection !== 'messages') {
      this.showMessage(`New message from ${message.sender_first_name} ${message.sender_last_name}`, 'info');
    }
    
    // Update badge count
    this.updateMessagesBadge();
  }

  // Handle message sent confirmation
  handleMessageSent(message) {
    this.addMessageToThread(message, true);
    this.updateConversationsList(message);
  }

  // Handle message read receipt
  handleMessageRead(data) {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
      messageElement.classList.add('read');
      const readIndicator = messageElement.querySelector('.read-indicator');
      if (readIndicator) {
        readIndicator.textContent = '✓✓';
        readIndicator.classList.add('read');
      }
    }
  }

  // Handle message deletion
  handleMessageDeleted(data) {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
      messageElement.remove();
    }
  }

  // Handle typing indicators
  handleTypingIndicator(data) {
    if (data.isTyping) {
      this.typingIndicators.set(data.userId, data.userName);
    } else {
      this.typingIndicators.delete(data.userId);
    }
    this.updateTypingDisplay();
  }

  // Handle presence updates
  handlePresenceUpdate(data) {
    if (data.status === 'online') {
      this.onlineUsers.add(data.userId);
    } else {
      this.onlineUsers.delete(data.userId);
    }
    this.updatePresenceIndicators();
  }

  // Update online status indicator
  updateOnlineStatus(isOnline) {
    const indicator = document.querySelector('.connection-status');
    if (indicator) {
      indicator.className = `connection-status ${isOnline ? 'online' : 'offline'}`;
      indicator.textContent = isOnline ? 'Online' : 'Offline';
    }
  }

  // Phase WebSocket Event Handlers
  handlePhaseApproved(data) {
    console.log('Phase approved:', data);
    const { projectId, phaseId, phaseName } = data;
    
    // Show success notification
    this.showMessage(`Phase "${phaseName}" has been approved!`, 'success');
    
    // Update phase status in open modal if it matches
    this.updatePhaseStatusInModal(projectId, phaseId, 'approved');
    
    // Refresh phase data and update comment count
    this.refreshPhaseData(projectId, phaseId);
  }

  handlePhaseChangesRequested(data) {
    console.log('Phase changes requested:', data);
    const { projectId, phaseId, phaseName } = data;
    
    // Show notification
    this.showMessage(`Changes requested for phase "${phaseName}"`, 'warning');
    
    // Update phase status in open modal if it matches
    this.updatePhaseStatusInModal(projectId, phaseId, 'changes_requested');
    
    // Refresh phase data and update comment count
    this.refreshPhaseData(projectId, phaseId);
  }

  handlePhaseActivityAdded(data) {
    console.log('Phase activity added:', data);
    const { projectId, phaseId, activity } = data;
    
    // Update activity count badge in progress tracker
    this.updatePhaseActivityCount(projectId, phaseId, data.activityCount);
    
    // Refresh timeline if currently viewing this phase
    this.refreshPhaseTimelineIfActive(projectId, phaseId);
  }

  handleProjectPhaseUpdated(data) {
    console.log('Project phase updated:', data);
    const { projectId, phaseUpdates } = data;
    
    // Refresh entire project if modal is open
    if (this.isProjectModalOpen(projectId)) {
      this.refreshProjectModal(projectId);
    }
    
    // Update project list item
    this.updateProjectInList(projectId, phaseUpdates);
  }

  handleFileUploaded(data) {
    console.log('File uploaded:', data);
    const { projectId, phaseId, file } = data;
    
    // Show notification
    this.showMessage(`New file uploaded: ${file.name}`, 'info');
    
    // Refresh deliverables if currently viewing this phase
    this.refreshPhaseDeliverablesIfActive(projectId, phaseId);
  }

  // Helper methods for real-time updates
  updatePhaseStatusInModal(projectId, phaseId, status) {
    const modal = document.querySelector('.project-details-modal.show');
    if (!modal) return;
    
    const modalProjectId = modal.dataset.projectId;
    if (modalProjectId !== projectId) return;
    
    // Update phase card status if it exists
    const phaseCard = modal.querySelector(`[data-phase-id="${phaseId}"]`);
    if (phaseCard) {
      phaseCard.className = phaseCard.className.replace(/status-\w+/g, `status-${status}`);
    }
  }

  updatePhaseActivityCount(projectId, phaseId, newCount) {
    const modal = document.querySelector('.project-details-modal.show');
    if (!modal) return;
    
    const modalProjectId = modal.dataset.projectId;
    if (modalProjectId !== projectId) return;
    
    // Update comment badge in progress tracker tabs
    const phaseTab = modal.querySelector(`[data-phase-id="${phaseId}"] .tab-comment-badge`);
    if (phaseTab) {
      if (newCount > 0) {
        phaseTab.textContent = newCount;
        phaseTab.style.display = 'flex';
        phaseTab.setAttribute('title', `${newCount} activities`);
      } else {
        phaseTab.style.display = 'none';
      }
    }
  }

  async refreshPhaseData(projectId, phaseId) {
    // Refresh the specific phase data and update UI
    try {
      const response = await fetch(`/api/projects/${projectId}/phases`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const phasesData = await response.json();
        // Update the progress tracker with new data
        this.updateProgressTrackerData(projectId, phasesData);
      }
    } catch (error) {
      console.error('Error refreshing phase data:', error);
    }
  }

  refreshPhaseTimelineIfActive(projectId, phaseId) {
    const modal = document.querySelector('.project-details-modal.show');
    if (!modal) return;
    
    const modalProjectId = modal.dataset.projectId;
    if (modalProjectId !== projectId) return;
    
    // Check if this phase timeline is currently visible
    const activeTimeline = modal.querySelector('.phase-timeline-section.active');
    if (activeTimeline && activeTimeline.dataset.phaseId === phaseId) {
      // Refresh the timeline component
      const timelineContainer = activeTimeline.querySelector('.phase-timeline-container');
      if (timelineContainer && timelineContainer._phaseTimeline) {
        timelineContainer._phaseTimeline.refresh();
      }
    }
  }

  refreshPhaseDeliverablesIfActive(projectId, phaseId) {
    const modal = document.querySelector('.project-details-modal.show');
    if (!modal) return;
    
    const modalProjectId = modal.dataset.projectId;
    if (modalProjectId !== projectId) return;
    
    // Check if this phase deliverables is currently visible
    const activeDeliverables = modal.querySelector('.phase-deliverables-section.active');
    if (activeDeliverables && activeDeliverables.dataset.phaseId === phaseId) {
      // Refresh the deliverables component
      const deliverablesContainer = activeDeliverables.querySelector('.phase-deliverables-container');
      if (deliverablesContainer && deliverablesContainer._phaseDeliverables) {
        deliverablesContainer._phaseDeliverables.refresh();
      }
    }
  }

  isProjectModalOpen(projectId) {
    const modal = document.querySelector('.project-details-modal.show');
    return modal && modal.dataset.projectId === projectId;
  }

  async refreshProjectModal(projectId) {
    if (this.isProjectModalOpen(projectId)) {
      // Re-initialize project modal with fresh data
      const project = await this.fetchProject(projectId);
      if (project) {
        await this.initializeProjectProgressTracker(project);
      }
    }
  }

  updateProgressTrackerData(projectId, phasesData) {
    const tracker = document.querySelector(`#project-phase-tracker-${projectId}`);
    if (tracker && tracker._progressTracker) {
      // Update the progress tracker with new phase data
      tracker._progressTracker.updateWithData(phasesData);
    }
  }

  updateProjectInList(projectId, phaseUpdates) {
    const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
    if (projectCard) {
      // Update project progress percentage, current phase, etc.
      const progressBar = projectCard.querySelector('.progress-fill');
      const progressText = projectCard.querySelector('.progress-text');
      
      if (progressBar && phaseUpdates.progressPercentage !== undefined) {
        progressBar.style.width = `${phaseUpdates.progressPercentage}%`;
      }
      
      if (progressText && phaseUpdates.progressPercentage !== undefined) {
        progressText.textContent = `${phaseUpdates.progressPercentage}% Complete`;
      }
    }
  }

  // Simulate real-time updates
  simulateRealTimeUpdates() {
    setInterval(() => {
      this.updateStatsWithAnimation();
    }, 30000); // Update every 30 seconds
  }

  // Update stats with smooth animations
  updateStatsWithAnimation() {
    const statCards = document.querySelectorAll('.stat-card h3');
    
    statCards.forEach((stat, index) => {
      const currentValue = parseInt(stat.textContent);
      const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      const newValue = Math.max(0, currentValue + change);
      
      this.animateNumberChange(stat, currentValue, newValue);
    });
  }

  // Animate number changes with easing
  animateNumberChange(element, from, to) {
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(from + (to - from) * easeOutCubic);
      element.textContent = current.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // Setup advanced interactions and micro-animations
  setupAdvancedInteractions() {
    // Magnetic hover effects for cards
    this.setupMagneticEffects();
    
    // Progressive loading animations
    this.setupProgressiveLoading();
    
    // Interactive data cards
    this.setupInteractiveCards();
  }

  // Setup magnetic hover effects
  setupMagneticEffects() {
    const cards = document.querySelectorAll('.stat-card, .project-card, .activity-item');
    
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        card.style.transform = `perspective(1000px) rotateX(${y * 0.1}deg) rotateY(${x * 0.1}deg) translateZ(10px)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    });
  }

  // Setup progressive loading animations
  setupProgressiveLoading() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card, .activity-item, .project-card').forEach(el => {
      observer.observe(el);
    });
  }

  // Setup interactive data cards with expand/collapse
  setupInteractiveCards() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
      card.addEventListener('click', () => {
        this.toggleCardExpansion(card);
      });
    });
  }

  // Toggle card expansion with detailed view
  toggleCardExpansion(card) {
    const isExpanded = card.classList.contains('expanded');
    
    // Close other expanded cards
    document.querySelectorAll('.project-card.expanded').forEach(expandedCard => {
      if (expandedCard !== card) {
        expandedCard.classList.remove('expanded');
      }
    });
    
    if (isExpanded) {
      card.classList.remove('expanded');
    } else {
      card.classList.add('expanded');
      this.loadDetailedProjectData(card);
    }
  }

  // Load detailed project data
  loadDetailedProjectData(card) {
    // Simulate loading detailed data
    setTimeout(() => {
      if (!card.querySelector('.project-details')) {
        const details = document.createElement('div');
        details.className = 'project-details';
        details.innerHTML = `
          <div class="detail-section">
            <h5>[Recent Activity]</h5>
            <ul class="activity-mini-list">
              <li>Logo concepts uploaded - 2 hours ago</li>
              <li>Client feedback received - 1 day ago</li>
              <li>Wireframes approved - 3 days ago</li>
            </ul>
          </div>
          <div class="detail-section">
            <h5>[Next Milestones]</h5>
            <ul class="milestone-list">
              <li>Final logo delivery - Feb 10</li>
              <li>Brand guidelines - Feb 12</li>
              <li>Project completion - Feb 15</li>
            </ul>
          </div>
        `;
        card.appendChild(details);
      }
    }, 300);
  }

  // Setup navigation between sections
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = link.getAttribute('href').substring(1);
        this.showSection(targetSection);
        this.updateActiveNav(link);
      });
    });
  }

  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.portal-section').forEach(section => {
      section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    
    if (targetSection) {
      targetSection.classList.add('active');
      this.currentSection = sectionId;
      
      // Load section-specific data
      this.loadSectionData(sectionId);
      
      // Update page title
      document.title = `[${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}] - Client Portal`;
    }
  }

  // Load section-specific data and content
  loadSectionData(sectionId) {
    switch(sectionId) {
      case 'projects':
        this.loadProjectsContent();
        break;
      case 'files':
        this.loadFilesContent();
        break;
      case 'messages':
        this.loadMessagesContent();
        break;
      case 'invoices':
        this.loadInvoicesContent();
        break;
      case 'dashboard':
        // Always reload dashboard data when switching to dashboard
        this.loadDashboardData();
        break;
    }
  }

  updateActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    activeLink.classList.add('active');
  }

  // Setup floating action buttons
  setupFloatingActions() {
    const fabMain = document.querySelector('.fab-main');
    if (fabMain) {
      fabMain.addEventListener('click', () => {
        this.toggleQuickActions();
      });
    }

    // Close fab menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.floating-actions') && this.fabMenuOpen) {
        this.toggleQuickActions();
      }
    });
  }

  toggleQuickActions() {
    const fabMenu = document.querySelector('.fab-menu');
    const fabMain = document.querySelector('.fab-main');
    
    if (fabMenu && fabMain) {
      this.fabMenuOpen = !this.fabMenuOpen;
      
      if (this.fabMenuOpen) {
        fabMenu.classList.remove('hidden');
        setTimeout(() => fabMenu.classList.add('visible'), 10);
        fabMain.style.transform = 'rotate(45deg) scale(1.1)';
      } else {
        fabMenu.classList.remove('visible');
        setTimeout(() => fabMenu.classList.add('hidden'), 300);
        fabMain.style.transform = 'rotate(0deg) scale(1)';
      }
    }
  }

  // Load section-specific data
  loadSectionData(sectionId) {
    switch (sectionId) {
      case 'projects':
        this.loadProjectsContent();
        break;
      case 'files':
        this.loadFilesContent();
        break;
      case 'messages':
        this.loadMessagesContent();
        break;
      case 'invoices':
        this.loadInvoicesContent();
        break;
      default:
        break;
    }
  }

  // Load projects content from API with phase data
  async loadProjectsContent() {
    const projectsList = document.querySelector('.projects-list');
    if (!projectsList) return;

    projectsList.innerHTML = '<p class="loading-message">Loading projects...</p>';

    try {
      const response = await fetch('/api/projects?include_phase_data=true', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.renderProjectsList(data.projects || []);

    } catch (error) {
      console.error('Error loading projects:', error);
      projectsList.innerHTML = '<p class="error-message">Error loading projects. Please try again.</p>';
      this.showMessage('Failed to load projects', 'error');
    }
  }

  // Render projects list with real data
  renderProjectsList(projects) {
    const projectsList = document.querySelector('.projects-list');
    if (!projectsList) return;
    
    console.log('Rendering projects:', projects);
    
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      projectsList.innerHTML = '<p class="empty-message">No projects found. Contact support to get started with your first project.</p>';
      return;
    }

    const projectsHTML = `
      <div class="projects-grid">
        ${projects.map(project => this.renderProjectCard(project)).join('')}
      </div>
    `;
    
    projectsList.innerHTML = projectsHTML;
  }

  // Render individual project card with phase tracking
  renderProjectCard(project) {
    const statusClass = project.status.toLowerCase().replace(' ', '-');
    const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set';
    const endDate = project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set';
    
    // Get phase data
    const currentPhaseIndex = project.phase_tracking?.current_phase_index || 0;
    const currentPhase = project.phase_tracking?.current_phase || 'onboarding';
    const requiresClientAction = project.phase_tracking?.requires_client_action || false;
    
    // Create inline progress bar using phase data
    const phaseProgressBar = this.createInlineProgressBar(currentPhaseIndex, currentPhase);
    
    return `
      <div class="project-card-detailed ${requiresClientAction ? 'action-required' : ''}" data-project-id="${project.id}">
        <div class="project-header">
          <h4>${project.name}</h4>
          <div class="project-status-group">
            <span class="project-status ${statusClass}">${project.status}</span>
            ${requiresClientAction ? '<span class="action-badge">Action Required</span>' : ''}
          </div>
        </div>
        <div class="project-meta">
          <p><strong>Started:</strong> ${startDate}</p>
          <p><strong>Due:</strong> ${endDate}</p>
          ${project.budget ? `<p><strong>Budget:</strong> $${project.budget.toLocaleString()}</p>` : ''}
        </div>
        <div class="progress-section">
          ${phaseProgressBar}
        </div>
        <div class="project-description">
          <p>${project.description || 'No description available.'}</p>
        </div>
        ${requiresClientAction ? `
          <div class="client-actions-summary">
            <h5>Actions Required:</h5>
            <ul>
              ${(project.phase_tracking.pending_actions || []).slice(0, 2).map(action => 
                `<li>${action.action_description}</li>`
              ).join('')}
              ${(project.phase_tracking.pending_actions || []).length > 2 ? 
                `<li>+${(project.phase_tracking.pending_actions || []).length - 2} more...</li>` : ''}
            </ul>
          </div>
        ` : ''}
        <div class="project-actions">
          <button class="btn-secondary" data-action="view-project" data-project-id="${project.id}">View Details</button>
          ${project.files && project.files.length > 0 ? `<button class="btn-secondary" data-action="download-project-assets" data-project-id="${project.id}">Download Assets</button>` : ''}
        </div>
      </div>
    `;
  }

  // Load files content from backend API
  async loadFilesContent() {
    const fileManager = document.querySelector('.file-manager');
    if (!fileManager) return;

    fileManager.innerHTML = '<p class="loading-message">Loading files...</p>';

    try {
      const response = await fetch('/api/files', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.renderFilesBrowser(data.files || []);
      this.setupDragAndDrop();

    } catch (error) {
      console.error('Error loading files:', error);
      fileManager.innerHTML = '<p class="error-message">Error loading files. Please try again.</p>';
      this.showMessage('Failed to load files', 'error');
    }
  }

  // Render files browser with real data
  renderFilesBrowser(files) {
    const fileManager = document.querySelector('.file-manager');
    if (!fileManager) return;

    const filesHTML = `
      <div class="file-browser">
        <div class="file-browser-header">
          <h4>[Project Files]</h4>
          <div class="file-actions">
            <button class="btn-secondary" data-action="trigger-file-upload">Upload File</button>
            <input type="file" id="file-upload-input" multiple class="hidden-file-input" accept="*/*">
            <select class="file-filter" data-action="filter-files">
              <option value="all">All Files</option>
              <option value="images">Images</option>
              <option value="documents">Documents</option>
              <option value="archives">Archives</option>
            </select>
          </div>
        </div>
        <div class="file-drop-zone" id="file-drop-zone">
          <div class="drop-zone-content">
            <p>Drag and drop files here or click Upload File</p>
            <div class="upload-progress" id="upload-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
              </div>
              <p class="progress-text" id="progress-text">Uploading...</p>
            </div>
          </div>
        </div>
        <div class="file-list" id="file-list">
          ${this.renderFileList(files)}
        </div>
      </div>
    `;
    
    fileManager.innerHTML = filesHTML;
    this.setupFileUploadInput();
  }

  // Render individual file items
  renderFileList(files) {
    if (!files || files.length === 0) {
      return '<p class="no-files-message">No files uploaded yet. Upload your first file to get started.</p>';
    }

    return files.map(file => {
      const fileSize = this.formatFileSize(file.file_size || file.size || 0);
      const fileDate = this.formatFileDate(file.updated_at || file.created_at || file.uploadDate);
      const fileIcon = this.getFileIcon(file.original_name || file.name || file.filename || 'unknown', file.mime_type || file.mimeType || file.mimetype || '');
      
      return `
        <div class="file-item" data-file-id="${file.id}" data-file-type="${this.getFileType(file.mime_type || file.mimeType)}">
          <div class="file-icon">${fileIcon}</div>
          <div class="file-info">
            <span class="file-name" title="${file.original_name || file.name}">${file.original_name || file.name}</span>
            <span class="file-size">${fileSize}</span>
            <span class="file-date">${fileDate}</span>
          </div>
          <div class="file-actions">
            <button class="btn-link" data-action="preview-file" data-file-id="${file.id}" data-file-name="${file.originalName || file.name}">Preview</button>
            <button class="btn-link" data-action="download-file" data-file-id="${file.id}" data-file-name="${file.originalName || file.name}">Download</button>
            <button class="btn-link delete" data-action="delete-file" data-file-id="${file.id}" data-file-name="${file.originalName || file.name}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Load messages content with real-time functionality
  async loadMessagesContent() {
    const messagingInterface = document.querySelector('.messaging-interface');
    if (!messagingInterface) return;

    messagingInterface.innerHTML = '<p class="loading-message">Loading conversations...</p>';

    try {
      // Load conversations
      await this.loadConversations();
      
      // Initialize Socket.IO if not already connected
      if (!this.socket || !this.socket.connected) {
        this.initializeSocketIO();
      }

    } catch (error) {
      console.error('Error loading messages:', error);
      messagingInterface.innerHTML = '<p class="error-message">Error loading messages. Please try again.</p>';
    }
  }

  // Load conversations from API
  async loadConversations() {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Conversations API response:', data);
      this.conversations = data.conversations || [];
      
      this.renderMessagingInterface();
      
      // Load unread count
      await this.loadUnreadCount();
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }
  }

  // Render the messaging interface
  renderMessagingInterface() {
    const messagingInterface = document.querySelector('.messaging-interface');
    if (!messagingInterface) return;

    messagingInterface.innerHTML = `
      <div class="messaging-container">
        <div class="conversations-sidebar">
          <div class="conversations-header">
            <h3>Messages</h3>
            <div class="connection-status offline">Offline</div>
            <button class="btn-secondary btn-new-message" data-action="start-new-conversation">New Message</button>
          </div>
          <div class="conversations-list" id="conversations-list">
            ${this.renderConversationsList()}
          </div>
        </div>
        <div class="conversation-view">
          <div class="conversation-header" id="conversation-header">
            <div class="conversation-info">
              <span class="conversation-title">Select a conversation</span>
              <span class="conversation-status"></span>
            </div>
          </div>
          <div class="messages-thread" id="messages-thread">
            <div class="no-conversation-selected">
              <h4>No conversation selected</h4>
              <p>Choose a conversation from the sidebar to start messaging.</p>
            </div>
          </div>
          <div class="typing-indicators" id="typing-indicators"></div>
          <div class="message-composer" id="message-composer" style="display: none;">
            <div class="attachment-preview" id="attachment-preview"></div>
            <div class="composer-toolbar">
              <input type="file" id="message-attachment" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar" style="display: none;">
              <button class="btn-attachment" data-action="click-message-attachment" title="Attach files">📎</button>
            </div>
            <div class="composer-input">
              <textarea id="message-input" placeholder="Type your message..." rows="3"></textarea>
              <button class="btn-send" id="send-button" data-action="send-message">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupMessageComposer();
  }

  // Render conversations list
  renderConversationsList() {
    if (!this.conversations || this.conversations.length === 0) {
      return '<div class="no-conversations"><p>No conversations yet</p></div>';
    }

    return this.conversations.map(conversation => {
      const lastMessageTime = this.formatMessageTime(conversation.last_message_at);
      const isOnline = this.onlineUsers.has(conversation.id);
      const unreadBadge = conversation.unread_count > 0 ? 
        `<span class="unread-badge">${conversation.unread_count}</span>` : '';
      
      return `
        <div class="conversation-item ${this.currentConversation?.id === conversation.id ? 'active' : ''}" 
             data-action="select-conversation" data-conversation-id="${conversation.id}">
          <div class="conversation-avatar">
            <div class="avatar-circle">
              ${conversation.first_name?.charAt(0) || conversation.email.charAt(0)}
            </div>
            <div class="presence-indicator ${isOnline ? 'online' : 'offline'}"></div>
          </div>
          <div class="conversation-details">
            <div class="conversation-name">
              ${conversation.first_name ? `${conversation.first_name} ${conversation.last_name}` : conversation.email}
              ${unreadBadge}
            </div>
            <div class="conversation-last-message">
              ${conversation.last_message ? this.truncateMessage(conversation.last_message, 50) : 'No messages yet'}
            </div>
            <div class="conversation-time">${lastMessageTime}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup message composer functionality
  setupMessageComposer() {
    const messageInput = document.getElementById('message-input');
    const attachmentInput = document.getElementById('message-attachment');
    
    if (messageInput) {
      let typingTimer;
      
      messageInput.addEventListener('input', () => {
        // Send typing indicator
        if (this.currentConversation && this.socket) {
          this.socket.emit('typing_start', {
            conversationUserId: this.currentConversation.id
          });
          
          // Clear previous timer
          clearTimeout(typingTimer);
          
          // Stop typing after 3 seconds of inactivity
          typingTimer = setTimeout(() => {
            this.socket.emit('typing_stop', {
              conversationUserId: this.currentConversation.id
            });
          }, 3000);
        }
      });
      
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    
    if (attachmentInput) {
      attachmentInput.addEventListener('change', (e) => {
        this.handleAttachmentSelection(e.target.files);
      });
    }
  }

  // Select a conversation
  async selectConversation(conversationId) {
    try {
      // Find conversation in list
      const conversation = this.conversations.find(c => c.id == conversationId);
      if (!conversation) return;
      
      this.currentConversation = conversation;
      
      // Update UI
      this.updateConversationSelection();
      
      // Join conversation room for real-time updates
      if (this.socket) {
        this.socket.emit('join_conversation', {
          conversationUserId: conversationId
        });
      }
      
      // Load conversation messages
      await this.loadConversationMessages(conversationId);
      
      // Mark messages as read
      if (this.socket) {
        this.socket.emit('mark_messages_read', {
          conversationUserId: conversationId
        });
      }
      
    } catch (error) {
      console.error('Error selecting conversation:', error);
      this.showMessage('Error loading conversation', 'error');
    }
  }

  // Load messages for a specific conversation
  async loadConversationMessages(conversationId) {
    try {
      const response = await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.renderMessagesThread(data.messages || []);
      
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      document.getElementById('messages-thread').innerHTML = 
        '<div class="error-message">Error loading messages. Please try again.</div>';
    }
  }

  // Render messages thread
  renderMessagesThread(messages) {
    const messagesThread = document.getElementById('messages-thread');
    if (!messagesThread) return;

    if (messages.length === 0) {
      messagesThread.innerHTML = `
        <div class="no-messages">
          <h4>Start the conversation</h4>
          <p>Send the first message to ${this.currentConversation.first_name || this.currentConversation.email}.</p>
        </div>
      `;
      return;
    }

    const messagesHTML = messages.map(message => this.renderMessage(message)).join('');
    messagesThread.innerHTML = messagesHTML;
    
    // Scroll to bottom
    messagesThread.scrollTop = messagesThread.scrollHeight;
    
    // Show composer
    document.getElementById('message-composer').style.display = 'block';
  }

  // Render a single message
  renderMessage(message, isFromCurrentUser = null) {
    if (isFromCurrentUser === null) {
      isFromCurrentUser = message.sender_id === this.currentUser.id;
    }
    
    const messageTime = this.formatMessageTime(message.created_at);
    const attachments = message.attachments ? JSON.parse(message.attachments) : [];
    
    return `
      <div class="message ${isFromCurrentUser ? 'sent' : 'received'}" data-message-id="${message.id}">
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">
              ${isFromCurrentUser ? 'You' : `${message.sender_first_name} ${message.sender_last_name}`}
            </span>
            <span class="message-time">${messageTime}</span>
            ${isFromCurrentUser ? '<span class="read-indicator">✓</span>' : ''}
          </div>
          <div class="message-body">
            ${message.subject ? `<div class="message-subject">${message.subject}</div>` : ''}
            <div class="message-text">${this.formatMessageContent(message.content)}</div>
            ${attachments.length > 0 ? this.renderAttachments(attachments) : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Render message attachments
  renderAttachments(attachments) {
    return `
      <div class="message-attachments">
        ${attachments.map(attachment => `
          <div class="attachment-item">
            <div class="attachment-icon">${this.getFileIcon(attachment.filename || 'unknown', attachment.mimetype || '')}</div>
            <div class="attachment-info">
              <span class="attachment-name">${attachment.filename}</span>
              <span class="attachment-size">${this.formatFileSize(attachment.size)}</span>
            </div>
            <a href="/api/messages/attachment/${this.currentConversation?.id || 0}/${attachment.filename}" 
               class="btn-download" 
               target="_blank" 
               title="Download ${attachment.filename}">
              ⬇️
            </a>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Send a message
  async sendMessage() {
    const messageInput = document.getElementById('message-input');
    const attachmentInput = document.getElementById('message-attachment');
    
    if (!messageInput || !this.currentConversation) return;
    
    const content = messageInput.value.trim();
    const files = attachmentInput ? Array.from(attachmentInput.files) : [];
    
    if (!content && files.length === 0) return;
    
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('recipient_id', this.currentConversation.id);
      formData.append('content', content);
      formData.append('message_type', 'general');
      
      // Add attachments
      files.forEach(file => {
        formData.append('attachments', file);
      });
      
      // Send typing stop event
      if (this.socket) {
        this.socket.emit('typing_stop', {
          conversationUserId: this.currentConversation.id
        });
      }
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Clear inputs
      messageInput.value = '';
      if (attachmentInput) {
        attachmentInput.value = '';
      }
      this.clearAttachmentPreview();
      
      this.showMessage('Message sent!', 'success');
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.showMessage('Failed to send message', 'error');
    }
  }

  // Load invoices content from API
  async loadInvoicesContent() {
    const invoicesList = document.querySelector('.invoices-list');
    if (!invoicesList) return;

    invoicesList.innerHTML = '<p class="loading-message">Loading invoices...</p>';

    try {
      const response = await fetch('/api/invoices', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.invoices = data.invoices || [];
      
      this.renderInvoicesDisplay();

    } catch (error) {
      console.error('Error loading invoices:', error);
      invoicesList.innerHTML = '<p class="error-message">Error loading invoices. Please try again.</p>';
      this.showMessage('Failed to load invoices', 'error');
    }
  }

  // Initialize Stripe
  initializeStripe() {
    try {
      if (typeof Stripe !== 'undefined') {
        // Use the actual Stripe key from environment or fallback to test key
        const stripeKey = window.STRIPE_PUBLISHABLE_KEY || 'pk_test_51RnYWi06obSC9PGyag7u0se8pugxmftIqw3pqBxybRWNsmC6lS2ezvB6esVyJGWdgtQw0abYxClKukMXhazPrPFx001cV9tQ6g';
        this.stripe = Stripe(stripeKey);
        this.stripeElements = this.stripe.elements();
        console.log('Stripe initialized successfully');
      } else {
        console.warn('Stripe.js not loaded - payment features will be limited');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      // Don't let Stripe errors block the portal from loading
      this.stripe = null;
      this.stripeElements = null;
    }
  }

  // Render invoices display with real data
  renderInvoicesDisplay() {
    const invoicesList = document.querySelector('.invoices-list');
    if (!invoicesList) return;

    // Calculate summary stats
    const pendingInvoices = this.invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent');
    const paidInvoices = this.invoices.filter(inv => inv.status === 'paid');
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);

    const invoicesHTML = `
      <div class="invoices-summary">
        <div class="summary-grid">
          <div class="summary-card">
            <h4>$${pendingAmount.toLocaleString()}</h4>
            <p>Pending Amount</p>
          </div>
          <div class="summary-card">
            <h4>$${paidAmount.toLocaleString()}</h4>
            <p>Total Paid</p>
          </div>
          <div class="summary-card">
            <h4>${pendingInvoices.length}</h4>
            <p>Open Invoices</p>
          </div>
        </div>
      </div>
      
      <div class="invoices-table">
        <div class="invoice-row header">
          <span>Invoice #</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        ${this.invoices.map(invoice => this.renderInvoiceRow(invoice)).join('')}
      </div>

      <!-- Payment Modal -->
      <div id="payment-modal" class="payment-modal hidden">
        <div class="payment-modal-content">
          <div class="payment-modal-header">
            <h3>Pay Invoice</h3>
            <button class="modal-close" data-action="close-payment-modal">×</button>
          </div>
          <div class="payment-modal-body">
            <div class="invoice-details" id="payment-invoice-details">
              <!-- Invoice details will be inserted here -->
            </div>
            <div class="payment-form">
              <div class="form-group">
                <label for="card-element">Credit or Debit Card</label>
                <div id="card-element" class="stripe-card-element">
                  <!-- Stripe Elements will create form elements here -->
                </div>
                <div id="card-errors" class="payment-error" role="alert"></div>
              </div>
              <div class="payment-actions">
                <button class="btn-secondary" onclick="window.portalDashboard.closePaymentModal()">Cancel</button>
                <button id="submit-payment" class="btn-primary">
                  <span class="btn-text">Pay Now</span>
                  <span class="btn-loading hidden">Processing...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    invoicesList.innerHTML = invoicesHTML;
  }

  // Render individual invoice row
  renderInvoiceRow(invoice) {
    const formattedDate = this.formatInvoiceDate(invoice.created_at || invoice.issue_date);
    const formattedAmount = invoice.total_amount ? `$${invoice.total_amount.toLocaleString()}` : '$0';
    
    return `
      <div class="invoice-row" data-invoice-id="${invoice.id}">
        <span>#${invoice.invoice_number}</span>
        <span>${formattedDate}</span>
        <span class="amount ${invoice.status}">${formattedAmount}</span>
        <span><span class="status ${invoice.status}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></span>
        <div class="invoice-actions">
          <button class="btn-link" data-action="view-invoice" data-invoice-id="${invoice.id}">View</button>
          <button class="btn-link" data-action="download-invoice-pdf" data-invoice-id="${invoice.id}">PDF</button>
          ${invoice.status === 'pending' || invoice.status === 'sent' ? 
            `<button class="btn-link primary" onclick="stripePayment.openPaymentModal(${JSON.stringify(invoice).replace(/"/g, '&quot;')})">Pay Now</button>` : 
            ''}
        </div>
      </div>
    `;
  }

  // Format invoice date
  formatInvoiceDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Open payment modal with Stripe Elements
  async openPaymentModal(invoiceId) {
    const invoice = this.invoices.find(inv => inv.id == invoiceId);
    if (!invoice) {
      this.showMessage('Invoice not found', 'error');
      return;
    }

    if (!this.stripe || !this.stripeElements) {
      this.showMessage('Payment system not available', 'error');
      return;
    }

    // Show modal
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    // Update invoice details
    const detailsContainer = document.getElementById('payment-invoice-details');
    if (detailsContainer) {
      detailsContainer.innerHTML = `
        <div class="invoice-summary">
          <h4>Invoice #${invoice.invoice_number || invoice.id}</h4>
          <p class="invoice-description">${invoice.description || 'Invoice payment'}</p>
          <div class="payment-amount">
            <span>Amount Due: </span>
            <strong>$${invoice.amount.toLocaleString()}</strong>
          </div>
        </div>
      `;
    }

    // Create Stripe card element if not already created
    if (!this.cardElement) {
      const cardElementContainer = document.getElementById('card-element');
      if (cardElementContainer) {
        this.cardElement = this.stripeElements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#333',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#fa755a',
              iconColor: '#fa755a'
            },
          },
        });

        this.cardElement.mount('#card-element');

        // Listen for realtime validation errors
        this.cardElement.on('change', ({error}) => {
          const displayError = document.getElementById('card-errors');
          if (error) {
            displayError.textContent = error.message;
          } else {
            displayError.textContent = '';
          }
        });
      }
    }

    // Setup payment submission
    const submitButton = document.getElementById('submit-payment');
    if (submitButton) {
      submitButton.onclick = () => this.processPayment(invoice);
    }
  }

  // Close payment modal
  closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Process Stripe payment
  async processPayment(invoice) {
    if (!this.stripe || !this.cardElement) {
      this.showMessage('Payment system not available', 'error');
      return;
    }

    const submitButton = document.getElementById('submit-payment');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoading = submitButton.querySelector('.btn-loading');
    
    // Show loading state
    submitButton.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      // Create payment method
      const {error, paymentMethod} = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.cardElement,
        billing_details: {
          name: this.currentUser.name || this.currentUser.email,
          email: this.currentUser.email,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Submit payment to backend
      const response = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Payment failed');
      }

      if (result.requires_action) {
        // Handle 3D Secure or other authentication
        const {error: confirmError} = await this.stripe.confirmCardPayment(result.payment_intent_secret);
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      // Payment successful
      this.showMessage('Payment processed successfully!', 'success');
      this.closePaymentModal();
      
      // Reload invoices to reflect payment
      await this.loadInvoicesContent();

    } catch (error) {
      console.error('Payment error:', error);
      this.showMessage(`Payment failed: ${error.message}`, 'error');
      
      const errorElement = document.getElementById('card-errors');
      if (errorElement) {
        errorElement.textContent = error.message;
      }
    } finally {
      // Reset button state
      submitButton.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  // Download invoice PDF
  async downloadInvoicePDF(invoiceId) {
    try {
      this.showMessage('Downloading invoice...', 'info');
      
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showMessage('Invoice downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Download error:', error);
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  // View invoice details
  async viewInvoice(invoiceId) {
    const invoice = this.invoices.find(inv => inv.id == invoiceId);
    if (!invoice) {
      this.showMessage('Invoice not found', 'error');
      return;
    }

    // For now, show a simple modal with invoice details
    // In a real app, this would show a detailed invoice view
    this.showMessage(`Viewing invoice #${invoice.invoice_number || invoiceId} - ${invoice.status}`, 'info');
  }

    // Load dashboard data
  async loadDashboardData() {
    try {
      // Load real data from multiple endpoints
      const [projectsData, messagesData, filesData, invoicesData] = await Promise.all([
        this.fetchDashboardProjects(),
        this.fetchDashboardMessages(),
        this.fetchDashboardFiles(),
        this.fetchDashboardInvoices()
      ]);

      // Update stats with real data
      this.updateDashboardStats({
        projects: projectsData,
        messages: messagesData,
        files: filesData,
        invoices: invoicesData
      });

      // Load recent activity
      await this.loadRecentActivity();
      
      // Trigger staggered animations
      setTimeout(() => {
        const statsGrid = document.querySelector('.stats-grid');
        const activityList = document.querySelector('.activity-list');
        
        if (statsGrid) {
          statsGrid.classList.add('animate');
        }
        
        if (activityList) {
          activityList.classList.add('animate');
        }
      }, 300);
      
      // Update dashboard with phase information
      this.updateDashboardPhaseInfo();
      
      // Animate stats counters after elements are visible
      setTimeout(() => {
        this.animateStats();
      }, 800);
      
      // Setup advanced interactions
      this.setupAdvancedInteractions();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use fallback data if loading fails
      this.renderFallbackDashboard();
    }
  }

  // Fetch dashboard projects data
  async fetchDashboardProjects() {
    try {
      // Fetch all non-completed projects (in_progress, planning, review)
      const response = await fetch('/api/projects?status=in_progress', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.projects || [];
      }
    } catch (error) {
      console.error('Error fetching dashboard projects:', error);
    }
    return [];
  }

  // Fetch dashboard messages data
  async fetchDashboardMessages() {
    try {
      const response = await fetch('/api/messages/unread-count', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.unread_count || 0;
      }
    } catch (error) {
      console.error('Error fetching dashboard messages:', error);
    }
    return 0;
  }

  // Fetch dashboard files data
  async fetchDashboardFiles() {
    try {
      const response = await fetch('/api/files?limit=1', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.pagination?.totalFiles || 0;
      }
    } catch (error) {
      console.error('Error fetching dashboard files:', error);
    }
    return 0;
  }

  // Fetch dashboard invoices data
  async fetchDashboardInvoices() {
    try {
      const response = await fetch('/api/invoices?status=pending', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const invoices = data.invoices || [];
        const totalPending = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        return {
          count: invoices.length,
          total: totalPending
        };
      }
    } catch (error) {
      console.error('Error fetching dashboard invoices:', error);
    }
    return { count: 0, total: 0 };
  }

  // Update dashboard stats with real data
  updateDashboardStats(data) {
    const statCards = document.querySelectorAll('.stat-card');
    
    // Update Active Projects (first card)
    if (statCards[0]) {
      const h3 = statCards[0].querySelector('h3');
      if (h3) h3.textContent = data.projects.length;
    }
    
    // Update Files Shared (second card)
    if (statCards[1]) {
      const h3 = statCards[1].querySelector('h3');
      if (h3) h3.textContent = data.files;
    }
    
    // Update New Messages (third card)
    if (statCards[2]) {
      const h3 = statCards[2].querySelector('h3');
      if (h3) h3.textContent = data.messages;
    }
    
    // Update Pending Invoice (fourth card)
    if (statCards[3]) {
      const h3 = statCards[3].querySelector('h3');
      if (h3) h3.textContent = data.invoices.total > 0 ? `$${data.invoices.total.toFixed(2)}` : '$0';
    }
  }

  // Load recent activity
  async loadRecentActivity() {
    try {
      const response = await fetch('/api/activity/recent?limit=5', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const activityList = document.querySelector('.activity-list');
      if (!activityList) return;

      if (response.ok) {
        const data = await response.json();
        const activities = data.activities || [];
        
        if (activities.length > 0) {
          activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
              <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
              <div class="activity-content">
                <p>${activity.description}</p>
                <span class="activity-time">${this.formatRelativeTime(activity.created_at)}</span>
              </div>
            </div>
          `).join('');
        } else {
          // Show default welcome message if no activities
          activityList.innerHTML = `
            <div class="activity-item">
              <div class="activity-icon">👋</div>
              <div class="activity-content">
                <h4>Welcome to [RE]Print Studios Portal</h4>
                <p>Your recent activity will appear here.</p>
                <span class="activity-time">Just now</span>
              </div>
            </div>
          `;
        }
      } else {
        // API not available, show welcome message
        activityList.innerHTML = `
          <div class="activity-item">
            <div class="activity-icon">📊</div>
            <div class="activity-content">
              <h4>Dashboard Loading</h4>
              <p>Your recent activity is being loaded...</p>
              <span class="activity-time">Just now</span>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  // Get activity icon based on type
  getActivityIcon(type) {
    const icons = {
      'file_upload': '📄',
      'message': '💬',
      'project_update': '🔄',
      'invoice': '💰',
      'phase_change': '📈',
      'comment': '💭',
      'approval': '✅',
      'default': '📌'
    };
    return icons[type] || icons.default;
  }

  // Format relative time
  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }
  
  // Update dashboard with phase information
  async updateDashboardPhaseInfo() {
    try {
      // Fetch dashboard phase summary
      const response = await fetch('/api/dashboard/phase-summary', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const phaseSummary = await response.json();
        this.renderDashboardPhaseInfo(phaseSummary);
      } else {
        console.warn('Dashboard phase summary API not available, using fallback');
        this.renderFallbackDashboard();
      }
    } catch (error) {
      console.warn('Dashboard phase summary API error, using fallback:', error.message);
      this.renderFallbackDashboard();
    }
  }

  // Render fallback dashboard when API is not available
  renderFallbackDashboard() {
    console.log('Rendering fallback dashboard content');
    
    // Update activity list with placeholder content
    const activityList = document.querySelector('.activity-list');
    if (activityList) {
      activityList.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">📧</div>
          <div class="activity-content">
            <h4>Welcome to [RE]Print Studios Portal</h4>
            <p>Your dashboard is being set up. Check back soon for project updates.</p>
            <span class="activity-time">Just now</span>
          </div>
        </div>
      `;
    }
    
    // Update stats if they exist
    const statCards = document.querySelectorAll('.stat-card h3');
    statCards.forEach((stat, index) => {
      const fallbackStats = ['0', '0', this.unreadCount || '0', '$0'];
      stat.textContent = fallbackStats[index] || '0';
    });
    
    // Update the message count specifically
    this.updateMessageCountInDashboard();
  }
  
  // Update message count in dashboard
  updateMessageCountInDashboard() {
    // Find the message stat card (third card)
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
      const messageCard = statCards[2];
      const h3 = messageCard.querySelector('h3');
      if (h3) {
        h3.textContent = this.unreadCount || '0';
      }
    }
  }
  
  // Render phase information on dashboard
  renderDashboardPhaseInfo(phaseSummary) {
    // Update stats cards with phase-related information
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid && phaseSummary) {
      // Add phase-specific stats if needed
      const actionRequiredCount = phaseSummary.projects_requiring_action || 0;
      if (actionRequiredCount > 0) {
        const actionCard = document.createElement('div');
        actionCard.className = 'stat-card action-required';
        actionCard.innerHTML = `
          <div class="stat-content">
            <h3>${actionRequiredCount}</h3>
            <p>Actions Required</p>
          </div>
        `;
        statsGrid.appendChild(actionCard);
      }
    }
    
    // Update project cards in dashboard to highlight action-required projects
    const dashboardProjects = document.querySelectorAll('#dashboard .project-card');
    dashboardProjects.forEach(card => {
      const projectId = card.dataset.projectId;
      const projectSummary = phaseSummary.projects?.find(p => p.id == projectId);
      
      if (projectSummary?.requires_client_action) {
        card.classList.add('action-required');
        
        // Add action required badge
        const header = card.querySelector('.project-header');
        if (header && !header.querySelector('.action-badge')) {
          const badge = document.createElement('span');
          badge.className = 'action-badge';
          badge.textContent = 'Action Required';
          header.appendChild(badge);
        }
      }
    });
  }

  // Setup advanced interactions and micro-animations
  setupAdvancedInteractions() {
    // Add hover effects to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.02)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1)';
      });
    });

    // Add subtle interactions to activity items
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach((item) => {
      item.addEventListener('click', () => {
        // Add a subtle flash effect
        item.style.background = 'rgba(51, 51, 51, 0.02)';
        setTimeout(() => {
          item.style.background = 'transparent';
        }, 200);
      });
    });

    // Progress bar animation on hover
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
      const parentCard = bar.closest('.project-card');
      if (parentCard) {
        parentCard.addEventListener('mouseenter', () => {
          bar.style.transform = 'scaleY(1.5)';
          bar.style.transformOrigin = 'left center';
        });
        
        parentCard.addEventListener('mouseleave', () => {
          bar.style.transform = 'scaleY(1)';
        });
      }
    });

    // Add smooth scroll behavior for navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'nav-ripple';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(51, 51, 51, 0.1)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.pointerEvents = 'none';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.marginLeft = '-10px';
        ripple.style.marginTop = '-10px';
        
        link.style.position = 'relative';
        link.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // Animate statistics counters
  animateStats() {
    const statNumbers = document.querySelectorAll('.stat-content h3');
    
    statNumbers.forEach(stat => {
      const target = parseInt(stat.textContent);
      if (!isNaN(target)) {
        this.animateNumber(stat, 0, target, 1500);
      }
    });
  }

  animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      
      if (element.textContent.includes('$')) {
        element.textContent = '$' + Math.floor(current).toLocaleString();
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }

  // Load projects section
  async loadProjects() {
    await this.loadProjectsContent();
  }

  // Load files section
  async loadFiles() {
    const fileManager = document.querySelector('#files .file-manager');
    if (!fileManager) return;

    fileManager.innerHTML = '<p class="loading-message">Loading files...</p>';

    try {
      await this.simulateAPICall();
      
      const filesHTML = `
        <div class="file-browser">
          <div class="file-browser-header">
            <h4>Project Files</h4>
            <div class="file-actions">
              <button class="btn-small" onclick="uploadFile()">Upload File</button>
              <select class="file-filter">
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
                <option value="archives">Archives</option>
              </select>
            </div>
          </div>
          
          <div class="files-grid">
            <div class="file-item">
              <div class="file-icon">📄</div>
              <div class="file-info">
                <h5>Brand Guidelines v2.pdf</h5>
                <p>2.4 MB • 2 days ago</p>
              </div>
              <div class="file-actions">
                <button class="btn-icon" onclick="downloadFile('brand-guidelines.pdf')" title="Download">⬇️</button>
                <button class="btn-icon" onclick="previewFile('brand-guidelines.pdf')" title="Preview">👁️</button>
              </div>
            </div>
            
            <div class="file-item">
              <div class="file-icon">🖼️</div>
              <div class="file-info">
                <h5>Logo Concepts.zip</h5>
                <p>15.2 MB • 5 days ago</p>
              </div>
              <div class="file-actions">
                <button class="btn-icon" onclick="downloadFile('logo-concepts.zip')" title="Download">⬇️</button>
                <button class="btn-icon" onclick="extractFile('logo-concepts.zip')" title="Extract">📦</button>
              </div>
            </div>
            
            <div class="file-item">
              <div class="file-icon">📊</div>
              <div class="file-info">
                <h5>Project Timeline.xlsx</h5>
                <p>890 KB • 1 week ago</p>
              </div>
              <div class="file-actions">
                <button class="btn-icon" onclick="downloadFile('timeline.xlsx')" title="Download">⬇️</button>
                <button class="btn-icon" onclick="openFile('timeline.xlsx')" title="Open">📝</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      fileManager.innerHTML = filesHTML;
      
    } catch (error) {
      fileManager.innerHTML = '<p class="error-message">Error loading files. Please try again.</p>';
    }
  }

  // Load messages section
  async loadMessages() {
    const messagingInterface = document.querySelector('#messages .messaging-interface');
    if (!messagingInterface) return;

    messagingInterface.innerHTML = '<p class="loading-message">Loading messages...</p>';

    try {
      await this.simulateAPICall();
      
      const messagesHTML = `
        <div class="messaging-container">
          <div class="message-thread">
            <div class="message received">
              <div class="message-avatar">KF</div>
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">Kendrick Forrest</span>
                  <span class="message-time">2 hours ago</span>
                </div>
                <p>Hi! I've uploaded the latest logo concepts. Please review and let me know which direction you prefer. I've included 3 different approaches based on our initial discussions.</p>
              </div>
            </div>
            
            <div class="message sent">
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">You</span>
                  <span class="message-time">1 hour ago</span>
                </div>
                <p>Thanks! I really like concept #2. The minimalist approach fits our brand perfectly. Can we explore some color variations for that one?</p>
              </div>
            </div>
            
            <div class="message received">
              <div class="message-avatar">KF</div>
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">Kendrick Forrest</span>
                  <span class="message-time">30 minutes ago</span>
                </div>
                <p>Absolutely! I'll work on some color variations for concept #2. Expect to see them by tomorrow afternoon. Should I focus on any particular color palette?</p>
              </div>
            </div>
          </div>
          
          <div class="message-composer">
            <div class="composer-actions">
              <button class="btn-icon" onclick="attachFile()" title="Attach File">📎</button>
              <button class="btn-icon" onclick="addEmoji()" title="Add Emoji">😊</button>
            </div>
            <textarea placeholder="Type your message..." rows="3"></textarea>
            <button class="btn-send" onclick="sendMessage()">Send</button>
          </div>
        </div>
      `;
      
      messagingInterface.innerHTML = messagesHTML;
      
    } catch (error) {
      messagingInterface.innerHTML = '<p class="error-message">Error loading messages. Please try again.</p>';
    }
  }

  // Load invoices section
  async loadInvoices() {
    const invoicesList = document.querySelector('#invoices .invoices-list');
    if (!invoicesList) return;

    invoicesList.innerHTML = '<p class="loading-message">Loading invoices...</p>';

    try {
      await this.simulateAPICall();
      
      const invoicesHTML = `
        <div class="invoices-container">
          <div class="invoice-summary">
            <div class="summary-card">
              <h4>Outstanding Balance</h4>
              <p class="amount outstanding">$2,450.00</p>
            </div>
            <div class="summary-card">
              <h4>Paid This Month</h4>
              <p class="amount paid">$5,750.00</p>
            </div>
            <div class="summary-card">
              <h4>Total Project Value</h4>
              <p class="amount total">$12,500.00</p>
            </div>
          </div>
          
          <div class="invoices-table">
            <div class="invoice-row header">
              <div>Invoice #</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            
            <div class="invoice-row">
              <div>#1024</div>
              <div>Jan 28, 2025</div>
              <div>$2,450.00</div>
              <div><span class="status pending">Pending</span></div>
              <div class="invoice-actions">
                <button class="btn-small" onclick="viewInvoice(1024)">View</button>
                <button class="btn-small primary" onclick="payInvoice(1024)">Pay Now</button>
              </div>
            </div>
            
            <div class="invoice-row">
              <div>#1023</div>
              <div>Jan 15, 2025</div>
              <div>$3,200.00</div>
              <div><span class="status paid">Paid</span></div>
              <div class="invoice-actions">
                <button class="btn-small" onclick="viewInvoice(1023)">View</button>
                <button class="btn-small secondary" onclick="downloadReceipt(1023)">Receipt</button>
              </div>
            </div>
            
            <div class="invoice-row">
              <div>#1022</div>
              <div>Dec 30, 2024</div>
              <div>$2,550.00</div>
              <div><span class="status paid">Paid</span></div>
              <div class="invoice-actions">
                <button class="btn-small" onclick="viewInvoice(1022)">View</button>
                <button class="btn-small secondary" onclick="downloadReceipt(1022)">Receipt</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      invoicesList.innerHTML = invoicesHTML;
      
    } catch (error) {
      invoicesList.innerHTML = '<p class="error-message">Error loading invoices. Please try again.</p>';
    }
  }

  // Setup real-time updates
  setupRealTimeUpdates() {
    // Simulate real-time updates
    setInterval(() => {
      this.updateNotifications();
    }, 30000); // Check every 30 seconds
  }

  updateNotifications() {
    // Update message count, file notifications, etc.
    // This would connect to a real-time service like Socket.io
  }

  updateRecentActivity() {
    // This would normally fetch from an API
    // For now, it's static in the HTML
  }

  // Utility method for simulating API calls
  simulateAPICall(delay = 1000) {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  // File upload and download methods
  triggerFileUpload() {
    const input = document.getElementById('file-upload-input');
    if (input) {
      input.click();
    }
  }

  setupFileUploadInput() {
    const input = document.getElementById('file-upload-input');
    if (input) {
      input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          this.uploadFiles(files);
        }
      });
    }
  }

  async uploadFiles(files) {
    // Validate files
    const validFiles = this.validateFiles(files);
    if (validFiles.length === 0) {
      this.showMessage('No valid files to upload', 'error');
      return;
    }

    const progressElement = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressElement) {
      progressElement.style.display = 'block';
    }

    let uploadedCount = 0;
    const totalFiles = validFiles.length;

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        if (progressText) {
          progressText.textContent = `Uploading ${file.name} (${uploadedCount + 1}/${totalFiles})`;
        }

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.statusText}`);
        }

        uploadedCount++;
        const progress = (uploadedCount / totalFiles) * 100;
        
        if (progressFill) {
          progressFill.style.width = `${progress}%`;
        }
      }

      this.showMessage(`Successfully uploaded ${uploadedCount} file(s)`, 'success');
      
      // Refresh file list
      await this.loadFilesContent();
      
    } catch (error) {
      console.error('Upload error:', error);
      this.showMessage(`Upload failed: ${error.message}`, 'error');
    } finally {
      // Hide progress
      if (progressElement) {
        setTimeout(() => {
          progressElement.style.display = 'none';
          if (progressFill) progressFill.style.width = '0%';
          if (progressText) progressText.textContent = 'Uploading...';
        }, 1000);
      }
      
      // Reset file input
      const input = document.getElementById('file-upload-input');
      if (input) {
        input.value = '';
      }
    }
  }

  validateFiles(files) {
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Media
      'video/mp4', 'video/mpeg', 'video/quicktime', 'audio/mpeg', 'audio/wav'
    ];

    return files.filter(file => {
      // Check file size
      if (file.size > maxFileSize) {
        this.showMessage(`File "${file.name}" is too large. Maximum size is 50MB.`, 'error');
        return false;
      }

      // Check file type
      if (!allowedTypes.includes(file.type) && file.type !== '') {
        this.showMessage(`File type "${file.type}" is not allowed for "${file.name}".`, 'error');
        return false;
      }

      return true;
    });
  }

  async downloadFile(fileId, fileName) {
    try {
      this.showMessage(`Downloading ${fileName}...`, 'info');
      
      const response = await fetch(`/api/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showMessage(`Downloaded ${fileName}`, 'success');
      
    } catch (error) {
      console.error('Download error:', error);
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  async deleteFile(fileId, fileName) {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      this.showMessage(`Deleted ${fileName}`, 'success');
      
      // Refresh file list
      await this.loadFilesContent();
      
    } catch (error) {
      console.error('Delete error:', error);
      this.showMessage(`Delete failed: ${error.message}`, 'error');
    }
  }

  previewFile(fileId, fileName) {
    // For now, just show a message. In a real app, this would open a preview modal
    this.showMessage(`Preview for ${fileName} - Feature coming soon!`, 'info');
  }

  // Project Management Functions

  // Open project details modal with phase tracking
  async openProjectDetailsModal(projectId) {
    console.log('Opening project details for:', projectId);
    try {
      // Show loading state
      this.showMessage('Loading project details...', 'info');

      // Fetch project details with phase data from API
      const response = await fetch(`/api/projects/${projectId}?include_phases=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const project = data.project || data;
      this.showProjectDetailsModal(project);

    } catch (error) {
      console.error('Error loading project details:', error);
      this.showMessage('Failed to load project details', 'error');
    }
  }

  // Alias method for onclick handlers in HTML
  viewProjectDetails(projectId) {
    return this.openProjectDetailsModal(projectId);
  }

  // Show project details modal
  showProjectDetailsModal(project) {
    // Validate project object
    if (!project || typeof project !== 'object') {
      console.error('Invalid project data:', project);
      this.showMessage('Invalid project data received', 'error');
      return;
    }

    // Remove existing modal if present
    const existingModal = document.getElementById('project-details-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'project-details-modal';
    modal.className = 'modal-overlay';
    
    try {
      modal.innerHTML = this.generateProjectDetailsHTML(project);
    } catch (error) {
      console.error('Error generating project details HTML:', error);
      console.log('Project data:', project);
      this.showMessage('Failed to display project details', 'error');
      return;
    }

    document.body.appendChild(modal);

    // Add event listeners
    this.setupProjectModalEventListeners();

    // Show modal with animation
    setTimeout(() => {
      modal.classList.add('show');
      // Initialize the progress tracker after modal is shown
      this.initializeProjectProgressTracker(project);
    }, 10);
  }

  // Generate project details HTML with phase tracking
  generateProjectDetailsHTML(project) {
    const statusClass = project.status ? project.status.toLowerCase().replace(' ', '-') : 'unknown';
    const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set';
    const endDate = project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set';

    return `
      <div class="modal-content project-details-content">
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="project-title-group">
              <h2>${project.name}</h2>
              <span class="project-status ${statusClass}">${project.status || 'Unknown'}</span>
            </div>
            <div class="modal-header-actions">
              <button class="btn-icon btn-refresh-project" title="Refresh project data">
                <span class="refresh-icon">⟲</span>
              </button>
              <button class="modal-close" onclick="window.portalApp.closeProjectDetailsModal()">&times;</button>
            </div>
          </div>
        </div>
        
        <!-- Phase Tabs Navigation -->
        <div class="project-phase-tabs" id="project-phase-tracker-${project.id}">
          <!-- Progress tracker tabs will be initialized here -->
        </div>
        
        <div class="modal-body">
          <!-- Phase Content Container -->
          <div class="phase-content-container" id="phase-content-${project.id}">
            <!-- Current phase card will be displayed here -->
          </div>
          
          <!-- Project Overview Tab Content -->
          <div class="project-overview-content" id="project-overview-${project.id}" style="display: none;">
            <div class="project-meta-grid">
              <div class="meta-item">
                <label>Start Date:</label>
                <span>${startDate}</span>
              </div>
              <div class="meta-item">
                <label>End Date:</label>
                <span>${endDate}</span>
              </div>
              ${project.budget ? `
                <div class="meta-item">
                  <label>Budget:</label>
                  <span>$${project.budget.toLocaleString()}</span>
                </div>
              ` : ''}
            </div>

            <div class="project-description">
              <h4>Project Description</h4>
              <p>${project.description || 'No description available.'}</p>
            </div>

            <!-- Activity Timeline -->
            <div class="project-timeline-section">
              <div id="project-timeline-${project.id}"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-footer-left">
            <button class="btn-secondary" data-action="close-project-details-modal">Close</button>
          </div>
          <div class="modal-footer-right">
            <button class="btn-outline btn-view-overview" data-action="show-project-overview" data-project-id="${project.id}">
              Project Overview
            </button>
            <button class="btn-primary btn-download-assets" data-action="download-project-assets" data-project-id="${project.id}">
              Download Assets
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Initialize progress tracker in project details modal
  async initializeProjectProgressTracker(project) {
    try {
      const trackerId = `project-phase-tracker-${project.id}`;
      const container = document.getElementById(trackerId);
      const phaseContentContainer = document.getElementById(`phase-content-${project.id}`);
      
      if (!container || !phaseContentContainer) {
        console.error('Required containers not found for project:', project.id);
        return null;
      }
      
      console.log('Initializing enhanced project phase tracker for:', project.id);
      
      // Get project phases data
      const phasesData = await this.fetchProjectPhases(project.id);
      
      // Initialize the progress tracker with phase click handling
      const progressTracker = new this.ProgressTracker({
        container: container,
        authToken: this.authToken,
        interactive: true,
        showActions: true,
        orientation: 'tabs',
        phases: phasesData.phases, // Pass phase data directly with activity counts
        currentPhase: this.getCurrentPhaseIndex(phasesData) || 0,
        onPhaseClick: (phaseKey, phaseIndex) => {
          console.log(`Phase clicked: ${phaseKey} (${phaseIndex})`);
          this.showPhaseContent(project.id, phaseKey, phaseIndex, phasesData);
        },
        onActionComplete: (actionId, isCompleted) => {
          this.handlePhaseActionComplete(project.id, actionId, isCompleted);
        }
      });
      
      // Initialize with project data (skip fetch since we have data)
      await progressTracker.initWithData(project.id, phasesData);
      
      // Store reference on container for WebSocket updates
      container._progressTracker = progressTracker;
      
      // Show the current/first active phase by default
      const activePhaseIndex = this.getCurrentPhaseIndex(phasesData) || 0;
      const activePhase = phasesData.phases[activePhaseIndex];
      if (activePhase) {
        this.showPhaseContent(project.id, activePhase.phase_key, activePhaseIndex, phasesData);
      }
      
      // Initialize project timeline
      this.initializeProjectTimeline(project);
      
      return progressTracker;
      
    } catch (error) {
      console.error('Failed to initialize project progress tracker:', error);
      const container = document.getElementById(`project-phase-tracker-${project.id}`);
      if (container) {
        container.innerHTML = '<p class="error-message">Failed to load project phases</p>';
      }
      return null;
    }
  }

  // Fetch project phases data
  async fetchProjectPhases(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}/phases`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch phases: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching project phases:', error);
      throw error;
    }
  }

  // Get current phase index from phases data
  getCurrentPhaseIndex(phasesData) {
    if (!phasesData || !phasesData.phases) return 0;
    
    const currentPhase = phasesData.phases.find(phase => 
      phase.status === 'in_progress' || phase.status === 'awaiting_approval'
    );
    
    return currentPhase ? currentPhase.order_index : 0;
  }

  // Show phase content in the modal with smooth transitions
  async showPhaseContent(projectId, phaseKey, phaseIndex, phasesData) {
    try {
      const phaseContentContainer = document.getElementById(`phase-content-${projectId}`);
      const overviewContainer = document.getElementById(`project-overview-${projectId}`);
      
      if (!phaseContentContainer) return;
      
      // Add loading state
      this.setPhaseContentLoading(phaseContentContainer, true);
      
      // Hide overview with animation
      if (overviewContainer) {
        overviewContainer.classList.add('hidden');
        setTimeout(() => {
          overviewContainer.style.display = 'none';
        }, 300);
      }
      
      // Show phase content container
      phaseContentContainer.style.display = 'block';
      
      // Get phase data
      const phaseData = phasesData.phases[phaseIndex];
      if (!phaseData) {
        this.setPhaseContentLoading(phaseContentContainer, false);
        phaseContentContainer.innerHTML = '<p class="error-message">Phase data not found</p>';
        return;
      }
      
      // Animate out existing content if present
      const existingLayout = phaseContentContainer.querySelector('.phase-content-layout');
      if (existingLayout) {
        existingLayout.classList.add('phase-switching-out');
        await this.delay(300);
      }
      
      // Create new containers for phase components
      phaseContentContainer.innerHTML = `
        <div class="phase-content-layout phase-switching-in">
          <div class="phase-card-section" id="phase-card-${projectId}-${phaseIndex}"></div>
          <div class="phase-deliverables-section" id="phase-deliverables-${projectId}-${phaseIndex}"></div>
        </div>
      `;
      
      // Get the new layout element
      const newLayout = phaseContentContainer.querySelector('.phase-content-layout');
      
      // Initialize components
      await Promise.all([
        this.initializePhaseCard(projectId, phaseData, phaseIndex),
        this.initializePhaseDeliverables(projectId, phaseData, phaseIndex)
      ]);
      
      // Remove transition classes after animation
      setTimeout(() => {
        if (newLayout) {
          newLayout.classList.remove('phase-switching-in');
        }
        this.setPhaseContentLoading(phaseContentContainer, false);
      }, 400);
      
    } catch (error) {
      console.error('Error showing phase content:', error);
      const container = document.getElementById(`phase-content-${projectId}`);
      if (container) {
        this.setPhaseContentLoading(container, false);
        container.innerHTML = '<p class="error-message">Failed to load phase content</p>';
      }
    }
  }

  // Initialize PhaseCard component
  async initializePhaseCard(projectId, phaseData, phaseIndex) {
    try {
      const container = document.getElementById(`phase-card-${projectId}-${phaseIndex}`);
      if (!container) return;
      
      // Get deliverables for this phase
      const deliverables = await this.fetchPhaseDeliverables(phaseData.id);
      
      const phaseCard = new PhaseCard({
        container: container,
        phase: {
          id: phaseData.id,
          name: phaseData.name,
          description: phaseData.description,
          order: phaseData.order_index + 1,
          status: phaseData.status,
          requires_approval: phaseData.requires_approval,
          approved_by: phaseData.approved_by,
          approved_at: phaseData.approved_at,
          expected_completion: phaseData.expected_completion
        },
        deliverables: deliverables,
        isActive: true,
        onApprove: (phaseId) => this.handlePhaseApproval(phaseId),
        onRequestChanges: (phaseId, feedback) => this.handlePhaseChangeRequest(phaseId, feedback),
        onFileDownload: (fileId) => this.handleFileDownload(fileId),
        commentCount: phaseData.activity_count || 0,
        isAdmin: this.currentUser?.role === 'admin',
        authToken: this.authToken
      });
      
      phaseCard.render();
      
    } catch (error) {
      console.error('Error initializing phase card:', error);
    }
  }

  // Initialize PhaseDeliverables component
  async initializePhaseDeliverables(projectId, phaseData, phaseIndex) {
    try {
      const container = document.getElementById(`phase-deliverables-${projectId}-${phaseIndex}`);
      if (!container) return;
      
      // Get deliverables for this phase
      const deliverables = await this.fetchPhaseDeliverables(phaseData.id);
      
      const phaseDeliverables = new PhaseDeliverables({
        container: container,
        deliverables: deliverables,
        phaseId: phaseData.id,
        phaseName: phaseData.name,
        viewMode: 'grid',
        authToken: this.authToken,
        isAdmin: this.currentUser?.role === 'admin',
        allowUploads: this.currentUser?.role === 'admin',
        onFileDownload: (fileId) => this.handleFileDownload(fileId),
        onFilePreview: (fileId, file) => this.handleFilePreview(fileId, file),
        onFileDelete: (fileId) => this.handleFileDelete(fileId, phaseData.id),
        onFileUpload: (files) => this.handleFileUpload(files, phaseData.id)
      });
      
      phaseDeliverables.render();
      
    } catch (error) {
      console.error('Error initializing phase deliverables:', error);
    }
  }

  // Initialize project timeline
  async initializeProjectTimeline(project) {
    try {
      const container = document.getElementById(`project-timeline-${project.id}`);
      if (!container) return;
      
      // Get project activities
      const activities = await this.fetchProjectActivities(project.id);
      
      const timeline = new PhaseTimeline({
        container: container,
        projectId: project.id,
        activities: activities,
        showFilters: true,
        maxItems: 20,
        autoRefresh: false,
        authToken: this.authToken,
        currentUserId: this.currentUser?.id,
        onActivityClick: (activityId) => {
          console.log('Activity clicked:', activityId);
        }
      });
      
      timeline.render();
      
    } catch (error) {
      console.error('Error initializing project timeline:', error);
    }
  }

  // Show project overview with animation
  showProjectOverview(projectId) {
    const phaseContentContainer = document.getElementById(`phase-content-${projectId}`);
    const overviewContainer = document.getElementById(`project-overview-${projectId}`);
    
    // Animate out phase content
    if (phaseContentContainer) {
      const layout = phaseContentContainer.querySelector('.phase-content-layout');
      if (layout) {
        layout.classList.add('phase-switching-out');
      }
      setTimeout(() => {
        phaseContentContainer.style.display = 'none';
      }, 300);
    }
    
    // Animate in overview
    if (overviewContainer) {
      overviewContainer.style.display = 'block';
      overviewContainer.classList.remove('hidden');
    }
  }

  // Set phase content loading state
  setPhaseContentLoading(container, isLoading) {
    if (isLoading) {
      container.classList.add('loading');
    } else {
      container.classList.remove('loading');
    }
  }

  // Utility delay function for animations
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch phase deliverables
  async fetchPhaseDeliverables(phaseId) {
    try {
      const response = await fetch(`/api/files/phase/${phaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deliverables: ${response.status}`);
      }
      
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error fetching phase deliverables:', error);
      return [];
    }
  }

  // Fetch project activities
  async fetchProjectActivities(projectId) {
    try {
      const response = await fetch(`/api/activities/project/${projectId}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      
      const data = await response.json();
      return data.activities || [];
    } catch (error) {
      console.error('Error fetching project activities:', error);
      return [];
    }
  }

  // Handle phase approval
  async handlePhaseApproval(phaseId) {
    try {
      const response = await fetch(`/api/phases/${phaseId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: '' })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Approval failed');
      }
      
      this.showMessage('Phase approved successfully!', 'success');
      
      // Refresh the modal
      setTimeout(() => {
        this.refreshProjectModal();
      }, 1000);
      
    } catch (error) {
      console.error('Phase approval error:', error);
      this.showMessage(`Failed to approve phase: ${error.message}`, 'error');
    }
  }

  // Handle phase change request
  async handlePhaseChangeRequest(phaseId, feedback) {
    try {
      const response = await fetch(`/api/phases/${phaseId}/request-changes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes_requested: feedback })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Change request failed');
      }
      
      this.showMessage('Change request submitted successfully!', 'success');
      
      // Refresh the modal
      setTimeout(() => {
        this.refreshProjectModal();
      }, 1000);
      
    } catch (error) {
      console.error('Change request error:', error);
      this.showMessage(`Failed to submit change request: ${error.message}`, 'error');
    }
  }

  // Handle file download
  async handleFileDownload(fileId) {
    try {
      const downloadUrl = `/api/files/${fileId}/download`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('File download error:', error);
      this.showMessage('Failed to download file', 'error');
    }
  }

  // Handle file preview
  async handleFilePreview(fileId, file) {
    try {
      // For images, show in a modal
      if (file.type.startsWith('image/')) {
        const previewUrl = `/api/files/${fileId}/preview`;
        this.showImagePreview(file.name, previewUrl);
      } else {
        // For other files, download them
        this.handleFileDownload(fileId);
      }
    } catch (error) {
      console.error('File preview error:', error);
      this.showMessage('Failed to preview file', 'error');
    }
  }

  // Handle file delete
  async handleFileDelete(fileId, phaseId) {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }
      
      this.showMessage('File deleted successfully', 'success');
      
      // Refresh the phase deliverables
      this.refreshPhaseDeliverables(phaseId);
      
    } catch (error) {
      console.error('File delete error:', error);
      this.showMessage(`Failed to delete file: ${error.message}`, 'error');
    }
  }

  // Handle file upload
  async handleFileUpload(files, phaseId) {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('phaseId', phaseId);
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      this.showMessage(`${files.length} files uploaded successfully!`, 'success');
      
      // Refresh the phase deliverables
      this.refreshPhaseDeliverables(phaseId);
      
    } catch (error) {
      console.error('File upload error:', error);
      this.showMessage(`Failed to upload files: ${error.message}`, 'error');
    }
  }

  // Show image preview modal
  showImagePreview(fileName, imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay image-preview-modal';
    modal.innerHTML = `
      <div class="modal-content image-preview-content">
        <div class="modal-header">
          <h3>${fileName}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body image-preview-body">
          <img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; max-height: 80vh; object-fit: contain;" />
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Refresh project modal
  async refreshProjectModal() {
    const modal = document.getElementById('project-details-modal');
    if (!modal) return;
    
    // Get current project ID from modal
    const phaseTracker = modal.querySelector('[id^="project-phase-tracker-"]');
    if (!phaseTracker) return;
    
    const projectId = phaseTracker.id.replace('project-phase-tracker-', '');
    
    try {
      // Fetch fresh project data
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const project = await response.json();
        // Re-initialize the modal
        this.showProjectDetailsModal(project);
      }
    } catch (error) {
      console.error('Error refreshing project modal:', error);
    }
  }

  // Refresh phase deliverables
  async refreshPhaseDeliverables(phaseId) {
    // This would refresh just the deliverables section if needed
    // For now, refresh the whole modal for simplicity
    this.refreshProjectModal();
  }
  
  // Handle phase action completion
  async handlePhaseActionComplete(projectId, actionId, isCompleted) {
    try {
      this.showMessage(isCompleted ? 'Action marked complete!' : 'Action marked incomplete', 'success');
      
      // Refresh project data if all actions in current phase are complete
      // This will be handled by the ProgressTracker component itself
      
      // Optional: Real-time update via WebSocket
      if (this.socket && this.socket.connected) {
        this.socket.emit('phaseActionUpdate', {
          projectId,
          actionId,
          isCompleted,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling phase action completion:', error);
    }
  }
  
  // Setup real-time phase updates via WebSocket
  setupPhaseUpdateListeners() {
    if (this.socket && this.socket.connected) {
      // Listen for phase progression updates
      this.socket.on('phaseUpdate', (data) => {
        this.handlePhaseUpdate(data);
      });
      
      // Listen for client action updates
      this.socket.on('clientActionUpdate', (data) => {
        this.handleClientActionUpdate(data);
      });
      
      // Listen for phase completion
      this.socket.on('phaseComplete', (data) => {
        this.handlePhaseComplete(data);
      });
    }
  }
  
  // Handle real-time phase updates
  handlePhaseUpdate(data) {
    const { projectId, newPhaseIndex, newPhase, message } = data;
    
    // Show notification
    this.showMessage(message || `Project phase updated to: ${newPhase}`, 'info');
    
    // Update project cards in the main view
    const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
    if (projectCard) {
      // Refresh the specific project card
      this.refreshProjectCard(projectId);
    }
    
    // Update progress tracker if modal is open for this project
    const tracker = document.querySelector(`#project-phase-tracker-${projectId}`);
    if (tracker && tracker._progressTracker) {
      tracker._progressTracker.updateProgress(newPhaseIndex);
    }
  }
  
  // Handle client action updates
  handleClientActionUpdate(data) {
    const { projectId, actionId, isCompleted, message } = data;
    
    // Show notification
    this.showMessage(message || 'Action status updated', 'info');
    
    // Update UI elements
    const actionElement = document.querySelector(`[data-action-id="${actionId}"]`);
    if (actionElement) {
      actionElement.classList.toggle('completed', isCompleted);
      const checkbox = actionElement.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = isCompleted;
    }
  }
  
  // Handle phase completion
  handlePhaseComplete(data) {
    const { projectId, completedPhase, nextPhase, message } = data;
    
    // Show celebration notification
    this.showMessage(message || `Phase "${completedPhase}" completed! 🎉`, 'success');
    
    // Refresh project data
    this.refreshProjectCard(projectId);
  }
  
  // Refresh a specific project card
  async refreshProjectCard(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}?include_phase_data=true`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const project = await response.json();
        const existingCard = document.querySelector(`[data-project-id="${projectId}"]`);
        
        if (existingCard) {
          const newCardHTML = this.renderProjectCard(project);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newCardHTML;
          const newCard = tempDiv.firstElementChild;
          
          existingCard.parentNode.replaceChild(newCard, existingCard);
        }
      }
    } catch (error) {
      console.error('Error refreshing project card:', error);
    }
  }

  // Generate milestones HTML
  generateMilestonesHTML(milestones) {
    return `
      <div class="project-milestones">
        <h4>Milestones</h4>
        <div class="milestones-list">
          ${milestones.map(milestone => `
            <div class="milestone-item ${milestone.completed ? 'completed' : ''}">
              <div class="milestone-status">
                ${milestone.completed ? '✓' : '○'}
              </div>
              <div class="milestone-content">
                <h5>${milestone.title}</h5>
                <p>${milestone.description || ''}</p>
                ${milestone.due_date ? `<span class="milestone-date">Due: ${new Date(milestone.due_date).toLocaleDateString()}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Generate project files HTML with phase organization
  generateProjectFilesHTML(files, project) {
    // Group files by phase if phase information is available
    const hasPhaseData = project && project.phase_tracking && files.some(file => file.phase);
    
    if (hasPhaseData) {
      // Group files by phase
      const filesByPhase = files.reduce((groups, file) => {
        const phase = file.phase || 'general';
        if (!groups[phase]) groups[phase] = [];
        groups[phase].push(file);
        return groups;
      }, {});
      
      // Get phase names from phase constants (will be loaded dynamically)
      const getPhaseDisplayName = (phaseKey) => {
        // Fallback phase names if PROJECT_PHASES is not available
        const phaseNames = {
          'onboarding': 'Onboarding',
          'ideation': 'Ideation', 
          'design': 'Design',
          'review': 'Review & Feedback',
          'production': 'Production/Print',
          'payment': 'Payment',
          'signoff': 'Sign-off & Docs',
          'delivery': 'Delivery'
        };
        return phaseNames[phaseKey] || phaseKey.charAt(0).toUpperCase() + phaseKey.slice(1);
      };
      
      return `
        <div class="project-files">
          <h4>Project Files</h4>
          <div class="files-by-phase">
            ${Object.entries(filesByPhase).map(([phase, phaseFiles]) => `
              <div class="phase-files-group">
                <h5 class="phase-files-header">
                  <span class="phase-icon">${this.getPhaseIcon(phase)}</span>
                  ${getPhaseDisplayName(phase)} Files
                  <span class="file-count">(${phaseFiles.length})</span>
                </h5>
                <div class="files-list">
                  ${phaseFiles.map(file => `
                    <div class="file-item ${file.is_deliverable ? 'deliverable' : ''}">
                      <div class="file-icon">${this.getFileIcon(file.name || file.original_name || file.filename || 'unknown')}</div>
                      <div class="file-info">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        ${file.is_deliverable ? '<span class="deliverable-badge">Deliverable</span>' : ''}
                        ${file.description ? `<p class="file-description">${file.description}</p>` : ''}
                      </div>
                      <div class="file-actions">
                        <button class="btn-small" data-action="download-project-file" data-file-id="${file.id}" data-file-name="${file.name}">Download</button>
                        ${file.is_deliverable ? `<button class="btn-small btn-primary" data-action="preview-file" data-file-id="${file.id}" data-file-name="${file.name}">Preview</button>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Fallback to original layout if no phase data
      return `
        <div class="project-files">
          <h4>Project Files</h4>
          <div class="files-list">
            ${files.map(file => `
              <div class="file-item">
                <div class="file-icon">${this.getFileIcon(file.name || file.original_name || file.filename || 'unknown')}</div>
                <div class="file-info">
                  <span class="file-name">${file.name}</span>
                  <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
                <div class="file-actions">
                  <button class="btn-small" data-action="download-project-file" data-file-id="${file.id}" data-file-name="${file.name}">Download</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  // Generate project activity HTML
  generateProjectActivityHTML(project) {
    // This would typically come from the API, but for now we'll generate some sample activity
    const activities = project.activities || [
      { date: new Date().toISOString(), type: 'update', message: 'Project progress updated' },
      { date: new Date(Date.now() - 24*60*60*1000).toISOString(), type: 'file', message: 'New files uploaded' }
    ];

    return `
      <div class="project-activity">
        <h4>Recent Activity</h4>
        <div class="activity-list">
          ${activities.map(activity => `
            <div class="activity-item">
              <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
              <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-date">${new Date(activity.date).toLocaleDateString()}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Setup project modal event listeners
  setupProjectModalEventListeners() {
    const modal = document.getElementById('project-details-modal');
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeProjectDetailsModal();
      }
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeProjectDetailsModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Close project details modal
  closeProjectDetailsModal() {
    const modal = document.getElementById('project-details-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  // Download project assets
  async downloadProjectAssets(projectId) {
    try {
      this.showMessage('Preparing download...', 'info');

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-assets.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showMessage('Project assets downloaded successfully!', 'success');

    } catch (error) {
      console.error('Download error:', error);
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  // Download individual project file
  async downloadProjectFile(fileId, fileName) {
    try {
      this.showMessage(`Downloading ${fileName}...`, 'info');

      const response = await fetch(`/api/projects/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.showMessage(`Downloaded ${fileName}`, 'success');

    } catch (error) {
      console.error('Download error:', error);
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  // Upload files to project
  async uploadProjectFiles(projectId, files) {
    try {
      const formData = new FormData();
      
      for (let file of files) {
        formData.append('files', file);
      }

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.showMessage(`Successfully uploaded ${files.length} file(s)`, 'success');
      
      // Refresh project details if modal is open
      const modal = document.getElementById('project-details-modal');
      if (modal) {
        this.openProjectDetailsModal(projectId);
      }

      return result;

    } catch (error) {
      console.error('Upload error:', error);
      this.showMessage(`Upload failed: ${error.message}`, 'error');
    }
  }

  // Update project progress (admin only)
  async updateProjectProgress(projectId, progress) {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ progress })
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      const updatedProject = await response.json();
      this.showMessage('Project progress updated successfully!', 'success');
      
      // Refresh projects list and modal if open
      await this.loadProjectsContent();
      const modal = document.getElementById('project-details-modal');
      if (modal) {
        this.openProjectDetailsModal(projectId);
      }

      return updatedProject;

    } catch (error) {
      console.error('Update error:', error);
      this.showMessage(`Update failed: ${error.message}`, 'error');
    }
  }
  
  // Get phase icon
  getPhaseIcon(phaseKey) {
    const phaseIcons = {
      'onboarding': '📋',
      'ideation': '💡',
      'design': '🎨',
      'review': '👀',
      'production': '🖨️',
      'payment': '💳',
      'signoff': '✍️',
      'delivery': '📦',
      'general': '📁'
    };
    return phaseIcons[phaseKey] || '📁';
  }

  // Helper functions
  getFileIcon(fileName) {
    // Handle undefined or null fileName
    if (!fileName || typeof fileName !== 'string') {
      return '📎'; // Return generic file icon
    }
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      'pdf': '📄',
      'doc': '📄', 'docx': '📄',
      'xls': '📊', 'xlsx': '📊',
      'ppt': '📊', 'pptx': '📊',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
      'mp4': '🎥', 'avi': '🎥', 'mov': '🎥',
      'mp3': '🎵', 'wav': '🎵',
      'zip': '📦', 'rar': '📦',
      'txt': '📝',
      'html': '🌐', 'css': '🎨', 'js': '⚡'
    };
    return iconMap[extension] || '📁';
  }

  getActivityIcon(type) {
    const iconMap = {
      'update': '🔄',
      'file': '📁',
      'comment': '💬',
      'milestone': '🎯',
      'payment': '💳'
    };
    return iconMap[type] || '📌';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  filterFiles(filterType) {
    const fileItems = document.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
      const fileType = item.getAttribute('data-file-type');
      
      if (filterType === 'all' || fileType === filterType) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Drag and drop functionality
  setupDragAndDrop() {
    const dropZone = document.getElementById('file-drop-zone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.uploadFiles(files);
      }
    });
  }

  // Utility functions for file handling
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatFileDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getFileIcon(fileName, mimeType) {
    if (mimeType) {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎥';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
    }
    
    // Handle undefined or null fileName
    if (!fileName || typeof fileName !== 'string') {
      return '📎'; // Return generic file icon
    }
    
    // Fallback to file extension
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt'];
    const spreadsheetExts = ['xls', 'xlsx', 'csv'];
    const archiveExts = ['zip', 'rar', '7z'];
    
    if (imageExts.includes(ext)) return '🖼️';
    if (docExts.includes(ext)) return '📄';
    if (spreadsheetExts.includes(ext)) return '📊';
    if (archiveExts.includes(ext)) return '📦';
    
    return '📎'; // Generic file icon
  }

  getFileType(mimeType) {
    if (!mimeType) return 'other';
    
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document') || 
        mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('powerpoint') ||
        mimeType.includes('text/')) return 'documents';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archives';
    
    return 'other';
  }

  // Show success/error messages
  // Show success/error messages
  showMessage(message, type = 'info') {
    // Create a simple toast notification for the portal
    const toast = document.createElement('div');
    toast.className = `portal-toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      zIndex: '10000',
      padding: '1rem 1.5rem',
      backgroundColor: '#333',
      color: '#fff',
      border: '1px solid rgba(51, 51, 51, 0.3)',
      borderRadius: '0',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '300px',
      fontSize: '0.9rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem'
    });
    
    toast.querySelector('button').style.cssText = `
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
    `;
    
    document.body.appendChild(toast);
    
    // Slide in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Additional messaging methods
  
  // Add message to current thread
  addMessageToThread(message, fromCurrentUser = false) {
    const messagesThread = document.getElementById('messages-thread');
    if (!messagesThread) return;
    
    // Remove "no messages" placeholder if it exists
    const noMessages = messagesThread.querySelector('.no-messages');
    if (noMessages) {
      noMessages.remove();
    }
    
    const messageHTML = this.renderMessage(message, fromCurrentUser);
    messagesThread.insertAdjacentHTML('beforeend', messageHTML);
    
    // Scroll to bottom
    messagesThread.scrollTop = messagesThread.scrollHeight;
  }
  
  // Update conversations list with new message
  updateConversationsList(message) {
    const conversationId = message.sender_id === this.currentUser.id ? 
      message.recipient_id : message.sender_id;
    
    // Find conversation in list
    let conversation = this.conversations.find(c => c.id == conversationId);
    
    if (!conversation) {
      // Create new conversation entry
      conversation = {
        id: conversationId,
        first_name: message.sender_id === this.currentUser.id ? 
          message.recipient_first_name : message.sender_first_name,
        last_name: message.sender_id === this.currentUser.id ? 
          message.recipient_last_name : message.sender_last_name,
        email: message.sender_id === this.currentUser.id ? 
          message.recipient_email : message.sender_email,
        last_message: message.content,
        last_message_at: message.created_at,
        unread_count: message.sender_id === this.currentUser.id ? 0 : 1
      };
      this.conversations.unshift(conversation);
    } else {
      // Update existing conversation
      conversation.last_message = message.content;
      conversation.last_message_at = message.created_at;
      if (message.sender_id !== this.currentUser.id) {
        conversation.unread_count = (conversation.unread_count || 0) + 1;
      }
      
      // Move to top
      this.conversations = this.conversations.filter(c => c.id !== conversationId);
      this.conversations.unshift(conversation);
    }
    
    // Re-render conversations list
    const conversationsList = document.getElementById('conversations-list');
    if (conversationsList) {
      conversationsList.innerHTML = this.renderConversationsList();
    }
  }
  
  // Update conversation selection UI
  updateConversationSelection() {
    // Update sidebar selection
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`[data-conversation-id="${this.currentConversation.id}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }
    
    // Update conversation header
    const conversationHeader = document.getElementById('conversation-header');
    if (conversationHeader && this.currentConversation) {
      const isOnline = this.onlineUsers.has(this.currentConversation.id);
      conversationHeader.innerHTML = `
        <div class="conversation-info">
          <div class="conversation-avatar-small">
            <div class="avatar-circle-small">
              ${this.currentConversation.first_name?.charAt(0) || this.currentConversation.email.charAt(0)}
            </div>
            <div class="presence-indicator-small ${isOnline ? 'online' : 'offline'}"></div>
          </div>
          <div>
            <span class="conversation-title">
              ${this.currentConversation.first_name ? 
                `${this.currentConversation.first_name} ${this.currentConversation.last_name}` : 
                this.currentConversation.email}
            </span>
            <span class="conversation-status">${isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      `;
    }
  }
  
  // Handle attachment selection
  handleAttachmentSelection(files) {
    const preview = document.getElementById('attachment-preview');
    if (!preview) return;
    
    const fileArray = Array.from(files);
    const previewHTML = fileArray.map((file) => {
      const fileIcon = this.getFileIcon(file.name || 'unknown', file.type || '');
      return `
        <div class="attachment-preview-item">
          <div class="attachment-icon">${fileIcon}</div>
          <div class="attachment-details">
            <span class="attachment-name">${file.name}</span>
            <span class="attachment-size">${this.formatFileSize(file.size)}</span>
          </div>
          <button class="btn-remove" onclick="this.parentElement.remove()" title="Remove">×</button>
        </div>
      `;
    }).join('');
    
    preview.innerHTML = previewHTML;
    preview.style.display = fileArray.length > 0 ? 'block' : 'none';
  }
  
  // Clear attachment preview
  clearAttachmentPreview() {
    const preview = document.getElementById('attachment-preview');
    if (preview) {
      preview.innerHTML = '';
      preview.style.display = 'none';
    }
  }
  
  // Download attachment
  async downloadAttachment(messageId, filename) {
    try {
      const response = await fetch(`/api/messages/attachment/${messageId}/${filename}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }
  
  // Mark message as read
  async markMessageAsRead(messageId) {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }
  
  // Load unread count
  async loadUnreadCount() {
    try {
      const response = await fetch('/api/messages/unread-count', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }
  
  // Update unread count display
  updateUnreadCount(count) {
    this.unreadCount = count;
    this.updateMessagesBadge();
    this.updateMessageCountInDashboard();
  }
  
  // Update messages badge in navigation
  updateMessagesBadge() {
    const messagesNav = document.querySelector('a[href="#messages"]');
    if (!messagesNav) return;
    
    let badge = messagesNav.querySelector('.nav-badge');
    
    if (this.unreadCount > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        messagesNav.appendChild(badge);
      }
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -10px;
        background: #ff4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      `;
    } else if (badge) {
      badge.remove();
    }
  }
  
  // Update typing display
  updateTypingDisplay() {
    const typingContainer = document.getElementById('typing-indicators');
    if (!typingContainer) return;
    
    if (this.typingIndicators.size > 0) {
      const typingUsers = Array.from(this.typingIndicators.values());
      const typingText = typingUsers.length === 1 ? 
        `${typingUsers[0]} is typing...` :
        `${typingUsers.join(', ')} are typing...`;
      
      typingContainer.innerHTML = `
        <div class="typing-indicator">
          <span class="typing-text">${typingText}</span>
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      typingContainer.style.display = 'block';
    } else {
      typingContainer.style.display = 'none';
    }
  }
  
  // Update presence indicators
  updatePresenceIndicators() {
    document.querySelectorAll('.presence-indicator, .presence-indicator-small').forEach(indicator => {
      const conversationItem = indicator.closest('.conversation-item');
      if (conversationItem) {
        const conversationId = conversationItem.getAttribute('data-conversation-id');
        const isOnline = this.onlineUsers.has(conversationId);
        indicator.className = indicator.className.replace(/\b(online|offline)\b/g, isOnline ? 'online' : 'offline');
      }
    });
  }
  
  // Start new conversation
  async startNewConversation() {
    try {
      // Fetch available users to message
      const response = await fetch('/api/users/messageable', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to showing admin contact
        this.createConversationModal([{
          id: 'admin',
          name: '[RE]Print Studios Team',
          email: 'hello@reprintstudios.com',
          role: 'admin'
        }]);
        return;
      }

      const data = await response.json();
      const users = data.users || [];
      
      if (users.length === 0) {
        // Default to admin if no users available
        users.push({
          id: 'admin',
          name: '[RE]Print Studios Team',
          email: 'hello@reprintstudios.com',
          role: 'admin'
        });
      }

      this.createConversationModal(users);
    } catch (error) {
      console.error('Error fetching messageable users:', error);
      // Show admin as fallback
      this.createConversationModal([{
        id: 'admin',
        name: '[RE]Print Studios Team',
        email: 'hello@reprintstudios.com',
        role: 'admin'
      }]);
    }
  }

  // Create conversation selection modal
  createConversationModal(users) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content conversation-modal">
        <div class="modal-header">
          <h3>Start New Conversation</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Select who you'd like to message:</p>
          <div class="user-selection-list">
            ${users.map(user => `
              <div class="user-selection-item" data-user-id="${user.id}" data-user-email="${user.email}">
                <div class="user-avatar">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                <div class="user-info">
                  <h4>${user.name || user.email}</h4>
                  <p>${user.role === 'admin' ? 'Support Team' : 'Client'}</p>
                </div>
                <button class="btn-primary btn-small" data-action="select-conversation-recipient" data-user-id="${user.id}" data-user-name="${user.name || user.email}">
                  Message
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  // Select conversation recipient
  async selectConversationRecipient(userId, userName) {
    // Remove modal
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();

    // Set active conversation
    this.activeConversation = userId;
    
    // Update conversation header
    const header = document.getElementById('conversation-header');
    if (header) {
      header.querySelector('.conversation-title').textContent = userName;
    }

    // Show message composer
    const composer = document.getElementById('message-composer');
    if (composer) {
      composer.style.display = 'flex';
    }

    // Clear messages thread
    const thread = document.getElementById('messages-thread');
    if (thread) {
      thread.innerHTML = '<div class="conversation-start">Start of conversation with ' + userName + '</div>';
    }

    // Focus on message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.focus();
    }
  }
  
  // Format message content (basic HTML escaping and link detection)
  formatMessageContent(content) {
    // Basic HTML escaping
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Convert line breaks
    const withBreaks = escaped.replace(/\n/g, '<br>');
    
    // Simple URL detection and linking
    const withLinks = withBreaks.replace(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
      '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>'
    );
    
    return withLinks;
  }
  
  // Format message time
  formatMessageTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }
  
  // Truncate message for conversation list
  truncateMessage(message, maxLength) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }
  
  // Phase Management Methods
  
  // Handle action toggle from progress tracker
  async handleActionToggle(actionId, isCompleted) {
    try {
      const response = await fetch(`/api/phases/actions/${actionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_completed: isCompleted })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update action status');
      }
      
      const result = await response.json();
      this.showMessage(result.message || 'Action updated', 'success');
      
      // Update the progress tracker if it exists
      const tracker = document.querySelector('.progress-tracker-container')?._progressTracker;
      if (tracker) {
        tracker.markActionComplete(actionId, isCompleted);
      }
      
      // Check if we can auto-advance
      if (result.can_advance) {
        this.showMessage('All required actions complete! You can now advance to the next phase.', 'info');
      }
      
    } catch (error) {
      console.error('Error updating action:', error);
      this.showMessage('Failed to update action status', 'error');
    }
  }
  
  // Request phase advancement
  async requestPhaseAdvance(projectId, nextPhaseIndex) {
    try {
      const confirmAdvance = confirm('Are you ready to advance to the next phase? This action cannot be undone.');
      if (!confirmAdvance) return;
      
      const response = await fetch(`/api/phases/projects/${projectId}/advance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          next_phase_index: nextPhaseIndex,
          notes: 'Client requested phase advancement'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to advance phase');
      }
      
      const result = await response.json();
      
      // Show success message
      this.showMessage(`Successfully advanced to ${result.new_phase.name}! 🎉`, 'success');
      
      // Refresh the project details modal
      this.openProjectDetailsModal(projectId);
      
      // Emit real-time update if connected
      if (this.socket && this.socket.connected) {
        this.socket.emit('phaseAdvanced', {
          projectId,
          newPhase: result.new_phase,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error advancing phase:', error);
      this.showMessage(error.message || 'Failed to advance phase', 'error');
    }
  }
}

// Portal-specific functions
function toggleQuickActions() {
  if (window.portalDashboard) {
    window.portalDashboard.toggleQuickActions();
  }
}

function startNewMessage() {
  // Switch to messages tab and focus on composer
  if (window.portalDashboard) {
    window.portalDashboard.showSection('messages');
    window.portalDashboard.updateActiveNav(document.querySelector('a[href="#messages"]'));
    
    setTimeout(() => {
      window.portalDashboard.startNewConversation();
    }, 500);
    
    window.portalDashboard.toggleQuickActions();
  }
}

// File upload functionality moved to class methods
function uploadFile() {
  if (window.portalDashboard) {
    window.portalDashboard.showSection('files');
    window.portalDashboard.triggerFileUpload();
    window.portalDashboard.toggleQuickActions();
  }
}

// Messaging functions - moved to class methods
// sendMessage is now handled by the class

// Initialize portal dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Portal page loaded, initializing dashboard...');
  window.portalDashboard = new ClientPortalDashboard();
  window.portalApp = window.portalDashboard; // Make it accessible as portalApp too
  
  // Ensure global functions are accessible
  window.viewProject = viewProject;
  window.downloadFile = downloadFile;
  window.payInvoice = payInvoice;
  window.viewInvoice = viewInvoice;
  window.previewFile = previewFile;
  window.logout = logout;
  window.toggleQuickActions = toggleQuickActions;
  window.startNewMessage = startNewMessage;
  window.uploadFile = uploadFile;
  window.sendMessage = sendMessage;
  
  // Make dashboard methods globally accessible for onclick handlers
  window.openPaymentModal = (id) => window.portalDashboard?.openPaymentModal(id);
  window.closePaymentModal = () => window.portalDashboard?.closePaymentModal();
  window.downloadInvoicePDF = (id) => window.portalDashboard?.downloadInvoicePDF(id);
  
  // Make the dashboard available as portalApp for inline onclick handlers
  window.portalApp = window.portalDashboard;
  
  // Log function availability for debugging
  console.log('Function availability check:');
  console.log('viewProject:', typeof window.viewProject);
  console.log('downloadFile:', typeof window.downloadFile);
  console.log('payInvoice:', typeof window.payInvoice);
  console.log('viewInvoice:', typeof window.viewInvoice);
  console.log('testFunction:', typeof window.testFunction);
  
  console.log('Portal functions loaded and available globally');
});

// Global functions for onclick handlers
function viewProject(projectId) {
  if (window.portalDashboard) {
    window.portalDashboard.openProjectDetailsModal(projectId);
  } else {
    console.log('Dashboard not ready, opening project:', projectId);
  }
}

function downloadFile(fileId, fileName) {
  if (window.portalDashboard) {
    window.portalDashboard.downloadFile(fileId, fileName);
  } else {
    console.log('Dashboard not ready, downloading:', fileName);
  }
}

// Add sendMessage as a global function for onclick handlers
function sendMessage() {
  if (window.portalDashboard) {
    window.portalDashboard.sendMessage();
  }
}

function payInvoice(invoiceId) {
  if (window.portalDashboard) {
    window.portalDashboard.openPaymentModal(invoiceId);
  } else {
    console.log('Dashboard not ready, paying invoice:', invoiceId);
  }
}

function viewInvoice(invoiceId) {
  if (window.portalDashboard) {
    window.portalDashboard.viewInvoice(invoiceId);
  } else {
    console.log('Dashboard not ready, viewing invoice:', invoiceId);
  }
}

function previewFile(fileId, fileName) {
  if (window.portalDashboard) {
    window.portalDashboard.previewFile(fileId, fileName);
  } else {
    console.log('Dashboard not ready, previewing file:', fileName);
  }
}

// Project Management Global Functions
function closeProjectDetailsModal() {
  if (window.portalApp) {
    window.portalApp.closeProjectDetailsModal();
  }
}

function downloadProjectAssets(projectId) {
  if (window.portalDashboard) {
    window.portalDashboard.downloadProjectAssets(projectId);
  } else {
    console.log('Dashboard not ready, downloading project assets:', projectId);
  }
}

function downloadProjectFile(fileId, fileName) {
  if (window.portalDashboard) {
    window.portalDashboard.downloadProjectFile(fileId, fileName);
  } else {
    console.log('Dashboard not ready, downloading project file:', fileName);
  }
}

// Test function to ensure JavaScript is working
function testFunction() {
  alert('JavaScript is working! Functions are loaded.');
  return true;
}

function logout() {
  if (window.portalDashboard) {
    window.portalDashboard.logout();
  }
}

// Remove duplicate uploadFile function - keeping the one above
