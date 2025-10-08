-- SQL functions for MFA statistics
-- These functions provide data for the MFA Statistics Dashboard

-- Function to get overall MFA user statistics
CREATE OR REPLACE FUNCTION public.get_mfa_user_stats()
RETURNS TABLE (
    total_users bigint,
    mfa_enabled_users bigint,
    mfa_adoption_rate numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint AS total_users,
        COUNT(CASE WHEN mfa_enabled = true THEN 1 END)::bigint AS mfa_enabled_users,
        ROUND(COUNT(CASE WHEN mfa_enabled = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) AS mfa_adoption_rate
    FROM public.user_profiles;
END;
$$;

-- Grant access to authenticated users (admins only would be more restricted)
GRANT EXECUTE ON FUNCTION public.get_mfa_user_stats() TO authenticated;

-- Function to get MFA verification statistics
CREATE OR REPLACE FUNCTION public.get_mfa_verification_stats(days_back integer DEFAULT 30)
RETURNS TABLE (
    total_attempts bigint,
    successful_attempts bigint,
    failed_attempts bigint,
    failure_rate numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH verification_stats AS (
        SELECT 
            COUNT(*)::bigint AS total_attempts,
            COUNT(CASE WHEN success = true THEN 1 END)::bigint AS successful_attempts,
            COUNT(CASE WHEN success = false THEN 1 END)::bigint AS failed_attempts
        FROM public.mfa_verification_log
        WHERE created_at >= (CURRENT_TIMESTAMP - (days_back || ' days')::interval)
    )
    SELECT 
        s.total_attempts,
        s.successful_attempts,
        s.failed_attempts,
        CASE 
            WHEN s.total_attempts > 0 THEN 
                ROUND((s.failed_attempts::numeric / s.total_attempts::numeric) * 100, 1)
            ELSE 0
        END AS failure_rate
    FROM verification_stats s;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mfa_verification_stats(integer) TO authenticated;

-- Function to get recovery code usage statistics
CREATE OR REPLACE FUNCTION public.get_mfa_recovery_code_stats()
RETURNS TABLE (
    total_used bigint,
    last_30_days_used bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH recovery_stats AS (
        SELECT 
            COUNT(*)::bigint AS total_used
        FROM public.mfa_verification_log
        WHERE recovery_code_used = true
    ),
    recent_stats AS (
        SELECT 
            COUNT(*)::bigint AS last_30_days_used
        FROM public.mfa_verification_log
        WHERE 
            recovery_code_used = true
            AND created_at >= (CURRENT_TIMESTAMP - '30 days'::interval)
    )
    SELECT 
        r.total_used,
        rs.last_30_days_used
    FROM recovery_stats r, recent_stats rs;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mfa_recovery_code_stats() TO authenticated;

-- Function to get verification trend data
CREATE OR REPLACE FUNCTION public.get_mfa_verification_trend(days_back integer DEFAULT 30)
RETURNS TABLE (
    date text,
    successful bigint,
    failed bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    start_date timestamp;
    end_date timestamp;
BEGIN
    start_date := date_trunc('day', CURRENT_TIMESTAMP - (days_back || ' days')::interval);
    end_date := date_trunc('day', CURRENT_TIMESTAMP);
    
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date AS series_date
    ),
    daily_stats AS (
        SELECT 
            date_trunc('day', created_at)::date AS log_date,
            COUNT(CASE WHEN success = true THEN 1 END) AS successful,
            COUNT(CASE WHEN success = false THEN 1 END) AS failed
        FROM public.mfa_verification_log
        WHERE created_at >= start_date
        GROUP BY log_date
    )
    SELECT 
        to_char(ds.series_date, 'YYYY-MM-DD') AS date,
        COALESCE(s.successful, 0)::bigint AS successful,
        COALESCE(s.failed, 0)::bigint AS failed
    FROM date_series ds
    LEFT JOIN daily_stats s ON ds.series_date = s.log_date
    ORDER BY ds.series_date;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_mfa_verification_trend(integer) TO authenticated;

-- Security policy for MFA verification log access
CREATE POLICY "Allow admins to view MFA verification logs" 
    ON public.mfa_verification_log
    FOR SELECT 
    TO authenticated 
    USING (
        (SELECT is_admin FROM user_profiles WHERE id = auth.uid()) = true
    );