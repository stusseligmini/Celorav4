-- Database Performance Monitoring for Celora Platform
-- Run this script periodically to monitor optimization effectiveness

-- ==================================================
-- RLS POLICY PERFORMANCE MONITORING
-- ==================================================

-- Check current policy configuration
SELECT 
    'Current RLS Policy Status' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles[1] as role,
    cmd as operation,
    CASE 
        WHEN qual LIKE '%select auth.uid()%' THEN 'OPTIMIZED ✓'
        WHEN qual LIKE '%auth.uid()%' THEN 'NEEDS OPTIMIZATION ⚠'
        ELSE 'UNKNOWN'
    END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions')
ORDER BY tablename, cmd;

-- ==================================================
-- INDEX USAGE ANALYSIS
-- ==================================================

-- Detailed index usage statistics
SELECT 
    'Index Usage Analysis' as analysis_type,
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping ⚠'
        WHEN idx_scan < 100 THEN 'LOW USAGE - Monitor 📊'
        WHEN idx_scan < 1000 THEN 'MODERATE USAGE ✓'
        ELSE 'HIGH USAGE ✓✓'
    END as usage_recommendation,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Index vs table scan ratio
SELECT 
    'Index Efficiency' as metric_type,
    schemaname,
    tablename,
    sum(idx_scan) as total_index_scans,
    sum(seq_scan) as total_table_scans,
    CASE 
        WHEN sum(seq_scan) = 0 THEN '100% indexed'
        ELSE round((sum(idx_scan)::numeric / (sum(idx_scan) + sum(seq_scan))) * 100, 2) || '% indexed'
    END as index_usage_percentage
FROM pg_stat_user_tables t
JOIN pg_stat_user_indexes i ON t.relid = i.relid
WHERE t.schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ==================================================
-- QUERY PERFORMANCE ANALYSIS
-- ==================================================

-- Current active queries performance
SELECT 
    'Active Query Performance' as analysis_type,
    query,
    state,
    query_start,
    now() - query_start as duration,
    CASE 
        WHEN now() - query_start > interval '5 seconds' THEN 'SLOW QUERY ⚠'
        WHEN now() - query_start > interval '1 second' THEN 'MONITOR 📊'
        ELSE 'OK ✓'
    END as performance_status
FROM pg_stat_activity 
WHERE state = 'active' 
AND query NOT LIKE '%pg_stat_%'
AND query NOT LIKE '%MONITORING%'
ORDER BY query_start;

-- ==================================================
-- DATABASE SIZE AND GROWTH MONITORING
-- ==================================================

-- Table sizes and growth
SELECT 
    'Database Size Analysis' as analysis_type,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    CASE 
        WHEN n_dead_tup > (n_live_tup * 0.1) THEN 'NEEDS VACUUM ⚠'
        WHEN n_dead_tup > (n_live_tup * 0.05) THEN 'MONITOR 📊'
        ELSE 'OK ✓'
    END as vacuum_recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================================================
-- SECURITY AND ACCESS MONITORING
-- ==================================================

-- RLS enforcement check
SELECT 
    'RLS Security Status' as security_check,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN 'SECURE ✓'
        ELSE 'SECURITY RISK ⚠'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions');

-- Recent authentication activity
SELECT 
    'Recent Auth Activity' as activity_type,
    COUNT(*) as total_connections,
    COUNT(DISTINCT usename) as unique_users,
    MAX(backend_start) as latest_connection,
    COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections
FROM pg_stat_activity
WHERE usename IS NOT NULL;

-- ==================================================
-- OPTIMIZATION RECOMMENDATIONS
-- ==================================================

-- Generate optimization recommendations
WITH policy_analysis AS (
    SELECT 
        tablename,
        COUNT(*) as policy_count,
        COUNT(CASE WHEN qual LIKE '%select auth.uid()%' THEN 1 END) as optimized_policies
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions')
    GROUP BY tablename
),
index_analysis AS (
    SELECT 
        tablename,
        COUNT(*) as total_indexes,
        COUNT(CASE WHEN idx_scan = 0 THEN 1 END) as unused_indexes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT 
    'Optimization Summary' as summary_type,
    p.tablename,
    CASE 
        WHEN p.optimized_policies = p.policy_count THEN 'RLS Optimized ✓'
        ELSE 'RLS Needs Work ⚠ (' || (p.policy_count - p.optimized_policies) || ' policies)'
    END as rls_status,
    CASE 
        WHEN i.unused_indexes = 0 THEN 'Indexes Optimal ✓'
        WHEN i.unused_indexes > 0 THEN 'Unused Indexes ⚠ (' || i.unused_indexes || ' unused)'
        ELSE 'No Index Data'
    END as index_status
FROM policy_analysis p
LEFT JOIN index_analysis i ON p.tablename = i.tablename
ORDER BY p.tablename;

-- Final performance score
SELECT 
    'Overall Performance Score' as final_score,
    CASE 
        WHEN 
            (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND qual LIKE '%select auth.uid()%') = 
            (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions'))
        THEN 'EXCELLENT ✓✓✓'
        ELSE 'NEEDS IMPROVEMENT 📊'
    END as performance_rating,
    'Run deploy-optimizations.sql to apply fixes' as next_action;