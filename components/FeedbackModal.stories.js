import { FeedbackModal } from './FeedbackModal.js';

export default {
  title: 'Components/FeedbackModal',
  parameters: {
    docs: {
      description: {
        component: 'Production-ready modal for requesting changes on project phases with form validation and proper UX.',
      },
    },
  },
};

// Helper function to create modal wrapper
const createModalStory = (args) => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  
  const button = document.createElement('button');
  button.textContent = 'Open Feedback Modal';
  button.style.padding = '12px 24px';
  button.style.backgroundColor = '#0057ff';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '8px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    const modal = new FeedbackModal(args);
    modal.open();
  });
  
  container.appendChild(button);
  
  // Add description
  const description = document.createElement('p');
  description.textContent = 'Click the button to open the feedback modal';
  description.style.marginTop = '10px';
  description.style.color = '#666';
  description.style.fontSize = '14px';
  container.appendChild(description);
  
  return container;
};

export const Default = {
  args: {
    phaseId: 'phase-3',
    phaseName: 'Design Review',
    onSubmit: async (phaseId, feedback) => {
      console.log('Feedback submitted:', { phaseId, feedback });
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Feedback submitted for ${phaseId}: "${feedback}"`);
    },
    onCancel: () => {
      console.log('Modal cancelled');
    },
  },
  render: (args) => createModalStory(args),
};

export const WithLongPhaseName = {
  args: {
    phaseId: 'phase-4',
    phaseName: 'Brand Identity Development & Logo Conceptualization',
    onSubmit: async (phaseId, feedback) => {
      console.log('Feedback submitted:', { phaseId, feedback });
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Changes requested successfully!');
    },
    onCancel: () => {
      console.log('Modal cancelled');
    },
  },
  render: (args) => createModalStory(args),
};

export const WithCustomMaxLength = {
  args: {
    phaseId: 'phase-2',  
    phaseName: 'Initial Concepts',
    maxLength: 500,
    onSubmit: async (phaseId, feedback) => {
      console.log('Feedback submitted:', { phaseId, feedback });
      await new Promise(resolve => setTimeout(resolve, 800));
      alert(`Feedback received (${feedback.length} characters)`);
    },
    onCancel: () => {
      console.log('Modal cancelled');
    },
  },
  render: (args) => createModalStory(args),
};

export const WithError = {
  args: {
    phaseId: 'phase-5',
    phaseName: 'Website Development',
    onSubmit: async (phaseId, feedback) => {
      console.log('Simulating error...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw new Error('Network error: Unable to submit feedback');
    },
    onCancel: () => {
      console.log('Modal cancelled');
    },
  },
  render: (args) => createModalStory(args),
};

export const Interactive = {
  args: {
    phaseId: 'phase-1',
    phaseName: 'Project Onboarding',
    onSubmit: async (phaseId, feedback) => {
      console.log('Starting submission process...');
      
      // Simulate validation
      if (feedback.length < 20) {
        throw new Error('Please provide more detailed feedback (minimum 20 characters)');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success
      const successMsg = `✅ Change request submitted successfully!\n\nPhase: ${phaseId}\nFeedback: "${feedback}"\nCharacter count: ${feedback.length}`;
      alert(successMsg);
      
      return { success: true, message: 'Feedback submitted' };
    },
    onCancel: () => {
      console.log('User cancelled the feedback modal');
    },
  },
  render: (args) => createModalStory(args),
};