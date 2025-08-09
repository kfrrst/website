-- Phase Requirements Tracking System
-- This migration creates tables for tracking phase requirements and their completion status

-- Table to store all possible phase requirements
CREATE TABLE IF NOT EXISTS phase_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key VARCHAR(10) NOT NULL,
  requirement_type VARCHAR(50) NOT NULL, -- form, agreement, payment, review, approval, etc.
  requirement_text TEXT NOT NULL,
  requirement_key VARCHAR(100), -- unique key for programmatic reference (e.g., 'intake_form')
  is_mandatory BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track completion of requirements for each project
CREATE TABLE IF NOT EXISTS project_phase_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES phase_requirements(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}', -- Store form_id, file_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, requirement_id)
);

-- Insert default phase requirements for all 8 phases
INSERT INTO phase_requirements (phase_key, requirement_type, requirement_text, requirement_key, is_mandatory, sort_order) VALUES 
-- Onboarding (ONB)
('ONB', 'form', 'Complete intake form', 'intake_form', true, 1),
('ONB', 'agreement', 'Sign service agreement', 'service_agreement', true, 2),
('ONB', 'payment', 'Pay deposit invoice', 'deposit_payment', true, 3),

-- Ideation (IDEA)
('IDEA', 'review', 'Review creative brief', 'review_brief', true, 1),
('IDEA', 'approval', 'Approve project direction', 'approve_direction', true, 2),
('IDEA', 'feedback', 'Provide initial feedback', 'initial_feedback', false, 3),

-- Design (DSGN)
('DSGN', 'review', 'Review initial designs', 'review_designs', false, 1),
('DSGN', 'feedback', 'Provide design feedback', 'design_feedback', false, 2),
('DSGN', 'approval', 'Approve final designs', 'approve_designs', true, 3),

-- Review & Feedback (REV)
('REV', 'approval', 'Approve all deliverables', 'approve_deliverables', true, 1),
('REV', 'proof', 'Complete proof approval (if print)', 'proof_approval', false, 2),
('REV', 'feedback', 'Request changes (if needed)', 'request_changes', false, 3),

-- Production/Build (PROD)
('PROD', 'monitor', 'Monitor production progress', 'monitor_production', false, 1),
('PROD', 'check', 'Approve press check (if applicable)', 'press_check', false, 2),

-- Payment (PAY)
('PAY', 'payment', 'Pay final invoice', 'final_payment', true, 1),
('PAY', 'review', 'Review final costs', 'review_costs', false, 2),

-- Sign-off & Docs (SIGN)
('SIGN', 'agreement', 'Sign completion agreement', 'completion_agreement', true, 1),
('SIGN', 'download', 'Download final assets', 'download_assets', false, 2),
('SIGN', 'review', 'Review documentation', 'review_docs', false, 3),

-- Launch (LAUNCH)
('LAUNCH', 'confirm', 'Confirm receipt of deliverables', 'confirm_receipt', false, 1),
('LAUNCH', 'feedback', 'Provide testimonial', 'provide_testimonial', false, 2),
('LAUNCH', 'launch', 'Launch/deploy project', 'launch_project', false, 3)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phase_requirements_phase_key ON phase_requirements(phase_key);
CREATE INDEX IF NOT EXISTS idx_phase_requirements_requirement_key ON phase_requirements(requirement_key);
CREATE INDEX IF NOT EXISTS idx_project_phase_requirements_project ON project_phase_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phase_requirements_completion ON project_phase_requirements(project_id, completed);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_phase_requirements_updated_at BEFORE UPDATE
    ON phase_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phase_requirements_updated_at BEFORE UPDATE
    ON project_phase_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();