/**
 * ProofChecklist Storybook Stories
 * Comprehensive documentation and testing for the ProofChecklist component
 */

import ProofChecklist from './ProofChecklist.js';
import { BRAND } from '../config/brand.js';

// Mock WebSocket connection for stories
class MockWebSocketConnection {
  constructor() {
    this.listeners = {};
  }
  
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

const mockWebSocket = new MockWebSocketConnection();

// Mock current user
const mockUser = {
  id: 'user_123',
  name: 'John Smith',
  email: 'john@client.com',
  role: 'client'
};

// Sample checklist items with various states
const mockItems = [
  {
    id: 'item_1',
    description: 'Logo placement and sizing is correct',
    required: true,
    completed: true,
    completed_by: 'John Smith',
    completed_at: '2025-01-04T10:30:00Z',
    notes: 'Logo looks perfect - great positioning on the header.',
    sort_order: 1
  },
  {
    id: 'item_2',
    description: 'Color accuracy matches brand guidelines',
    required: true,
    completed: true,
    completed_by: 'John Smith',
    completed_at: '2025-01-04T10:32:00Z',
    notes: 'Colors are spot on with our brand palette.',
    sort_order: 2
  },
  {
    id: 'item_3',
    description: 'Typography is legible and properly sized',
    required: true,
    completed: false,
    notes: 'Need to check if the small text is readable on mobile.',
    sort_order: 3
  },
  {
    id: 'item_4',
    description: 'Contact information is accurate and up-to-date',
    required: true,
    completed: false,
    notes: '',
    sort_order: 4
  },
  {
    id: 'item_5',
    description: 'Overall design meets expectations',
    required: false,
    completed: false,
    notes: '',
    sort_order: 5
  }
];

const longChecklistItems = [
  ...mockItems,
  {
    id: 'item_6',
    description: 'Print quality meets professional standards for business cards',
    required: true,
    completed: false,
    notes: '',
    sort_order: 6
  },
  {
    id: 'item_7',
    description: 'Paper weight and finish selection is appropriate',
    required: true,
    completed: false,
    notes: '',
    sort_order: 7
  },
  {
    id: 'item_8',
    description: 'Cutting and finishing specifications are correct',
    required: false,
    completed: false,
    notes: '',
    sort_order: 8
  }
];

export default {
  title: 'Portal/ProofChecklist',
  component: ProofChecklist,
  parameters: {
    docs: {
      description: {
        component: `
## ProofChecklist Component

Interactive checklist component for client proof approval workflows. Features real-time collaboration, accessibility compliance, and comprehensive state management.

### Key Features
- ✅ **Real-time Collaboration**: WebSocket integration for live updates
- ♿ **Accessibility Compliant**: WCAG 2.1 AA standards with keyboard navigation
- 📱 **Mobile Responsive**: Touch-friendly interface across all devices  
- 🔄 **Undo Functionality**: Revert recent changes with undo stack
- 💾 **Auto-save**: Automatic persistence of changes to backend
- 📊 **Progress Tracking**: Visual progress indicators and completion stats
- 🔒 **Permission Handling**: Read-only mode for view-only users

### Usage Patterns
- **Client Approval**: Clients review and approve design deliverables
- **Team Collaboration**: Multiple stakeholders can contribute simultaneously
- **Phase Validation**: Ensure all requirements are met before phase progression
- **Audit Trail**: Track completion history and approval notes
        `
      }
    },
    layout: 'padded'
  },
  argTypes: {
    projectId: {
      control: 'text',
      description: 'Unique identifier for the project'
    },
    phaseId: {
      control: 'text', 
      description: 'Current project phase identifier'
    },
    initialItems: {
      control: 'object',
      description: 'Array of checklist items to display'
    },
    isReadOnly: {
      control: 'boolean',
      description: 'Whether the checklist is read-only (view mode)'
    },
    currentUser: {
      control: 'object',
      description: 'Current user information for tracking changes'
    },
    websocketConnection: {
      control: false,
      description: 'WebSocket connection for real-time updates'
    },
    onItemChange: {
      action: 'item-changed',
      description: 'Callback fired when an item is modified'
    },
    onComplete: {
      action: 'checklist-completed', 
      description: 'Callback fired when checklist is completed'
    }
  }
};

// Default interactive checklist
export const Default = {
  args: {
    projectId: 'proj_123',
    phaseId: 'review',
    initialItems: mockItems,
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  }
};

// Empty checklist state
export const Empty = {
  args: {
    projectId: 'proj_456',
    phaseId: 'review',
    initialItems: [],
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty checklist state where users can add new items from scratch.'
      }
    }
  }
};

// All items completed
export const AllCompleted = {
  args: {
    projectId: 'proj_789',
    phaseId: 'review',
    initialItems: mockItems.map(item => ({ 
      ...item, 
      completed: true,
      completed_by: 'John Smith',
      completed_at: '2025-01-04T10:30:00Z'
    })),
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: 'Completed checklist showing the completion button and success state.'
      }
    }
  }
};

// Read-only mode
export const ReadOnly = {
  args: {
    projectId: 'proj_readonly',
    phaseId: 'review',
    initialItems: mockItems,
    isReadOnly: true,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only mode for users who can view but not modify the checklist.'
      }
    }
  }
};

