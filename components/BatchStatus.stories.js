/**
 * BatchStatus Storybook Stories
 * Comprehensive documentation and testing for the BatchStatus component
 */

import BatchStatus from './BatchStatus.js';
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

// Sample batch items
const sampleItems = [
  { id: 'file_1', name: 'business-card-design.pdf', size: 2048000 },
  { id: 'file_2', name: 'logo-variations.ai', size: 5120000 },
  { id: 'file_3', name: 'brand-guidelines.pdf', size: 8192000 },
  { id: 'file_4', name: 'mockup-presentation.psd', size: 15360000 }
];

const largeItemsList = [
  ...sampleItems,
  { id: 'file_5', name: 'product-catalog.pdf', size: 25600000 },
  { id: 'file_6', name: 'website-wireframes.sketch', size: 3072000 },
  { id: 'file_7', name: 'social-media-assets.zip', size: 12288000 },
  { id: 'file_8', name: 'print-ready-files.zip', size: 51200000 },
  { id: 'file_9', name: 'brand-photography.zip', size: 104857600 },
  { id: 'file_10', name: 'video-assets.mp4', size: 209715200 }
];

export default {
  title: 'Portal/BatchStatus',
  component: BatchStatus,
  parameters: {
    docs: {
      description: {
        component: `
## BatchStatus Component

Real-time batch processing status component with progress tracking, WebSocket integration, and comprehensive error handling.

### Key Features
- 🔄 **Real-time Updates**: WebSocket integration for live status updates
- 📊 **Progress Tracking**: Visual progress bars with percentage and item counts
- ⚡ **Status Management**: Support for queued, processing, completed, failed, cancelled, and paused states
- 🔧 **Error Handling**: Retry mechanisms and error recovery
- 📱 **Mobile Responsive**: Touch-friendly interface across all devices
- ⏱️ **Time Tracking**: Elapsed time and estimated completion display
- 📋 **Item Details**: Expandable list of processing items with individual status

### Use Cases
- **File Processing**: Batch processing of uploaded files (resize, convert, compress)
- **Email Campaigns**: Bulk email sending with progress tracking
- **Report Generation**: Large report processing with status updates
- **Import/Export**: Data migration and synchronization tasks
- **Media Processing**: Video/audio encoding and optimization
        `
      }
    },
    layout: 'padded'
  },
  argTypes: {
    batchId: {
      control: 'text',
      description: 'Unique identifier for the batch job'
    },
    projectId: {
      control: 'text',
      description: 'Associated project identifier'
    },
    initialStatus: {
      control: 'select',
      options: ['queued', 'processing', 'completed', 'failed', 'cancelled', 'paused'],
      description: 'Initial batch processing status'
    },
    initialProgress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Initial progress percentage (0-100)'
    },
    batchType: {
      control: 'select',
      options: ['file_processing', 'email_campaign', 'report_generation', 'data_import', 'media_processing'],
      description: 'Type of batch processing operation'
    },
    items: {
      control: 'object',
      description: 'Array of items being processed'
    },
    estimatedDuration: {
      control: 'date',
      description: 'Estimated completion time'
    },
    showDetails: {
      control: 'boolean',
      description: 'Whether to show detailed item list'
    },
    autoRefresh: {
      control: 'boolean',
      description: 'Enable automatic status polling'
    },
    refreshInterval: {
      control: { type: 'range', min: 1000, max: 30000, step: 1000 },
      description: 'Auto-refresh interval in milliseconds'
    },
    onStatusChange: {
      action: 'status-changed',
      description: 'Callback fired when status changes'
    },
    onComplete: {
      action: 'batch-completed',
      description: 'Callback fired when batch completes successfully'
    },
    onError: {
      action: 'batch-error',
      description: 'Callback fired when batch encounters an error'
    }
  }
};

