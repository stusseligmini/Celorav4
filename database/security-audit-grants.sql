-- ============================================================================
-- SECURITY AUDIT: Grants & Function Permissions
-- Check EXECUTE rights on SECURITY DEFINER functions and table GRANTs
-- ============================================================================

-- ============================================================================
-- 1️⃣ SECURITY DEFINER FUNCTIONS - EXECUTE PERMISSIONS (CRITICAL)
-- ============================================================================
-- Shows who can execute SECURITY DEFINER functions (bypasses RLS!)
SELECT 
    '🔒 SECURITY DEFINER EXECUTE RIGHTS' AS audit_section,
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.prosecdef THEN '⚠️ SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type,
    array_agg(DISTINCT grantee.rolname ORDER BY grantee.rolname) AS can_execute,
    CASE 
        WHEN 'public' = ANY(array_agg(grantee.rolname)) THEN '🔴 PUBLIC CAN EXECUTE - HIGH RISK!'
        WHEN 'anon' = ANY(array_agg(grantee.rolname)) THEN '🟠 ANON CAN EXECUTE - MEDIUM RISK'
        WHEN 'authenticated' = ANY(array_agg(grantee.rolname)) THEN '🟡 AUTHENTICATED CAN EXECUTE'
        ELSE '🟢 RESTRICTED ACCESS'
    END AS risk_level
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_proc_acl pa ON p.oid = pa.prooid
LEFT JOIN pg_roles grantee ON pa.grantee = grantee.oid
WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.prosecdef = true  -- Only SECURITY DEFINER functions
GROUP BY n.nspname, p.proname, p.oid, p.prosecdef
ORDER BY 
    CASE 
        WHEN 'public' = ANY(array_agg(grantee.rolname)) THEN 1
        WHEN 'anon' = ANY(array_agg(grantee.rolname)) THEN 2
        WHEN 'authenticated' = ANY(array_agg(grantee.rolname)) THEN 3
        ELSE 4
    END,
    p.proname;

-- ============================================================================
-- 2️⃣ TABLE GRANTS - Who can do what on each table
-- ============================================================================
SELECT 
    '📊 TABLE GRANTS' AS audit_section,
    schemaname,
    tablename,
    grantee AS role,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename, grantee
ORDER BY tablename, 
    CASE grantee
        WHEN 'public' THEN 1
        WHEN 'anon' THEN 2
        WHEN 'authenticated' THEN 3
        WHEN 'service_role' THEN 4
        ELSE 5
    END,
    grantee;

-- ============================================================================
-- 3️⃣ COLUMN-LEVEL GRANTS (if any)
-- ============================================================================
SELECT 
    '🔐 COLUMN GRANTS' AS audit_section,
    table_schema,
    table_name,
    column_name,
    grantee AS role,
    privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
ORDER BY table_name, column_name, grantee;

-- ============================================================================
-- 4️⃣ DANGEROUS PUBLIC GRANTS - Tables accessible to PUBLIC
-- ============================================================================
SELECT 
    '🔴 PUBLIC ACCESS' AS audit_section,
    schemaname,
    tablename,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS public_can_do
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND grantee = 'public'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 5️⃣ ANON ROLE GRANTS - Anonymous access
-- ============================================================================
SELECT 
    '🟠 ANON ACCESS' AS audit_section,
    schemaname,
    tablename,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS anon_can_do
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND grantee = 'anon'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 6️⃣ AUTHENTICATED ROLE GRANTS
-- ============================================================================
SELECT 
    '🟡 AUTHENTICATED ACCESS' AS audit_section,
    schemaname,
    tablename,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS authenticated_can_do
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND grantee = 'authenticated'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 7️⃣ SERVICE_ROLE GRANTS
-- ============================================================================
SELECT 
    '🔵 SERVICE_ROLE ACCESS' AS audit_section,
    schemaname,
    tablename,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS service_role_can_do
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND grantee = 'service_role'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 8️⃣ MY_READONLY_ROLE GRANTS - Check your custom role
-- ============================================================================
SELECT 
    '👁️ READONLY ROLE ACCESS' AS audit_section,
    schemaname,
    tablename,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS readonly_can_do
FROM information_schema.table_privileges
WHERE schemaname = 'public'
    AND grantee = 'my_readonly_role'
    AND tablename NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 9️⃣ SEQUENCE GRANTS - Who can use sequences (for IDs)
-- ============================================================================
SELECT 
    '🔢 SEQUENCE GRANTS' AS audit_section,
    sequence_schema,
    sequence_name,
    grantee AS role,
    privilege_type
FROM information_schema.usage_privileges
WHERE sequence_schema = 'public'
    AND object_type = 'SEQUENCE'
ORDER BY sequence_name, grantee;

-- ============================================================================
-- 🔟 DEFAULT PRIVILEGES - What new objects will get
-- ============================================================================
SELECT 
    '⚙️ DEFAULT PRIVILEGES' AS audit_section,
    defaclrole::regrole AS for_role,
    defaclnamespace::regnamespace AS in_schema,
    CASE defaclobjtype
        WHEN 'r' THEN 'tables'
        WHEN 'S' THEN 'sequences'
        WHEN 'f' THEN 'functions'
        WHEN 'T' THEN 'types'
        WHEN 'n' THEN 'schemas'
    END AS object_type,
    array_agg(DISTINCT defaclacl::text) AS default_privileges
FROM pg_default_acl
WHERE defaclnamespace = 'public'::regnamespace
GROUP BY defaclrole, defaclnamespace, defaclobjtype;

-- ============================================================================
-- SUMMARY & RECOMMENDATIONS
-- ============================================================================
SELECT 
    '📋 GRANT SUMMARY' AS audit_section,
    (SELECT COUNT(DISTINCT tablename) 
     FROM information_schema.table_privileges 
     WHERE schemaname = 'public' AND grantee = 'public') AS tables_public_can_access,
    (SELECT COUNT(DISTINCT tablename) 
     FROM information_schema.table_privileges 
     WHERE schemaname = 'public' AND grantee = 'anon') AS tables_anon_can_access,
    (SELECT COUNT(DISTINCT tablename) 
     FROM information_schema.table_privileges 
     WHERE schemaname = 'public' AND grantee = 'authenticated') AS tables_authenticated_can_access,
    (SELECT COUNT(*) 
     FROM pg_proc p 
     JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND p.prosecdef = true) AS security_definer_functions;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Copy ALL result tables (10 sections)
-- 3. Paste results here for analysis
-- 4. I'll identify security risks and provide fixes
-- ============================================================================
