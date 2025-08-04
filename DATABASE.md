# Kendrick Forrest Client Portal - Database Documentation

## Overview

The [RE]Print Studios Client Portal uses PostgreSQL as its primary database system. This document outlines the database schema, setup instructions, and usage guidelines.

## Database Setup

### Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 18+ with npm

### Initial Setup

1. **Create Development Database**
   ```bash
   createdb kendrick_portal_dev
   ```

2. **Run Migration**
   ```bash
   psql -d kendrick_portal_dev -f migrations/001_initial_schema.sql
   ```

3. **Install Node.js Dependencies**
   ```bash
   npm install pg @types/pg
   ```

4. **Test Connection**
   ```bash
   node test-db.js
   ```

## Database Schema

### Core Tables

#### 1. Users (`users`)
- **Purpose**: Stores user accounts (clients and admin)
- **Key Fields**: `id`, `email`, `password_hash`, `first_name`, `last_name`, `role`
- **Roles**: `admin`, `client`
- **Sample Data**: Admin user (kendrick@kendrickforrest.com) and sample client

#### 2. Projects (`projects`)
- **Purpose**: Manages client projects and their details
- **Key Fields**: `id`, `client_id`, `name`, `status`, `progress_percentage`, `due_date`
- **Status Options**: `planning`, `in_progress`, `review`, `completed`, `on_hold`, `cancelled`
- **Relationships**: Belongs to a user (client)

#### 3. Project Milestones (`project_milestones`)
- **Purpose**: Tracks project milestones and deliverables
- **Key Fields**: `id`, `project_id`, `name`, `due_date`, `is_completed`
- **Relationships**: Belongs to a project

#### 4. Files (`files`)
- **Purpose**: Manages file uploads and sharing
- **Key Fields**: `id`, `project_id`, `uploader_id`, `original_name`, `file_path`, `file_size`
- **Features**: File versioning, access control, download tracking
- **Relationships**: Belongs to a project and uploaded by a user

#### 5. File Permissions (`file_permissions`)
- **Purpose**: Controls file access permissions
- **Key Fields**: `id`, `file_id`, `user_id`, `permission_type`
- **Permission Types**: `view`, `download`, `edit`, `delete`

#### 6. Messages (`messages`)
- **Purpose**: Internal messaging system between clients and admin
- **Key Fields**: `id`, `sender_id`, `recipient_id`, `subject`, `content`, `is_read`
- **Features**: Message threading, attachments (JSON), priority levels
- **Types**: `general`, `project_update`, `approval_request`, `file_share`, `invoice_related`

#### 7. Invoices (`invoices`)
- **Purpose**: Manages billing and invoicing
- **Key Fields**: `id`, `client_id`, `invoice_number`, `total_amount`, `status`, `due_date`
- **Status Options**: `draft`, `sent`, `viewed`, `paid`, `overdue`, `cancelled`
- **Features**: Tax calculation, payment tracking, Stripe integration ready

#### 8. Invoice Line Items (`invoice_line_items`)
- **Purpose**: Detailed breakdown of invoice items
- **Key Fields**: `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `line_total`

#### 9. Activity Log (`activity_log`)
- **Purpose**: Comprehensive audit trail
- **Key Fields**: `id`, `user_id`, `entity_type`, `action`, `description`, `metadata`
- **Tracks**: All user actions, system events, file operations

#### 10. Notifications (`notifications`)
- **Purpose**: User notification system
- **Key Fields**: `id`, `user_id`, `type`, `title`, `content`, `is_read`
- **Types**: Project updates, new messages, invoice notifications, file uploads

#### 11. User Sessions (`user_sessions`)
- **Purpose**: Manages user authentication sessions
- **Key Fields**: `id`, `user_id`, `session_token`, `expires_at`, `ip_address`
- **Features**: Session tracking, refresh tokens, security monitoring

#### 12. System Settings (`system_settings`)
- **Purpose**: Application configuration
- **Key Fields**: `id`, `setting_key`, `setting_value`, `setting_type`, `is_public`
- **Types**: `string`, `number`, `boolean`, `json`

### Database Views

#### 1. Project Overview (`project_overview`)
- Combines project and client information
- Includes file counts and message counts
- Used for dashboard and project listings

#### 2. Recent Activity (`recent_activity`)
- Shows formatted activity log with user names
- Includes project context
- Ordered by creation date

#### 3. Invoice Summary (`invoice_summary`)
- Invoice details with client information
- Payment status calculation
- Project association

### Database Features

#### 1. UUID Primary Keys
- All tables use UUID primary keys for better security and distributed systems support
- Uses `uuid-ossp` extension for generation

#### 2. Automatic Timestamps
- `created_at` and `updated_at` timestamps on relevant tables
- Automatic `updated_at` triggers for data modification tracking

#### 3. Indexes
- Strategic indexes for performance optimization
- Covers common query patterns (email lookups, project filtering, etc.)

#### 4. Data Integrity
- Foreign key constraints maintain referential integrity
- Check constraints ensure valid enum values
- Unique constraints prevent duplicates

#### 5. JSON Support
- JSONB fields for flexible metadata storage
- Used for message attachments, activity metadata, notification data

## Environment Configuration

### Required Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://username@localhost:5432/kendrick_portal_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kendrick_portal_dev
DB_USER=username
DB_PASSWORD=password
```

