-- [RE]Print Studios Project Phases System Migration
-- Migration: 003_project_phases_system.sql
-- Created: 2025-08-03
-- Description: Adds comprehensive project phase tracking system

-- =============================================================================
-- PROJECT PHASES TABLE
-- =============================================================================
-- Core table to define the 8-phase workflow
CREATE TABLE project_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_key VARCHAR(50) UNIQUE NOT NULL, -- onboarding, ideation, design, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10), -- Emoji icon for visual representation
    order_index INTEGER NOT NULL, -- 0-7 for 8 phases
    requires_client_action BOOLEAN DEFAULT false,
    is_system_phase BOOLEAN DEFAULT true, -- Prevents deletion of core phases
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering
CREATE INDEX idx_project_phases_order ON project_phases(order_index);

-- =============================================================================
-- PROJECT PHASE TRACKING TABLE
-- =============================================================================
-- Tracks the current phase and phase history for each project
CREATE TABLE project_phase_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    current_phase_id UUID NOT NULL REFERENCES project_phases(id),
    current_phase_index INTEGER NOT NULL, -- Denormalized for performance
    phase_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Phase completion tracking
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    ideation_completed_at TIMESTAMP WITH TIME ZONE,
    design_completed_at TIMESTAMP WITH TIME ZONE,
    review_completed_at TIMESTAMP WITH TIME ZONE,
    production_completed_at TIMESTAMP WITH TIME ZONE,
    payment_completed_at TIMESTAMP WITH TIME ZONE,
    signoff_completed_at TIMESTAMP WITH TIME ZONE,
    delivery_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Overall tracking
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_phase_tracking UNIQUE(project_id)
);

CREATE INDEX idx_phase_tracking_project ON project_phase_tracking(project_id);
CREATE INDEX idx_phase_tracking_current_phase ON project_phase_tracking(current_phase_id);

-- =============================================================================
-- PROJECT PHASE HISTORY TABLE
-- =============================================================================
-- Maintains history of all phase transitions
CREATE TABLE project_phase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_phase_id UUID REFERENCES project_phases(id),
    to_phase_id UUID NOT NULL REFERENCES project_phases(id),
    transitioned_by UUID NOT NULL REFERENCES users(id),
    transition_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phase_history_project ON project_phase_history(project_id);
CREATE INDEX idx_phase_history_date ON project_phase_history(created_at DESC);

-- =============================================================================
-- PHASE CLIENT ACTIONS TABLE
-- =============================================================================
-- Defines required client actions for each phase
CREATE TABLE phase_client_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    action_key VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_phase_action UNIQUE(phase_id, action_key)
);

CREATE INDEX idx_phase_actions_phase ON phase_client_actions(phase_id);

-- =============================================================================
-- PROJECT PHASE ACTION STATUS TABLE
-- =============================================================================
-- Tracks completion of client actions for each project phase
CREATE TABLE project_phase_action_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id),
    action_id UUID NOT NULL REFERENCES phase_client_actions(id),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_action_status UNIQUE(project_id, action_id)
);

CREATE INDEX idx_action_status_project ON project_phase_action_status(project_id);
CREATE INDEX idx_action_status_phase ON project_phase_action_status(phase_id);

-- =============================================================================
-- PHASE DOCUMENTS TABLE
-- =============================================================================
-- Links documents/files to specific project phases
CREATE TABLE phase_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- contract, brief, proof, invoice, etc.
    is_client_visible BOOLEAN DEFAULT true,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_phase_document UNIQUE(project_id, phase_id, file_id)
);

CREATE INDEX idx_phase_documents_project ON phase_documents(project_id);
CREATE INDEX idx_phase_documents_phase ON phase_documents(phase_id);

-- =============================================================================
-- PHASE AUTOMATION RULES TABLE
-- =============================================================================
-- Defines automation rules for phase transitions
CREATE TABLE phase_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_phase_id UUID REFERENCES project_phases(id),
    to_phase_id UUID NOT NULL REFERENCES project_phases(id),
    rule_type VARCHAR(50) NOT NULL, -- 'all_actions_complete', 'payment_received', 'manual_only', etc.
    rule_config JSONB, -- Additional configuration for the rule
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_rules_phases ON phase_automation_rules(from_phase_id, to_phase_id);

