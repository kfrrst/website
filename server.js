import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports that might use them
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { testConnection, query } from './config/database.js';
import phaseAutomationService from './utils/phaseAutomation.js';
import { 
  rateLimiters, 
  preventSqlInjection, 
  preventNoSqlInjection,
  preventPathTraversal,
  preventCommandInjection,
  securityHeaders,
  requestSizeLimits,
  auditLog 
} from './middleware/security.js';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

// Enhanced security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Apply rate limiting
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.auth);
app.use('/api/auth/refresh', rateLimiters.auth);
app.use('/api/files/upload', rateLimiters.upload);
app.use('/api/', rateLimiters.api);

// Body parsing middleware with security limits
app.use(express.json({ limit: requestSizeLimits.json }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimits.urlencoded }));

// Security middleware
app.use(preventNoSqlInjection);
app.use(preventSqlInjection);
app.use(preventPathTraversal);
app.use(preventCommandInjection);

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static files - serve CSS, JS, and other assets
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// API Routes (to be implemented)
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import clientRoutes from './routes/clients.js';
import invoiceRoutes from './routes/invoices.js';
import fileRoutes from './routes/files.js';
import messageRoutes from './routes/messages.js';
import inquiryRoutes from './routes/inquiries.js';
import phaseRoutes from './routes/phases.js';
import activityRoutes from './routes/activities.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import emailRoutes from './routes/email.js';
import emailPreviewRoutes from './routes/emailPreview.js';
import analyticsRoutes from './routes/analytics.js';
import paymentRoutes from './routes/payments.js';
import formRoutes from './routes/forms.js';
import documentRoutes from './routes/documents.js';
import researchRoutes from './routes/research.js';
import proofRoutes from './routes/proofs.js';
// New routes from reprint-wiring-branch-plus
import pdfRoutes from './server/routes/pdf.js';
import formsGetRoutes from './server/routes/forms-get.js';
import formsSubmitRoutes from './server/routes/forms-submit.js';
import newPhaseRoutes from './server/routes/phases.js';
import stripeRoutes from './server/routes/stripe.js';
import signEventRoutes from './server/routes/sign-events.js';
import settingsRoutes from './routes/settings.js';
import fileCategoriesRoutes from './routes/file-categories.js';
import fileTagsRoutes from './routes/file-tags.js';
import notificationRoutes from './routes/notifications.js';
import emailTemplatesRoutes from './routes/email-templates.js';
import timeTrackingRoutes from './routes/time-tracking.js';
import teamCollaborationRoutes from './routes/team-collaboration.js';
import systemSettingsRoutes from './routes/system-settings.js';
import automationRulesRoutes from './routes/automation-rules.js';
import phaseRequirementsRoutes from './routes/phase-requirements.js';
import agreementsRoutes from './routes/agreements.js';
import paymentTrackingRoutes from './routes/payment-tracking.js';
import { initializeSocketHandlers } from './utils/socketHandlers.js';
import { startCronJobs } from './utils/cronJobs.js';
import testAuthDebug from './test-auth-debug.js';

// Make io instance available to routes
app.set('io', io);

// Initialize Socket.io handlers
initializeSocketHandlers(io);

// Mount API routes with audit logging for sensitive operations
app.use('/api/auth', auditLog('auth'), authRoutes);
app.use('/api/projects', auditLog('projects'), projectRoutes);
app.use('/api/clients', auditLog('clients'), clientRoutes);
app.use('/api/invoices', auditLog('invoices'), invoiceRoutes);
app.use('/api/files', auditLog('files'), fileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/phases', phaseRoutes);
app.use('/api/phases', phaseRequirementsRoutes);
app.use('/api/agreements', agreementsRoutes);
app.use('/api/payment-tracking', paymentTrackingRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users', auditLog('users'), userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-preview', emailPreviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', auditLog('payments'), paymentRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/research', auditLog('research'), researchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/file-categories', auditLog('file-categories'), fileCategoriesRoutes);
app.use('/api/file-tags', auditLog('file-tags'), fileTagsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email-templates', auditLog('email-templates'), emailTemplatesRoutes);
app.use('/api/time-tracking', auditLog('time-tracking'), timeTrackingRoutes);
app.use('/api/team-collaboration', auditLog('team-collaboration'), teamCollaborationRoutes);
app.use('/api/system-settings', auditLog('system-settings'), systemSettingsRoutes);
app.use('/api/automation-rules', auditLog('automation-rules'), automationRulesRoutes);
app.use('/api', auditLog('proofs'), proofRoutes);
app.use('/api/debug', testAuthDebug);

// Mount new routes from reprint-wiring-branch-plus
// Stripe webhook needs to be before body parsing middleware for signature verification
app.use('/api/stripe', stripeRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/new-forms', formsGetRoutes);
app.use('/api/new-forms', formsSubmitRoutes);
app.use('/api/new-phases', newPhaseRoutes);
app.use('/api/sign-events', signEventRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Redirect admin.html to /admin for consistent localStorage domain
app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

// Admin routes - serve admin.html for admin paths
app.get('/admin', (req, res) => {
  // Set headers to prevent caching issues with localStorage
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin/*', (req, res) => {
  // Set headers to prevent caching issues with localStorage
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve portal.html for authenticated users
app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'portal.html'));
});
app.get('/portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'portal.html'));
});

// Test dashboard (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-dashboard.html'));
  });
}

// Serve index.html for all other routes (SPA) - but not API routes
app.get('/*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler - must be after all other routes
app.use((req, res) => {
  // For API requests, return JSON
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: {
        message: 'API endpoint not found',
        status: 404
      }
    });
  } else {
    // For page requests, serve 404.html
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // For API errors
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({
      error: {
        message: isDevelopment ? err.message : 'Internal server error',
        status: err.status || 500,
        ...(isDevelopment && { stack: err.stack })
      }
    });
  } else {
    // For page errors, serve 500.html
    res.status(500).sendFile(path.join(__dirname, '500.html'));
  }
});

// Start server
server.listen(PORT, async () => {
  console.log(`
🚀 Server is running!
📍 Local: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
  
  // Test database connection
  try {
    await testConnection();
    
    // Initialize phase automation
    // Create automation tables if needed
    await query(`
      CREATE TABLE IF NOT EXISTS automation_notifications (
        notification_key VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Automation tables created successfully');
    phaseAutomationService.io = io;
    await phaseAutomationService.start();
    console.log('✅ Phase automation service started');
    
    // Start cron jobs
    startCronJobs();
    console.log('✅ Cron jobs started');
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      phaseAutomation.stop();
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
});

export default app;