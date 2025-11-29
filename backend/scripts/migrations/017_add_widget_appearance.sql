-- Migration 017: Add Widget Appearance Fields
-- Purpose: Add widget customization fields for chatbot appearance
-- Date: 2025-11-29

-- ============================================================================
-- ADD WIDGET APPEARANCE FIELDS TO CHATBOTS TABLE
-- ============================================================================

-- Widget theme (modern, minimal, classic)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_theme TEXT DEFAULT 'modern'
    CHECK (widget_theme IN ('modern', 'minimal', 'classic'));

-- Widget position on screen
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_position TEXT DEFAULT 'bottom-right'
    CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left'));

-- Button size
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS button_size TEXT DEFAULT 'medium'
    CHECK (button_size IN ('small', 'medium', 'large'));

-- Show notification badge
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS show_notification_badge BOOLEAN DEFAULT TRUE;

-- Widget title (displayed in chat header)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_title TEXT;

-- Widget subtitle (displayed below title in chat header)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS widget_subtitle TEXT;

-- Horizontal padding from screen edge (pixels)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS padding_x INTEGER DEFAULT 20
    CHECK (padding_x >= 0 AND padding_x <= 200);

-- Vertical padding from screen edge (pixels)
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS padding_y INTEGER DEFAULT 20
    CHECK (padding_y >= 0 AND padding_y <= 200);

-- Z-index for layering
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 9999
    CHECK (z_index >= 0 AND z_index <= 99999);

-- ============================================================================
-- UPDATE EXISTING CHATBOTS WITH DEFAULTS
-- ============================================================================

-- Set widget_title to chatbot name if not already set
UPDATE chatbots
SET widget_title = name
WHERE widget_title IS NULL;

-- Set widget_subtitle to default
UPDATE chatbots
SET widget_subtitle = 'Always here to help'
WHERE widget_subtitle IS NULL;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON COLUMN chatbots.widget_theme IS 'Widget visual theme: modern (gradient), minimal (flat), classic (traditional)';
COMMENT ON COLUMN chatbots.widget_position IS 'Widget position on screen (bottom-right, bottom-left, top-right, top-left)';
COMMENT ON COLUMN chatbots.button_size IS 'Chat button size: small (50px), medium (60px), large (70px)';
COMMENT ON COLUMN chatbots.show_notification_badge IS 'Show pulsing notification badge on chat button';
COMMENT ON COLUMN chatbots.widget_title IS 'Title shown in chat window header';
COMMENT ON COLUMN chatbots.widget_subtitle IS 'Subtitle shown below title in chat header';
COMMENT ON COLUMN chatbots.padding_x IS 'Horizontal padding from screen edge in pixels (0-200)';
COMMENT ON COLUMN chatbots.padding_y IS 'Vertical padding from screen edge in pixels (0-200)';
COMMENT ON COLUMN chatbots.z_index IS 'CSS z-index for widget layering (0-99999)';