-- Migration: Add trial_ends_at column to companies table
-- Description: Adds trial expiration date for 14-day Pro trial feature
-- Run this migration in Supabase SQL Editor

-- Add trial_ends_at column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the column
COMMENT ON COLUMN companies.trial_ends_at IS 'When the Pro trial ends. NULL means no trial or trial expired.';

-- Create an index for efficient querying of trial status
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at ON companies(trial_ends_at);

-- Update existing companies: Set trial_ends_at to 14 days from their created_at date
-- This gives existing users a fair trial period
UPDATE companies
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE trial_ends_at IS NULL
  AND plan = 'free';

-- For companies already on paid plans, leave trial_ends_at as NULL (no trial needed)
