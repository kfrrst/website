-- Database Cleanup Script
-- Generated: 2025-08-07T02:48:54.549Z

-- Tables safe to delete:
-- DROP TABLE IF EXISTS automation_notifications; -- System utility table with no data - can be recreated

-- Missing HIGH PRIORITY tables to create:

-- Phase automation rules (Referenced in automation service)
CREATE TABLE IF NOT EXISTS phase_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(255) NOT NULL,
    trigger_condition JSONB NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project phase tracking (Referenced in phase automation)  
CREATE TABLE IF NOT EXISTS project_phase_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL CHECK (phase_number >= 1 AND phase_number <= 8),
    phase_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting_client', 'needs_approval', 'approved', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, phase_number)
);

-- Missing MEDIUM PRIORITY tables:

-- Invoices for billing system
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    issued_date DATE DEFAULT CURRENT_DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    description TEXT,
    line_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phase_tracking_project_id ON project_phase_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_tracking_phase_number ON project_phase_tracking(phase_number);
CREATE INDEX IF NOT EXISTS idx_phase_tracking_status ON project_phase_tracking(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON phase_automation_rules(is_active);

-- Add updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_phase_automation_rules_updated_at 
    BEFORE UPDATE ON phase_automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phase_tracking_updated_at 
    BEFORE UPDATE ON project_phase_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recreate automation_notifications with better structure
DROP TABLE IF EXISTS automation_notifications;
CREATE TABLE automation_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_key VARCHAR(255) UNIQUE NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    recipient_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    data JSONB,
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_notifications_key ON automation_notifications(notification_key);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_type ON automation_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_processed ON automation_notifications(is_processed);

-- Insert default phase automation rules
INSERT INTO phase_automation_rules (rule_name, trigger_condition, action_type, action_config) VALUES
('Auto-advance planning to in_progress', 
 '{"phase": 1, "condition": "client_approval_received"}',
 'advance_phase', 
 '{"next_phase": 2, "notify_client": true}'),

('Send payment reminder', 
 '{"phase": 6, "condition": "payment_overdue"}',
 'send_notification', 
 '{"template": "payment_reminder", "delay_hours": 24}'),

('Project completion notification', 
 '{"phase": 8, "condition": "all_deliverables_approved"}',
 'complete_project', 
 '{"send_completion_email": true, "archive_files": false}')
ON CONFLICT DO NOTHING;

-- Optimize existing tables
VACUUM ANALYZE activity_log;
VACUUM ANALYZE files;
VACUUM ANALYZE messages;
VACUUM ANALYZE project_milestones;
VACUUM ANALYZE projects;
VACUUM ANALYZE user_sessions;
VACUUM ANALYZE users;