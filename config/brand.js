/**
 * [RE]Print Studios Brand Configuration
 * Centralized brand constants and utilities
 */

// Main brand constants
export const BRAND = {
  // Company Information
  name: '[RE]Print Studios',
  shortName: '[RE]P',
  tagline: 'Empowering Creative Journeys',
  description: 'A vibrant and energetic design studio that caters to aspiring creatives and young adults embarking on their creative journey.',
  location: 'Bloomington, IL',
  
  // Contact Information
  email: 'hello@reprintstudios.com',
  phone: '555-0123', // Update with actual phone
  
  // Social & Web
  website: 'https://reprintstudios.com', // Update with actual domain
  social: {
    instagram: '@reprintstudios',
    twitter: '@reprintstudios',
    linkedin: 'reprint-studios'
  },
  
  // Business Details
  founders: ['Kendrick Forrest', 'Partner Name'], // Update partner name
  established: '2025',
  
  // Services
  services: [
    'Screen Printing',
    'Large Format Printing',
    'Graphic Design',
    'Logo Design',
    'Brand Development',
    'Website Design',
    'SaaS Development',
    'Wood Working',
    'Creative Collaboration',
    'Ideation Services'
  ],
  
  // Brand Values (The [RE] concepts)
  concepts: {
    'RE': 'Reprint',
    'REP': 'Repurpose',
    'REPS': 'Repursue',
    'REPR': 'Reproduce',
    'REPB': 'Republish'
  },
  
  // Color Palette
  colors: {
    // Base colors (existing)
    base: '#F9F6F1',      // Bone white background
    text: '#333333',      // Charcoal text
    textSecondary: '#666666', // Graphite 60%
    
    // Primary accent colors (new)
    blue: '#0057FF',      // Primary actions, links
    yellow: '#F7C600',    // Hover states, highlights
    red: '#E63946',       // Errors, warnings
    green: '#27AE60',     // Success, completed
    
    // Additional shades
    blueHover: '#0045CC',
    yellowHover: '#E6B700',
    redHover: '#D62839',
    greenHover: '#229A4E'
  },
  
  // Typography
  typography: {
    fontFamily: "'Montserrat', sans-serif",
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  // Phase Definitions for 8-step workflow
  phaseDefinitions: [
    {
      key: 'onboarding',
      name: 'Onboarding',
      description: 'Initial kickoff and info gathering',
      clientActions: ['Complete project brief', 'Sign agreements', 'Submit deposit'],
      icon: '📋'
    },
    {
      key: 'ideation',
      name: 'Ideation',
      description: 'Brainstorming & concept development',
      clientActions: [],
      icon: '💡'
    },
    {
      key: 'design',
      name: 'Design',
      description: 'Creation of designs and prototypes',
      clientActions: [],
      icon: '🎨'
    },
    {
      key: 'review',
      name: 'Review & Feedback',
      description: 'Client review and feedback collection',
      clientActions: ['Review deliverables', 'Provide feedback', 'Approve designs'],
      icon: '👀'
    },
    {
      key: 'production',
      name: 'Production/Print',
      description: 'Final production and printing',
      clientActions: [],
      icon: '🖨️'
    },
    {
      key: 'payment',
      name: 'Payment',
      description: 'Final payment collection',
      clientActions: ['Complete final payment'],
      icon: '💳'
    },
    {
      key: 'signoff',
      name: 'Sign-off & Docs',
      description: 'Final approvals and documentation',
      clientActions: ['Sign completion form', 'Acknowledge deliverables'],
      icon: '✍️'
    },
    {
      key: 'delivery',
      name: 'Delivery',
      description: 'Final deliverables and handover',
      clientActions: ['Download files', 'Confirm receipt'],
      icon: '📦'
    }
  ]
};

// Utility functions
export const brandUtils = {
  // Get formatted company name
  getFullName: () => BRAND.name,
  
  // Get short name for compact displays
  getShortName: () => BRAND.shortName,
  
  // Get email signature
  getEmailSignature: () => `
Best regards,
— ${BRAND.name}
${BRAND.tagline}
${BRAND.email} | ${BRAND.website}
  `.trim(),
  
  // Get invoice header
  getInvoiceHeader: () => ({
    company: BRAND.name,
    tagline: BRAND.tagline,
    location: BRAND.location,
    email: BRAND.email
  }),
  
  // Get meta tags for SEO
  getMetaTags: () => ({
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: BRAND.description,
    keywords: BRAND.services.join(', ')
  }),
  
  // Format service list
  formatServices: () => BRAND.services.join(' • '),
  
  // Get color CSS variables
  getCSSVariables: () => {
    return Object.entries(BRAND.colors)
      .map(([key, value]) => `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
      .join('\n  ');
  }
};

// Project phase configuration for the 8-step workflow
export const PROJECT_PHASES = [
  {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'Initial kickoff and info gathering',
    clientActions: ['Complete project brief', 'Sign agreements', 'Submit deposit'],
    icon: '📋'
  },
  {
    id: 'ideation',
    name: 'Ideation',
    description: 'Brainstorming & concept development',
    clientActions: [],
    icon: '💡'
  },
  {
    id: 'design',
    name: 'Design',
    description: 'Creation of designs and prototypes',
    clientActions: [],
    icon: '🎨'
  },
  {
    id: 'review',
    name: 'Review & Feedback',
    description: 'Client review and feedback collection',
    clientActions: ['Review deliverables', 'Provide feedback', 'Approve designs'],
    icon: '👀'
  },
  {
    id: 'production',
    name: 'Production/Print',
    description: 'Final production and printing',
    clientActions: [],
    icon: '🖨️'
  },
  {
    id: 'payment',
    name: 'Payment',
    description: 'Final payment collection',
    clientActions: ['Complete final payment'],
    icon: '💳'
  },
  {
    id: 'signoff',
    name: 'Sign-off & Docs',
    description: 'Final approvals and documentation',
    clientActions: ['Sign completion form', 'Acknowledge deliverables'],
    icon: '✍️'
  },
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Final deliverables and handover',
    clientActions: ['Download files', 'Confirm receipt'],
    icon: '📦'
  }
];

// Export phase utilities
export const phaseUtils = {
  // Get phase by ID
  getPhaseById: (id) => PROJECT_PHASES.find(phase => phase.id === id),
  
  // Get phase by index
  getPhaseByIndex: (index) => PROJECT_PHASES[index],
  
  // Get phase index
  getPhaseIndex: (phaseId) => PROJECT_PHASES.findIndex(phase => phase.id === phaseId),
  
  // Check if phase requires client action
  requiresClientAction: (phaseId) => {
    const phase = phaseUtils.getPhaseById(phaseId);
    return phase && phase.clientActions.length > 0;
  },
  
  // Get next phase
  getNextPhase: (currentPhaseId) => {
    const currentIndex = phaseUtils.getPhaseIndex(currentPhaseId);
    return currentIndex < PROJECT_PHASES.length - 1 ? PROJECT_PHASES[currentIndex + 1] : null;
  },
  
  // Check if phase is complete-able
  isCompleteable: (phaseId) => {
    return ['onboarding', 'review', 'payment', 'signoff', 'delivery'].includes(phaseId);
  }
};

// Default export
export default BRAND;