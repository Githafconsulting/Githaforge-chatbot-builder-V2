# Database Migrations - Multi-Tenancy Implementation

**Date:** January 27, 2025
**Purpose:** Transform single-tenant system to multi-tenant with RBAC and AI document classification

---

## 📋 Overview

These migrations implement a complete multi-tenant architecture with:
- ✅ Company/organization management
- ✅ Multi-chatbot support per company
- ✅ Row-Level Security (RLS) policies
- ✅ Role-Based Access Control (RBAC)
- ✅ AI document classification fields
- ✅ Comprehensive analytics functions

---

## 🗂️ Migration Files

| File | Description | Status |
|------|-------------|--------|
| `001_create_companies_table.sql` | Companies/organizations table | ✅ Ready |
| `002_create_chatbots_table.sql` | Chatbots table with company_id | ✅ Ready |
| `003_update_users_table.sql` | Add company_id to users (Part 1) | ✅ Ready |
| `004_update_documents_table.sql` | Add multi-tenancy and classification fields | ✅ Ready |
| `005_update_conversations_table.sql` | Add chatbot_id to conversations | ✅ Ready |
| `006_create_rbac_tables.sql` | Permissions, roles, role_permissions | ✅ Ready |
| `006b_update_users_add_role_id.sql` | Add role_id to users (Part 2) | ✅ Ready |
| `007_create_rls_functions.sql` | RLS context + stats functions | ✅ Ready |
| `008_create_rls_policies.sql` | Enable RLS and create policies | ✅ Ready |
| `009_seed_permissions.sql` | Insert 17 permissions | ✅ Ready |
| `010_seed_default_roles.sql` | Create 6 predefined roles | ✅ Ready |

---

## 🚀 How to Run

### **Option 1: Run All Migrations (Recommended)**

1. **Connect to Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Click on "SQL Editor"

2. **Copy and paste each migration file in order (001 → 010)**
   - Or upload files via Supabase SQL Editor
   - Execute each migration one by one

3. **Verify success**
   - Check output for errors
   - Run verification queries (provided in `RUN_ALL_MIGRATIONS.sql`)

### **Option 2: Run via psql (Local/CLI)**

```bash
# Navigate to migrations directory
cd backend/scripts/migrations

# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run all migrations in order
\i 001_create_companies_table.sql
\i 002_create_chatbots_table.sql
\i 003_update_users_table.sql
\i 004_update_documents_table.sql
\i 005_update_conversations_table.sql
\i 006_create_rbac_tables.sql
\i 006b_update_users_add_role_id.sql  -- Important: Must run after 006
\i 007_create_rls_functions.sql
\i 008_create_rls_policies.sql
\i 009_seed_permissions.sql
\i 010_seed_default_roles.sql
```

### **Option 3: Run Master Script**

```bash
psql "postgresql://..." -f RUN_ALL_MIGRATIONS.sql
```

---

## ✅ Verification Steps

After running migrations, verify everything is set up correctly:

### **1. Check Tables Exist**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'companies', 'chatbots', 'permissions', 'roles', 'role_permissions'
  );
```

**Expected:** 5 rows

### **2. Check RLS Enabled**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('companies', 'chatbots', 'documents', 'conversations', 'messages');
```

**Expected:** All should have `rowsecurity = true`

### **3. Check Permissions**

```sql
SELECT COUNT(*) FROM permissions;
```

**Expected:** 17

### **4. Check Roles**

```sql
SELECT code, name, COUNT(rp.permission_id) as perms
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE company_id IS NULL
GROUP BY r.id, code, name
ORDER BY perms DESC;
```

**Expected:**
```
owner         | 17 perms
admin         | 15 perms
editor        | 8 perms
trainer       | 5 perms
analyst       | 5 perms
viewer        | 4 perms
```

### **5. Check Functions**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_company_context',
    'get_company_stats',
    'get_chatbot_stats',
    'check_user_permission'
  );
```

**Expected:** 4 functions

### **6. Test RLS Context**

```sql
-- Set context (use any UUID)
SELECT set_company_context('00000000-0000-0000-0000-000000000001'::UUID, FALSE);

