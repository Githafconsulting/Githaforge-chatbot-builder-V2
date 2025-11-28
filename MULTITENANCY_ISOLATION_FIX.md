# Multitenancy Isolation Security Fix - January 28, 2025

## Critical Security Issue

**Severity:** HIGH - Cross-tenant data leakage
**Impact:** Users can see data from other companies
**Status:** IN PROGRESS

---

## Problem Description

When a user from Company B logs in, they can see data (analytics, chatbots, documents, etc.) from Company A. This violates the fundamental principle of multi-tenant isolation.

### Root Causes Identified

1. **Analytics Endpoints Don't Filter by company_id**
   - File: `backend/app/api/routes/analytics.py`
   - Issue: Calls `get_analytics_overview()` WITHOUT company_id parameter
   - Result: Returns metrics from ALL companies

2. **Frontend Doesn't Decode JWT Token**
   - File: `frontend/src/contexts/AuthContext.tsx`
   - Issue: Stores JWT but doesn't extract `company_id` from payload
   - Result: Frontend can't filter requests by company

3. **Missing Authorization Checks**
   - Multiple endpoints have `# TODO: Verify user belongs to this company` comments
   - No actual implementation of company_id verification

4. **Service Layer Defaults to Global Queries**
   - Analytics service functions accept optional `company_id`
   - When omitted, they return data from all companies

---

## Security Test Case

### Test Scenario
```
1. Create Company A (Githaf Consulting)
2. Create User A1 (admin@githafconsulting.com) → company_id: A
3. Create Company B (Hempstead)
4. Create User B1 (admin@hempstead.com) → company_id: B

5. Login as User B1
6. Navigate to Analytics page
7. EXPECTED: See only Company B's data
8. ACTUAL: See Company A's data (SECURITY BREACH)
```

### Data Leakage Confirmed
```json
{
  "companies_table": [
    {"id": "35816f68...", "name": "Githaf Consulting"},
    {"id": "93b1abd7...", "name": "Hempstead"}
  ],
  "users_table": [
    {"email": "admin@hempstead.com", "company_id": "93b1abd7..."},
    {"email": "admin@githafconsulting.com", "company_id": "35816f68..."}
  ],
  "issue": "User from Hempstead sees Githaf Consulting's data"
}
```

---

## Files Requiring Fixes

### Backend (API Routes)

#### 1. `backend/app/api/routes/analytics.py` ❌ VULNERABLE
**Issues:**
- Line 29: `get_analytics_overview()` - no company_id
- Line 48: `get_flagged_queries()` - no company_id
- Line 68: `get_daily_stats()` - no company_id
- Line 88: `get_country_stats()` - no company_id

**Fix Required:**
```python
# Before
analytics = await get_analytics_overview()

# After
company_id = current_user.get("company_id")
analytics = await get_analytics_overview(company_id=company_id)
```

#### 2. `backend/app/api/routes/chatbots.py` ✅ FIXED (Phase 2.1)
**Status:** Already filters by company_id correctly

#### 3. `backend/app/api/routes/documents.py` ⚠️ NEEDS VERIFICATION
**Status:** Needs review

#### 4. `backend/app/api/routes/conversations.py` ⚠️ NEEDS VERIFICATION
**Status:** Needs review

#### 5. `backend/app/api/routes/companies.py` ⚠️ PARTIALLY SECURE
**Issues:**
- Line 87-109: `get_company(company_id)` - TODO comment, no verification
- Line 112-141: `update_company()` - TODO comment, no verification
- Line 172-201: `get_company_stats()` - TODO comment, no verification

**Secure Endpoints:**
- Line 20-47: `get_my_company()` ✅ Uses current_user.company_id

---

### Frontend

#### 1. `frontend/src/contexts/AuthContext.tsx` ✅ FIXED
**Status:** Now decodes JWT and stores `userInfo.companyId`

**Changes Made:**
- Added JWT decoding utility (`utils/jwt.ts`)
- AuthContext now exposes `userInfo` object
- Includes: `userId`, `companyId`, `role`, `isSuperAdmin`

#### 2. `frontend/src/services/api.ts` ⚠️ NEEDS UPDATE
**Issue:** API methods don't use `companyId` from context

**Examples:**
```typescript
// Current (wrong)
async getChatbots(): Promise<Chatbot[]> {
  const response = await this.api.get('/api/v1/chatbots/');
  return response.data;
}

// Should be
async getChatbots(companyId: string): Promise<Chatbot[]> {
  // Backend already filters by JWT token's company_id
  // No change needed IF backend properly validates
  const response = await this.api.get('/api/v1/chatbots/');
  return response.data;
}
```

**Note:** Since backend uses JWT token to extract company_id, frontend doesn't need to pass it explicitly. The fix is primarily backend-side.

---

## Implementation Plan

### Phase 1: Backend Security Hardening ✅ IN PROGRESS

#### 1.1 Fix Analytics Endpoints
- [ ] Update `analytics.py` to extract `company_id` from `current_user`
- [ ] Pass `company_id` to all analytics service calls
- [ ] Add validation: reject if `company_id` is None (except for super_admin)

#### 1.2 Fix Company Endpoints
- [ ] Implement company ownership verification in `get_company()`
- [ ] Implement company ownership verification in `update_company()`
- [ ] Implement company ownership verification in `get_company_stats()`

