/**
 * ResearchList Component Stories
 * Storybook stories for the ResearchList component
 */

import { ResearchList } from './ResearchList.js';
import { BRAND } from '../../../config/brand.js';

// Mock portal object for stories
const mockPortal = {
  authToken: 'mock-token',
  showNotification: (message, type) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
  modules: {
    phases: {
      researchList: null // Will be set in stories
    }
  }
};

// Mock research data
const mockResearchItems = [
  {
    id: '1',
    title: 'Target Audience Demographics Analysis',
    research_type: 'market_analysis',
    description: 'Comprehensive analysis of our target demographic including age, income, location, and purchasing behavior patterns.',
    tags: ['demographics', 'audience', 'behavior', 'purchasing'],
    findings_count: 8,
    documents_count: 3,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    findings: [
      { text: 'Primary audience is 25-35 years old with household income of $50-80k', highlighted: true },
      { text: 'Mobile-first shopping behavior with 78% of purchases on mobile devices', highlighted: true },
      { text: 'Strong preference for sustainable and eco-friendly products', highlighted: false }
    ],
    documents: [
      { id: 'd1', original_name: 'Demographics_Survey_Results.pdf', file_size: 2048576 },
      { id: 'd2', original_name: 'Behavior_Analysis_Report.docx', file_size: 1024000 },
      { id: 'd3', original_name: 'Market_Data_Spreadsheet.xlsx', file_size: 512000 }
    ]
  },
  {
    id: '2',
    title: 'User Interview Insights - E-commerce Experience',
    research_type: 'user_research',
    description: 'Key insights from 12 user interviews focusing on online shopping experience, pain points, and feature preferences.',
    tags: ['interviews', 'ecommerce', 'ux', 'pain-points'],
    findings_count: 12,
    documents_count: 2,
    created_at: '2024-01-18T09:00:00Z',
    updated_at: '2024-01-22T16:20:00Z',
    findings: [
      { text: 'Checkout process takes too long - average 8 minutes vs industry standard 3 minutes', highlighted: true },
      { text: 'Users want more product reviews and ratings from verified buyers', highlighted: true },
      { text: 'Live chat support is highly valued but currently unavailable', highlighted: false }
    ],
    documents: [
      { id: 'd4', original_name: 'Interview_Transcripts.pdf', file_size: 4096000 },
      { id: 'd5', original_name: 'User_Journey_Maps.pptx', file_size: 8192000 }
    ]
  },
  {
    id: '3',
    title: 'Competitive Landscape Analysis Q1 2024',
    research_type: 'competitive_analysis',
    description: 'Analysis of top 5 competitors including pricing strategies, feature comparison, and market positioning.',
    tags: ['competitors', 'pricing', 'features', 'positioning'],
    findings_count: 15,
    documents_count: 4,
    created_at: '2024-01-10T11:15:00Z',
    updated_at: '2024-01-25T13:30:00Z',
    findings: [
      { text: 'Competitor A has 30% lower pricing but fewer premium features', highlighted: true },
      { text: 'Market leader invests heavily in AI-powered recommendations', highlighted: true },
      { text: 'Gap in mid-market segment for professional services integration', highlighted: true }
    ],
    documents: [
      { id: 'd6', original_name: 'Competitor_Pricing_Analysis.xlsx', file_size: 1536000 },
      { id: 'd7', original_name: 'Feature_Comparison_Matrix.pdf', file_size: 2048000 },
      { id: 'd8', original_name: 'Market_Positioning_Map.pptx', file_size: 6144000 },
      { id: 'd9', original_name: 'Competitive_Intelligence_Report.docx', file_size: 3072000 }
    ]
  },
  {
    id: '4',
    title: 'Brand Perception Audit - Current State',
    research_type: 'brand_audit',
    description: 'Comprehensive audit of current brand perception, recognition, and alignment with company values.',
    tags: ['brand', 'perception', 'recognition', 'values'],
    findings_count: 6,
    documents_count: 1,
    created_at: '2024-01-12T14:20:00Z',
    updated_at: '2024-01-19T10:15:00Z',
    findings: [
      { text: 'Brand recognition at 23% among target demographic, below industry average', highlighted: true },
      { text: 'Strong association with quality but weak on innovation perception', highlighted: false },
      { text: 'Visual identity inconsistencies across digital touchpoints', highlighted: true }
    ],
    documents: [
      { id: 'd10', original_name: 'Brand_Audit_Report.pdf', file_size: 5120000 }
    ]
  }
];

