-- Migration 029: Add Signup Fields to Users Table
-- Purpose: Support enhanced signup flow with phone, consent, avatar
-- Date: 2025-12-23

-- ============================================================================
-- ADD COLUMNS TO USERS TABLE
-- ============================================================================

-- Phone number
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Contact email (if different from signin email)
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Avatar/Profile photo URL
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Marketing consent
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;

-- Consultation request
ALTER TABLE users ADD COLUMN IF NOT EXISTS wants_consultation BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users(marketing_consent) WHERE marketing_consent = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_wants_consultation ON users(wants_consultation) WHERE wants_consultation = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.phone IS 'User phone number (optional)';
COMMENT ON COLUMN users.contact_email IS 'Contact email if different from signin email';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile photo in storage';
COMMENT ON COLUMN users.marketing_consent IS 'User opted in to marketing communications';
COMMENT ON COLUMN users.wants_consultation IS 'User requested a live consultation/walkthrough';
