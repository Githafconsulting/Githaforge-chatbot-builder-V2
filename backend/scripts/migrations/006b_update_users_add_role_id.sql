-- Migration 006b: Update Users Table for RBAC (Part 2)
-- Purpose: Add role_id to users after roles table is created
-- Date: 2025-01-27
-- Note: This runs after migration 006 (create_rbac_tables)

-- ============================================================================
-- ADD ROLE_ID COLUMN TO USERS TABLE
-- ============================================================================

-- Add role-based access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure super_admin users have no company_id (platform-level)
-- Regular users must have company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_company_role'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_company_role CHECK (
      (role = 'super_admin' AND company_id IS NULL) OR
      (role != 'super_admin' AND company_id IS NOT NULL) OR
      (role IS NULL AND role_id IS NOT NULL)
    );
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.role_id IS 'RBAC role assignment - replaces legacy role field';