export default {
  title: 'Components/Portal/Phases/ResearchList',
  component: ResearchList,
  parameters: {
    docs: {
      description: {
        component: 'ResearchList component for managing research items in the RESEARCH phase. Supports multiple research types, file uploads, findings management, and export functionality.'
      }
    },
    layout: 'fullscreen'
  },
  argTypes: {
    projectId: {
      control: 'text',
      description: 'Project ID for the research items'
    },
    viewMode: {
      control: { type: 'radio' },
      options: ['grid', 'list'],
      description: 'Display mode for research items'
    },
    initialFilter: {
      control: { type: 'select' },
      options: ['all', 'market_analysis', 'user_research', 'competitive_analysis', 'brand_audit'],
      description: 'Initial filter for research type'
    }
  }
};

// Mock API responses
const mockApiResponses = {
  '/api/research/items': {
    success: true,
    items: mockResearchItems,
    pagination: {
      total: mockResearchItems.length,
      limit: 50,
      offset: 0,
      hasMore: false
    }
  }
};

// Override fetch for stories
const originalFetch = window.fetch;
const mockFetch = (url, options) => {
  console.log('Mock API call:', url, options);
  
  if (url.includes('/api/research/items') && !url.includes('/download')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponses['/api/research/items'])
    });
  }
  
  // For other endpoints, return success
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  });
};

// Story template
const Template = (args) => {
  // Setup mock fetch
  window.fetch = mockFetch;
  
  const container = document.createElement('div');
  container.style.cssText = `
    background: ${BRAND.colors.bone};
    min-height: 100vh;
    font-family: ${BRAND.typography.fontFamily};
  `;
  
  // Create ResearchList instance
  const researchList = new ResearchList(mockPortal, args.projectId, {});
  
  // Set initial properties
  if (args.viewMode) {
    researchList.viewMode = args.viewMode;
  }
  if (args.initialFilter) {
    researchList.currentFilter = args.initialFilter;
  }
  
  // Mock research items for immediate display
  researchList.researchItems = mockResearchItems;
  researchList.applyFilters();
  
  // Set up portal reference
  mockPortal.modules.phases.researchList = researchList;
  
  // Render component
  researchList.render(container);
  
  // Cleanup on story change
  setTimeout(() => {
    window.fetch = originalFetch;
  }, 100);
  
  return container;
};

// Stories
export const Default = Template.bind({});
Default.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'all'
};

export const ListView = Template.bind({});
ListView.args = {
  projectId: 'project-123',
  viewMode: 'list',
  initialFilter: 'all'
};

export const MarketAnalysisFilter = Template.bind({});
MarketAnalysisFilter.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'market_analysis'
};
MarketAnalysisFilter.parameters = {
  docs: {
    description: {
      story: 'ResearchList filtered to show only Market Analysis research items.'
    }
  }
};

export const UserResearchFilter = Template.bind({});
UserResearchFilter.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'user_research'
};
UserResearchFilter.parameters = {
  docs: {
    description: {
      story: 'ResearchList filtered to show only User Research items.'
    }
  }
};

export const CompetitiveAnalysisFilter = Template.bind({});
CompetitiveAnalysisFilter.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'competitive_analysis'
};
CompetitiveAnalysisFilter.parameters = {
  docs: {
    description: {
      story: 'ResearchList filtered to show only Competitive Analysis items.'
    }
  }
};

export const BrandAuditFilter = Template.bind({});
BrandAuditFilter.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'brand_audit'
};
BrandAuditFilter.parameters = {
  docs: {
    description: {
      story: 'ResearchList filtered to show only Brand Audit items.'
    }
  }
};

