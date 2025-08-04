import { PhaseCard } from './PhaseCard.js';
import { BRAND } from '../config/brand.js';
import '../styles/phase-card.css';

export default {
  title: 'Components/PhaseCard',
  parameters: {
    docs: {
      description: {
        component: 'Phase card component displaying project phase information with status, deliverables, and actions. Production-ready with all states.',
      },
    },
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['not_started', 'in_progress', 'awaiting_approval', 'completed', 'changes_requested', 'on_hold'],
      description: 'Phase status',
    },
    requiresApproval: {
      control: { type: 'boolean' },
      description: 'Whether phase requires client approval',
    },
    hasDeliverables: {
      control: { type: 'boolean' },
      description: 'Show deliverable files',
    },
    commentCount: {
      control: { type: 'number' },
      description: 'Number of comments on phase',
    },
    isActive: {
      control: { type: 'boolean' },
      description: 'Highlight as active phase',
    },
    isAdmin: {
      control: { type: 'boolean' },
      description: 'View as admin user',
    },
    progressPercentage: {
      control: { type: 'range', min: 0, max: 100 },
      description: 'Phase progress percentage',
    },
    activityCount: {
      control: { type: 'number' },
      description: 'Number of new activities',
    },
    hasDeadline: {
      control: { type: 'boolean' },
      description: 'Whether phase has a deadline',
    },
    isOverdue: {
      control: { type: 'boolean' },
      description: 'Whether deadline has passed',
    },
    isLocked: {
      control: { type: 'boolean' },
      description: 'Whether phase is locked',
    },
    hasClientActions: {
      control: { type: 'boolean' },
      description: 'Show required client actions',
    },
  },
};

// Mock deliverables data
const mockDeliverables = [
  {
    id: '1',
    name: 'Brand_Identity_Concepts_v1.pdf',
    type: 'application/pdf',
    upload_timestamp: '2025-01-26T10:00:00Z',
  },
  {
    id: '2', 
    name: 'Logo_Variations.jpg',
    type: 'image/jpeg',
    upload_timestamp: '2025-01-26T10:30:00Z',
  },
  {
    id: '3',
    name: 'Color_Palette.png',
    type: 'image/png',
    upload_timestamp: '2025-01-26T11:00:00Z',
  },
];

// Mock client actions data
const mockClientActions = [
  {
    id: '1',
    description: 'Review design concepts',
    completed: true,
    completed_at: '2025-01-25T14:00:00Z',
  },
  {
    id: '2',
    description: 'Provide feedback on color palette',
    completed: true,
    completed_at: '2025-01-26T10:00:00Z',
  },
  {
    id: '3',
    description: 'Approve final design direction',
    completed: false,
  },
];

// Helper to create phase card
const createPhaseCard = (args) => {
  const container = document.createElement('div');
  container.style.maxWidth = '700px';
  container.style.margin = '20px auto';
  container.style.backgroundColor = BRAND.colors.bone;
  container.style.padding = '20px';
  container.style.borderRadius = '8px';
  
  const phaseData = {
    id: args.phaseId || '1',
    name: args.phaseName || 'Design Draft',
    description: args.description || 'Creating initial design concepts based on project requirements and brand guidelines.',
    order: args.order || 2,
    status: args.status || 'in_progress',
    requires_approval: args.requiresApproval !== undefined ? args.requiresApproval : true,
    approved_by: args.approvedBy || null,
    approved_at: args.approvedAt || null,
    expected_completion: args.expectedCompletion || '2025-02-15',
  };
  
  const deliverables = args.hasDeliverables ? mockDeliverables : [];
  const clientActions = args.hasClientActions ? mockClientActions : [];
  
  // Calculate progress based on client actions
  const completedActions = clientActions.filter(a => a.completed).length;
  const totalActions = clientActions.length;
  const progressPercentage = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;
  
  // Calculate deadline
  const deadline = args.hasDeadline ? 
    (args.isOverdue ? 
      new Date(Date.now() - 259200000).toISOString() : // 3 days ago
      new Date(Date.now() + 604800000).toISOString()   // 7 days from now
    ) : null;
  
  const card = new PhaseCard({
    container: container,
    phase: phaseData,
    deliverables: deliverables,
    clientActions: clientActions,
    isActive: args.isActive || false,
    commentCount: args.commentCount || 0,
    isAdmin: args.isAdmin || false,
    authToken: 'mock-token',
    progressPercentage: args.progressPercentage !== undefined ? args.progressPercentage : progressPercentage,
    completedActions: completedActions,
    totalActions: totalActions,
    deadline: deadline,
    activityCount: args.activityCount || 0,
    isLocked: args.isLocked || false,
    previousPhaseComplete: true,
    onApprove: async (phaseId) => {
      console.log(`Phase ${phaseId} approved`);
      alert('Phase approved successfully!');
      // Update the phase data and re-render
      phaseData.status = 'completed';
      phaseData.approved_at = new Date().toISOString();
      card.options.phase = phaseData;
      card.render();
    },
    onRequestChanges: async (phaseId, reason) => {
      console.log(`Changes requested for phase ${phaseId}: ${reason}`);
      alert(`Change request submitted: ${reason}`);
    },
    onFileDownload: async (fileId) => {
      console.log(`Downloading file ${fileId}`);
      alert(`File download started (ID: ${fileId})`);
    },
  });
  
  card.render();
  return container;
};

