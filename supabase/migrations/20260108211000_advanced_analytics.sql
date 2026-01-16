-- Migration to expand Auth & User Activity Analytics
-- Focus: Date filtering, Refined Active Users (2m), Peak Modules, and Location Map

-- 1. Add module column to auth_events for better categorization
ALTER TABLE public.auth_events ADD COLUMN IF NOT EXISTS module TEXT;

-- 2. Update existing data (optional, but good for consistency)
UPDATE public.auth_events SET module = 'auth' WHERE event_type LIKE 'auth_%' AND module IS NULL;

-- 3. RPC for Peak Modules
CREATE OR REPLACE FUNCTION get_peak_modules(p_start_date timestamptz, p_end_date timestamptz)
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

-- 4. RPC for Location Map Data (Top Cities)
CREATE OR REPLACE FUNCTION get_location_map_data(p_start_date timestamptz, p_end_date timestamptz)
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

-- 5. RPC for Refined Auth Stats (V3)
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
        -- Active Today (2min): Users with at least 4 heartbeat events in the day
        (SELECT count(DISTINCT user_id) 
         FROM public.auth_events 
         WHERE event_type = 'auth_heartbeat' 
         AND event_time >= CURRENT_DATE
         GROUP BY user_id
         HAVING count(*) >= 4 -- 4 heartbeats * 30s = 2 mins
        UNION -- Also include researchers/active users who might not have heartbeats but many events
         SELECT count(DISTINCT user_id)
         FROM public.auth_events
         WHERE event_time >= CURRENT_DATE
         AND event_type NOT IN ('auth_heartbeat')
         GROUP BY user_id
         HAVING count(*) > 10 -- High activity fallback
        )::bigint as active_today_2min,
        
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_signup_completed' 
         AND event_time BETWEEN p_start_date AND p_end_date) as total_signups,
         
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_login_success' 
         AND event_time BETWEEN p_start_date AND p_end_date) as total_logins,
         
        (SELECT 
            CASE WHEN count(*) = 0 THEN 0 
            ELSE (count(*) FILTER (WHERE event_type = 'auth_otp_verified')::numeric / count(*) FILTER (WHERE event_type = 'auth_otp_sent')::numeric) * 100 
            END
         FROM public.auth_events 
         WHERE event_time BETWEEN p_start_date AND p_end_date 
         AND event_type IN ('auth_otp_sent', 'auth_otp_verified')) as otp_success_rate,
         
        (SELECT COALESCE(AVG((AE.metadata->>'delivery_time_seconds')::numeric), 0)
         FROM public.auth_events AE
         WHERE AE.event_type = 'auth_otp_sent' 
         AND AE.event_time BETWEEN p_start_date AND p_end_date 
         AND (AE.metadata->>'delivery_time_seconds') IS NOT NULL) as avg_otp_delivery_seconds;
END;
$$;
