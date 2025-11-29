-- Migration 015: Add System Chatbot Support
-- Purpose: Enable platform-level chatbot for the Githaforge website
-- Date: 2025-11-29

-- ============================================================================
-- ADD SYSTEM FLAGS TO COMPANIES AND CHATBOTS
-- ============================================================================

-- Add is_platform flag to companies (identifies the Githaforge platform company)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_platform BOOLEAN DEFAULT FALSE;

-- Add is_system flag to chatbots (identifies platform-managed chatbots)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- INDEXES FOR QUICK LOOKUP
-- ============================================================================

-- Index for finding the platform company quickly
CREATE INDEX IF NOT EXISTS idx_companies_is_platform ON companies(is_platform) WHERE is_platform = TRUE;

-- Index for finding system chatbots quickly
CREATE INDEX IF NOT EXISTS idx_chatbots_is_system ON chatbots(is_system) WHERE is_system = TRUE;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure only one platform company exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_unique_platform
ON companies(is_platform) WHERE is_platform = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN companies.is_platform IS 'True for the Githaforge platform company (only one allowed)';
COMMENT ON COLUMN chatbots.is_system IS 'True for platform-managed system chatbots (e.g., website demo bot)';

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT
--   'companies' as table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'companies' AND column_name = 'is_platform'
-- UNION ALL
-- SELECT
--   'chatbots' as table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'chatbots' AND column_name = 'is_system';