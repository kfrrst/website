# [RE]Print Studios - Production Deployment Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Complete Feature List](#complete-feature-list)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Deployment Options](#deployment-options)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup Procedures](#backup-procedures)
10. [API Documentation Summary](#api-documentation-summary)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Maintenance Procedures](#maintenance-procedures)

---

## System Overview

The [RE]Print Studios Client Portal is a full-stack web application built for creative collaboration and project management. It provides a secure, real-time environment for clients to track projects, communicate with the team, manage files, and handle invoicing.

### Technology Stack
- **Backend**: Node.js, Express.js, PostgreSQL, Socket.io
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Real-time**: WebSocket connections via Socket.io
- **Authentication**: JWT tokens with refresh tokens
- **File Storage**: Local filesystem with organized directory structure
- **Payment Processing**: Stripe integration
- **PDF Generation**: PDFKit
- **Email**: Nodemailer with SMTP/Gmail support

---

## Complete Feature List

### ✅ Core Features (Implemented)

#### User Management & Authentication
- **JWT-based Authentication**: Secure token-based login system
- **Role-based Access Control**: Admin and client roles with appropriate permissions
- **Session Management**: Persistent sessions with refresh tokens
- **Password Security**: bcrypt hashing with salt rounds
- **User Registration**: Admin-controlled client account creation
- **Profile Management**: User profile updates and avatar support

#### Project Management
- **Project Creation**: Comprehensive project setup with client assignment
- **Status Tracking**: Planning, in progress, review, completed, on hold, cancelled
- **Progress Monitoring**: Visual progress bars and milestone tracking
- **Project Milestones**: Deliverable tracking with due dates
- **Project Types**: Categorization (Brand Identity, Website Development, etc.)
- **Budget Management**: Budget tracking and currency support
- **Client Assignment**: Project-client relationship management

#### File Management System
- **Secure File Upload**: Multi-file upload with type and size validation
- **File Organization**: Project-based file organization
- **Version Control**: File versioning with parent-child relationships
- **Access Control**: Granular file permissions (view, download, edit, delete)
- **Download Tracking**: Monitor file access and download counts
- **File Metadata**: Rich metadata storage including descriptions
- **Bulk Operations**: Multiple file selection and batch operations

#### Real-time Messaging System
- **Live Messaging**: Real-time message delivery via Socket.io
- **Message Threading**: Conversation-based messaging
- **File Attachments**: Support for message attachments
- **Typing Indicators**: Real-time typing status
- **Presence Tracking**: Online/offline/away/busy status
- **Read Receipts**: Message read confirmations
- **Message Search**: Full-text search across conversations
- **Unread Counters**: Real-time unread message tracking
- **Broadcast Messages**: Admin announcements to all users

#### Invoice Management System
- **Invoice Creation**: Comprehensive invoice generation with line items
- **Status Workflow**: Draft → Sent → Paid → Overdue tracking
- **Stripe Integration**: Secure payment processing
- **PDF Generation**: Professional branded invoice PDFs
- **Email Notifications**: Automated invoice sending and payment confirmations
- **Tax Calculation**: Configurable tax rates and discount support
- **Payment Tracking**: Payment method and reference recording
- **Overdue Management**: Automated overdue detection and reminders
- **Revenue Analytics**: Statistics and reporting

#### Admin Portal
- **Dashboard Overview**: System statistics and activity monitoring
- **User Management**: Client account creation and management
- **Project Oversight**: All project visibility and management
- **Invoice Administration**: Complete invoice lifecycle management
- **File Management**: System-wide file access and organization
- **System Settings**: Configurable application settings
- **Activity Logging**: Comprehensive audit trail

#### Client Portal
- **Personal Dashboard**: Project overview and recent activity
- **Project Views**: Detailed project information and progress
- **File Access**: Secure file browsing and downloads
- **Message Center**: Communication with admin team
- **Invoice Portal**: View and pay invoices online
- **Profile Management**: Personal information updates

### 🔄 Real-time Features
- **Live Updates**: Real-time data synchronization
- **Push Notifications**: Instant notifications for important events
- **Presence System**: User online status tracking
- **Live Messaging**: Instant message delivery
- **Activity Feeds**: Real-time activity updates
- **Connection Monitoring**: WebSocket connection status tracking

### 📊 Analytics & Reporting
- **Revenue Tracking**: Total revenue and pending amounts
- **Invoice Statistics**: Status-based invoice counts
- **Project Analytics**: Progress and completion metrics
- **User Activity**: Login and interaction tracking
- **File Usage**: Upload and download statistics
- **System Health**: Performance and error monitoring

---

## Environment Variables

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgresql://username:password@localhost:5432/kendrick_portal_prod
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kendrick_portal_prod
DB_USER=your_db_username
DB_PASSWORD=your_secure_db_password

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-256-bits-minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# =============================================================================
# STRIPE PAYMENT PROCESSING
# =============================================================================
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# =============================================================================
# EMAIL CONFIGURATION (Choose one method)
# =============================================================================

# Method 1: Gmail SMTP
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Method 2: Custom SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password

# General Email Settings
EMAIL_FROM=kendrick@kendrickforrest.com

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,zip

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
SESSION_SECRET=your-session-secret-key
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=100        # Max requests per window

# =============================================================================
# MONITORING & LOGGING
# =============================================================================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
ENABLE_REQUEST_LOGGING=true

# =============================================================================
# REDIS (Optional - for production scaling)
# =============================================================================
REDIS_URL=redis://localhost:6379
REDIS_SESSION_PREFIX=kf_portal_session:
```

### Environment-Specific Configurations

#### Development Environment
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DB_NAME=kendrick_portal_dev
LOG_LEVEL=debug
```

#### Staging Environment
```bash
NODE_ENV=staging
FRONTEND_URL=https://staging.your-domain.com
DB_NAME=kendrick_portal_staging
LOG_LEVEL=info
```

#### Production Environment
```bash
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
DB_NAME=kendrick_portal_prod
LOG_LEVEL=warn
```

---

## Database Setup

### PostgreSQL Installation & Configuration

#### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Create Database and User
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE kendrick_portal_prod;

# Create user with secure password
CREATE USER kf_portal_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kendrick_portal_prod TO kf_portal_user;

# Grant schema privileges
\c kendrick_portal_prod
GRANT ALL ON SCHEMA public TO kf_portal_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO kf_portal_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO kf_portal_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kf_portal_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kf_portal_user;

\q
```

#### 3. Run Database Migration
```bash
# Navigate to project directory
cd /path/to/kendrick-portal

# Run the initial schema migration
psql -d kendrick_portal_prod -U kf_portal_user -f migrations/001_initial_schema.sql

# Verify migration
psql -d kendrick_portal_prod -U kf_portal_user -c "\dt"
```

#### 4. Database Security Configuration
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/13/main/postgresql.conf

# Set these configurations:
listen_addresses = 'localhost'  # or specific IPs
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Add/modify these lines:
local   kendrick_portal_prod    kf_portal_user                md5
host    kendrick_portal_prod    kf_portal_user    127.0.0.1/32  md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Database Backup Setup
```bash
# Create backup script
cat > /opt/kf-portal-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/kf-portal"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="kendrick_portal_prod"
DB_USER="kf_portal_user"

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/kf-portal-backup.sh

# Add to crontab for daily backups at 2 AM
echo "0 2 * * * /opt/kf-portal-backup.sh" | crontab -
```

---

## Deployment Options

### Option 1: Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Git repository initialized

#### Steps
1. **Create Heroku App**
```bash
heroku create kendrick-forrest-portal
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
```

2. **Configure Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set JWT_REFRESH_SECRET=$(openssl rand -base64 32)
heroku config:set STRIPE_SECRET_KEY=sk_live_your_key
heroku config:set EMAIL_SERVICE=gmail
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
heroku config:set FRONTEND_URL=https://kendrick-forrest-portal.herokuapp.com
```

3. **Create Procfile**
```bash
echo "web: node server.js" > Procfile
```

4. **Deploy**
```bash
git add .
git commit -m "Production deployment"
git push heroku main

# Run database migration
heroku pg:psql < migrations/001_initial_schema.sql
```

### Option 2: AWS Deployment

#### EC2 Instance Setup
1. **Launch EC2 Instance**
   - Instance Type: t3.small or larger
   - OS: Ubuntu 20.04 LTS
   - Security Groups: HTTP (80), HTTPS (443), SSH (22)

2. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

3. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/yourusername/kendrick-portal.git
cd kendrick-portal

# Install dependencies
npm install --production

# Setup environment variables
cp .env.example .env
nano .env  # Configure production values

# Setup database
sudo -u postgres createdb kendrick_portal_prod
sudo -u postgres psql -c "CREATE USER kf_portal_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kendrick_portal_prod TO kf_portal_user;"
psql -d kendrick_portal_prod -U kf_portal_user -f migrations/001_initial_schema.sql

# Start with PM2
pm2 start server.js --name "kf-portal"
pm2 startup
pm2 save
```

4. **Nginx Configuration**
```bash
sudo nano /etc/nginx/sites-available/kf-portal

# Add configuration:
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/kf-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **SSL Certificate (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Option 3: DigitalOcean Deployment

#### Droplet Setup
1. **Create Droplet**
   - Size: 2GB RAM, 1 vCPU minimum
   - OS: Ubuntu 20.04 LTS
   - Add SSH key

2. **One-Click Setup Script**
```bash
#!/bin/bash
# DigitalOcean deployment script

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Setup deployment directory
mkdir -p /var/www/kf-portal
chown -R $USER:$USER /var/www/kf-portal

echo "Server setup complete. Deploy your application to /var/www/kf-portal"
```

#### DigitalOcean App Platform (Alternative)
```yaml
# app.yaml
name: kendrick-forrest-portal
services:
- name: web
  source_dir: /
  github:
    repo: yourusername/kendrick-portal
    branch: main
  run_command: node server.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
databases:
- engine: PG
  name: db
  num_nodes: 1
  size: db-s-dev-database
  version: "13"
```

### Option 4: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/documents uploads/images uploads/messages uploads/temp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/kendrick_portal
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  db:
    image: postgres:13-alpine
    environment:
      - POSTGRES_DB=kendrick_portal
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# Run database migration
docker-compose exec db psql -U postgres -d kendrick_portal -f /app/migrations/001_initial_schema.sql

# View logs
docker-compose logs -f app
```

---

## Security Considerations

### 1. Authentication & Authorization
- **JWT Security**: Use strong secrets (256-bit minimum)
- **Token Expiration**: Short-lived access tokens (15-30 minutes)
- **Refresh Tokens**: Secure refresh token rotation
- **Password Policy**: Enforce strong passwords with bcrypt (12+ rounds)
- **Session Management**: Secure session handling with HttpOnly cookies

### 2. API Security
- **Rate Limiting**: Implement per-IP and per-user rate limits
- **Input Validation**: Comprehensive input sanitization and validation
- **SQL Injection**: Use parameterized queries exclusively
- **CORS Configuration**: Restrict origins to known domains
- **Headers Security**: Implement security headers (Helmet.js)

### 3. File Security
- **Upload Restrictions**: Limit file types and sizes
- **File Scanning**: Virus scanning for uploaded files
- **Storage Security**: Secure file storage with proper permissions
- **Access Control**: Granular file access permissions
- **Path Traversal**: Prevent directory traversal attacks

### 4. Infrastructure Security
- **HTTPS Only**: Force HTTPS in production
- **Database Security**: Encrypted connections and limited access
- **Server Hardening**: Regular security updates and firewall configuration
- **Environment Variables**: Secure secret management
- **Monitoring**: Security event logging and monitoring

### 5. Production Security Checklist
```bash
# Generate secure JWT secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET

# Set secure file permissions
chmod 600 .env
chmod -R 755 uploads/
chown -R www-data:www-data uploads/

# Configure fail2ban for SSH protection
apt install fail2ban
systemctl enable fail2ban

# Setup automatic security updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
```

### 6. Security Headers Configuration
```javascript
// In server.js - Update Helmet configuration for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'", "js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "api.stripe.com"],
      frameSrc: ["js.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Performance Optimization

### 1. Database Optimization
```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_projects_client_status ON projects(client_id, status);
CREATE INDEX CONCURRENTLY idx_messages_conversation ON messages(sender_id, recipient_id, created_at);
CREATE INDEX CONCURRENTLY idx_files_project_active ON files(project_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_invoices_client_status ON invoices(client_id, status);

-- Query optimization
ANALYZE;
VACUUM ANALYZE;

-- Connection pooling configuration
-- In config/database.js, adjust pool settings based on load
const config = {
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait 5s for connection
  query_timeout: 10000,       // Query timeout 10s
  statement_timeout: 15000    // Statement timeout 15s
};
```

### 2. Caching Strategy
```javascript
// Implement Redis caching for frequent queries
import Redis from 'redis';
const redis = Redis.createClient(process.env.REDIS_URL);

// Cache user sessions
const cacheUserSession = async (userId, sessionData) => {
  await redis.setEx(`session:${userId}`, 3600, JSON.stringify(sessionData));
};

// Cache project data
const cacheProjectData = async (projectId, data) => {
  await redis.setEx(`project:${projectId}`, 300, JSON.stringify(data));
};
```

### 3. Frontend Optimization
```html
<!-- Optimize loading performance -->
<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="/script.js" as="script">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Lazy load images -->
<img src="placeholder.jpg" data-src="actual-image.jpg" loading="lazy" alt="Description">
```

### 4. Server Optimization
```javascript
// Compression middleware
import compression from 'compression';
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Static file caching
app.use(express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
```

### 5. WebSocket Optimization
```javascript
// Optimize Socket.io for production
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Use Redis adapter for scaling
import { createAdapter } from '@socket.io/redis-adapter';
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### 6. File Upload Optimization
```javascript
// Optimize multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.env.UPLOAD_PATH, getUploadFolder(file.mimetype));
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuid.v4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
    const fileExt = path.extname(file.originalname).slice(1).toLowerCase();
    cb(null, allowedTypes.includes(fileExt));
  }
});
```

---

## Monitoring Setup

### 1. Application Monitoring

#### PM2 Monitoring
```bash
# Install PM2 monitoring
npm install -g pm2