#### 1.3 Verify Other Endpoints
- [ ] Audit `documents.py` for company_id filtering
- [ ] Audit `conversations.py` for company_id filtering
- [ ] Audit `users.py` for company_id filtering

### Phase 2: Add Authorization Decorator

Create reusable decorator to verify company ownership:

```python
# backend/app/core/dependencies.py

async def verify_company_ownership(
    company_id: str,
    current_user: dict
) -> None:
    """Verify user belongs to the requested company"""
    user_company_id = current_user.get("company_id")
    is_super_admin = current_user.get("is_super_admin", False)

    if is_super_admin:
        return  # Super admin can access all companies

    if user_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't have permission to access this company's data"
        )
```

### Phase 3: Frontend Improvements

#### 3.1 Display Current Company Info
- [ ] Show company name in AdminLayout header
- [ ] Add company switcher (future: for users in multiple companies)

#### 3.2 Update Signup Form
- [ ] Create multi-step signup form
- [ ] Add `is_personal` field to distinguish individual vs company
- [ ] Step 1: Account type (Individual / Company)
- [ ] Step 2: Basic details (name, email, password)
- [ ] Step 3: Company branding (optional)

### Phase 4: Database Schema Updates

#### 4.1 Add `is_personal` Field to Companies Table

```sql
ALTER TABLE companies
ADD COLUMN is_personal BOOLEAN DEFAULT false;

COMMENT ON COLUMN companies.is_personal IS
  'True for individual accounts, False for business/organization accounts';
```

**Usage:**
- `is_personal=true`: Solo developer, freelancer (simpler UI, no team features)
- `is_personal=false`: Business, agency (full team management, RBAC)

### Phase 5: Testing & Verification

#### 5.1 Isolation Tests
- [ ] Login as User A, verify only Company A data visible
- [ ] Login as User B, verify only Company B data visible
- [ ] Attempt cross-company API calls, verify 403 errors

#### 5.2 Analytics Tests
- [ ] Company A has 10 conversations
- [ ] Company B has 5 conversations
- [ ] Login as A: dashboard shows 10
- [ ] Login as B: dashboard shows 5

#### 5.3 Chatbot Tests
- [ ] Company A has 2 chatbots
- [ ] Company B has 1 chatbot
- [ ] Login as A: sees 2 chatbots
- [ ] Login as B: sees 1 chatbot

---

## Affected Endpoints

### High Priority (Data Leakage Confirmed)
1. `GET /api/v1/analytics/` ❌ CRITICAL
2. `GET /api/v1/analytics/flagged` ❌ CRITICAL
3. `GET /api/v1/analytics/daily` ❌ CRITICAL
4. `GET /api/v1/analytics/countries` ❌ CRITICAL

### Medium Priority (TODO Comments)
5. `GET /api/v1/companies/{company_id}` ⚠️ WARNING
6. `PUT /api/v1/companies/{company_id}` ⚠️ WARNING
7. `GET /api/v1/companies/{company_id}/stats` ⚠️ WARNING

### Low Priority (Likely Secure)
8. `GET /api/v1/chatbots/` ✅ SECURE (Phase 2.1 fix)
9. `GET /api/v1/companies/me` ✅ SECURE (uses JWT)

---

## Code Changes

### File 1: `backend/app/api/routes/analytics.py`

```python
# BEFORE (Line 22-30)
@router.get("/", response_model=AnalyticsOverview)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    try:
        analytics = await get_analytics_overview()
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AFTER (with company_id filtering)
@router.get("/", response_model=AnalyticsOverview)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    try:
        company_id = current_user.get("company_id")
        is_super_admin = current_user.get("is_super_admin", False)

        # Super admin sees global stats, company users see their company only
        analytics = await get_analytics_overview(
            company_id=company_id if not is_super_admin else None
        )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### File 2: `frontend/src/components/layout/AdminLayout.tsx`

Add company name display:

```typescript
const { userInfo } = useAuth();

// In header section
<div className="flex items-center gap-2">
  <Building2 className="w-5 h-5" />
  <span className="text-sm font-medium">
    {userInfo?.companyId ? 'Company Dashboard' : 'Loading...'}
  </span>
</div>
```

---

## Security Validation Checklist

- [ ] No endpoint returns data from other companies
- [ ] All analytics filtered by company_id
- [ ] All chatbot operations isolated
- [ ] All document operations isolated
- [ ] All conversation data isolated
- [ ] Super admin can bypass filters (for platform management)
- [ ] Regular users cannot access other companies' data
- [ ] Frontend displays correct company info
- [ ] JWT token properly decoded and used
- [ ] Authorization checks on all sensitive endpoints

---

## Timeline

**Estimated Fix Time:** 4-6 hours

- Phase 1 (Backend): 2-3 hours
- Phase 2 (Auth Decorator): 1 hour
- Phase 3 (Frontend): 1-2 hours
- Phase 4 (Database): 30 minutes
- Phase 5 (Testing): 1 hour

---

## Related Documentation

- `MULTITENANCY_PROGRESS.md` - Overall multitenancy implementation
- `NOTES_MULTITENANCY.md` - Architecture design
- `SERVICE_ROLE_FIX_JAN28.md` - Service role key fix
- `BACKEND_IMPLEMENTATION_SUMMARY.md` - Backend summary

---

*Last Updated: January 28, 2025*
*Priority: CRITICAL - Security Vulnerability*
*Status: Fix in Progress*
