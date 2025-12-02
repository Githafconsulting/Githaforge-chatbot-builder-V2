-- Migration 025: Add history_limit column to system_settings
-- This allows configuring how many messages to include in conversation context (company-wide)

-- Add history_limit column with default of 10 messages
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS history_limit INTEGER DEFAULT 10;

-- Add constraint to ensure reasonable limits (3-50 messages)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_settings_history_limit'
    ) THEN
        ALTER TABLE system_settings
        ADD CONSTRAINT check_settings_history_limit
        CHECK (history_limit >= 3 AND history_limit <= 50);
    END IF;
END $$;

-- Comment explaining the field
COMMENT ON COLUMN system_settings.history_limit IS 'Number of previous messages to include in conversation context for the LLM. Higher values provide more context but increase token usage. Applied globally to all chatbots.';