# Start application with monitoring
pm2 start server.js --name "kf-portal" --max-memory-restart 500M

# Monitor resources
pm2 monit

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

#### Log Management
```javascript
// Enhanced logging setup
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 2. Database Monitoring
```sql
-- Monitor database performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_tup_hot_upd,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables;

-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. Health Check Endpoints
```javascript
// Enhanced health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    checks: {}
  };

  try {
    // Database health
    const dbStart = Date.now();
    await query('SELECT 1');
    health.checks.database = {
      status: 'OK',
      responseTime: Date.now() - dbStart
    };

    // Redis health (if using Redis)
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      health.checks.redis = {
        status: 'OK',
        responseTime: Date.now() - redisStart
      };
    }

    // File system health
    const uploadsPath = process.env.UPLOAD_PATH || './uploads';
    const stats = await fs.promises.stat(uploadsPath);
    health.checks.filesystem = {
      status: 'OK',
      uploadsDirectory: stats.isDirectory()
    };

    res.json(health);
  } catch (error) {
    health.status = 'ERROR';
    health.error = error.message;
    res.status(503).json(health);
  }
});
```

### 4. Monitoring Dashboard Setup
```bash
# Install monitoring tools
npm install express-status-monitor

# Add to server.js
import statusMonitor from 'express-status-monitor';

app.use(statusMonitor({
  title: 'Kendrick Forrest Portal Monitor',
  path: '/status',
  spans: [{
    interval: 1,      // Every second
    retention: 60     // Keep 60 datapoints in memory
  }, {
    interval: 5,      // Every 5 seconds
    retention: 60
  }, {
    interval: 15,     // Every 15 seconds
    retention: 60
  }],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    responseTime: true,
    rps: true,
    statusCodes: true
  },
  healthChecks: [{
    protocol: 'http',
    host: 'localhost',
    path: '/api/health',
    port: '3000'
  }]
}));
```