export const EmptyState = (args) => {
  // Setup mock fetch for empty response
  window.fetch = (url, options) => {
    console.log('Mock API call (empty):', url, options);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        items: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false }
      })
    });
  };
  
  const container = document.createElement('div');
  container.style.cssText = `
    background: ${BRAND.colors.bone};
    min-height: 100vh;
    font-family: ${BRAND.typography.fontFamily};
  `;
  
  const researchList = new ResearchList(mockPortal, args.projectId, {});
  researchList.researchItems = [];
  researchList.filteredItems = [];
  
  mockPortal.modules.phases.researchList = researchList;
  researchList.render(container);
  
  setTimeout(() => {
    window.fetch = originalFetch;
  }, 100);
  
  return container;
};
EmptyState.args = {
  projectId: 'project-123'
};
EmptyState.parameters = {
  docs: {
    description: {
      story: 'ResearchList empty state when no research items exist yet.'
    }
  }
};

export const WithSelectedItems = Template.bind({});
WithSelectedItems.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'all'
};
WithSelectedItems.play = async ({ canvasElement }) => {
  // Simulate selecting items
  setTimeout(() => {
    const checkboxes = canvasElement.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 1) {
      checkboxes[1].checked = true;
      checkboxes[1].dispatchEvent(new Event('change'));
      if (checkboxes[2]) {
        checkboxes[2].checked = true;
        checkboxes[2].dispatchEvent(new Event('change'));
      }
    }
  }, 500);
};
WithSelectedItems.parameters = {
  docs: {
    description: {
      story: 'ResearchList with selected items showing bulk actions toolbar.'
    }
  }
};

export const MobileView = Template.bind({});
MobileView.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'all'
};
MobileView.parameters = {
  viewport: {
    defaultViewport: 'mobile1'
  },
  docs: {
    description: {
      story: 'ResearchList optimized for mobile devices with responsive layout.'
    }
  }
};

export const TabletView = Template.bind({});
TabletView.args = {
  projectId: 'project-123',
  viewMode: 'list',
  initialFilter: 'all'
};
TabletView.parameters = {
  viewport: {
    defaultViewport: 'tablet'
  },
  docs: {
    description: {
      story: 'ResearchList on tablet devices showing list view layout.'
    }
  }
};

// Interactive story for testing modal functionality
export const InteractiveDemo = Template.bind({});
InteractiveDemo.args = {
  projectId: 'project-123',
  viewMode: 'grid',
  initialFilter: 'all'
};
InteractiveDemo.parameters = {
  docs: {
    description: {
      story: 'Fully interactive ResearchList demo. Try clicking "Add Research", editing items, or changing view modes.'
    }
  }
};

// Add CSS to Storybook
const style = document.createElement('style');
style.textContent = `
  /* Import research list styles */
  @import url('/styles/research-list.css');
  
  /* Ensure proper styling in Storybook */
  .sb-show-main {
    background: ${BRAND.colors.bone} !important;
  }
  
  /* Icon placeholders for Storybook */
  .icon-search::before { content: '🔍'; }
  .icon-grid-3x3::before { content: '⊞'; }
  .icon-list::before { content: '☰'; }
  .icon-download::before { content: '⬇'; }
  .icon-plus::before { content: '+'; }
  .icon-file-text::before { content: '📄'; }
  .icon-lightbulb::before { content: '💡'; }
  .icon-file-plus::before { content: '📁'; }
  .icon-trending-up::before { content: '📈'; }
  .icon-users::before { content: '👥'; }
  .icon-zap::before { content: '⚡'; }
  .icon-eye::before { content: '👁'; }
  .icon-edit-2::before { content: '✏'; }
  .icon-trash-2::before { content: '🗑'; }
  .icon-clock::before { content: '🕐'; }
  .icon-x::before { content: '✕'; }
  .icon-save::before { content: '💾'; }
  .icon-upload::before { content: '📤'; }
  .icon-check::before { content: '✓'; }
  .icon-alert-circle::before { content: '⚠'; }
  .icon-tag::before { content: '🏷'; }
`;
document.head.appendChild(style);

export { style as ResearchListStyles };