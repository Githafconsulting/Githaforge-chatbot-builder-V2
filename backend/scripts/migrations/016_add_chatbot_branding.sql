-- Migration 016: Add Chatbot Branding Fields
-- Purpose: Enable chatbot-specific branding for prompts and responses
-- Date: 2025-01-29

-- ============================================================================
-- ADD BRANDING FIELDS TO CHATBOTS TABLE
-- ============================================================================

-- Brand name (e.g., "Githaforge", "Githaf Consulting", "Acme Corp")
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- Support email for fallback responses
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS support_email TEXT;

-- Brand website URL
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS brand_website TEXT;

-- Optional: Fallback response template (uses default if NULL)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS fallback_response TEXT;

-- ============================================================================
-- UPDATE EXISTING CHATBOTS WITH DEFAULTS
-- ============================================================================

-- Update system chatbot (Githaforge) with branding
UPDATE chatbots
SET
    brand_name = 'Githaforge',
    support_email = 'support@githaforge.com',
    brand_website = 'https://githaforge.com'
WHERE is_system = TRUE;

-- Update other chatbots to use company info (Githaf Consulting as default)
UPDATE chatbots c
SET
    brand_name = COALESCE(brand_name, comp.name),
    support_email = COALESCE(support_email, 'support@githafconsulting.com'),
    brand_website = COALESCE(brand_website, COALESCE(comp.website, 'https://githafconsulting.com'))
FROM companies comp
WHERE c.company_id = comp.id
AND c.is_system IS NOT TRUE
AND c.brand_name IS NULL;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN chatbots.brand_name IS 'Display name for this chatbot brand (used in prompts)';
COMMENT ON COLUMN chatbots.support_email IS 'Support email shown in fallback responses';
COMMENT ON COLUMN chatbots.brand_website IS 'Website URL shown in responses';
COMMENT ON COLUMN chatbots.fallback_response IS 'Custom fallback response template (uses system default if NULL)';
