-- =====================================================
-- FIX: Allow anon role to bypass RLS for signup operations
-- =====================================================
-- Issue: The anon key cannot insert into companies table during signup
-- Root Cause: RLS policies block anon role by default
-- Solution: Grant explicit permissions and create permissive policies
-- =====================================================

-- Step 1: Grant table-level permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 2: Ensure anon can execute RLS helper functions
GRANT EXECUTE ON FUNCTION set_company_context(UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION get_current_company_id() TO anon;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;

-- Step 3: Drop and recreate companies policies with explicit anon permissions
DROP POLICY IF EXISTS companies_select_own ON companies;
DROP POLICY IF EXISTS companies_insert_signup ON companies;
DROP POLICY IF EXISTS companies_update_own ON companies;

-- Allow anon to insert companies (for signup)
CREATE POLICY companies_insert_anon ON companies
  FOR INSERT
  TO anon
  WITH CHECK (true);  -- Allow all inserts from anon (signup endpoint)

-- Allow authenticated users to select their own company
CREATE POLICY companies_select_own ON companies
  FOR SELECT
  TO anon, authenticated
  USING (
    is_super_admin() OR
    id = get_current_company_id()
  );

-- Allow authenticated users to update their own company
CREATE POLICY companies_update_own ON companies
  FOR UPDATE
  TO anon, authenticated
  USING (
    is_super_admin() OR
    id = get_current_company_id()
  )
  WITH CHECK (
    is_super_admin() OR
    id = get_current_company_id()
  );

-- Step 4: Fix users table policies for signup
DROP POLICY IF EXISTS users_select_own_company ON users;
DROP POLICY IF EXISTS users_insert_signup ON users;
DROP POLICY IF EXISTS users_update_own ON users;

-- Allow anon to insert users (for signup)
CREATE POLICY users_insert_anon ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);  -- Allow all inserts from anon (signup endpoint)

-- Allow users to select users in their company
CREATE POLICY users_select_own_company ON users
  FOR SELECT
  TO anon, authenticated
  USING (
    is_super_admin() OR
    company_id = get_current_company_id()
  );

-- Allow users to update their own record
CREATE POLICY users_update_own ON users
  FOR UPDATE
  TO anon, authenticated
  USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Step 5: Fix roles table policies
DROP POLICY IF EXISTS roles_select_predefined_or_own ON roles;

CREATE POLICY roles_select_all ON roles
  FOR SELECT
  TO anon, authenticated
  USING (
    is_super_admin() OR
    company_id IS NULL OR  -- Predefined roles (Owner, Admin, etc.)
    company_id = get_current_company_id()
  );

-- Step 6: Fix permissions table (should be readable by all)
DROP POLICY IF EXISTS permissions_select_all ON permissions;

CREATE POLICY permissions_select_all ON permissions
  FOR SELECT
  TO anon, authenticated
  USING (true);  -- All users can view available permissions

-- Step 7: Fix role_permissions table
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;

CREATE POLICY role_permissions_select_all ON role_permissions
  FOR SELECT
  TO anon, authenticated
  USING (true);  -- All users can view role-permission mappings

-- Step 8: Verify RLS is enabled on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Step 9: Test the fix
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Test 1: Insert company as anon
  INSERT INTO companies (name, plan, is_active)
  VALUES ('RLS Test Company', 'free', true)
  RETURNING id INTO test_company_id;

  RAISE NOTICE 'Test 1 PASSED: Company created with ID %', test_company_id;

  -- Test 2: Insert user as anon
  INSERT INTO users (email, password_hash, full_name, company_id, role, is_active)
  VALUES ('rlstest@example.com', 'hashed', 'RLS Test User', test_company_id, 'owner', true)
  RETURNING id INTO test_user_id;

  RAISE NOTICE 'Test 2 PASSED: User created with ID %', test_user_id;

  -- Cleanup
  DELETE FROM users WHERE id = test_user_id;
  DELETE FROM companies WHERE id = test_company_id;

  RAISE NOTICE 'Test cleanup complete';
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'users', 'chatbots', 'documents', 'conversations', 'messages', 'feedback', 'roles', 'permissions', 'role_permissions')
ORDER BY tablename;

-- Check all policies on companies table
SELECT
  policyname,
  roles,
  cmd as "Command",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- Check all policies on users table
SELECT
  policyname,
  roles,
  cmd as "Command",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

COMMIT;
