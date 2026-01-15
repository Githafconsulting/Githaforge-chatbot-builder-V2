-- Migration: Add pending_plan columns to companies table
-- These columns track scheduled plan changes (for end-of-cycle downgrades)

-- Add pending_plan column
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS pending_plan VARCHAR(20) DEFAULT NULL;

-- Add pending_plan_effective_date column
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS pending_plan_effective_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.pending_plan IS 'Plan scheduled to take effect at end of billing cycle (for downgrades)';
COMMENT ON COLUMN companies.pending_plan_effective_date IS 'Date when pending_plan takes effect';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name IN ('pending_plan', 'pending_plan_effective_date');
