import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { renderEmailTemplate, EMAIL_TEMPLATES } from '../utils/emailTemplates.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to ensure only admins can access
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Common variables available in all templates
const COMMON_VARIABLES = [
  { name: 'clientName', label: 'Client Name', description: 'Full name of the client' },
  { name: 'projectName', label: 'Project Name', description: 'Name of the project' },
  { name: 'projectUrl', label: 'Project URL', description: 'Link to view the project' },
  { name: 'portalUrl', label: 'Portal URL', description: 'Link to the client portal' },
  { name: 'currentYear', label: 'Current Year', description: 'Current year for copyright' },
  { name: 'unsubscribeUrl', label: 'Unsubscribe URL', description: 'Link to unsubscribe from emails' }
];

// Template-specific variables
const TEMPLATE_VARIABLES = {
  'phase-approval-needed': [
    { name: 'phaseName', label: 'Phase Name', description: 'Name of the current phase' },
    { name: 'phaseDescription', label: 'Phase Description', description: 'Description of the phase' },
    { name: 'filesCount', label: 'Files Count', description: 'Number of files to review' },
    { name: 'approvalUrl', label: 'Approval URL', description: 'Link to approve the phase' },
    { name: 'deadline', label: 'Deadline', description: 'Phase deadline date' }
  ],
  'phase-approved': [
    { name: 'phaseName', label: 'Phase Name', description: 'Name of the approved phase' },
    { name: 'approvedBy', label: 'Approved By', description: 'Person who approved' },
    { name: 'approvalDate', label: 'Approval Date', description: 'Date of approval' },
    { name: 'nextPhaseName', label: 'Next Phase', description: 'Name of the next phase' },
    { name: 'comments', label: 'Comments', description: 'Approval comments' }
  ],
  'invoice-sent': [
    { name: 'invoiceNumber', label: 'Invoice Number', description: 'Invoice reference number' },
    { name: 'issueDate', label: 'Issue Date', description: 'Date invoice was issued' },
    { name: 'dueDate', label: 'Due Date', description: 'Payment due date' },
    { name: 'totalAmount', label: 'Total Amount', description: 'Total amount due' },
    { name: 'paymentUrl', label: 'Payment URL', description: 'Link to pay invoice' },
    { name: 'lineItems', label: 'Line Items', description: 'Array of invoice items' }
  ],
  'payment-received': [
    { name: 'invoiceNumber', label: 'Invoice Number', description: 'Invoice reference number' },
    { name: 'amountPaid', label: 'Amount Paid', description: 'Payment amount' },
    { name: 'paymentDate', label: 'Payment Date', description: 'Date of payment' },
    { name: 'paymentMethod', label: 'Payment Method', description: 'How payment was made' },
    { name: 'transactionId', label: 'Transaction ID', description: 'Payment reference' }
  ],
  'file-uploaded': [
    { name: 'fileName', label: 'File Name', description: 'Name of uploaded file' },
    { name: 'fileSize', label: 'File Size', description: 'Size of the file' },
    { name: 'uploadedBy', label: 'Uploaded By', description: 'Person who uploaded' },
    { name: 'uploadDate', label: 'Upload Date', description: 'Date of upload' },
    { name: 'downloadUrl', label: 'Download URL', description: 'Link to download file' }
  ],
  'project-welcome': [
    { name: 'projectDescription', label: 'Project Description', description: 'Project details' },
    { name: 'projectManager', label: 'Project Manager', description: 'Assigned PM' },
    { name: 'estimatedTimeline', label: 'Timeline', description: 'Estimated duration' },
    { name: 'firstPhaseName', label: 'First Phase', description: 'Starting phase name' },
    { name: 'nextSteps', label: 'Next Steps', description: 'Array of next actions' }
  ],
  'project-deadline-reminder': [
    { name: 'currentPhase', label: 'Current Phase', description: 'Active phase name' },
    { name: 'deadline', label: 'Deadline', description: 'Project deadline' },
    { name: 'daysRemaining', label: 'Days Remaining', description: 'Days until deadline' },
    { name: 'requiredActions', label: 'Required Actions', description: 'List of actions needed' },
    { name: 'projectProgress', label: 'Progress', description: 'Project completion percentage' }
  ]
};

