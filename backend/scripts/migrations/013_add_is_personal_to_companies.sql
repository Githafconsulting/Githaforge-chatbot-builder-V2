-- Migration 013: Add is_personal Column to Companies Table
-- Purpose: Support personal workspace accounts (individual users vs companies)
-- Date: 2025-01-28

-- ============================================================================
-- ADD is_personal COLUMN
-- ============================================================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'is_personal'
  ) THEN
    ALTER TABLE companies
    ADD COLUMN is_personal BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN companies.is_personal IS 'True for individual/personal workspace accounts (vs company accounts)';

    RAISE NOTICE 'Added is_personal column to companies table';
  ELSE
    RAISE NOTICE 'Column is_personal already exists in companies table';
  END IF;
END $$;
