-- Migration 018: Add Admin Billing Access Toggle
-- Purpose: Allow owners to control whether admins can access billing
-- Date: 2025-11-29

-- Add admin_can_access_billing column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS admin_can_access_billing BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN companies.admin_can_access_billing IS 'Whether admins can access billing pages (owner-controlled toggle)';
