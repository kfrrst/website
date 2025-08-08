-- =============================================================================
-- RE PRINT STUDIOS - COMPLETE DATABASE SCHEMA
-- Migration: 002_complete_schema.sql
-- Purpose: Add all missing tables for production-ready system
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================================================
-- CLIENTS TABLE (Separate from users for better organization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    website VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    annual_revenue DECIMAL(15,2),
    tax_id VARCHAR(50),
    billing_email VARCHAR(255),
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    time_zone VARCHAR(50) DEFAULT 'America/New_York',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    stripe_customer_id VARCHAR(255),
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCE USERS TABLE (Add client_id foreign key)
-- =============================================================================
-- Add client_id to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- =============================================================================
-- PROJECT CATEGORIES & TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_hex VARCHAR(7) DEFAULT '#0057FF',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES project_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_phases JSONB, -- Default phase configuration
    estimated_duration_days INTEGER,
    base_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCE PROJECTS TABLE
-- =============================================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES project_categories(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type_id UUID REFERENCES project_types(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);

-- =============================================================================
-- CLIENT ACTIONS & REQUIREMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phase_tracking(id),
    action_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    is_required BOOLEAN DEFAULT true,
    due_date DATE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'overdue')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENHANCED INVOICING SYSTEM
-- =============================================================================
-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment tracking
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- EMAIL SYSTEM TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB, -- Available template variables
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_id UUID REFERENCES email_templates(id),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- NOTIFICATION SYSTEM
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    project_id UUID REFERENCES projects(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_email_sent BOOLEAN DEFAULT false,
    is_push_sent BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FILE CATEGORIES & TAGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS file_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    allowed_extensions TEXT[], -- Array of allowed file extensions
    max_file_size BIGINT, -- Max file size in bytes
    color_hex VARCHAR(7) DEFAULT '#666666',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color_hex VARCHAR(7) DEFAULT '#0057FF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, tag_id)
);

-- Add category to files
ALTER TABLE files ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES file_categories(id);

-- =============================================================================
-- TIME TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    task_description TEXT NOT NULL,
    hours DECIMAL(8,2) NOT NULL CHECK (hours > 0),
    hourly_rate DECIMAL(8,2),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_billable BOOLEAN DEFAULT true,
    is_invoiced BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PROJECT COLLABORATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB, -- Specific permissions for this project
    hourly_rate DECIMAL(8,2),
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, user_id)
);

-- =============================================================================
-- ENHANCED MESSAGING SYSTEM
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'feedback', 'approval', 'issue', 'announcement')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    created_by UUID NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMP WITH TIME ZONE,
    participant_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB;

-- Message participants
CREATE TABLE IF NOT EXISTS message_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES messages(id),
    last_read_at TIMESTAMP WITH TIME ZONE,
    notification_preference VARCHAR(50) DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(thread_id, user_id)
);

-- =============================================================================
-- SYSTEM CONFIGURATION & SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can be accessed by frontend
    category VARCHAR(50) DEFAULT 'general',
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- AUDIT ENHANCED
-- =============================================================================
-- Add more fields to activity_log
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- =============================================================================
-- AUTOMATION ENHANCEMENTS
-- =============================================================================
-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES phase_automation_rules(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    trigger_data JSONB NOT NULL,
    execution_result JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Enhanced Users
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);

-- Project Categories & Types
CREATE INDEX IF NOT EXISTS idx_project_categories_active ON project_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_project_types_category_id ON project_types(category_id);
CREATE INDEX IF NOT EXISTS idx_project_types_active ON project_types(is_active);

-- Enhanced Projects
CREATE INDEX IF NOT EXISTS idx_projects_category_id ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_type_id ON projects(project_type_id);

-- Client Actions
CREATE INDEX IF NOT EXISTS idx_client_actions_project_id ON client_actions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_actions_status ON client_actions(status);
CREATE INDEX IF NOT EXISTS idx_client_actions_due_date ON client_actions(due_date);

-- Invoice Items & Payments
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Email System
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Files Enhanced
CREATE INDEX IF NOT EXISTS idx_files_category_id ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_file_id ON file_tag_assignments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tag_assignments_tag_id ON file_tag_assignments(tag_id);

-- Time Tracking
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(is_billable);

-- Project Team
CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team_members(user_id);