// Queued state - waiting to start
export const Queued = {
  args: {
    batchId: 'batch_queued_123',
    projectId: 'proj_456',
    initialStatus: 'queued',
    initialProgress: 0,
    batchType: 'file_processing',
    items: sampleItems,
    estimatedDuration: new Date(Date.now() + 300000), // 5 minutes from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  }
};

// Processing state with progress
export const Processing = {
  args: {
    batchId: 'batch_processing_456',
    projectId: 'proj_789',
    initialStatus: 'processing',
    initialProgress: 45,
    batchType: 'file_processing',
    items: sampleItems,
    estimatedDuration: new Date(Date.now() + 180000), // 3 minutes from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  }
};

// Completed state
export const Completed = {
  args: {
    batchId: 'batch_completed_789',
    projectId: 'proj_123',
    initialStatus: 'completed',
    initialProgress: 100,
    batchType: 'file_processing',
    items: sampleItems,
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: false
  }
};

// Failed state with retry option
export const Failed = {
  args: {
    batchId: 'batch_failed_321',
    projectId: 'proj_654',
    initialStatus: 'failed',
    initialProgress: 67,
    batchType: 'file_processing',
    items: sampleItems,
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: false
  }
};

// Cancelled state
export const Cancelled = {
  args: {
    batchId: 'batch_cancelled_654',
    projectId: 'proj_987',
    initialStatus: 'cancelled',
    initialProgress: 23,
    batchType: 'file_processing',
    items: sampleItems,
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: false
  }
};

// Paused state
export const Paused = {
  args: {
    batchId: 'batch_paused_987',
    projectId: 'proj_321',
    initialStatus: 'paused',
    initialProgress: 56,
    batchType: 'file_processing',
    items: sampleItems,
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: false
  }
};

// Without item details
export const SimpleView = {
  args: {
    batchId: 'batch_simple_111',
    projectId: 'proj_222',
    initialStatus: 'processing',
    initialProgress: 75,
    batchType: 'report_generation',
    items: [],
    websocketConnection: mockWebSocket,
    showDetails: false,
    autoRefresh: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Simplified view without detailed item list, useful for space-constrained layouts.'
      }
    }
  }
};

// Large batch with many items
export const LargeBatch = {
  args: {
    batchId: 'batch_large_999',
    projectId: 'proj_888',
    initialStatus: 'processing',
    initialProgress: 30,
    batchType: 'media_processing',
    items: largeItemsList,
    estimatedDuration: new Date(Date.now() + 900000), // 15 minutes from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Large batch processing with many items to test scrolling and performance.'
      }
    }
  }
};

// Real-time updates simulation
export const RealTimeUpdates = {
  render: () => {
    const [progress, setProgress] = React.useState(0);
    const [status, setStatus] = React.useState('queued');
    const [currentItem, setCurrentItem] = React.useState(null);
    const mockSocket = new MockWebSocketConnection();
    
    React.useEffect(() => {
      const interval = setInterval(() => {
        if (status === 'queued') {
          setStatus('processing');
          setCurrentItem(sampleItems[0].name);
          mockSocket.emit('batch_status_update', {
            batch_id: 'batch_realtime_777',
            status: 'processing',
            progress: 10,
            current_item: sampleItems[0].name
          });
        } else if (status === 'processing' && progress < 100) {
          const newProgress = Math.min(100, progress + Math.random() * 15);
          const itemIndex = Math.floor((newProgress / 100) * sampleItems.length);
          const newCurrentItem = itemIndex < sampleItems.length ? sampleItems[itemIndex].name : null;
          
          setProgress(newProgress);
          setCurrentItem(newCurrentItem);
          
          mockSocket.emit('batch_status_update', {
            batch_id: 'batch_realtime_777',
            status: newProgress >= 100 ? 'completed' : 'processing',
            progress: newProgress,
            current_item: newCurrentItem
          });
          
          if (newProgress >= 100) {
            setStatus('completed');
          }
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }, [status, progress]);
    
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
          📡 Real-time demo: Status updates every 2 seconds until completion
        </div>
        <BatchStatus
          batchId="batch_realtime_777"
          projectId="proj_realtime"
          initialStatus={status}
          initialProgress={progress}
          batchType="file_processing"
          items={sampleItems}
          websocketConnection={mockSocket}
          showDetails={true}
          autoRefresh={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates real-time status updates via WebSocket simulation.'
      }
    }
  }
};

// Error handling demonstration
export const WithError = {
  render: () => {
    const ErrorBatchStatus = () => {
      const [hasError, setHasError] = React.useState(true);
      
      return (
        <BatchStatus
          batchId="batch_error_555"
          projectId="proj_error"
          initialStatus="processing"
          initialProgress={34}
          batchType="file_processing"
          items={sampleItems}
          websocketConnection={mockWebSocket}
          showDetails={true}
        />
      );
    };
    
    return <ErrorBatchStatus />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state handling with dismissible error messages.'
      }
    }
  }
};

