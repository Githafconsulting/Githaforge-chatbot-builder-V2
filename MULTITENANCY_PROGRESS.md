# Multi-Tenancy Implementation Progress

**Project:** Githaf Chatbot Builder V2
**Date Started:** January 27, 2025
**Last Updated:** January 27, 2025 (Continued Session - Phase 5 Partial)
**Status:** Frontend Development In Progress 🚧

---

## 📊 Overall Progress: 60% Complete

- ✅ **Phase 1:** Database Migrations & Cleanup (100%)
- ✅ **Phase 2.1:** Fix Hardcoded company_id (100%)
- ✅ **Phase 2.2:** RBAC Service (100%)
- ✅ **Phase 2.3:** Document Classification Service (100%)
- ✅ **Phase 2.4:** RAG/Vectorstore/Analytics Services (100%)
- ✅ **Phase 3:** Authentication Endpoints (100%)
- ✅ **Phase 4:** Super Admin Backend Routes (100%)
- 🚧 **Phase 5:** Company Dashboard Frontend (40% - Chatbots pages complete)
- ⏳ **Phase 6:** Super Admin Dashboard Frontend (0%)
- ⏳ **Phase 7:** Testing (0%)

---

## ✅ Completed Tasks

### Phase 1: Database Migrations & Cleanup

#### 1.1 Database Schema Created ✅
**Files Created:**
- `001_create_companies_table.sql` - Multi-tenant company management
- `002_create_chatbots_table.sql` - Chatbot configurations per company
- `003_update_users_table.sql` - Added company_id to users
- `004_update_documents_table.sql` - Added company_id, chatbot_id, scope, categories
- `005_update_conversations_table.sql` - Added chatbot_id with triggers
- `006_create_rbac_tables.sql` - Permissions, roles, role_permissions tables
- `006b_update_users_add_role_id.sql` - Added role_id after roles table creation
- `007_create_rls_functions.sql` - Row-Level Security helper functions
- `008_create_rls_policies.sql` - RLS policies for all tables
- `009_seed_permissions.sql` - 17 predefined permissions
- `010_seed_default_roles.sql` - 6 predefined roles (Owner, Admin, Editor, Trainer, Analyst, Viewer)
- `011_cleanup_and_fix_data.sql` - Data migration script

**Features Implemented:**
- ✅ Multi-tenant company isolation
- ✅ Row-Level Security (RLS) enabled on all tables
- ✅ RBAC system with 6 roles and 17 permissions
- ✅ Automatic metric triggers for chatbots
- ✅ Document scope filtering (8 predefined scopes + custom)
- ✅ PostgreSQL session context functions

#### 1.2 Data Migration Completed ✅
**Results:**
- ✅ Created "Githaf Consulting" company (ID: `35816f68-d848-40ff-9b29-349a07632052`)
- ✅ Created "Default Chatbot" (ID: `ae6a4f8e-5705-4294-9929-75a5ce12666c`)
- ✅ Migrated 2 users to company with Owner role
- ✅ Migrated 7 documents to company and chatbot
- ✅ Migrated 43 conversations to chatbot
- ✅ Preserved all 284 messages
- ✅ Zero orphaned records

**Verification:**
```sql
Companies:                1 ✅
Chatbots:                 1 ✅
Users:                    2 ✅ (both with Owner role, 17 permissions each)
Documents:                7 ✅
Conversations:           43 ✅
Messages:               284 ✅
Predefined Roles:         6 ✅
Permissions:             17 ✅
Role-Permission Mappings: 54 ✅
```

---

### Phase 2.1: Fix Hardcoded company_id in Chatbot Routes ✅

**File Modified:** `backend/app/api/routes/chatbots.py`

**Changes Made:** Fixed 8 endpoints to extract `company_id` from authenticated user instead of using hardcoded value

#### Endpoints Fixed:

1. **POST `/chatbots/`** - Create chatbot
   - ✅ Extracts `company_id` from `current_user`
   - ✅ Validates user has company association
   - ✅ Converts UUID to string for service layer

2. **GET `/chatbots/`** - List chatbots
   - ✅ Filters by user's company_id
   - ✅ Enforces multi-tenant isolation

3. **GET `/chatbots/{chatbot_id}`** - Get chatbot
   - ✅ Verifies chatbot belongs to user's company
   - ✅ Returns 404 if chatbot not found or belongs to different company

