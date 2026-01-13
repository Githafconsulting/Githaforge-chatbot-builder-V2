-- Migration: Add company_id to draft_documents table
-- This links draft documents to companies for multitenancy support

-- Add the company_id column
ALTER TABLE draft_documents
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_draft_documents_company_id ON draft_documents(company_id);

-- Update existing drafts to belong to Githaf Consulting
-- (All current drafts were created for Githaf before multitenancy)
UPDATE draft_documents
SET company_id = '35816f68-d848-40ff-9b29-349a07632052'
WHERE company_id IS NULL;

-- Verify the update
SELECT id, title, status, company_id FROM draft_documents;