// Mobile responsive view
export const Mobile = {
  args: {
    batchId: 'batch_mobile_333',
    projectId: 'proj_mobile',
    initialStatus: 'processing',
    initialProgress: 62,
    batchType: 'file_processing',
    items: sampleItems,
    estimatedDuration: new Date(Date.now() + 240000), // 4 minutes from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
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
    batchId: 'batch_tablet_444',
    projectId: 'proj_tablet',
    initialStatus: 'processing',
    initialProgress: 78,
    batchType: 'media_processing',
    items: sampleItems.slice(0, 2),
    estimatedDuration: new Date(Date.now() + 120000), // 2 minutes from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Tablet layout optimized for medium screen sizes.'
      }
    }
  }
};

// Different batch types
export const EmailCampaign = {
  args: {
    batchId: 'batch_email_666',
    projectId: 'proj_email',
    initialStatus: 'processing',
    initialProgress: 42,
    batchType: 'email_campaign',
    items: [
      { id: 'email_1', name: '250 welcome emails', size: 0 },
      { id: 'email_2', name: '150 newsletter updates', size: 0 },
      { id: 'email_3', name: '75 reminder notifications', size: 0 }
    ],
    estimatedDuration: new Date(Date.now() + 300000),
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Email campaign batch processing with different item types.'
      }
    }
  }
};

export const ReportGeneration = {
  args: {
    batchId: 'batch_report_777',
    projectId: 'proj_report',
    initialStatus: 'processing',
    initialProgress: 89,
    batchType: 'report_generation',
    items: [
      { id: 'report_1', name: 'Monthly analytics report', size: 0 },
      { id: 'report_2', name: 'Client performance summary', size: 0 },
      { id: 'report_3', name: 'Project timeline analysis', size: 0 }
    ],
    estimatedDuration: new Date(Date.now() + 60000), // 1 minute from now
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Report generation batch processing near completion.'
      }
    }
  }
};

// Performance test with rapid updates
export const PerformanceTest = {
  render: () => {
    const [progress, setProgress] = React.useState(0);
    const mockSocket = new MockWebSocketConnection();
    
    React.useEffect(() => {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(100, prev + Math.random() * 5);
          
          mockSocket.emit('batch_status_update', {
            batch_id: 'batch_perf_999',
            status: newProgress >= 100 ? 'completed' : 'processing',
            progress: newProgress,
            current_item: `processing-item-${Math.floor(newProgress / 10)}.file`
          });
          
          return newProgress;
        });
      }, 100); // Very rapid updates
      
      return () => clearInterval(interval);
    }, []);
    
    return (
      <div>
        <div style={{ 
          background: BRAND.colors.accentYellow, 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '16px',
          fontSize: '0.875rem',
          color: BRAND.colors.yellow,
          fontWeight: 500
        }}>
          ⚡ Performance test: Rapid updates every 100ms
        </div>
        <BatchStatus
          batchId="batch_perf_999"
          projectId="proj_perf"
          initialStatus="processing"
          initialProgress={progress}
          batchType="file_processing"
          items={Array.from({ length: 100 }, (_, i) => ({
            id: `perf_${i}`,
            name: `performance-test-file-${i}.dat`,
            size: Math.floor(Math.random() * 10000000)
          }))}
          websocketConnection={mockSocket}
          showDetails={true}
          autoRefresh={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance stress test with rapid updates and large item lists.'
      }
    }
  }
};

// Accessibility showcase
export const AccessibilityShowcase = {
  args: {
    batchId: 'batch_a11y_888',
    projectId: 'proj_a11y',
    initialStatus: 'processing',
    initialProgress: 55,
    batchType: 'file_processing',
    items: sampleItems,
    estimatedDuration: new Date(Date.now() + 180000),
    websocketConnection: mockWebSocket,
    showDetails: true,
    autoRefresh: true
  },
  parameters: {
    docs: {
      description: {
        story: `
### Accessibility Features Demonstrated

**Semantic HTML:**
- Proper ARIA roles and labels
- Progress bar with aria-valuenow/valuemin/valuemax
- Alert regions for error messages

**Keyboard Navigation:**
- Focusable action buttons
- Logical tab order
- Clear focus indicators

**Screen Reader Support:**
- Descriptive aria-labels
- Status announcements
- Progress updates

**Visual Accessibility:**
- High contrast colors
- Clear visual hierarchy
- Status icons with text alternatives

Use axe-core accessibility addon to validate WCAG 2.1 AA compliance.
        `
      }
    }
  }
};