4. **PUT `/chatbots/{chatbot_id}`** - Update chatbot
   - ✅ Company-scoped update
   - ✅ Prevents cross-tenant updates

5. **DELETE `/chatbots/{chatbot_id}`** - Delete chatbot
   - ✅ Soft delete with company verification
   - ✅ Preserves conversation history

6. **POST `/chatbots/{chatbot_id}/deploy`** - Deploy chatbot
   - ✅ Company-scoped deployment
   - ✅ Sets deploy_status (draft/deployed/paused)

7. **GET `/chatbots/{chatbot_id}/stats`** - Get statistics
   - ✅ Returns stats only for user's company chatbot
   - ✅ Prevents data leakage across tenants

8. **GET `/chatbots/{chatbot_id}/embed-code`** - Get embed code
   - ✅ Generates embed code with company verification
   - ✅ Ensures widget only works for correct company

**Code Pattern Used:**
```python
# Extract company_id from authenticated user
company_id = current_user.get("company_id")
if not company_id:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="User must be associated with a company"
    )

# Use company_id for database operations
service = ChatbotService()
result = await service.method(chatbot_id, str(company_id))
```

**Security Improvements:**
- ✅ Prevents unauthorized access to other companies' chatbots
- ✅ Enforces company isolation at application level
- ✅ Works in conjunction with RLS for defense-in-depth
- ✅ Consistent error handling (403 for missing company, 404 for not found)

---

### Phase 2.4: Update RAG/Vectorstore/Analytics Services ✅

**Files Modified:**
- `backend/app/services/vectorstore_service.py` - Added multitenancy filtering
- `backend/app/services/rag_service.py` - Added chatbot_id and company_id support
- `backend/app/services/analytics_service.py` - Updated all metrics functions

#### Vectorstore Service Updates ✅

**Function:** `similarity_search()`
- ✅ Added `company_id` parameter for data isolation
- ✅ Added `allowed_scopes` parameter for scope filtering (e.g., ['sales', 'support'])
- ✅ Added `chatbot_id` parameter for chatbot-specific document assignment
- ✅ Created `_apply_document_filters()` helper function
- ✅ Retrieves 2x results then filters (compensates for filtered documents)

**Filtering Logic:**
```python
# 1. Company isolation (CRITICAL for multitenancy)
if company_id:
    query = query.eq("company_id", company_id)

# 2. Chatbot assignment (NULL = available to all bots in company)
if chatbot_id:
    query = query.or_(f"chatbot_id.eq.{chatbot_id},chatbot_id.is.null")

# 3. Scope filtering (filter by allowed_scopes)
if allowed_scopes:
    scope_filters = [f"scope.eq.{scope}" for scope in allowed_scopes]
    scope_filters.append("scope.is.null")  # Include general docs
    query = query.or_(",".join(scope_filters))
```

**Security:**
- ✅ Fail-safe: Returns empty list on error (prevents data leakage)
- ✅ Defense-in-depth: Works with RLS policies
- ✅ Document metadata lookup prevents cross-tenant embedding access

#### RAG Service Updates ✅

**Function:** `get_rag_response()`
- ✅ Added `chatbot_id` parameter
- ✅ Added `company_id` parameter
- ✅ Fetches chatbot configuration (allowed_scopes, company_id)
- ✅ Passes filters to `similarity_search()`

**Flow:**
```
1. Fetch chatbot config from database
   ↓
2. Extract allowed_scopes and company_id
   ↓
3. Embed query
   ↓
4. Similarity search with filters:
   - company_id (isolate by tenant)
   - allowed_scopes (filter by chatbot's document access)
   - chatbot_id (include chatbot-assigned or shared docs)
   ↓
5. Generate response using filtered context
```

**Example:**
```python
# Sales bot for Company A
await get_rag_response(
    query="What are our pricing options?",
    chatbot_id="sales-bot-uuid",
    company_id="company-a-uuid"
)
# Only returns documents:
# - Belonging to Company A (company_id filter)
# - With scope='sales' OR scope IS NULL (allowed_scopes filter)
# - Assigned to sales bot OR available to all (chatbot_id filter)
```

#### Analytics Service Updates ✅

**Updated Functions:**
1. ✅ `get_conversation_metrics(company_id, chatbot_id)` - Filtered conversation stats
2. ✅ `get_satisfaction_metrics(company_id, chatbot_id)` - Filtered feedback stats
3. ✅ `get_trending_queries(limit, company_id, chatbot_id)` - Filtered query trends
4. ✅ `get_knowledge_base_metrics(company_id, chatbot_id)` - Filtered document counts
5. ✅ `get_analytics_overview(company_id, chatbot_id)` - Aggregated filtered metrics

