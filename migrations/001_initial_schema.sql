-- [RE]Print Studios Client Portal Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2025-08-03

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    phone VARCHAR(20),
    company_name VARCHAR(200),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- =============================================================================
-- USER SESSIONS TABLE
-- =============================================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    budget_amount DECIMAL(10,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    project_type VARCHAR(100), -- e.g., 'Brand Identity', 'Website Development', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_due_date ON projects(due_date);
CREATE INDEX idx_projects_active ON projects(is_active);

-- =============================================================================
-- PROJECT MILESTONES TABLE
-- =============================================================================
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_milestones_due_date ON project_milestones(due_date);

-- =============================================================================
-- FILES TABLE
-- =============================================================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(500) NOT NULL,
    stored_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL, -- in bytes
    mime_type VARCHAR(100),
    file_type VARCHAR(50), -- e.g., 'image', 'document', 'video', 'other'
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- if true, accessible without login
    download_count INTEGER DEFAULT 0,
    version_number INTEGER DEFAULT 1,
    parent_file_id UUID REFERENCES files(id), -- for file versioning
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_uploader_id ON files(uploader_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_active ON files(is_active);
CREATE INDEX idx_files_parent ON files(parent_file_id);

-- =============================================================================
-- FILE PERMISSIONS TABLE
-- =============================================================================
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission_type IN ('view', 'download', 'edit', 'delete')),
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(file_id, user_id, permission_type)
);

CREATE INDEX idx_file_permissions_file_id ON file_permissions(file_id);
CREATE INDEX idx_file_permissions_user_id ON file_permissions(user_id);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general' CHECK (message_type IN ('general', 'project_update', 'approval_request', 'file_share', 'invoice_related')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id), -- for threading/replies
    attachments JSONB, -- store file references as JSON array
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(is_read);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =============================================================================
-- INVOICES TABLE
-- =============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,4) DEFAULT 0.0000, -- e.g., 0.0875 for 8.75%
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    terms TEXT,
    stripe_invoice_id VARCHAR(100), -- for Stripe integration
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- =============================================================================
-- INVOICE LINE ITEMS TABLE
-- =============================================================================
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_items_invoice_id ON invoice_line_items(invoice_id);

-- =============================================================================
-- ACTIVITY LOG TABLE
-- =============================================================================
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'project', 'file', 'message', 'invoice', etc.
    entity_id UUID,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'uploaded', 'downloaded', etc.
    description TEXT NOT NULL,
    metadata JSONB, -- additional context data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'project_update', 'message_received', 'invoice_generated', 'file_uploaded', etc.
    title VARCHAR(255) NOT NULL,
    content TEXT,
    action_url VARCHAR(500), -- link to relevant page/resource
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- =============================================================================
-- SYSTEM SETTINGS TABLE
-- =============================================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- if true, can be accessed by non-admin users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON system_settings(setting_key);
CREATE INDEX idx_settings_public ON system_settings(is_public);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON project_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA INSERTS
-- =============================================================================

-- Insert admin user (password: admin123 - should be changed in production)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, company_name)
VALUES ('kendrick@reprintstudios.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Kendrick', 'Forrest', 'admin', true, '[RE]Print Studios');

-- Insert sample client (password: client123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, company_name, phone)
VALUES ('client@example.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'John', 'Smith', 'client', true, 'Example Corp', '555-0123');

-- Insert sample system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
    ('site_name', '[RE]Print Studios Client Portal', 'string', 'Name of the client portal', true),
    ('admin_email', 'kendrick@reprintstudios.com', 'string', 'Primary admin email address', false),
    ('file_upload_max_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)', false),
    ('session_timeout_hours', '24', 'number', 'Session timeout in hours', false),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for project overview with client information
CREATE VIEW project_overview AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.priority,
    p.progress_percentage,
    p.budget_amount,
    p.budget_currency,
    p.start_date,
    p.due_date,
    p.project_type,
    u.first_name || ' ' || u.last_name AS client_name,
    u.email AS client_email,
    u.company_name,
    (SELECT COUNT(*) FROM files f WHERE f.project_id = p.id AND f.is_active = true) AS file_count,
    (SELECT COUNT(*) FROM messages m WHERE m.project_id = p.id) AS message_count,
    p.created_at,
    p.updated_at
FROM projects p
JOIN users u ON p.client_id = u.id
WHERE p.is_active = true;

-- View for recent activity with user information
CREATE VIEW recent_activity AS
SELECT 
    al.id,
    al.entity_type,
    al.entity_id,
    al.action,
    al.description,
    u.first_name || ' ' || u.last_name AS user_name,
    u.email AS user_email,
    u.role AS user_role,
    p.name AS project_name,
    al.created_at
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN projects p ON al.project_id = p.id
ORDER BY al.created_at DESC;

-- View for invoice summary with client information
CREATE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.title,
    i.status,
    i.total_amount,
    i.currency,
    i.issue_date,
    i.due_date,
    i.paid_date,
    u.first_name || ' ' || u.last_name AS client_name,
    u.email AS client_email,
    u.company_name,
    p.name AS project_name,
    CASE 
        WHEN i.status = 'paid' THEN 'Paid'
        WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN 'Overdue'
        ELSE 'Pending'
    END AS payment_status
FROM invoices i
JOIN users u ON i.client_id = u.id
LEFT JOIN projects p ON i.project_id = p.id
ORDER BY i.issue_date DESC;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Log the completion of the schema setup
INSERT INTO activity_log (entity_type, action, description, metadata)
VALUES ('system', 'schema_created', 'Initial database schema created successfully', '{"version": "1.0.0", "migration": "001_initial_schema.sql"}');

-- Display completion message
SELECT 'Database schema created successfully!' AS status,
       'kendrick_portal_dev' AS database_name,
       CURRENT_TIMESTAMP AS created_at;