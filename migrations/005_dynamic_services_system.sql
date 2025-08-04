-- [RE]Print Studios Dynamic Services System Migration
-- Migration: 005_dynamic_services_system.sql
-- Created: 2025-08-04
-- Description: Adds service types, dynamic phases, and form/document modules

-- =============================================================================
-- SERVICE TYPES TABLE
-- =============================================================================
CREATE TABLE service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- COL, IDE, SP, etc.
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    default_phase_keys TEXT[] NOT NULL, -- Array of phase keys
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert all service types
INSERT INTO service_types (code, display_name, description, default_phase_keys, sort_order) VALUES
('COL', 'Collaboration Only', 'Light collaboration and brainstorming', ARRAY['ONB', 'COLLAB', 'WRAP'], 1),
('IDE', 'Ideation Workshop', 'Creative ideation and concept development', ARRAY['ONB', 'IDEA', 'WRAP'], 2),
('SP', 'Screen Printing', 'Custom screen printing services', ARRAY['ONB', 'IDEA', 'PREP', 'PRINT', 'LAUNCH'], 3),
('LFP', 'Large-Format Print', 'Large format printing and signage', ARRAY['ONB', 'PREP', 'PRINT', 'LAUNCH'], 4),
('GD', 'Graphic Design', 'Professional graphic design services', ARRAY['ONB', 'IDEA', 'DSGN', 'REV', 'LAUNCH'], 5),
('WW', 'Woodworking', 'Custom woodworking and fabrication', ARRAY['ONB', 'IDEA', 'CAD', 'FAB', 'FINISH', 'LAUNCH'], 6),
('SAAS', 'SaaS Development', 'Software as a Service development', ARRAY['ONB', 'DISC', 'MVP', 'QA', 'DEPLOY', 'LAUNCH'], 7),
('WEB', 'Website Design', 'Website design and development', ARRAY['ONB', 'DISC', 'DSGN', 'DEV', 'REV', 'DEPLOY', 'LAUNCH'], 8),
('BOOK', 'Book Cover Design', 'Book cover and layout design', ARRAY['ONB', 'IDEA', 'DSGN', 'REV', 'LAUNCH'], 9),
('LOGO', 'Logo & Brand System', 'Logo design and brand identity', ARRAY['ONB', 'RESEARCH', 'DSGN', 'REV', 'LAUNCH'], 10),
('PY', 'Python Automation', 'Python automation and scripting', ARRAY['ONB', 'DISC', 'DEV', 'QA', 'LAUNCH'], 11);

-- =============================================================================
-- PHASE LIBRARY TABLE
-- =============================================================================
CREATE TABLE phase_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(20) UNIQUE NOT NULL, -- ONB, IDEA, DISC, etc.
    label VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Lucide icon name
    ui_components TEXT[], -- React component names
    form_modules TEXT[], -- Form module IDs
    doc_modules TEXT[], -- Document module IDs
    permissions JSONB DEFAULT '{}', -- Role-based permissions
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert all phase definitions
INSERT INTO phase_library (key, label, description, icon, ui_components, form_modules, doc_modules, sort_order) VALUES
('ONB', 'Onboarding', 'Kick-off and intake forms', 'user-plus', ARRAY['IntakeWizard'], ARRAY['intake_base'], ARRAY['welcome_packet'], 1),
('COLLAB', 'Collaboration', 'Light collaboration and brainstorming', 'users', ARRAY['MiroEmbed'], ARRAY['collab_brief'], ARRAY[]::TEXT[], 2),
('IDEA', 'Ideation', 'Ideation and mood board creation', 'lightbulb', ARRAY['Moodboard'], ARRAY['ideation_goals'], ARRAY['proposal_default'], 3),
('RESEARCH', 'Research', 'Brand and market research', 'search', ARRAY['ResearchList'], ARRAY['brand_audit'], ARRAY['research_report'], 4),
('DISC', 'Discovery', 'Discovery workshop and requirements', 'compass', ARRAY['NotionEmbed'], ARRAY['feature_scope'], ARRAY['discovery_doc'], 5),
('DSGN', 'Design', 'Design production phase', 'palette', ARRAY['FigmaPreview'], ARRAY['design_brief'], ARRAY['design_specs'], 6),
('CAD', '3D/CAD', '3D modeling and CAD work', 'box', ARRAY['ModelViewer'], ARRAY['cad_settings'], ARRAY['cutlist'], 7),
('PREP', 'Pre-Press', 'Pre-press preparation and proofing', 'file-check', ARRAY['ProofChecklist'], ARRAY['proof_approval'], ARRAY['sow_print'], 8),
('PRINT', 'Production', 'Production and printing', 'printer', ARRAY['BatchStatus'], ARRAY[]::TEXT[], ARRAY['print_spec_sheet'], 9),
('MVP', 'MVP', 'Minimum viable product development', 'package', ARRAY['StagingLink'], ARRAY[]::TEXT[], ARRAY['mvp_report'], 10),
('DEV', 'Development', 'Development and coding', 'code', ARRAY['DeployCard'], ARRAY[]::TEXT[], ARRAY['api_contract'], 11),
('QA', 'QA Testing', 'Quality assurance and testing', 'bug', ARRAY['LinearList'], ARRAY['bug_report'], ARRAY['qa_report'], 12),
('FAB', 'Fabrication', 'Physical fabrication and building', 'hammer', ARRAY['FabricationLog'], ARRAY[]::TEXT[], ARRAY['fab_checklist'], 13),
('FINISH', 'Finishing', 'Finishing and final touches', 'sparkles', ARRAY['FinishChecklist'], ARRAY[]::TEXT[], ARRAY['finish_report'], 14),
('DEPLOY', 'Deployment', 'Production deployment', 'rocket', ARRAY['LaunchChecklist'], ARRAY[]::TEXT[], ARRAY['deploy_checklist'], 15),
('REV', 'Review', 'Review and feedback cycle', 'message-circle', ARRAY['AnnotationBoard'], ARRAY['proof_approval'], ARRAY['review_summary'], 16),
('LAUNCH', 'Launch', 'Project launch and asset delivery', 'party-popper', ARRAY['LaunchGallery'], ARRAY[]::TEXT[], ARRAY['launch_certificate'], 17),
('WRAP', 'Wrap-up', 'Post-mortem and final payment', 'check-circle', ARRAY['WrapUp'], ARRAY[]::TEXT[], ARRAY['final_invoice', 'testimonial_request'], 18);