-- =============================================================================
-- INSERT DEFAULT PHASES
-- =============================================================================
INSERT INTO project_phases (phase_key, name, description, icon, order_index, requires_client_action) VALUES
    ('onboarding', 'Onboarding', 'Initial kickoff and info gathering', '📋', 0, true),
    ('ideation', 'Ideation', 'Brainstorming & concept development', '💡', 1, false),
    ('design', 'Design', 'Creation of designs and prototypes', '🎨', 2, false),
    ('review', 'Review & Feedback', 'Client review and feedback collection', '👀', 3, true),
    ('production', 'Production/Print', 'Final production and printing', '🖨️', 4, false),
    ('payment', 'Payment', 'Final payment collection', '💳', 5, true),
    ('signoff', 'Sign-off & Docs', 'Final approvals and documentation', '✍️', 6, true),
    ('delivery', 'Delivery', 'Final deliverables and handover', '📦', 7, true);

-- =============================================================================
-- INSERT DEFAULT CLIENT ACTIONS
-- =============================================================================
-- Onboarding actions
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'complete_brief', 'Complete project brief', 1 FROM project_phases WHERE phase_key = 'onboarding';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'sign_agreement', 'Sign project agreement', 2 FROM project_phases WHERE phase_key = 'onboarding';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'submit_deposit', 'Submit initial deposit', 3 FROM project_phases WHERE phase_key = 'onboarding';

-- Review actions
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'review_deliverables', 'Review design deliverables', 1 FROM project_phases WHERE phase_key = 'review';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'provide_feedback', 'Provide detailed feedback', 2 FROM project_phases WHERE phase_key = 'review';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'approve_designs', 'Approve final designs', 3 FROM project_phases WHERE phase_key = 'review';

-- Payment actions
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'complete_payment', 'Complete final payment', 1 FROM project_phases WHERE phase_key = 'payment';

-- Sign-off actions
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'sign_completion', 'Sign project completion form', 1 FROM project_phases WHERE phase_key = 'signoff';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'acknowledge_deliverables', 'Acknowledge receipt of deliverables', 2 FROM project_phases WHERE phase_key = 'signoff';

-- Delivery actions
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'download_files', 'Download project files', 1 FROM project_phases WHERE phase_key = 'delivery';
INSERT INTO phase_client_actions (phase_id, action_key, action_description, order_index) 
SELECT id, 'confirm_receipt', 'Confirm receipt of all deliverables', 2 FROM project_phases WHERE phase_key = 'delivery';

-- =============================================================================
-- INSERT DEFAULT AUTOMATION RULES
-- =============================================================================
-- Auto-advance from payment to signoff when payment is received
INSERT INTO phase_automation_rules (from_phase_id, to_phase_id, rule_type, rule_config)
SELECT p1.id, p2.id, 'payment_received', '{"auto_advance": true}'::jsonb
FROM project_phases p1, project_phases p2
WHERE p1.phase_key = 'payment' AND p2.phase_key = 'signoff';

-- Auto-advance from onboarding to ideation when all actions complete
INSERT INTO phase_automation_rules (from_phase_id, to_phase_id, rule_type, rule_config)
SELECT p1.id, p2.id, 'all_actions_complete', '{"auto_advance": true}'::jsonb
FROM project_phases p1, project_phases p2
WHERE p1.phase_key = 'onboarding' AND p2.phase_key = 'ideation';

-- =============================================================================
-- ADD PHASE TRACKING TO EXISTING PROJECTS
-- =============================================================================
-- Add phase tracking to all existing projects (starting at onboarding)
INSERT INTO project_phase_tracking (project_id, current_phase_id, current_phase_index)
SELECT 
    p.id,
    ph.id,
    0
FROM projects p
CROSS JOIN project_phases ph
WHERE ph.phase_key = 'onboarding'
  AND NOT EXISTS (
    SELECT 1 FROM project_phase_tracking pt WHERE pt.project_id = p.id
  );

