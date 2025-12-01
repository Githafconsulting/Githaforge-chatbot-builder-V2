-- Migration 023: Add Custom Contact Details to Chatbots
-- Purpose: Allow chatbots to have custom contact information with toggle
-- Date: 2025-12-01
-- Reference: User request for per-chatbot contact details

-- ============================================================================
-- ADD CUSTOM CONTACT FIELDS TO CHATBOTS
-- ============================================================================

-- Toggle to enable/disable custom contact details
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS enable_custom_contact BOOLEAN DEFAULT FALSE;

-- Contact phone number
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Contact email (separate from support_email for flexibility)
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Physical address
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS contact_address TEXT;

-- Business hours (e.g., "Mon-Fri 9AM-5PM EST")
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS contact_hours TEXT;

-- ============================================================================
-- ADD SUPPORT EMAIL TO COMPANIES TABLE (for fallback chain)
-- ============================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN chatbots.enable_custom_contact IS 'When TRUE, use custom contact details instead of company defaults';
COMMENT ON COLUMN chatbots.contact_phone IS 'Custom phone number for this chatbot';
COMMENT ON COLUMN chatbots.contact_email IS 'Custom email for this chatbot (overrides company support_email)';
COMMENT ON COLUMN chatbots.contact_address IS 'Custom physical address for this chatbot';
COMMENT ON COLUMN chatbots.contact_hours IS 'Business hours for this chatbot (e.g., Mon-Fri 9AM-5PM)';
COMMENT ON COLUMN companies.support_email IS 'Default support email for the company (used as fallback)';