-- Enhanced Messaging
CREATE INDEX IF NOT EXISTS idx_message_threads_project_id ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_status ON message_threads(status);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_user_id ON message_participants(user_id);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- Automation
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule_id ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_project_id ON automation_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_projects_name_search ON projects USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_company_search ON clients USING gin(company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(content gin_trgm_ops);

-- =============================================================================
-- TRIGGER FUNCTIONS FOR UPDATED_AT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_actions_updated_at BEFORE UPDATE ON client_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_threads_updated_at BEFORE UPDATE ON message_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DEFAULT DATA INSERTS
-- =============================================================================

-- Default project categories
INSERT INTO project_categories (name, description, color_hex, icon) VALUES
('Branding', 'Logo design, brand identity, style guides', '#E63946', 'palette'),
('Print Design', 'Brochures, flyers, business cards, posters', '#F7C600', 'print'),
('Digital Design', 'Web graphics, social media, digital ads', '#0057FF', 'monitor'),
('Packaging', 'Product packaging, labels, boxes', '#27AE60', 'package'),
('Marketing', 'Campaign materials, advertisements', '#9B59B6', 'megaphone'),
('Publications', 'Books, magazines, newsletters', '#F39C12', 'book-open'),
('Signage', 'Signs, banners, displays', '#E67E22', 'map-pin'),
('Custom', 'Custom design projects', '#95A5A6', 'star')
ON CONFLICT (name) DO NOTHING;

-- Default project types
INSERT INTO project_types (category_id, name, description, estimated_duration_days, base_price) 
SELECT 
    c.id,
    type_data.name,
    type_data.description,
    type_data.duration,
    type_data.price
FROM project_categories c
CROSS JOIN (
    VALUES 
    ('Branding', 'Logo Design', 'Complete logo design with variations', 7, 1500.00),
    ('Branding', 'Brand Identity Package', 'Logo, colors, fonts, style guide', 14, 3500.00),
    ('Print Design', 'Business Card Design', 'Professional business card design', 3, 250.00),
    ('Print Design', 'Brochure Design', 'Tri-fold or bi-fold brochure', 5, 750.00),
    ('Digital Design', 'Website Graphics', 'Web graphics and UI elements', 7, 1200.00),
    ('Digital Design', 'Social Media Package', 'Templates for social media posts', 5, 800.00)
) AS type_data(category, name, description, duration, price)
WHERE c.name = type_data.category
ON CONFLICT DO NOTHING;

-- Default file categories
INSERT INTO file_categories (name, description, allowed_extensions, max_file_size, color_hex, icon) VALUES
('Images', 'Photos, graphics, and image files', ARRAY['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'], 10485760, '#E63946', 'image'),
('Documents', 'PDFs, Word docs, and text files', ARRAY['pdf', 'doc', 'docx', 'txt', 'rtf'], 52428800, '#0057FF', 'file-text'),
('Design Files', 'Adobe and design software files', ARRAY['ai', 'psd', 'sketch', 'fig', 'xd'], 104857600, '#9B59B6', 'layers'),
('Archives', 'Compressed and archive files', ARRAY['zip', 'rar', '7z', 'tar'], 104857600, '#95A5A6', 'archive'),
('Videos', 'Video files and animations', ARRAY['mp4', 'mov', 'avi', 'mkv'], 524288000, '#F39C12', 'video'),
('Audio', 'Sound files and recordings', ARRAY['mp3', 'wav', 'aac', 'm4a'], 52428800, '#27AE60', 'volume-2')
ON CONFLICT (name) DO NOTHING;

-- Default file tags
INSERT INTO file_tags (name, color_hex) VALUES
('Final', '#27AE60'),
('Draft', '#F39C12'),
('Review', '#E63946'),
('Approved', '#0057FF'),
('Client Provided', '#9B59B6'),
('High Priority', '#E74C3C'),
('Archive', '#95A5A6')
ON CONFLICT (name) DO NOTHING;

-- Default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, category, is_system) VALUES
('project_welcome', 'Welcome to Your New Project: {{project_name}}', 
'<h1>Welcome {{client_name}}!</h1><p>Your project "{{project_name}}" has been created and we''re excited to get started.</p>', 
'Welcome {{client_name}}! Your project "{{project_name}}" has been created and we''re excited to get started.',
'project', true),
('phase_completed', 'Phase {{phase_number}} Completed: {{project_name}}', 
'<h1>Phase {{phase_number}} Complete!</h1><p>We''ve completed {{phase_name}} for your project "{{project_name}}".</p>',
'Phase {{phase_number}} Complete! We''ve completed {{phase_name}} for your project "{{project_name}}".',
'phase', true),
('invoice_sent', 'Invoice #{{invoice_number}} - {{project_name}}', 
'<h1>New Invoice</h1><p>Please find attached invoice #{{invoice_number}} for ${{amount}}.</p>',
'New Invoice: Please find attached invoice #{{invoice_number}} for ${{amount}}.',
'invoice', true)
ON CONFLICT (name) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (key, value, value_type, description, category) VALUES
('company_name', 'RE Print Studios', 'string', 'Company name', 'branding'),
('company_email', 'hello@reprintstudios.com', 'string', 'Main company email', 'contact'),
('company_phone', '+1 (555) 123-4567', 'string', 'Main company phone', 'contact'),
('default_currency', 'USD', 'string', 'Default currency for invoicing', 'financial'),
('default_payment_terms', '30', 'number', 'Default payment terms in days', 'financial'),
('max_file_upload_size', '104857600', 'number', 'Maximum file upload size in bytes (100MB)', 'system'),
('project_auto_archive_days', '90', 'number', 'Auto-archive completed projects after X days', 'system'),
('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications', 'notifications'),
('require_client_approval', 'true', 'boolean', 'Require client approval for phase advancement', 'workflow')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VACUUM AND ANALYZE ALL TABLES
-- =============================================================================
VACUUM ANALYZE;