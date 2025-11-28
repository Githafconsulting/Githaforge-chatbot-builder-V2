-- Migration 011: Cleanup and Fix Data Issues
-- Purpose: Fix duplicate roles and create default company for existing users
-- Date: 2025-01-27
-- Run after: RUN_ALL_MIGRATIONS.sql

-- ============================================================================
-- STEP 1: REMOVE DUPLICATE ROLES
-- ============================================================================

\echo '========================================';
\echo 'Step 1: Cleaning up duplicate roles...';
\echo '========================================';

-- Delete duplicate roles (keep only ones with permissions assigned)
DELETE FROM roles
WHERE id NOT IN (
  SELECT DISTINCT r.id
  FROM roles r
  JOIN role_permissions rp ON r.id = rp.role_id
)
AND code IN ('owner', 'admin', 'editor', 'trainer', 'analyst', 'viewer')
AND company_id IS NULL;  -- Only delete predefined roles (not custom company roles)

\echo 'Duplicate roles removed.';

-- Show remaining roles
\echo '';
\echo 'Remaining roles:';
SELECT
  code,
  name,
  is_custom,
  (SELECT COUNT(*) FROM role_permissions WHERE role_id = roles.id) as permission_count
FROM roles
WHERE company_id IS NULL
ORDER BY permission_count DESC;

\echo '';

-- ============================================================================
-- STEP 2: CREATE DEFAULT COMPANY
-- ============================================================================

\echo '========================================';
\echo 'Step 2: Creating default company...';
\echo '========================================';

-- Create default company for existing data
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Check if default company already exists
  SELECT id INTO v_company_id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO companies (
      name,
      website,
      industry,
      plan,
      max_bots,
      max_documents,
      max_monthly_messages,
      is_active
    ) VALUES (
      'Githaf Consulting',
      'https://githafconsulting.com',
      'Technology',
      'enterprise',
      999,  -- Unlimited bots for default company
      9999,  -- Unlimited documents
      999999,  -- Unlimited messages
      TRUE
    )
    RETURNING id INTO v_company_id;

    RAISE NOTICE 'Created default company with ID: %', v_company_id;
  ELSE
    RAISE NOTICE 'Default company already exists with ID: %', v_company_id;
  END IF;
END $$;

\echo 'Default company created.';

-- Store company ID for later use
DO $$
DECLARE
  v_default_company_id UUID;
BEGIN
  SELECT id INTO v_default_company_id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1;
  PERFORM set_config('app.default_company_id', v_default_company_id::TEXT, FALSE);
END $$;

\echo '';

-- ============================================================================
-- STEP 3: ASSIGN EXISTING USERS TO DEFAULT COMPANY
-- ============================================================================

\echo '========================================';
\echo 'Step 3: Assigning existing users to default company...';
\echo '========================================';

-- Update users without company_id
UPDATE users
SET company_id = (SELECT id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1)
WHERE company_id IS NULL;

\echo 'Users updated.';

-- Show results
\echo '';
\echo 'Current user assignments:';
SELECT
  u.email,
  u.full_name,
  c.name as company_name,
  u.is_admin,
  u.is_active
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY u.created_at;

\echo '';

-- ============================================================================
-- STEP 4: ASSIGN OWNER ROLE TO EXISTING USERS
-- ============================================================================

\echo '========================================';
\echo 'Step 4: Assigning Owner role to existing users...';
\echo '========================================';

-- Assign Owner role to all users
UPDATE users
SET role_id = (SELECT id FROM roles WHERE code = 'owner' AND company_id IS NULL LIMIT 1)
WHERE role_id IS NULL;

\echo 'Owner role assigned to all users.';

