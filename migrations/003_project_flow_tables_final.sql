-- Create forms_submissions table for storing dynamic form data
CREATE TABLE IF NOT EXISTS forms_submissions (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    form_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- documents table already exists, skip creation

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_submissions_project_id ON forms_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_user_id ON forms_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_submissions_form_id ON forms_submissions(form_id);
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