**Helper Functions Added:**
- ✅ `_empty_conversation_metrics()` - Returns zeros for empty companies
- ✅ `_empty_satisfaction_metrics()` - Returns zeros for empty feedback

**Filtering Strategy:**
```python
# All analytics functions follow this pattern:

# 1. Get chatbot IDs for company (if company filter applied)
if company_id:
    chatbot_ids = get_chatbots_for_company(company_id)
    query = query.in_("chatbot_id", chatbot_ids)

# 2. Or filter by specific chatbot
elif chatbot_id:
    query = query.eq("chatbot_id", chatbot_id)

# 3. Get conversation IDs for message/feedback filtering
conversation_ids = get_conversations(chatbot_filter)
query = query.in_("conversation_id", conversation_ids)
```

**Metrics Now Support:**
- ✅ Company-level analytics (all chatbots for a company)
- ✅ Chatbot-level analytics (specific chatbot)
- ✅ Global analytics (super admin, no filters)
- ✅ Consistent zero-value returns for empty datasets

---

### Phase 3: Build Authentication Endpoints ✅

**Files Modified:**
- `backend/app/models/user.py` - Added CompanySignup and SignupResponse models
- `backend/app/api/routes/auth.py` - Added signup and super-admin-login endpoints

#### New Pydantic Models ✅

**CompanySignup Model:**
```python
class CompanySignup(BaseModel):
    company_name: str        # Min 2, max 100 chars
    email: EmailStr          # Owner email
    password: str            # Min 8 chars
    full_name: str           # Min 2 chars
    website: Optional[str]   # Company website
    industry: Optional[str]  # Industry type
    company_size: Optional[str]  # 1-10, 11-50, etc.
```

**SignupResponse Model:**
```python
class SignupResponse(BaseModel):
    access_token: str        # JWT for immediate login
    token_type: str          # "bearer"
    company_id: UUID         # Created company ID
    user_id: UUID            # Created owner user ID
    message: str             # Success message
```

#### Company Signup Endpoint ✅

**Endpoint:** `POST /api/v1/auth/signup`
**Status Code:** 201 Created
**Authentication:** None (public)

**Signup Flow:**
```
1. Validate email uniqueness
   ↓
2. Validate company name uniqueness
   ↓
3. Create company with default settings:
   - plan: "free"
   - is_active: true
   - Default scopes: 8 predefined
   ↓
4. Fetch "Owner" role (or create if missing)
   ↓
5. Hash password (bcrypt)
   ↓
6. Create owner user:
   - company_id: assigned
   - role_id: owner role
   - role: "owner" (legacy)
   - is_admin: true
   - is_active: true
   ↓
7. Generate JWT with company_id + role
   ↓
8. Return token + company/user IDs
```

**Error Handling:**
- ✅ 400: Email already registered
- ✅ 400: Company name already taken
- ✅ 500: Failed to create company
- ✅ 500: Failed to create user (with rollback)
- ✅ Rollback mechanism: Deletes company if user creation fails

**Security:**
- ✅ Password hashing with bcrypt
- ✅ Automatic owner role assignment
- ✅ Immediate JWT generation for login
- ✅ Company isolation from creation

#### Super Admin Login Endpoint ✅

**Endpoint:** `POST /api/v1/auth/super-admin-login`
**Status Code:** 200 OK
**Authentication:** OAuth2 password flow

**Super Admin Characteristics:**
- ✅ `role = "super_admin"`
- ✅ `company_id = NULL` (not tied to any company)
- ✅ `is_super_admin = true` in JWT (for RLS bypass)
- ✅ Access to all companies and data
- ✅ Cannot be created via signup (manual creation only)

**Login Flow:**
```
1. Find user by email AND role='super_admin'
   ↓
2. Verify password
   ↓
3. Check is_active status
   ↓
4. Generate JWT with:
   - company_id: null
   - role: "super_admin"
   - is_super_admin: true (RLS bypass flag)
   ↓
5. Return token
```

**Error Handling:**
- ✅ 401: Invalid super admin credentials
- ✅ 403: Account inactive
- ✅ 500: Login failed

