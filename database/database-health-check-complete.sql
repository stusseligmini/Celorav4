-- ============================================================================
-- COMPLETE DATABASE HEALTH CHECK & MAINTENANCE SCRIPT
-- Run each section and share results for analysis
-- ============================================================================

-- ============================================================================
-- 1) RLS STATUS CHECK — All tables should have RLS enabled
-- ============================================================================
SELECT 
    '1️⃣ RLS STATUS' AS check_section,
    schemaname, 
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY rls_status, tablename;

-- Expected: All sensitive tables should show ENABLED
-- Action if DISABLED: Enable RLS and create appropriate policies

-- ============================================================================
-- 2) POLICY COVERAGE — Check which operations are covered
-- ============================================================================
SELECT 
    '2️⃣ POLICY COVERAGE' AS check_section,
    t.tablename,
    COUNT(DISTINCT p.cmd) AS operations_covered,
    array_agg(DISTINCT p.cmd ORDER BY p.cmd) AS covered_ops
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = true 
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename
ORDER BY operations_covered ASC, tablename;

-- Expected: Critical tables should have 4 operations (SELECT/INSERT/UPDATE/DELETE)
-- Action if low coverage: Add missing policies or document why intentionally limited

-- ============================================================================
-- 3) MISSING INDEXES ON FOREIGN KEYS — Performance critical
-- ============================================================================
SELECT 
    '3️⃣ FK INDEX STATUS' AS check_section,
    c.conrelid::regclass AS table_name,
    a.attname AS column_name,
    c.confrelid::regclass AS referenced_table,
    CASE WHEN i.indexrelid IS NULL THEN '❌ MISSING INDEX' ELSE '✅ INDEXED' END AS idx_status
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_index i ON i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
WHERE c.contype = 'f' 
  AND c.connamespace = 'public'::regnamespace
ORDER BY idx_status, table_name;

-- Expected: All foreign keys should be indexed
-- Action if MISSING: Create index on that column for better JOIN/DELETE/UPDATE performance

-- ============================================================================
-- 4) TABLE STATISTICS — Size analysis
-- ============================================================================
SELECT 
    '4️⃣ TABLE SIZE' AS check_section,
    schemaname, 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Expected: Index size should be reasonable compared to table size
-- Action if huge index_size: Consider REINDEX or dropping unused indexes

-- ============================================================================
-- 5) CHECK CONSTRAINTS — Data integrity rules
-- ============================================================================
SELECT 
    '5️⃣ CHECK CONSTRAINTS' AS check_section,
    conrelid::regclass AS table_name, 
    conname AS constraint_name, 
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'c' 
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;

-- Expected: Tables should have appropriate CHECK constraints (e.g., amount > 0, status enum)
-- Action if missing: Add CHECK constraints for data validation

-- ============================================================================
-- 6) FOREIGN KEY RELATIONSHIPS — Validate FK definitions
-- ============================================================================
SELECT 
    '6️⃣ FOREIGN KEYS' AS check_section,
    conrelid::regclass AS table_name, 
    conname AS constraint_name, 
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'f' 
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;

-- Expected: FKs point to correct columns with proper ON DELETE/UPDATE behavior
-- Action if incorrect: Review and adjust CASCADE/SET NULL/RESTRICT behavior

-- ============================================================================
-- 7) FUNCTIONS AND SECURITY — SECURITY DEFINER check
-- ============================================================================
SELECT 
    '7️⃣ FUNCTIONS' AS check_section,
    n.nspname AS schema, 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE WHEN p.prosecdef THEN '🔒 SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- Expected: Functions modifying sensitive data should be SECURITY DEFINER with strict access control
-- Action: Review and document security model for each function

-- ============================================================================
-- 8) TRIGGERS — Active triggers check
-- ============================================================================
SELECT 
    '8️⃣ TRIGGERS' AS check_section,
    event_object_table AS table_name, 
    trigger_name, 
    event_manipulation AS event, 
    action_timing AS timing,
    action_statement AS action
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: All triggers should be documented and necessary
-- Action: Review unexpected triggers or those lacking security checks

