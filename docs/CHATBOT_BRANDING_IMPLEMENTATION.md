# Chatbot Branding & Isolation Implementation

**Date:** January 29, 2025
**Status:** ✅ Complete - Requires Migration
**Purpose:** Enable proper chatbot isolation with brand-specific prompts and responses

---

## Problem Statement

The system had hardcoded "Githaf Consulting" references throughout all prompts and responses, causing:

1. **Platform chatbot (Githaforge) showing wrong branding:**
   - Greeting: "Hello! I'm Githaf Consulting's virtual assistant..."
   - Should be: "Hello! I'm Githaforge's virtual assistant..."

2. **No isolation between different chatbots:**
   - All chatbots used the same prompts regardless of which company they belonged to
   - System chatbot (Githaforge website demo) vs client chatbots (Githaf Consulting) had no branding distinction

3. **Hardcoded fallback responses:**
   - All error messages referenced "support@githafconsulting.com"
   - Platform chatbot should reference "support@githaforge.com"

---

## Solution Overview

Implemented a **dynamic branding system** that personalizes all chatbot responses based on chatbot configuration.

### Key Components

1. **Database Schema** - Added branding fields to chatbots table
2. **Branding Service** - Dynamic prompt generation based on chatbot config
3. **RAG Service Integration** - Uses chatbot-specific branding for all responses
4. **Caching** - Performance optimization for branding lookups

---

## Implementation Details

### 1. Database Migration (`016_add_chatbot_branding.sql`)

Added 4 new columns to `chatbots` table:

```sql
-- Brand name (e.g., "Githaforge", "Githaf Consulting", "Acme Corp")
ALTER TABLE chatbots ADD COLUMN brand_name TEXT;

-- Support email for fallback responses
ALTER TABLE chatbots ADD COLUMN support_email TEXT;

-- Brand website URL
ALTER TABLE chatbots ADD COLUMN brand_website TEXT;

-- Optional: Custom fallback response template
ALTER TABLE chatbots ADD COLUMN fallback_response TEXT;
```

**Default Values Applied:**
- System chatbot (Githaforge): `brand_name='Githaforge'`, `support_email='support@githaforge.com'`, `brand_website='https://githaforge.com'`
- Other chatbots: Inherit from company or default to Githaf Consulting

---

### 2. Branding Service (`app/services/branding_service.py`)

**Purpose:** Centralized service for chatbot branding and dynamic prompt generation

**Key Features:**

#### A. ChatbotBranding Data Class
```python
@dataclass
class ChatbotBranding:
    brand_name: str
    support_email: str
    brand_website: str
    greeting_message: str
    fallback_response: Optional[str] = None
```

#### B. Branding Cache
```python
_branding_cache: Dict[str, ChatbotBranding] = {}
```
- Reduces database queries for repeated lookups
- Can be cleared with `clear_branding_cache(chatbot_id)`

#### C. Dynamic Prompt Generators

All prompts are now generated with chatbot-specific branding:

| Function | Purpose | Example Output |
|----------|---------|----------------|
| `generate_rag_system_prompt()` | RAG system prompt with brand name | "You are a helpful assistant for **Githaforge**..." |
| `generate_fallback_response()` | No-context-found response | "Contact us at **support@githaforge.com**..." |
| `generate_greeting_responses()` | Greeting variations (5) | "Hello! Welcome to **Githaforge**..." |
| `generate_farewell_responses()` | Goodbye variations (5) | "Thank you for contacting **Githaforge**..." |
| `generate_gratitude_responses()` | Thank you responses (5) | "Happy to help with **Githaforge** questions..." |
| `generate_help_response()` | Feature list | "I can help with **Githaforge** services..." |
| `generate_chit_chat_responses()` | Casual conversation | "I'm **Githaforge's** virtual assistant..." |
| `generate_out_of_scope_response()` | Off-topic redirect | "I'm designed to help with **Githaforge**..." |

#### D. Helper Functions for Easy Access

