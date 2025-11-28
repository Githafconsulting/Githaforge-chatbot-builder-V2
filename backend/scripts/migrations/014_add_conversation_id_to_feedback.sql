-- Migration 014: Add conversation_id to feedback table
-- Purpose: Enable filtering feedback by conversation for multitenancy
-- Date: 2025-01-28

-- ============================================================================
-- ADD conversation_id COLUMN TO FEEDBACK TABLE
-- ============================================================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback'
    AND column_name = 'conversation_id'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE feedback
    ADD COLUMN conversation_id UUID;

    -- Add comment
    COMMENT ON COLUMN feedback.conversation_id IS 'Reference to conversation for multitenancy filtering';

    -- Add foreign key constraint
    ALTER TABLE feedback
    ADD CONSTRAINT fk_feedback_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

    -- Populate conversation_id from message_id
    -- Get conversation_id from the messages table
    UPDATE feedback
    SET conversation_id = messages.conversation_id
    FROM messages
    WHERE feedback.message_id = messages.id;

    -- Create index for faster filtering
    CREATE INDEX IF NOT EXISTS idx_feedback_conversation_id ON feedback(conversation_id);

    RAISE NOTICE 'Added conversation_id column to feedback table and populated from messages';
  ELSE
    RAISE NOTICE 'Column conversation_id already exists in feedback table';
  END IF;
END $$;
