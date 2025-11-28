# psql CLI Setup & Migration Execution Guide

**Date:** January 27, 2025
**Purpose:** Run Supabase migrations using PostgreSQL command-line client

---

## 📋 Prerequisites

- Windows 10/11 with PowerShell
- Supabase project with database access
- Database password (from Supabase dashboard)

---

## 🔧 Step 1: Install PostgreSQL Client (psql)

Choose **ONE** of these methods:

### **Option A: Scoop (Recommended - Lightweight)**

```powershell
# 1. Install Scoop package manager (if not already installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. Install PostgreSQL client
scoop install postgresql

# 3. Verify installation
psql --version
```

### **Option B: Chocolatey**

```powershell
# 1. Install PostgreSQL client only (no server)
choco install postgresql --params '/Password:dummy /NoServer'

# 2. Verify installation
psql --version
```

### **Option C: Official Installer**

1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. Choose **"Command Line Tools"** only (uncheck PostgreSQL Server)
4. Ensure "Add to PATH" is checked
5. Complete installation
6. Restart PowerShell
7. Verify: `psql --version`

**Expected Output:**
```
psql (PostgreSQL) 16.x
```

---

## 🔑 Step 2: Get Supabase Connection String

1. Open your Supabase project dashboard
2. Navigate to: **Settings** → **Database**
3. Scroll to **Connection String** section
4. Select **URI** tab
5. Copy the connection string:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

6. **Important:** Replace `[YOUR-PASSWORD]` with your actual database password (shown in green box)

**Example:**
```
postgresql://postgres:MySecurePass123@db.abcdefghijk.supabase.co:5432/postgres
```

---

## ✅ Step 3: Test Connection

```powershell
# Test connection (replace with your actual connection string)
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" -c "SELECT version();"

psql "postgresql://postgres.beuyzvlluccdtlwpebax:BFph7PXTjJxlFeTo@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"

```

**Expected Output:**
```
                                                 version
---------------------------------------------------------------------------------------------------------
 PostgreSQL 15.x on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 9.3.0-17ubuntu1~20.04) 9.3.0, 64-bit
(1 row)
```

**If connection fails:**
- ❌ **"connection refused"** → Check project is not paused (Supabase dashboard)
- ❌ **"password authentication failed"** → Double-check password
- ❌ **"could not translate host name"** → Check project reference in URL

---

## 🚀 Step 4: Run Migrations

You have **3 options** to run migrations:

---

### **Option 1: PowerShell Script (Easiest)**

**Recommended for beginners - automated with error handling**

#### **Setup:**

1. Edit `run_migrations.ps1`
2. Replace this line:
   ```powershell
   $SUPABASE_URI = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
   ```
   With your actual connection string

3. Save the file

#### **Execute:**

```powershell
cd c:\Users\Stevey\Desktop\Projects\8. Githaforge-chatbot-builder-V2\backend\scripts\migrations

.\run_migrations.ps1
```

**What it does:**
- ✅ Validates psql is installed
- ✅ Tests connection before running migrations
- ✅ Runs all 11 migrations in correct order
- ✅ Shows colored progress messages
- ✅ Displays verification results
- ✅ Provides troubleshooting hints on failure

**Sample Output:**
```
========================================
Multi-Tenancy Database Migrations
========================================

Testing connection...
✅ Connection successful!

Running migrations...

========================================
Starting Multi-Tenancy Database Migrations
========================================
Running Migration 001: Create companies table...
Running Migration 002: Create chatbots table...
...
========================================
✅ Migrations completed successfully!
========================================

Next steps:
  1. Verify tables in Supabase dashboard
  2. Run data migration script (if you have existing data)
  3. Test RLS policies
```

---

### **Option 2: Single Command (Fast)**

**Best for: One-time execution, CI/CD pipelines**

```powershell
cd c:\Users\Stevey\Desktop\Projects\8. Githaforge-chatbot-builder-V2\backend\scripts\migrations

psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" -f RUN_ALL_MIGRATIONS.sql
```

**Pros:**
- ✅ Single command
- ✅ Fast execution
- ✅ Automatic disconnect

**Cons:**
- ❌ Less feedback if errors occur
- ❌ Can't inspect between migrations

---

### **Option 3: Interactive Session (Debugging)**

**Best for: Debugging errors, inspecting tables between migrations**

```powershell
cd c:\Users\Stevey\Desktop\Projects\8. Githaforge-chatbot-builder-V2\backend\scripts\migrations

# 1. Connect to Supabase
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# You'll see prompt: postgres=>

# 2. Run all migrations at once:
\i RUN_ALL_MIGRATIONS.sql

# OR run migrations one by one:
\i 001_create_companies_table.sql
\i 002_create_chatbots_table.sql
\i 003_update_users_table.sql
\i 004_update_documents_table.sql
\i 005_update_conversations_table.sql
\i 006_create_rbac_tables.sql
\i 006b_update_users_add_role_id.sql
\i 007_create_rls_functions.sql
\i 008_create_rls_policies.sql
\i 009_seed_permissions.sql
\i 010_seed_default_roles.sql

# 3. Verify tables created
\dt

# 4. Check specific table
\d companies

# 5. Count records
SELECT COUNT(*) FROM roles;

# 6. Exit when done
\q
```