**Security:**
- ✅ Separate endpoint from company login
- ✅ Role-based filtering (only super_admin role)
- ✅ Special JWT flag for RLS bypass
- ✅ Audit logging for super admin access

#### Existing Login Endpoint (Updated Documentation) ✅

**Endpoint:** `POST /api/v1/auth/login`
**Purpose:** Company user login
**JWT Payload:**
```json
{
  "sub": "user_id",
  "company_id": "uuid",
  "role": "owner|admin|editor|trainer|analyst|viewer",
  "exp": timestamp
}
```

**Note:** This endpoint is for company users (owners, admins, team members). Super admins use separate endpoint.

---

### Phase 4: Super Admin Backend Routes ✅

**File Created:**
- `backend/app/api/routes/super_admin.py` - Platform management endpoints for super admins

**File Modified:**
- `backend/app/api/v1.py` - Registered super_admin router with `/super-admin` prefix

#### Super Admin Dependency ✅

**Function:** `require_super_admin(current_user: Dict = Depends(get_current_admin_user))`

**Purpose:** Ensures authenticated user has super_admin role

**Error Response:**
- ✅ 403: "Super admin access required" if not super admin

#### Company Management Endpoints ✅

**1. List All Companies**
- **Endpoint:** `GET /api/v1/super-admin/companies`
- **Query Params:** limit (default 50), offset (default 0), is_active (bool), plan (str)
- **Returns:** Array of companies with enriched stats
- **Features:**
  - Pagination support
  - Filter by active status
  - Filter by plan (free, pro, enterprise)
  - Enriched with company stats (users, chatbots, conversations, documents)
  - Uses `get_company_stats()` RPC or fallback calculation

**2. Get Company Details**
- **Endpoint:** `GET /api/v1/super-admin/companies/{company_id}`
- **Returns:** Full company details + stats
- **Includes:**
  - Company metadata (name, plan, limits, branding)
  - User count, chatbot count, conversation count, document count
  - Total messages, avg satisfaction
  - Created/updated timestamps

**3. Update Company**
- **Endpoint:** `PUT /api/v1/super-admin/companies/{company_id}`
- **Body:** CompanyUpdate model (partial updates allowed)
- **Updatable Fields:**
  - name, website, industry, company_size
  - plan, max_bots, max_documents, max_monthly_messages
  - is_active, primary_color, secondary_color
- **Features:**
  - Only updates provided fields (partial update)
  - Validates company exists
  - Returns updated company

**4. Suspend Company**
- **Endpoint:** `POST /api/v1/super-admin/companies/{company_id}/suspend`
- **Body:** `{ "reason": "Optional suspension reason" }`
- **Actions:**
  - Sets `companies.is_active = false`
  - Deactivates all users in company (`users.is_active = false`)
  - Pauses all chatbots (`chatbots.deploy_status = 'paused'`)
- **Returns:** Success message + affected counts
- **Use Case:** Suspend companies for non-payment, ToS violation, etc.

**5. Activate Company**
- **Endpoint:** `POST /api/v1/super-admin/companies/{company_id}/activate`
- **Actions:**
  - Sets `companies.is_active = true`
  - Reactivates all users (`users.is_active = true`)
  - Resumes chatbots (`chatbots.deploy_status = 'draft'`)
- **Returns:** Success message + affected counts
- **Use Case:** Reactivate after suspension resolved

#### Global Analytics Endpoints ✅

**6. Platform Analytics**
- **Endpoint:** `GET /api/v1/super-admin/analytics`
- **Returns:** Platform-wide metrics across all companies
- **Metrics:**
  - Global conversation metrics (total conversations, messages)
  - Global satisfaction metrics (avg rating, response rate)
  - Company stats (total, active, by plan)
  - Total users, chatbots, documents
  - Growth trends (new companies this month)
- **Features:**
  - Calls analytics service without company_id filter
  - Aggregates data from all companies
  - Useful for platform health monitoring

**7. List All Users**
- **Endpoint:** `GET /api/v1/super-admin/users`
- **Query Params:** limit (default 100), offset (default 0), company_id (str), role (str)
- **Returns:** Array of users with company names
- **Features:**
  - Pagination support
  - Filter by company
  - Filter by role
  - Enriched with company name
  - Sorted by creation date (newest first)

**8. List All Chatbots**
- **Endpoint:** `GET /api/v1/super-admin/chatbots`
- **Query Params:** limit (default 100), offset (default 0), company_id (str), deploy_status (str)
- **Returns:** Array of chatbots with company names
- **Features:**
  - Pagination support
  - Filter by company
  - Filter by deploy status (draft, active, paused)
  - Enriched with company name
  - Sorted by creation date (newest first)