// Default state - In Progress with Enhanced Features
export const Default = {
  args: {
    phaseName: 'Design Draft',
    description: 'Creating initial design concepts based on project requirements and brand guidelines. This phase includes mood boards, color exploration, and initial layout concepts.',
    order: 2,
    status: 'in_progress',
    requiresApproval: true,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 3,
    isActive: true,
    isAdmin: false,
    activityCount: 2,
    hasDeadline: true,
    isOverdue: false,
  },
  render: (args) => createPhaseCard(args),
};

// Not Started state
export const NotStarted = {
  args: {
    phaseName: 'Initial Concept',
    description: 'Defining project requirements and creative direction.',
    order: 1,
    status: 'not_started',
    requiresApproval: false,
    hasDeliverables: false,
    commentCount: 0,
    isActive: false,
    isAdmin: false,
  },
  render: (args) => createPhaseCard(args),
};

// Awaiting Approval state with Activity
export const AwaitingApproval = {
  args: {
    phaseName: 'Design Review',
    description: 'First round of designs ready for your review and feedback. Please review all deliverables and provide your approval or request changes.',
    order: 3,
    status: 'awaiting_approval',
    requiresApproval: true,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 5,
    isActive: true,
    isAdmin: false,
    activityCount: 5,
    hasDeadline: true,
    isOverdue: false,
    progressPercentage: 67,
  },
  render: (args) => createPhaseCard(args),
};

// Completed state
export const Completed = {
  args: {
    phaseName: 'Final Delivery',
    description: 'All project deliverables have been completed and approved.',
    order: 4,
    status: 'completed',
    requiresApproval: true,
    hasDeliverables: true,
    commentCount: 12,
    isActive: false,
    isAdmin: false,
    approvedBy: 1,
    approvedAt: '2025-01-20T14:30:00Z',
  },
  render: (args) => createPhaseCard(args),
};

// Admin view - Awaiting client approval
export const AdminView = {
  args: {
    phaseName: 'Design Review',
    description: 'Designs uploaded and awaiting client approval.',
    order: 3,
    status: 'awaiting_approval',
    requiresApproval: true,
    hasDeliverables: true,
    commentCount: 2,
    isActive: true,
    isAdmin: true,
  },
  render: (args) => createPhaseCard(args),
};

// No deliverables
export const NoDeliverables = {
  args: {
    phaseName: 'Planning Phase',
    description: 'Strategic planning and requirements gathering.',
    order: 1,
    status: 'in_progress',
    requiresApproval: false,
    hasDeliverables: false,
    commentCount: 1,
    isActive: true,
    isAdmin: false,
  },
  render: (args) => createPhaseCard(args),
};

// Loading state
export const LoadingState = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '600px';
    container.style.margin = '20px auto';
    
    const card = new PhaseCard({
      container: container,
      phase: {
        id: '1',
        name: 'Design Draft',
        description: 'Creating initial design concepts.',
        order: 2,
        status: 'awaiting_approval',
        requires_approval: true,
      },
      deliverables: mockDeliverables,
      isActive: true,
    });
    
    card.render();
    card.setLoading(true);
    
    return container;
  },
};

// Error state
export const ErrorState = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '600px';
    container.style.margin = '20px auto';
    
    const card = new PhaseCard({
      container: container,
      phase: {
        id: '1',
        name: 'Design Draft',
        description: 'Creating initial design concepts.',
        order: 2,
        status: 'awaiting_approval',
        requires_approval: true,
      },
      deliverables: mockDeliverables,
      isActive: true,
    });
    
    card.render();
    card.setError('Unable to load phase data. Please refresh the page.');
    
    return container;
  },
};

