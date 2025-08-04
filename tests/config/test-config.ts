/**
 * Comprehensive test configuration for [RE]Print Studios E2E tests
 */

export const TestConfig = {
  // Test environment URLs
  urls: {
    base: process.env.TEST_BASE_URL || 'http://127.0.0.1:3000',
    api: process.env.TEST_API_URL || 'http://127.0.0.1:3000/api',
    websocket: process.env.TEST_WS_URL || 'ws://127.0.0.1:3000'
  },

  // Test database configuration
  database: {
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    resetBeforeAll: process.env.CI === 'true', // Reset DB in CI
    cleanupAfterEach: true
  },

  // Test timeouts
  timeouts: {
    navigation: 30000,
    api: 10000,
    websocket: 5000,
    fileUpload: 60000,
    payment: 45000
  },

  // Performance thresholds
  performance: {
    pageLoad: 2000, // 2 seconds
    apiResponse: 500, // 500ms
    firstPaint: 1500, // 1.5 seconds
    largeFileUpload: 30000 // 30 seconds for files > 10MB
  },

  // Accessibility standards
  accessibility: {
    standard: 'WCAG2AA',
    includeNotices: false,
    includePasses: false
  },

  // Test data prefixes
  testData: {
    prefix: 'test_',
    emailDomain: '@test.com',
    cleanupAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // File fixtures
  fixtures: {
    smallImage: 'tests/fixtures/files/small-image.jpg',
    largeImage: 'tests/fixtures/files/large-image.jpg',
    pdfDocument: 'tests/fixtures/files/sample-document.pdf',
    designFile: 'tests/fixtures/files/sample-design.ai',
    invalidFile: 'tests/fixtures/files/malicious.exe'
  },

  // Stripe test configuration
  stripe: {
    publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY,
    cards: {
      valid: '4242424242424242',
      declined: '4000000000000002',
      expired: '4000000000000069',
      insufficient: '4000000000009995'
    }
  },

  // Email testing
  email: {
    captureEmails: true,
    mockSMTP: process.env.CI === 'true',
    testInbox: 'test-inbox@reprintstudios.com'
  },

  // Security testing
  security: {
    testXSS: true,
    testSQLInjection: true,
    testCSRF: true,
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    }
  },

  // Browser configurations
  browsers: {
    headless: process.env.CI === 'true',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    viewport: {
      width: 1280,
      height: 720
    },
    mobile: {
      width: 375,
      height: 667
    }
  },

  // Retry configuration
  retry: {
    times: process.env.CI === 'true' ? 2 : 0,
    backoff: 1000 // 1 second between retries
  },

  // Logging
  logging: {
    screenshots: 'only-on-failure',
    videos: process.env.CI === 'true' ? 'retain-on-failure' : 'off',
    traces: 'on-first-retry',
    verbose: process.env.VERBOSE === 'true'
  },

  // Phase system configuration
  phases: {
    names: [
      'Onboarding',
      'Ideation',
      'Design',
      'Review & Feedback',
      'Production/Print',
      'Payment',
      'Sign-off & Docs',
      'Delivery'
    ],
    requireApproval: [1, 3, 4, 6, 7], // Phases requiring approval to advance
    allowRollback: true,
    notifyOnTransition: true
  },

  // Test user roles
  roles: {
    admin: {
      email: 'test_admin@test.com',
      password: 'AdminTest123!',
      permissions: ['*']
    },
    client: {
      email: 'test_client@test.com',
      password: 'ClientTest123!',
      permissions: ['view_own', 'edit_own', 'upload_files']
    },
    viewer: {
      email: 'test_viewer@test.com',
      password: 'ViewerTest123!',
      permissions: ['view_own']
    }
  },

  // API endpoints to test
  apiEndpoints: [
    // Auth
    { method: 'POST', path: '/auth/login', auth: false },
    { method: 'POST', path: '/auth/logout', auth: true },
    { method: 'POST', path: '/auth/refresh', auth: true },
    { method: 'GET', path: '/auth/verify', auth: true },
    
    // Projects
    { method: 'GET', path: '/projects', auth: true },
    { method: 'POST', path: '/projects', auth: true, role: 'admin' },
    { method: 'GET', path: '/projects/:id', auth: true },
    { method: 'PUT', path: '/projects/:id', auth: true },
    { method: 'DELETE', path: '/projects/:id', auth: true, role: 'admin' },
    
    // Files
    { method: 'POST', path: '/files/upload', auth: true },
    { method: 'GET', path: '/files/:id', auth: true },
    { method: 'DELETE', path: '/files/:id', auth: true },
    
    // Invoices
    { method: 'GET', path: '/invoices', auth: true },
    { method: 'POST', path: '/invoices', auth: true, role: 'admin' },
    { method: 'GET', path: '/invoices/:id', auth: true },
    
    // Messages
    { method: 'GET', path: '/messages', auth: true },
    { method: 'POST', path: '/messages', auth: true },
    { method: 'PUT', path: '/messages/:id/read', auth: true }
  ],

  // WebSocket events to test
  socketEvents: [
    'connect',
    'disconnect',
    'authenticate',
    'message',
    'notification',
    'phase_update',
    'file_upload_progress',
    'project_update',
    'force_logout'
  ]
};

// Helper to get config value with environment override
export function getConfig(path: string): any {
  const keys = path.split('.');
  let value = TestConfig;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) break;
  }
  
  // Check for environment override
  const envKey = `TEST_${path.toUpperCase().replace(/\./g, '_')}`;
  return process.env[envKey] || value;
}