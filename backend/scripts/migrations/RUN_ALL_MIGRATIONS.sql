-- ============================================================================
-- MASTER MIGRATION SCRIPT
-- Purpose: Run all migrations in correct order
-- Date: 2025-01-27
-- ============================================================================

-- Instructions:
-- 1. Connect to your Supabase database (SQL Editor or psql)
-- 2. Run this script
-- 3. Verify all migrations completed successfully
-- 4. Check migration summary at the end

-- ============================================================================
-- MIGRATION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- ============================================================================
-- EXECUTE MIGRATIONS
-- ============================================================================

\echo '========================================';
\echo 'Starting Multi-Tenancy Database Migrations';
\echo '========================================';

-- Migration 001
\echo 'Running Migration 001: Create companies table...';
\i 001_create_companies_table.sql
INSERT INTO migration_history (migration_name) VALUES ('001_create_companies_table') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 002
\echo 'Running Migration 002: Create chatbots table...';
\i 002_create_chatbots_table.sql
INSERT INTO migration_history (migration_name) VALUES ('002_create_chatbots_table') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 003
\echo 'Running Migration 003: Update users table...';
\i 003_update_users_table.sql
INSERT INTO migration_history (migration_name) VALUES ('003_update_users_table') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 004
\echo 'Running Migration 004: Update documents table...';
\i 004_update_documents_table.sql
INSERT INTO migration_history (migration_name) VALUES ('004_update_documents_table') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 005
\echo 'Running Migration 005: Update conversations table...';
\i 005_update_conversations_table.sql
INSERT INTO migration_history (migration_name) VALUES ('005_update_conversations_table') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 006
\echo 'Running Migration 006: Create RBAC tables...';
\i 006_create_rbac_tables.sql
INSERT INTO migration_history (migration_name) VALUES ('006_create_rbac_tables') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 006b (must run after 006)
\echo 'Running Migration 006b: Update users table with role_id...';
\i 006b_update_users_add_role_id.sql
INSERT INTO migration_history (migration_name) VALUES ('006b_update_users_add_role_id') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 007
\echo 'Running Migration 007: Create RLS functions...';
\i 007_create_rls_functions.sql
INSERT INTO migration_history (migration_name) VALUES ('007_create_rls_functions') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 008
\echo 'Running Migration 008: Create RLS policies...';
\i 008_create_rls_policies.sql
INSERT INTO migration_history (migration_name) VALUES ('008_create_rls_policies') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 009
\echo 'Running Migration 009: Seed permissions...';
\i 009_seed_permissions.sql
INSERT INTO migration_history (migration_name) VALUES ('009_seed_permissions') ON CONFLICT (migration_name) DO NOTHING;

-- Migration 010
\echo 'Running Migration 010: Seed default roles...';
\i 010_seed_default_roles.sql
INSERT INTO migration_history (migration_name) VALUES ('010_seed_default_roles') ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo '========================================';
\echo 'Migration Summary';
\echo '========================================';

-- Show migration history
SELECT
  migration_name,
  executed_at,
  success,
  error_message
FROM migration_history
ORDER BY id;

-- Show table counts
SELECT
  'companies' as table_name, COUNT(*) as row_count FROM companies
UNION ALL
SELECT 'chatbots', COUNT(*) FROM chatbots
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;

-- Show RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('companies', 'chatbots', 'documents', 'conversations', 'messages', 'feedback')
ORDER BY tablename;

\echo '========================================';
\echo 'Migrations Completed!';
\echo 'Next Step: Run data migration script to assign existing data to default company';
\echo '========================================';