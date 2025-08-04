/**
 * Test constants and configuration for [RE]Print Studios E2E tests
 */

export const TEST_USERS = {
  admin: {
    email: 'kendrick@reprintstudios.com',
    password: 'admin123',
    firstName: 'Kendrick',
    lastName: 'Admin',
    role: 'admin'
  },
  client: {
    email: 'client@example.com',
    password: 'client123',
    firstName: 'John',
    lastName: 'Smith',
    role: 'client',
    company: 'Example Company'
  }
} as const;

export const TEST_URLS = {
  base: 'http://localhost:3000',
  home: '/',
  portal: '/portal.html',
  admin: '/admin.html',
  api: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    projects: '/api/projects',
    files: '/api/files',
    invoices: '/api/invoices',
    messages: '/api/messages',
    users: '/api/users',
    profile: '/api/user/profile'
  }
} as const;

export const TIMEOUTS = {
  short: 2000,
  medium: 5000,
  long: 10000,
  upload: 30000,
  payment: 60000
} as const;

export const TEST_FILES = {
  pdf: {
    name: 'test-document.pdf',
    mimeType: 'application/pdf',
    content: 'Test PDF content for E2E testing'
  },
  image: {
    name: 'test-image.png',
    mimeType: 'image/png',
    content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  },
  largeFile: {
    name: 'large-file.zip',
    mimeType: 'application/zip',
    sizeInMB: 50
  }
} as const;

export const PHASES = [
  { number: 1, name: 'Onboarding', key: 'onboarding' },
  { number: 2, name: 'Ideation', key: 'ideation' },
  { number: 3, name: 'Design', key: 'design' },
  { number: 4, name: 'Review & Feedback', key: 'review' },
  { number: 5, name: 'Production/Print', key: 'production' },
  { number: 6, name: 'Payment', key: 'payment' },
  { number: 7, name: 'Sign-off & Docs', key: 'signoff' },
  { number: 8, name: 'Delivery', key: 'delivery' }
] as const;

export const STRIPE_TEST_CARDS = {
  success: {
    number: '4242424242424242',
    exp: '12/34',
    cvc: '123',
    zip: '12345'
  },
  decline: {
    number: '4000000000000002',
    exp: '12/34',
    cvc: '123',
    zip: '12345'
  },
  insufficient: {
    number: '4000000000009995',
    exp: '12/34',
    cvc: '123',
    zip: '12345'
  },
  authentication: {
    number: '4000002500003155',
    exp: '12/34',
    cvc: '123',
    zip: '12345'
  }
} as const;

export const EMAIL_TEMPLATES = [
  'phase-approval-needed',
  'phase-approved',
  'phase-changes-requested',
  'phase-completed',
  'project-welcome',
  'project-completed',
  'project-deadline-reminder',
  'project-weekly-summary',
  'invoice-sent',
  'invoice-reminder',
  'invoice-overdue',
  'payment-received',
  'file-uploaded',
  'password-reset',
  'security-alert',
  'account-activated',
  'message-received'
] as const;

export const SECURITY_PAYLOADS = {
  xss: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>'
  ],
  sqlInjection: [
    "' OR '1'='1",
    "1; DROP TABLE users--",
    "' UNION SELECT * FROM users--",
    "admin'--"
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ]
} as const;

export const ACCESSIBILITY_STANDARDS = {
  wcag: '2.1',
  level: 'AA',
  colorContrast: {
    normal: 4.5,
    large: 3
  },
  focusIndicator: {
    minContrast: 3,
    minWidth: 2
  }
} as const;

export const PERFORMANCE_BENCHMARKS = {
  pageLoad: {
    fast: 1000,
    average: 3000,
    slow: 5000
  },
  apiResponse: {
    fast: 200,
    average: 500,
    slow: 1000
  },
  fileUpload: {
    perMB: 500 // milliseconds per MB
  }
} as const;