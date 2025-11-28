-- Migration 010: Seed Default Roles
-- Purpose: Create 6 predefined platform roles with permissions
-- Date: 2025-01-27

-- ============================================================================
-- INSERT PREDEFINED ROLES (company_id = NULL means platform-level)
-- ============================================================================

INSERT INTO roles (company_id, code, name, is_custom) VALUES
  (NULL, 'owner', 'Owner', FALSE),
  (NULL, 'admin', 'Administrator', FALSE),
  (NULL, 'editor', 'Editor', FALSE),
  (NULL, 'trainer', 'Trainer', FALSE),
  (NULL, 'analyst', 'Analyst', FALSE),
  (NULL, 'viewer', 'Viewer', FALSE)
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================================
-- ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- Helper function to assign permission to role
CREATE OR REPLACE FUNCTION assign_permission_to_role(
  p_role_code TEXT,
  p_permission_code TEXT
)
RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_permission_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = p_role_code AND company_id IS NULL;
  SELECT id INTO v_permission_id FROM permissions WHERE code = p_permission_code;

  IF v_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- OWNER ROLE (All Permissions)
-- ============================================================================

SELECT assign_permission_to_role('owner', 'view_documents');
SELECT assign_permission_to_role('owner', 'upload_documents');
SELECT assign_permission_to_role('owner', 'delete_documents');
SELECT assign_permission_to_role('owner', 'view_chatbots');
SELECT assign_permission_to_role('owner', 'create_chatbots');
SELECT assign_permission_to_role('owner', 'edit_chatbots');
SELECT assign_permission_to_role('owner', 'delete_chatbots');
SELECT assign_permission_to_role('owner', 'deploy_chatbots');
SELECT assign_permission_to_role('owner', 'view_analytics');
SELECT assign_permission_to_role('owner', 'export_data');
SELECT assign_permission_to_role('owner', 'view_team');
SELECT assign_permission_to_role('owner', 'invite_members');
SELECT assign_permission_to_role('owner', 'edit_members');
SELECT assign_permission_to_role('owner', 'remove_members');
SELECT assign_permission_to_role('owner', 'edit_company');
SELECT assign_permission_to_role('owner', 'manage_billing');
SELECT assign_permission_to_role('owner', 'manage_roles');

-- ============================================================================
-- ADMIN ROLE (All except billing and roles)
-- ============================================================================

SELECT assign_permission_to_role('admin', 'view_documents');
SELECT assign_permission_to_role('admin', 'upload_documents');
SELECT assign_permission_to_role('admin', 'delete_documents');
SELECT assign_permission_to_role('admin', 'view_chatbots');
SELECT assign_permission_to_role('admin', 'create_chatbots');
SELECT assign_permission_to_role('admin', 'edit_chatbots');
SELECT assign_permission_to_role('admin', 'delete_chatbots');
SELECT assign_permission_to_role('admin', 'deploy_chatbots');
SELECT assign_permission_to_role('admin', 'view_analytics');
SELECT assign_permission_to_role('admin', 'export_data');
SELECT assign_permission_to_role('admin', 'view_team');
SELECT assign_permission_to_role('admin', 'invite_members');
SELECT assign_permission_to_role('admin', 'edit_members');
SELECT assign_permission_to_role('admin', 'remove_members');
SELECT assign_permission_to_role('admin', 'edit_company');

-- ============================================================================
-- EDITOR ROLE (Create and edit content)
-- ============================================================================

SELECT assign_permission_to_role('editor', 'view_documents');
SELECT assign_permission_to_role('editor', 'upload_documents');
SELECT assign_permission_to_role('editor', 'view_chatbots');
SELECT assign_permission_to_role('editor', 'create_chatbots');
SELECT assign_permission_to_role('editor', 'edit_chatbots');
SELECT assign_permission_to_role('editor', 'deploy_chatbots');
SELECT assign_permission_to_role('editor', 'view_analytics');
SELECT assign_permission_to_role('editor', 'view_team');

-- ============================================================================
-- TRAINER ROLE (Upload docs and train chatbots)
-- ============================================================================

SELECT assign_permission_to_role('trainer', 'view_documents');
SELECT assign_permission_to_role('trainer', 'upload_documents');
SELECT assign_permission_to_role('trainer', 'view_chatbots');
SELECT assign_permission_to_role('trainer', 'edit_chatbots');
SELECT assign_permission_to_role('trainer', 'view_analytics');

-- ============================================================================
-- ANALYST ROLE (Analytics and reporting)
-- ============================================================================

SELECT assign_permission_to_role('analyst', 'view_documents');
SELECT assign_permission_to_role('analyst', 'view_chatbots');
SELECT assign_permission_to_role('analyst', 'view_analytics');
SELECT assign_permission_to_role('analyst', 'export_data');
SELECT assign_permission_to_role('analyst', 'view_team');

-- ============================================================================
-- VIEWER ROLE (Read-only)
-- ============================================================================

SELECT assign_permission_to_role('viewer', 'view_documents');
SELECT assign_permission_to_role('viewer', 'view_chatbots');
SELECT assign_permission_to_role('viewer', 'view_analytics');
SELECT assign_permission_to_role('viewer', 'view_team');

-- ============================================================================
-- CLEANUP HELPER FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS assign_permission_to_role(TEXT, TEXT);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show roles and their permission counts
SELECT
  r.code,
  r.name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.company_id IS NULL
GROUP BY r.id, r.code, r.name
ORDER BY permission_count DESC;

-- ============================================================================
-- DETAILED ROLE PERMISSIONS VIEW
-- ============================================================================

-- Create view for easy role permission lookup
CREATE OR REPLACE VIEW v_role_permissions AS
SELECT
  r.code as role_code,
  r.name as role_name,
  r.company_id,
  r.is_custom,
  p.code as permission_code,
  p.name as permission_name,
  p.category as permission_category
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.code, p.category, p.code;

COMMENT ON VIEW v_role_permissions IS 'View showing all role-permission mappings for easy querying';

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_role_count INTEGER;
  v_owner_perms INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_role_count FROM roles WHERE company_id IS NULL;
  SELECT COUNT(*) INTO v_owner_perms FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.code = 'owner' AND r.company_id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Predefined roles created: %', v_role_count;
  RAISE NOTICE 'Owner permissions assigned: %', v_owner_perms;
  RAISE NOTICE '========================================';

  IF v_role_count <> 6 THEN
    RAISE WARNING 'Expected 6 predefined roles, but found %', v_role_count;
  END IF;

  IF v_owner_perms <> 17 THEN
    RAISE WARNING 'Expected 17 owner permissions, but found %', v_owner_perms;
  END IF;
END $$;