-- Try querying chatbots (should be empty if no data yet)
SELECT * FROM chatbots;
```

---

## 🔄 Data Migration (Existing Data)

**IMPORTANT:** If you have existing data, you must run the data migration script:

```bash
cd backend/scripts
python migrate_existing_data.py
```

This script will:
1. Create a default company
2. Create a default chatbot
3. Assign all existing users to default company
4. Assign all existing documents to default company/chatbot
5. Assign all existing conversations to default chatbot

See: `backend/scripts/migrate_existing_data.py`

---

## 📊 New Database Schema

### **Core Tables**

```
companies (new)
├── chatbots (new)
│   ├── conversations (updated: +chatbot_id)
│   │   └── messages (no changes)
│   │       └── feedback (no changes)
│   └── documents (updated: +company_id, +chatbot_id, +scope, +categories)
│       └── embeddings (no changes)
└── users (updated: +company_id, +role_id)
```

### **RBAC Tables**

```
permissions (new) → 17 predefined permissions
role_permissions (new) → Many-to-many mapping
roles (new) → 6 predefined roles + custom roles
```

---

## 🔒 RLS Policies Summary

| Table | Policy | Description |
|-------|--------|-------------|
| `companies` | `company_isolation` | Users see only their company |
| `chatbots` | `chatbot_isolation` | Users see only their company's chatbots |
| `documents` | `document_isolation` | Users see only their company's documents |
| `conversations` | `conversation_isolation` | Users see only their chatbot's conversations |
| `messages` | `message_isolation` | Users see only their chatbot's messages |
| `feedback` | `feedback_isolation` | Users see only their chatbot's feedback |

**Super Admin Bypass:** All policies allow `app.is_super_admin = TRUE` to see all data.

**Public Access:** Chat widget can create conversations/messages (public INSERT policies).

---

## 🎭 Predefined Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | All (17) | Company owner - full access including billing |
| **Admin** | 15 (no billing/roles) | Administrator - manage everything except billing |
| **Editor** | 8 | Content creator - create/edit bots & docs |
| **Trainer** | 5 | Bot trainer - upload docs, configure bots |
| **Analyst** | 5 | Data analyst - view analytics, export reports |
| **Viewer** | 4 | Read-only - view everything, change nothing |

---

## 🧪 Testing Migrations

### **Test 1: Company Isolation**

```sql
-- Create test companies
INSERT INTO companies (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Company A'),
  ('22222222-2222-2222-2222-222222222222', 'Company B');

-- Set context to Company A
SELECT set_company_context('11111111-1111-1111-1111-111111111111'::UUID, FALSE);

-- Try to see Company B (should be blocked)
SELECT * FROM companies WHERE id = '22222222-2222-2222-2222-222222222222';
```

**Expected:** Empty result (RLS blocks access)

### **Test 2: Super Admin Bypass**

```sql
-- Set super admin context
SELECT set_company_context('11111111-1111-1111-1111-111111111111'::UUID, TRUE);

-- Should see all companies
SELECT * FROM companies;
```

**Expected:** All companies visible

### **Test 3: RBAC Permission Check**

```sql
-- Create test user with editor role
INSERT INTO users (email, password_hash, company_id, role_id) VALUES (
  'editor@test.com',
  'hash',
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM roles WHERE code = 'editor' AND company_id IS NULL)
);

-- Check if user has permission
SELECT check_user_permission(
  (SELECT id FROM users WHERE email = 'editor@test.com'),
  'create_chatbots'
);
```

**Expected:** `TRUE`

```sql
SELECT check_user_permission(
  (SELECT id FROM users WHERE email = 'editor@test.com'),
  'manage_billing'
);
```

**Expected:** `FALSE`

---

## ⚠️ Troubleshooting

### **Issue: Migration fails with "relation already exists"**

**Solution:** Migrations are idempotent. Drop existing tables first or use `IF NOT EXISTS` (already included).

### **Issue: RLS blocks everything**

**Solution:** Ensure `set_company_context()` is called before queries. Check middleware is working.

### **Issue: Foreign key constraint error**

**Solution:** Run migrations in order (001 → 010). Companies must exist before chatbots.

### **Issue: Permission denied on function**

**Solution:** Functions use `SECURITY DEFINER` and should work. Check Supabase permissions.

---

## 🔄 Rollback (If Needed)

To rollback migrations (use with caution):

```sql
-- Drop RLS policies
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Drop tables
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS set_company_context;
DROP FUNCTION IF EXISTS get_company_stats;
-- ... (repeat for all functions)

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS company_id;
ALTER TABLE users DROP COLUMN IF EXISTS role_id;

-- Remove columns from documents
ALTER TABLE documents DROP COLUMN IF EXISTS company_id;
ALTER TABLE documents DROP COLUMN IF EXISTS chatbot_id;
ALTER TABLE documents DROP COLUMN IF EXISTS scope;
ALTER TABLE documents DROP COLUMN IF EXISTS categories;
ALTER TABLE documents DROP COLUMN IF EXISTS topics;

-- Remove chatbot_id from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS chatbot_id;

-- Drop new tables
DROP TABLE IF EXISTS chatbots CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
```

---

## 📚 Additional Resources

- **Full Documentation:** See `NOTES_MULTITENANCY.md` in project root
- **Backend Models:** See `backend/app/models/` for Pydantic schemas
- **API Routes:** See `backend/app/api/routes/` for endpoints
- **Services:** See `backend/app/services/` for business logic

---

## ✅ Success Checklist

After running migrations, you should be able to:

- [ ] See all new tables in Supabase dashboard
- [ ] Run `SELECT * FROM companies;` without error
- [ ] Run `SELECT * FROM roles;` and see 6 roles
- [ ] Run `SELECT * FROM permissions;` and see 17 permissions
- [ ] Run `SELECT set_company_context('...', FALSE);` without error
- [ ] See RLS enabled on tables (check Supabase table settings)
- [ ] Run verification queries successfully

---

## 🆘 Need Help?

If migrations fail:
1. Check Supabase SQL Editor logs for specific errors
2. Verify PostgreSQL version (should be 14+)
3. Ensure pgvector extension is enabled (required for embeddings)
4. Check for conflicting table/column names
5. Review the error message and corresponding migration file

---

**Migration Status:** ✅ Ready for Production
**Last Updated:** January 27, 2025
**Version:** 1.0.0