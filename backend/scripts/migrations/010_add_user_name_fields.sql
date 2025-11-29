-- Migration 010: Add first_name and last_name columns to users table
-- Purpose: Support separate first/last name fields for better user management
-- Date: 2025-11-29

-- ============================================================================
-- ADD COLUMNS TO USERS TABLE
-- ============================================================================

-- Add first_name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

-- Add last_name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- ============================================================================
-- BACKFILL: Populate first_name/last_name from full_name
-- ============================================================================

-- For existing users with full_name, split into first_name and last_name
UPDATE users
SET
    first_name = SPLIT_PART(full_name, ' ', 1),
    last_name = CASE
        WHEN POSITION(' ' IN full_name) > 0
        THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
        ELSE NULL
    END
WHERE full_name IS NOT NULL
  AND first_name IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.first_name IS 'User first name - separate from full_name for better UI/UX';
COMMENT ON COLUMN users.last_name IS 'User last name - separate from full_name for better UI/UX';
