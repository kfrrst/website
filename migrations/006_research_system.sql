-- [RE]Print Studios Research System Migration
-- Migration: 006_research_system.sql
-- Created: 2025-08-04
-- Description: Adds research management tables for the ResearchList component

-- =============================================================================
-- RESEARCH ITEMS TABLE
-- =============================================================================
CREATE TABLE research_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    research_type VARCHAR(50) NOT NULL CHECK (research_type IN ('market_analysis', 'user_research', 'competitive_analysis', 'brand_audit')),
    description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_research_items_project ON research_items(project_id);
CREATE INDEX idx_research_items_type ON research_items(research_type);
CREATE INDEX idx_research_items_tags ON research_items USING GIN(tags);
CREATE INDEX idx_research_items_created ON research_items(created_at DESC);
CREATE INDEX idx_research_items_updated ON research_items(updated_at DESC);

-- =============================================================================
-- RESEARCH FINDINGS TABLE
-- =============================================================================
CREATE TABLE research_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_item_id UUID NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
    finding_text TEXT NOT NULL,
    finding_type VARCHAR(50) CHECK (finding_type IN ('observation', 'data_point', 'insight', 'recommendation')),
    source_reference TEXT,
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high')),
    is_highlighted BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_research_findings_item ON research_findings(research_item_id);
CREATE INDEX idx_research_findings_highlighted ON research_findings(is_highlighted);
CREATE INDEX idx_research_findings_tags ON research_findings USING GIN(tags);
CREATE INDEX idx_research_findings_text ON research_findings USING GIN(to_tsvector('english', finding_text));

-- =============================================================================
-- RESEARCH DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE research_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_item_id UUID NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    document_type VARCHAR(50) CHECK (document_type IN ('reference', 'data', 'report', 'presentation')),
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_research_documents_item ON research_documents(research_item_id);
CREATE INDEX idx_research_documents_file ON research_documents(file_id);
CREATE INDEX idx_research_documents_type ON research_documents(document_type);

-- =============================================================================
-- RESEARCH INSIGHTS TABLE
-- =============================================================================
CREATE TABLE research_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_item_id UUID NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    insight_type VARCHAR(50) CHECK (insight_type IN ('key_finding', 'opportunity', 'risk', 'recommendation')),
    impact_level VARCHAR(20) CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    supporting_findings UUID[] DEFAULT ARRAY[]::UUID[],
    action_items TEXT[],
    auto_generated BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_research_insights_item ON research_insights(research_item_id);
CREATE INDEX idx_research_insights_type ON research_insights(insight_type);
CREATE INDEX idx_research_insights_confidence ON research_insights(confidence_score DESC);
CREATE INDEX idx_research_insights_auto ON research_insights(auto_generated);
CREATE INDEX idx_research_insights_text ON research_insights USING GIN(to_tsvector('english', insight_text));

-- =============================================================================
-- RESEARCH COLLABORATION TABLE (For team collaboration on research)
-- =============================================================================
CREATE TABLE research_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_item_id UUID NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES research_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(30) CHECK (comment_type IN ('general', 'question', 'answer', 'clarification')),
    mentioned_users UUID[] DEFAULT ARRAY[]::UUID[],
    is_resolved BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_research_comments_item ON research_comments(research_item_id);
CREATE INDEX idx_research_comments_parent ON research_comments(parent_comment_id);
CREATE INDEX idx_research_comments_resolved ON research_comments(is_resolved);
CREATE INDEX idx_research_comments_created ON research_comments(created_at DESC);

-- =============================================================================
-- RESEARCH TEMPLATES TABLE
-- =============================================================================
CREATE TABLE research_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    research_type VARCHAR(50) NOT NULL CHECK (research_type IN ('market_analysis', 'user_research', 'competitive_analysis', 'brand_audit')),
    template_structure JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_research_templates_type ON research_templates(research_type);