#### Helper Functions ✅

**_calculate_company_stats(company_id: str) → Dict**

Fallback function for company stats calculation when RPC not available.

**Calculates:**
- User count (total users in company)
- Chatbot count (total chatbots in company)
- Conversation count (via chatbots)
- Document count
- Total messages
- Average satisfaction (from feedback)

**Returns:** Dictionary with all stats (returns 0s on error)

#### Security Features ✅

- ✅ All endpoints require super_admin role
- ✅ 403 error if non-super-admin tries to access
- ✅ Bypasses RLS policies (super admin has global access)
- ✅ Audit logging for all super admin actions
- ✅ No company_id filter applied (global queries)

#### Router Registration ✅

**File:** `backend/app/api/v1.py`

```python
from app.api.routes import super_admin

api_router.include_router(
    super_admin.router,
    prefix="/super-admin",
    tags=["Super Admin"]
)
```

**API Docs:** Available at `/docs` under "Super Admin" tag

#### Use Cases ✅

**Company Lifecycle Management:**
- Monitor new signups
- Review company details and usage
- Suspend companies for policy violations
- Update plan limits (upgrade/downgrade)

**Platform Monitoring:**
- Track global metrics
- Identify top companies by usage
- Monitor platform health
- View all users and chatbots

**Support & Debugging:**
- View company data for support tickets
- Debug issues across companies
- Audit company activity

---

### Phase 5: Company Dashboard Frontend (Partial) 🚧

**Files Created:**
- `frontend/src/pages/admin/Chatbots.tsx` - Chatbots list page (502 lines)
- `frontend/src/pages/admin/ChatbotDetail.tsx` - Chatbot detail page (565 lines)

**Files Modified:**
- `frontend/src/services/api.ts` - Added chatbot CRUD APIs
- `frontend/src/App.tsx` - Added chatbot routes
- `frontend/src/components/layout/AdminLayout.tsx` - Added "My Chatbots" nav item

#### Phase 5.1: Chatbots List Page ✅

**File:** `frontend/src/pages/admin/Chatbots.tsx` (502 lines)

**Features Implemented:**
- ✅ Grid view of all company chatbots
- ✅ Search functionality (by name and description)
- ✅ Create chatbot modal with form
- ✅ Deploy/pause chatbot buttons
- ✅ Delete chatbot with confirmation
- ✅ View chatbot details navigation
- ✅ Real-time stats display (conversations, messages, rating)
- ✅ Status badges (Active, Paused, Draft)
- ✅ Empty state with call-to-action

**Components:**
- `ChatbotsPage` - Main page component
- `ChatbotCard` - Individual chatbot display card
- `CreateChatbotModal` - Modal form for creating chatbots

**Chatbot Card Details:**
- Name and status badge
- Description preview (line-clamped to 2 lines)
- Stats grid (conversations, messages, rating)
- Action buttons (Manage, Deploy/Pause, Delete)
- Hover effects and transitions

**Create Modal Fields:**
- Name (required)
- Description (optional)
- Greeting message (default: "Hello! How can I help you today?")
- Model preset (fast, balanced, accurate)

#### Phase 5.2: Chatbot Detail Page ✅

**File:** `frontend/src/pages/admin/ChatbotDetail.tsx` (565 lines)

**Features Implemented:**
- ✅ Three-tab interface (Settings, Analytics, Embed Code)
- ✅ Settings tab with editable chatbot configuration
- ✅ Analytics tab with stats dashboard
- ✅ Embed code tab with copy functionality
- ✅ Deploy/pause/delete actions in header
- ✅ Back navigation to chatbots list

**Settings Tab:**
- Basic information (name, description, greeting message)
- Branding (primary color, secondary color with color pickers)
- Model preset selector
- Save button with loading state

**Analytics Tab:**
- 4-card stats grid:
  - Total conversations
  - Total messages
  - Satisfaction rate
  - Average response time
- Top queries list with counts

**Embed Code Tab:**
- Pre-formatted embed code display
- Copy to clipboard button
- Visual feedback on copy (checkmark)

**Components:**
- `ChatbotDetailPage` - Main page component
- `SettingsTab` - Editable configuration form
- `AnalyticsTab` - Stats dashboard
- `EmbedTab` - Code display with copy
- `StatCard` - Reusable stat display component

