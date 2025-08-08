// Debug script to inject into portal to see what's happening
console.log('=== PORTAL DEBUG STARTED ===');

// Override console.error to capture all errors
const originalError = console.error;
console.error = function(...args) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'background: #fee; color: #c00; padding: 10px; margin: 5px; border: 1px solid #c00;';
  errorDiv.textContent = 'ERROR: ' + args.join(' ');
  document.body.appendChild(errorDiv);
  originalError.apply(console, args);
};

// Wait for portal to be available
setTimeout(() => {
  if (window.portal) {
    console.log('Portal instance found:', window.portal);
    console.log('Modules:', Object.keys(window.portal.modules));
    console.log('Current user:', window.portal.currentUser);
    console.log('Auth token:', window.portal.authToken ? 'Present' : 'Missing');
    
    // Check each module
    Object.entries(window.portal.modules).forEach(([name, module]) => {
      console.log(`Module ${name}:`, {
        initialized: module?.initialized,
        element: module?.element,
        error: module === null ? 'Failed to load' : 'OK'
      });
    });
    
    // Check DOM elements
    console.log('\n=== DOM CHECK ===');
    const sections = ['dashboard', 'projects', 'files', 'messages', 'invoices', 'documents'];
    sections.forEach(section => {
      const el = document.getElementById(section);
      console.log(`Section #${section}:`, el ? 'Found' : 'Missing');
      
      if (el && section === 'projects') {
        const projectsList = el.querySelector('.projects-list');
        console.log(`  .projects-list:`, projectsList ? 'Found' : 'Missing');
        console.log(`  Content:`, projectsList?.innerHTML.substring(0, 100));
      }
    });
    
    // Try to manually initialize a module
    console.log('\n=== MANUAL MODULE TEST ===');
    if (window.portal.modules.projects && !window.portal.modules.projects.initialized) {
      console.log('Attempting manual init of projects module...');
      window.portal.modules.projects.init().then(() => {
        console.log('Manual init successful!');
      }).catch(err => {
        console.log('Manual init failed:', err);
      });
    }
    
  } else {
    console.error('Portal instance not found on window!');
  }
}, 2000);