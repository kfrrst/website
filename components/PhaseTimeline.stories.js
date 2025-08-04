import { PhaseTimeline } from './PhaseTimeline.js';

export default {
  title: 'Components/PhaseTimeline',
  parameters: {
    docs: {
      description: {
        component: 'Production-ready timeline component for displaying project phase activities with real-time updates and filtering.',
      },
    },
  },
};

// Mock activity data
const createMockActivities = (count = 10) => {
  const activityTypes = [
    'file_upload',
    'file_download', 
    'phase_transition',
    'phase_approval',
    'comment',
    'project_updated',
    'system'
  ];
  
  const users = [
    { id: '1', name: 'Kendrick Forrest' },
    { id: '2', name: 'John Doe' },
    { id: '3', name: 'Jane Smith' },
    { id: 'system', name: 'System' }
  ];
  
  const descriptions = {
    file_upload: [
      'Uploaded logo_concepts_v2.jpg',
      'Uploaded brand_guidelines.pdf', 
      'Uploaded wireframes.sketch',
      'Uploaded project_assets.zip'
    ],
    file_download: [
      'Downloaded final_logo.svg',
      'Downloaded brand_assets.zip',
      'Downloaded project_files.pdf'
    ],
    phase_transition: [
      'Moved project from Design to Review phase',
      'Advanced to Production phase',
      'Transitioned to Final Delivery'
    ],
    phase_approval: [
      'Approved Design Review phase',
      'Approved concept designs',
      'Approved final deliverables'
    ],
    comment: [
      'Added feedback on logo designs',
      'Commented on color palette',
      'Requested revisions to layout'
    ],
    project_updated: [
      'Updated project timeline',
      'Modified project requirements',
      'Changed project status'
    ],
    system: [
      'Project created automatically',
      'Backup completed successfully',
      'Notification sent to client'
    ]
  };
  
  return Array.from({ length: count }, (_, i) => {
    const activityType = activityTypes[i % activityTypes.length];
    const user = users[Math.floor(Math.random() * users.length)];
    const possibleDescriptions = descriptions[activityType];
    const description = possibleDescriptions[Math.floor(Math.random() * possibleDescriptions.length)];
    
    const activity = {
      id: `activity-${i + 1}`,
      activity_type: activityType,
      user_id: user.id,
      user_name: user.name,
      description: description,
      created_at: new Date(Date.now() - (i * 2 * 60 * 60 * 1000)).toISOString(), // Every 2 hours back
      likes_count: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0
    };
    
    // Add metadata for specific activity types
    if (activityType === 'file_upload') {
      activity.metadata = {
        file_name: description.split(' ')[1] || 'uploaded_file.jpg',
        file_size: Math.floor(Math.random() * 5000000) + 100000
      };
    } else if (activityType === 'phase_transition') {
      activity.metadata = {
        from_phase: 'Design',
        to_phase: 'Review',
        duration: '3 days'
      };
    }
    
    return activity;
  });
};

// Helper function to create timeline container
const createTimelineStory = (args) => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.maxWidth = '800px';
  container.style.margin = '0 auto';
  container.style.backgroundColor = '#f8f9fa';
  container.style.minHeight = '600px';
  
  const timeline = new PhaseTimeline(args);
  timeline.render();
  
  return container;
};

export const Default = {
  args: {
    projectId: 'project-1',
    phaseId: 'phase-3',
    activities: createMockActivities(8),
    showFilters: true,
    maxItems: 50,
    autoRefresh: false,
    authToken: 'mock-auth-token',
    currentUserId: '2',
    onActivityClick: (activityId) => {
      console.log('Activity clicked:', activityId);
      alert(`Clicked activity: ${activityId}`);
    }
  },
  render: (args) => createTimelineStory(args),
};

export const WithoutFilters = {
  args: {
    ...Default.args,
    showFilters: false,
    activities: createMockActivities(6)
  },
  render: (args) => createTimelineStory(args),
};

export const FileActivitiesOnly = {
  args: {
    ...Default.args,
    activities: createMockActivities(15).filter(activity => 
      ['file_upload', 'file_download'].includes(activity.activity_type)
    )
  },
  render: (args) => createTimelineStory(args),
};

export const EmptyTimeline = {
  args: {
    ...Default.args,
    activities: []
  },
  render: (args) => createTimelineStory(args),
};

export const LoadingState = {
  args: {
    ...Default.args,
    activities: createMockActivities(5)
  },
  render: (args) => {
    const container = createTimelineStory(args);
    
    // Simulate loading state
    setTimeout(() => {
      const timeline = new PhaseTimeline({
        ...args,
        container: container.querySelector('.phase-timeline-container')
      });
      timeline.isLoading = true;
      timeline.render();
    }, 100);
    
    return container;
  },
};

export const ErrorState = {
  args: {
    ...Default.args,
    activities: createMockActivities(3)
  },
  render: (args) => {
    const container = createTimelineStory(args);
    
    // Simulate error state
    setTimeout(() => {
      const timeline = new PhaseTimeline({
        ...args,
        container: container.querySelector('.phase-timeline-container')
      });
      timeline.error = 'Failed to load timeline. Network connection lost.';
      timeline.render();
    }, 100);
    
    return container;
  },
};

export const WithAutoRefresh = {
  args: {
    ...Default.args,
    autoRefresh: true,
    refreshInterval: 5000, // 5 seconds for demo
    activities: createMockActivities(6)
  },
  render: (args) => {
    const container = createTimelineStory(args);
    
    // Add a note about auto-refresh
    const note = document.createElement('div');
    note.style.cssText = `
      background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px;
      padding: 12px; margin-bottom: 16px; font-size: 14px; color: #1976d2;
    `;
    note.textContent = '🔄 Auto-refresh enabled (every 5 seconds for demo)';
    container.insertBefore(note, container.firstChild);
    
    return container;
  },
};

export const InteractiveDemo = {
  args: {
    ...Default.args,
    activities: createMockActivities(12),
    onActivityClick: (activityId) => {
      const activity = Default.args.activities.find(a => a.id === activityId);
      if (activity) {
        alert(`
Activity Details:
Type: ${activity.activity_type}
User: ${activity.user_name}
Description: ${activity.description}
Time: ${new Date(activity.created_at).toLocaleString()}
${activity.metadata ? `Metadata: ${JSON.stringify(activity.metadata, null, 2)}` : ''}
        `);
      }
    }
  },
  render: (args) => {
    const container = createTimelineStory(args);
    
    // Add interaction note
    const note = document.createElement('div');
    note.style.cssText = `
      background: #f3e5f5; border: 1px solid #9c27b0; border-radius: 4px;
      padding: 12px; margin-bottom: 16px; font-size: 14px; color: #7b1fa2;
    `;
    note.textContent = '👆 Click on any activity item to see details. Try the filter buttons and action buttons!';
    container.insertBefore(note, container.firstChild);
    
    return container;
  },
};