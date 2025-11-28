-- Migration 005: Update Conversations Table for Multi-Tenancy
-- Purpose: Add chatbot_id to link conversations to specific chatbots
-- Date: 2025-01-27

-- ============================================================================
-- ADD COLUMNS TO CONVERSATIONS TABLE
-- ============================================================================

-- Link conversations to specific chatbot
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE;

-- Make chatbot_id NOT NULL after backfilling existing data
-- This will be enforced after data migration
-- ALTER TABLE conversations ALTER COLUMN chatbot_id SET NOT NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_created ON conversations(chatbot_id, created_at DESC);

-- ============================================================================
-- TRIGGER: Update chatbot metrics on new conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_chatbot_conversations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chatbots
  SET total_conversations = total_conversations + 1
  WHERE id = NEW.chatbot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_increment_chatbot_count
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION increment_chatbot_conversations();

-- ============================================================================
-- TRIGGER: Update chatbot metrics on conversation delete
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_chatbot_conversations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chatbots
  SET total_conversations = GREATEST(0, total_conversations - 1)
  WHERE id = OLD.chatbot_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_decrement_chatbot_count
  AFTER DELETE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION decrement_chatbot_conversations();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN conversations.chatbot_id IS 'Links conversation to specific chatbot - enables per-bot analytics';