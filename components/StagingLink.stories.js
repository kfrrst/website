/**
 * StagingLink Storybook Stories
 * Comprehensive documentation and testing for the StagingLink component
 */

import StagingLink from './StagingLink.js';
import { BRAND } from '../config/brand.js';

// Mock current user
const mockUser = {
  id: 'user_123',
  name: 'John Smith',
  email: 'john@client.com',
  role: 'client'
};

// Sample staging links with various states
const sampleLinks = [
  {
    id: 'link_1',
    staging_url: 'https://staging.reprintstudios.com/s/abc123def456',
    access_level: 'view',
    expires_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    password_protected: false,
    description: 'Client review for logo concepts',
    created_at: '2025-01-04T10:00:00Z',
    access_count: 3,
    created_by: 'user_456',
    is_active: true
  },
  {
    id: 'link_2',
    staging_url: 'https://staging.reprintstudios.com/s/xyz789ghi012',
    access_level: 'download',
    expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    password_protected: true,
    description: 'Final deliverables preview',
    created_at: '2025-01-03T14:30:00Z',
    access_count: 8,
    created_by: 'user_456',
    is_active: true
  },
  {
    id: 'link_3',
    staging_url: 'https://staging.reprintstudios.com/s/mno345pqr678',
    access_level: 'comment',
    expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (expired)
    password_protected: false,
    description: 'Marketing team feedback session',
    created_at: '2025-01-02T09:15:00Z',
    access_count: 12,
    created_by: 'user_789',
    is_active: false
  }
];

const longLinksList = [
  ...sampleLinks,
  {
    id: 'link_4',
    staging_url: 'https://staging.reprintstudios.com/s/stu901vwx234',
    access_level: 'full',
    expires_at: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    password_protected: true,
    description: 'Stakeholder presentation materials',
    created_at: '2025-01-01T16:45:00Z',
    access_count: 25,
    created_by: 'user_456',
    is_active: true
  },
  {
    id: 'link_5',
    staging_url: 'https://staging.reprintstudios.com/s/abc567def890',
    access_level: 'view',
    expires_at: new Date(Date.now() + 43200000).toISOString(), // 12 hours from now
    password_protected: false,
    description: 'Quick team review',
    created_at: '2025-01-04T08:20:00Z',
    access_count: 1,
    created_by: 'user_123',
    is_active: true
  }
];