// Multiple phases in sequence
export const PhaseSequence = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '600px';
    container.style.margin = '20px auto';
    
    const phases = [
      {
        id: '1',
        name: 'Initial Concept',
        description: 'Project kickoff and requirements gathering.',
        order: 1,
        status: 'completed',
        requires_approval: false,
        approved_at: '2025-01-10T10:00:00Z',
      },
      {
        id: '2',
        name: 'Design Draft',
        description: 'Creating initial design concepts.',
        order: 2,
        status: 'completed',
        requires_approval: true,
        approved_at: '2025-01-20T14:00:00Z',
      },
      {
        id: '3',
        name: 'Revisions',
        description: 'Implementing feedback and refining designs.',
        order: 3,
        status: 'awaiting_approval',
        requires_approval: true,
      },
      {
        id: '4',
        name: 'Final Delivery',
        description: 'Preparing final files and assets.',
        order: 4,
        status: 'not_started',
        requires_approval: true,
      },
    ];
    
    phases.forEach((phase, index) => {
      const phaseContainer = document.createElement('div');
      
      const card = new PhaseCard({
        container: phaseContainer,
        phase: phase,
        deliverables: phase.status !== 'not_started' ? mockDeliverables.slice(0, index + 1) : [],
        isActive: phase.status === 'awaiting_approval',
        commentCount: phase.status === 'completed' ? index * 3 : index,
        authToken: 'mock-token',
      });
      
      card.render();
      container.appendChild(phaseContainer);
    });
    
    return container;
  },
};

// Changes Requested state
export const ChangesRequested = {
  args: {
    phaseName: 'Design Refinement',
    description: 'Implementing the changes you requested. We\'re updating the color scheme and adjusting the layout based on your feedback.',
    order: 3,
    status: 'changes_requested',
    requiresApproval: true,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 8,
    isActive: true,
    isAdmin: false,
    activityCount: 3,
    hasDeadline: true,
    isOverdue: false,
    progressPercentage: 25,
  },
  render: (args) => createPhaseCard(args),
};

// Overdue Phase
export const OverduePhase = {
  args: {
    phaseName: 'Payment',
    description: 'Final invoice for the completed project. Please review and process payment to complete this phase.',
    order: 5,
    status: 'awaiting_approval',
    requiresApproval: true,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 2,
    isActive: false,
    isAdmin: false,
    activityCount: 1,
    hasDeadline: true,
    isOverdue: true,
    progressPercentage: 50,
  },
  render: (args) => createPhaseCard(args),
};

// Locked Phase
export const LockedPhase = {
  args: {
    phaseName: 'Final Delivery',
    description: 'All project files and assets will be delivered in this phase.',
    order: 6,
    status: 'not_started',
    requiresApproval: false,
    hasDeliverables: false,
    hasClientActions: true,
    commentCount: 0,
    isActive: false,
    isAdmin: false,
    activityCount: 0,
    hasDeadline: false,
    isOverdue: false,
    isLocked: true,
    progressPercentage: 0,
  },
  render: (args) => createPhaseCard(args),
};

// On Hold state
export const OnHoldPhase = {
  args: {
    phaseName: 'Print Production',
    description: 'Production temporarily on hold pending material availability.',
    order: 4,
    status: 'on_hold',
    requiresApproval: false,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 6,
    isActive: false,
    isAdmin: false,
    activityCount: 0,
    hasDeadline: false,
    progressPercentage: 50,
  },
  render: (args) => createPhaseCard(args),
};

// Mobile responsive view
export const MobileView = {
  args: {
    phaseName: 'Design Review',
    description: 'First round of designs ready for review.',
    order: 3,
    status: 'awaiting_approval',
    requiresApproval: true,
    hasDeliverables: true,
    hasClientActions: true,
    commentCount: 2,
    isActive: true,
    isAdmin: false,
    activityCount: 3,
    hasDeadline: true,
    progressPercentage: 67,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '375px';
    wrapper.style.margin = '0 auto';
    wrapper.style.padding = '10px';
    wrapper.style.backgroundColor = '#f5f5f5';
    wrapper.style.borderRadius = '8px';
    
    wrapper.appendChild(createPhaseCard(args));
    return wrapper;
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};