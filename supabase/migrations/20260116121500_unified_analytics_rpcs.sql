-- Unified Analytics RPCs Migration
-- This migration standardizes all analytics RPC signatures to ensure compatibility with the Query Manager
-- It adds the 'p_' prefix to all arguments and ensures consistent column names.

-- 1. get_signup_funnel (Fix: add p_ prefix)
DROP FUNCTION IF EXISTS public.get_signup_funnel(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.get_signup_funnel(
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS TABLE (
    step_name text,
    event_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 'Phone Entered'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_signup_started' AND event_time BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'OTP Sent'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_otp_sent' AND event_time BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'OTP Verified'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_otp_verified' AND event_time BETWEEN p_start_date AND p_end_date
    UNION ALL
    SELECT 'Signup Completed'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_signup_completed' AND event_time BETWEEN p_start_date AND p_end_date;
END;
$$;

-- 2. get_auth_stats_v2 (Fix: add p_ prefix)
DROP FUNCTION IF EXISTS public.get_auth_stats_v2(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.get_auth_stats_v2(
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS TABLE (
    total_users bigint,
    active_today bigint,
    login_attempts bigint,
    login_successes bigint,
    otp_sents bigint,
    otp_verifieds bigint,
    avg_otp_delivery_seconds numeric
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT count(*) FROM public.users) as total_users,
        (SELECT count(DISTINCT user_id) FROM public.auth_events 
         WHERE event_type = 'auth_session_started'
         AND event_time >= CURRENT_DATE) as active_today,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_login_attempt' 
         AND event_time BETWEEN p_start_date AND p_end_date) as login_attempts,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_login_success' 
         AND event_time BETWEEN p_start_date AND p_end_date) as login_successes,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_otp_sent' 
         AND event_time BETWEEN p_start_date AND p_end_date) as otp_sents,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_otp_verified' 
         AND event_time BETWEEN p_start_date AND p_end_date) as otp_verifieds,
        (SELECT COALESCE(AVG((metadata->>'delivery_time_seconds')::numeric), 0)
         FROM public.auth_events 
         WHERE event_type = 'auth_otp_sent' 
         AND event_time BETWEEN p_start_date AND p_end_date 
         AND (metadata->>'delivery_time_seconds') IS NOT NULL) as avg_otp_delivery_seconds;
END;
$$;

-- 3. Ensure get_location_map_data is robust
CREATE OR REPLACE FUNCTION public.get_location_map_data(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (city text, user_count bigint, event_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AE.city,
        count(DISTINCT AE.user_id) as user_count,
        count(*) as event_count
    FROM public.auth_events AE
    WHERE AE.event_time BETWEEN p_start_date AND p_end_date
    AND AE.city IS NOT NULL
    GROUP BY AE.city
    ORDER BY event_count DESC;
END;
$$;

-- 4. Ensure get_peak_modules is robust
CREATE OR REPLACE FUNCTION public.get_peak_modules(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (module_name text, usage_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AE.module, 'unknown') as module_name,
        count(*) as usage_count
    FROM public.auth_events AE
    WHERE AE.event_time BETWEEN p_start_date AND p_end_date
    AND AE.module IS NOT NULL
    AND AE.event_type NOT IN ('auth_heartbeat', 'auth_session_started', 'auth_session_ended')
    GROUP BY module_name
    ORDER BY usage_count DESC;
END;
$$;

-- 5. Add get_location_map_data alias if needed or just ensure it exists
-- The signature in the screenshot was get_location_map_data(p_end_date, p_start_date)
-- Let's provide a version with named parameters and defaults to be safe.
-- (PostgreSQL handles named arguments automatically)

-- 6. get_user_activity (Ensure p_ prefix)
CREATE OR REPLACE FUNCTION public.get_user_activity(p_user_id uuid)
RETURNS TABLE (
    event_time timestamptz,
    event_type text,
    device_id text,
    city text,
    metadata jsonb
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.event_time,
        ae.event_type,
        ae.device_id,
        ae.city,
        ae.metadata
    FROM public.auth_events ae
    WHERE ae.user_id = p_user_id
    ORDER BY ae.event_time DESC
    LIMIT 20;
END;
$$;
-- 7. get_auth_trends (Fix: add p_ prefix)
DROP FUNCTION IF EXISTS public.get_auth_trends(int);
CREATE OR REPLACE FUNCTION public.get_auth_trends(p_days_ago int DEFAULT 30)
RETURNS TABLE (
    trend_date date,
    success_count bigint,
    failure_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - (p_days_ago - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day')::date as d
    )
    SELECT 
        ds.d as trend_date,
        (SELECT count(*) FROM public.auth_events WHERE event_type = 'auth_login_success' AND event_time::date = ds.d) as success_count,
        (SELECT count(*) FROM public.auth_events WHERE event_type = 'auth_login_failure' AND event_time::date = ds.d) as failure_count
    FROM date_series ds
    ORDER BY ds.d ASC;
END;
$$;

-- 8. get_auth_peak_windows (Fix: ensure parameters match if needed, though usually none)
CREATE OR REPLACE FUNCTION public.get_auth_peak_windows(p_timezone text DEFAULT 'Asia/Kolkata')
RETURNS TABLE (
    hour_range text,
    login_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(event_time AT TIME ZONE p_timezone, 'HH24') || ':00' as hour_range,
        count(*) as login_count
    FROM public.auth_events
    WHERE event_type = 'auth_login_attempt'
    -- Look back 30 days
    AND event_time >= NOW() - INTERVAL '30 days'
    GROUP BY hour_range
    ORDER BY login_count DESC
    LIMIT 5;
END;
$$;
