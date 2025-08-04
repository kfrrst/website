-- Migration: Add email system tables
-- Date: 2025-01-30
-- Description: Adds tables for email preferences, logging, and unsubscribe tokens

-- Email preferences table
CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phase_notifications BOOLEAN DEFAULT true,
  project_notifications BOOLEAN DEFAULT true,
  file_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  weekly_summary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Create updated_at trigger for user_email_preferences
CREATE OR REPLACE FUNCTION update_user_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_email_preferences_updated_at
BEFORE UPDATE ON user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_email_preferences_updated_at();

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template_name VARCHAR(100),
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'queued', -- queued, sent, failed, bounced, complained
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_log_status_check CHECK (status IN ('queued', 'sent', 'failed', 'bounced', 'complained'))
);

-- Create indexes for email_log
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_email_log_created_at ON email_log(created_at);
CREATE INDEX idx_email_log_template_name ON email_log(template_name);
CREATE INDEX idx_email_log_to_email ON email_log(to_email);

-- Unsubscribe tokens table
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
  token VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Create indexes for unsubscribe_tokens
CREATE INDEX idx_unsubscribe_tokens_user_id ON unsubscribe_tokens(user_id);
CREATE INDEX idx_unsubscribe_tokens_expires_at ON unsubscribe_tokens(expires_at);

-- Email suppression list for permanent bounces/complaints
CREATE TABLE IF NOT EXISTS email_suppression_list (
  email VARCHAR(255) PRIMARY KEY,
  reason VARCHAR(50) NOT NULL, -- bounce, complaint, manual
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT email_suppression_reason_check CHECK (reason IN ('bounce', 'complaint', 'manual'))
);

-- Create index for suppression list
CREATE INDEX idx_email_suppression_added_at ON email_suppression_list(added_at);

-- Add email notification preferences to existing users
INSERT INTO user_email_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Add comment to tables
COMMENT ON TABLE user_email_preferences IS 'Stores user email notification preferences';
COMMENT ON TABLE email_log IS 'Logs all email sending attempts and their status';
COMMENT ON TABLE unsubscribe_tokens IS 'Stores tokens for email unsubscribe links';
COMMENT ON TABLE email_suppression_list IS 'List of emails that should not receive any emails';