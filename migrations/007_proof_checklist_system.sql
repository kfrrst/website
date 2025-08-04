-- [RE]Print Studios Proof Checklist System Migration
-- Migration: 007_proof_checklist_system.sql
-- Created: 2025-08-04
-- Description: Adds comprehensive proof checklist system for pre-press validation

-- =============================================================================
-- PROJECT PROOFS TABLE
-- =============================================================================
-- Main table for proof sessions
CREATE TABLE project_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id),
    proof_number INTEGER NOT NULL DEFAULT 1, -- Version number
    services JSONB NOT NULL, -- Array of service codes (SP, LFP, GD, etc.)
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready', 'approved', 'rejected')),
    
    -- Checklist state - stores complete checklist item states
    checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- File validation results
    validation_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Proof metadata
    created_by UUID NOT NULL REFERENCES users(id),
    submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES users(id),
    
    -- Completion tracking
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_phase_proof UNIQUE(project_id, phase_id, proof_number)
);

CREATE INDEX idx_project_proofs_project ON project_proofs(project_id);
CREATE INDEX idx_project_proofs_phase ON project_proofs(phase_id);
CREATE INDEX idx_project_proofs_status ON project_proofs(status);
CREATE INDEX idx_project_proofs_created_by ON project_proofs(created_by);

-- =============================================================================
-- PROOF APPROVALS TABLE  
-- =============================================================================
-- Tracks digital signatures and approvals for proofs
CREATE TABLE proof_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID NOT NULL REFERENCES project_proofs(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(255) NOT NULL,
    approver_email VARCHAR(255) NOT NULL,
    
    -- Approval decision
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    
    -- Digital signature data (base64 encoded image)
    signature_data TEXT,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    approval_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_proof_approver UNIQUE(proof_id, approver_id)
);

CREATE INDEX idx_proof_approvals_proof ON proof_approvals(proof_id);
CREATE INDEX idx_proof_approvals_approver ON proof_approvals(approver_id);
CREATE INDEX idx_proof_approvals_status ON proof_approvals(status);

-- =============================================================================
-- PROOF OVERRIDE REQUESTS TABLE
-- =============================================================================
-- Tracks override requests for critical checklist items
CREATE TABLE proof_override_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID NOT NULL REFERENCES project_proofs(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL, -- Checklist item ID (e.g., 'SP_colors')
    
    -- Request details
    reason TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Approval workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_override_requests_proof ON proof_override_requests(proof_id);
CREATE INDEX idx_override_requests_status ON proof_override_requests(status);
CREATE INDEX idx_override_requests_requested_by ON proof_override_requests(requested_by);

-- =============================================================================
-- FILE TECHNICAL SPECS TABLE
-- =============================================================================
-- Stores technical specifications extracted from uploaded files
CREATE TABLE file_technical_specs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    
    -- Image specifications
    width_pixels INTEGER,
    height_pixels INTEGER,
    width_inches DECIMAL(8,3),
    height_inches DECIMAL(8,3),
    dpi_horizontal INTEGER,
    dpi_vertical INTEGER,
    color_mode VARCHAR(20), -- RGB, CMYK, Grayscale, etc.
    color_profile VARCHAR(100),
    bit_depth INTEGER,
    
    -- Print specifications
    has_bleed BOOLEAN DEFAULT false,
    bleed_size_inches DECIMAL(6,3),
    trim_box JSONB, -- {width, height, x, y}
    bleed_box JSONB, -- {width, height, x, y}
    
    -- Font and typography
    embedded_fonts JSONB, -- Array of font names
    missing_fonts JSONB, -- Array of missing font names
    text_elements_count INTEGER DEFAULT 0,
    
    -- Validation flags
    is_print_ready BOOLEAN DEFAULT false,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    validation_warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Processing metadata
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_engine VARCHAR(50), -- imagemagick, sharp, etc.
    processing_version VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_file_specs UNIQUE(file_id)
);

