-- ============================================================================
-- QUICK DATABASE HEALTH CHECK - 10 Essential Queries
-- Copy results and share for analysis
-- ============================================================================

-- ============================================================================
-- 1) RLS STATUS
-- ============================================================================
SELECT '1️⃣ RLS STATUS' AS check, schemaname, tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
ORDER BY rls_status, tablename;

-- ============================================================================
-- 2) POLICY COVERAGE
-- ============================================================================
SELECT '2️⃣ POLICY COVERAGE' AS check,
       t.tablename,
       COUNT(DISTINCT p.cmd) AS operations_covered,
       array_agg(DISTINCT p.cmd ORDER BY p.cmd) AS covered_ops
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity = true AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename
ORDER BY operations_covered ASC, tablename;

-- ============================================================================
-- 3) MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================
SELECT '3️⃣ FK INDEXES' AS check,
       c.conrelid::regclass AS table_name,
       a.attname AS column_name,
       c.confrelid::regclass AS referenced_table,
       CASE WHEN i.indexrelid IS NULL THEN '❌ MISSING' ELSE '✅ OK' END AS idx_status
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_index i ON i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
ORDER BY idx_status, table_name;

-- ============================================================================
-- 4) TABLE STATISTICS
-- ============================================================================
SELECT '4️⃣ TABLE SIZE' AS check, schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================================
-- 5) CHECK CONSTRAINTS
-- ============================================================================
SELECT '5️⃣ CHECK CONSTRAINTS' AS check,
       conrelid::regclass AS table_name, 
       conname, 
       pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace
ORDER BY table_name;

-- ============================================================================
-- 6) FOREIGN KEY RELATIONSHIPS
-- ============================================================================
SELECT '6️⃣ FOREIGN KEYS' AS check,
       conrelid::regclass AS table_name, 
       conname, 
       pg_get_constraintdef(oid) AS fk_definition
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY table_name;

-- ============================================================================
-- 7) FUNCTIONS AND SECURITY
-- ============================================================================
SELECT '7️⃣ FUNCTIONS' AS check,
       n.nspname AS schema, 
       p.proname AS function_name,
       pg_get_function_arguments(p.oid) AS args,
       CASE WHEN p.prosecdef THEN '🔒 SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- ============================================================================
-- 8) TRIGGERS
-- ============================================================================
SELECT '8️⃣ TRIGGERS' AS check,
       event_object_table AS table_name, 
       trigger_name, 
       event_manipulation AS event, 
       action_timing AS timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 9) ADMIN USER VERIFICATION
-- ============================================================================
SELECT '9️⃣ ADMIN CHECK' AS check,
       up.id, 
       up.email, 
       up.role, 
       (SELECT array_agg(role) FROM public.user_roles WHERE user_id = up.id) AS user_roles,
       public.is_admin(up.id) AS is_admin_check
FROM public.user_profiles up
WHERE up.id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- ============================================================================
-- 10) SECURITY SUMMARY
-- ============================================================================
SELECT '🔟 SUMMARY' AS check,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) AS tables_with_rls,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false AND tablename NOT LIKE 'pg_%') AS tables_without_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') AS tables_with_policies,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%admin%') AS admin_functions;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Copy ALL result tables
-- 3. Paste results here for analysis
-- 4. I'll give you prioritized action plan
-- ============================================================================
