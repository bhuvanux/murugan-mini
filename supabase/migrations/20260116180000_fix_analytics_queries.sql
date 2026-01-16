-- Migration to fix broken analytics queries and align with source of truth (analytics_tracking)
-- Created: 2026-01-17

-- 1. Fix get_peak_modules (Regression repair)
-- Was incorrectly pointing to auth_events and using wrong column names
CREATE OR REPLACE FUNCTION public.get_peak_modules(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (module_name text, usage_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AE.module_name, 'unknown') as module_name,
        count(*) as usage_count
    FROM public.analytics_tracking AE
    WHERE AE.created_at BETWEEN p_start_date AND p_end_date
    AND AE.module_name IS NOT NULL
    AND AE.event_type NOT IN ('auth_heartbeat', 'heartbeat', 'session_start', 'session_started', 'auth_session_started')
    GROUP BY module_name
    ORDER BY usage_count DESC;
END;
$$;

-- 2. Fix get_location_map_data (Standardization)
-- Ensure it uses metadata->>'city' and standard parameter names
CREATE OR REPLACE FUNCTION public.get_location_map_data(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (city text, user_count bigint, event_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        metadata->>'city' as city,
        count(DISTINCT user_id) as user_count,
        count(*) as event_count
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND metadata->>'city' IS NOT NULL
    GROUP BY 1
    ORDER BY event_count DESC;
END;
$$;

-- 3. Provide fallback RPCs for Notifications (Tier 3 stubs)
-- These prevent "Query Execution Failed" for non-implemented features
CREATE OR REPLACE FUNCTION public.get_notification_stats(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (total_sent bigint, open_rate numeric, failures bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    -- Return mock data for now to avoid front-end crashes
    RETURN QUERY SELECT 0::bigint, 0::numeric, 0::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_notifications(p_start_date timestamptz, p_end_date timestamptz, p_limit int DEFAULT 10)
RETURNS TABLE (notification_id text, title text, open_rate numeric) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'none'::text, 'No data'::text, 0::numeric LIMIT 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_low_performing_notifications(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (notification_id text, title text, open_rate numeric) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'none'::text, 'No data'::text, 0::numeric LIMIT 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notification_city_stats(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (city text, open_rate numeric) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'none'::text, 0::numeric LIMIT 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notification_type_stats(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (notif_type text, open_rate numeric) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'none'::text, 0::numeric LIMIT 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_notifications()
RETURNS TABLE (notif_id text, title text, scheduled_for timestamptz) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'none'::text, 'No data'::text, now() LIMIT 0;
END;
$$;

-- 4. Ensure get_auth_trends supports both date sources if needed
-- But stick to analytics_tracking as main truth
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
        (SELECT count(*) FROM public.analytics_tracking WHERE event_type IN ('auth_login_success', 'login_success') AND created_at::date = ds.d) as success_count,
        (SELECT count(*) FROM public.analytics_tracking WHERE event_type IN ('auth_login_failure', 'login_failure') AND created_at::date = ds.d) as failure_count
    FROM date_series ds
    ORDER BY ds.d ASC;
END;
$$;
