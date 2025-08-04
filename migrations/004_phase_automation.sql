-- =============================================================================
-- PHASE AUTOMATION MIGRATION
-- =============================================================================
-- Creates tables and functions for automated phase progression
-- =============================================================================

-- Add missing columns to existing phase_automation_rules table if they don't exist
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phase_automation_rules' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE phase_automation_rules ADD COLUMN name VARCHAR(255);
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phase_automation_rules' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE phase_automation_rules ADD COLUMN description TEXT;
    END IF;
    
    -- Add conditions column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phase_automation_rules' 
        AND column_name = 'conditions'
    ) THEN
        ALTER TABLE phase_automation_rules ADD COLUMN conditions JSONB;
    END IF;
END $$;

-- Update rule_type check constraint to include new types
ALTER TABLE phase_automation_rules DROP CONSTRAINT IF EXISTS phase_automation_rules_rule_type_check;
ALTER TABLE phase_automation_rules ADD CONSTRAINT phase_automation_rules_rule_type_check 
    CHECK (rule_type IN ('all_actions_complete', 'payment_received', 'manual_only', 'client_action', 'time_based', 'milestone', 'manual'));

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

-- Update existing rules with names
UPDATE phase_automation_rules
SET name = COALESCE(name, 'Auto-advance rule ' || id::text),
    description = COALESCE(description, 'Automatically advance based on ' || rule_type);

-- Insert additional automation rules if they don't exist
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
  AND NOT EXISTS (
    SELECT 1 FROM phase_automation_rules 
    WHERE from_phase_id = fp.id 
      AND to_phase_id = tp.id 
      AND rule_type = 'client_action'
  );

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_automation_rules_updated_at ON phase_automation_rules;
CREATE TRIGGER trigger_update_automation_rules_updated_at
    BEFORE UPDATE ON phase_automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_rules_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase automation system updated successfully!';
END $$;