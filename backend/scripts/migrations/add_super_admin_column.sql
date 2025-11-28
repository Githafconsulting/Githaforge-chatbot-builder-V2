-- Add is_super_admin column to users table
-- Migration: Add Super Admin Support
-- Date: January 27, 2025

-- Add the column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = TRUE;

-- Update RLS policies to allow super admins (if RLS is enabled)
-- Note: This assumes you have RLS policies. Adjust as needed for your setup.

COMMENT ON COLUMN users.is_super_admin IS 'Flag indicating if user has super admin (platform-wide) privileges';