### 5. Error Tracking
```javascript
// Error tracking middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id
  });

  // Send error to monitoring service (Sentry, etc.)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      status: err.status || 500
    }
  });
});
```

---

## Backup Procedures

### 1. Database Backup Strategy

#### Automated Daily Backups
```bash
#!/bin/bash
# /opt/scripts/kf-portal-backup.sh

set -e

# Configuration
BACKUP_DIR="/opt/backups/kf-portal"
LOG_FILE="/var/log/kf-portal-backup.log"
DB_NAME="kendrick_portal_prod"
DB_USER="kf_portal_user"
RETENTION_DAYS=30
S3_BUCKET="kf-portal-backups"  # Optional: S3 backup

# Create backup directory
mkdir -p $BACKUP_DIR

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting database backup..."

# Create database backup
if pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE; then
    log "Database backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
    log "Backup compressed: $BACKUP_FILE"
    
    # Upload to S3 (optional)
    if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/database/
        log "Backup uploaded to S3: s3://$S3_BUCKET/database/"
    fi
    
    # Clean old backups
    find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    log "Old backups cleaned (older than $RETENTION_DAYS days)"
    
    log "Database backup completed successfully"
else
    log "ERROR: Database backup failed"
    exit 1
fi
```

#### Backup Verification Script
```bash
#!/bin/bash
# /opt/scripts/verify-backup.sh

BACKUP_FILE=$1
TEST_DB="kendrick_portal_test_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Create test database
createdb $TEST_DB

# Restore backup
if zcat $BACKUP_FILE | psql -d $TEST_DB; then
    echo "✅ Backup verification successful"
    
    # Check table count
    TABLE_COUNT=$(psql -d $TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
    echo "Tables restored: $TABLE_COUNT"
    
    # Check sample data
    USER_COUNT=$(psql -d $TEST_DB -t -c "SELECT COUNT(*) FROM users;")
    echo "Users in backup: $USER_COUNT"
    
    dropdb $TEST_DB
    echo "Test database cleaned up"
else
    echo "❌ Backup verification failed"
    dropdb $TEST_DB 2>/dev/null
    exit 1
fi
```

