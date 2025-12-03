-- Migration: Add paused_message field to chatbots table
-- Purpose: Allow admins to configure a custom message shown when chatbot is paused
-- Date: 2024-12-03

-- Add paused_message column with a sensible default
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS paused_message TEXT DEFAULT 'This chatbot is currently unavailable. Please try again later or contact support.';

-- Add comment for documentation
COMMENT ON COLUMN chatbots.paused_message IS 'Custom message displayed to users when chatbot is paused';
