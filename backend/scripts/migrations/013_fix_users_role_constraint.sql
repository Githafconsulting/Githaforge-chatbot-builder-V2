-- =====================================================
-- FIX: Update users.role CHECK constraint to allow RBAC roles
-- =====================================================
-- Issue: users table has a CHECK constraint that blocks certain role values
-- Solution: Drop the old constraint and create a new one that allows all RBAC roles
-- =====================================================

-- Step 1: Find and drop the existing role CHECK constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
      AND conname != 'chk_users_company_role';  -- Don't drop the company-role check

    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No role CHECK constraint found to drop';
    END IF;
END $$;

-- Step 2: Create new constraint that allows all valid roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('super_admin', 'owner', 'admin', 'member', 'editor', 'trainer', 'analyst', 'viewer')
    OR role IS NULL  -- Allow NULL when using role_id
);

-- Step 3: Verify the constraints
SELECT
    conname AS "Constraint Name",
    pg_get_constraintdef(oid) AS "Definition"
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND contype = 'c'
ORDER BY conname;

COMMIT;
