-- Migration 006: Create RBAC Tables
-- Purpose: Role-Based Access Control system
-- Date: 2025-01-27

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- e.g., 'view_documents', 'create_chatbots'
  name TEXT NOT NULL,                  -- e.g., 'View Documents'
  category TEXT NOT NULL,              -- e.g., 'documents', 'chatbots', 'team'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = platform role
  code TEXT NOT NULL,                  -- e.g., 'admin', 'editor', 'custom_marketing'
  name TEXT NOT NULL,                  -- e.g., 'Administrator', 'Marketing Team'
  is_custom BOOLEAN DEFAULT FALSE,     -- TRUE for company-created custom roles
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique role codes per company (platform roles have NULL company_id)
  UNIQUE(company_id, code)
);

-- ============================================================================
-- ROLE_PERMISSIONS TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_is_custom ON roles(is_custom);

-- Role_permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FOR ROLES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at_trigger
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get User Permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code
  FROM users u
  JOIN roles r ON u.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Check User Permission
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_user_role TEXT;
BEGIN
  -- Check if user is super_admin (bypass all checks)
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  IF v_user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Check via role_id
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id AND p.code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE permissions IS 'System-wide permission definitions (capabilities)';
COMMENT ON TABLE roles IS 'Role definitions - platform-level (company_id=NULL) or company-specific';
COMMENT ON TABLE role_permissions IS 'Many-to-many mapping between roles and permissions';

COMMENT ON COLUMN roles.company_id IS 'NULL for platform roles (owner, admin, editor, etc.), set for custom company roles';
COMMENT ON COLUMN roles.is_custom IS 'TRUE for company-created custom roles, FALSE for predefined platform roles';

COMMENT ON FUNCTION get_user_permissions IS 'Returns all permission codes for a given user';
COMMENT ON FUNCTION check_user_permission IS 'Checks if user has specific permission (returns TRUE for super_admin)';