// GET /api/email-preview/templates - List all available templates
router.get('/templates', authenticateToken, adminOnly, async (req, res) => {
  try {
    const templatesDir = path.join(__dirname, '..', 'templates', 'emails');
    const files = await fs.readdir(templatesDir);
    
    const templates = files
      .filter(file => file.endsWith('.html') && file !== 'base.html')
      .map(file => {
        const templateKey = file.replace('.html', '').toUpperCase().replace(/-/g, '_');
        const templateInfo = EMAIL_TEMPLATES[templateKey] || {};
        const templateId = file.replace('.html', '');
        
        return {
          id: templateId,
          name: file.replace('.html', '').split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          fileName: file,
          subject: templateInfo.subject || 'No subject defined',
          variables: [...COMMON_VARIABLES, ...(TEMPLATE_VARIABLES[templateId] || [])]
        };
      });
    
    res.json({ templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/email-preview/template/:id - Get template content
router.get('/template/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${id}.html`);
    
    const content = await fs.readFile(templatePath, 'utf-8');
    const templateKey = id.toUpperCase().replace(/-/g, '_');
    const templateInfo = EMAIL_TEMPLATES[templateKey] || {};
    
    res.json({
      id,
      content,
      subject: templateInfo.subject || '',
      variables: [...COMMON_VARIABLES, ...(TEMPLATE_VARIABLES[id] || [])],
      sampleData: getSampleData(id)
    });
  } catch (error) {
    console.error('Error reading template:', error);
    res.status(404).json({ error: 'Template not found' });
  }
});

// POST /api/email-preview/render - Render template with data
router.post('/render', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { templateId, data } = req.body;
    
    // Merge with default data
    const renderData = {
      ...getSampleData(templateId),
      ...data,
      previewMode: true
    };
    
    const html = await renderEmailTemplate(templateId, renderData);
    
    res.json({ html });
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

// PUT /api/email-preview/template/:id - Update template content (admin only)
router.put('/template/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${id}.html`);
    
    // Backup original
    const backupPath = path.join(__dirname, '..', 'templates', 'emails', 'backups');
    await fs.mkdir(backupPath, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(
      templatePath, 
      path.join(backupPath, `${id}-${timestamp}.html`)
    );
    
    // Write new content
    await fs.writeFile(templatePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      message: 'Template updated successfully',
      backupCreated: `${id}-${timestamp}.html`
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Helper function to get sample data for templates
function getSampleData(templateId) {
  const commonData = {
    clientName: 'John Doe',
    userName: 'John Doe',
    projectName: 'Brand Identity Redesign',
    projectUrl: 'http://localhost:3000/portal/projects/123',
    portalUrl: 'http://localhost:3000/portal',
    unsubscribeUrl: 'http://localhost:3000/unsubscribe/token123',
    currentYear: new Date().getFullYear()
  };
  
  const templateData = {
    'phase-approval-needed': {
      ...commonData,
      phaseName: 'Design Concepts',
      phaseDescription: 'Initial design concepts for your brand identity',
      filesCount: 3,
      approvalUrl: 'http://localhost:3000/portal/projects/123/phases/456',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    'phase-approved': {
      ...commonData,
      phaseName: 'Design Concepts',
      approvedBy: 'John Doe',
      approvalDate: new Date(),
      nextPhaseName: 'Final Refinements',
      comments: 'Looks great! Love the color palette.'
    },
    'phase-completed': {
      ...commonData,
      phaseName: 'Final Design',
      completionDate: new Date(),
      deliverables: ['Logo Files', 'Brand Guidelines', 'Business Card Designs'],
      nextSteps: 'We will now move to the production phase.',
      downloadUrl: 'http://localhost:3000/portal/projects/123/files'
    },
    'project-welcome': {
      ...commonData,
      projectDescription: 'Complete brand identity redesign including logo, color palette, and marketing materials.',
      projectManager: 'Sarah Johnson',
      estimatedTimeline: '6-8 weeks',
      firstPhaseName: 'Discovery & Research',
      nextSteps: ['Complete project brief', 'Schedule kickoff meeting', 'Review initial timeline']
    },
    'project-completed': {
      ...commonData,
      completionDate: new Date(),
      projectDuration: '6 weeks',
      finalDeliverables: ['Logo Package', 'Brand Guidelines PDF', 'Marketing Templates'],
      downloadAllUrl: 'http://localhost:3000/portal/projects/123/download-all',
      feedbackUrl: 'http://localhost:3000/feedback/123'
    },
    'file-uploaded': {
      ...commonData,
      fileName: 'Logo_Concepts_v2.pdf',
      fileSize: '2.4 MB',
      uploadedBy: 'Sarah Johnson',
      uploadDate: new Date(),
      fileDescription: 'Revised logo concepts based on your feedback',
      downloadUrl: 'http://localhost:3000/portal/files/789',
      currentPhase: 'Design Development'
    },
    'invoice-sent': {
      ...commonData,
      invoiceNumber: 'INV-2025-0042',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalAmount: 5000,
      description: 'Brand Identity Redesign - Final Payment',
      lineItems: [
        { description: 'Design Services', amount: 4500 },
        { description: 'Rush Delivery', amount: 500 }
      ],
      paymentUrl: 'http://localhost:3000/portal/invoices/123/pay',
      attachmentNote: true
    },
    'payment-received': {
      ...commonData,
      invoiceNumber: 'INV-2025-0042',
      amountPaid: 5000,
      paymentDate: new Date(),
      paymentMethod: 'Credit Card',
      transactionId: 'ch_1234567890',
      isProjectComplete: false
    },
    'password-reset': {
      ...commonData,
      resetUrl: 'http://localhost:3000/reset-password/token123',
      expirationTime: '24 hours',
      ipAddress: '192.168.1.1',
      requestedAt: new Date()
    },
    'security-alert': {
      ...commonData,
      loginTime: new Date(),
      location: 'San Francisco, CA',
      deviceInfo: 'Chrome on MacOS',
      ipAddress: '192.168.1.1',
      changePasswordUrl: 'http://localhost:3000/change-password'
    },
    'invoice-reminder': {
      ...commonData,
      invoiceNumber: 'INV-2025-0042',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      daysUntilDue: 3,
      amountDue: 5000,
      paymentUrl: 'http://localhost:3000/portal/invoices/123/pay',
      isLastReminder: false
    },
    'invoice-overdue': {
      ...commonData,
      invoiceNumber: 'INV-2025-0042',
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      daysOverdue: 7,
      amountDue: 5000,
      lateFee: 75,
      paymentUrl: 'http://localhost:3000/portal/invoices/123/pay'
    },
    'project-deadline-reminder': {
      ...commonData,
      currentPhase: 'Final Design',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      daysRemaining: 3,
      actionRequired: true,
      requiredActions: ['Review final designs', 'Provide approval or feedback'],
      awaitingApproval: true,
      projectProgress: 75,
      upcomingMilestones: [
        { name: 'Production Start', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { name: 'Final Delivery', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
      ]
    },
    'account-activated': {
      ...commonData,
      activationDate: new Date(),
      loginUrl: 'http://localhost:3000/login',
      supportEmail: 'support@reprintstudios.com'
    },
    'project-weekly-summary': {
      ...commonData,
      weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      weekEndDate: new Date(),
      projects: [
        {
          name: 'Brand Identity Redesign',
          progress: 75,
          currentPhase: 'Final Design',
          phaseIndex: 3,
          needsApproval: true
        },
        {
          name: 'Website Refresh',
          progress: 30,
          currentPhase: 'Wireframing',
          phaseIndex: 1,
          needsApproval: false
        }
      ],
      totalProjects: 2,
      projectsNeedingAttention: 1,
      completedThisWeek: 2,
      recentActivity: [
        {
          description: 'Logo concepts uploaded',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          projectName: 'Brand Identity Redesign'
        },
        {
          description: 'Phase approved: Research',
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          projectName: 'Website Refresh'
        }
      ],
      upcomingDeadlines: [
        {
          projectName: 'Brand Identity Redesign',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          daysRemaining: 3
        }
      ],
      hasUpcomingDeadlines: true,
      hasRecentActivity: true
    }
  };
  
  return templateData[templateId] || commonData;
}

export default router;