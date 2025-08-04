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
  
  // Monochromatic Color Palette - Bone White Theme
  colors: {
    // Primary bone white system
    bone: '#F9F6F1',           // Primary bone white
    boneLight: '#FCFAF7',      // Lighter bone white for cards/modals
    boneDark: '#F2EDE6',       // Darker bone white for subtle borders
    boneSubtle: '#EDE8E0',     // Subtle contrast elements
    
    // Monochromatic grays
    text: '#2C2C2C',           // Primary text - warm charcoal
    textSecondary: '#4A4A4A',  // Secondary text - medium gray
    textTertiary: '#6A6A6A',   // Tertiary text - light gray
    textMuted: '#8A8A8A',      // Muted text - very light gray
    
    // Subtle borders and dividers
    border: '#E8E3DB',         // Light bone border
    borderLight: '#EFEBE4',    // Lighter bone border
    borderSubtle: '#F4F0EA',   // Very subtle border
    
    // Accent hints (very subtle primary colors)
    accentBlue: '#E8F0FF',     // Subtle blue hint
    accentGreen: '#E8F5ED',    // Subtle green hint
    accentYellow: '#FEF9E8',   // Subtle yellow hint
    accentRed: '#FEE8E8',      // Subtle red hint
    
    // Primary colors (reserved for critical actions only)
    blue: '#0057FF',           // Primary blue for actions
    green: '#27AE60',          // Success green
    yellow: '#F7C600',         // Warning yellow  
    red: '#E63946',            // Error red
    
    // Interactive states
    hover: '#F0EBE3',          // Subtle hover state
    active: '#E8E2D8',         // Subtle active state
    focus: '#0057FF',          // Blue focus outline
    
    // Shadows and overlays
    shadow: 'rgba(44, 44, 44, 0.06)',    // Warm shadow
    overlay: 'rgba(44, 44, 44, 0.15)',   // Modal overlay
    
    // White and black
    white: '#FFFFFF',
    black: '#000000'
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