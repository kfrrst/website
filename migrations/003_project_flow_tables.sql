-- Create forms_submissions table for storing dynamic form data
CREATE TABLE IF NOT EXISTS forms_submissions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    form_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table for storing generated PDFs and documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    storage_url TEXT,
    file_path TEXT,
    sha256 VARCHAR(64),
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sign_events table for electronic signatures
CREATE TABLE IF NOT EXISTS sign_events (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    signer_role VARCHAR(50) NOT NULL,
    signer_name VARCHAR(255),
    signer_email VARCHAR(255),
    method VARCHAR(50) NOT NULL, -- 'typed', 'drawn', 'external'
    signature_data TEXT, -- Base64 encoded signature image or typed name
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_phases table for tracking phase progression
CREATE TABLE IF NOT EXISTS project_phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_key VARCHAR(50) NOT NULL, -- 'ONB', 'IDEA', 'DSGN', 'REV', 'PROD', 'PAY', 'SIGN', 'LAUNCH'
    phase_name VARCHAR(100) NOT NULL,
    phase_index INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, phase_key)
);

-- Create phase_requirements table for client action requirements
CREATE TABLE IF NOT EXISTS phase_requirements (
    id SERIAL PRIMARY KEY,
    phase_key VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(100) NOT NULL,
    requirement_text TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default phase requirements
INSERT INTO phase_requirements (phase_key, requirement_type, requirement_text, sort_order) VALUES
-- Onboarding requirements
('ONB', 'form', 'Complete intake form', 1),
('ONB', 'document', 'Sign service agreement', 2),
('ONB', 'payment', 'Submit deposit payment', 3),
-- Ideation requirements
('IDEA', 'review', 'Review creative brief', 1),
('IDEA', 'approval', 'Approve creative direction', 2),
-- Design requirements
('DSGN', 'review', 'Review initial designs', 1),
('DSGN', 'feedback', 'Provide feedback on designs', 2),
-- Review requirements
('REV', 'approval', 'Approve final designs', 1),
('REV', 'proof', 'Sign proof approval (for print)', 2),
-- Production requirements
('PROD', 'check', 'Press check approval (optional)', 1),
-- Payment requirements
('PAY', 'payment', 'Submit final payment', 1),
-- Sign-off requirements
('SIGN', 'document', 'Sign completion agreement', 1),
('SIGN', 'review', 'Download final assets', 2),
-- Launch requirements
('LAUNCH', 'confirm', 'Confirm delivery receipt', 1)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_submissions_project_id ON forms_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_client_id ON forms_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_form_id ON forms_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_sign_events_document_id ON sign_events(document_id);
CREATE INDEX IF NOT EXISTS idx_sign_events_project_id ON sign_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_phase_key ON project_phases(phase_key);
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status);

-- Create view for project phase overview
CREATE OR REPLACE VIEW project_phase_overview AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    p.progress_percentage,
    pp.phase_key,
    pp.phase_name,
    pp.phase_index,
    pp.status as phase_status,
    pp.started_at,
    pp.completed_at,
    CASE 
        WHEN pp.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600
        ELSE NULL
    END as duration_hours,
    pr.requirement_type,
    pr.requirement_text,
    pr.is_mandatory
FROM projects p
LEFT JOIN project_phases pp ON p.id = pp.project_id
LEFT JOIN phase_requirements pr ON pp.phase_key = pr.phase_key
ORDER BY p.id, pp.phase_index, pr.sort_order;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_submissions_updated_at BEFORE UPDATE ON forms_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();