-- Add Inquiries Table Migration
-- Migration: 002_add_inquiries_table.sql
-- Created: 2025-08-03

-- =============================================================================
-- INQUIRIES TABLE
-- =============================================================================
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(200),
    project_type VARCHAR(50) NOT NULL CHECK (project_type IN ('branding', 'web-design', 'print', 'packaging', 'consultation', 'other')),
    budget_range VARCHAR(20) NOT NULL CHECK (budget_range IN ('under-5k', '5k-10k', '10k-25k', '25k-50k', 'over-50k')),
    timeline VARCHAR(20) NOT NULL CHECK (timeline IN ('rush', 'standard', 'extended', 'ongoing')),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'contacted', 'converted', 'closed')),
    admin_notes TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_inquiries_email ON inquiries(email);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_project_type ON inquiries(project_type);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX idx_inquiries_budget_range ON inquiries(budget_range);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add inquiry view for admin dashboard
CREATE VIEW inquiry_summary AS
SELECT 
    id,
    name,
    email,
    company,
    project_type,
    budget_range,
    timeline,
    status,
    LEFT(message, 100) || CASE WHEN LENGTH(message) > 100 THEN '...' ELSE '' END AS message_preview,
    created_at,
    updated_at,
    CASE 
        WHEN status = 'new' AND created_at > NOW() - INTERVAL '1 day' THEN 'new'
        WHEN status = 'new' AND created_at <= NOW() - INTERVAL '1 day' THEN 'needs_attention'
        ELSE status
    END AS priority_status
FROM inquiries
ORDER BY created_at DESC;

-- Log the migration completion
INSERT INTO activity_log (entity_type, action, description, metadata)
VALUES ('system', 'migration_applied', 'Added inquiries table and related indexes', '{"migration": "002_add_inquiries_table.sql", "version": "1.1.0"}');

-- Display completion message
SELECT 'Inquiries table created successfully!' AS status,
       'inquiries table and indexes added' AS details,
       CURRENT_TIMESTAMP AS created_at;