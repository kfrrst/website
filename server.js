import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';
import PhaseAutomationService, { createAutomationTables } from './utils/phaseAutomation.js';

// Load environment variables
dotenv.config();

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

// Security middleware - temporarily disable CSP for debugging
app.use(helmet({
  contentSecurityPolicy: false, // Temporarily disabled for debugging
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
import activityRoutes from './routes/activity.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import { initializeSocketHandlers } from './utils/socketHandlers.js';

// Make io instance available to routes
app.set('io', io);

// Initialize Socket.io handlers
initializeSocketHandlers(io);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/phases', phaseRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Admin routes - serve admin.html for admin paths
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin/*', (req, res) => {
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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      status: err.status || 500,
      ...(isDevelopment && { stack: err.stack })
    }
  });
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
    await createAutomationTables();
    const phaseAutomation = new PhaseAutomationService(io);
    await phaseAutomation.start();
    console.log('✅ Phase automation service started');
    
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