-- Show role assignments
\echo '';
\echo 'Current user role assignments:';
SELECT
  u.email,
  u.full_name,
  r.name as role_name,
  r.code as role_code,
  (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as permission_count
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at;

\echo '';

-- ============================================================================
-- STEP 5: MIGRATE EXISTING DOCUMENTS TO DEFAULT COMPANY
-- ============================================================================

\echo '========================================';
\echo 'Step 5: Migrating existing documents, conversations to default company...';
\echo '========================================';

-- Update documents without company_id
UPDATE documents
SET company_id = (SELECT id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1)
WHERE company_id IS NULL;

\echo 'Documents migrated.';

-- Update conversations without chatbot_id (we'll assign them to default chatbot in next step)
-- For now, just ensure they exist
UPDATE conversations
SET chatbot_id = NULL
WHERE chatbot_id IS NULL;

\echo 'Conversations updated.';

\echo '';

-- ============================================================================
-- STEP 6: CREATE DEFAULT CHATBOT
-- ============================================================================

\echo '========================================';
\echo 'Step 6: Creating default chatbot...';
\echo '========================================';

-- Create default chatbot for existing conversations
DO $$
DECLARE
  v_company_id UUID;
  v_chatbot_id UUID;
BEGIN
  -- Get default company ID
  SELECT id INTO v_company_id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1;

  -- Check if default chatbot already exists
  SELECT id INTO v_chatbot_id
  FROM chatbots
  WHERE company_id = v_company_id AND name = 'Default Chatbot'
  LIMIT 1;

  IF v_chatbot_id IS NULL THEN
    INSERT INTO chatbots (
      company_id,
      name,
      description,
      greeting_message,
      model_preset,
      temperature,
      max_tokens,
      top_k,
      similarity_threshold,
      deploy_status,
      is_active
    ) VALUES (
      v_company_id,
      'Default Chatbot',
      'Main customer support chatbot for Githaf Consulting',
      'Hi! How can I help you today?',
      'balanced',
      0.7,
      500,
      5,
      0.5,
      'deployed',
      TRUE
    )
    RETURNING id INTO v_chatbot_id;

    RAISE NOTICE 'Created default chatbot with ID: %', v_chatbot_id;
  ELSE
    RAISE NOTICE 'Default chatbot already exists with ID: %', v_chatbot_id;
  END IF;

  -- Store for later use
  PERFORM set_config('app.default_chatbot_id', v_chatbot_id::TEXT, FALSE);
END $$;

\echo 'Default chatbot created.';

\echo '';

-- ============================================================================
-- STEP 7: ASSIGN EXISTING CONVERSATIONS TO DEFAULT CHATBOT
-- ============================================================================

\echo '========================================';
\echo 'Step 7: Assigning existing conversations to default chatbot...';
\echo '========================================';

-- Update conversations without chatbot_id
UPDATE conversations
SET chatbot_id = (
  SELECT id FROM chatbots
  WHERE company_id = (SELECT id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1)
    AND name = 'Default Chatbot'
  LIMIT 1
)
WHERE chatbot_id IS NULL;

\echo 'Conversations assigned to default chatbot.';

\echo '';

-- ============================================================================
-- STEP 8: ASSIGN EXISTING DOCUMENTS TO DEFAULT CHATBOT (OPTIONAL)
-- ============================================================================

\echo '========================================';
\echo 'Step 8: Assigning existing documents to default chatbot...';
\echo '========================================';

-- Update documents to be accessible by default chatbot
-- Note: chatbot_id in documents is optional (NULL means all chatbots can use it)
-- We'll set it to default chatbot for now
UPDATE documents
SET chatbot_id = (
  SELECT id FROM chatbots
  WHERE company_id = (SELECT id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1)
    AND name = 'Default Chatbot'
  LIMIT 1
),
    scope = COALESCE(scope, 'general')  -- Set default scope if NULL
WHERE chatbot_id IS NULL
  AND company_id = (SELECT id FROM companies WHERE name = 'Githaf Consulting' LIMIT 1);

\echo 'Documents assigned to default chatbot.';

\echo '';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

\echo '========================================';
\echo 'Final Verification';
\echo '========================================';

-- Count all entities
SELECT 'Companies' as entity, COUNT(*)::INTEGER as count FROM companies
UNION ALL
SELECT 'Chatbots', COUNT(*)::INTEGER FROM chatbots
UNION ALL
SELECT 'Users', COUNT(*)::INTEGER FROM users
UNION ALL
SELECT 'Documents', COUNT(*)::INTEGER FROM documents
UNION ALL
SELECT 'Conversations', COUNT(*)::INTEGER FROM conversations
UNION ALL
SELECT 'Messages', COUNT(*)::INTEGER FROM messages
UNION ALL
SELECT 'Predefined Roles', COUNT(*)::INTEGER FROM roles WHERE company_id IS NULL
UNION ALL
SELECT 'Permissions', COUNT(*)::INTEGER FROM permissions
UNION ALL
SELECT 'Role-Permission Mappings', COUNT(*)::INTEGER FROM role_permissions;

\echo '';
\echo 'Checking for orphaned data...';

-- Check for orphaned records
SELECT 'Users without company' as issue, COUNT(*)::INTEGER as count FROM users WHERE company_id IS NULL
UNION ALL
SELECT 'Users without role', COUNT(*)::INTEGER FROM users WHERE role_id IS NULL
UNION ALL
SELECT 'Documents without company', COUNT(*)::INTEGER FROM documents WHERE company_id IS NULL
UNION ALL
SELECT 'Conversations without chatbot', COUNT(*)::INTEGER FROM conversations WHERE chatbot_id IS NULL;

\echo '';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

\echo '========================================';
\echo '✅ Cleanup and migration completed!';
\echo '========================================';

\echo '';
\echo 'Next steps:';
\echo '  1. Verify data in Supabase dashboard';
\echo '  2. Test login with existing users';
\echo '  3. Test chatbot functionality';
\echo '  4. Create additional chatbots/companies as needed';
\echo '';