// Loading state
export const Loading = {
  render: () => (
    <div className="proof-checklist loading" role="status" aria-label="Loading checklist">
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
      <style jsx>{`
        .proof-checklist.loading {
          background: ${BRAND.colors.bone};
          border: 1px solid ${BRAND.colors.border};
          border-radius: 8px;
          padding: 24px;
        }
        .skeleton-item {
          height: 60px;
          background: linear-gradient(90deg, ${BRAND.colors.borderLight} 25%, ${BRAND.colors.borderSubtle} 50%, ${BRAND.colors.borderLight} 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading skeleton shown while checklist data is being fetched.'
      }
    }
  }
};

// Error state
export const WithError = {
  render: () => {
    const ErrorProofChecklist = () => {
      const [hasError, setHasError] = React.useState(true);
      
      return (
        <div className="proof-checklist" style={{ fontFamily: BRAND.typography.fontFamily }}>
          {hasError && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              Failed to load checklist. Please check your connection and try again.
              <button 
                className="error-dismiss"
                onClick={() => setHasError(false)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          <div style={{ color: BRAND.colors.textSecondary, textAlign: 'center', padding: '20px' }}>
            Checklist content would appear here once error is resolved.
          </div>
          <style jsx>{`
            .proof-checklist {
              background: ${BRAND.colors.bone};
              border: 1px solid ${BRAND.colors.border};
              border-radius: 8px;
              padding: 24px;
            }
            .error-message {
              background: ${BRAND.colors.accentRed};
              border: 1px solid ${BRAND.colors.red};
              border-radius: 6px;
              padding: 12px 16px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
              color: ${BRAND.colors.red};
              font-weight: 500;
            }
            .error-dismiss {
              background: none;
              border: none;
              color: ${BRAND.colors.red};
              cursor: pointer;
              font-size: 1.2rem;
              margin-left: auto;
              padding: 0 4px;
              border-radius: 2px;
            }
            .error-dismiss:hover {
              background: rgba(230, 57, 70, 0.1);
            }
          `}</style>
        </div>
      );
    };
    
    return <ErrorProofChecklist />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state shown when checklist fails to load or save.'
      }
    }
  }
};

// Long checklist (scroll behavior)
export const LongChecklist = {
  args: {
    projectId: 'proj_long',
    phaseId: 'review',
    initialItems: longChecklistItems,
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: 'Long checklist demonstrating scroll behavior and performance with many items.'
      }
    }
  }
};

// Mobile responsive view
export const Mobile = {
  args: {
    projectId: 'proj_mobile',
    phaseId: 'review', 
    initialItems: mockItems,
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout with touch-friendly interactions and stacked form elements.'
      }
    }
  }
};

// Tablet responsive view  
export const Tablet = {
  args: {
    projectId: 'proj_tablet',
    phaseId: 'review',
    initialItems: mockItems,
    isReadOnly: false, 
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Tablet layout balancing desktop functionality with touch interface considerations.'
      }
    }
  }
};

// Real-time collaboration demo
export const RealTimeCollaboration = {
  render: () => {
    const [items, setItems] = React.useState(mockItems);
    const mockSocket = new MockWebSocketConnection();
    
    // Simulate real-time updates
    React.useEffect(() => {
      const interval = setInterval(() => {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        if (randomItem && !randomItem.completed) {
          mockSocket.emit('proof_checklist_updated', {
            project_id: 'proj_realtime',
            phase_id: 'review',
            item_id: randomItem.id,
            updates: {
              completed: true,
              completed_by: 'Remote User',
              completed_at: new Date().toISOString()
            }
          });
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }, [items]);
    
    return (
      <div>
        <div style={{ 
          background: BRAND.colors.accentBlue, 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '16px',
          fontSize: '0.875rem',
          color: BRAND.colors.blue,
          fontWeight: 500
        }}>
          📡 Real-time demo: Items will be automatically completed by "Remote User" every 5 seconds
        </div>
        <ProofChecklist
          projectId="proj_realtime"
          phaseId="review"
          initialItems={items}
          isReadOnly={false}
          currentUser={mockUser}
          websocketConnection={mockSocket}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates real-time collaboration with WebSocket updates from other users.'
      }
    }
  }
};

// Accessibility testing
export const AccessibilityShowcase = {
  args: {
    projectId: 'proj_a11y',
    phaseId: 'review',
    initialItems: mockItems,
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: `
### Accessibility Features Demonstrated

**Keyboard Navigation:**
- Tab through checklist items and controls
- Space/Enter to toggle checkboxes
- Arrow keys for navigation

**Screen Reader Support:**
- Semantic HTML with proper roles
- ARIA labels and descriptions
- Live region updates for changes

**Visual Accessibility:**
- High contrast colors (4.5:1+ ratio)
- Focus indicators
- Clear visual hierarchy

**Motor Accessibility:**  
- Large touch targets (44px+)
- No time-limited interactions
- Forgiving input areas

Use axe-core accessibility addon to validate compliance.
        `
      }
    }
  }
};

// Performance testing
export const PerformanceTest = {
  args: {
    projectId: 'proj_perf',
    phaseId: 'review',
    initialItems: Array.from({ length: 50 }, (_, i) => ({
      id: `perf_item_${i}`,
      description: `Performance test item ${i + 1} with longer description to test rendering`,
      required: i % 3 === 0,
      completed: Math.random() > 0.5,
      completed_by: Math.random() > 0.5 ? 'Test User' : null,
      completed_at: Math.random() > 0.5 ? new Date().toISOString() : null,
      notes: i % 5 === 0 ? `Test notes for item ${i + 1}` : '',
      sort_order: i
    })),
    isReadOnly: false,
    currentUser: mockUser,
    websocketConnection: mockWebSocket
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 50 checklist items to validate rendering and interaction speed.'
      }
    }
  }
};