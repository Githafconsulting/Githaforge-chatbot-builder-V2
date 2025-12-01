-- Migration 024: Add Response Style to Chatbots
-- Purpose: Allow chatbots to have configurable response verbosity
-- Date: 2025-12-01
-- Options: 'concise' (1-2 sentences), 'standard' (2-3 sentences), 'detailed' (3-5 sentences)

-- ============================================================================
-- ADD RESPONSE STYLE FIELD TO CHATBOTS
-- ============================================================================

ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS response_style VARCHAR(20) DEFAULT 'standard'
CHECK (response_style IN ('concise', 'standard', 'detailed'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN chatbots.response_style IS 'Response verbosity: concise (1-2 sentences), standard (2-3 sentences), detailed (3-5 sentences)';
