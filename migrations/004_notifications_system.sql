-- [RE]Print Studios Notifications System Migration
-- Migration: 004_notifications_system.sql
-- Created: 2025-08-03
-- Description: Adds in-app notifications system

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- phase_advanced, project_stuck, action_reminder, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500), -- Optional link to relevant section
    metadata JSONB DEFAULT '{}', -- Additional data for the notification
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_phase_updates BOOLEAN DEFAULT true,
    email_action_reminders BOOLEAN DEFAULT true,
    email_project_stuck BOOLEAN DEFAULT true,
    email_invoices BOOLEAN DEFAULT true,
    email_messages BOOLEAN DEFAULT true,
    
    -- In-app preferences
    app_phase_updates BOOLEAN DEFAULT true,
    app_action_reminders BOOLEAN DEFAULT true,
    app_project_stuck BOOLEAN DEFAULT true,
    app_invoices BOOLEAN DEFAULT true,
    app_messages BOOLEAN DEFAULT true,
    
    -- Frequency settings
    reminder_frequency VARCHAR(20) DEFAULT 'daily', -- 'immediate', 'daily', 'weekly'
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'America/Chicago',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- =============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- =============================================================================
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- email, in_app, sms
    subject VARCHAR(255),
    title VARCHAR(255),
    body_template TEXT NOT NULL, -- Template with placeholders like {{project_name}}
    metadata JSONB DEFAULT '{}', -- Default values, styling, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);

-- =============================================================================
-- NOTIFICATION QUEUE TABLE
-- =============================================================================
-- For delayed or scheduled notifications
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) 
    WHERE status = 'pending';
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);

-- =============================================================================
-- INSERT DEFAULT NOTIFICATION TEMPLATES
-- =============================================================================
INSERT INTO notification_templates (template_key, type, subject, title, body_template) VALUES
    ('phase_advanced_email', 'email', 'Project Update: {{project_name}} - New Phase', 
     'Project Phase Update', 'Your project "{{project_name}}" has moved to the {{phase_name}} phase.'),
     
    ('phase_advanced_app', 'in_app', NULL, 
     'Project Phase Updated', 'Your project "{{project_name}}" has moved to the {{phase_name}} phase.'),
     
    ('action_reminder_email', 'email', 'Reminder: {{pending_actions}} Pending Action(s) - {{project_name}}', 
     'Action Required', 'You have {{pending_actions}} pending action(s) for "{{project_name}}" in the {{phase_name}} phase.'),
     
    ('action_reminder_app', 'in_app', NULL, 
     'Pending Actions on Your Project', 'You have {{pending_actions}} pending action(s) for "{{project_name}}" in the {{phase_name}} phase.'),
     
    ('project_stuck_email', 'email', 'Action Required: {{project_name}}', 
     'Project Update Needed', 'Your project "{{project_name}}" has been in the {{phase_name}} phase for {{days_in_phase}} days.'),
     
    ('project_stuck_app', 'in_app', NULL, 
     'Action Required on Your Project', 'Your project "{{project_name}}" has been in the {{phase_name}} phase for {{days_in_phase}} days.');

-- =============================================================================
-- INSERT DEFAULT NOTIFICATION PREFERENCES FOR EXISTING USERS
-- =============================================================================
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np WHERE np.user_id = users.id
);

-- =============================================================================
-- CREATE NOTIFICATION FUNCTIONS
-- =============================================================================

-- Function to get user's notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    email_enabled BOOLEAN,
    app_enabled BOOLEAN,
    notification_type VARCHAR,
    frequency VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN notification_type = 'phase_updates' THEN np.email_phase_updates
            WHEN notification_type = 'action_reminders' THEN np.email_action_reminders
            WHEN notification_type = 'project_stuck' THEN np.email_project_stuck
            WHEN notification_type = 'invoices' THEN np.email_invoices
            WHEN notification_type = 'messages' THEN np.email_messages
        END AS email_enabled,
        CASE 
            WHEN notification_type = 'phase_updates' THEN np.app_phase_updates
            WHEN notification_type = 'action_reminders' THEN np.app_action_reminders
            WHEN notification_type = 'project_stuck' THEN np.app_project_stuck
            WHEN notification_type = 'invoices' THEN np.app_invoices
            WHEN notification_type = 'messages' THEN np.app_messages
        END AS app_enabled,
        notification_type,
        np.reminder_frequency
    FROM notification_preferences np
    CROSS JOIN (
        VALUES 
            ('phase_updates'),
            ('action_reminders'),
            ('project_stuck'),
            ('invoices'),
            ('messages')
    ) AS types(notification_type)
    WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if notification should be sent based on quiet hours
CREATE OR REPLACE FUNCTION check_quiet_hours(
    p_user_id UUID,
    p_check_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) RETURNS BOOLEAN AS $$
DECLARE
    v_quiet_start TIME;
    v_quiet_end TIME;
    v_timezone VARCHAR;
    v_user_time TIME;
BEGIN
    SELECT quiet_hours_start, quiet_hours_end, timezone
    INTO v_quiet_start, v_quiet_end, v_timezone
    FROM notification_preferences
    WHERE user_id = p_user_id;
    
    IF v_quiet_start IS NULL OR v_quiet_end IS NULL THEN
        RETURN TRUE; -- No quiet hours set
    END IF;
    
    -- Convert to user's timezone
    v_user_time := (p_check_time AT TIME ZONE v_timezone)::TIME;
    
    -- Check if current time is within quiet hours
    IF v_quiet_start < v_quiet_end THEN
        -- Normal case: quiet hours don't cross midnight
        RETURN v_user_time < v_quiet_start OR v_user_time > v_quiet_end;
    ELSE
        -- Quiet hours cross midnight
        RETURN v_user_time < v_quiet_start AND v_user_time > v_quiet_end;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_timestamp
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER update_notification_templates_timestamp
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Notifications system migration completed successfully!';
    RAISE NOTICE 'Default templates and preferences have been created.';
END $$;