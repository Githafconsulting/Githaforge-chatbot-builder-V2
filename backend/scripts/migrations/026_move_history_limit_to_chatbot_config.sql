-- Migration 026: Move history_limit from system_settings to chatbot_config
-- This moves the conversation history limit setting to RAG Configuration (company-wide setting)

-- Add history_limit column to chatbot_config table
ALTER TABLE chatbot_config
ADD COLUMN IF NOT EXISTS history_limit INTEGER DEFAULT 10;

-- Add constraint to ensure reasonable limits (3-50 messages)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_chatbot_config_history_limit'
    ) THEN
        ALTER TABLE chatbot_config
        ADD CONSTRAINT check_chatbot_config_history_limit
        CHECK (history_limit >= 3 AND history_limit <= 50);
    END IF;
END $$;

-- Comment explaining the field
COMMENT ON COLUMN chatbot_config.history_limit IS 'Number of previous messages to include in conversation context for the LLM. Higher values provide more context but increase token usage. Company-wide RAG setting.';

-- Migrate existing value from system_settings if it exists
DO $$
DECLARE
    existing_limit INTEGER;
BEGIN
    -- Get the history_limit from system_settings if it exists
    SELECT history_limit INTO existing_limit
    FROM system_settings
    LIMIT 1;

    -- If we found a value, update chatbot_config with it
    IF existing_limit IS NOT NULL THEN
        UPDATE chatbot_config
        SET history_limit = existing_limit
        WHERE history_limit = 10;  -- Only update if still at default

        RAISE NOTICE 'Migrated history_limit (%) from system_settings to chatbot_config', existing_limit;
    END IF;
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE 'history_limit column does not exist in system_settings, skipping migration';
    WHEN undefined_table THEN
        RAISE NOTICE 'system_settings table does not exist, skipping migration';
END $$;
