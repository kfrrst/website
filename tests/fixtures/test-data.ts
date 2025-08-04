export const mockAuthenticatedUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'client',
  company_name: 'Test Company'
};

export const mockAdminUser = {
  id: 2,
  email: 'admin@reprintstudios.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin'
};

export const mockProjectData = {
  project: {
    id: 'test-project-1',
    name: 'Brand Identity Redesign',
    description: 'Complete brand refresh including logo, colors, and guidelines',
    status: 'active',
    progress_percentage: 65,
    start_date: '2025-01-01',
    due_date: '2025-03-01',
    client_id: 1
  },
  phases: {
    phases: [
      {
        id: 'phase-1',
        phase_key: 'onboarding',
        name: 'Onboarding',
        description: 'Initial kickoff and info gathering',
        status: 'completed',
        order_index: 0,
        requires_approval: true,
        completed_at: '2025-01-05',
        activity_count: 5
      },
      {
        id: 'phase-2',
        phase_key: 'ideation',
        name: 'Ideation',
        description: 'Brainstorming & concept development',
        status: 'completed',
        order_index: 1,
        requires_approval: false,
        completed_at: '2025-01-10',
        activity_count: 8
      },
      {
        id: 'phase-3',
        phase_key: 'design',
        name: 'Design',
        description: 'Creation of designs and prototypes',
        status: 'awaiting_approval',
        order_index: 2,
        requires_approval: true,
        activity_count: 12
      },
      {
        id: 'phase-4',
        phase_key: 'review',
        name: 'Review & Feedback',
        description: 'Client review and feedback collection',
        status: 'not_started',
        order_index: 3,
        requires_approval: true,
        activity_count: 0
      },
      {
        id: 'phase-5',
        phase_key: 'production',
        name: 'Production/Print',
        description: 'Final production and printing',
        status: 'not_started',
        order_index: 4,
        requires_approval: true,
        activity_count: 0
      },
      {
        id: 'phase-6',
        phase_key: 'payment',
        name: 'Payment',
        description: 'Final payment collection',
        status: 'not_started',
        order_index: 5,
        requires_approval: false,
        activity_count: 0
      },
      {
        id: 'phase-7',
        phase_key: 'signoff',
        name: 'Sign-off & Docs',
        description: 'Final approvals and documentation',
        status: 'not_started',
        order_index: 6,
        requires_approval: true,
        activity_count: 0
      },
      {
        id: 'phase-8',
        phase_key: 'delivery',
        name: 'Delivery',
        description: 'Final deliverables and handover',
        status: 'not_started',
        order_index: 7,
        requires_approval: false,
        activity_count: 0
      }
    ]
  }
};

export const mockDeliverables = [
  {
    id: 1,
    name: 'Brand_Guidelines_v2.pdf',
    size: 2457600,
    type: 'application/pdf',
    uploaded_at: '2025-01-20T10:00:00Z',
    uploaded_by_name: 'Kendrick Forrest'
  },
  {
    id: 2,
    name: 'Logo_Concepts.ai',
    size: 5242880,
    type: 'application/illustrator',
    uploaded_at: '2025-01-19T15:30:00Z',
    uploaded_by_name: 'Kendrick Forrest'
  },
  {
    id: 3,
    name: 'Color_Palette.png',
    size: 1048576,
    type: 'image/png',
    uploaded_at: '2025-01-18T09:15:00Z',
    uploaded_by_name: 'Design Team'
  }
];

export const mockActivities = [
  {
    id: 1,
    type: 'phase_approved',
    description: 'Phase approved',
    created_at: '2025-01-20T14:00:00Z',
    user_name: 'John Doe',
    metadata: {
      phase_name: 'Ideation'
    }
  },
  {
    id: 2,
    type: 'file_uploaded',
    description: 'Uploaded file',
    created_at: '2025-01-20T10:00:00Z',
    user_name: 'Kendrick Forrest',
    metadata: {
      file_name: 'Brand_Guidelines_v2.pdf',
      file_size: 2457600
    }
  },
  {
    id: 3,
    type: 'comment_added',
    description: 'Added comment',
    created_at: '2025-01-19T16:45:00Z',
    user_name: 'Jane Smith',
    metadata: {
      comment: 'Love the new direction! The colors really pop.'
    }
  },
  {
    id: 4,
    type: 'phase_changes_requested',
    description: 'Requested changes',
    created_at: '2025-01-18T11:30:00Z',
    user_name: 'John Doe',
    metadata: {
      phase_name: 'Design',
      feedback: 'Please adjust the typography to be more modern'
    }
  }
];

export const mockInvoices = [
  {
    id: 1,
    invoice_number: 'INV-2025-001',
    amount: 2500.00,
    status: 'paid',
    due_date: '2025-01-15',
    paid_at: '2025-01-14T10:30:00Z'
  },
  {
    id: 2,
    invoice_number: 'INV-2025-002',
    amount: 3750.00,
    status: 'pending',
    due_date: '2025-02-15',
    paid_at: null
  }
];