#### API Service Updates ✅

**File:** `frontend/src/services/api.ts`

**New Methods Added:**
```typescript
async getChatbots(limit, offset) → { chatbots: Chatbot[]; total: number }
async getChatbot(chatbotId) → Chatbot
async createChatbot(data: ChatbotCreate) → Chatbot
async updateChatbot(chatbotId, data: ChatbotUpdate) → Chatbot
async deleteChatbot(chatbotId) → void
async deployChatbot(chatbotId) → Chatbot
async pauseChatbot(chatbotId) → Chatbot
async getChatbotStats(chatbotId) → ChatbotStats
async getChatbotWithEmbedCode(chatbotId) → ChatbotWithEmbedCode
```

**Features:**
- Full CRUD operations for chatbots
- Deploy/pause status management
- Stats retrieval
- Embed code generation
- Pagination support

#### Routing Updates ✅

**File:** `frontend/src/App.tsx`

**Routes Added:**
- `/admin/chatbots` - Chatbots list page
- `/admin/chatbots/:chatbotId` - Chatbot detail page

**Navigation:**
- Added "My Chatbots" item to AdminLayout sidebar
- Positioned as second item (after Analytics)
- Uses Bot icon with cyan color

---

## 🔧 Existing Components (Already Implemented)

### Authentication System ✅
**File:** `backend/app/api/routes/auth.py`
- ✅ JWT tokens include `company_id` and `role` (lines 59-62)
- ✅ 60-minute token expiration
- ✅ bcrypt password hashing

**Token Payload:**
```json
{
  "sub": "user_id",
  "company_id": "uuid",
  "role": "owner|admin|editor|trainer|analyst|viewer|super_admin",
  "exp": timestamp
}
```

### Row-Level Security Middleware ✅
**File:** `backend/app/middleware/rls_middleware.py`
- ✅ Extracts JWT token from Authorization header
- ✅ Fetches user from database to get company_id
- ✅ Calls `set_company_context()` RPC function
- ✅ Sets PostgreSQL session variables:
  - `app.current_company_id`
  - `app.is_super_admin`
- ✅ Skips RLS for public endpoints (chat, feedback, health, docs)

**How It Works:**
```
1. Request arrives with JWT token
2. Middleware extracts company_id from token
3. Calls PostgreSQL: set_company_context(company_id, is_super_admin)
4. All subsequent queries filtered by RLS policies
5. User only sees data for their company
```

### User Dependency ✅
**File:** `backend/app/core/dependencies.py`
- ✅ `get_current_user()` - Returns full user object with company_id
- ✅ `get_current_admin_user()` - Verifies admin/owner/super_admin role
- ✅ `get_optional_user()` - For optional authentication

---

## 📝 Database Schema Summary

### Core Tables

#### companies
```sql
- id (UUID, PK)
- name, website, logo_url
- primary_color, secondary_color (branding)
- plan (free, pro, enterprise)
- max_bots, max_documents, max_monthly_messages
- default_scopes[] (8 predefined)
- custom_scopes[] (user-defined)
- is_active, created_at, updated_at
```

#### chatbots
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- name, description, greeting_message
- primary_color, secondary_color, logo_url (optional branding override)
- allowed_scopes[] (document filtering)
- allowed_domains[] (CORS whitelist)
- model_preset (fast, balanced, accurate)
- temperature, max_tokens, top_k, similarity_threshold
- deploy_status (draft, deployed, paused)
- total_conversations, total_messages, avg_satisfaction (auto-updated)
- is_active, created_at, updated_at
```

#### users
```sql
- id (UUID, PK)
- email, password_hash, full_name
- company_id (UUID, FK → companies) - NULL for super_admin
- role_id (UUID, FK → roles)
- role (legacy field: super_admin, owner, admin, member)
- is_active, is_admin
- created_at, updated_at
```

#### documents
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- chatbot_id (UUID, FK → chatbots, nullable - NULL means all bots can use)
- title, file_type, file_size
- storage_path, download_url (Supabase Storage)
- source_type (upload, url, scraped)
- scope (sales, support, product, billing, hr, legal, marketing, general)
- categories[], topics[] (AI-generated)
- auto_classified BOOLEAN
- classification_confidence FLOAT
- chunk_count
- created_at, updated_at
```

