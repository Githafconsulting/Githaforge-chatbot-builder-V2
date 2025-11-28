-- Migration 003: Update Users Table for Multi-Tenancy (Part 1)
-- Purpose: Add company_id to users
-- Date: 2025-01-27
-- Note: role_id will be added in migration 006b after roles table is created

-- ============================================================================
-- ADD COLUMNS TO USERS TABLE
-- ============================================================================

-- Add company association
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Keep legacy 'role' field for backwards compatibility with super_admin
-- ALTER TABLE users.role field already exists, no changes needed

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Combined index for common query pattern
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.company_id IS 'Company association - NULL for super_admin only';
COMMENT ON COLUMN users.role IS 'Legacy role field - kept for super_admin compatibility';