### 2. File System Backup

#### Upload Directory Backup
```bash
#!/bin/bash
# /opt/scripts/files-backup.sh

UPLOADS_DIR="/var/www/kf-portal/uploads"
BACKUP_DIR="/opt/backups/kf-portal/files"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="files_backup_$TIMESTAMP.tar.gz"

mkdir -p $BACKUP_DIR

# Create compressed archive of uploads
tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$UPLOADS_DIR" .

# Verify backup
if tar -tzf "$BACKUP_DIR/$BACKUP_NAME" > /dev/null; then
    echo "Files backup created successfully: $BACKUP_NAME"
    
    # Upload to S3 (optional)
    if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_DIR/$BACKUP_NAME" s3://$S3_BUCKET/files/
    fi
    
    # Clean old file backups (keep 7 days)
    find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +7 -delete
else
    echo "Files backup verification failed"
    exit 1
fi
```

### 3. Application Code Backup
```bash
#!/bin/bash
# /opt/scripts/code-backup.sh

APP_DIR="/var/www/kf-portal"
BACKUP_DIR="/opt/backups/kf-portal/code"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Create code backup excluding node_modules and uploads
tar --exclude='node_modules' \
    --exclude='uploads' \
    --exclude='.git' \
    --exclude='logs' \
    -czf "$BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz" \
    -C "$APP_DIR" .

echo "Code backup created: code_backup_$TIMESTAMP.tar.gz"
```

