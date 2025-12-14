-- Migration 028: Embeddings Multi-Tenancy and Comprehensive Indexing
-- Purpose: Fix multi-tenancy isolation at the database level by filtering BEFORE similarity search
-- Date: 2025-12-14
--
-- PROBLEM:
--   The current match_documents RPC searches ALL embeddings globally, then filters by company_id
--   afterward in Python. With thousands of companies, target company's documents may not rank
--   in top results because other companies' documents fill up the result set first.
--
-- SOLUTION:
--   1. Add company_id directly to embeddings table (denormalization for performance)
--   2. Update match_documents RPC to filter by company_id DURING the search
--   3. Add composite index (company_id, embedding) for optimal tenant-scoped vector searches
--   4. Add comprehensive indexes across all tables for query performance
--
-- BENEFITS:
--   - True multi-tenant isolation at database level
--   - Faster queries (filter first, then search within filtered set)
--   - Reduced data transfer (only relevant embeddings returned)
--   - Scalable to thousands of companies

-- ============================================================================
-- PART 1: ADD COMPANY_ID TO EMBEDDINGS TABLE
-- ============================================================================

-- Add company_id column to embeddings (nullable initially for backfill)
ALTER TABLE embeddings
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================================
-- PART 2: BACKFILL EXISTING EMBEDDINGS WITH COMPANY_ID FROM DOCUMENTS
-- ============================================================================

-- Populate company_id from parent documents table
UPDATE embeddings e
SET company_id = d.company_id
FROM documents d
WHERE e.document_id = d.id
  AND e.company_id IS NULL
  AND d.company_id IS NOT NULL;

-- Log how many were updated (for verification)
DO $$
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM embeddings WHERE company_id IS NOT NULL;
    SELECT COUNT(*) INTO null_count FROM embeddings WHERE company_id IS NULL;
    RAISE NOTICE 'Backfill complete: % embeddings have company_id, % still NULL', updated_count, null_count;
END $$;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR EMBEDDINGS TABLE
-- ============================================================================

-- Primary index: company_id for tenant isolation (B-tree for equality filtering)
-- This index is used FIRST to filter by company, then vector search happens within that subset
CREATE INDEX IF NOT EXISTS idx_embeddings_company_id
ON embeddings(company_id);

-- Vector index for similarity search (IVFFlat with cosine distance)
-- Note: pgvector doesn't support composite indexes with (company_id, vector)
-- Strategy: Use company_id B-tree index for filtering, then vector index for similarity
-- The query planner will use both indexes together

-- First, drop any existing vector indexes to recreate with proper settings
DROP INDEX IF EXISTS idx_embeddings_embedding;

-- Create IVFFlat index for vector similarity search
-- lists = 100 is good for datasets up to ~1M vectors
-- For larger datasets, use lists = sqrt(num_vectors)
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_ivfflat
ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better recall, faster queries, but more memory and slower builds)
-- Uncomment to use HNSW instead of IVFFlat:
-- DROP INDEX IF EXISTS idx_embeddings_embedding_ivfflat;
-- CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_hnsw
-- ON embeddings USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- Document reference index (for JOIN operations and cascade deletes)
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id
ON embeddings(document_id);

-- Composite for common query pattern: document + company
CREATE INDEX IF NOT EXISTS idx_embeddings_document_company
ON embeddings(document_id, company_id);

-- ============================================================================
-- PART 4: UPDATE MATCH_DOCUMENTS RPC FUNCTION
-- ============================================================================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS match_documents(vector, float, int);
DROP FUNCTION IF EXISTS match_documents(vector(384), float, int);

