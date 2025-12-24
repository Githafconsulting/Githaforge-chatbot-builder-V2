-- Migration: 034_faqs.sql
-- Description: Create FAQs table for FAQ management system
-- Date: 2025-12-24

-- Create faq_categories table
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'help-circle',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,

    -- Organization
    category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,

    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_faqs_is_featured ON faqs(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_faq_categories_display_order ON faq_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_faq_categories_is_active ON faq_categories(is_active) WHERE is_active = TRUE;

-- Insert default categories
INSERT INTO faq_categories (name, slug, description, icon, display_order) VALUES
    ('Billing & Plans', 'billing-plans', 'Questions about pricing, subscriptions, and payments', 'credit-card', 1),
    ('Getting Started', 'getting-started', 'Help with setup and initial configuration', 'rocket', 2),
    ('Features', 'features', 'Information about product capabilities', 'sparkles', 3),
    ('Technical', 'technical', 'Technical questions and troubleshooting', 'settings', 4),
    ('Security & Privacy', 'security-privacy', 'Data protection and security information', 'shield', 5),
    ('API & Integration', 'api-integration', 'Developer resources and integrations', 'code', 6)
ON CONFLICT (slug) DO NOTHING;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_faqs_updated_at ON faqs;
CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_faq_categories_updated_at ON faq_categories;
CREATE TRIGGER update_faq_categories_updated_at
    BEFORE UPDATE ON faq_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed initial FAQs (from current hardcoded data)
INSERT INTO faqs (question, answer, category_id, display_order, is_active, is_featured) VALUES
(
    'Can I change plans later?',
    'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we''ll prorate any charges.',
    (SELECT id FROM faq_categories WHERE slug = 'billing-plans'),
    1,
    TRUE,
    TRUE
),
(
    'What happens after the 14-day trial?',
    'After your trial ends, you''ll be automatically subscribed to the Free plan unless you choose a paid plan. Your data and chatbots are always safe.',
    (SELECT id FROM faq_categories WHERE slug = 'billing-plans'),
    2,
    TRUE,
    FALSE
),
(
    'Do you offer refunds?',
    'Yes, we offer a 30-day money-back guarantee on all paid plans. If you''re not satisfied, we''ll refund you in full, no questions asked.',
    (SELECT id FROM faq_categories WHERE slug = 'billing-plans'),
    3,
    TRUE,
    FALSE
),
(
    'How does the message limit work?',
    'Message limits reset monthly. If you exceed your limit, your chatbot will still work but you''ll be prompted to upgrade for continued service.',
    (SELECT id FROM faq_categories WHERE slug = 'billing-plans'),
    4,
    TRUE,
    FALSE
),
(
    'Is my data secure?',
    'Absolutely. We use bank-level encryption, are GDPR and SOC 2 compliant, and never share your data with third parties. Your data belongs to you.',
    (SELECT id FROM faq_categories WHERE slug = 'security-privacy'),
    1,
    TRUE,
    TRUE
),
(
    'Can I get a custom Enterprise plan?',
    'Yes! Contact our sales team to discuss custom pricing, features, and SLAs tailored to your organization''s needs.',
    (SELECT id FROM faq_categories WHERE slug = 'billing-plans'),
    5,
    TRUE,
    FALSE
),
(
    'What types of documents can I upload?',
    'You can upload PDF, DOCX, TXT, and HTML files. We also support scraping content directly from URLs to build your knowledge base.',
    (SELECT id FROM faq_categories WHERE slug = 'features'),
    1,
    TRUE,
    FALSE
),
(
    'How many chatbots can I create?',
    'The number of chatbots depends on your plan. Free users get 1 chatbot, Pro users get 5, and Enterprise users get unlimited chatbots.',
    (SELECT id FROM faq_categories WHERE slug = 'features'),
    2,
    TRUE,
    FALSE
),
(
    'Can I customize the chatbot appearance?',
    'Yes! You can customize colors, branding, welcome messages, and more to match your website''s look and feel.',
    (SELECT id FROM faq_categories WHERE slug = 'features'),
    3,
    TRUE,
    FALSE
),
(
    'Do you offer API access?',
    'Yes, API access is available on Pro and Enterprise plans. You can integrate our chatbot functionality into your own applications.',
    (SELECT id FROM faq_categories WHERE slug = 'api-integration'),
    1,
    TRUE,
    FALSE
)
ON CONFLICT DO NOTHING;