### 4. Cron Job Setup
```bash
# Add to root crontab: crontab -e

# Daily database backup at 2 AM
0 2 * * * /opt/scripts/kf-portal-backup.sh

# Daily file backup at 3 AM
0 3 * * * /opt/scripts/files-backup.sh

# Weekly code backup on Sundays at 4 AM
0 4 * * 0 /opt/scripts/code-backup.sh

# Weekly backup verification on Mondays at 5 AM
0 5 * * 1 /opt/scripts/verify-backup.sh /opt/backups/kf-portal/db_backup_$(date -d 'yesterday' +\%Y\%m\%d)_*.sql.gz
```

### 5. Disaster Recovery Plan

#### Recovery Procedures
```bash
# 1. Database Recovery
createdb kendrick_portal_prod_new
zcat /path/to/backup.sql.gz | psql -d kendrick_portal_prod_new

# 2. Files Recovery
mkdir -p /var/www/kf-portal/uploads
tar -xzf /path/to/files_backup.tar.gz -C /var/www/kf-portal/uploads

# 3. Code Recovery
tar -xzf /path/to/code_backup.tar.gz -C /var/www/kf-portal
cd /var/www/kf-portal
npm install --production

# 4. Restart Services
pm2 restart kf-portal
systemctl restart nginx
```

