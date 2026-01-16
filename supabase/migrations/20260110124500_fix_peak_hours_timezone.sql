-- Update get_auth_peak_windows to use IST (Asia/Kolkata) timezone
-- This ensures the dashboard shows peak hours in the relevant local time, not UTC.

CREATE OR REPLACE FUNCTION get_auth_peak_windows(include_timezone text DEFAULT 'Asia/Kolkata')
RETURNS TABLE (
    hour_range text,
    login_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(event_time AT TIME ZONE include_timezone, 'HH24') || ':00' as hour_range,
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