-- =============================================================================
-- UPDATE PROJECTS TABLE
-- =============================================================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS phase_definition JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_phases BOOLEAN DEFAULT false;

-- Create index for service filtering
CREATE INDEX idx_projects_services ON projects USING GIN(services);

-- =============================================================================
-- FORM MODULES TABLE
-- =============================================================================
CREATE TABLE form_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id VARCHAR(100) UNIQUE NOT NULL, -- intake_base, intake_sp, etc.
    name VARCHAR(200) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- JSON Schema definition
    ui_schema JSONB DEFAULT '{}', -- UI hints for form rendering
    service_filters TEXT[], -- Which services use this module
    phase_filters TEXT[], -- Which phases can use this module
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- DOCUMENT MODULES TABLE
-- =============================================================================
CREATE TABLE document_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id VARCHAR(100) UNIQUE NOT NULL, -- proposal_default, sow_print, etc.
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(20) DEFAULT 'handlebars', -- handlebars, markdown, html
    template TEXT NOT NULL, -- The actual template content
    service_filters TEXT[], -- Which services use this module
    phase_filters TEXT[], -- Which phases can use this module
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FORMS DATA TABLE (Replaces rigid fields)
-- =============================================================================
CREATE TABLE forms_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_key VARCHAR(20) NOT NULL,
    module_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL, -- The actual form data
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite index for quick lookups
    UNIQUE(project_id, phase_key, module_id)
);

CREATE INDEX idx_forms_data_project ON forms_data(project_id);
CREATE INDEX idx_forms_data_phase ON forms_data(phase_key);

-- =============================================================================
-- GENERATED DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_key VARCHAR(20) NOT NULL,
    module_id VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    version INTEGER DEFAULT 1,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Track multiple versions
    CONSTRAINT unique_document_version UNIQUE(project_id, phase_key, module_id, version)
);

CREATE INDEX idx_generated_docs_project ON generated_documents(project_id);
CREATE INDEX idx_generated_docs_phase ON generated_documents(phase_key);

-- =============================================================================
-- SERVICE TYPE PERMISSIONS TABLE
-- =============================================================================
CREATE TABLE service_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(10) NOT NULL REFERENCES service_types(code),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
    phase_key VARCHAR(20) NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_service_permission UNIQUE(service_type, role, phase_key)
);

-- =============================================================================
-- UPDATE EXISTING PROJECTS
-- =============================================================================
-- Map existing projects to the new service types based on their names/descriptions
-- This is a best-guess migration - admin should review and update as needed