-- ============================================================================
-- 9) ADMIN USER VERIFICATION — Your admin status
-- ============================================================================
SELECT 
    '9️⃣ ADMIN STATUS' AS check_section,
    up.id, 
    up.email, 
    up.role AS profile_role,
    (SELECT array_agg(role) FROM public.user_roles WHERE user_id = up.id) AS user_roles_array,
    public.is_admin(up.id) AS is_admin_function_result
FROM public.user_profiles up
WHERE up.id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- Expected: is_admin_function_result should be TRUE and roles should include 'admin'
-- Action: Verify consistency between user_profiles.role and user_roles table

-- ============================================================================
-- 10) SECURITY SUMMARY — Overall statistics
-- ============================================================================
SELECT 
    '🔟 SECURITY SUMMARY' AS check_section,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) AS tables_with_rls,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false AND tablename NOT LIKE 'pg_%') AS tables_without_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') AS tables_with_policies,
    (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%admin%') AS admin_functions;

-- Expected: 
-- - tables_without_rls should be 0 (or very few non-sensitive tables)
-- - total_policies should match your security requirements
-- - tables_with_policies should cover all sensitive tables

-- ============================================================================
-- BONUS: LIST ALL INDEXES
-- ============================================================================
SELECT 
    '📊 ALL INDEXES' AS check_section,
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;


-- ============================================================================
-- MAINTENANCE SECTION (Run separately during maintenance window)
-- ============================================================================

-- ============================================================================
-- STEP A: CREATE AUDIT_LOGS TABLE (if not exists)
-- ============================================================================
/*
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- System can insert audit logs
CREATE POLICY "audit_logs_system_insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.audit_logs IS 'Audit trail for tracking all sensitive operations';
*/

-- ============================================================================
-- STEP B: REINDEX (Run in maintenance window, one pulje at a time)
-- ============================================================================
-- IMPORTANT: Run these DURING A MAINTENANCE WINDOW to avoid performance impact
-- Use CONCURRENTLY to minimize locks (PostgreSQL >= 12)

-- PULJE 1: Transaction indexes
/*
REINDEX INDEX CONCURRENTLY idx_transactions_user_created_at;
REINDEX INDEX CONCURRENTLY idx_transactions_user_status_created_at;
REINDEX INDEX CONCURRENTLY idx_transactions_user_id;
*/

-- PULJE 2: Transaction FK indexes
/*
REINDEX INDEX CONCURRENTLY idx_transactions_wallet_id;
REINDEX INDEX CONCURRENTLY idx_transactions_card_id;
*/

-- PULJE 3: User-related indexes
/*
REINDEX INDEX CONCURRENTLY idx_user_profiles_id;
REINDEX INDEX CONCURRENTLY idx_user_profiles_role;
REINDEX INDEX CONCURRENTLY idx_user_roles_user_role;
*/

-- PULJE 4: Card and wallet indexes
/*
REINDEX INDEX CONCURRENTLY idx_virtual_cards_user;
REINDEX INDEX CONCURRENTLY idx_virtual_cards_status;
REINDEX INDEX CONCURRENTLY idx_wallets_user;
*/

-- PULJE 5: Other indexes
/*
REINDEX INDEX CONCURRENTLY idx_transactions_status;
REINDEX INDEX CONCURRENTLY idx_transactions_created;
*/

-- ============================================================================
-- STEP C: VACUUM ANALYZE (After REINDEX)
-- ============================================================================
/*
VACUUM ANALYZE public.transactions;
VACUUM ANALYZE public.user_profiles;
VACUUM ANALYZE public.virtual_cards;
VACUUM ANALYZE public.wallets;
VACUUM ANALYZE public.user_roles;
*/

-- ============================================================================
-- END OF HEALTH CHECK SCRIPT
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Run sections 1-10 NOW and share results for analysis
-- 2. Uncomment and run STEP A to create audit_logs table
-- 3. Uncomment and run STEP B during maintenance window (one pulje at a time)
-- 4. Run STEP C after all reindexing is complete
