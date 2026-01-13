-- Migration: 035_create_billing_tables.sql
-- Description: Create billing tables for Stripe payment integration
-- Date: 2025-01-12

-- ============================================================================
-- 1. ADD STRIPE FIELDS TO COMPANIES TABLE
-- ============================================================================

-- Add Stripe customer ID to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Add Stripe subscription ID to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;

-- Add subscription status (active, past_due, canceled, trialing, ended)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

-- Add billing email (separate from company contact email)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- Add subscription period tracking
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMP WITH TIME ZONE;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- Create indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id ON companies(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);

-- ============================================================================
-- 2. CREATE PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,

    -- Card details (stored by Stripe, we just cache display info)
    card_brand VARCHAR(50),  -- visa, mastercard, amex, discover, etc.
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Status
    is_default BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(company_id, is_default) WHERE is_default = true;

-- ============================================================================
-- 3. CREATE INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,

    -- Invoice details
    amount_due INTEGER NOT NULL,  -- Amount in cents
    amount_paid INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,  -- draft, open, paid, uncollectible, void

    -- Dates
    invoice_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,

    -- PDF/URLs
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,

    -- Subscription info
    subscription_id VARCHAR(255),
    billing_reason VARCHAR(100),  -- subscription_create, subscription_cycle, subscription_update, manual

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);

-- ============================================================================
-- 4. CREATE SUBSCRIPTION HISTORY TABLE
-- ============================================================================
-- Track subscription changes (upgrades, downgrades, cancellations)

CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- What changed
    event_type VARCHAR(50) NOT NULL,  -- created, upgraded, downgraded, canceled, reactivated, trial_ended
    previous_plan VARCHAR(50),
    new_plan VARCHAR(50),

    -- Stripe references
    stripe_subscription_id VARCHAR(255),
    stripe_event_id VARCHAR(255),  -- For idempotency

    -- Additional context
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_company_id ON subscription_history(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ============================================================================
-- 5. CREATE USAGE RECORDS TABLE
-- ============================================================================
-- Track monthly usage for billing purposes

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Billing period (stored as YYYY-MM for easy querying)
    billing_month VARCHAR(7) NOT NULL,  -- Format: 2025-01

    -- Usage metrics
    messages_used INTEGER DEFAULT 0,
    documents_used INTEGER DEFAULT 0,
    chatbots_used INTEGER DEFAULT 0,
    team_members_used INTEGER DEFAULT 0,

    -- Plan limits at the time (for historical reference)
    plan_at_time VARCHAR(50),
    messages_limit INTEGER,
    documents_limit INTEGER,
    chatbots_limit INTEGER,
    team_members_limit INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per company per month
    UNIQUE(company_id, billing_month)
);

-- Indexes for usage records
CREATE INDEX IF NOT EXISTS idx_usage_records_company_id ON usage_records(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_billing_month ON usage_records(billing_month);
CREATE INDEX IF NOT EXISTS idx_usage_records_company_month ON usage_records(company_id, billing_month);

-- ============================================================================
-- 6. CREATE WEBHOOK EVENTS TABLE
-- ============================================================================
-- Track processed webhook events for idempotency

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);

-- ============================================================================
-- 7. TRIGGER FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to billing tables
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_records_updated_at ON usage_records;
CREATE TRIGGER update_usage_records_updated_at
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE payment_methods IS 'Stores payment method references (actual card data stored in Stripe)';
COMMENT ON TABLE invoices IS 'Stores invoice history from Stripe for company billing records';
COMMENT ON TABLE subscription_history IS 'Audit log of subscription changes (upgrades, downgrades, etc.)';
COMMENT ON TABLE usage_records IS 'Monthly usage tracking for plan limit enforcement';
COMMENT ON TABLE stripe_webhook_events IS 'Stripe webhook event log for idempotency and debugging';

COMMENT ON COLUMN companies.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN companies.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN companies.subscription_status IS 'Current subscription status: active, past_due, canceled, trialing, ended';