```python
await get_branded_greeting(chatbot_id)
await get_branded_farewell(chatbot_id)
await get_branded_help(chatbot_id)
# ... etc
```

---

### 3. RAG Service Integration (`app/services/rag_service.py`)

**Changes Made:**

#### A. Updated `get_conversational_response()` Function

**Before:**
```python
async def get_conversational_response(
    intent: Intent,
    query: str,
    session_id: Optional[str] = None
)
```

**After:**
```python
async def get_conversational_response(
    intent: Intent,
    query: str,
    session_id: Optional[str] = None,
    chatbot_id: Optional[str] = None  # NEW
)
```

**Behavior:**
- Fetches chatbot branding at the start
- Generates all response templates with brand-specific text
- All conversational responses (greetings, farewells, help) now use correct branding

#### B. Updated `get_rag_response()` Function

**Key Changes:**

1. **Fetch Branding Early (Line 380):**
```python
branding = await get_chatbot_branding(chatbot_id)
logger.info(f"Using branding for chatbot: {branding.brand_name}")
```

2. **Pass chatbot_id to Conversational Responses (Line 334):**
```python
return await get_conversational_response(intent, processed_query, session_id, chatbot_id)
```

3. **Use Branded Fallback (Line 498):**
```python
fallback_response = generate_fallback_response(branding)
return {"response": fallback_response, ...}
```

4. **Use Branded RAG Prompt (Line 546):**
```python
rag_system_prompt = generate_rag_system_prompt(branding)
prompt = rag_system_prompt.format(context=context, history=history_text, query=query)
```

5. **Exception Handler with Branded Fallback (Line 676):**
```python
error_branding = await get_chatbot_branding(chatbot_id)
fallback_text = generate_fallback_response(error_branding)
```

---

### 4. Seed Script Update (`seed_platform_chatbot.py`)

**Added Branding Fields:**

```python
chatbot_data = {
    # ... existing fields ...
    "brand_name": "Githaforge",
    "support_email": "support@githaforge.com",
    "brand_website": "https://githaforge.com"
}
```

---

## Response Comparison

### Before Implementation

**Greeting:**
> "Hello! I'm **Githaf Consulting's** virtual assistant. How can I assist you today?"

**Help:**
> "I can help you with **Githaf Consulting** services..."

**Fallback:**
> "Contact our support team at **support@githafconsulting.com**"

**Out of Scope:**
> "I'm designed to help with **Githaf Consulting** services..."

---

### After Implementation (Platform Chatbot)

**Greeting:**
> "Hello! I'm **Githaforge's** virtual assistant. How can I assist you today?"

**Help:**
> "I can help you with **Githaforge** services..."

**Fallback:**
> "Contact our support team at **support@githaforge.com**"

**Out of Scope:**
> "I'm designed to help with **Githaforge** services..."

---

## Files Modified/Created

### Created
1. `backend/scripts/migrations/016_add_chatbot_branding.sql` - Database migration
2. `backend/app/services/branding_service.py` - Branding service (371 lines)

### Modified
3. `backend/app/services/rag_service.py` - Integrated branding into RAG pipeline
4. `backend/scripts/seed_platform_chatbot.py` - Added branding fields to seed data

---

## Testing Instructions

### 1. Run Database Migration

```bash
cd backend
psql -h <host> -U <user> -d <database> -f scripts/migrations/016_add_chatbot_branding.sql
```

Or via Supabase SQL Editor:
```sql
-- Copy contents of 016_add_chatbot_branding.sql and run
```

### 2. Verify Migration

```sql
-- Check if branding columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chatbots'
AND column_name IN ('brand_name', 'support_email', 'brand_website', 'fallback_response');

-- Check system chatbot branding
SELECT brand_name, support_email, brand_website
FROM chatbots
WHERE is_system = TRUE;
```

**Expected Output:**
| brand_name | support_email | brand_website |
|------------|---------------|---------------|
| Githaforge | support@githaforge.com | https://githaforge.com |

