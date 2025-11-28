-- Migration 002: Create Chatbots Table
-- Purpose: Multi-chatbot management per company
-- Date: 2025-01-27

-- ============================================================================
-- CHATBOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  greeting_message TEXT DEFAULT 'Hi! How can I help you today?',

  -- Branding (inherits from company if NULL)
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,

  -- Access Control & Filtering
  allowed_scopes TEXT[],           -- Document scope filtering (e.g., ['sales', 'product'])
  allowed_domains TEXT[],          -- CORS whitelist for widget embedding
  rate_limit_per_ip INTEGER DEFAULT 10,

  -- AI Configuration Presets
  model_preset TEXT DEFAULT 'balanced' CHECK (model_preset IN ('fast', 'balanced', 'accurate')),
  temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 500 CHECK (max_tokens >= 50 AND max_tokens <= 2000),
  top_k INTEGER DEFAULT 5 CHECK (top_k >= 1 AND top_k <= 20),
  similarity_threshold FLOAT DEFAULT 0.5 CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),

  -- Deployment Status
  is_active BOOLEAN DEFAULT TRUE,
  deploy_status TEXT DEFAULT 'draft' CHECK (deploy_status IN ('draft', 'deployed', 'paused')),

  -- Usage Metrics (updated via triggers/background jobs)
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_satisfaction FLOAT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_deployed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chatbots_company_id ON chatbots(company_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_deploy_status ON chatbots(deploy_status);
CREATE INDEX IF NOT EXISTS idx_chatbots_is_active ON chatbots(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbots_created_at ON chatbots(created_at DESC);

-- Combined index for common query pattern
CREATE INDEX IF NOT EXISTS idx_chatbots_company_active ON chatbots(company_id, is_active);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chatbots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chatbots_updated_at_trigger
  BEFORE UPDATE ON chatbots
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbots_updated_at();

-- ============================================================================
-- DEPLOY STATUS TRIGGER (Update last_deployed_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chatbots_last_deployed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deploy_status = 'deployed' AND (OLD.deploy_status IS NULL OR OLD.deploy_status != 'deployed') THEN
    NEW.last_deployed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chatbots_deploy_status_trigger
  BEFORE UPDATE ON chatbots
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbots_last_deployed_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE chatbots IS 'Chatbot instances belonging to companies';
COMMENT ON COLUMN chatbots.company_id IS 'Foreign key to companies table - enforces multi-tenancy';
COMMENT ON COLUMN chatbots.allowed_scopes IS 'Document scopes this bot can access (null = all scopes)';
COMMENT ON COLUMN chatbots.model_preset IS 'AI behavior preset: fast (lower quality), balanced, accurate (higher quality)';
COMMENT ON COLUMN chatbots.deploy_status IS 'Deployment state: draft (not live), deployed (active), paused (temporarily disabled)';
COMMENT ON COLUMN chatbots.total_conversations IS 'Cached count of conversations - updated by trigger';
COMMENT ON COLUMN chatbots.total_messages IS 'Cached count of messages - updated by trigger';