export default {
  title: 'Pages/Client Portal',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Client portal pages and layouts',
      },
    },
  },
};

// Mock data
const mockProject = {
  id: 1,
  name: 'Brand Identity Redesign',
  status: 'In Progress',
  description: 'Complete brand identity overhaul including logo, color palette, and brand guidelines.',
  start_date: '2025-01-15',
  end_date: '2025-03-01',
  budget: 12500,
  current_phase: 2,
  progress: 35,
};

export const LoginScreen = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="login-container">
      <div class="login-form">
        <div class="login-header">
          <h1>[RE]Print Studios</h1>
          <p>Client Portal</p>
        </div>
        <form>
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="your@email.com" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Enter your password" required>
          </div>
          <button type="submit" class="btn-login">
            <span class="btn-text">Sign In</span>
          </button>
        </form>
        <div class="login-footer">
          <p>Need help? <a href="mailto:hello@reprintstudios.com">Contact Support</a></p>
        </div>
      </div>
    </div>
  `;
  return container;
};

export const DashboardView = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="portal-content">
      <header class="portal-header">
        <div class="portal-nav">
          <div class="logo">
            <h1>[RE]Print Studios <span class="portal-tag">Portal</span></h1>
          </div>
          <nav class="main-nav">
            <a href="#dashboard" class="nav-link active">
              <span>Dashboard</span>
            </a>
            <a href="#projects" class="nav-link">
              <span>Projects</span>
            </a>
            <a href="#files" class="nav-link">
              <span>Files</span>
            </a>
            <a href="#messages" class="nav-link">
              <span>Messages</span>
              <span class="nav-badge">3</span>
            </a>
            <a href="#invoices" class="nav-link">
              <span>Invoices</span>
            </a>
          </nav>
          <div class="user-menu">
            <div class="user-info">
              <div class="user-avatar">JD</div>
              <span class="user-name">John Doe</span>
            </div>
          </div>
        </div>
      </header>
      
      <main class="portal-main">
        <section class="portal-section active">
          <div class="section-header">
            <h2>Dashboard Overview</h2>
            <p>Your projects, updates, and important information at a glance.</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-content">
                <h3>2</h3>
                <p>Active Projects</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <h3>24</h3>
                <p>Files Shared</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <h3>8</h3>
                <p>New Messages</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <h3>$2,450</h3>
                <p>Pending Invoice</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
  return container;
};

export const ProjectModal = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="modal-overlay show">
      <div class="modal-content project-details-content">
        <div class="modal-header">
          <h2>${mockProject.name}</h2>
          <button class="modal-close">&times;</button>
        </div>
        
        <div class="project-phase-tabs">
          <div class="phase-tabs-container">
            <div class="phase-tabs-nav">
              <button class="phase-tab completed clickable">
                <span class="tab-icon">1</span>
                <span class="tab-label">Onboarding</span>
                <span class="tab-check">✓</span>
              </button>
              <button class="phase-tab completed clickable">
                <span class="tab-icon">2</span>
                <span class="tab-label">Ideation</span>
                <span class="tab-check">✓</span>
              </button>
              <button class="phase-tab current active clickable">
                <span class="tab-icon">3</span>
                <span class="tab-label">Design</span>
              </button>
              <button class="phase-tab next clickable">
                <span class="tab-icon">4</span>
                <span class="tab-label">Review</span>
              </button>
              <button class="phase-tab locked" disabled>
                <span class="tab-icon">5</span>
                <span class="tab-label">Production</span>
              </button>
              <button class="phase-tab locked" disabled>
                <span class="tab-icon">6</span>
                <span class="tab-label">Payment</span>
              </button>
              <button class="phase-tab locked" disabled>
                <span class="tab-icon">7</span>
                <span class="tab-label">Sign-off</span>
              </button>
              <button class="phase-tab locked" disabled>
                <span class="tab-icon">8</span>
                <span class="tab-label">Delivery</span>
              </button>
            </div>
            <div class="phase-tabs-content">
              <div class="current-phase-info">
                <div class="phase-header">
                  <div class="phase-title">
                    <span class="phase-icon">3</span>
                    <h4>Design</h4>
                  </div>
                  <div class="phase-progress">
                    <span>1 of 3 tasks complete</span>
                  </div>
                </div>
                <p class="phase-description">Creation of designs and prototypes</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-body">
          <div class="project-overview">
            <div class="project-status-header">
              <span class="project-status in-progress">${mockProject.status}</span>
              <span class="project-progress-text">${mockProject.progress}% Complete</span>
            </div>
            <div class="project-description">
              <h4>Description</h4>
              <p>${mockProject.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  return container;
};

export const MessagingInterface = () => {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="messaging-container" style="max-width: 800px; margin: 20px auto;">
      <div class="message-thread" style="height: 400px; overflow-y: auto; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <div class="message received">
          <div class="message-avatar">KF</div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">Kendrick Forrest</span>
              <span class="message-time">2 hours ago</span>
            </div>
            <p>Hi! I've uploaded the latest logo concepts. Please review and let me know which direction you prefer.</p>
          </div>
        </div>
        
        <div class="message sent">
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">You</span>
              <span class="message-time">1 hour ago</span>
            </div>
            <p>Thanks! I really like concept #2. Can we explore some color variations?</p>
          </div>
        </div>
      </div>
      
      <div class="message-composer" style="margin-top: 20px;">
        <textarea placeholder="Type your message..." rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"></textarea>
        <button class="btn-send" style="margin-top: 10px; background: var(--blue); color: white; border: none; padding: 10px 20px; border-radius: 6px;">Send</button>
      </div>
    </div>
  `;
  return container;
};