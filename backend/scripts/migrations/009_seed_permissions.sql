-- Migration 009: Seed Permissions
-- Purpose: Insert all permission definitions into database
-- Date: 2025-01-27

-- ============================================================================
-- INSERT PERMISSIONS
-- ============================================================================

INSERT INTO permissions (code, name, category, description) VALUES
  -- Documents permissions
  ('view_documents', 'View Documents', 'documents', 'View uploaded documents in knowledge base'),
  ('upload_documents', 'Upload Documents', 'documents', 'Upload new documents to knowledge base'),
  ('delete_documents', 'Delete Documents', 'documents', 'Delete documents from knowledge base'),

  -- Chatbots permissions
  ('view_chatbots', 'View Chatbots', 'chatbots', 'View chatbot list and details'),
  ('create_chatbots', 'Create Chatbots', 'chatbots', 'Create new chatbots'),
  ('edit_chatbots', 'Edit Chatbots', 'chatbots', 'Modify chatbot settings and configurations'),
  ('delete_chatbots', 'Delete Chatbots', 'chatbots', 'Delete chatbots'),
  ('deploy_chatbots', 'Deploy Chatbots', 'chatbots', 'Deploy or pause chatbots'),

  -- Analytics permissions
  ('view_analytics', 'View Analytics', 'analytics', 'View analytics dashboard and metrics'),
  ('export_data', 'Export Data', 'analytics', 'Export analytics data to CSV/Excel'),

  -- Team management permissions
  ('view_team', 'View Team', 'team', 'View team members list'),
  ('invite_members', 'Invite Members', 'team', 'Invite new team members'),
  ('edit_members', 'Edit Members', 'team', 'Modify member roles and permissions'),
  ('remove_members', 'Remove Members', 'team', 'Remove team members'),

  -- Company settings permissions
  ('edit_company', 'Edit Company', 'company', 'Modify company settings and information'),
  ('manage_billing', 'Manage Billing', 'company', 'Manage subscriptions and billing'),
  ('manage_roles', 'Manage Roles', 'company', 'Create and edit custom roles')

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count permissions
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM permissions;
  RAISE NOTICE 'Total permissions created: %', v_count;

  IF v_count <> 17 THEN
    RAISE WARNING 'Expected 17 permissions, but found %', v_count;
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- View all permissions by category
SELECT
  category,
  COUNT(*) as permission_count,
  STRING_AGG(code, ', ' ORDER BY code) as permissions
FROM permissions
GROUP BY category
ORDER BY category;