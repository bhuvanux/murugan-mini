-- Fix RPC structure mismatch errors by forcing explicit types and dropping old functions first

-- 1. Fix get_auth_events
DROP FUNCTION IF EXISTS get_auth_events(timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION get_auth_events(p_start_date timestamptz, p_end_date timestamptz, p_event_type text DEFAULT NULL)
RETURNS TABLE (
    event_timestamp timestamptz,
    user_id uuid,
    event_name text,
    city text,
    device_info text,
    platform text
) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        created_at::timestamptz,
        analytics_tracking.user_id::uuid,
        event_type::text,
        COALESCE(metadata->>'city', 'Unknown')::text,
        COALESCE(
            metadata->>'device_model', 
            metadata->>'device_name', 
            'Unknown Device'
        )::text,
        COALESCE(metadata->>'platform', 'Unknown')::text
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (
        p_event_type IS NULL 
        OR event_type = p_event_type 
        OR (p_event_type = 'logins' AND event_type IN ('auth_login_success', 'login_success', 'login_completed', 'auth_login_completed'))
        OR (p_event_type = 'signups' AND event_type IN ('auth_signup_completed', 'signup_completed'))
    )
    ORDER BY created_at DESC
    LIMIT 100;
END;
$$;

-- 2. Fix get_location_map_data
DROP FUNCTION IF EXISTS get_location_map_data(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_location_map_data(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (city text, user_count bigint, event_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(
            au.raw_user_meta_data->>'city',
            at.metadata->>'city',
            'Unknown'
        )::text as city,
        count(DISTINCT at.user_id)::bigint as user_count,
        count(*)::bigint as event_count
    FROM public.analytics_tracking at
    LEFT JOIN auth.users au ON at.user_id = au.id
    WHERE at.created_at BETWEEN p_start_date AND p_end_date
    AND (au.raw_user_meta_data->>'city' IS NOT NULL OR at.metadata->>'city' IS NOT NULL)
    GROUP BY 1
    ORDER BY user_count DESC;
END;
$$;

-- 3. Fix get_content_trends (chart data)
DROP FUNCTION IF EXISTS get_content_trends(int);

CREATE OR REPLACE FUNCTION get_content_trends(p_days_ago int DEFAULT 30)
RETURNS TABLE (
    activity_date text,
    wallpapers_count bigint,
    media_count bigint,
    sparkle_count bigint
)
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD')::text as activity_date,
        count(*) FILTER (WHERE event_type LIKE 'wallpaper%')::bigint,
        count(*) FILTER (WHERE event_type IN ('song_play', 'video_play', 'song_download', 'video_download'))::bigint,
        count(*) FILTER (WHERE event_type LIKE 'sparkle%')::bigint
    FROM public.analytics_tracking
    WHERE created_at > (now() - (p_days_ago || ' days')::interval)
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$;

-- 4. Fix get_system_health
DROP FUNCTION IF EXISTS get_system_health(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_system_health(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (
    error_count bigint,
    avg_latency_ms numeric,
    crash_count bigint
) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        count(*) FILTER (WHERE event_type IN ('error', 'api_error', 'system_failure'))::bigint,
        COALESCE(AVG((metadata->>'latency_ms')::numeric), 0)::numeric,
        count(*) FILTER (WHERE event_type = 'app_crash')::bigint
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;
