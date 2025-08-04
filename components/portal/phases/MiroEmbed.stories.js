/**
 * MiroEmbed Component Stories
 * Storybook stories for the production-ready Miro whiteboarding integration
 */

import { MiroEmbed } from './MiroEmbed.js';
import { BRAND } from '../../../config/brand.js';

// Mock portal object
const mockPortal = {
  authToken: 'mock-jwt-token',
  showNotification: (message, type) => {
    console.log(`Notification [${type}]: ${message}`);
  },
  websocket: {
    on: (event, callback) => console.log(`WebSocket listener added for: ${event}`),
    off: (event) => console.log(`WebSocket listener removed for: ${event}`)
  },
  modules: {
    phases: {}
  }
};

// Mock project data
const mockProjectId = 'proj_12345';
const mockPhaseData = {
  key: 'IDEA',
  name: 'Ideation',
  description: 'Brainstorming & concept development',
  autoSave: true,
  notifications: true,
  activityTracking: true
};

// Mock API responses
const mockBoards = [
  {
    id: 'board_001',
    name: 'Project Brainstorming',
    description: 'Main ideation board for project concepts',
    modifiedAt: new Date(Date.now() - 3600000).toISOString(),
    policy: {
      sharingPolicy: {
        access: 'private'
      }
    }
  },
  {
    id: 'board_002', 
    name: 'User Journey Mapping',
    description: 'Mapping user flows and touchpoints',
    modifiedAt: new Date(Date.now() - 86400000).toISOString(),
    policy: {
      sharingPolicy: {
        access: 'public'
      }
    }
  }
];

const mockMembers = [
  {
    id: 'user_001',
    name: 'John Designer',
    email: 'john@reprintstudios.com',
    picture: null,
    role: 'editor',
    isOnline: true
  },
  {
    id: 'user_002',
    name: 'Sarah Client',
    email: 'sarah@client.com', 
    picture: null,
    role: 'viewer',
    isOnline: false
  }
];

const mockActivity = [
  {
    id: 'activity_001',
    user: { name: 'John Designer', picture: null },
    action: 'created a sticky note',
    itemName: 'Key Insight #1',
    type: 'created',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'activity_002',
    user: { name: 'Sarah Client', picture: null },
    action: 'added a comment on',
    itemName: 'Mind Map Section',
    type: 'commented',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const mockPermissions = {
  canEdit: true,
  canShare: true,
  role: 'editor'
};

// Override fetch for stories
const originalFetch = window.fetch;
function mockFetch(url, options) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('/miro/boards') && !url.includes('/members') && !url.includes('/activity') && !url.includes('/permissions')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            boards: mockBoards
          })
        });
      } else if (url.includes('/members')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            members: mockMembers
          })
        });
      } else if (url.includes('/activity')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            activities: mockActivity
          })
        });
      } else if (url.includes('/permissions')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            permissions: mockPermissions
          })
        });
      } else if (url.includes('/export')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            downloadUrl: 'https://example.com/board-export.pdf'
          })
        });
      } else if (url.includes('/share')) {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            shareUrl: 'https://miro.com/app/board/shared_board_123'
          })
        });
      } else {
        resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
    }, 500);
  });
}

export default {
  title: 'Portal/Phases/MiroEmbed',
  component: MiroEmbed,
  parameters: {
    docs: {
      description: {
        component: 'Production-ready Miro whiteboarding integration component for collaborative ideation and brainstorming in project phases.'
      }
    },
    backgrounds: {
      default: 'bone',
      values: [
        { name: 'bone', value: BRAND.colors.bone }
      ]
    }
  },
  argTypes: {
    projectId: {
      control: 'text',
      description: 'Project ID for the current project'
    },
    phaseData: {
      control: 'object',
      description: 'Phase configuration data'
    }
  }
};

// Helper function to create container and render component
async function renderComponent(args) {
  window.fetch = mockFetch;
  window.portal = mockPortal;
  
  const container = document.createElement('div');
  container.style.height = '900px';
  container.style.fontFamily = BRAND.typography.fontFamily;
  
  const instance = new MiroEmbed(mockPortal, args.projectId, args.phaseData);
  mockPortal.modules.phases.miroembed = instance;
  
  await instance.render(container);
  
  return container;
}

export const Default = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: renderComponent
};

export const WithBoards = {
  args: {
    projectId: mockProjectId,
    phaseData: {
      ...mockPhaseData,
      name: 'Design Phase Collaboration'
    }
  },
  render: renderComponent,
  parameters: {
    docs: {
      description: {
        story: 'MiroEmbed component with loaded boards showing the board view with embedded whiteboard and sidebar controls.'
      }
    }
  }
};

export const ActivityView = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    const container = await renderComponent(args);
    
    // Switch to activity view after rendering
    setTimeout(() => {
      const activityTab = container.querySelector('button[onclick*="activity"]');
      if (activityTab) activityTab.click();
    }, 600);
    
    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity view showing recent board changes, user interactions, and collaboration history.'
      }
    }
  }
};

export const SettingsView = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    const container = await renderComponent(args);
    
    // Switch to settings view after rendering
    setTimeout(() => {
      const settingsTab = container.querySelector('button[onclick*="settings"]');
      if (settingsTab) settingsTab.click();
    }, 600);
    
    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'Settings view for configuring board access, permissions, and integration options.'
      }
    }
  }
};

export const LoadingState = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    // Override fetch to simulate slow loading
    window.fetch = () => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, boards: [] })
      }), 5000);
    });
    
    return await renderComponent(args);
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state shown while initializing Miro integration and fetching board data.'
      }
    }
  }
};

export const ErrorState = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    // Override fetch to simulate error
    window.fetch = () => Promise.reject(new Error('Miro API connection failed'));
    
    return await renderComponent(args);
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state displayed when Miro integration fails to connect or load boards.'
      }
    }
  }
};

export const EmptyState = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    // Override fetch to return empty boards
    window.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, boards: [] })
    });
    
    return await renderComponent(args);
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no Miro boards are available for the project, with options to create new boards.'
      }
    }
  }
};

export const ViewOnlyMode = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: async (args) => {
    // Override permissions to view-only
    const viewOnlyFetch = (url, options) => {
      if (url.includes('/permissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            permissions: { canEdit: false, canShare: false, role: 'viewer' }
          })
        });
      }
      return mockFetch(url, options);
    };
    
    window.fetch = viewOnlyFetch;
    return await renderComponent(args);
  },
  parameters: {
    docs: {
      description: {
        story: 'View-only mode where the user can see the board but cannot make edits, showing appropriate UI restrictions.'
      }
    }
  }
};

export const Mobile = {
  args: {
    projectId: mockProjectId,
    phaseData: mockPhaseData
  },
  render: renderComponent,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile responsive view of the MiroEmbed component with optimized layout for touch devices.'
      }
    }
  }
};

// Cleanup function to restore original fetch
export const cleanup = () => {
  window.fetch = originalFetch;
  delete window.portal;
};