-- Create new match_documents function with company_id parameter
-- This is the CRITICAL fix: filtering happens INSIDE the database query
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    filter_company_id uuid DEFAULT NULL  -- NEW: Optional company filter
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float,
    company_id uuid  -- NEW: Return company_id for verification
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.document_id,
        e.chunk_text as content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.company_id
    FROM embeddings e
    WHERE
        -- Apply company filter if provided (CRITICAL for multi-tenancy)
        (filter_company_id IS NULL OR e.company_id = filter_company_id)
        -- Apply similarity threshold
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents(vector(384), float, int, uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- PART 5: CREATE ALTERNATIVE FUNCTION FOR STRICT COMPANY ISOLATION
-- ============================================================================

-- This function REQUIRES company_id (non-optional) for stricter isolation
CREATE OR REPLACE FUNCTION match_documents_by_company(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    target_company_id uuid  -- REQUIRED: Must provide company_id
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id is required for match_documents_by_company';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.document_id,
        e.chunk_text as content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE e.company_id = target_company_id
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents_by_company(vector(384), float, int, uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- PART 6: COMPREHENSIVE INDEXES FOR OTHER TABLES
-- ============================================================================

-- COMPANIES TABLE
-- Already has: is_active, plan, created_at from migration 001
-- Note: companies table has 'name' but not 'slug' column
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- CHATBOTS TABLE
-- Already has: company_id, deploy_status, is_active, created_at, (company_id, is_active) from migration 002
CREATE INDEX IF NOT EXISTS idx_chatbots_name ON chatbots(name);
CREATE INDEX IF NOT EXISTS idx_chatbots_company_deploy ON chatbots(company_id, deploy_status);

-- USERS TABLE
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- DOCUMENTS TABLE
-- Already has many indexes from migrations 004 and 021
-- Add any missing composite indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_created ON documents(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company_category ON documents(company_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_company_shared_scope ON documents(company_id, is_shared, scope);

-- CONVERSATIONS TABLE
-- Already has: chatbot_id, (chatbot_id, created_at) from migration 005
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_session ON conversations(chatbot_id, session_id);

-- MESSAGES TABLE
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- FEEDBACK TABLE
-- Already has: message_id, rating, conversation_id from migrations
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_conversation_rating ON feedback(conversation_id, rating);

-- SYSTEM_SETTINGS TABLE (singleton, but add index for safety)
CREATE INDEX IF NOT EXISTS idx_system_settings_updated ON system_settings(updated_at DESC);

-- ROLES TABLE
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- PERMISSIONS TABLE
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

-- ROLE_PERMISSIONS TABLE
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================================
-- PART 7: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN embeddings.company_id IS 'Denormalized company_id from documents table for efficient multi-tenant similarity search';

COMMENT ON FUNCTION match_documents(vector(384), float, int, uuid) IS
'Similarity search with optional company isolation. Use filter_company_id for multi-tenant queries.';

COMMENT ON FUNCTION match_documents_by_company(vector(384), float, int, uuid) IS
'Similarity search with REQUIRED company isolation. Use for strict multi-tenant enforcement.';

COMMENT ON INDEX idx_embeddings_embedding_ivfflat IS
'IVFFlat vector index for similarity search. Used with idx_embeddings_company_id for tenant-scoped queries.';

-- ============================================================================
-- PART 8: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify success:

-- 1. Check embeddings have company_id populated
-- SELECT
--     COUNT(*) as total,
--     COUNT(company_id) as with_company_id,
--     COUNT(*) - COUNT(company_id) as without_company_id
-- FROM embeddings;

-- 2. Verify function exists with correct signature
-- SELECT routine_name, data_type
-- FROM information_schema.routines
-- WHERE routine_name IN ('match_documents', 'match_documents_by_company');

-- 3. Check indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'embeddings';

-- 4. Test company-filtered search (replace with real values)
-- SELECT * FROM match_documents(
--     '[0.1, 0.2, ...]'::vector(384),
--     0.3,
--     5,
--     'your-company-uuid'::uuid
-- );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Update vectorstore_service.py to pass company_id to match_documents RPC
-- 2. Update store_embedding functions to include company_id
-- 3. Test with actual queries to verify isolation
