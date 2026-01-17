-- Migration: 038_add_invoice_archived.sql
-- Description: Add is_archived column to invoices table for archiving functionality
-- Date: 2025-01-16

-- Add is_archived column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for archived filter queries
CREATE INDEX IF NOT EXISTS idx_invoices_archived ON invoices(is_archived);

-- Combined index for common query pattern (company + archived status)
CREATE INDEX IF NOT EXISTS idx_invoices_company_archived ON invoices(company_id, is_archived);

COMMENT ON COLUMN invoices.is_archived IS 'Whether the invoice has been archived by the user';
