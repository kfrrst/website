-- Create forms_submissions table for storing dynamic form data
CREATE TABLE IF NOT EXISTS forms_submissions (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    form_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table for storing generated PDFs and documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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

-- Add phase tracking columns to projects table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'current_phase_key') THEN
        ALTER TABLE projects ADD COLUMN current_phase_key VARCHAR(50) DEFAULT 'ONB';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'projects' AND column_name = 'phase_metadata') THEN
        ALTER TABLE projects ADD COLUMN phase_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

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

-- Insert default phase requirements (only if they don't exist)
INSERT INTO phase_requirements (phase_key, requirement_type, requirement_text, sort_order) 
SELECT * FROM (VALUES
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
) AS v(phase_key, requirement_type, requirement_text, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM phase_requirements pr 
    WHERE pr.phase_key = v.phase_key 
    AND pr.requirement_type = v.requirement_type
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_submissions_project_id ON forms_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_client_id ON forms_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_form_id ON forms_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_sign_events_document_id ON sign_events(document_id);
CREATE INDEX IF NOT EXISTS idx_sign_events_project_id ON sign_events(project_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_forms_submissions_updated_at') THEN
        CREATE TRIGGER update_forms_submissions_updated_at BEFORE UPDATE ON forms_submissions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;