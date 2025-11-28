-- Migration 001: Create Companies Table
-- Purpose: Multi-tenant company/organization management
-- Date: 2025-01-27

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,

  -- Branding 
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#0ea5e9',

  -- Company Information
  company_size TEXT,
  industry TEXT,

  -- Plan & Limits
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_bots INTEGER DEFAULT 1,
  max_documents INTEGER DEFAULT 50,
  max_monthly_messages INTEGER DEFAULT 1000,

  -- Scope Configuration (for document classification)
  default_scopes TEXT[] DEFAULT ARRAY['sales', 'support', 'product', 'billing', 'hr', 'legal', 'marketing', 'general'],
  custom_scopes TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status & Timestamps
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at_trigger
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE companies IS 'Multi-tenant company/organization accounts';
COMMENT ON COLUMN companies.plan IS 'Subscription plan: free, pro, enterprise';
COMMENT ON COLUMN companies.max_bots IS 'Maximum chatbots allowed based on plan';
COMMENT ON COLUMN companies.default_scopes IS 'Predefined document classification scopes';
COMMENT ON COLUMN companies.custom_scopes IS 'Company-specific custom scopes';
COMMENT ON COLUMN companies.is_active IS 'Soft delete flag - false = suspended';