#### Recovery Testing
- Monthly recovery drills
- Document recovery time objectives (RTO: 4 hours)
- Document recovery point objectives (RPO: 24 hours)
- Maintain updated contact information for emergencies

---

## API Documentation Summary

### Authentication Endpoints
```
POST /api/auth/register          - Register new client (admin only)
POST /api/auth/login            - User login
POST /api/auth/logout           - User logout
POST /api/auth/refresh          - Refresh access token
GET  /api/auth/me               - Get current user profile
PUT  /api/auth/profile          - Update user profile
POST /api/auth/change-password  - Change password
```

### Project Management
```
GET    /api/projects            - List user projects
GET    /api/projects/:id        - Get project details
POST   /api/projects            - Create project (admin only)
PUT    /api/projects/:id        - Update project
DELETE /api/projects/:id        - Delete project (admin only)
GET    /api/projects/:id/milestones - Get project milestones
POST   /api/projects/:id/milestones - Create milestone
PUT    /api/projects/:id/milestones/:milestoneId - Update milestone
```

### File Management
```
GET    /api/files              - List accessible files
GET    /api/files/:id          - Get file details
POST   /api/files/upload       - Upload files
GET    /api/files/:id/download - Download file
DELETE /api/files/:id          - Delete file
PUT    /api/files/:id/permissions - Update file permissions
```

### Messaging System
```
GET    /api/messages/conversations     - List conversations
GET    /api/messages/conversation/:userId - Get conversation history
POST   /api/messages/send             - Send message
PUT    /api/messages/:id/read          - Mark message as read
DELETE /api/messages/:id               - Delete message
GET    /api/messages/unread-count      - Get unread count
GET    /api/messages/search            - Search messages
POST   /api/messages/broadcast         - Broadcast message (admin only)
```

### Invoice Management
```
GET    /api/invoices           - List invoices
GET    /api/invoices/:id       - Get invoice details
POST   /api/invoices           - Create invoice (admin only)
PUT    /api/invoices/:id       - Update invoice (admin only)
POST   /api/invoices/:id/send  - Send invoice to client
POST   /api/invoices/:id/pay   - Process payment
GET    /api/invoices/:id/pdf   - Download invoice PDF
GET    /api/invoices/stats     - Get revenue statistics
```

### Client Management (Admin Only)
```
GET    /api/clients            - List all clients
GET    /api/clients/:id        - Get client details
POST   /api/clients            - Create client account
PUT    /api/clients/:id        - Update client information
DELETE /api/clients/:id        - Deactivate client account
```

### Real-time Events (Socket.io)
```
Client Events:
- join_conversation
- leave_conversation
- typing_start
- typing_stop
- presence_update
- mark_messages_read

Server Events:
- new_message
- message_sent
- message_read
- user_typing
- presence_update
- unread_count_updated
- notification
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Symptoms: "Database connection failed" errors
# Check database status
sudo systemctl status postgresql

# Check database connectivity
psql -d kendrick_portal_prod -U kf_portal_user -c "SELECT 1;"

# Check connection settings
cat .env | grep DB_

# Fix: Update connection parameters or restart PostgreSQL
sudo systemctl restart postgresql
```

#### 2. File Upload Problems
```bash
# Symptoms: File uploads failing
# Check upload directory permissions
ls -la uploads/
# Should show: drwxr-xr-x user user

# Fix permissions
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/

# Check disk space
df -h

# Check file size limits
grep MAX_FILE_SIZE .env
```

