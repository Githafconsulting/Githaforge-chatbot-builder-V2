-- Migration 008: Create Row Level Security (RLS) Policies
-- Purpose: Enforce multi-tenant data isolation at database level
-- Date: 2025-01-27

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Note: Users, roles, permissions, role_permissions are NOT RLS-protected
-- They use application-level authorization

-- ============================================================================
-- COMPANIES POLICIES
-- ============================================================================

-- Users can only see their own company (or all companies if super_admin)
CREATE POLICY company_isolation ON companies
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY company_isolation ON companies IS 'Company isolation: users see only their company, super_admins see all';

-- ============================================================================
-- CHATBOTS POLICIES
-- ============================================================================

-- Users can only see chatbots from their company
CREATE POLICY chatbot_isolation ON chatbots
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR company_id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY chatbot_isolation ON chatbots IS 'Chatbot isolation: users see only their company chatbots';

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================

-- Users can only see documents from their company
CREATE POLICY document_isolation ON documents
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR company_id = current_setting('app.current_company_id', TRUE)::UUID
  );

COMMENT ON POLICY document_isolation ON documents IS 'Document isolation: users see only their company documents';

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can only see conversations from their company's chatbots
CREATE POLICY conversation_isolation ON conversations
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR chatbot_id IN (
      SELECT id FROM chatbots
      WHERE company_id = current_setting('app.current_company_id', TRUE)::UUID
    )
  );

COMMENT ON POLICY conversation_isolation ON conversations IS 'Conversation isolation: users see only their company chatbot conversations';

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can only see messages from their company's chatbot conversations
CREATE POLICY message_isolation ON messages
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE cb.company_id = current_setting('app.current_company_id', TRUE)::UUID
    )
  );

COMMENT ON POLICY message_isolation ON messages IS 'Message isolation: users see only their company chatbot messages';

-- ============================================================================
-- FEEDBACK POLICIES
-- ============================================================================

-- Users can only see feedback from their company's chatbot messages
CREATE POLICY feedback_isolation ON feedback
  FOR ALL
  USING (
    current_setting('app.is_super_admin', TRUE)::BOOLEAN = TRUE
    OR message_id IN (
      SELECT m.id FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN chatbots cb ON c.chatbot_id = cb.id
      WHERE cb.company_id = current_setting('app.current_company_id', TRUE)::UUID
    )
  );

COMMENT ON POLICY feedback_isolation ON feedback IS 'Feedback isolation: users see only their company chatbot feedback';

-- ============================================================================
-- PUBLIC ACCESS POLICIES (for chat widget)
-- ============================================================================

-- Allow public INSERT on conversations (chat widget creates conversations)
CREATE POLICY conversation_public_insert ON conversations
  FOR INSERT
  WITH CHECK (TRUE);

-- Allow public INSERT on messages (chat widget sends messages)
CREATE POLICY message_public_insert ON messages
  FOR INSERT
  WITH CHECK (TRUE);

-- Allow public INSERT on feedback (chat widget submits feedback)
CREATE POLICY feedback_public_insert ON feedback
  FOR INSERT
  WITH CHECK (TRUE);

-- Allow public SELECT on chatbots (chat widget needs to read chatbot config)
CREATE POLICY chatbot_public_read ON chatbots
  FOR SELECT
  USING (deploy_status = 'deployed' AND is_active = TRUE);

COMMENT ON POLICY conversation_public_insert ON conversations IS 'Public access: allows chat widget to create conversations';
COMMENT ON POLICY message_public_insert ON messages IS 'Public access: allows chat widget to send messages';
COMMENT ON POLICY feedback_public_insert ON feedback IS 'Public access: allows chat widget to submit feedback';
COMMENT ON POLICY chatbot_public_read ON chatbots IS 'Public access: allows chat widget to read deployed chatbot configs';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Test 1: Set context and query
-- SELECT set_company_context('company-uuid', FALSE);
-- SELECT * FROM chatbots; -- Should only see chatbots from that company

-- Test 2: Super admin bypass
-- SELECT set_company_context('any-uuid', TRUE);
-- SELECT * FROM chatbots; -- Should see all chatbots

-- Test 3: Cross-company isolation
-- SELECT set_company_context('company-a-uuid', FALSE);
-- SELECT * FROM chatbots WHERE company_id = 'company-b-uuid'; -- Should return empty