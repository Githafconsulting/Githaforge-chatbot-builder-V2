-- Add favicon_url column to companies table
-- Run this in Supabase SQL Editor

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

COMMENT ON COLUMN companies.favicon_url IS 'URL to company favicon (16x16, 32x32, or 48x48 px recommended)';