CREATE INDEX idx_research_templates_public ON research_templates(is_public);
CREATE INDEX idx_research_templates_created ON research_templates(created_by);

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_research_items_updated_at
    BEFORE UPDATE ON research_items
    FOR EACH ROW
    EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_research_findings_updated_at
    BEFORE UPDATE ON research_findings
    FOR EACH ROW
    EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_research_insights_updated_at
    BEFORE UPDATE ON research_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_research_comments_updated_at
    BEFORE UPDATE ON research_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_research_templates_updated_at
    BEFORE UPDATE ON research_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_research_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
-- Function to auto-generate insights based on findings
CREATE OR REPLACE FUNCTION generate_research_insights(p_research_item_id UUID)
RETURNS VOID AS $$
DECLARE
    v_finding_count INTEGER;
    v_high_confidence_count INTEGER;
    v_recommendation_count INTEGER;
BEGIN
    -- Count findings
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE confidence_level = 'high'),
           COUNT(*) FILTER (WHERE finding_type = 'recommendation')
    INTO v_finding_count, v_high_confidence_count, v_recommendation_count
    FROM research_findings
    WHERE research_item_id = p_research_item_id;
    
    -- Generate insight if enough high-confidence findings
    IF v_high_confidence_count >= 3 AND v_recommendation_count > 0 THEN
        INSERT INTO research_insights (
            research_item_id,
            insight_text,
            insight_type,
            impact_level,
            confidence_score,
            auto_generated,
            created_by
        )
        SELECT 
            p_research_item_id,
            'Based on ' || v_high_confidence_count || ' high-confidence findings, key opportunities have been identified.',
            'opportunity',
            CASE 
                WHEN v_high_confidence_count >= 5 THEN 'high'
                ELSE 'medium'
            END,
            LEAST(1.0, v_high_confidence_count::decimal / 10),
            true,
            created_by
        FROM research_items
        WHERE id = p_research_item_id
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to tag research items based on content
CREATE OR REPLACE FUNCTION auto_tag_research_item(p_research_item_id UUID)
RETURNS VOID AS $$
DECLARE
    v_title TEXT;
    v_description TEXT;
    v_tags TEXT[];
BEGIN
    -- Get item details
    SELECT title, description, tags
    INTO v_title, v_description, v_tags
    FROM research_items
    WHERE id = p_research_item_id;
    
    -- Auto-generate tags based on content
    IF v_title ILIKE '%brand%' OR v_description ILIKE '%brand%' THEN
        v_tags := array_append(v_tags, 'branding');
    END IF;
    
    IF v_title ILIKE '%user%' OR v_description ILIKE '%customer%' THEN
        v_tags := array_append(v_tags, 'user-centric');
    END IF;
    
    IF v_title ILIKE '%market%' OR v_description ILIKE '%competitor%' THEN
        v_tags := array_append(v_tags, 'market-analysis');
    END IF;
    
    -- Update tags
    UPDATE research_items
    SET tags = array_distinct(v_tags)
    WHERE id = p_research_item_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to remove duplicate array elements
CREATE OR REPLACE FUNCTION array_distinct(arr anyarray)
RETURNS anyarray AS $$
SELECT array_agg(DISTINCT elem)
FROM unnest(arr) elem;
$$ LANGUAGE sql IMMUTABLE;

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================
-- Insert default research templates
INSERT INTO research_templates (name, description, research_type, template_structure, is_public, created_by)
SELECT 
    'Standard Market Analysis Template',
    'Comprehensive template for market analysis research',
    'market_analysis',
    '{
        "sections": [
            {"name": "Market Overview", "prompts": ["Market size", "Growth trends", "Key segments"]},
            {"name": "Competitive Landscape", "prompts": ["Major players", "Market share", "Competitive advantages"]},
            {"name": "Opportunities", "prompts": ["Unmet needs", "Emerging trends", "Growth potential"]},
            {"name": "Risks", "prompts": ["Market challenges", "Regulatory concerns", "Economic factors"]}
        ]
    }'::jsonb,
    true,
    u.id