#### conversations
```sql
- id (UUID, PK)
- chatbot_id (UUID, FK → chatbots)
- session_id (unique per user session)
- created_at, last_message_at
```

#### messages
```sql
- id (UUID, PK)
- conversation_id (UUID, FK → conversations)
- role (user, assistant)
- content TEXT
- context_used JSONB (sources)
- created_at
```

#### permissions
```sql
- id (UUID, PK)
- code (unique, e.g., "view_documents")
- name (display name)
- category (documents, chatbots, analytics, team, company)
```

**17 Permissions:**
1. view_documents, upload_documents, delete_documents
2. view_chatbots, create_chatbots, edit_chatbots, delete_chatbots, deploy_chatbots
3. view_analytics, export_data
4. view_team, invite_members, edit_members, remove_members
5. edit_company, manage_billing, manage_roles

#### roles
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies, nullable) - NULL = predefined role
- code (unique per company)
- name, description
- is_custom BOOLEAN
- created_at, updated_at
```

**6 Predefined Roles:**
- Owner (17 permissions) - Full control
- Admin (15 permissions) - All except billing & role management
- Editor (8 permissions) - Create/edit content
- Trainer (5 permissions) - Upload docs, edit bots
- Analyst (5 permissions) - View analytics, export data
- Viewer (4 permissions) - Read-only

#### role_permissions
```sql
- role_id (UUID, FK → roles)
- permission_id (UUID, FK → permissions)
- PRIMARY KEY (role_id, permission_id)
```

---

## 🎯 Next Steps (Pending)

### Phase 2.2: Build RBAC Service ⏳
**Estimated Time:** 4-6 hours

**Tasks:**
1. Create `backend/app/services/rbac_service.py`
   - `check_permission(user_id, permission_code)` → bool
   - `get_user_permissions(user_id)` → List[str]
   - `has_any_permission(user_id, permissions)` → bool
   - `require_permission(permission_code)` → Decorator

2. Create `backend/app/middleware/permission_middleware.py`
   - FastAPI dependency: `Depends(require_permission("view_documents"))`
   - Returns 403 if user lacks permission

3. Update route files to use permission checks:
   - `documents.py` - require upload_documents, delete_documents
   - `chatbots.py` - require create_chatbots, deploy_chatbots, etc.
   - `users.py` - require invite_members, remove_members
   - `analytics.py` - require view_analytics, export_data

**Example Usage:**
```python
from app.core.dependencies import require_permission

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("upload_documents"))
):
    # Only users with upload_documents permission can access this
    ...
```

---

### Phase 2.3: Build Document Classification Service ⏳
**Estimated Time:** 6-8 hours

**Tasks:**
1. Create `backend/app/services/classification_service.py`
   - `classify_document(content, filename)` → ClassificationResult
   - Uses Groq LLM to analyze document
   - Returns: scope, categories[], topics[], confidence

2. LLM Prompt for Classification:
```
Analyze this document and classify it:

Filename: {filename}
Content: {content[:2000]}