UPDATE projects SET services = 
  CASE 
    WHEN LOWER(name) LIKE '%print%' OR LOWER(description) LIKE '%print%' THEN ARRAY['SP']
    WHEN LOWER(name) LIKE '%web%' OR LOWER(description) LIKE '%website%' THEN ARRAY['WEB']
    WHEN LOWER(name) LIKE '%logo%' OR LOWER(description) LIKE '%brand%' THEN ARRAY['LOGO']
    WHEN LOWER(name) LIKE '%design%' THEN ARRAY['GD']
    ELSE ARRAY['GD'] -- Default to graphic design
  END
WHERE services IS NULL OR services = '{}';

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get applicable phases for a project based on its services
CREATE OR REPLACE FUNCTION get_project_phases(project_services TEXT[])
RETURNS TEXT[] AS $$
DECLARE
    phase_set TEXT[] := '{}';
    service_record RECORD;
BEGIN
    FOR service_record IN 
        SELECT UNNEST(default_phase_keys) as phase_key
        FROM service_types 
        WHERE code = ANY(project_services)
    LOOP
        IF NOT service_record.phase_key = ANY(phase_set) THEN
            phase_set := array_append(phase_set, service_record.phase_key);
        END IF;
    END LOOP;
    
    -- Always include ONB and WRAP
    IF NOT 'ONB' = ANY(phase_set) THEN
        phase_set := array_prepend('ONB', phase_set);
    END IF;
    IF NOT 'WRAP' = ANY(phase_set) THEN
        phase_set := array_append(phase_set, 'WRAP');
    END IF;
    
    RETURN phase_set;
END;
$$ LANGUAGE plpgsql;

-- Function to get applicable form modules for a phase and services
CREATE OR REPLACE FUNCTION get_phase_forms(phase_key TEXT, project_services TEXT[])
RETURNS TEXT[] AS $$
DECLARE
    form_modules TEXT[];
BEGIN
    -- Get base forms for the phase
    SELECT form_modules INTO form_modules
    FROM phase_library
    WHERE key = phase_key;
    
    -- Add service-specific forms
    SELECT array_agg(DISTINCT module_id) INTO form_modules
    FROM form_modules
    WHERE (phase_key = ANY(phase_filters) OR phase_filters IS NULL)
      AND (project_services && service_filters OR service_filters IS NULL)
      AND is_active = true;
    
    RETURN COALESCE(form_modules, '{}');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phase_library_updated_at BEFORE UPDATE ON phase_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_modules_updated_at BEFORE UPDATE ON form_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_modules_updated_at BEFORE UPDATE ON document_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_data_updated_at BEFORE UPDATE ON forms_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Sample form modules
INSERT INTO form_modules (module_id, name, description, schema, service_filters) VALUES
('intake_base', 'Basic Intake Form', 'Contact and project basics', 
 '{"type": "object", "properties": {"company": {"type": "string"}, "contact_name": {"type": "string"}, "email": {"type": "string", "format": "email"}, "phone": {"type": "string"}, "project_goals": {"type": "string"}}}',
 NULL), -- Used by all services

('intake_sp', 'Screen Print Intake', 'Screen printing specific details',
 '{"type": "object", "properties": {"garment_type": {"type": "string"}, "ink_colors": {"type": "array", "items": {"type": "string"}}, "quantity": {"type": "number"}, "sizes": {"type": "array", "items": {"type": "string"}}}}',
 ARRAY['SP', 'LFP']),

('intake_ww', 'Woodworking Intake', 'Wood project specifications',
 '{"type": "object", "properties": {"wood_type": {"type": "string"}, "dimensions": {"type": "object", "properties": {"length": {"type": "number"}, "width": {"type": "number"}, "height": {"type": "number"}}}, "finish": {"type": "string"}}}',
 ARRAY['WW']);

-- Sample document templates
INSERT INTO document_modules (module_id, name, description, template, service_filters) VALUES
('proposal_default', 'Standard Proposal', 'Default proposal template',
 '<h1>Project Proposal: {{project.name}}</h1><p>Client: {{client.name}}</p><p>Services: {{#each services}}{{this}} {{/each}}</p>',
 NULL),

('launch_certificate', 'Launch Certificate', 'Project completion certificate',
 '<div class="certificate"><h1>Launch Certificate</h1><p>This certifies that {{project.name}} has been successfully completed and launched.</p></div>',
 NULL);

-- =============================================================================
-- COMPLETION
-- =============================================================================
SELECT 
    'Dynamic Services System Migration Complete!' AS status,
    COUNT(DISTINCT st.code) AS service_types_created,
    COUNT(DISTINCT pl.key) AS phases_created
FROM service_types st, phase_library pl;