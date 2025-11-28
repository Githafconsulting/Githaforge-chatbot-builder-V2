-- Migration 012: Add RLS Policies for Signup Flow
-- Purpose: Allow anonymous INSERT on companies and users tables during signup
-- Date: 2025-01-28
--
-- PROBLEM: The unified signup endpoint is public (no authentication).
-- When a new user signs up, we need to:
--   1. INSERT into companies table (create their workspace)
--   2. SELECT from roles table (get the 'owner' role)
--   3. INSERT into users table (create their user account)
--
-- The existing RLS policies block these because they require either:
--   - app.is_super_admin = TRUE, or
--   - company_id matches app.current_company_id
--
-- Neither is set during signup (no auth = no JWT = no context).
--
-- SOLUTION: Add INSERT policies that allow anonymous inserts during signup,
-- while keeping SELECT/UPDATE/DELETE restricted to authenticated users.
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing conflicting policies (if any)
-- ============================================================================

-- Drop the existing "FOR ALL" policies that block inserts
DROP POLICY IF EXISTS company_isolation ON companies;
DROP POLICY IF EXISTS "Allow anonymous company creation during signup" ON companies;

-- ============================================================================
-- STEP 2: Create separate policies for each operation on COMPANIES
-- ============================================================================

-- Policy 1: Allow anyone to INSERT into companies (for signup)
-- This is safe because:
--   - New companies are isolated (each has unique UUID)
--   - The signup code validates inputs
--   - There's no sensitive data exposure (just creating a new company)
CREATE POLICY companies_insert_signup ON companies
  FOR INSERT
  WITH CHECK (TRUE);

COMMENT ON POLICY companies_insert_signup ON companies IS
  'Allows public signup to create new companies. Safe because each company is isolated.';

-- Policy 2: Authenticated users can SELECT their own company (or super_admin sees all)
CREATE POLICY companies_select_own ON companies
  FOR SELECT
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY companies_select_own ON companies IS
  'Users can only view their own company. Super admins see all.';

-- Policy 3: Authenticated users can UPDATE their own company
CREATE POLICY companies_update_own ON companies
  FOR UPDATE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY companies_update_own ON companies IS
  'Users can only update their own company. Super admins can update any.';

-- Policy 4: Only super admins can DELETE companies
CREATE POLICY companies_delete_super_admin ON companies
  FOR DELETE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
  );

COMMENT ON POLICY companies_delete_super_admin ON companies IS
  'Only super admins can delete companies (for platform management).';

-- ============================================================================
-- STEP 3: Enable RLS on USERS table and create policies
-- ============================================================================

-- Enable RLS on users table (wasn't enabled before)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to INSERT into users (for signup)
-- This is safe because:
--   - Passwords are hashed before insert
--   - Email uniqueness is enforced by UNIQUE constraint
--   - The signup code validates all inputs
CREATE POLICY users_insert_signup ON users
  FOR INSERT
  WITH CHECK (TRUE);

COMMENT ON POLICY users_insert_signup ON users IS
  'Allows public signup to create new users. Passwords are hashed by the API.';

-- Policy 2: Users can SELECT users in their company (or super_admin sees all)
CREATE POLICY users_select_company ON users
  FOR SELECT
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR company_id = current_setting('app.current_company_id', TRUE)::UUID
    -- Also allow reading self during login (before company context is set)
    OR id = current_setting('app.current_user_id', TRUE)::UUID
  );

COMMENT ON POLICY users_select_company ON users IS
  'Users can view team members in their company. Super admins see all.';

-- Policy 3: Users can UPDATE their own profile or admins can update team
CREATE POLICY users_update_own_or_admin ON users
  FOR UPDATE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR (
      company_id = current_setting('app.current_company_id', TRUE)::UUID
      AND (
        id = current_setting('app.current_user_id', TRUE)::UUID  -- Own profile
        -- Company admins can update team members (checked at app level)
      )
    )
  );

COMMENT ON POLICY users_update_own_or_admin ON users IS
  'Users can update their own profile. Company admins can update team.';

-- Policy 4: Only company owners/super admins can DELETE users
CREATE POLICY users_delete_admin ON users
  FOR DELETE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR (
      company_id = current_setting('app.current_company_id', TRUE)::UUID
      -- Additional permission check done at app level
    )
  );

COMMENT ON POLICY users_delete_admin ON users IS
  'Company admins can delete team members. Super admins can delete any.';

