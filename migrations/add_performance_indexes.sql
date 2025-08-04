-- Performance Optimization Migration
-- Add indexes for better query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Clients table indexes  
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_current_phase_index ON projects(current_phase_index);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);

-- Compound index for project filtering and sorting
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at);
CREATE INDEX IF NOT EXISTS idx_projects_client_status ON projects(client_id, status);

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);

-- Compound indexes for invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read_status);

-- Compound index for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_client_id ON files(client_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_folder_path ON files(folder_path);

-- Compound index for file organization
CREATE INDEX IF NOT EXISTS idx_files_client_folder ON files(client_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_files_project_type ON files(project_id, mime_type);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Admin sessions table indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Activity logs table indexes (for analytics and debugging)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip_address ON activity_logs(ip_address);

-- Compound indexes for activity analysis
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created ON activity_logs(action, created_at);

-- Inquiries table indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_priority ON inquiries(priority);

-- Full-text search indexes (if supported by database)
-- For PostgreSQL
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON clients USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(company, '')));
CREATE INDEX IF NOT EXISTS idx_projects_name_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- For MySQL (if using MySQL instead)
-- ALTER TABLE clients ADD FULLTEXT(first_name, last_name, company);
-- ALTER TABLE projects ADD FULLTEXT(name, description);

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid ON invoices(due_date) WHERE status IN ('sent', 'overdue');
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(created_at) WHERE read_status = false;

-- Performance monitoring views
CREATE OR REPLACE VIEW project_performance_summary AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.current_phase_index,
    c.first_name || ' ' || c.last_name as client_name,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT f.id) as file_count,
    COUNT(DISTINCT i.id) as invoice_count,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN messages m ON m.conversation_id IN (
    SELECT id FROM conversations WHERE project_id = p.id
)
LEFT JOIN files f ON f.project_id = p.id
LEFT JOIN invoices i ON i.project_id = p.id
GROUP BY p.id, p.name, p.status, p.current_phase_index, c.first_name, c.last_name, p.created_at, p.updated_at;

-- Client activity summary view
CREATE OR REPLACE VIEW client_activity_summary AS
SELECT 
    c.id,
    c.first_name || ' ' || c.last_name as client_name,
    c.email,
    c.status,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
    COUNT(DISTINCT i.id) as invoice_count,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN i.status IN ('sent', 'overdue') THEN i.total_amount END), 0) as outstanding_amount,
    MAX(p.updated_at) as last_project_activity,
    c.created_at
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
LEFT JOIN invoices i ON i.client_id = c.id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.status, c.created_at;

-- Query performance monitoring
-- Create a table to track slow queries (optional)
CREATE TABLE IF NOT EXISTS query_performance_log (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(32) NOT NULL,
    query_text TEXT,
    execution_time_ms INTEGER NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_query_perf_hash ON query_performance_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_perf_time ON query_performance_log(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_query_perf_executed ON query_performance_log(executed_at);

-- Database maintenance helper functions
CREATE OR REPLACE FUNCTION update_project_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Update search vector when project data changes
    NEW.search_vector := to_tsvector('english', NEW.name || ' ' || COALESCE(NEW.description, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vectors
DROP TRIGGER IF EXISTS update_project_search_trigger ON projects;
CREATE TRIGGER update_project_search_trigger
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_project_search_vector();

-- ANALYZE tables for query planner optimization
ANALYZE users;
ANALYZE clients; 
ANALYZE projects;
ANALYZE invoices;
ANALYZE messages;
ANALYZE conversations;
ANALYZE files;
ANALYZE sessions;
ANALYZE admin_sessions;
ANALYZE activity_logs;
ANALYZE inquiries;