## Database Connection

### Using the Database Module

```javascript
import { query, testConnection } from './config/database.js';

// Test connection
await testConnection();

// Execute query
const result = await query('SELECT * FROM users WHERE role = $1', ['client']);

// Handle transactions
import { beginTransaction, commitTransaction, rollbackTransaction } from './config/database.js';

const client = await beginTransaction();
try {
  await client.query('INSERT INTO projects (name, client_id) VALUES ($1, $2)', [name, clientId]);
  await client.query('INSERT INTO activity_log (action, description) VALUES ($1, $2)', ['created', 'Project created']);
  await commitTransaction(client);
} catch (error) {
  await rollbackTransaction(client);
  throw error;
}
```

## Sample Data

The migration includes sample data:

1. **Admin User**
   - Email: `kendrick@kendrickforrest.com`
   - Password: `admin123` (hashed with bcrypt)
   - Role: `admin`

2. **Sample Client**
   - Email: `client@example.com`
   - Password: `client123` (hashed with bcrypt)
   - Role: `client`
   - Company: `Example Corp`

3. **System Settings**
   - Site configuration
   - File upload limits
   - Session timeout settings

## Security Considerations

1. **Password Hashing**: Uses bcrypt with salt rounds
2. **Session Management**: JWT tokens with expiration
3. **Input Validation**: Parameterized queries prevent SQL injection
4. **Role-Based Access**: Admin and client roles with appropriate permissions
5. **Audit Trail**: Complete activity logging for security monitoring

## Backup and Maintenance

### Regular Backups
```bash
# Create backup
pg_dump kendrick_portal_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql kendrick_portal_dev < backup_file.sql
```

### Database Maintenance
- Regular `VACUUM` and `ANALYZE` operations
- Monitor connection pool usage
- Review slow query logs
- Update statistics for query optimization

## Development Workflow

1. **Schema Changes**: Create new migration files in `migrations/` directory
2. **Testing**: Use `test-db.js` to verify database operations
3. **Seeding**: Add sample data as needed for development
4. **Documentation**: Update this file with schema changes

## Production Considerations

1. **Environment Variables**: Use secure values in production
2. **SSL Connections**: Enable SSL for production database connections
3. **Connection Pooling**: Adjust pool settings based on load
4. **Monitoring**: Set up database monitoring and alerting
5. **Backups**: Implement automated backup strategies

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify PostgreSQL is running: `pg_isready`
   - Check connection parameters in `.env`
   - Ensure database exists: `psql -l`

2. **Permission Errors**
   - Verify user has database access
   - Check role permissions in PostgreSQL

3. **Migration Errors**
   - Review SQL syntax in migration files
   - Check for conflicting constraints
   - Verify required extensions are available

### Performance Optimization

1. **Query Analysis**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM projects WHERE client_id = 'uuid';
   ```

2. **Index Usage**
   ```sql
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats WHERE tablename = 'your_table';
   ```

3. **Connection Monitoring**
   ```sql
   SELECT * FROM pg_stat_activity WHERE datname = 'kendrick_portal_dev';
   ```

## Contact

For database-related questions or issues, contact the development team or refer to the main project documentation.