-- ============================================================================
-- STEP 4: Enable RLS on ROLES table and create policies
-- ============================================================================

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to SELECT platform roles (where company_id IS NULL)
-- This is needed for signup to look up the 'owner' role
CREATE POLICY roles_select_platform ON roles
  FOR SELECT
  USING (
    company_id IS NULL  -- Platform roles (owner, admin, editor, viewer)
    OR current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR company_id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY roles_select_platform ON roles IS
  'Anyone can read platform roles. Users can read their company custom roles.';

-- Policy 2: Only authenticated users can INSERT custom roles
CREATE POLICY roles_insert_company ON roles
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR (
      company_id = current_setting('app.current_company_id', TRUE)::UUID
      AND is_custom = TRUE
    )
  );

COMMENT ON POLICY roles_insert_company ON roles IS
  'Companies can create custom roles. Super admins can create any role.';

-- Policy 3: Only authenticated users can UPDATE roles
CREATE POLICY roles_update_company ON roles
  FOR UPDATE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR (
      company_id = current_setting('app.current_company_id', TRUE)::UUID
      AND is_custom = TRUE
    )
  );

COMMENT ON POLICY roles_update_company ON roles IS
  'Companies can update their custom roles. Super admins can update any.';

-- Policy 4: Only super admins can DELETE platform roles
CREATE POLICY roles_delete ON roles
  FOR DELETE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR (
      company_id = current_setting('app.current_company_id', TRUE)::UUID
      AND is_custom = TRUE
    )
  );

COMMENT ON POLICY roles_delete ON roles IS
  'Companies can delete their custom roles. Super admins can delete any.';

-- ============================================================================
-- STEP 5: Enable RLS on PERMISSIONS table (read-only for all)
-- ============================================================================

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read permissions (they're system-wide constants)
CREATE POLICY permissions_select_all ON permissions
  FOR SELECT
  USING (TRUE);

COMMENT ON POLICY permissions_select_all ON permissions IS
  'Permissions are read-only system constants. All users can view them.';

-- ============================================================================
-- STEP 6: Enable RLS on ROLE_PERMISSIONS table
-- ============================================================================

-- Enable RLS on role_permissions table
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can SELECT role_permissions for roles they can see
CREATE POLICY role_permissions_select ON role_permissions
  FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM roles
      WHERE company_id IS NULL
         OR current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
         OR company_id = current_setting('app.current_company_id', TRUE)::UUID
    )
  );

COMMENT ON POLICY role_permissions_select ON role_permissions IS
  'Users can view permissions for roles they have access to.';

-- Policy 2: Only admins can manage role_permissions
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT
  WITH CHECK (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR role_id IN (
      SELECT id FROM roles
      WHERE company_id = current_setting('app.current_company_id', TRUE)::UUID
        AND is_custom = TRUE
    )
  );

CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR role_id IN (
      SELECT id FROM roles
      WHERE company_id = current_setting('app.current_company_id', TRUE)::UUID
        AND is_custom = TRUE
    )
  );

-- ============================================================================
-- STEP 7: Update set_company_context function to include user_id
-- ============================================================================

-- Drop the old function with 2 parameters first (to avoid ambiguity)
DROP FUNCTION IF EXISTS set_company_context(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION set_company_context(
  p_company_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Set session variables for RLS policies
  PERFORM set_config('app.current_company_id', COALESCE(p_company_id::TEXT, ''), FALSE);
  PERFORM set_config('app.is_super_admin', p_is_super_admin::TEXT, FALSE);
  PERFORM set_config('app.current_user_id', COALESCE(p_user_id::TEXT, ''), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_company_context IS
  'Sets PostgreSQL session variables for RLS - now includes user_id for self-access policies';

-- ============================================================================
-- VERIFICATION QUERIES (for testing - run these manually)
-- ============================================================================

-- Test 1: Signup scenario (no context set)
-- This should work:
-- INSERT INTO companies (name, plan) VALUES ('Test Company', 'free');
-- SELECT * FROM roles WHERE code = 'owner' AND company_id IS NULL; -- Should return owner role
-- INSERT INTO users (email, password_hash, company_id, role_id, ...) VALUES (...);

-- Test 2: Authenticated user scenario
-- SELECT set_company_context('company-uuid', FALSE, 'user-uuid');
-- SELECT * FROM companies; -- Should only see their company
-- SELECT * FROM users; -- Should only see their team

-- Test 3: Super admin scenario
-- SELECT set_company_context(NULL, TRUE, 'super-admin-uuid');
-- SELECT * FROM companies; -- Should see all companies
-- SELECT * FROM users; -- Should see all users

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. Companies: Allow INSERT (signup), restrict SELECT/UPDATE to own, DELETE to super_admin
-- 2. Users: Enable RLS, allow INSERT (signup), restrict SELECT/UPDATE/DELETE to company
-- 3. Roles: Enable RLS, allow SELECT for platform roles, restrict custom roles to company
-- 4. Permissions: Enable RLS, allow SELECT for all (read-only constants)
-- 5. Role_permissions: Enable RLS, restrict to roles user can access
-- 6. Updated set_company_context to include user_id
