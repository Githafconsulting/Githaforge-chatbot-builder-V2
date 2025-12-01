# Scope System Implementation Plan

**Document Version:** 1.0
**Created:** November 30, 2025
**Status:** Pending Review
**Authors:** Claude + User Collaboration

---

> **IMPORTANT: Development Principles**
>
> Please remember to always follow **KISS**, **YAGNI**, **DRY** and **SOLID** principles.
> Always check before action that your implementation doesn't break the code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Problem Statement](#3-problem-statement)
4. [Proposed Architecture](#4-proposed-architecture)
5. [Database Schema Changes](#5-database-schema-changes)
6. [Implementation Phases](#6-implementation-phases)
7. [Caching Strategy](#7-caching-strategy)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend UI Changes](#9-frontend-ui-changes)
10. [RAG Pipeline Updates](#10-rag-pipeline-updates)
11. [Migration Strategy](#11-migration-strategy)
12. [Testing Plan](#12-testing-plan)
13. [Rollback Plan](#13-rollback-plan)
14. [Timeline Estimates](#14-timeline-estimates)

---

## 1. Executive Summary

### Goal
Implement a comprehensive **Scope System** that allows companies to create role-specific chatbots (HR, Sales, Tech Support, etc.) with:
- Custom LLM-generated system prompts per scope/role
- Flexible knowledge base access (shared vs. chatbot-specific documents)
- Proper multi-tenancy isolation
- Performance-optimized caching

### Key Features
1. **Custom Scopes (Roles)**: Companies can CRUD their own scopes with descriptions
2. **LLM-Generated Prompts**: System generates role-specific prompts from scope descriptions
3. **Prompt Management**: Users can edit, regenerate, or restore prompts to defaults
4. **Shared vs. Non-Shared KB**: Documents can be shared across all chatbots or assigned to specific ones
5. **Branding Inheritance**: Chatbot brand falls back to company name if not set

### Immediate Fixes Included
- Remove hardcoded "Githaf Consulting" from query preprocessing
- Fix branding cache invalidation bug
- Implement proper company name fallback chain

---

## 2. Current State Analysis

### 2.1 What Exists

| Component | Status | Notes |
|-----------|--------|-------|
| `chatbots.allowed_scopes` | Exists | Array field for document filtering, but hardcoded 8 scopes |
| `documents.scope` | Exists | Single scope per document |
| `documents.categories` | Exists | Array of topic tags (not actively used) |
| `documents.chatbot_id` | Exists | NULL = shared, UUID = assigned to specific bot |
| Scope filtering in vectorstore | Works | Filters by `allowed_scopes` during search |
| Branding service | Works | Caches branding, but cache never invalidated |
| Classification service | Exists | LLM classification logic, NOT wired into upload |

### 2.2 Hardcoded Scopes (Current)

```python
# Currently hardcoded in classification_service.py and Documents.tsx
SCOPES = [
    'sales', 'support', 'product', 'billing',
    'hr', 'legal', 'marketing', 'general'
]
```

### 2.3 Current Prompt Flow

```
User Query
    → Intent Classification
    → Fetch Branding (brand_name, support_email, brand_website)
    → Embed Query
    → Similarity Search (with scope filtering)
    → Build Context from Documents
    → Generate GENERIC System Prompt (same for all chatbots)
    → LLM Response
    → Validation
    → Return Response
```

**Problem:** All chatbots use the same generic "customer service assistant" prompt regardless of their role.

### 2.4 Current Caching Issues

| Service | Cache Type | TTL | Invalidation |
|---------|-----------|-----|--------------|
| branding_service | In-memory dict | Forever | `clear_branding_cache()` exists but NEVER called |
| chatbot_service | None | N/A | N/A |

**Bug:** When chatbot settings are updated, cache is not cleared → stale data persists.

---

## 3. Problem Statement

### 3.1 Immediate Issues

1. **Hardcoded "Githaf Consulting"** in `rag_service.py` preprocessing (line 65)
   - Forces all queries mentioning "Githaf" to become "Githaf Consulting"
   - Affects ALL companies, not just Githaf

2. **Default Branding Fallback** to "Githaf Consulting"
   - When `chatbot.brand_name` is NULL, defaults to hardcoded "Githaf Consulting"
   - Should fall back to `company.name` instead

3. **Cache Invalidation Bug**
   - `clear_branding_cache()` never called when chatbot is updated
   - Old branding persists until server restart

### 3.2 Architectural Gaps

1. **No Custom Scopes**: Users cannot create their own roles (HR, Tech, etc.)
2. **No Role-Specific Prompts**: All chatbots get the same generic prompt
3. **No Prompt Editor**: Users cannot edit or customize LLM behavior
4. **No Document Sharing Toggle**: Cannot mark documents as shared vs. chatbot-specific
5. **No Scope CRUD UI**: Users cannot manage scopes from admin dashboard

---

## 4. Proposed Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COMPANY                                      │
│  id: UUID                                                           │
│  name: "Hempstead Chamber of Commerce"                              │
│  brand_name: "Hempstead Chamber"                                    │
│  support_email: "support@hempsteadchamber.com"                      │
│  brand_website: "https://hempsteadchamber.com"                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ has many
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SCOPES TABLE (NEW)                          │
│  id: UUID                                                           │
│  company_id: UUID (FK)                                              │
│  name: "HR Support"                                                 │
│  description: "Handles employee questions about policies..."        │
│  system_prompt: "You are an HR assistant for {brand_name}..."       │
│  is_default: BOOLEAN (true = system-provided default)               │
│  default_prompt: TEXT (original prompt for restore-to-default)      │
│  prompt_history: JSONB (for restore-to-last-saved)                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ assigned to
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CHATBOTS TABLE (UPDATED)                    │
│  id: UUID                                                           │
│  company_id: UUID (FK)                                              │
│  scope_id: UUID (FK to scopes) ← NEW                                │
│  use_shared_kb: BOOLEAN (default TRUE) ← NEW                        │
│  selected_document_ids: UUID[] ← NEW (when use_shared_kb=false)     │
│  brand_name: TEXT (NULL = inherit from company)                     │
│  ... existing fields ...                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ accesses
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DOCUMENTS TABLE (UPDATED)                   │
│  id: UUID                                                           │
│  company_id: UUID (FK)                                              │
│  is_shared: BOOLEAN (default TRUE) ← NEW                            │
│  scope: TEXT (for filtering when shared)                            │
│  ... existing fields ...                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow - New RAG Pipeline

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FETCH CHATBOT CONFIG (with scope join - single query)            │
│    SELECT c.*, s.system_prompt, s.name as scope_name,               │
│           comp.name as company_name                                 │
│    FROM chatbots c                                                  │
│    LEFT JOIN scopes s ON c.scope_id = s.id                          │
│    LEFT JOIN companies comp ON c.company_id = comp.id               │
│    WHERE c.id = $chatbot_id                                         │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DETERMINE BRANDING (fallback chain)                              │
│    brand_name = chatbot.brand_name                                  │
│                 ?? company.name                                     │
│                 ?? "AI Assistant"                                   │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. INTENT CLASSIFICATION                                            │
│    (existing logic - no changes)                                    │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. EMBED QUERY                                                      │
│    (existing logic - no changes)                                    │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. SIMILARITY SEARCH (updated filtering logic)                      │
│                                                                     │
│    IF chatbot.use_shared_kb = TRUE:                                 │
│        Filter: company_id = X                                       │
│                AND is_shared = TRUE                                 │
│                AND (scope = chatbot.scope_name OR scope IS NULL)    │
│    ELSE:                                                            │
│        Filter: document_id IN chatbot.selected_document_ids         │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. BUILD PROMPT (scope-specific)                                    │
│                                                                     │
│    IF chatbot.scope_id EXISTS:                                      │
│        system_prompt = scope.system_prompt                          │
│        (replace {brand_name}, {support_email}, {brand_website})     │
│    ELSE:                                                            │
│        system_prompt = generate_default_prompt(branding)            │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. LLM GENERATION                                                   │
│    (existing logic - uses scope-specific prompt)                    │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. VALIDATION & RESPONSE                                            │
│    (existing logic - no changes)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Scope Reusability

Scopes are **reusable across chatbots**:

```
Company: Hempstead Chamber
    │
    ├── Scope: "HR Support" (id: scope-123)
    │       └── system_prompt: "You are an HR assistant..."
    │
    └── Chatbots using this scope:
            ├── "HR Bot" (scope_id: scope-123)
            ├── "Employee Portal Bot" (scope_id: scope-123)
            └── "Onboarding Assistant" (scope_id: scope-123)

All three chatbots share the same HR-specific prompt behavior.
```

---

## 5. Database Schema Changes

### 5.1 New Table: `scopes`

```sql
-- Migration: 019_create_scopes_table.sql

CREATE TABLE IF NOT EXISTS scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Basic Information
    name TEXT NOT NULL,
    description TEXT,

    -- System Prompt (LLM-generated or custom)
    system_prompt TEXT NOT NULL,

    -- Default Management
    is_default BOOLEAN DEFAULT FALSE,  -- TRUE = system-provided default scope
    default_prompt TEXT,               -- Original prompt for "Restore to Default"

    -- Prompt History (for "Restore to Last Saved")
    prompt_history JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"prompt": "...", "saved_at": "timestamp", "saved_by": "user_id"}, ...]

    -- Regeneration Context
    regenerate_context TEXT,  -- User notes for LLM when regenerating

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(company_id, name)
);

-- Indexes
CREATE INDEX idx_scopes_company_id ON scopes(company_id);
CREATE INDEX idx_scopes_is_default ON scopes(is_default);

-- Updated_at trigger
CREATE TRIGGER scopes_updated_at_trigger
    BEFORE UPDATE ON scopes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE scopes IS 'Role-based prompt configurations for chatbots';
COMMENT ON COLUMN scopes.system_prompt IS 'The LLM system prompt used for chatbots assigned to this scope';
COMMENT ON COLUMN scopes.is_default IS 'TRUE if this is a system-provided default scope (General, Sales, Support, etc.)';
COMMENT ON COLUMN scopes.default_prompt IS 'Original system prompt for restore-to-default functionality';
COMMENT ON COLUMN scopes.prompt_history IS 'Array of previous prompts for restore-to-last-saved functionality';
```

### 5.2 Update Table: `chatbots`

```sql
-- Migration: 020_update_chatbots_for_scopes.sql

-- Add scope reference
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS scope_id UUID REFERENCES scopes(id) ON DELETE SET NULL;

-- Add knowledge base selection mode
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS use_shared_kb BOOLEAN DEFAULT TRUE;

-- Add selected documents (for non-shared KB mode)
ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS selected_document_ids UUID[] DEFAULT '{}';

-- Index for scope lookup
CREATE INDEX IF NOT EXISTS idx_chatbots_scope_id ON chatbots(scope_id);

-- Comments
COMMENT ON COLUMN chatbots.scope_id IS 'Reference to scope for role-specific prompt behavior';
COMMENT ON COLUMN chatbots.use_shared_kb IS 'TRUE = use shared KB with scope filtering, FALSE = use only selected documents';
COMMENT ON COLUMN chatbots.selected_document_ids IS 'When use_shared_kb=FALSE, only these documents are accessible';
```

### 5.3 Update Table: `documents`

```sql
-- Migration: 021_update_documents_sharing.sql

-- Add sharing flag
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT TRUE;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_documents_is_shared ON documents(is_shared);

-- Migrate existing documents to shared (safe default)
UPDATE documents SET is_shared = TRUE WHERE is_shared IS NULL;

-- Comments
COMMENT ON COLUMN documents.is_shared IS 'TRUE = available to all chatbots via shared KB, FALSE = only via explicit selection';
```

### 5.4 Default Scopes Seed Data

```sql
-- Migration: 022_seed_default_scopes.sql

-- This function creates default scopes for a company
-- Called when: 1) New company created, 2) User clicks "Restore Defaults"

CREATE OR REPLACE FUNCTION seed_default_scopes(p_company_id UUID)
RETURNS void AS $$
DECLARE
    v_company_name TEXT;
BEGIN
    -- Get company name for prompt personalization
    SELECT name INTO v_company_name FROM companies WHERE id = p_company_id;

    -- Insert default scopes (ON CONFLICT DO NOTHING for idempotency)
    INSERT INTO scopes (company_id, name, description, system_prompt, is_default, default_prompt)
    VALUES
    -- General (Default)
    (
        p_company_id,
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

Context from knowledge base:
{context}

Conversation history:
{history}

User question: {query}

Provide a helpful, accurate response:',
        TRUE,
        NULL  -- default_prompt is NULL for system defaults (use system_prompt as source)
    ),

    -- Sales
    (
        p_company_id,
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
        NULL
    ),

    -- Support
    (
        p_company_id,
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
        NULL
    ),

    -- HR
    (
        p_company_id,
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
        NULL
    ),

    -- Product
    (
        p_company_id,
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
        NULL
    ),

    -- Billing
    (
        p_company_id,
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
        NULL
    )

    ON CONFLICT (company_id, name) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION seed_default_scopes IS 'Creates default scope templates for a company. Safe to call multiple times.';
```

---

## 6. Implementation Phases

### Phase 1: Immediate Fixes (Critical)
**Priority:** HIGHEST
**Estimated Time:** 1-2 hours

#### 1.1 Remove Hardcoded Company Name Preprocessing

**File:** `backend/app/services/rag_service.py`

**Change:** Remove lines 61-65

```python
# REMOVE THIS:
# 1. Normalize company name variations
# Replace standalone "Githaf" with "Githaf Consulting" (but not if already "Githaf Consulting")
import re
# Match "Githaf" but not "Githaf Consulting" (case insensitive)
processed = re.sub(r'\b(Githaf)(?!\s+Consulting)\b', r'Githaf Consulting', processed, flags=re.IGNORECASE)
```

#### 1.2 Fix Branding Fallback Chain

**File:** `backend/app/services/branding_service.py`

**Change:** Update `get_chatbot_branding()` to fetch company name as fallback

```python
async def get_chatbot_branding(chatbot_id: Optional[str] = None) -> ChatbotBranding:
    # ... existing code ...

    # When fetching from DB, also get company name
    response = client.table("chatbots").select(
        "brand_name, support_email, brand_website, greeting_message, fallback_response, "
        "companies(name, support_email, brand_website)"  # JOIN company
    ).eq("id", chatbot_id).single().execute()

    if response.data:
        company = response.data.get("companies", {})

        branding = ChatbotBranding(
            # Fallback chain: chatbot.brand_name → company.name → "AI Assistant"
            brand_name=response.data.get("brand_name")
                      or company.get("name")
                      or "AI Assistant",
            support_email=response.data.get("support_email")
                         or company.get("support_email")
                         or "support@example.com",
            # ... etc
        )
```

#### 1.3 Fix Cache Invalidation Bug

**File:** `backend/app/services/chatbot_service.py`

**Change:** Add cache clearing after update

```python
async def update_chatbot(self, chatbot_id: str, chatbot_data: ChatbotUpdate, company_id: str):
    # ... existing update code ...

    # CRITICAL: Clear branding cache after update
    from app.services.branding_service import clear_branding_cache
    clear_branding_cache(chatbot_id)

    logger.info(f"Updated chatbot: {chatbot_id} (cache cleared)")
    return Chatbot(**response.data[0])
```

#### 1.4 Update Default Branding Constants

**File:** `backend/app/services/branding_service.py`

**Change:** Make defaults generic

```python
@dataclass
class ChatbotBranding:
    # Change from Githaf Consulting to generic
    DEFAULT_BRAND_NAME = "AI Assistant"  # Was: "Githaf Consulting"
    DEFAULT_SUPPORT_EMAIL = "support@example.com"  # Was: "support@githafconsulting.com"
    DEFAULT_BRAND_WEBSITE = "https://example.com"  # Was: "https://githafconsulting.com"
    DEFAULT_GREETING = "Hello! How can I help you today?"
```

---

### Phase 2: Database Schema
**Priority:** HIGH
**Estimated Time:** 1-2 hours

1. Create migration `019_create_scopes_table.sql`
2. Create migration `020_update_chatbots_for_scopes.sql`
3. Create migration `021_update_documents_sharing.sql`
4. Create migration `022_seed_default_scopes.sql`
5. Run migrations in Supabase
6. Verify tables created correctly

---

### Phase 3: Backend Services
**Priority:** HIGH
**Estimated Time:** 3-4 hours

#### 3.1 Create Scope Service

**File:** `backend/app/services/scope_service.py`

```python
class ScopeService:
    async def create_scope(company_id: str, name: str, description: str) -> Scope
    async def update_scope(scope_id: str, data: ScopeUpdate) -> Scope
    async def delete_scope(scope_id: str) -> bool
    async def get_scope(scope_id: str) -> Optional[Scope]
    async def list_company_scopes(company_id: str) -> List[Scope]
    async def generate_prompt(scope_name: str, description: str, company_name: str) -> str
    async def regenerate_prompt(scope_id: str, context: str) -> str
    async def restore_to_default(scope_id: str) -> Scope
    async def restore_to_last_saved(scope_id: str) -> Scope
    async def seed_defaults_for_company(company_id: str) -> List[Scope]
```

#### 3.2 Create Scope Prompt Generator

**File:** `backend/app/services/scope_prompt_service.py`

```python
async def generate_scope_prompt(
    scope_name: str,
    scope_description: str,
    company_name: str,
    user_context: Optional[str] = None
) -> str:
    """
    Use LLM to generate a system prompt for a scope/role.

    Args:
        scope_name: Name of the scope (e.g., "HR Support")
        scope_description: User's description of the scope's purpose
        company_name: Company name for personalization
        user_context: Optional additional context from user

    Returns:
        Generated system prompt string
    """
```

#### 3.3 Update Chatbot Config Service

**File:** `backend/app/services/chatbot_config_service.py` (new)

```python
async def get_chatbot_full_config(chatbot_id: str) -> ChatbotFullConfig:
    """
    Get chatbot with scope and company info in single query.
    Uses TTL caching for performance.

    Returns:
        ChatbotFullConfig with scope.system_prompt, branding, etc.
    """
```

#### 3.4 Create Pydantic Models

**File:** `backend/app/models/scope.py`

```python
class ScopeBase(BaseModel):
    name: str
    description: Optional[str]

class ScopeCreate(ScopeBase):
    pass  # LLM generates system_prompt

class ScopeUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    system_prompt: Optional[str]
    regenerate_context: Optional[str]

class Scope(ScopeBase):
    id: UUID
    company_id: UUID
    system_prompt: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
```

---

### Phase 4: API Endpoints
**Priority:** HIGH
**Estimated Time:** 2-3 hours

#### 4.1 Scopes CRUD

**File:** `backend/app/api/routes/scopes.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/scopes/` | List company scopes |
| POST | `/api/v1/scopes/` | Create scope (triggers prompt generation) |
| GET | `/api/v1/scopes/{id}` | Get scope details |
| PUT | `/api/v1/scopes/{id}` | Update scope |
| DELETE | `/api/v1/scopes/{id}` | Delete scope |
| POST | `/api/v1/scopes/{id}/regenerate` | Regenerate prompt with context |
| POST | `/api/v1/scopes/{id}/restore-default` | Restore to default prompt |
| POST | `/api/v1/scopes/{id}/restore-last-saved` | Restore to last saved version |
| POST | `/api/v1/scopes/seed-defaults` | Create default scopes for company |

#### 4.2 Documents Sharing

**File:** `backend/app/api/routes/documents.py` (update)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/documents/{id}/sharing` | Toggle is_shared flag |
| GET | `/api/v1/documents/?is_shared=true` | Filter by sharing status |

#### 4.3 Chatbot Scope Assignment

**File:** `backend/app/api/routes/chatbots.py` (update)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/chatbots/{id}/scope` | Assign scope to chatbot |
| PUT | `/api/v1/chatbots/{id}/kb-mode` | Set use_shared_kb + selected_document_ids |

---

### Phase 5: RAG Pipeline Updates
**Priority:** HIGH
**Estimated Time:** 2-3 hours

#### 5.1 Update Vectorstore Service

**File:** `backend/app/services/vectorstore_service.py`

```python
async def similarity_search(
    query_embedding: List[float],
    # ... existing params ...
    use_shared_kb: bool = True,  # NEW
    selected_document_ids: List[str] = None,  # NEW
    is_shared_filter: bool = None  # NEW
):
    # Update filtering logic:
    if use_shared_kb:
        # Filter by company_id AND is_shared=TRUE AND scope matching
        query = query.eq("is_shared", True)
        if scope_name:
            query = query.or_(f"scope.eq.{scope_name},scope.is.null")
    else:
        # Filter by explicit document selection
        if selected_document_ids:
            query = query.in_("id", selected_document_ids)
```

#### 5.2 Update RAG Service

**File:** `backend/app/services/rag_service.py`

```python
async def get_rag_response(query: str, chatbot_id: str, ...):
    # 1. Get chatbot full config (with scope) - cached
    config = await get_chatbot_full_config(chatbot_id)

    # 2. Determine system prompt
    if config.scope:
        # Use scope's custom prompt with variable substitution
        system_prompt = config.scope.system_prompt.format(
            brand_name=config.branding.brand_name,
            support_email=config.branding.support_email,
            brand_website=config.branding.brand_website,
            context="{context}",  # Placeholder for later
            history="{history}",
            query="{query}"
        )
    else:
        # Use default generic prompt
        system_prompt = generate_default_prompt(config.branding)

    # 3. Similarity search with KB mode
    results = await similarity_search(
        query_embedding=embedding,
        company_id=config.company_id,
        use_shared_kb=config.use_shared_kb,
        selected_document_ids=config.selected_document_ids,
        scope_name=config.scope.name if config.scope else None
    )

    # 4. Continue with existing LLM generation...
```

---

### Phase 6: Frontend UI
**Priority:** MEDIUM
**Estimated Time:** 4-6 hours

#### 6.1 Scopes Management Page

**File:** `frontend/src/pages/admin/Scopes.tsx` (new)

Features:
- List all company scopes with name, description, is_default badge
- Create new scope modal (name + description → LLM generates prompt)
- Edit scope (inline prompt editor with syntax highlighting)
- Regenerate button with context input field
- Restore dropdown (to default / to last saved)
- Delete confirmation for non-default scopes

#### 6.2 Documents Page Updates

**File:** `frontend/src/pages/admin/Documents.tsx` (update)

Features:
- Two tabs: "Shared Knowledge Base" / "Chatbot-Specific"
- Toggle switch on each document to change sharing status
- Filter by is_shared in sidebar
- Visual indicator (icon) for shared vs non-shared

#### 6.3 Chatbot Settings Updates

**File:** `frontend/src/pages/admin/ChatbotDetail.tsx` (update)

Features:
- Scope selector dropdown (list of company scopes)
- "View Prompt" button to see scope's system_prompt
- KB Mode toggle: "Use Shared Knowledge Base" vs "Select Specific Documents"
- Document multi-select picker (when KB mode is non-shared)
- Preview of which documents the chatbot can access

---

## 7. Caching Strategy

### 7.1 Approach: TTL Cache with Explicit Invalidation

```python
# Cache configuration
CACHE_TTL_SECONDS = 300  # 5 minutes

# Cache structure
_chatbot_config_cache: Dict[str, Tuple[ChatbotFullConfig, float]] = {}
_scope_cache: Dict[str, Tuple[Scope, float]] = {}

async def get_chatbot_full_config(chatbot_id: str) -> ChatbotFullConfig:
    now = time.time()

    # Check cache
    if chatbot_id in _chatbot_config_cache:
        config, cached_at = _chatbot_config_cache[chatbot_id]
        if now - cached_at < CACHE_TTL_SECONDS:
            logger.debug(f"Cache hit for chatbot {chatbot_id}")
            return config

    # Cache miss or expired - fetch from DB
    config = await _fetch_chatbot_config_from_db(chatbot_id)
    _chatbot_config_cache[chatbot_id] = (config, now)
    logger.debug(f"Cached chatbot config {chatbot_id}")

    return config

def clear_chatbot_config_cache(chatbot_id: str = None):
    """Call this when chatbot or scope is updated"""
    if chatbot_id:
        _chatbot_config_cache.pop(chatbot_id, None)
    else:
        _chatbot_config_cache.clear()
```

### 7.2 Cache Invalidation Points

| Action | Cache to Clear |
|--------|---------------|
| Update chatbot settings | `clear_chatbot_config_cache(chatbot_id)` |
| Update scope | `clear_chatbot_config_cache()` (all, since multiple chatbots may use scope) |
| Delete scope | `clear_chatbot_config_cache()` |
| Assign scope to chatbot | `clear_chatbot_config_cache(chatbot_id)` |

### 7.3 Performance Impact

| Scenario | Without Cache | With 5-min TTL Cache |
|----------|--------------|---------------------|
| 100 requests/min | 100 DB queries | ~1 DB query (99% hit rate) |
| Latency per request | +30-50ms | ~0ms (cache hit) |
| Memory usage | 0 | ~1KB per chatbot |

---

## 8. API Endpoints

### 8.1 Scopes API

```yaml
# List company scopes
GET /api/v1/scopes/
Authorization: Bearer {token}
Response:
  - id: uuid
    name: string
    description: string
    system_prompt: string
    is_default: boolean
    created_at: datetime
    updated_at: datetime

# Create scope
POST /api/v1/scopes/
Authorization: Bearer {token}
Body:
  name: string (required)
  description: string (required, used for prompt generation)
Response:
  id: uuid
  name: string
  system_prompt: string (LLM-generated)
  ...

# Update scope
PUT /api/v1/scopes/{scope_id}
Authorization: Bearer {token}
Body:
  name: string (optional)
  description: string (optional)
  system_prompt: string (optional, direct edit)
Response:
  ...updated scope...

# Regenerate prompt
POST /api/v1/scopes/{scope_id}/regenerate
Authorization: Bearer {token}
Body:
  context: string (optional, additional instructions for LLM)
Response:
  system_prompt: string (newly generated)

# Restore to default
POST /api/v1/scopes/{scope_id}/restore-default
Authorization: Bearer {token}
Response:
  system_prompt: string (original default prompt)

# Restore to last saved
POST /api/v1/scopes/{scope_id}/restore-last-saved
Authorization: Bearer {token}
Response:
  system_prompt: string (previous version)

# Delete scope
DELETE /api/v1/scopes/{scope_id}
Authorization: Bearer {token}
Response: 204 No Content

# Seed default scopes
POST /api/v1/scopes/seed-defaults
Authorization: Bearer {token}
Response:
  - ...list of created default scopes...
```

### 8.2 Documents Sharing API

```yaml
# Toggle document sharing
PUT /api/v1/documents/{document_id}/sharing
Authorization: Bearer {token}
Body:
  is_shared: boolean
Response:
  ...updated document...

# List documents with sharing filter
GET /api/v1/documents/?is_shared=true|false
Authorization: Bearer {token}
Response:
  documents: [...]
  total: number
```

### 8.3 Chatbot Scope API

```yaml
# Assign scope to chatbot
PUT /api/v1/chatbots/{chatbot_id}/scope
Authorization: Bearer {token}
Body:
  scope_id: uuid | null (null to remove scope)
Response:
  ...updated chatbot...

# Set KB mode
PUT /api/v1/chatbots/{chatbot_id}/kb-mode
Authorization: Bearer {token}
Body:
  use_shared_kb: boolean
  selected_document_ids: uuid[] (required if use_shared_kb=false)
Response:
  ...updated chatbot...
```

---

## 9. Frontend UI Changes

### 9.1 New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ScopesPage` | `/admin/scopes` | Main scopes management |
| `ScopeCreateModal` | Component | Create new scope form |
| `ScopeEditModal` | Component | Edit scope with prompt editor |
| `PromptEditor` | Component | Code editor for system_prompt |
| `DocumentSharingToggle` | Component | Toggle is_shared on document |
| `KBModeSelector` | Component | Shared vs specific KB picker |
| `DocumentPicker` | Component | Multi-select document list |

### 9.2 Updated Pages

| Page | Changes |
|------|---------|
| `Documents.tsx` | Add tabs, sharing toggle, filter |
| `ChatbotDetail.tsx` | Add scope selector, KB mode, document picker |
| `AdminLayout.tsx` | Add "Scopes" to sidebar navigation |

### 9.3 New Routes

```typescript
// App.tsx
<Route path="/admin/scopes" element={<ScopesPage />} />
```

---

## 10. RAG Pipeline Updates

### 10.1 Updated Function Signatures

```python
# vectorstore_service.py
async def similarity_search(
    query_embedding: List[float],
    top_k: int = None,
    threshold: float = None,
    company_id: str = None,
    scope_name: str = None,        # Changed from allowed_scopes
    chatbot_id: str = None,
    use_shared_kb: bool = True,    # NEW
    selected_document_ids: List[str] = None  # NEW
) -> List[Dict[str, Any]]

# rag_service.py
async def get_rag_response(
    query: str,
    session_id: Optional[str] = None,
    include_history: bool = True,
    max_retries: int = 2,
    chatbot_id: Optional[str] = None,
    company_id: Optional[str] = None
) -> Dict[str, Any]
# Internal changes: Use scope.system_prompt instead of generic template
```

### 10.2 Prompt Variable Substitution

The scope's `system_prompt` contains placeholders that are substituted at runtime:

| Placeholder | Substituted With |
|-------------|------------------|
| `{brand_name}` | chatbot.brand_name ?? company.name ?? "AI Assistant" |
| `{support_email}` | chatbot.support_email ?? company.support_email |
| `{brand_website}` | chatbot.brand_website ?? company.brand_website |
| `{context}` | Retrieved document chunks |
| `{history}` | Conversation history |
| `{query}` | User's question |

---

## 11. Migration Strategy

### 11.1 Database Migrations Order

1. `019_create_scopes_table.sql` - Create scopes table
2. `020_update_chatbots_for_scopes.sql` - Add scope_id, use_shared_kb, selected_document_ids
3. `021_update_documents_sharing.sql` - Add is_shared column
4. `022_seed_default_scopes.sql` - Create seed function

### 11.2 Data Migration

```sql
-- After schema migrations, run data migration:

-- 1. Seed default scopes for all existing companies
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        PERFORM seed_default_scopes(company_record.id);
    END LOOP;
END $$;

-- 2. Set all existing documents to shared
UPDATE documents SET is_shared = TRUE WHERE is_shared IS NULL;

-- 3. Assign "General" scope to existing chatbots (optional)
UPDATE chatbots c
SET scope_id = (
    SELECT s.id FROM scopes s
    WHERE s.company_id = c.company_id AND s.name = 'General'
)
WHERE c.scope_id IS NULL;
```

### 11.3 Rollback Scripts

```sql
-- Rollback 022
DROP FUNCTION IF EXISTS seed_default_scopes;

-- Rollback 021
ALTER TABLE documents DROP COLUMN IF EXISTS is_shared;

-- Rollback 020
ALTER TABLE chatbots DROP COLUMN IF EXISTS scope_id;
ALTER TABLE chatbots DROP COLUMN IF EXISTS use_shared_kb;
ALTER TABLE chatbots DROP COLUMN IF EXISTS selected_document_ids;

-- Rollback 019
DROP TABLE IF EXISTS scopes;
```

---

## 12. Testing Plan

### 12.1 Unit Tests

| Test | Description |
|------|-------------|
| `test_scope_create` | Create scope triggers prompt generation |
| `test_scope_update` | Update scope clears cache |
| `test_prompt_regeneration` | Regenerate creates new prompt |
| `test_restore_to_default` | Restores original prompt |
| `test_restore_to_last_saved` | Restores previous version |
| `test_branding_fallback` | chatbot → company → default |
| `test_cache_invalidation` | Cache clears on update |
| `test_shared_kb_filtering` | Only shared docs returned |
| `test_selected_docs_filtering` | Only selected docs returned |

### 12.2 Integration Tests

| Test | Description |
|------|-------------|
| `test_chatbot_with_scope` | Full RAG flow with scope prompt |
| `test_chatbot_without_scope` | Falls back to default prompt |
| `test_multi_company_isolation` | Company A can't see Company B scopes |
| `test_kb_mode_switching` | Switch between shared and specific |

### 12.3 Manual Testing Checklist

- [ ] Create new scope → verify prompt generated
- [ ] Edit scope prompt → verify cache cleared
- [ ] Assign scope to chatbot → verify prompt used in responses
- [ ] Toggle document sharing → verify filtering works
- [ ] Switch KB mode → verify correct documents searched
- [ ] Test branding fallback chain
- [ ] Test restore to default
- [ ] Test restore to last saved
- [ ] Test with Hempstead chatbot (original issue)

---

## 13. Rollback Plan

### 13.1 Code Rollback

If issues arise, revert to previous commit:

```bash
git revert HEAD~N  # Where N = number of commits to revert
```

### 13.2 Database Rollback

Run rollback scripts in reverse order:
1. `rollback_022.sql`
2. `rollback_021.sql`
3. `rollback_020.sql`
4. `rollback_019.sql`

### 13.3 Feature Flag (Optional)

Add feature flag to enable/disable scope system:

```python
# config.py
USE_SCOPE_SYSTEM = os.getenv("USE_SCOPE_SYSTEM", "true").lower() == "true"

# rag_service.py
if settings.USE_SCOPE_SYSTEM and config.scope:
    system_prompt = config.scope.system_prompt
else:
    system_prompt = generate_default_prompt(config.branding)
```

---

## 14. Timeline Estimates

| Phase | Description | Estimate |
|-------|-------------|----------|
| Phase 1 | Immediate fixes (hardcoding, cache) | 1-2 hours |
| Phase 2 | Database schema | 1-2 hours |
| Phase 3 | Backend services | 3-4 hours |
| Phase 4 | API endpoints | 2-3 hours |
| Phase 5 | RAG pipeline updates | 2-3 hours |
| Phase 6 | Frontend UI | 4-6 hours |
| Testing | Unit + integration + manual | 2-3 hours |
| **Total** | | **15-23 hours** |

---

## Appendix A: File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `backend/scripts/migrations/019_create_scopes_table.sql` | Scopes table migration |
| `backend/scripts/migrations/020_update_chatbots_for_scopes.sql` | Chatbots table updates |
| `backend/scripts/migrations/021_update_documents_sharing.sql` | Documents sharing flag |
| `backend/scripts/migrations/022_seed_default_scopes.sql` | Default scopes seed |
| `backend/app/models/scope.py` | Scope Pydantic models |
| `backend/app/services/scope_service.py` | Scope CRUD service |
| `backend/app/services/scope_prompt_service.py` | Prompt generation service |
| `backend/app/services/chatbot_config_service.py` | Chatbot config with caching |
| `backend/app/api/routes/scopes.py` | Scopes API routes |
| `frontend/src/pages/admin/Scopes.tsx` | Scopes management page |
| `frontend/src/components/PromptEditor.tsx` | Prompt editor component |
| `frontend/src/components/DocumentPicker.tsx` | Document selector component |

### Modified Files

| File | Changes |
|------|---------|
| `backend/app/services/rag_service.py` | Remove hardcoding, use scope prompt |
| `backend/app/services/branding_service.py` | Fix fallback chain, update defaults |
| `backend/app/services/chatbot_service.py` | Add cache invalidation |
| `backend/app/services/vectorstore_service.py` | Add is_shared + KB mode filtering |
| `backend/app/api/routes/documents.py` | Add sharing toggle endpoint |
| `backend/app/api/routes/chatbots.py` | Add scope assignment endpoint |
| `backend/app/api/v1.py` | Register scopes router |
| `frontend/src/pages/admin/Documents.tsx` | Add tabs, sharing toggle |
| `frontend/src/pages/admin/ChatbotDetail.tsx` | Add scope selector, KB mode |
| `frontend/src/components/layout/AdminLayout.tsx` | Add Scopes nav item |
| `frontend/src/App.tsx` | Add scopes route |
| `frontend/src/services/api.ts` | Add scope API functions |
| `frontend/src/types/index.ts` | Add Scope types |

---

## Appendix B: Default Scope Prompts

See Section 5.4 for full prompt text for each default scope:
- General
- Sales
- Support
- HR
- Product
- Billing

---

**Document End**

*Ready for review. Please provide feedback before implementation begins.*