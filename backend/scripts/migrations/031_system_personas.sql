-- Migration 031: System Personas Architecture
-- Purpose: Centralized persona management with system-level defaults
-- Date: 2025-12-23
--
-- Architecture:
--   - System personas: company_id = NULL, managed by super admin
--   - Company personas: company_id = UUID, managed by company users
--   - Companies see both system (read-only) and their custom personas
--   - Companies can clone system personas to create editable copies

-- ============================================================================
-- STEP 1: Modify personas table to allow NULL company_id
-- ============================================================================

-- Drop the existing NOT NULL constraint on company_id
ALTER TABLE personas ALTER COLUMN company_id DROP NOT NULL;

-- Add is_system column to clearly identify system personas
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Update constraint: system personas have company_id = NULL
-- This is enforced via check constraint
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_system_check;
ALTER TABLE personas ADD CONSTRAINT personas_system_check
    CHECK (
        (is_system = TRUE AND company_id IS NULL) OR
        (is_system = FALSE AND company_id IS NOT NULL)
    );

-- ============================================================================
-- STEP 2: Update unique constraint
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE personas DROP CONSTRAINT IF EXISTS scopes_company_id_name_key;
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_company_id_name_key;

-- Create new unique constraints:
-- 1. System personas: unique by name (only one "General" system persona)
-- 2. Company personas: unique by company_id + name
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_system_name
    ON personas(name) WHERE is_system = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_company_name
    ON personas(company_id, name) WHERE is_system = FALSE;

-- ============================================================================
-- STEP 3: Update RLS policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS scopes_select_policy ON personas;
DROP POLICY IF EXISTS scopes_insert_policy ON personas;
DROP POLICY IF EXISTS scopes_update_policy ON personas;
DROP POLICY IF EXISTS scopes_delete_policy ON personas;
DROP POLICY IF EXISTS personas_select_policy ON personas;
DROP POLICY IF EXISTS personas_insert_policy ON personas;
DROP POLICY IF EXISTS personas_update_policy ON personas;
DROP POLICY IF EXISTS personas_delete_policy ON personas;

