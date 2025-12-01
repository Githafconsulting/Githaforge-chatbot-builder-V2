-- Migration 020: Update Chatbots Table for Scopes
-- Purpose: Add scope reference and knowledge base mode to chatbots
-- Date: 2025-11-30
-- Reference: docs/SCOPE_SYSTEM_IMPLEMENTATION_PLAN.md

-- ============================================================================
-- ADD SCOPE REFERENCE
-- ============================================================================

-- Add scope_id column to link chatbots to scopes
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS scope_id UUID REFERENCES scopes(id) ON DELETE SET NULL;

-- ============================================================================
-- ADD KNOWLEDGE BASE MODE
-- ============================================================================

-- Add flag to determine if chatbot uses shared KB or specific documents
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS use_shared_kb BOOLEAN DEFAULT TRUE;

-- Add array of selected document IDs for non-shared KB mode
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS selected_document_ids UUID[] DEFAULT '{}';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for scope lookup
CREATE INDEX IF NOT EXISTS idx_chatbots_scope_id ON chatbots(scope_id);

-- Index for KB mode filtering
CREATE INDEX IF NOT EXISTS idx_chatbots_use_shared_kb ON chatbots(use_shared_kb);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN chatbots.scope_id IS 'Reference to scope for role-specific prompt behavior. NULL = use default prompt';
COMMENT ON COLUMN chatbots.use_shared_kb IS 'TRUE = use shared KB with scope filtering, FALSE = use only selected documents';
COMMENT ON COLUMN chatbots.selected_document_ids IS 'When use_shared_kb=FALSE, only these documents are accessible to the chatbot';