**Pros:**
- ✅ Full control over execution
- ✅ Can inspect tables between migrations
- ✅ Can run custom queries for debugging
- ✅ See detailed error messages

**Cons:**
- ❌ More manual work
- ❌ Must stay connected

---

## 🔍 Step 5: Verify Migrations

### **Quick Verification (All Methods)**

After migrations complete, verify in Supabase dashboard:

1. **Go to:** Table Editor
2. **Check tables exist:**
   - ✅ `companies`
   - ✅ `chatbots`
   - ✅ `permissions` (should have 17 rows)
   - ✅ `roles` (should have 6 rows)
   - ✅ `role_permissions`

3. **Check RLS enabled:**
   - Go to each table → Settings → Enable RLS (should be ON)

### **Detailed Verification Queries**

Run these in psql interactive session or Supabase SQL Editor:

```sql
-- 1. Check all tables exist (expect 5 new tables)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'chatbots', 'permissions', 'roles', 'role_permissions');
-- Expected: 5 rows

-- 2. Check RLS enabled (expect all TRUE)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('companies', 'chatbots', 'documents', 'conversations', 'messages');
-- Expected: All rowsecurity = true

-- 3. Check permissions count (expect 17)
SELECT COUNT(*) FROM permissions;

-- 4. Check roles count (expect 6)
SELECT COUNT(*) FROM roles WHERE company_id IS NULL;

-- 5. Check role permissions (expect owner has 17)
SELECT
  r.code,
  r.name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.company_id IS NULL
GROUP BY r.id, r.code, r.name
ORDER BY permission_count DESC;
-- Expected:
--   owner  | 17
--   admin  | 15
--   editor | 8
--   trainer| 5
--   analyst| 5
--   viewer | 4

-- 6. Test RLS context function
SELECT set_company_context('00000000-0000-0000-0000-000000000001'::UUID, FALSE);
-- Expected: (no error)
```

---

## ⚠️ Troubleshooting

### **Error: "psql: command not found"**

**Cause:** PostgreSQL client not installed or not in PATH

**Fix:**
1. Reinstall using one of the methods in Step 1
2. Ensure "Add to PATH" was checked
3. Restart PowerShell/Terminal
4. Verify: `psql --version`

---

### **Error: "connection refused"**

**Cause:** Database is paused or project doesn't exist

**Fix:**
1. Go to Supabase dashboard
2. Check project status (should be "Active", not "Paused")
3. If paused, click "Restore" and wait 1-2 minutes
4. Retry connection

---

### **Error: "password authentication failed"**

**Cause:** Incorrect password in connection string

**Fix:**
1. Go to Supabase → Settings → Database
2. Scroll to "Database Password" section
3. Reset password if needed
4. Update connection string with new password
5. Ensure no extra spaces/quotes in password

---

### **Error: "relation 'roles' does not exist"**

**Cause:** Migrations ran out of order

**Fix:**
1. Ensure migrations run in order: 001 → 010
2. **Important:** Migration 006b must run AFTER migration 006
3. Check `RUN_ALL_MIGRATIONS.sql` includes all files
4. If error persists, drop all tables and re-run from scratch:
   ```sql
   DROP TABLE IF EXISTS role_permissions CASCADE;
   DROP TABLE IF EXISTS roles CASCADE;
   DROP TABLE IF EXISTS permissions CASCADE;
   DROP TABLE IF EXISTS chatbots CASCADE;
   DROP TABLE IF EXISTS companies CASCADE;
   -- Then re-run migrations
   ```

---

### **Error: Migration runs but tables don't appear**

**Cause:** Connected to wrong database or schema

**Fix:**
1. Verify connection string ends with `/postgres` (not `/template1`)
2. Check you're viewing `public` schema in Supabase dashboard
3. Run in psql: `SELECT current_database();` (should be "postgres")
4. Run in psql: `\dt` to list tables in current schema

---

## 🎯 Next Steps After Successful Migration

1. ✅ **Verify all tables exist** (see Step 5)
2. ✅ **Check RLS policies enabled** (see Step 5)
3. ✅ **Test RLS context function** (see Step 5)
4. 📝 **Run data migration script** (if you have existing data):
   ```bash
   cd backend/scripts
   python migrate_existing_data.py
   ```
5. 🧪 **Test multitenancy isolation** (Phase 7 in implementation plan)
6. 🚀 **Begin Phase 2: Backend code updates**

---

## 📚 Additional Resources

- **PostgreSQL psql Docs:** https://www.postgresql.org/docs/current/app-psql.html
- **Supabase Database Docs:** https://supabase.com/docs/guides/database
- **pgvector Extension:** https://github.com/pgvector/pgvector
- **Migration README:** `backend/scripts/migrations/README.md`
- **Implementation Plan:** `NOTES_MULTITENANCY.md`

---

## 🆘 Need Help?

If migrations fail:
1. ✅ Check error message carefully
2. ✅ Review troubleshooting section above
3. ✅ Verify connection string is correct
4. ✅ Ensure PostgreSQL version is 14+ (run `SELECT version();`)
5. ✅ Check Supabase project is not paused
6. ✅ Review migration file causing error
7. ✅ Check for conflicting table/column names

---

**Migration Status:** ✅ Ready for Execution
**Last Updated:** January 27, 2025
**Version:** 1.0.0