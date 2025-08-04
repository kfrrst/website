import { ProgressTracker } from './ProgressTracker.js';
import { BRAND } from '../config/brand.js';

export default {
  title: 'Components/ProgressTracker',
  parameters: {
    docs: {
      description: {
        component: 'Progress tracker component that displays project phases in various layouts',
      },
    },
  },
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'tabs'],
      description: 'Layout orientation of the progress tracker',
    },
    currentPhase: {
      control: { type: 'range', min: 0, max: 7, step: 1 },
      description: 'Current phase index (0-7)',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Whether phases are clickable',
    },
    showActions: {
      control: { type: 'boolean' },
      description: 'Show phase action items',
    },
  },
};

// Mock phase tracking data
const mockPhaseTracking = {
  current_phase_index: 2,
  action_statuses: [
    { action_id: '1', is_completed: true },
    { action_id: '2', is_completed: true },
    { action_id: '3', is_completed: false },
  ],
};

// Mock client actions
const mockClientActions = [
  {
    id: '1',
    phase_key: 'onboarding',
    action_name: 'Complete project brief',
    description: 'Fill out the project brief form with all requirements',
    is_required: true,
  },
  {
    id: '2',
    phase_key: 'onboarding',
    action_name: 'Sign agreements',
    description: 'Review and sign project agreements',
    is_required: true,
  },
  {
    id: '3',
    phase_key: 'review',
    action_name: 'Review deliverables',
    description: 'Review and provide feedback on design concepts',
    is_required: true,
  },
];

// Helper function to create tracker
const createTracker = (args) => {
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.padding = '20px';
  container.style.backgroundColor = args.orientation === 'tabs' ? 'transparent' : '#f5f5f5';
  
  const trackerId = `tracker-${Math.random().toString(36).substr(2, 9)}`;
  const trackerDiv = document.createElement('div');
  trackerDiv.id = trackerId;
  
  if (args.orientation === 'tabs') {
    trackerDiv.className = 'project-phase-tabs';
  }
  
  container.appendChild(trackerDiv);
  
  // Initialize tracker
  setTimeout(() => {
    const tracker = new ProgressTracker({
      container: trackerDiv,
      phases: BRAND.phaseDefinitions,
      currentPhase: args.currentPhase || 0,
      orientation: args.orientation,
      interactive: args.interactive,
      showActions: args.showActions,
      onPhaseClick: (phaseKey, phaseIndex) => {
        console.log(`Phase clicked: ${phaseKey} (index: ${phaseIndex})`);
      },
      onActionComplete: (actionId, isCompleted) => {
        console.log(`Action ${actionId} marked as ${isCompleted ? 'complete' : 'incomplete'}`);
      },
    });
    
    // Mock the init method to avoid API calls
    tracker.phaseTracking = {
      ...mockPhaseTracking,
      current_phase_index: args.currentPhase || 0,
    };
    tracker.clientActions = mockClientActions;
    tracker.render();
    tracker.setupEventListeners();
  }, 100);
  
  return container;
};

// Default progress tracker (horizontal)
export const Default = {
  args: {
    orientation: 'horizontal',
    currentPhase: 2,
    interactive: true,
    showActions: true,
  },
  render: (args) => createTracker(args),
};

// Tab-style progress tracker
export const TabStyle = {
  args: {
    orientation: 'tabs',
    currentPhase: 2,
    interactive: true,
    showActions: true,
  },
  render: (args) => createTracker(args),
};

// Non-interactive progress tracker
export const NonInteractive = {
  args: {
    orientation: 'horizontal',
    currentPhase: 4,
    interactive: false,
    showActions: false,
  },
  render: (args) => createTracker(args),
};

// All phases example
export const AllPhases = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    
    const phases = BRAND.phaseDefinitions;
    const phaseGrid = document.createElement('div');
    phaseGrid.style.display = 'grid';
    phaseGrid.style.gap = '20px';
    
    phases.forEach((phase, index) => {
      const phaseCard = document.createElement('div');
      phaseCard.style.padding = '15px';
      phaseCard.style.backgroundColor = '#f8f9fa';
      phaseCard.style.borderRadius = '8px';
      phaseCard.style.border = '1px solid #e0e0e0';
      
      phaseCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: ${BRAND.colors.blue}; color: white; border-radius: 50%; font-weight: bold;">
            ${index + 1}
          </span>
          <h3 style="margin: 0; font-size: 1.1rem;">${phase.name}</h3>
        </div>
        <p style="color: #666; margin: 5px 0; font-size: 0.9rem;">${phase.description}</p>
        ${phase.clientActions && phase.clientActions.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong style="font-size: 0.85rem;">Client Actions:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 0.85rem; color: #666;">
              ${phase.clientActions.map(action => `<li>${action}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
      
      phaseGrid.appendChild(phaseCard);
    });
    
    container.appendChild(phaseGrid);
    return container;
  },
};

// Mobile view simulation
export const MobileView = {
  args: {
    orientation: 'tabs',
    currentPhase: 1,
    interactive: true,
    showActions: true,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '375px';
    wrapper.style.margin = '0 auto';
    wrapper.style.border = '1px solid #ddd';
    wrapper.style.borderRadius = '8px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.backgroundColor = 'white';
    
    const tracker = createTracker(args);
    wrapper.appendChild(tracker);
    
    return wrapper;
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};