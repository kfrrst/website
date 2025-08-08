import { BaseModule } from './BaseModule.js';

/**
 * Navigation module for client portal
 * Handles sidebar navigation, breadcrumbs, and section switching
 */
export class NavigationModule extends BaseModule {
  constructor(portal) {
    super(portal, 'NavigationModule');
    this.navigationItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '', href: '#dashboard' },
      { id: 'projects', label: 'Projects', icon: '', href: '#projects' },
      { id: 'files', label: 'Files', icon: '', href: '#files' },
      { id: 'messages', label: 'Messages', icon: '', href: '#messages', badge: 'unreadCount' },
      { id: 'documents', label: 'Documents', icon: '', href: '#documents' },
      { id: 'invoices', label: 'Invoices', icon: '', href: '#invoices' },
      { id: 'profile', label: 'Profile', icon: '', href: '#profile' }
    ];
    this.unreadCount = 0;
  }

  async doInit() {
    this.setupNavigation();
    this.setupMobileNavigation();
    this.setupBreadcrumbs();
    this.setupUserMenu();
  }

  /**
   * Setup main navigation
   */
  setupNavigation() {
    // Find the existing navigation in the header
    const nav = document.querySelector('.main-nav');
    if (!nav) {
      console.warn('Navigation element not found');
      return;
    }

    // Setup navigation event handlers for existing nav links
    this.setupNavigationEvents(nav);
    
    // Also setup logout button
    const logoutBtn = document.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      this.addEventListener(logoutBtn, 'click', (e) => {
        e.preventDefault();
        if (this.portal.modules.auth) {
          this.portal.modules.auth.logout();
        }
      });
    }
  }

  /**
   * Render navigation items
   */
  renderNavigationItems() {
    return this.navigationItems.map(item => {
      const badge = item.badge ? this.getBadgeValue(item.badge) : 0;
      const badgeHtml = badge > 0 ? `<span class="nav-badge">${badge}</span>` : '';
      
      return `
        <a href="${item.href}" class="nav-item" data-section="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          ${badgeHtml}
        </a>
      `;
    }).join('');
  }

  /**
   * Get badge value for navigation items
   */
  getBadgeValue(badgeType) {
    switch (badgeType) {
      case 'unreadCount':
        return this.unreadCount;
      default:
        return 0;
    }
  }

  /**
   * Render user info in navigation footer
   */
  renderUserInfo() {
    const user = this.portal.currentUser;
    if (!user) return '';

    return `
      <div class="user-info">
        <div class="user-avatar">
          <img src="${user.avatar || '/assets/default-avatar.png'}" alt="${user.firstName}">
        </div>
        <div class="user-details">
          <div class="user-name">${user.firstName} ${user.lastName}</div>
          <div class="user-email">${user.email}</div>
        </div>
        <button class="user-menu-toggle" id="user-menu-toggle">
          <span class="menu-dots">⋯</span>
        </button>
      </div>
    `;
  }

  /**
   * Setup navigation event handlers
   */
  setupNavigationEvents(nav) {
    // Handle navigation clicks for existing nav links
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      this.addEventListener(link, 'click', (e) => {
        e.preventDefault();
        
        // Extract section name from href
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const section = href.substring(1);
          if (section) {
            this.portal.showSection(section);
            this.updateActiveItem(link);
          }
        }
      });
    });
  }

  /**
   * Update active navigation item
   */
  updateActiveItem(activeItem) {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to clicked item
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  /**
   * Update active section from external call
   */
  updateActiveSection(sectionName) {
    // Find nav link by href
    const navLink = document.querySelector(`.nav-link[href="#${sectionName}"]`);
    if (navLink) {
      this.updateActiveItem(navLink);
    }
    
    // Update breadcrumbs
    this.updateBreadcrumbs(sectionName);
  }

  /**
   * Setup mobile navigation
   */
  setupMobileNavigation() {
    const mobileToggle = document.getElementById('mobile-nav-toggle');
    const mobileNav = document.getElementById('mobile-navigation');
    
    if (mobileToggle && mobileNav) {
      this.addEventListener(mobileToggle, 'click', () => {
        mobileNav.classList.toggle('open');
        mobileToggle.classList.toggle('active');
        document.body.classList.toggle('nav-open');
      });

      // Close mobile nav when clicking outside
      this.addEventListener(document, 'click', (e) => {
        if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
          mobileNav.classList.remove('open');
          mobileToggle.classList.remove('active');
          document.body.classList.remove('nav-open');
        }
      });
    }
  }

  /**
   * Setup breadcrumbs
   */
  setupBreadcrumbs() {
    this.breadcrumbsContainer = document.getElementById('breadcrumbs');
    if (this.breadcrumbsContainer) {
      this.updateBreadcrumbs('dashboard');
    }
  }

  /**
   * Update breadcrumbs based on current section
   */
  updateBreadcrumbs(sectionName, additionalCrumbs = []) {
    if (!this.breadcrumbsContainer) return;

    const sectionLabel = this.navigationItems.find(item => item.id === sectionName)?.label || sectionName;
    
    const crumbs = [
      { label: 'Home', href: '#dashboard' },
      { label: sectionLabel, href: `#${sectionName}` },
      ...additionalCrumbs
    ];

    this.breadcrumbsContainer.innerHTML = crumbs.map((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      return `
        <span class="breadcrumb-item ${isLast ? 'active' : ''}">
          ${isLast ? crumb.label : `<a href="${crumb.href}">${crumb.label}</a>`}
        </span>
      `;
    }).join('<span class="breadcrumb-separator">›</span>');
  }

  /**
   * Setup user menu
   */
  setupUserMenu() {
    const userMenuToggle = document.getElementById('user-menu-toggle');
    if (!userMenuToggle) return;

    this.addEventListener(userMenuToggle, 'click', (e) => {
      e.stopPropagation();
      this.toggleUserMenu();
    });

    // Close user menu when clicking outside
    this.addEventListener(document, 'click', () => {
      this.closeUserMenu();
    });
  }

  /**
   * Toggle user menu
   */
  toggleUserMenu() {
    let userMenu = document.getElementById('user-menu');
    
    if (!userMenu) {
      userMenu = this.createUserMenu();
    }

    userMenu.classList.toggle('active');
  }

  /**
   * Create user menu
   */
  createUserMenu() {
    const userMenu = document.createElement('div');
    userMenu.id = 'user-menu';
    userMenu.className = 'user-menu';
    
    userMenu.innerHTML = `
      <div class="user-menu-content">
        <div class="user-menu-header">
          <div class="user-info-large">
            <img src="${this.portal.currentUser?.avatar || '/assets/default-avatar.png'}" 
                 alt="${this.portal.currentUser?.firstName}" class="user-avatar-large">
            <div class="user-details-large">
              <div class="user-name-large">${this.portal.currentUser?.firstName} ${this.portal.currentUser?.lastName}</div>
              <div class="user-email-large">${this.portal.currentUser?.email}</div>
            </div>
          </div>
        </div>
        <div class="user-menu-items">
          <a href="#profile" class="user-menu-item" data-section="profile">
            <span class="menu-icon">👤</span>
            <span class="menu-label">Profile Settings</span>
          </a>
          <a href="#notifications" class="user-menu-item" data-section="notifications">
            <span class="menu-icon">🔔</span>
            <span class="menu-label">Notifications</span>
          </a>
          <a href="#help" class="user-menu-item" data-section="help">
            <span class="menu-icon">❓</span>
            <span class="menu-label">Help & Support</span>
          </a>
          <div class="user-menu-divider"></div>
          <button class="user-menu-item logout-btn" id="logout-button">
            <span class="menu-icon">🚪</span>
            <span class="menu-label">Sign Out</span>
          </button>
        </div>
      </div>
    `;

    // Setup menu item event handlers
    const menuItems = userMenu.querySelectorAll('.user-menu-item[data-section]');
    menuItems.forEach(item => {
      this.addEventListener(item, 'click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        if (section) {
          this.portal.showSection(section);
          this.closeUserMenu();
        }
      });
    });

    // Setup logout button
    const logoutBtn = userMenu.querySelector('#logout-button');
    if (logoutBtn) {
      this.addEventListener(logoutBtn, 'click', () => {
        this.portal.modules.auth.logout();
        this.closeUserMenu();
      });
    }

    // Append to navigation
    const nav = document.getElementById('main-navigation');
    if (nav) {
      nav.appendChild(userMenu);
    }

    return userMenu;
  }

  /**
   * Close user menu
   */
  closeUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.classList.remove('active');
    }
  }

  /**
   * Update unread message count
   */
  updateUnreadCount(count) {
    this.unreadCount = count;
    
    // Update badge in navigation
    const messagesNavItem = document.querySelector('[data-section="messages"]');
    if (messagesNavItem) {
      let badge = messagesNavItem.querySelector('.nav-badge');
      
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          messagesNavItem.appendChild(badge);
        }
        badge.textContent = count;
        badge.style.display = 'inline';
      } else if (badge) {
        badge.style.display = 'none';
      }
    }
  }

  /**
   * Highlight navigation item (for external notifications)
   */
  highlightNavItem(sectionName, temporary = true) {
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem) {
      navItem.classList.add('highlighted');
      
      if (temporary) {
        setTimeout(() => {
          navItem.classList.remove('highlighted');
        }, 3000);
      }
    }
  }

  /**
   * Add notification dot to navigation item
   */
  addNotificationDot(sectionName) {
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem && !navItem.querySelector('.notification-dot')) {
      const dot = document.createElement('span');
      dot.className = 'notification-dot';
      navItem.appendChild(dot);
    }
  }

  /**
   * Remove notification dot from navigation item
   */
  removeNotificationDot(sectionName) {
    const navItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (navItem) {
      const dot = navItem.querySelector('.notification-dot');
      if (dot) {
        dot.remove();
      }
    }
  }

  /**
   * Get current active section
   */
  getCurrentSection() {
    const activeItem = document.querySelector('.nav-item.active');
    return activeItem ? activeItem.dataset.section : 'dashboard';
  }

  /**
   * Setup keyboard shortcuts for navigation
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      '1': 'dashboard',
      '2': 'projects',
      '3': 'files',
      '4': 'messages',
      '5': 'invoices',
      '6': 'profile'
    };

    this.addEventListener(document, 'keydown', (e) => {
      // Only trigger if Alt/Option key is pressed with number
      if (e.altKey && shortcuts[e.key]) {
        e.preventDefault();
        this.portal.showSection(shortcuts[e.key]);
      }
    });
  }
}