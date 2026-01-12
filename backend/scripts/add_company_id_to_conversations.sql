-- Add company_id column to conversations table for multi-tenancy support
-- Run this in Supabase SQL Editor

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for faster queries by company
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON conversations(company_id);

-- Optional: If you want to backfill existing conversations with a default company_id,
-- uncomment and modify the following with an actual company UUID:
-- UPDATE conversations SET company_id = 'your-actual-company-uuid-here' WHERE company_id IS NULL;