CREATE INDEX idx_file_specs_file ON file_technical_specs(file_id);
CREATE INDEX idx_file_specs_print_ready ON file_technical_specs(is_print_ready);
CREATE INDEX idx_file_specs_color_mode ON file_technical_specs(color_mode);

-- =============================================================================
-- PROOF HISTORY TABLE
-- =============================================================================
-- Tracks all changes and actions performed on proofs
CREATE TABLE proof_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID NOT NULL REFERENCES project_proofs(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- created, updated, item_checked, item_unchecked, submitted, approved, etc.
    action_description TEXT NOT NULL,
    
    -- User context
    performed_by UUID NOT NULL REFERENCES users(id),
    user_role VARCHAR(20) NOT NULL,
    
    -- Change data
    item_id VARCHAR(100), -- For checklist item actions
    old_value JSONB,
    new_value JSONB,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proof_history_proof ON proof_history(proof_id);
CREATE INDEX idx_proof_history_action ON proof_history(action_type);
CREATE INDEX idx_proof_history_user ON proof_history(performed_by);
CREATE INDEX idx_proof_history_created ON proof_history(created_at DESC);

-- =============================================================================
-- PROOF REPORTS TABLE
-- =============================================================================
-- Stores generated PDF reports and exports
CREATE TABLE proof_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proof_id UUID NOT NULL REFERENCES project_proofs(id) ON DELETE CASCADE,
    
    -- Report details
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN ('checklist', 'validation', 'approval', 'complete')),
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Generation details
    generated_by UUID NOT NULL REFERENCES users(id),
    generation_params JSONB, -- Parameters used for generation
    
    -- Download tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    last_downloaded_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proof_reports_proof ON proof_reports(proof_id);
CREATE INDEX idx_proof_reports_type ON proof_reports(report_type);
CREATE INDEX idx_proof_reports_generated_by ON proof_reports(generated_by);

-- =============================================================================
-- SERVICE TYPE VALIDATION STANDARDS TABLE
-- =============================================================================
-- Configurable validation standards for different service types
CREATE TABLE service_validation_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(10) NOT NULL UNIQUE, -- SP, LFP, GD, BOOK, etc.
    service_name VARCHAR(100) NOT NULL,
    
    -- File format requirements
    allowed_formats JSONB NOT NULL, -- ["AI", "PDF", "SVG"]
    preferred_formats JSONB NOT NULL, -- ["AI", "PDF"]
    
    -- Resolution requirements
    min_dpi INTEGER NOT NULL,
    preferred_dpi INTEGER,
    max_file_size_mb INTEGER NOT NULL,
    
    -- Color requirements
    required_color_modes JSONB NOT NULL, -- ["CMYK", "RGB"]
    preferred_color_mode VARCHAR(20),
    
    -- Print specifications
    requires_bleed BOOLEAN DEFAULT false,
    min_bleed_inches DECIMAL(6,3) DEFAULT 0,
    requires_trim_marks BOOLEAN DEFAULT false,
    
    -- Quality standards
    min_image_quality INTEGER DEFAULT 90, -- JPEG quality
    requires_embedded_fonts BOOLEAN DEFAULT true,
    allows_spot_colors BOOLEAN DEFAULT false,
    
    -- Validation rules
    validation_rules JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default validation standards
