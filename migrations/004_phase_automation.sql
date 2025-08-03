-- =============================================================================
-- PHASE AUTOMATION MIGRATION
-- =============================================================================
-- Creates tables and functions for automated phase progression
-- =============================================================================

-- Create phase automation rules table
CREATE TABLE IF NOT EXISTS phase_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    from_phase_id UUID REFERENCES project_phases(id),
    to_phase_id UUID NOT NULL REFERENCES project_phases(id),
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('client_action', 'time_based', 'milestone', 'manual')),
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create automation log table
CREATE TABLE IF NOT EXISTS phase_automation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES phase_automation_rules(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON phase_automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_log_project ON phase_automation_log(project_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_created ON phase_automation_log(created_at);

-- Insert basic automation rules
INSERT INTO phase_automation_rules (name, description, from_phase_id, to_phase_id, rule_type, conditions)
SELECT 
    'Auto-advance from ' || fp.name || ' to ' || tp.name,
    'Automatically advance when all required client actions are completed',
    fp.id,
    tp.id,
    'client_action',
    '{"all_actions_complete": true}'::jsonb
FROM project_phases fp
JOIN project_phases tp ON tp.order_index = fp.order_index + 1
WHERE fp.requires_client_action = true
ON CONFLICT DO NOTHING;

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_automation_rules_updated_at
    BEFORE UPDATE ON phase_automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rules_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase automation system created successfully!';
END $$;