-- Notification Analytics Schema
-- Tracks all push notification events for analytics

-- ============================================================
-- NOTIFICATION EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'failed', 'dismissed'
    notification_title TEXT,
    notification_body TEXT,
    notification_type TEXT, -- 'important', 'normal', 'promotional'
    city TEXT,
    device_id TEXT,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_event_type CHECK (event_type IN ('sent', 'delivered', 'opened', 'failed', 'dismissed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_time ON public.notification_events(event_time);
CREATE INDEX IF NOT EXISTS idx_notification_events_notif_id ON public.notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_city ON public.notification_events(city);

-- Enable RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all notification events
CREATE POLICY "Admins can view all notification events"
ON public.notification_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email LIKE '%admin%' -- Adjust based on your admin identification
    )
);

-- Policy: System can insert notification events
CREATE POLICY "System can insert notification events"
ON public.notification_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- NOTIFICATION ANALYTICS RPC FUNCTIONS
-- ============================================================

-- Get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_sent BIGINT,
    total_delivered BIGINT,
    total_opened BIGINT,
    total_failed BIGINT,
    open_rate NUMERIC,
    delivery_rate NUMERIC,
    failures BIGINT
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE event_type = 'sent') AS total_sent,
        COUNT(*) FILTER (WHERE event_type = 'delivered') AS total_delivered,
        COUNT(*) FILTER (WHERE event_type = 'opened') AS total_opened,
        COUNT(*) FILTER (WHERE event_type = 'failed') AS total_failed,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'opened')::NUMERIC / 
                       COUNT(*) FILTER (WHERE event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS open_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'delivered')::NUMERIC / 
                       COUNT(*) FILTER (WHERE event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS delivery_rate,
        COUNT(*) FILTER (WHERE event_type = 'failed') AS failures
    FROM public.notification_events
    WHERE event_time BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Get top performing notifications
CREATE OR REPLACE FUNCTION get_top_notifications(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    notification_id TEXT,
    notification_title TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    open_rate NUMERIC
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ne.notification_id,
        MAX(ne.notification_title) AS notification_title,
        COUNT(*) FILTER (WHERE ne.event_type = 'sent') AS sent_count,
        COUNT(*) FILTER (WHERE ne.event_type = 'opened') AS opened_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE ne.event_type = 'opened')::NUMERIC / 
                       COUNT(*) FILTER (WHERE ne.event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS open_rate
    FROM public.notification_events ne
    WHERE ne.event_time BETWEEN p_start_date AND p_end_date
    GROUP BY ne.notification_id
    HAVING COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0
    ORDER BY open_rate DESC
    LIMIT p_limit;
END;
$$;

-- Get low performing notifications
CREATE OR REPLACE FUNCTION get_low_performing_notifications(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_threshold NUMERIC DEFAULT 20.0
)
RETURNS TABLE (
    notification_id TEXT,
    notification_title TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    open_rate NUMERIC
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ne.notification_id,
        MAX(ne.notification_title) AS notification_title,
        COUNT(*) FILTER (WHERE ne.event_type = 'sent') AS sent_count,
        COUNT(*) FILTER (WHERE ne.event_type = 'opened') AS opened_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE ne.event_type = 'opened')::NUMERIC / 
                       COUNT(*) FILTER (WHERE ne.event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS open_rate
    FROM public.notification_events ne
    WHERE ne.event_time BETWEEN p_start_date AND p_end_date
    GROUP BY ne.notification_id
    HAVING 
        COUNT(*) FILTER (WHERE ne.event_type = 'sent') >= 10 AND
        (COUNT(*) FILTER (WHERE ne.event_type = 'opened')::NUMERIC / 
         COUNT(*) FILTER (WHERE ne.event_type = 'sent')::NUMERIC) * 100 < p_threshold
    ORDER BY open_rate ASC;
END;
$$;

-- Get notification city statistics
CREATE OR REPLACE FUNCTION get_notification_city_stats(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    city TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    open_rate NUMERIC
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ne.city,
        COUNT(*) FILTER (WHERE ne.event_type = 'sent') AS sent_count,
        COUNT(*) FILTER (WHERE ne.event_type = 'opened') AS opened_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE ne.event_type = 'opened')::NUMERIC / 
                       COUNT(*) FILTER (WHERE ne.event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS open_rate
    FROM public.notification_events ne
    WHERE 
        ne.event_time BETWEEN p_start_date AND p_end_date
        AND ne.city IS NOT NULL
    GROUP BY ne.city
    HAVING COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0
    ORDER BY sent_count DESC;
END;
$$;

-- Get notification type statistics
CREATE OR REPLACE FUNCTION get_notification_type_stats(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    notification_type TEXT,
    sent_count BIGINT,
    opened_count BIGINT,
    open_rate NUMERIC
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ne.notification_type, 'normal') AS notification_type,
        COUNT(*) FILTER (WHERE ne.event_type = 'sent') AS sent_count,
        COUNT(*) FILTER (WHERE ne.event_type = 'opened') AS opened_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE ne.event_type = 'sent') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE ne.event_type = 'opened')::NUMERIC / 
                       COUNT(*) FILTER (WHERE ne.event_type = 'sent')::NUMERIC) * 100, 2)
            ELSE 0
        END AS open_rate
    FROM public.notification_events ne
    WHERE ne.event_time BETWEEN p_start_date AND p_end_date
    GROUP BY COALESCE(ne.notification_type, 'normal')
    ORDER BY sent_count DESC;
END;
$$;

-- Get pending scheduled notifications
-- Note: This would require a separate scheduled_notifications table
-- For now, returning empty results as placeholder
CREATE OR REPLACE FUNCTION get_pending_notifications()
RETURNS TABLE (
    notification_id TEXT,
    notification_title TEXT,
    scheduled_time TIMESTAMPTZ,
    target_users BIGINT
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ''::TEXT AS notification_id,
        ''::TEXT AS notification_title,
        NOW() AS scheduled_time,
        0::BIGINT AS target_users
    WHERE FALSE; -- Return empty result set
END;
$$;

-- ============================================================
-- HELPER FUNCTION: Track Notification Event
-- ============================================================

CREATE OR REPLACE FUNCTION track_notification_event(
    p_notification_id TEXT,
    p_user_id UUID,
    p_event_type TEXT,
    p_title TEXT DEFAULT NULL,
    p_body TEXT DEFAULT NULL,
    p_notification_type TEXT DEFAULT 'normal',
    p_city TEXT DEFAULT NULL,
    p_device_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.notification_events (
        notification_id,
        user_id,
        event_type,
        notification_title,
        notification_body,
        notification_type,
        city,
        device_id,
        metadata
    ) VALUES (
        p_notification_id,
        p_user_id,
        p_event_type,
        p_title,
        p_body,
        p_notification_type,
        p_city,
        p_device_id,
        p_metadata
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;