INSERT INTO service_validation_standards (
    service_code, service_name, allowed_formats, preferred_formats,
    min_dpi, preferred_dpi, max_file_size_mb, required_color_modes, 
    preferred_color_mode, requires_bleed, min_bleed_inches
) VALUES
    (
        'SP', 'Screen Printing', 
        '["AI", "PDF", "SVG", "PNG", "PSD"]'::jsonb, 
        '["AI", "PDF"]'::jsonb,
        150, 300, 50, 
        '["RGB", "CMYK"]'::jsonb, 'RGB',
        false, 0
    ),
    (
        'LFP', 'Large Format Print',
        '["AI", "PDF", "TIFF", "PSD", "PNG"]'::jsonb,
        '["AI", "PDF"]'::jsonb,
        100, 150, 200,
        '["CMYK"]'::jsonb, 'CMYK',
        true, 0.125
    ),
    (
        'GD', 'Graphic Design',
        '["AI", "PDF", "PSD", "SVG", "PNG"]'::jsonb,
        '["AI", "PDF"]'::jsonb,
        300, 300, 100,
        '["CMYK", "RGB"]'::jsonb, 'CMYK',
        true, 0.125
    ),
    (
        'BOOK', 'Book Cover',
        '["PDF", "AI", "PSD", "TIFF"]'::jsonb,
        '["PDF", "AI"]'::jsonb,
        300, 300, 100,
        '["CMYK"]'::jsonb, 'CMYK',
        true, 0.125
    ),
    (
        'WEB', 'Website Development',
        '["PNG", "JPG", "SVG", "WEBP", "PDF"]'::jsonb,
        '["PNG", "SVG"]'::jsonb,
        72, 144, 25,
        '["RGB"]'::jsonb, 'RGB',
        false, 0
    );

-- =============================================================================
-- FUNCTIONS FOR PROOF MANAGEMENT
-- =============================================================================

-- Function to create a new proof session
CREATE OR REPLACE FUNCTION create_proof_session(
    p_project_id UUID,
    p_phase_id UUID,
    p_services JSONB,
    p_created_by UUID
) RETURNS UUID AS $$
DECLARE
    v_proof_id UUID;
    v_proof_number INTEGER;
BEGIN
    -- Get next proof number for this project/phase
    SELECT COALESCE(MAX(proof_number), 0) + 1 
    INTO v_proof_number
    FROM project_proofs
    WHERE project_id = p_project_id AND phase_id = p_phase_id;
    
    -- Create the proof session
    INSERT INTO project_proofs (
        project_id, phase_id, proof_number, services, created_by
    ) VALUES (
        p_project_id, p_phase_id, v_proof_number, p_services, p_created_by
    ) RETURNING id INTO v_proof_id;
    
    -- Log the creation
    INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role
    ) VALUES (
        v_proof_id, 'created', 
        'Proof session created for services: ' || p_services::text,
        p_created_by, 
        (SELECT role FROM users WHERE id = p_created_by)
    );
    
    RETURN v_proof_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update checklist item state
