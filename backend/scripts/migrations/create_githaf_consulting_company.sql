-- Migration: Create Githaf Consulting Company
-- Purpose: Convert existing single-user system data into proper multi-tenant company
-- Date: 2025-11-27

-- Existing company ID that's referenced by users and chatbots
-- This UUID was already being used before multitenancy was implemented

BEGIN;

-- Insert Githaf Consulting company with the existing UUID
INSERT INTO companies (
    id,
    name,
    website,
    industry,
    company_size,
    plan,
    is_active,
    created_at,
    updated_at
) VALUES (
    '35816f68-d848-40ff-9b29-349a07632052',
    'Githaf Consulting',
    'https://githafconsulting.com',
    'Consulting',
    '1-10',
    'free',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    website = EXCLUDED.website,
    industry = EXCLUDED.industry,
    company_size = EXCLUDED.company_size,
    updated_at = NOW();

-- Verify the migration
SELECT
    c.id,
    c.name,
    c.plan,
    c.is_active,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT cb.id) as chatbot_count
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
LEFT JOIN chatbots cb ON cb.company_id = c.id
WHERE c.id = '35816f68-d848-40ff-9b29-349a07632052'
GROUP BY c.id, c.name, c.plan, c.is_active;

COMMIT;

-- Expected output:
-- id: 35816f68-d848-40ff-9b29-349a07632052
-- name: Githaf Consulting
-- plan: free
-- is_active: true
-- user_count: 2
-- chatbot_count: 1
