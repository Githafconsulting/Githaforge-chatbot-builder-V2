-- Migration 007: Create Row Level Security (RLS) Functions
-- Purpose: Database-level security context management
-- Date: 2025-01-27

-- ============================================================================
-- SET COMPANY CONTEXT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION set_company_context(
  p_company_id UUID,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  -- Set session variables for RLS policies
  PERFORM set_config('app.current_company_id', p_company_id::TEXT, FALSE);
  PERFORM set_config('app.is_super_admin', p_is_super_admin::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_company_context IS 'Sets PostgreSQL session variables for row-level security - called by middleware';

-- ============================================================================
-- GET COMPANY STATS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_company_stats(p_company_id UUID)
RETURNS TABLE (
  total_bots INTEGER,
  active_bots INTEGER,
  total_documents INTEGER,
  total_conversations INTEGER,
  total_messages INTEGER,
  avg_satisfaction FLOAT,
  monthly_messages INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total chatbots
    (SELECT COUNT(*)::INTEGER
     FROM chatbots
     WHERE company_id = p_company_id),

    -- Active chatbots
    (SELECT COUNT(*)::INTEGER
     FROM chatbots
     WHERE company_id = p_company_id AND is_active = TRUE),

    -- Total documents
    (SELECT COUNT(*)::INTEGER
     FROM documents
     WHERE company_id = p_company_id),

    -- Total conversations
    (SELECT COUNT(*)::INTEGER
     FROM conversations c
     JOIN chatbots cb ON c.chatbot_id = cb.id
     WHERE cb.company_id = p_company_id),

    -- Total messages
    (SELECT COUNT(*)::INTEGER
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     JOIN chatbots cb ON c.chatbot_id = cb.id
     WHERE cb.company_id = p_company_id),

    -- Average satisfaction (from feedback ratings)
    (SELECT AVG(rating)::FLOAT
     FROM feedback f
     JOIN messages m ON f.message_id = m.id
     JOIN conversations c ON m.conversation_id = c.id
     JOIN chatbots cb ON c.chatbot_id = cb.id
     WHERE cb.company_id = p_company_id),

    -- Monthly messages (last 30 days)
    (SELECT COUNT(*)::INTEGER
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     JOIN chatbots cb ON c.chatbot_id = cb.id
     WHERE cb.company_id = p_company_id
       AND m.created_at >= NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_company_stats IS 'Returns comprehensive statistics for a company - used in analytics';

-- ============================================================================
-- GET CHATBOT STATS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chatbot_stats(p_chatbot_id UUID)
RETURNS TABLE (
  total_conversations INTEGER,
  total_messages INTEGER,
  avg_satisfaction FLOAT,
  total_feedback INTEGER,
  positive_feedback INTEGER,
  negative_feedback INTEGER,
  monthly_messages INTEGER,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total conversations
    (SELECT COUNT(*)::INTEGER
     FROM conversations
     WHERE chatbot_id = p_chatbot_id),

    -- Total messages
    (SELECT COUNT(*)::INTEGER
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id),

    -- Average satisfaction
    (SELECT AVG(rating)::FLOAT
     FROM feedback f
     JOIN messages m ON f.message_id = m.id
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id),

    -- Total feedback
    (SELECT COUNT(*)::INTEGER
     FROM feedback f
     JOIN messages m ON f.message_id = m.id
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id),

    -- Positive feedback (rating = 1)
    (SELECT COUNT(*)::INTEGER
     FROM feedback f
     JOIN messages m ON f.message_id = m.id
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id AND f.rating = 1),

    -- Negative feedback (rating = 0)
    (SELECT COUNT(*)::INTEGER
     FROM feedback f
     JOIN messages m ON f.message_id = m.id
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id AND f.rating = 0),

    -- Monthly messages
    (SELECT COUNT(*)::INTEGER
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id
       AND m.created_at >= NOW() - INTERVAL '30 days'),

    -- Last message timestamp
    (SELECT MAX(m.created_at)
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.chatbot_id = p_chatbot_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chatbot_stats IS 'Returns detailed statistics for a specific chatbot';

-- ============================================================================
-- TRIGGER FUNCTION: Update Chatbot Message Count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_chatbot_messages()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chatbots
  SET total_messages = total_messages + 1
  WHERE id = (SELECT chatbot_id FROM conversations WHERE id = NEW.conversation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to messages table (if not already exists)
DROP TRIGGER IF EXISTS messages_increment_chatbot_count ON messages;
CREATE TRIGGER messages_increment_chatbot_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_chatbot_messages();

-- ============================================================================
-- TRIGGER FUNCTION: Update Chatbot Satisfaction Score
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chatbot_satisfaction()
RETURNS TRIGGER AS $$
DECLARE
  v_chatbot_id UUID;
  v_avg_satisfaction FLOAT;
BEGIN
  -- Get chatbot_id from message → conversation
  SELECT c.chatbot_id INTO v_chatbot_id
  FROM conversations c
  JOIN messages m ON c.id = m.conversation_id
  WHERE m.id = NEW.message_id;

  -- Calculate new average satisfaction
  SELECT AVG(f.rating)::FLOAT INTO v_avg_satisfaction
  FROM feedback f
  JOIN messages m ON f.message_id = m.id
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.chatbot_id = v_chatbot_id;

  -- Update chatbot
  UPDATE chatbots
  SET avg_satisfaction = v_avg_satisfaction
  WHERE id = v_chatbot_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to feedback table
DROP TRIGGER IF EXISTS feedback_update_chatbot_satisfaction ON feedback;
CREATE TRIGGER feedback_update_chatbot_satisfaction
  AFTER INSERT OR UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_satisfaction();

COMMENT ON FUNCTION increment_chatbot_messages IS 'Trigger function: Increments chatbot total_messages on new message';
COMMENT ON FUNCTION update_chatbot_satisfaction IS 'Trigger function: Updates chatbot avg_satisfaction on new feedback';