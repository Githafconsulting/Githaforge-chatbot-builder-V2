-- Migration 019: Create Scopes Table
-- Purpose: Role-based prompt configurations for chatbots
-- Date: 2025-11-30
-- Reference: docs/SCOPE_SYSTEM_IMPLEMENTATION_PLAN.md

-- ============================================================================
-- SCOPES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Basic Information
    name TEXT NOT NULL,
    description TEXT,

    -- System Prompt (LLM-generated or custom)
    system_prompt TEXT NOT NULL,

    -- Default Management
    is_default BOOLEAN DEFAULT FALSE,  -- TRUE = system-provided default scope
    default_prompt TEXT,               -- Original prompt for "Restore to Default"

    -- Prompt History (for "Restore to Last Saved")
    prompt_history JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"prompt": "...", "saved_at": "timestamp", "saved_by": "user_id"}, ...]

    -- Regeneration Context
    regenerate_context TEXT,  -- User notes for LLM when regenerating

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(company_id, name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scopes_company_id ON scopes(company_id);
CREATE INDEX IF NOT EXISTS idx_scopes_is_default ON scopes(is_default);
CREATE INDEX IF NOT EXISTS idx_scopes_name ON scopes(name);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Reuse existing trigger function if it exists, otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scopes_updated_at_trigger
    BEFORE UPDATE ON scopes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;

-- Users can only view scopes in their company
CREATE POLICY scopes_select_policy ON scopes
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Users can only insert scopes in their company
CREATE POLICY scopes_insert_policy ON scopes
    FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Users can only update scopes in their company
CREATE POLICY scopes_update_policy ON scopes
    FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Users can only delete scopes in their company (non-default only)
CREATE POLICY scopes_delete_policy ON scopes
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND is_default = FALSE  -- Cannot delete default scopes
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE scopes IS 'Role-based prompt configurations for chatbots';
COMMENT ON COLUMN scopes.company_id IS 'Company that owns this scope';
COMMENT ON COLUMN scopes.name IS 'Display name of the scope (e.g., "HR Support", "Sales")';
COMMENT ON COLUMN scopes.description IS 'User-provided description used to generate system_prompt';
COMMENT ON COLUMN scopes.system_prompt IS 'The LLM system prompt used for chatbots assigned to this scope';
COMMENT ON COLUMN scopes.is_default IS 'TRUE if this is a system-provided default scope (General, Sales, Support, etc.)';
COMMENT ON COLUMN scopes.default_prompt IS 'Original system prompt for restore-to-default functionality';
COMMENT ON COLUMN scopes.prompt_history IS 'Array of previous prompts for restore-to-last-saved functionality';
COMMENT ON COLUMN scopes.regenerate_context IS 'Additional context provided by user for prompt regeneration';