CREATE OR REPLACE FUNCTION update_checklist_item(
    p_proof_id UUID,
    p_item_id VARCHAR(100),
    p_checked BOOLEAN,
    p_notes TEXT,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_state JSONB;
    v_new_state JSONB;
    v_user_name TEXT;
BEGIN
    -- Get current checklist state
    SELECT checklist_state INTO v_current_state
    FROM project_proofs
    WHERE id = p_proof_id;
    
    -- Get user name
    SELECT first_name || ' ' || last_name INTO v_user_name
    FROM users WHERE id = p_user_id;
    
    -- Update the specific item
    v_new_state := v_current_state;
    v_new_state := jsonb_set(
        v_new_state,
        ARRAY[p_item_id],
        jsonb_build_object(
            'checked', p_checked,
            'notes', COALESCE(p_notes, ''),
            'checked_by', CASE WHEN p_checked THEN v_user_name ELSE null END,
            'checked_at', CASE WHEN p_checked THEN CURRENT_TIMESTAMP ELSE null END
        )
    );
    
    -- Update the proof
    UPDATE project_proofs
    SET 
        checklist_state = v_new_state,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_proof_id;
    
    -- Log the action
    INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role, item_id,
        old_value, new_value
    ) VALUES (
        p_proof_id,
        CASE WHEN p_checked THEN 'item_checked' ELSE 'item_unchecked' END,
        'Checklist item ' || p_item_id || ' ' || CASE WHEN p_checked THEN 'checked' ELSE 'unchecked' END,
        p_user_id,
        (SELECT role FROM users WHERE id = p_user_id),
        p_item_id,
        COALESCE(v_current_state->p_item_id, '{}'::jsonb),
        v_new_state->p_item_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to submit proof for approval
CREATE OR REPLACE FUNCTION submit_proof_for_approval(
    p_proof_id UUID,
    p_submitted_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Update proof status
    UPDATE project_proofs
    SET 
        status = 'ready',
        submitted_for_approval_at = CURRENT_TIMESTAMP,
        submitted_by = p_submitted_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_proof_id
    RETURNING project_id INTO v_project_id;
    
    -- Log the submission
    INSERT INTO proof_history (
        proof_id, action_type, action_description, performed_by, user_role
    ) VALUES (
        p_proof_id, 'submitted',
        'Proof submitted for approval',
        p_submitted_by,
        (SELECT role FROM users WHERE id = p_submitted_by)
    );
    
    -- Create notification for client
    INSERT INTO notifications (
        user_id, type, title, content, action_url
    )
    SELECT 
        p.client_id,
        'proof_ready',
        'Proof Ready for Approval',
        'Your project proof is ready for review and approval.',
        '/portal/projects/' || p.id::text || '/phases'
    FROM projects p
    WHERE p.id = v_project_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_proof_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_proofs_timestamp
    BEFORE UPDATE ON project_proofs
    FOR EACH ROW
    EXECUTE FUNCTION update_proof_timestamp();

CREATE TRIGGER update_proof_approvals_timestamp
    BEFORE UPDATE ON proof_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_proof_timestamp();

CREATE TRIGGER update_override_requests_timestamp
    BEFORE UPDATE ON proof_override_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_proof_timestamp();

CREATE TRIGGER update_file_specs_timestamp
    BEFORE UPDATE ON file_technical_specs
    FOR EACH ROW
    EXECUTE FUNCTION update_proof_timestamp();

CREATE TRIGGER update_validation_standards_timestamp
    BEFORE UPDATE ON service_validation_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_proof_timestamp();

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- View for proof overview with project details
CREATE OR REPLACE VIEW proof_overview AS
SELECT 
    pp.id AS proof_id,
    pp.proof_number,
    pp.status AS proof_status,
    pp.services,
    pp.is_completed,
    pp.created_at AS proof_created_at,
    
    -- Project details
    p.id AS project_id,
    p.name AS project_name,
    p.client_id,
    u.first_name || ' ' || u.last_name AS client_name,
    u.email AS client_email,
    
    -- Phase details
    ph.name AS phase_name,
    ph.phase_key,
    
    -- Approval summary
    COUNT(pa.id) AS total_approvals,
    COUNT(CASE WHEN pa.status = 'approved' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN pa.status = 'rejected' THEN 1 END) AS rejected_count,
    COUNT(CASE WHEN pa.status = 'pending' THEN 1 END) AS pending_count
    
FROM project_proofs pp
JOIN projects p ON pp.project_id = p.id
JOIN users u ON p.client_id = u.id
JOIN project_phases ph ON pp.phase_id = ph.id
LEFT JOIN proof_approvals pa ON pp.id = pa.proof_id
GROUP BY pp.id, p.id, u.id, ph.id;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Additional indexes for JSONB columns
CREATE INDEX idx_project_proofs_services ON project_proofs USING GIN (services);
CREATE INDEX idx_project_proofs_checklist_state ON project_proofs USING GIN (checklist_state);
CREATE INDEX idx_project_proofs_validation_results ON project_proofs USING GIN (validation_results);
CREATE INDEX idx_file_specs_validation_errors ON file_technical_specs USING GIN (validation_errors);
CREATE INDEX idx_file_specs_validation_warnings ON file_technical_specs USING GIN (validation_warnings);

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Log the completion
INSERT INTO activity_log (entity_type, action, description, metadata)
VALUES (
    'system', 
    'migration_completed', 
    'Proof checklist system migration completed successfully',
    '{"version": "1.0.0", "migration": "007_proof_checklist_system.sql", "tables_created": 7, "functions_created": 4}'::jsonb
);

-- Display completion message
SELECT 
    'Proof Checklist System Migration Completed!' AS status,
    'All tables, functions, and indexes created successfully' AS message,
    CURRENT_TIMESTAMP AS completed_at;