-- =============================================================================
-- CREATE VIEW FOR EASY PHASE QUERYING
-- =============================================================================
CREATE OR REPLACE VIEW project_phase_overview AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.client_id,
    pt.current_phase_index,
    ph.phase_key,
    ph.name AS phase_name,
    ph.icon AS phase_icon,
    ph.requires_client_action,
    pt.phase_started_at,
    pt.is_completed AS project_completed,
    CASE 
        WHEN ph.phase_key = 'onboarding' THEN pt.onboarding_completed_at
        WHEN ph.phase_key = 'ideation' THEN pt.ideation_completed_at
        WHEN ph.phase_key = 'design' THEN pt.design_completed_at
        WHEN ph.phase_key = 'review' THEN pt.review_completed_at
        WHEN ph.phase_key = 'production' THEN pt.production_completed_at
        WHEN ph.phase_key = 'payment' THEN pt.payment_completed_at
        WHEN ph.phase_key = 'signoff' THEN pt.signoff_completed_at
        WHEN ph.phase_key = 'delivery' THEN pt.delivery_completed_at
    END AS phase_completed_at
FROM projects p
LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
LEFT JOIN project_phases ph ON pt.current_phase_id = ph.id
WHERE p.is_active = true;

-- =============================================================================
-- CREATE FUNCTIONS FOR PHASE MANAGEMENT
-- =============================================================================

-- Function to advance project to next phase
CREATE OR REPLACE FUNCTION advance_project_phase(
    p_project_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_phase_id UUID;
    v_current_index INTEGER;
    v_next_phase_id UUID;
    v_next_index INTEGER;
BEGIN
    -- Get current phase
    SELECT current_phase_id, current_phase_index 
    INTO v_current_phase_id, v_current_index
    FROM project_phase_tracking
    WHERE project_id = p_project_id;
    
    -- Get next phase
    SELECT id, order_index 
    INTO v_next_phase_id, v_next_index
    FROM project_phases
    WHERE order_index = v_current_index + 1;
    
    IF v_next_phase_id IS NULL THEN
        RETURN FALSE; -- Already at last phase
    END IF;
    
    -- Update tracking
    UPDATE project_phase_tracking
    SET 
        current_phase_id = v_next_phase_id,
        current_phase_index = v_next_index,
        phase_started_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = p_project_id;
    
    -- Update completion timestamp
    EXECUTE format('UPDATE project_phase_tracking SET %I = CURRENT_TIMESTAMP WHERE project_id = $1',
        (SELECT phase_key || '_completed_at' FROM project_phases WHERE id = v_current_phase_id))
    USING p_project_id;
    
    -- Record history
    INSERT INTO project_phase_history (project_id, from_phase_id, to_phase_id, transitioned_by, notes)
    VALUES (p_project_id, v_current_phase_id, v_next_phase_id, p_user_id, p_notes);
    
    -- Check if project is complete
    IF v_next_index = 7 THEN -- Delivery phase
        UPDATE project_phase_tracking
        SET is_completed = true, completed_at = CURRENT_TIMESTAMP
        WHERE project_id = p_project_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all phase actions are complete
CREATE OR REPLACE FUNCTION check_phase_actions_complete(
    p_project_id UUID,
    p_phase_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_actions INTEGER;
    v_completed_actions INTEGER;
BEGIN
    -- Count total required actions
    SELECT COUNT(*) INTO v_total_actions
    FROM phase_client_actions
    WHERE phase_id = p_phase_id AND is_required = true;
    
    -- Count completed actions
    SELECT COUNT(*) INTO v_completed_actions
    FROM project_phase_action_status pas
    JOIN phase_client_actions pca ON pas.action_id = pca.id
    WHERE pas.project_id = p_project_id
      AND pca.phase_id = p_phase_id
      AND pca.is_required = true
      AND pas.is_completed = true;
    
    RETURN v_total_actions = v_completed_actions;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_phase_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phase_tracking_timestamp
    BEFORE UPDATE ON project_phase_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_tracking_timestamp();

CREATE TRIGGER update_project_phases_timestamp
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_tracking_timestamp();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- Grant appropriate permissions to the application user
-- (Adjust the user name as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Project phases system migration completed successfully!';
    RAISE NOTICE 'All existing projects have been initialized with phase tracking.';
END $$;