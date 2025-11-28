-- Migration 004: Update Documents Table for Multi-Tenancy & AI Classification
-- Purpose: Add company_id, chatbot_id, scope, and classification fields
-- Date: 2025-01-27

-- ============================================================================
-- ADD COLUMNS TO DOCUMENTS TABLE
-- ============================================================================

-- Multi-tenancy columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL;

-- AI Classification columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS topics TEXT[];

-- Classification metadata
ALTER TABLE documents ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification_confidence FLOAT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification_metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Multi-tenancy indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_chatbot_id ON documents(chatbot_id);

-- Scope filtering index
CREATE INDEX IF NOT EXISTS idx_documents_scope ON documents(scope);

-- Array indexes for categories and topics (GIN index for efficient array operations)
CREATE INDEX IF NOT EXISTS idx_documents_categories ON documents USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_documents_topics ON documents USING GIN(topics);

-- Combined index for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_company_scope ON documents(company_id, scope);
CREATE INDEX IF NOT EXISTS idx_documents_company_chatbot ON documents(company_id, chatbot_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN documents.company_id IS 'Company ownership - enforces isolation';
COMMENT ON COLUMN documents.chatbot_id IS 'Optional chatbot assignment - NULL means shared across company bots';
COMMENT ON COLUMN documents.scope IS 'Primary scope classification: sales, support, product, billing, hr, legal, marketing, general';
COMMENT ON COLUMN documents.categories IS 'Specific topic categories (e.g., ["pricing", "enterprise", "api"])';
COMMENT ON COLUMN documents.topics IS 'Key themes/subjects extracted from content';
COMMENT ON COLUMN documents.auto_classified IS 'Whether LLM auto-classified this document';
COMMENT ON COLUMN documents.classification_confidence IS 'LLM confidence score (0.0-1.0)';
COMMENT ON COLUMN documents.classification_metadata IS 'Additional classification data (secondary_scopes, etc.)';