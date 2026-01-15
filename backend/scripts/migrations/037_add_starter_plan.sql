-- Migration 037: Add Starter Plan to Companies
-- Purpose: Add 'starter' tier to the plan column CHECK constraint
-- Date: 2025-01-15

-- ============================================================================
-- UPDATE PLAN CHECK CONSTRAINT
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_plan_check;

-- Add the updated constraint with 'starter' included
ALTER TABLE companies ADD CONSTRAINT companies_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN companies.plan IS 'Subscription plan: free, starter, pro, enterprise';

-- ============================================================================
-- VERIFY THE CONSTRAINT
-- ============================================================================

-- This query will show the new constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'companies'::regclass
AND conname = 'companies_plan_check';
