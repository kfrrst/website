import { BaseAdminModule } from './BaseAdminModule.js';
import { BRAND } from '../../config/brand.js';

/**
 * Admin Settings Module
 * Handles system configuration, user management, and application settings
 */
export class AdminSettingsModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminSettingsModule');
    this.currentTab = 'general';
    this.settings = {};
    this.users = [];
    this.backups = [];
  }

  async doInit() {
    this.element = document.getElementById('settings');
    if (this.element) {
      // Only load settings if we have a token
      if (this.admin && this.admin.token) {
        await this.loadSettings();
        await this.loadUsers();
      }
      this.setupSettingsInterface();
    }
  }

  /**
   * Load settings data
   */
  async loadSettings() {
    try {
      const response = await this.apiRequest('/settings');
      const data = await response.json();
      this.settings = data.settings || {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showError('Failed to load settings');
    }
  }

  /**
   * Load users data
   */
  async loadUsers() {
    try {
      const response = await this.apiRequest('/users');
      const data = await response.json();
      this.users = data.users || [];
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  /**
   * Setup settings interface
   */
  setupSettingsInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-settings">
        <div class="settings-header">
          <h1>Settings</h1>
          <div class="settings-actions">
            <button class="btn-secondary" onclick="admin.modules.settings.exportSettings()">
              <span class="icon">📥</span>
              Export Settings
            </button>
            <button class="btn-secondary" onclick="admin.modules.settings.createBackup()">
              <span class="icon">💾</span>
              Backup System
            </button>
          </div>
        </div>

        <div class="settings-container">
          <div class="settings-sidebar">
            <nav class="settings-nav">
              <a href="#" class="nav-item ${this.currentTab === 'general' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('general'); return false;">
                <span class="icon">⚙️</span>
                General Settings
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'branding' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('branding'); return false;">
                <span class="icon">🎨</span>
                Branding
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'email' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('email'); return false;">
                <span class="icon">✉️</span>
                Email Configuration
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'users' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('users'); return false;">
                <span class="icon">👥</span>
                User Management
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'security' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('security'); return false;">
                <span class="icon">🔒</span>
                Security
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'integrations' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('integrations'); return false;">
                <span class="icon">🔗</span>
                Integrations
              </a>
              <a href="#" class="nav-item ${this.currentTab === 'backup' ? 'active' : ''}" 
                 onclick="admin.modules.settings.switchTab('backup'); return false;">
                <span class="icon">💾</span>
                Backup & Restore
              </a>
              
              <div class="nav-divider"></div>
              
              <a href="#" class="nav-item" onclick="admin.showEmailTemplates(); return false;">
                <span class="icon">📧</span>
                Email Templates
              </a>
              <a href="#" class="nav-item" onclick="admin.showServiceManager(); return false;">
                <span class="icon">🛠️</span>
                Service Manager
              </a>
            </nav>
          </div>

          <div class="settings-content">
            ${this.renderTabContent()}
          </div>
        </div>
      </div>

      <!-- User Modal -->
      <div id="user-modal" class="modal">
        <div class="modal-overlay" onclick="admin.modules.settings.closeUserModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="user-modal-title">Add User</h2>
            <button class="modal-close" onclick="admin.modules.settings.closeUserModal()">×</button>
          </div>
          <div class="modal-body">
            ${this.renderUserForm()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render tab content based on current tab
   */
  renderTabContent() {
    switch (this.currentTab) {
      case 'general':
        return this.renderGeneralSettings();
      case 'branding':
        return this.renderBrandingSettings();
      case 'email':
        return this.renderEmailSettings();
      case 'users':
        return this.renderUserManagement();
      case 'security':
        return this.renderSecuritySettings();
      case 'integrations':
        return this.renderIntegrations();
      case 'backup':
        return this.renderBackupRestore();
      default:
        return '<p>Select a settings section</p>';
    }
  }

  /**
   * Render general settings
   */
  renderGeneralSettings() {
    return `
      <div class="settings-section">
        <h2>General Settings</h2>
        
        <form id="general-settings-form" onsubmit="event.preventDefault(); admin.modules.settings.saveGeneralSettings();">
          <div class="settings-group">
            <h3>Company Information</h3>
            
            <div class="form-group">
              <label for="company-name">Company Name</label>
              <input type="text" id="company-name" name="company_name" 
                     value="${this.settings.company_name || BRAND.name}" required>
            </div>
            
            <div class="form-group">
              <label for="company-tagline">Tagline</label>
              <input type="text" id="company-tagline" name="company_tagline" 
                     value="${this.settings.company_tagline || BRAND.tagline}">
            </div>
            
            <div class="form-group">
              <label for="company-email">Contact Email</label>
              <input type="email" id="company-email" name="company_email" 
                     value="${this.settings.company_email || BRAND.email}" required>
            </div>
            
            <div class="form-group">
              <label for="company-phone">Phone Number</label>
              <input type="tel" id="company-phone" name="company_phone" 
                     value="${this.settings.company_phone || BRAND.phone}">
            </div>
            
            <div class="form-group">
              <label for="company-address">Address</label>
              <textarea id="company-address" name="company_address" rows="3">${this.settings.company_address || BRAND.location}</textarea>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>System Settings</h3>
            
            <div class="form-group">
              <label for="timezone">Timezone</label>
              <select id="timezone" name="timezone">
                <option value="America/Chicago" ${this.settings.timezone === 'America/Chicago' ? 'selected' : ''}>
                  Central Time (Chicago)
                </option>
                <option value="America/New_York" ${this.settings.timezone === 'America/New_York' ? 'selected' : ''}>
                  Eastern Time (New York)
                </option>
                <option value="America/Los_Angeles" ${this.settings.timezone === 'America/Los_Angeles' ? 'selected' : ''}>
                  Pacific Time (Los Angeles)
                </option>
                <option value="America/Denver" ${this.settings.timezone === 'America/Denver' ? 'selected' : ''}>
                  Mountain Time (Denver)
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="date-format">Date Format</label>
              <select id="date-format" name="date_format">
                <option value="MM/DD/YYYY" ${this.settings.date_format === 'MM/DD/YYYY' ? 'selected' : ''}>
                  MM/DD/YYYY
                </option>
                <option value="DD/MM/YYYY" ${this.settings.date_format === 'DD/MM/YYYY' ? 'selected' : ''}>
                  DD/MM/YYYY
                </option>
                <option value="YYYY-MM-DD" ${this.settings.date_format === 'YYYY-MM-DD' ? 'selected' : ''}>
                  YYYY-MM-DD
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="currency">Currency</label>
              <select id="currency" name="currency">
                <option value="USD" ${this.settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${this.settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="GBP" ${this.settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="maintenance_mode" 
                       ${this.settings.maintenance_mode ? 'checked' : ''}>
                Enable Maintenance Mode
              </label>
              <small>Temporarily disable client access for system maintenance</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save General Settings</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render branding settings
   */
  renderBrandingSettings() {
    return `
      <div class="settings-section">
        <h2>Branding Settings</h2>
        
        <form id="branding-settings-form" onsubmit="event.preventDefault(); admin.modules.settings.saveBrandingSettings();">
          <div class="settings-group">
            <h3>Logo & Images</h3>
            
            <div class="form-group">
              <label>Company Logo</label>
              <div class="logo-upload">
                <div class="current-logo">
                  ${this.settings.logo_url ? 
                    `<img src="${this.settings.logo_url}" alt="Company Logo">` :
                    '<div class="logo-placeholder">No logo uploaded</div>'
                  }
                </div>
                <div class="upload-controls">
                  <input type="file" id="logo-upload" accept="image/*" hidden>
                  <button type="button" class="btn-secondary" onclick="document.getElementById('logo-upload').click()">
                    Upload New Logo
                  </button>
                  <small>Recommended: 300x100px, PNG or SVG</small>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Favicon</label>
              <div class="favicon-upload">
                <div class="current-favicon">
                  ${this.settings.favicon_url ? 
                    `<img src="${this.settings.favicon_url}" alt="Favicon">` :
                    '<div class="favicon-placeholder">No favicon</div>'
                  }
                </div>
                <div class="upload-controls">
                  <input type="file" id="favicon-upload" accept="image/*" hidden>
                  <button type="button" class="btn-secondary" onclick="document.getElementById('favicon-upload').click()">
                    Upload Favicon
                  </button>
                  <small>Required: 32x32px, PNG or ICO</small>
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>Brand Colors</h3>
            
            <div class="color-grid">
              <div class="color-input">
                <label for="primary-color">Primary Color</label>
                <div class="color-picker">
                  <input type="color" id="primary-color" name="primary_color" 
                         value="${this.settings.primary_color || '#0057FF'}">
                  <input type="text" value="${this.settings.primary_color || '#0057FF'}" 
                         oninput="document.getElementById('primary-color').value = this.value">
                </div>
              </div>
              
              <div class="color-input">
                <label for="secondary-color">Secondary Color</label>
                <div class="color-picker">
                  <input type="color" id="secondary-color" name="secondary_color" 
                         value="${this.settings.secondary_color || '#F7C600'}">
                  <input type="text" value="${this.settings.secondary_color || '#F7C600'}" 
                         oninput="document.getElementById('secondary-color').value = this.value">
                </div>
              </div>
              
              <div class="color-input">
                <label for="success-color">Success Color</label>
                <div class="color-picker">
                  <input type="color" id="success-color" name="success_color" 
                         value="${this.settings.success_color || '#27AE60'}">
                  <input type="text" value="${this.settings.success_color || '#27AE60'}" 
                         oninput="document.getElementById('success-color').value = this.value">
                </div>
              </div>
              
              <div class="color-input">
                <label for="error-color">Error Color</label>
                <div class="color-picker">
                  <input type="color" id="error-color" name="error_color" 
                         value="${this.settings.error_color || '#E63946'}">
                  <input type="text" value="${this.settings.error_color || '#E63946'}" 
                         oninput="document.getElementById('error-color').value = this.value">
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>Typography</h3>
            
            <div class="form-group">
              <label for="font-family">Font Family</label>
              <select id="font-family" name="font_family">
                <option value="Montserrat" ${this.settings.font_family === 'Montserrat' ? 'selected' : ''}>
                  Montserrat
                </option>
                <option value="Inter" ${this.settings.font_family === 'Inter' ? 'selected' : ''}>
                  Inter
                </option>
                <option value="Roboto" ${this.settings.font_family === 'Roboto' ? 'selected' : ''}>
                  Roboto
                </option>
                <option value="System" ${this.settings.font_family === 'System' ? 'selected' : ''}>
                  System Default
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Branding Settings</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render email settings
   */
  renderEmailSettings() {
    return `
      <div class="settings-section">
        <h2>Email Configuration</h2>
        
        <form id="email-settings-form" onsubmit="event.preventDefault(); admin.modules.settings.saveEmailSettings();">
          <div class="settings-group">
            <h3>SMTP Settings</h3>
            
            <div class="form-group">
              <label for="smtp-host">SMTP Host</label>
              <input type="text" id="smtp-host" name="smtp_host" 
                     value="${this.settings.smtp_host || ''}" 
                     placeholder="smtp.mailgun.org" required>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="smtp-port">SMTP Port</label>
                <input type="number" id="smtp-port" name="smtp_port" 
                       value="${this.settings.smtp_port || 587}" required>
              </div>
              
              <div class="form-group">
                <label for="smtp-secure">Security</label>
                <select id="smtp-secure" name="smtp_secure">
                  <option value="tls" ${this.settings.smtp_secure === 'tls' ? 'selected' : ''}>TLS</option>
                  <option value="ssl" ${this.settings.smtp_secure === 'ssl' ? 'selected' : ''}>SSL</option>
                  <option value="none" ${this.settings.smtp_secure === 'none' ? 'selected' : ''}>None</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="smtp-user">SMTP Username</label>
              <input type="text" id="smtp-user" name="smtp_user" 
                     value="${this.settings.smtp_user || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="smtp-pass">SMTP Password</label>
              <input type="password" id="smtp-pass" name="smtp_pass" 
                     value="${this.settings.smtp_pass ? '••••••••' : ''}" 
                     placeholder="Enter to update">
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" onclick="admin.modules.settings.testEmailConnection()">
                Test Connection
              </button>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>Email Defaults</h3>
            
            <div class="form-group">
              <label for="from-email">From Email</label>
              <input type="email" id="from-email" name="from_email" 
                     value="${this.settings.from_email || ''}" 
                     placeholder="noreply@reprintstudios.com" required>
            </div>
            
            <div class="form-group">
              <label for="from-name">From Name</label>
              <input type="text" id="from-name" name="from_name" 
                     value="${this.settings.from_name || BRAND.name}" required>
            </div>
            
            <div class="form-group">
              <label for="reply-to">Reply-To Email</label>
              <input type="email" id="reply-to" name="reply_to" 
                     value="${this.settings.reply_to || ''}">
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="email_notifications_enabled" 
                       ${this.settings.email_notifications_enabled !== false ? 'checked' : ''}>
                Enable Email Notifications
              </label>
              <small>Send automatic notifications for project updates</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Email Settings</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render user management
   */
  renderUserManagement() {
    return `
      <div class="settings-section">
        <div class="section-header">
          <h2>User Management</h2>
          <button class="btn-primary" onclick="admin.modules.settings.showUserModal()">
            <span class="icon">➕</span>
            Add User
          </button>
        </div>
        
        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.users.map(user => `
                <tr>
                  <td>
                    <div class="user-info">
                      <div class="user-avatar">${this.getUserInitials(user.name)}</div>
                      <span>${user.name}</span>
                    </div>
                  </td>
                  <td>${user.email}</td>
                  <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                  <td>
                    <span class="status-badge status-${user.active ? 'active' : 'inactive'}">
                      ${user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="action-btn" onclick="admin.modules.settings.editUser('${user.id}')" title="Edit">
                        ✏️
                      </button>
                      <button class="action-btn" onclick="admin.modules.settings.resetPassword('${user.id}')" title="Reset Password">
                        🔑
                      </button>
                      <button class="action-btn danger" onclick="admin.modules.settings.deleteUser('${user.id}')" title="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Render security settings
   */
  renderSecuritySettings() {
    return `
      <div class="settings-section">
        <h2>Security Settings</h2>
        
        <form id="security-settings-form" onsubmit="event.preventDefault(); admin.modules.settings.saveSecuritySettings();">
          <div class="settings-group">
            <h3>Authentication</h3>
            
            <div class="form-group">
              <label for="session-timeout">Session Timeout (minutes)</label>
              <input type="number" id="session-timeout" name="session_timeout" 
                     value="${this.settings.session_timeout || 60}" min="5" max="1440">
              <small>Automatically log out users after this period of inactivity</small>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="two_factor_enabled" 
                       ${this.settings.two_factor_enabled ? 'checked' : ''}>
                Enable Two-Factor Authentication
              </label>
              <small>Require users to verify login with a second factor</small>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="force_password_reset" 
                       ${this.settings.force_password_reset ? 'checked' : ''}>
                Force Password Reset Every 90 Days
              </label>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>Password Policy</h3>
            
            <div class="form-group">
              <label for="min-password-length">Minimum Password Length</label>
              <input type="number" id="min-password-length" name="min_password_length" 
                     value="${this.settings.min_password_length || 8}" min="6" max="32">
            </div>
            
            <div class="form-group">
              <label>Password Requirements</label>
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" name="require_uppercase" 
                         ${this.settings.require_uppercase !== false ? 'checked' : ''}>
                  Require Uppercase Letters
                </label>
                <label>
                  <input type="checkbox" name="require_lowercase" 
                         ${this.settings.require_lowercase !== false ? 'checked' : ''}>
                  Require Lowercase Letters
                </label>
                <label>
                  <input type="checkbox" name="require_numbers" 
                         ${this.settings.require_numbers !== false ? 'checked' : ''}>
                  Require Numbers
                </label>
                <label>
                  <input type="checkbox" name="require_special" 
                         ${this.settings.require_special ? 'checked' : ''}>
                  Require Special Characters
                </label>
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h3>IP Restrictions</h3>
            
            <div class="form-group">
              <label for="allowed-ips">Allowed IP Addresses</label>
              <textarea id="allowed-ips" name="allowed_ips" rows="4" 
                        placeholder="Enter one IP address per line (leave empty to allow all)">${this.settings.allowed_ips || ''}</textarea>
              <small>Restrict admin access to specific IP addresses</small>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Security Settings</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render integrations
   */
  renderIntegrations() {
    return `
      <div class="settings-section">
        <h2>Integrations</h2>
        
        <div class="integrations-grid">
          <div class="integration-card ${this.settings.stripe_enabled ? 'enabled' : ''}">
            <div class="integration-header">
              <h3>Stripe</h3>
              <span class="status-badge ${this.settings.stripe_enabled ? 'status-active' : 'status-inactive'}">
                ${this.settings.stripe_enabled ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            
            <p>Accept payments and manage invoices</p>
            
            <div class="integration-form">
              <div class="form-group">
                <label for="stripe-key">Publishable Key</label>
                <input type="text" id="stripe-key" name="stripe_publishable_key" 
                       value="${this.settings.stripe_publishable_key || ''}" 
                       placeholder="pk_live_...">
              </div>
              
              <div class="form-group">
                <label for="stripe-secret">Secret Key</label>
                <input type="password" id="stripe-secret" name="stripe_secret_key" 
                       value="${this.settings.stripe_secret_key ? '••••••••' : ''}" 
                       placeholder="sk_live_...">
              </div>
              
              <button class="btn-secondary" onclick="admin.modules.settings.testStripeConnection()">
                Test Connection
              </button>
            </div>
          </div>
          
          <div class="integration-card ${this.settings.google_enabled ? 'enabled' : ''}">
            <div class="integration-header">
              <h3>Google Workspace</h3>
              <span class="status-badge ${this.settings.google_enabled ? 'status-active' : 'status-inactive'}">
                ${this.settings.google_enabled ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            
            <p>Sync calendars and documents</p>
            
            <div class="integration-actions">
              <button class="btn-secondary" onclick="admin.modules.settings.connectGoogle()">
                ${this.settings.google_enabled ? 'Reconnect' : 'Connect'} Google
              </button>
            </div>
          </div>
          
          <div class="integration-card ${this.settings.slack_enabled ? 'enabled' : ''}">
            <div class="integration-header">
              <h3>Slack</h3>
              <span class="status-badge ${this.settings.slack_enabled ? 'status-active' : 'status-inactive'}">
                ${this.settings.slack_enabled ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            
            <p>Send notifications to Slack channels</p>
            
            <div class="integration-form">
              <div class="form-group">
                <label for="slack-webhook">Webhook URL</label>
                <input type="text" id="slack-webhook" name="slack_webhook_url" 
                       value="${this.settings.slack_webhook_url || ''}" 
                       placeholder="https://hooks.slack.com/services/...">
              </div>
              
              <button class="btn-secondary" onclick="admin.modules.settings.testSlackConnection()">
                Test Connection
              </button>
            </div>
          </div>
          
          <div class="integration-card">
            <div class="integration-header">
              <h3>Zapier</h3>
              <span class="status-badge status-inactive">Coming Soon</span>
            </div>
            
            <p>Connect to 3000+ apps</p>
            
            <div class="integration-actions">
              <button class="btn-secondary" disabled>
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render backup and restore
   */
  renderBackupRestore() {
    return `
      <div class="settings-section">
        <h2>Backup & Restore</h2>
        
        <div class="backup-section">
          <h3>Automatic Backups</h3>
          
          <form id="backup-settings-form" onsubmit="event.preventDefault(); admin.modules.settings.saveBackupSettings();">
            <div class="form-group">
              <label>
                <input type="checkbox" name="auto_backup_enabled" 
                       ${this.settings.auto_backup_enabled ? 'checked' : ''}>
                Enable Automatic Backups
              </label>
            </div>
            
            <div class="form-group">
              <label for="backup-frequency">Backup Frequency</label>
              <select id="backup-frequency" name="backup_frequency">
                <option value="daily" ${this.settings.backup_frequency === 'daily' ? 'selected' : ''}>
                  Daily
                </option>
                <option value="weekly" ${this.settings.backup_frequency === 'weekly' ? 'selected' : ''}>
                  Weekly
                </option>
                <option value="monthly" ${this.settings.backup_frequency === 'monthly' ? 'selected' : ''}>
                  Monthly
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="backup-retention">Retention Period (days)</label>
              <input type="number" id="backup-retention" name="backup_retention" 
                     value="${this.settings.backup_retention || 30}" min="7" max="365">
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn-primary">Save Backup Settings</button>
            </div>
          </form>
        </div>
        
        <div class="backup-section">
          <h3>Manual Backup</h3>
          
          <p>Create an immediate backup of your system data.</p>
          
          <div class="backup-options">
            <label>
              <input type="checkbox" name="include_files" checked>
              Include uploaded files
            </label>
            <label>
              <input type="checkbox" name="include_database" checked>
              Include database
            </label>
            <label>
              <input type="checkbox" name="include_settings" checked>
              Include settings
            </label>
          </div>
          
          <button class="btn-primary" onclick="admin.modules.settings.createBackup()">
            Create Backup Now
          </button>
        </div>
        
        <div class="backup-section">
          <h3>Recent Backups</h3>
          
          ${this.renderBackupsList()}
        </div>
        
        <div class="backup-section">
          <h3>Restore from Backup</h3>
          
          <div class="restore-upload">
            <p>Upload a backup file to restore your system.</p>
            
            <input type="file" id="restore-file" accept=".zip,.tar.gz" hidden>
            <button class="btn-secondary" onclick="document.getElementById('restore-file').click()">
              Select Backup File
            </button>
            
            <div class="warning-box">
              <strong>Warning:</strong> Restoring from a backup will overwrite all current data.
              Make sure to create a backup of your current system before proceeding.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render backups list
   */
  renderBackupsList() {
    if (!this.backups || this.backups.length === 0) {
      return '<p class="no-backups">No backups available</p>';
    }

    return `
      <div class="backups-list">
        ${this.backups.map(backup => `
          <div class="backup-item">
            <div class="backup-info">
              <h4>${backup.name}</h4>
              <div class="backup-meta">
                <span>Created: ${this.formatDate(backup.created_at)}</span>
                <span>Size: ${this.formatFileSize(backup.size)}</span>
                <span>Type: ${backup.type}</span>
              </div>
            </div>
            
            <div class="backup-actions">
              <button class="action-btn" onclick="admin.modules.settings.downloadBackup('${backup.id}')" title="Download">
                📥
              </button>
              <button class="action-btn" onclick="admin.modules.settings.restoreBackup('${backup.id}')" title="Restore">
                🔄
              </button>
              <button class="action-btn danger" onclick="admin.modules.settings.deleteBackup('${backup.id}')" title="Delete">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render user form
   */
  renderUserForm() {
    return `
      <form id="user-form" onsubmit="event.preventDefault(); admin.modules.settings.saveUser();">
        <input type="hidden" id="user-id" name="user_id">
        
        <div class="form-group">
          <label for="user-name">Full Name</label>
          <input type="text" id="user-name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="user-email">Email Address</label>
          <input type="email" id="user-email" name="email" required>
        </div>
        
        <div class="form-group">
          <label for="user-role">Role</label>
          <select id="user-role" name="role" required>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
        </div>
        
        <div class="form-group" id="password-group">
          <label for="user-password">Password</label>
          <input type="password" id="user-password" name="password">
          <small>Leave blank to auto-generate and email to user</small>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" name="send_welcome_email" checked>
            Send welcome email with login instructions
          </label>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="admin.modules.settings.closeUserModal()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Save User
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Switch settings tab
   */
  switchTab(tab) {
    this.currentTab = tab;
    this.setupSettingsInterface();
  }

  /**
   * Save general settings
   */
  async saveGeneralSettings() {
    const form = document.getElementById('general-settings-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/settings/general', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess('General settings saved successfully');
        await this.loadSettings();
      } else {
        this.showError('Failed to save general settings');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save general settings');
    }
  }

  /**
   * Save branding settings
   */
  async saveBrandingSettings() {
    const form = document.getElementById('branding-settings-form');
    const formData = new FormData(form);
    
    // Handle logo upload if file selected
    const logoFile = document.getElementById('logo-upload').files[0];
    if (logoFile) {
      const uploadData = new FormData();
      uploadData.append('logo', logoFile);
      
      try {
        const response = await this.apiRequest('/settings/upload-logo', {
          method: 'POST',
          body: uploadData,
          headers: {} // Let browser set Content-Type
        });
        
        if (response.ok) {
          const result = await response.json();
          formData.append('logo_url', result.url);
        }
      } catch (error) {
        console.error('Logo upload failed:', error);
      }
    }
    
    try {
      const response = await this.apiRequest('/settings/branding', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess('Branding settings saved successfully');
        await this.loadSettings();
        
        // Apply new colors immediately
        this.applyBrandColors();
      } else {
        this.showError('Failed to save branding settings');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save branding settings');
    }
  }

  /**
   * Save email settings
   */
  async saveEmailSettings() {
    const form = document.getElementById('email-settings-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/settings/email', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess('Email settings saved successfully');
        await this.loadSettings();
      } else {
        this.showError('Failed to save email settings');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save email settings');
    }
  }

  /**
   * Save security settings
   */
  async saveSecuritySettings() {
    const form = document.getElementById('security-settings-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/settings/security', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess('Security settings saved successfully');
        await this.loadSettings();
      } else {
        this.showError('Failed to save security settings');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save security settings');
    }
  }

  /**
   * Save backup settings
   */
  async saveBackupSettings() {
    const form = document.getElementById('backup-settings-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/settings/backup', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess('Backup settings saved successfully');
        await this.loadSettings();
      } else {
        this.showError('Failed to save backup settings');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save backup settings');
    }
  }

  /**
   * Test email connection
   */
  async testEmailConnection() {
    try {
      const response = await this.apiRequest('/settings/test-email', {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showSuccess('Email connection successful! Test email sent.');
      } else {
        const error = await response.json();
        this.showError(`Email test failed: ${error.message}`);
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      this.showError('Failed to test email connection');
    }
  }

  /**
   * Test Stripe connection
   */
  async testStripeConnection() {
    const publishableKey = document.getElementById('stripe-key').value;
    const secretKey = document.getElementById('stripe-secret').value;
    
    if (!publishableKey || !secretKey) {
      this.showError('Please enter both Stripe keys');
      return;
    }
    
    try {
      const response = await this.apiRequest('/settings/test-stripe', {
        method: 'POST',
        body: JSON.stringify({ publishableKey, secretKey })
      });
      
      if (response.ok) {
        this.showSuccess('Stripe connection successful!');
      } else {
        this.showError('Failed to connect to Stripe');
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      this.showError('Failed to test Stripe connection');
    }
  }

  /**
   * Create backup
   */
  async createBackup() {
    const includeFiles = document.querySelector('input[name="include_files"]')?.checked;
    const includeDatabase = document.querySelector('input[name="include_database"]')?.checked;
    const includeSettings = document.querySelector('input[name="include_settings"]')?.checked;
    
    try {
      this.showInfo('Creating backup... This may take a few minutes.');
      
      const response = await this.apiRequest('/backups', {
        method: 'POST',
        body: JSON.stringify({
          include_files: includeFiles,
          include_database: includeDatabase,
          include_settings: includeSettings
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.showSuccess('Backup created successfully');
        
        // Download backup
        window.location.href = `/api/backups/${result.backup_id}/download`;
        
        // Reload backups list
        await this.loadBackups();
        this.setupSettingsInterface();
      } else {
        this.showError('Failed to create backup');
      }
      
    } catch (error) {
      console.error('Backup failed:', error);
      this.showError('Failed to create backup');
    }
  }

  /**
   * Load backups
   */
  async loadBackups() {
    try {
      const response = await this.apiRequest('/backups');
      const data = await response.json();
      this.backups = data.backups || [];
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  }

  /**
   * Export settings
   */
  async exportSettings() {
    try {
      const response = await this.apiRequest('/settings/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showSuccess('Settings exported successfully');
      } else {
        this.showError('Failed to export settings');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export settings');
    }
  }

  /**
   * Show user modal
   */
  showUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    
    if (userId) {
      title.textContent = 'Edit User';
      const user = this.users.find(u => u.id === userId);
      if (user) {
        form.elements.user_id.value = user.id;
        form.elements.name.value = user.name;
        form.elements.email.value = user.email;
        form.elements.role.value = user.role;
        
        // Hide password field for existing users
        document.getElementById('password-group').style.display = 'none';
      }
    } else {
      title.textContent = 'Add User';
      form.reset();
      document.getElementById('password-group').style.display = 'block';
    }
    
    modal.classList.add('active');
  }

  /**
   * Close user modal
   */
  closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.getElementById('user-form').reset();
  }

  /**
   * Save user
   */
  async saveUser() {
    const form = document.getElementById('user-form');
    const formData = new FormData(form);
    const userId = formData.get('user_id');
    
    try {
      const url = userId ? `/users/${userId}` : '/users';
      const method = userId ? 'PUT' : 'POST';
      
      const response = await this.apiRequest(url, {
        method,
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        this.showSuccess(userId ? 'User updated successfully' : 'User created successfully');
        this.closeUserModal();
        await this.loadUsers();
        this.setupSettingsInterface();
      } else {
        this.showError('Failed to save user');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save user');
    }
  }

  /**
   * Edit user
   */
  editUser(userId) {
    this.showUserModal(userId);
  }

  /**
   * Reset password
   */
  async resetPassword(userId) {
    const confirmed = confirm('Send password reset email to this user?');
    if (!confirmed) return;
    
    try {
      const response = await this.apiRequest(`/users/${userId}/reset-password`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showSuccess('Password reset email sent');
      } else {
        this.showError('Failed to reset password');
      }
      
    } catch (error) {
      console.error('Reset failed:', error);
      this.showError('Failed to reset password');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    const confirmed = confirm('Are you sure you want to delete this user? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      const response = await this.apiRequest(`/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.showSuccess('User deleted successfully');
        await this.loadUsers();
        this.setupSettingsInterface();
      } else {
        this.showError('Failed to delete user');
      }
      
    } catch (error) {
      console.error('Delete failed:', error);
      this.showError('Failed to delete user');
    }
  }

  /**
   * Get user initials
   */
  getUserInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Apply brand colors
   */
  applyBrandColors() {
    const root = document.documentElement;
    
    if (this.settings.primary_color) {
      root.style.setProperty('--primary-color', this.settings.primary_color);
    }
    if (this.settings.secondary_color) {
      root.style.setProperty('--secondary-color', this.settings.secondary_color);
    }
    if (this.settings.success_color) {
      root.style.setProperty('--success-color', this.settings.success_color);
    }
    if (this.settings.error_color) {
      root.style.setProperty('--error-color', this.settings.error_color);
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Refresh settings data
   */
  async refresh() {
    await this.loadSettings();
    await this.loadUsers();
    if (this.currentTab === 'backup') {
      await this.loadBackups();
    }
    this.setupSettingsInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('settings_updated', () => {
      this.refresh();
    });
  }
}