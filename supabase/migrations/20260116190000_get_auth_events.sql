-- New RPC to get detailed auth events (Logins, Signups)
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
        created_at::timestamptz as event_timestamp,
        public.analytics_tracking.user_id::uuid,
        event_type::text as event_name,
        COALESCE(metadata->>'city', 'Unknown')::text as city,
        COALESCE(
            metadata->>'device_model', 
            metadata->>'device_name', 
            'Unknown Device'
        )::text as device_info,
        COALESCE(metadata->>'platform', 'Unknown')::text as platform
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (
        p_event_type IS NULL 
        OR event_type = p_event_type 
        OR (p_event_type = 'logins' AND event_type IN ('auth_login_success', 'login_success', 'login_completed', 'auth_login_completed'))
        OR (p_event_type = 'signups' AND event_type IN ('auth_signup_completed', 'signup_completed'))
    )
    ORDER BY created_at DESC
    LIMIT 100; -- Limit to prevent massive loads
END;
$$;
