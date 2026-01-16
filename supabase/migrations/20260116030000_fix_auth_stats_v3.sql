-- Migration to point all dashboard-related RPCs to analytics_tracking (source of truth)
-- and handle flexible naming conventions.

CREATE OR REPLACE FUNCTION get_auth_stats_v3(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (
    total_users bigint,
    active_today_2min bigint,
    total_signups bigint,
    total_logins bigint,
    otp_success_rate numeric,
    avg_otp_delivery_seconds numeric
) SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_total_users bigint;
BEGIN
    SELECT count(*) INTO v_total_users FROM public.users;
    
    RETURN QUERY
    SELECT 
        v_total_users as total_users,
        -- Active Today (2min): Users with at least 4 heartbeat events in the period
        (SELECT count(DISTINCT user_id) 
         FROM (
             SELECT user_id
             FROM public.analytics_tracking 
             WHERE event_type IN ('auth_heartbeat', 'heartbeat', 'session_start', 'session_started')
             AND created_at BETWEEN p_start_date AND p_end_date
             AND user_id IS NOT NULL
             GROUP BY user_id
             HAVING count(*) >= 4
             
             UNION
             
             -- High activity fallback
             SELECT user_id
             FROM public.analytics_tracking
             WHERE created_at BETWEEN p_start_date AND p_end_date
             AND event_type NOT IN ('auth_heartbeat', 'heartbeat', 'session_start', 'session_started')
             AND user_id IS NOT NULL
             GROUP BY user_id
             HAVING count(*) > 10
         ) as active_subset
        )::bigint as active_today_2min,
        
        -- Support both prefixed and non-prefixed events from analytics_tracking
        (SELECT count(*) FROM public.analytics_tracking 
         WHERE event_type IN ('auth_signup_completed', 'signup_completed')
         AND created_at BETWEEN p_start_date AND p_end_date) as total_signups,
         
        (SELECT count(*) FROM public.analytics_tracking 
         WHERE event_type IN ('auth_login_success', 'login_success', 'login_completed', 'auth_login_completed')
         AND created_at BETWEEN p_start_date AND p_end_date) as total_logins,
         
        (SELECT 
            CASE WHEN count(*) FILTER (WHERE event_type IN ('auth_otp_sent', 'otp_sent')) = 0 THEN 0 
            ELSE (count(*) FILTER (WHERE event_type IN ('auth_otp_verified', 'otp_verified'))::numeric / 
                  NULLIF(count(*) FILTER (WHERE event_type IN ('auth_otp_sent', 'otp_sent')), 0)::numeric) * 100 
            END
         FROM public.analytics_tracking 
         WHERE created_at BETWEEN p_start_date AND p_end_date 
         AND event_type IN ('auth_otp_sent', 'otp_sent', 'auth_otp_verified', 'otp_verified')) as otp_success_rate,
         
        (SELECT COALESCE(AVG((metadata->>'delivery_time_seconds')::numeric), 0)
         FROM public.analytics_tracking
         WHERE event_type IN ('auth_otp_sent', 'otp_sent')
         AND created_at BETWEEN p_start_date AND p_end_date 
         AND (metadata->>'delivery_time_seconds') IS NOT NULL) as avg_otp_delivery_seconds;
END;
$$;

-- Update Peak Modules RPC
CREATE OR REPLACE FUNCTION get_peak_modules(p_start_date timestamptz, p_end_date timestamptz)
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
    AND AE.event_type NOT IN ('auth_heartbeat', 'heartbeat', 'session_start')
    GROUP BY module_name
    ORDER BY usage_count DESC;
END;
$$;

-- Update Location Map RPC
CREATE OR REPLACE FUNCTION get_location_map_data(p_start_date timestamptz, p_end_date timestamptz)
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