### 3. Test Platform Chatbot

**Test Queries:**

1. **Greeting Test:**
   - Input: `"Hello"`
   - Expected: Response contains "Githaforge" (not "Githaf Consulting")

2. **Help Test:**
   - Input: `"What can you help me with?"`
   - Expected: Response contains "Githaforge" services

3. **Out of Scope Test:**
   - Input: `"What is the weather today?"`
   - Expected: Response redirects to "Githaforge" topics

4. **Knowledge Query:**
   - Input: `"What is Githaforge?"`
   - Expected: Uses Githaforge knowledge base, response has "Githaforge" branding

5. **Fallback Test:**
   - Input: `"Tell me about XYZ123"` (non-existent topic)
   - Expected: Fallback response with "support@githaforge.com"

### 4. Test Regular Chatbot (Githaf Consulting)

Create a test with a regular chatbot (non-system):

- Expected: Responses contain "Githaf Consulting" branding
- Verifies that migration didn't break existing chatbots

---

## Performance Considerations

### Caching Strategy

**First Request (Cache Miss):**
1. Query database for chatbot branding (1 query)
2. Store in `_branding_cache`
3. Generate prompts (in-memory)

**Subsequent Requests (Cache Hit):**
1. Retrieve from `_branding_cache` (no database query)
2. Generate prompts (in-memory)

**Cache Invalidation:**
```python
# Clear specific chatbot
clear_branding_cache(chatbot_id)

# Clear all
clear_branding_cache()
```

**When to Clear Cache:**
- After updating chatbot branding fields
- After re-running seed script
- Periodically (optional, for long-running servers)

---

## Edge Cases Handled

1. **Chatbot ID is None:**
   - Returns default "Githaf Consulting" branding
   - Maintains backward compatibility

2. **Chatbot Not Found:**
   - Falls back to default branding
   - Logs warning but doesn't fail

3. **Branding Fields are NULL:**
   - Uses defaults from ChatbotBranding class
   - System still functions

4. **Exception During Branding Lookup:**
   - RAG service catches exception
   - Uses generic fallback message
   - Logs error for debugging

---

## Migration Checklist

- [ ] Run migration SQL script
- [ ] Verify branding columns exist
- [ ] Check system chatbot has Githaforge branding
- [ ] Test platform chatbot responses
- [ ] Test regular chatbot responses (Githaf Consulting)
- [ ] Monitor logs for branding errors
- [ ] Clear branding cache if needed
- [ ] Update environment variables if using SYSTEM_CHATBOT_ID

---

## Rollback Plan

If issues arise:

```sql
-- Rollback migration (removes columns)
ALTER TABLE chatbots DROP COLUMN IF EXISTS brand_name;
ALTER TABLE chatbots DROP COLUMN IF EXISTS support_email;
ALTER TABLE chatbots DROP COLUMN IF EXISTS brand_website;
ALTER TABLE chatbots DROP COLUMN IF EXISTS fallback_response;
```

**Code Rollback:**
- Revert `rag_service.py` changes
- Remove `branding_service.py`
- System will use hardcoded prompts again

---

## Future Enhancements

1. **Admin UI for Branding:**
   - Add branding fields to chatbot settings page
   - Allow admins to customize brand name, email, website per chatbot

2. **Advanced Customization:**
   - Custom greeting templates per chatbot
   - Custom fallback response templates
   - Custom help response content

3. **Multi-language Branding:**
   - Translate branding text based on user language
   - Support for regional support emails

4. **Brand Voice Customization:**
   - Tone settings (formal, casual, friendly)
   - Industry-specific vocabulary
   - Custom response patterns

---

## Support

If you encounter issues:

1. Check migration was applied: `SELECT * FROM chatbots LIMIT 1;`
2. Check branding cache: Add debug logs in `branding_service.py`
3. Clear cache: `clear_branding_cache()`
4. Check logs for errors: `backend/logs/app.log`

For questions, contact the development team.