#### 3. Email Delivery Issues
```bash
# Test email configuration
node -e "
import('./utils/emailService.js').then(email => {
  email.sendTestEmail('test@example.com')
    .then(() => console.log('Email sent successfully'))
    .catch(err => console.error('Email failed:', err));
});
"

# Check email settings
grep EMAIL .env

# Common fixes:
# - Verify SMTP credentials
# - Check Gmail app password
# - Confirm firewall allows SMTP ports
```

#### 4. JWT Authentication Problems
```bash
# Symptoms: "Invalid token" errors
# Check JWT secret configuration
grep JWT_SECRET .env

# Verify token structure
node -e "
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
try {
  const decoded = jwt.decode(token);
  console.log('Token payload:', decoded);
} catch (err) {
  console.log('Invalid token format');
}
"

# Fix: Regenerate JWT secrets and restart app
```

#### 5. Socket.io Connection Issues
```bash
# Check WebSocket connectivity in browser console
# Expected: Connected to server
# Error: WebSocket connection failed

# Verify firewall allows WebSocket traffic
sudo ufw status

# Check Nginx WebSocket configuration
sudo nginx -t
grep -A 10 "proxy_set_header Upgrade" /etc/nginx/sites-available/kf-portal

# Fix: Update Nginx configuration for WebSocket support
```

#### 6. Payment Processing Errors
```bash
# Test Stripe configuration
node -e "
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  automatic_payment_methods: { enabled: true }
}).then(pi => console.log('Stripe working:', pi.id))
.catch(err => console.error('Stripe error:', err.message));
"

# Check webhook endpoint
curl -X POST https://your-domain.com/api/invoices/webhook/stripe \
  -H "stripe-signature: test" \
  -d "test payload"

# Verify webhook secret in Stripe dashboard
```

### Performance Issues

#### 1. Slow Database Queries
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public'
  AND n_distinct > 100;

-- Optimize with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM projects WHERE client_id = 'uuid-here';
```

#### 2. High Memory Usage
```bash
# Check application memory usage
pm2 monit

# Check Node.js heap usage
node -e "console.log(process.memoryUsage())"

# Monitor memory leaks
npm install -g clinic
clinic doctor -- node server.js
```

#### 3. High CPU Usage
```bash
# Check CPU usage per process
top -p $(pgrep -f "node server.js")

# Profile CPU usage
npm install -g clinic
clinic flame -- node server.js

# Check for infinite loops in logs
tail -f logs/app.log | grep -E "(while|for|loop)"
```

### Error Code Reference

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request format and parameters |
| 401 | Unauthorized | Verify authentication token |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Verify endpoint URL and resource existence |
| 413 | Payload Too Large | Check file size limits |
| 429 | Too Many Requests | Implement backoff strategy |
| 500 | Internal Server Error | Check server logs for details |
| 503 | Service Unavailable | Check database and external service connectivity |

---

## Maintenance Procedures

### Daily Maintenance
```bash
#!/bin/bash
# Daily maintenance script

# Check application health
curl -f http://localhost:3000/api/health || echo "Health check failed"

# Check disk space
df -h | awk '$5 > 80 { print "Warning: " $0 }'

# Check logs for errors
tail -100 /var/log/kf-portal/error.log | grep -E "(ERROR|FATAL)" || echo "No errors found"

# Update statistics
psql -d kendrick_portal_prod -c "ANALYZE;"
```

### Weekly Maintenance
```bash
#!/bin/bash
# Weekly maintenance script

# Update system packages (security only)
sudo apt update && sudo apt list --upgradable | grep -i security

# Rotate logs
pm2 flush kf-portal

# Vacuum database
psql -d kendrick_portal_prod -c "VACUUM ANALYZE;"

# Check backup integrity
/opt/scripts/verify-backup.sh /opt/backups/kf-portal/db_backup_$(date -d '1 day ago' +%Y%m%d)_*.sql.gz

# SSL certificate check
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

