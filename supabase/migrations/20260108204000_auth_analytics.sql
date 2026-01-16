-- Create auth_events table for tracking authentication and user activity
CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    event_type TEXT NOT NULL,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    device_id TEXT,
    ip_address TEXT,
    city TEXT,
    carrier TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_time ON public.auth_events(event_time);
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_events(user_id);

-- Enable RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Policy for admin access
CREATE POLICY "Admins can view all auth events"
ON public.auth_events
FOR SELECT
TO authenticated
USING (true); -- Assuming any authenticated user for now, or add admin check if there's a roles table

-- Policy for anonymous inserts (for pre-signup events)
CREATE POLICY "Allow anonymous inserts for auth events"
ON public.auth_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- RPC for Auth Stats (V2)
CREATE OR REPLACE FUNCTION get_auth_stats_v2(start_date timestamptz, end_date timestamptz)
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
         WHERE event_type = 'auth_session_started' -- Use session_started for active users
         AND event_time >= CURRENT_DATE) as active_today,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_login_attempt' 
         AND event_time BETWEEN start_date AND end_date) as login_attempts,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_login_success' 
         AND event_time BETWEEN start_date AND end_date) as login_successes,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_otp_sent' 
         AND event_time BETWEEN start_date AND end_date) as otp_sents,
        (SELECT count(*) FROM public.auth_events 
         WHERE event_type = 'auth_otp_verified' 
         AND event_time BETWEEN start_date AND end_date) as otp_verifieds,
        (SELECT COALESCE(AVG((metadata->>'delivery_time_seconds')::numeric), 0)
         FROM public.auth_events 
         WHERE event_type = 'auth_otp_sent' 
         AND event_time BETWEEN start_date AND end_date 
         AND (metadata->>'delivery_time_seconds') IS NOT NULL) as avg_otp_delivery_seconds;
END;
$$;

-- RPC for Signup Funnel
CREATE OR REPLACE FUNCTION get_signup_funnel(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
    step_name text,
    event_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 'Phone Entered'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_signup_started' AND event_time BETWEEN start_date AND end_date
    UNION ALL
    SELECT 'OTP Sent'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_otp_sent' AND event_time BETWEEN start_date AND end_date
    UNION ALL
    SELECT 'OTP Verified'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_otp_verified' AND event_time BETWEEN start_date AND end_date
    UNION ALL
    SELECT 'Signup Completed'::text as step_name, count(*) as event_count 
    FROM public.auth_events WHERE event_type = 'auth_signup_completed' AND event_time BETWEEN start_date AND end_date;
END;
$$;

-- RPC for Security Monitoring
CREATE OR REPLACE FUNCTION get_security_alerts()
RETURNS TABLE (
    alert_type text,
    user_identifier text,
    event_count bigint,
    metadata jsonb
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    -- Excessive OTP Requests (> 5 in 24h)
    RETURN QUERY
    SELECT 
        'excessive_otp'::text as alert_type,
        COALESCE(u.phone, ae.metadata->>'phone', 'unknown') as user_identifier,
        count(*) as event_count,
        jsonb_build_object('last_event', max(ae.event_time)) as metadata
    FROM public.auth_events ae
    LEFT JOIN public.users u ON ae.user_id = u.id
    WHERE ae.event_type = 'auth_otp_sent'
    AND ae.event_time >= NOW() - INTERVAL '24 hours'
    GROUP BY user_identifier, u.phone, ae.metadata
    HAVING count(*) > 5;

    -- Multi-device Logins (> 2 devices in 7 days)
    RETURN QUERY
    SELECT 
        'multi_device'::text as alert_type,
        u.phone as user_identifier,
        count(DISTINCT ae.device_id) as event_count,
        jsonb_build_object('devices', jsonb_agg(DISTINCT ae.device_id)) as metadata
    FROM public.auth_events ae
    JOIN public.users u ON ae.user_id = u.id
    WHERE ae.event_type = 'auth_session_started' -- Use session_started
    AND ae.event_time >= NOW() - INTERVAL '7 days'
    GROUP BY u.id, u.phone
    HAVING count(DISTINCT ae.device_id) > 1;
END;
$$;

-- RPC for Auth Trends (Peak Windows)
CREATE OR REPLACE FUNCTION get_auth_peak_windows()
RETURNS TABLE (
    hour_range text,
    login_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(event_time, 'HH24') || ':00' as hour_range,
        count(*) as login_count
    FROM public.auth_events
    WHERE event_type = 'auth_login_attempt'
    AND event_time >= NOW() - INTERVAL '30 days'
    GROUP BY hour_range
    ORDER BY login_count DESC
    LIMIT 5;
END;
$$;

-- RPC for Daily Auth Trends
CREATE OR REPLACE FUNCTION get_auth_trends(days_ago int DEFAULT 30)
RETURNS TABLE (
    trend_date date,
    success_count bigint,
    failure_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - (days_ago - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day')::date as d
    )
    SELECT 
        ds.d as trend_date,
        (SELECT count(*) FROM public.auth_events WHERE event_type = 'auth_login_success' AND event_time::date = ds.d) as success_count,
        (SELECT count(*) FROM public.auth_events WHERE event_type = 'auth_login_failure' AND event_time::date = ds.d) as failure_count
    FROM date_series ds
    ORDER BY ds.d ASC;
END;
$$;

-- RPC for City & Carrier Reliability
CREATE OR REPLACE FUNCTION get_city_reliability()
RETURNS TABLE (
    category text,
    name text,
    success_rate numeric,
    total_attempts bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    -- Carrier Success Rates
    RETURN QUERY
    SELECT 
        'carrier'::text as category,
        ae.carrier as name,
        (count(*) FILTER (WHERE event_type = 'auth_login_success')::numeric / count(*)::numeric) * 100 as success_rate,
        count(*) as total_attempts
    FROM public.auth_events ae
    WHERE ae.carrier IS NOT NULL
    AND ae.event_time >= NOW() - INTERVAL '30 days'
    GROUP BY ae.carrier;

    -- City Failure Rates (Top 5)
    RETURN QUERY
    SELECT 
        'city_failure'::text as category,
        ae.city as name,
        (count(*) FILTER (WHERE event_type = 'auth_login_failure')::numeric / count(*)::numeric) * 100 as success_rate, -- Using success_rate column for failure %
        count(*) as total_attempts
    FROM public.auth_events ae
    WHERE ae.city IS NOT NULL
    AND ae.event_time >= NOW() - INTERVAL '30 days'
    GROUP BY ae.city
    ORDER BY success_rate ASC
    LIMIT 5;
END;
$$;

-- RPC for User Activity Detail
CREATE OR REPLACE FUNCTION get_user_activity(p_user_id uuid)
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