export default {
  title: 'Portal/StagingLink',
  component: StagingLink,
  parameters: {
    docs: {
      description: {
        component: `
## StagingLink Component

Secure staging environment preview and link generation component with comprehensive access control, expiration management, and permission handling.

### Key Features
- 🔐 **Secure Access Control**: Multiple permission levels (view, download, comment, full)
- ⏰ **Expiration Management**: Configurable link expiration with visual indicators
- 🔒 **Password Protection**: Optional password protection for sensitive previews
- 📋 **Link Management**: Create, copy, preview, and delete staging links
- 👥 **Multi-user Support**: Track access counts and creation history
- 📱 **Mobile Responsive**: Touch-friendly interface across all devices
- 🖼️ **Preview Modal**: Built-in iframe preview with security sandbox
- ♿ **Accessibility Compliant**: WCAG 2.1 AA standards with keyboard navigation

### Use Cases
- **Client Previews**: Share work-in-progress with clients for feedback
- **Stakeholder Reviews**: Secure access for external stakeholders
- **Team Collaboration**: Internal team reviews and approvals
- **Presentation Materials**: Time-limited access for presentations
- **Quality Assurance**: Testing and validation workflows
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
    existingLinks: {
      control: 'object',
      description: 'Array of existing staging links'
    },
    currentUser: {
      control: 'object',
      description: 'Current user information'
    },
    permissions: {
      control: 'object',
      description: 'User permissions for link management'
    },
    maxLinks: {
      control: { type: 'range', min: 1, max: 20, step: 1 },
      description: 'Maximum number of links allowed'
    },
    defaultExpiration: {
      control: { type: 'range', min: 3600000, max: 604800000, step: 3600000 },
      description: 'Default expiration time in milliseconds'
    },
    onLinkGenerated: {
      action: 'link-generated',
      description: 'Callback fired when a new link is generated'
    },
    onLinkDeleted: {
      action: 'link-deleted',
      description: 'Callback fired when a link is deleted'
    },
    onLinkAccessed: {
      action: 'link-accessed',
      description: 'Callback fired when a link is accessed/previewed'
    }
  }
};

// Default state with some existing links
export const Default = {
  args: {
    projectId: 'proj_123',
    phaseId: 'review',
    existingLinks: sampleLinks,
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000 // 2 hours
  }
};

// Empty state - no existing links
export const Empty = {
  args: {
    projectId: 'proj_empty',
    phaseId: 'review',
    existingLinks: [],
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no staging links have been created yet.'
      }
    }
  }
};

// Read-only permissions
export const ReadOnly = {
  args: {
    projectId: 'proj_readonly',
    phaseId: 'review',
    existingLinks: sampleLinks,
    currentUser: mockUser,
    permissions: { canCreate: false, canDelete: false, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only mode where user can view and copy links but cannot create or delete them.'
      }
    }
  }
};

// Limited permissions (can create but not delete)
export const LimitedPermissions = {
  args: {
    projectId: 'proj_limited',
    phaseId: 'review',
    existingLinks: sampleLinks.slice(0, 2),
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: false, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Limited permissions where user can create and share links but cannot delete existing ones.'
      }
    }
  }
};

// Maximum links reached
export const MaxLinksReached = {
  args: {
    projectId: 'proj_maxed',
    phaseId: 'review',
    existingLinks: longLinksList,
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'State when maximum number of staging links have been created.'
      }
    }
  }
};

// Links with various access levels
export const AccessLevelVariations = {
  args: {
    projectId: 'proj_access',
    phaseId: 'review',
    existingLinks: [
      {
        ...sampleLinks[0],
        access_level: 'view',
        description: 'View-only access for initial client review'
      },
      {
        ...sampleLinks[1],
        id: 'link_download',
        access_level: 'download',
        description: 'Download access for approved deliverables'
      },
      {
        id: 'link_comment',
        staging_url: 'https://staging.reprintstudios.com/s/comment123',
        access_level: 'comment',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        password_protected: false,
        description: 'Comment access for feedback collection',
        created_at: '2025-01-04T12:00:00Z',
        access_count: 5,
        created_by: 'user_456',
        is_active: true
      },
      {
        id: 'link_full',
        staging_url: 'https://staging.reprintstudios.com/s/full456',
        access_level: 'full',
        expires_at: new Date(Date.now() + 259200000).toISOString(),
        password_protected: true,
        description: 'Full access for project stakeholders',
        created_at: '2025-01-03T18:30:00Z',
        access_count: 15,
        created_by: 'user_456',
        is_active: true
      }
    ],
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 10,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all different access levels: view, download, comment, and full access.'
      }
    }
  }
};

// Expired and expiring links
export const ExpirationStates = {
  args: {
    projectId: 'proj_expiry',
    phaseId: 'review',
    existingLinks: [
      {
        id: 'link_expired',
        staging_url: 'https://staging.reprintstudios.com/s/expired123',
        access_level: 'view',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        password_protected: false,
        description: 'Expired link - no longer accessible',
        created_at: '2025-01-03T10:00:00Z',
        access_count: 8,
        created_by: 'user_456',
        is_active: false
      },
      {
        id: 'link_expiring_soon',
        staging_url: 'https://staging.reprintstudios.com/s/expiring456',
        access_level: 'download',
        expires_at: new Date(Date.now() + 900000).toISOString(), // 15 minutes from now
        password_protected: false,
        description: 'Link expiring soon',
        created_at: '2025-01-04T13:30:00Z',
        access_count: 2,
        created_by: 'user_456',
        is_active: true
      },
      {
        id: 'link_long_term',
        staging_url: 'https://staging.reprintstudios.com/s/longterm789',
        access_level: 'comment',
        expires_at: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
        password_protected: true,
        description: 'Long-term access link',
        created_at: '2025-01-04T09:00:00Z',
        access_count: 0,
        created_by: 'user_456',
        is_active: true
      }
    ],
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Various expiration states: expired, expiring soon, and long-term links.'
      }
    }
  }
};

// Create form demonstration
export const CreateFormOpen = {
  render: () => {
    const CreateFormDemo = () => {
      const [showForm] = React.useState(true);
      
      return (
        <StagingLink
          projectId="proj_form_demo"
          phaseId="review"
          existingLinks={sampleLinks.slice(0, 2)}
          currentUser={mockUser}
          permissions={{ canCreate: true, canDelete: true, canShare: true }}
          maxLinks={5}
          defaultExpiration={7200000}
        />
      );
    };
    
    return <CreateFormDemo />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Create form interface showing all available options for new staging links.'
      }
    }
  }
};

// Mobile responsive view
export const Mobile = {
  args: {
    projectId: 'proj_mobile',
    phaseId: 'review',
    existingLinks: sampleLinks,
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout with stacked controls and touch-friendly interactions.'
      }
    }
  }
};

// Tablet responsive view
export const Tablet = {
  args: {
    projectId: 'proj_tablet',
    phaseId: 'review',
    existingLinks: sampleLinks,
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Tablet layout optimized for medium screen sizes with balanced spacing.'
      }
    }
  }
};

// Error state demonstration
export const WithError = {
  render: () => {
    const ErrorStagingLink = () => {
      const [hasError, setHasError] = React.useState(true);
      
      return (
        <div>
          <StagingLink
            projectId="proj_error"
            phaseId="review"
            existingLinks={[]}
            currentUser={mockUser}
            permissions={{ canCreate: true, canDelete: true, canShare: true }}
            maxLinks={5}
            defaultExpiration={7200000}
          />
          {hasError && (
            <div style={{
              background: BRAND.colors.accentRed,
              border: `1px solid ${BRAND.colors.red}`,
              borderRadius: '6px',
              padding: '12px 16px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: BRAND.colors.red,
              fontWeight: 500,
              fontFamily: BRAND.typography.fontFamily
            }}>
              <span>⚠️</span>
              Failed to generate staging link. Please check your permissions and try again.
              <button 
                onClick={() => setHasError(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: BRAND.colors.red,
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  marginLeft: 'auto',
                  padding: '0 4px',
                  borderRadius: '2px'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      );
    };
    
    return <ErrorStagingLink />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state handling with dismissible error messages.'
      }
    }
  }
};

// Copy interaction demonstration
export const CopyInteraction = {
  render: () => {
    const CopyDemo = () => {
      const [copyFeedback, setCopyFeedback] = React.useState(null);
      
      const handleCopy = (url, linkId) => {
        navigator.clipboard.writeText(url).then(() => {
          setCopyFeedback(linkId);
          setTimeout(() => setCopyFeedback(null), 2000);
        });
      };
      
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
            📋 Click "Copy" buttons to test clipboard functionality
          </div>
          <StagingLink
            projectId="proj_copy"
            phaseId="review"
            existingLinks={sampleLinks}
            currentUser={mockUser}
            permissions={{ canCreate: true, canDelete: true, canShare: true }}
            maxLinks={5}
            defaultExpiration={7200000}
          />
        </div>
      );
    };
    
    return <CopyDemo />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates copy-to-clipboard functionality with visual feedback.'
      }
    }
  }
};

// High usage links
export const HighUsageLinks = {
  args: {
    projectId: 'proj_usage',
    phaseId: 'review',
    existingLinks: [
      {
        ...sampleLinks[0],
        access_count: 156,
        description: 'Popular client preview link - high engagement'
      },
      {
        ...sampleLinks[1],
        access_count: 89,
        description: 'Stakeholder presentation - multiple views'
      },
      {
        id: 'link_viral',
        staging_url: 'https://staging.reprintstudios.com/s/viral123',
        access_level: 'view',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        password_protected: false,
        description: 'Viral marketing campaign preview',
        created_at: '2025-01-02T11:20:00Z',
        access_count: 1247,
        created_by: 'user_456',
        is_active: true
      }
    ],
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: 'Links with high access counts demonstrating usage analytics display.'
      }
    }
  }
};

// Accessibility showcase
export const AccessibilityShowcase = {
  args: {
    projectId: 'proj_a11y',
    phaseId: 'review',
    existingLinks: sampleLinks,
    currentUser: mockUser,
    permissions: { canCreate: true, canDelete: true, canShare: true },
    maxLinks: 5,
    defaultExpiration: 7200000
  },
  parameters: {
    docs: {
      description: {
        story: `
### Accessibility Features Demonstrated

**Keyboard Navigation:**
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modal dialogs

**Screen Reader Support:**
- Semantic HTML with proper roles
- ARIA labels and descriptions
- Live region updates for state changes

**Visual Accessibility:**
- High contrast colors (4.5:1+ ratio)
- Clear focus indicators
- Descriptive text for all actions

**Form Accessibility:**
- Proper label associations
- Required field indicators
- Error message associations

**Modal Accessibility:**
- Focus trapping in preview modal
- Proper close button labeling
- Backdrop click handling

Use axe-core accessibility addon to validate WCAG 2.1 AA compliance.
        `
      }
    }
  }
};