### Monthly Maintenance
```bash
#!/bin/bash
# Monthly maintenance script

# Full system update (schedule maintenance window)
sudo apt update && sudo apt upgrade -y

# Database maintenance
psql -d kendrick_portal_prod -c "REINDEX DATABASE kendrick_portal_prod;"

# Clean old uploads (if needed)
find /var/www/kf-portal/uploads/temp -mtime +7 -delete

# Security audit
npm audit --production
```

### Update Procedures

#### Application Updates
```bash
# 1. Backup current version
tar -czf kf-portal-backup-$(date +%Y%m%d).tar.gz /var/www/kf-portal

# 2. Pull latest changes
cd /var/www/kf-portal
git fetch origin
git checkout main
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Run database migrations (if any)
psql -d kendrick_portal_prod -U kf_portal_user -f migrations/new_migration.sql

# 5. Restart application
pm2 restart kf-portal

# 6. Verify deployment
curl -f http://localhost:3000/api/health
```

#### Node.js Updates
```bash
# Check current version
node --version

# Update Node.js (using nvm)
nvm install node --latest-npm
nvm use node

# Or update via package manager
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Test application after update
npm test
pm2 restart kf-portal
```

#### SSL Certificate Renewal
```bash
# Auto-renewal with certbot
sudo certbot renew --dry-run

# Manual renewal if needed
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Verify certificate
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

### Monitoring and Alerts Setup
```bash
# Setup basic monitoring alerts
cat > /opt/scripts/monitor-alerts.sh << 'EOF'
#!/bin/bash

# Check if application is running
if ! pgrep -f "node server.js" > /dev/null; then
    echo "ALERT: Application is not running" | mail -s "KF Portal Down" admin@example.com
fi

# Check database connectivity
if ! psql -d kendrick_portal_prod -c "SELECT 1;" > /dev/null 2>&1; then
    echo "ALERT: Database connection failed" | mail -s "KF Portal DB Issue" admin@example.com
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%" | mail -s "KF Portal Disk Warning" admin@example.com
fi
EOF

chmod +x /opt/scripts/monitor-alerts.sh

# Add to crontab to run every 5 minutes
echo "*/5 * * * * /opt/scripts/monitor-alerts.sh" | crontab -
```

---

## Production Readiness Checklist

### Pre-Deployment Checklist
- [ ] Environment variables configured securely
- [ ] Database migration completed successfully
- [ ] SSL certificate installed and configured
- [ ] Backup procedures implemented and tested
- [ ] Monitoring and alerting configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Error tracking implemented
- [ ] Performance optimizations applied
- [ ] Health check endpoints tested

### Security Checklist
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are secure
- [ ] File upload restrictions in place
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] Security headers configured

### Performance Checklist
- [ ] Database indexes optimized
- [ ] Caching strategy implemented
- [ ] Static file compression enabled
- [ ] Image optimization configured
- [ ] Connection pooling tuned
- [ ] Memory usage monitored
- [ ] CDN configured (if applicable)

### Operational Checklist
- [ ] Automated backups working
- [ ] Log rotation configured
- [ ] Process manager (PM2) configured
- [ ] Reverse proxy (Nginx) configured
- [ ] Firewall rules applied
- [ ] SSH access secured
- [ ] System updates automated
- [ ] Disaster recovery plan documented

---

## Support and Maintenance

### Contact Information
- **Technical Support**: kendrick@kendrickforrest.com
- **Emergency Contact**: [Phone number]
- **Documentation**: This file and related .md files in the repository

### Support Procedures
1. **Issue Reporting**: Create detailed issue reports with logs and reproduction steps
2. **Emergency Response**: 24-hour response time for critical issues
3. **Maintenance Windows**: Scheduled during low-traffic periods
4. **Communication**: Email notifications for planned maintenance

### Maintenance Schedule
- **Daily**: Automated backups, health checks, log monitoring
- **Weekly**: Security updates, performance analysis, backup verification
- **Monthly**: Full system updates, security audits, capacity planning
- **Quarterly**: Disaster recovery tests, security penetration testing

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-08-03  
**Next Review**: 2025-11-03

This production deployment guide provides comprehensive instructions for deploying, securing, monitoring, and maintaining the Kendrick Forrest Client Portal in a production environment. Regular updates to this documentation are recommended as the system evolves.