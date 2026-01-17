-- Fix RPCs to use analytics_tracking instead of auth_events
-- and derive module from event_type

-- 1. Fix get_peak_modules (Content Module Usage)
DROP FUNCTION IF EXISTS get_peak_modules(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_peak_modules(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (module_name text, usage_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN event_type LIKE 'wallpaper%' THEN 'Wallpapers'
            WHEN event_type LIKE 'song%' OR event_type LIKE 'video%' THEN 'Media'
            WHEN event_type LIKE 'sparkle%' THEN 'Sparkle'
            WHEN event_type LIKE 'auth%' THEN 'Authentication'
            ELSE 'Other'
        END::text as module_name,
        count(*)::bigint as usage_count
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND event_type NOT IN ('auth_heartbeat', 'auth_session_started', 'auth_session_ended')
    GROUP BY 1
    ORDER BY usage_count DESC;
END;
$$;

-- 2. Fix get_top_storage_files (Storage - if applicable, verify table)
-- Assuming storage might still be in storage_assets or objects, but let's check if there's a specific error. 
-- For now, focused on fixing the "ae.module" error in content usage.

-- 3. Fix get_content_stats (if it uses auth_events)
DROP FUNCTION IF EXISTS get_content_stats(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION get_content_stats(
    p_start_date timestamptz DEFAULT (now() - interval '30 days'),
    p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
    wallpapers_viewed bigint,
    sparkle_views bigint,
    media_plays bigint
) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        count(*) FILTER (WHERE event_type LIKE 'wallpaper_view%')::bigint,
        count(*) FILTER (WHERE event_type LIKE 'sparkle_view%')::bigint,
        count(*) FILTER (WHERE event_type IN ('song_play', 'video_play'))::bigint
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- 4. Fix User Distribution (City) if it was failing or showing Unknown
-- The generic get_location_map_data was fixed in the previous migration (20260117000000), 
-- explicitly using analytics_tracking. So that should be fine IF the data exists.

-- 5. Fix get_auth_peak_windows to use analytics_tracking
DROP FUNCTION IF EXISTS get_auth_peak_windows(text);
CREATE OR REPLACE FUNCTION get_auth_peak_windows(p_timezone text DEFAULT 'Asia/Kolkata')
RETURNS TABLE (
    hour_range text,
    login_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(created_at AT TIME ZONE p_timezone, 'HH24') || ':00' as hour_range,
        count(*)::bigint as login_count
    FROM public.analytics_tracking
    WHERE event_type IN ('auth_login_attempt', 'login_attempt', 'auth_login_started')
    -- Look back 30 days
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY hour_range
    ORDER BY login_count DESC
    LIMIT 5;
END;
$$;
