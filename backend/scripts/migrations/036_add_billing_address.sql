-- Migration: 036_add_billing_address.sql
-- Description: Add billing address columns to companies table for Stripe sync
-- Date: 2025-01-13

-- ============================================================================
-- ADD BILLING ADDRESS COLUMNS TO COMPANIES TABLE
-- ============================================================================

-- Line 1 of address (street address, P.O. box, company name, etc.)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_line1 VARCHAR(255);

-- Line 2 of address (apartment, suite, unit, building, floor, etc.)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_line2 VARCHAR(255);

-- City
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_city VARCHAR(100);

-- State, province, county, or region
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_state VARCHAR(100);

-- ZIP or postal code
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_postal_code VARCHAR(20);

-- Two-letter country code (ISO 3166-1 alpha-2)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_address_country VARCHAR(2);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN companies.billing_address_line1 IS 'Billing address line 1 (synced from Stripe)';
COMMENT ON COLUMN companies.billing_address_line2 IS 'Billing address line 2 (synced from Stripe)';
COMMENT ON COLUMN companies.billing_address_city IS 'Billing address city (synced from Stripe)';
COMMENT ON COLUMN companies.billing_address_state IS 'Billing address state/province (synced from Stripe)';
COMMENT ON COLUMN companies.billing_address_postal_code IS 'Billing address postal code (synced from Stripe)';
COMMENT ON COLUMN companies.billing_address_country IS 'Billing address country code ISO 3166-1 alpha-2 (synced from Stripe)';