-- New select policy: users can see system personas + their company's personas
CREATE POLICY personas_select_policy ON personas
    FOR SELECT
    USING (
        is_system = TRUE  -- Everyone can see system personas
        OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Insert policy: users can only create company personas (not system)
CREATE POLICY personas_insert_policy ON personas
    FOR INSERT
    WITH CHECK (
        is_system = FALSE
        AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Update policy: users can only update their company's personas (not system)
CREATE POLICY personas_update_policy ON personas
    FOR UPDATE
    USING (
        is_system = FALSE
        AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Delete policy: users can only delete their company's personas (not system)
CREATE POLICY personas_delete_policy ON personas
    FOR DELETE
    USING (
        is_system = FALSE
        AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personas_is_system ON personas(is_system);
CREATE INDEX IF NOT EXISTS idx_personas_company_id ON personas(company_id) WHERE company_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Insert default system personas
-- ============================================================================

-- Insert system personas (these are the global defaults)
INSERT INTO personas (company_id, name, description, system_prompt, is_default, is_system, default_prompt)
VALUES
-- General (Default)
(
    NULL,
    'General',
    'All-purpose assistant for general inquiries',
    'You are a helpful and professional assistant for {brand_name}.

Your role is to:
- Provide accurate, helpful information about {brand_name}''s services and operations
- Be polite, empathetic, and professional
- Answer questions based ONLY on the provided context
- If you don''t have enough information, politely say so and suggest contacting support at {support_email}
- Keep responses CONCISE and PRECISE (2-3 sentences maximum)
- Never make up information not present in the context

RESPONSE STYLE:
- Be DIRECT and TO THE POINT
- Use SIMPLE LANGUAGE
- PRIORITIZE KEY INFORMATION
- Use ACTIVE VOICE

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a helpful, accurate response:',
    TRUE,
    TRUE,
    NULL
),

-- Sales
(
    NULL,
    'Sales',
    'Sales inquiries, pricing, and product information',
    'You are a knowledgeable sales assistant for {brand_name}.

Your role is to:
- Help potential customers understand our products and services
- Provide accurate pricing information when available
- Highlight benefits and value propositions
- Guide users toward making informed decisions
- Be enthusiastic but not pushy
- If pricing is not in the context, offer to connect them with our sales team at {support_email}

SALES GUIDELINES:
- Focus on customer needs and pain points
- Emphasize ROI and value
- Be confident but honest about limitations
- Suggest appropriate solutions based on their requirements

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a helpful sales-oriented response:',
    TRUE,
    TRUE,
    NULL
),

-- Support
(
    NULL,
    'Support',
    'Customer support and troubleshooting',
    'You are a patient and helpful support assistant for {brand_name}.

Your role is to:
- Help users troubleshoot issues step-by-step
- Provide clear, actionable instructions
- Be patient and understanding with frustrated users
- Escalate complex issues to human support when needed
- Follow up to ensure issues are resolved

SUPPORT GUIDELINES:
- Ask clarifying questions when the issue is unclear
- Provide numbered steps for processes
- Confirm understanding before moving forward
- If you cannot resolve, provide contact: {support_email}

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a helpful support response:',
    TRUE,
    TRUE,
    NULL
),

-- HR
(
    NULL,
    'HR',
    'Employee questions about policies, benefits, and procedures',
    'You are a professional HR assistant for {brand_name}.

Your role is to:
- Help employees understand company policies and procedures
- Provide accurate information about benefits and compensation
- Guide employees through HR processes (onboarding, leave requests, etc.)
- Maintain confidentiality and professionalism
- Direct sensitive matters to HR directly

HR GUIDELINES:
- Always reference specific policies when available
- Be clear about what requires HR approval
- Maintain a formal but friendly tone
- For sensitive personal matters, recommend: "Please contact HR directly at {support_email}"
- Never make assumptions about individual employee situations

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a professional HR response:',
    TRUE,
    TRUE,
    NULL
),

-- Product
(
    NULL,
    'Product',
    'Product features, documentation, and technical details',
    'You are a product specialist for {brand_name}.

Your role is to:
- Explain product features and capabilities in detail
- Help users understand how to use specific features
- Provide technical specifications when available
- Compare features across different product tiers
- Guide users to relevant documentation

PRODUCT GUIDELINES:
- Be technically accurate and specific
- Use examples to illustrate features
- Mention limitations honestly
- For feature requests, note them and suggest: "You can submit feature requests at {brand_website}"

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a detailed product response:',
    TRUE,
    TRUE,
    NULL
),

-- Billing
(
    NULL,
    'Billing',
    'Invoices, payments, and account-related questions',
    'You are a billing assistant for {brand_name}.

Your role is to:
- Help users understand their invoices and charges
- Explain billing cycles and payment terms
- Guide users through payment processes
- Address billing discrepancies professionally
- Maintain security and privacy of financial information

BILLING GUIDELINES:
- Never share or confirm specific account details publicly
- For refunds or disputes, direct to: {support_email}
- Be precise with amounts and dates when available
- Explain charges clearly without jargon

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a clear billing response:',
    TRUE,
    TRUE,
    NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: Migrate chatbots from company personas to system personas
-- ============================================================================

-- Update chatbots to use the new system personas instead of company-specific defaults
-- Match by persona name (General -> General, Sales -> Sales, etc.)
UPDATE chatbots c
SET persona_id = sp.id
FROM personas cp, personas sp
WHERE c.persona_id = cp.id
  AND cp.is_default = TRUE
  AND cp.company_id IS NOT NULL
  AND sp.is_system = TRUE
  AND sp.name = cp.name;

-- For any chatbots still referencing company personas that don't have a matching system persona,
-- set their persona_id to NULL (they can select a new persona later)
UPDATE chatbots c
SET persona_id = NULL
FROM personas cp
WHERE c.persona_id = cp.id
  AND cp.is_default = TRUE
  AND cp.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM personas sp
    WHERE sp.is_system = TRUE AND sp.name = cp.name
  );

-- ============================================================================
-- STEP 7: Clean up - remove company-specific default personas
-- ============================================================================

-- Now safe to delete - chatbots have been migrated
DELETE FROM personas WHERE is_default = TRUE AND company_id IS NOT NULL;

-- ============================================================================
-- STEP 8: Drop old triggers and functions (no longer needed)
-- ============================================================================

DROP TRIGGER IF EXISTS companies_seed_scopes_trigger ON companies;
DROP TRIGGER IF EXISTS companies_seed_personas_trigger ON companies;
DROP FUNCTION IF EXISTS seed_default_scopes(UUID);
DROP FUNCTION IF EXISTS seed_default_personas(UUID);
DROP FUNCTION IF EXISTS trigger_seed_default_scopes();
DROP FUNCTION IF EXISTS trigger_seed_default_personas();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN personas.is_system IS 'TRUE = system-level persona (global default), FALSE = company-specific persona';
COMMENT ON COLUMN personas.company_id IS 'NULL for system personas, company UUID for company-specific personas';