FROM users u
WHERE u.role = 'admin'
LIMIT 1;

INSERT INTO research_templates (name, description, research_type, template_structure, is_public, created_by)
SELECT 
    'User Research Interview Guide',
    'Structured guide for conducting user research interviews',
    'user_research',
    '{
        "sections": [
            {"name": "Background", "prompts": ["User demographics", "Context of use", "Experience level"]},
            {"name": "Pain Points", "prompts": ["Current challenges", "Frustrations", "Workarounds"]},
            {"name": "Needs & Goals", "prompts": ["Primary objectives", "Success metrics", "Desired outcomes"]},
            {"name": "Feedback", "prompts": ["Feature requests", "Improvement suggestions", "Overall satisfaction"]}
        ]
    }'::jsonb,
    true,
    u.id
FROM users u
WHERE u.role = 'admin'
LIMIT 1;

-- =============================================================================
-- PERMISSIONS & SECURITY
-- =============================================================================
-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON research_items TO authenticated_users;
GRANT SELECT, INSERT, UPDATE ON research_findings TO authenticated_users;
GRANT SELECT, INSERT, UPDATE ON research_documents TO authenticated_users;
GRANT SELECT, INSERT, UPDATE ON research_insights TO authenticated_users;
GRANT SELECT, INSERT, UPDATE ON research_comments TO authenticated_users;
GRANT SELECT ON research_templates TO authenticated_users;
GRANT INSERT, UPDATE ON research_templates TO admin_users;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Enable RLS on all tables
ALTER TABLE research_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_comments ENABLE ROW LEVEL SECURITY;

-- Research items policy
CREATE POLICY research_items_access_policy ON research_items
    USING (
        project_id IN (
            SELECT p.id FROM projects p
            LEFT JOIN users c ON p.client_id = c.id
            WHERE p.client_id = current_user_id() 
               OR c.id = current_user_id()
               OR current_user_role() = 'admin'
        )
    );

-- Research findings policy
CREATE POLICY research_findings_access_policy ON research_findings
    USING (
        research_item_id IN (
            SELECT ri.id FROM research_items ri
            LEFT JOIN projects p ON ri.project_id = p.id
            LEFT JOIN users c ON p.client_id = c.id
            WHERE p.client_id = current_user_id() 
               OR c.id = current_user_id()
               OR current_user_role() = 'admin'
        )
    );

-- Research documents policy
CREATE POLICY research_documents_access_policy ON research_documents
    USING (
        research_item_id IN (
            SELECT ri.id FROM research_items ri
            LEFT JOIN projects p ON ri.project_id = p.id
            LEFT JOIN users c ON p.client_id = c.id
            WHERE p.client_id = current_user_id() 
               OR c.id = current_user_id()
               OR current_user_role() = 'admin'
        )
    );

-- Research comments policy
CREATE POLICY research_comments_access_policy ON research_comments
    USING (
        research_item_id IN (
            SELECT ri.id FROM research_items ri
            LEFT JOIN projects p ON ri.project_id = p.id
            LEFT JOIN users c ON p.client_id = c.id
            WHERE p.client_id = current_user_id()
               OR c.id = current_user_id()
               OR current_user_role() = 'admin'
        )
    );

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_role', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- FINAL COMMENTS
-- =============================================================================
COMMENT ON TABLE research_items IS 'Main research items table for tracking various research activities';
COMMENT ON TABLE research_findings IS 'Individual findings within research items';
COMMENT ON TABLE research_documents IS 'Documents attached to research items';
COMMENT ON TABLE research_insights IS 'High-level insights derived from research findings';
COMMENT ON TABLE research_comments IS 'Collaboration comments on research items';
COMMENT ON TABLE research_templates IS 'Reusable templates for research activities';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Research system tables created successfully!';
END $$;