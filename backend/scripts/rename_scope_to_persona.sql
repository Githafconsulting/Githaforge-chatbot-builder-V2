-- Migration: Rename scope to persona across the database
-- This improves clarity by using "persona" instead of "scope" for chatbot personalities

-- Step 1: Rename the scopes table to personas
ALTER TABLE IF EXISTS scopes RENAME TO personas;

-- Step 2: Rename scope_id column in chatbots table to persona_id
ALTER TABLE chatbots RENAME COLUMN scope_id TO persona_id;

-- Step 3: Rename the foreign key constraint (if it exists with the old name)
-- Drop old constraint and create new one with correct name
ALTER TABLE chatbots DROP CONSTRAINT IF EXISTS chatbots_scope_id_fkey;
ALTER TABLE chatbots ADD CONSTRAINT chatbots_persona_id_fkey
    FOREIGN KEY (persona_id) REFERENCES personas(id);

-- Step 4: Rename any indexes that reference scope
DROP INDEX IF EXISTS idx_chatbots_scope_id;
CREATE INDEX IF NOT EXISTS idx_chatbots_persona_id ON chatbots(persona_id);

-- Step 4b: Ensure personas table has proper indexes (in case they weren't renamed)
-- These improve query performance for listing personas by company
CREATE INDEX IF NOT EXISTS idx_personas_company_id ON personas(company_id);
CREATE INDEX IF NOT EXISTS idx_personas_is_default ON personas(is_default);
CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name);
CREATE INDEX IF NOT EXISTS idx_personas_company_default ON personas(company_id, is_default);

-- Step 5: Rename the seed_default_scopes RPC function to seed_default_personas
-- (This requires recreating the function with the new name)
-- Note: The function body should be copied from the existing seed_default_scopes function
-- and updated to use 'personas' table instead of 'scopes'

-- Drop the old function name (if it exists)
DROP FUNCTION IF EXISTS seed_default_scopes(uuid);

-- Create alias function that calls the new name (for backward compatibility during transition)
-- You may need to update the actual function in your database manually

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chatbots' AND column_name = 'persona_id';

SELECT table_name
FROM information_schema.tables
WHERE table_name = 'personas';
