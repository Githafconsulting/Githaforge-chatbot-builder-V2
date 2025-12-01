-- Migration 021: Update Documents Table for Sharing
-- Purpose: Add is_shared flag to documents for shared vs chatbot-specific KB
-- Date: 2025-11-30
-- Reference: docs/SCOPE_SYSTEM_IMPLEMENTATION_PLAN.md

-- ============================================================================
-- ADD SHARING FLAG
-- ============================================================================

-- Add is_shared column (default TRUE for backwards compatibility)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Migrate existing documents to shared (safe default)
UPDATE documents SET is_shared = TRUE WHERE is_shared IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for filtering by sharing status
CREATE INDEX IF NOT EXISTS idx_documents_is_shared ON documents(is_shared);

-- Composite index for efficient shared KB queries
CREATE INDEX IF NOT EXISTS idx_documents_company_shared ON documents(company_id, is_shared)
WHERE is_shared = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN documents.is_shared IS 'TRUE = available to all chatbots via shared KB, FALSE = only via explicit document selection';