Return JSON:
{
  "scope": "sales|support|product|billing|hr|legal|marketing|general",
  "categories": ["tag1", "tag2", "tag3"],
  "topics": ["topic1", "topic2"],
  "confidence": 0.85
}
```

3. Integration Points:
   - Document upload endpoint → auto-classify before storing
   - Batch classification API endpoint for existing docs
   - UI indicator showing auto-classified documents

---

### Phase 2.4: Update RAG/Vectorstore/Analytics Services ⏳
**Estimated Time:** 4-6 hours

**Tasks:**
1. Update `vectorstore_service.py`:
   - Add company_id filter to similarity_search()
   - Add scope filtering (if chatbot has allowed_scopes)
   - Ensure queries don't leak across companies

2. Update `rag_service.py`:
   - Pass chatbot_id to get allowed_scopes
   - Filter documents by scope before RAG
   - Include scope in context metadata

3. Update `analytics_service.py`:
   - Add company_id filter to all metrics queries
   - Add per-chatbot breakdown
   - Add scope-based analytics

---

### Phase 3: Build Authentication Endpoints ⏳
**Estimated Time:** 6-8 hours

**Tasks:**
1. Create company signup endpoint:
   - `POST /api/v1/auth/signup` - Register new company + owner user
   - Validate email uniqueness
   - Create company with default plan (free)
   - Create owner user with Owner role
   - Return JWT token

2. Separate login endpoints:
   - `POST /api/v1/auth/login/company` - Company dashboard login
   - `POST /api/v1/auth/login/super-admin` - Githaf platform login
   - Different JWT payloads for each

3. Password reset flow:
   - `POST /api/v1/auth/forgot-password`
   - `POST /api/v1/auth/reset-password`

---

### Phase 4: Build Super Admin Backend Routes ⏳
**Estimated Time:** 8-10 hours

**Tasks:**
1. Create `backend/app/api/routes/super_admin.py`:
   - List all companies (with metrics)
   - View company details
   - Suspend/activate companies
   - Update company plan limits
   - View company users and chatbots
   - Global analytics

2. Middleware:
   - `require_super_admin()` dependency
   - Bypasses RLS for super admin queries
   - Logs all super admin actions

---

### Phase 5: Build Company Dashboard Frontend ⏳
**Estimated Time:** 12-16 hours

**Pages to Build:**
1. **Chatbots Page** - List/create/edit/delete chatbots
2. **Knowledge Base Page** - Upload docs, set scopes, view classifications
3. **Analytics Page** - Per-chatbot metrics, top queries, satisfaction
4. **Team Page** - Invite users, assign roles, manage permissions
5. **Settings Page** - Company profile, branding, plan limits

---

### Phase 6: Build Super Admin Dashboard Frontend ⏳
**Estimated Time:** 10-12 hours

**Pages to Build:**
1. **Companies List** - All registered companies
2. **Company Details** - View users, chatbots, docs, conversations
3. **Global Analytics** - Platform-wide metrics
4. **System Logs** - Audit trail

---

### Phase 7: Testing ⏳
**Estimated Time:** 6-8 hours

**Test Cases:**
1. Multi-tenant isolation:
   - Company A cannot access Company B's chatbots
   - Company A cannot see Company B's documents
   - Company A cannot view Company B's conversations

2. RBAC:
   - Viewer role cannot create chatbots (403)
   - Editor role cannot manage billing (403)
   - Owner role can do everything (200)

3. RLS:
   - Direct database queries filtered by company_id
   - Super admin bypasses RLS
   - Session context properly set

4. Document scopes:
   - Sales bot only sees sales documents
   - Support bot sees support + general documents

5. Performance:
   - Load test with 100 companies
   - Ensure RLS doesn't slow down queries

---

## 🎉 Achievements So Far

### Database Layer ✅
- ✅ 11 migration files created and executed
- ✅ Zero data loss during migration
- ✅ RBAC system with 54 role-permission mappings
- ✅ RLS policies on 7 tables
- ✅ Automatic metric updates via triggers

### Backend Layer ✅
- ✅ 8 chatbot endpoints now multi-tenant aware
- ✅ JWT authentication includes company_id
- ✅ RLS middleware properly configured
- ✅ User dependency fetches full user object

### Security ✅
- ✅ Defense-in-depth: Application layer + RLS
- ✅ No hardcoded company IDs in routes
- ✅ Permission-based access control ready
- ✅ Session context isolation

---

## 📌 Important Notes

### Breaking Changes
- ⚠️ All chatbot API endpoints now require users to have a company_id
- ⚠️ Users without company_id will get 403 Forbidden
- ⚠️ RLS policies enforce company isolation at database level

### Migration Impact
- ✅ All existing data migrated successfully
- ✅ No frontend changes required yet (same endpoints)
- ✅ Backward compatible with current JWT tokens

### Testing Required
- ⏳ Test chatbot CRUD with new company_id extraction
- ⏳ Verify RLS policies work correctly
- ⏳ Test with multiple companies
- ⏳ Ensure super admin can bypass RLS

---

## 🔗 Key Files Modified

1. `backend/app/api/routes/chatbots.py` - Fixed 8 endpoints
2. `backend/scripts/migrations/*.sql` - 11 migration files
3. `backend/app/middleware/rls_middleware.py` - Already implemented
4. `backend/app/api/routes/auth.py` - Already includes company_id in JWT

---

## 📚 Documentation

- `NOTES_MULTITENANCY.md` - Full architecture design (87 pages)
- `backend/scripts/migrations/README.md` - Migration guide
- `backend/scripts/migrations/PSQL_SETUP_GUIDE.md` - psql setup instructions
- `MULTITENANCY_PROGRESS.md` - This file

---

**Next Session:** Start Phase 2.2 - Build RBAC Service with permission checking middleware

---

*Last Updated: January 27, 2025 - Phase 2.1 Complete*
