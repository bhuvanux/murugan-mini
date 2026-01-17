-- Notifications Analytics RPCs
CREATE OR REPLACE FUNCTION get_notification_stats(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (
    total_sent bigint,
    open_rate numeric,
    failures bigint
) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        count(*)::bigint as total_sent,
        
        CASE WHEN count(*) = 0 THEN 0 
        ELSE (count(*) FILTER (WHERE event_type = 'notification_opened')::numeric / NULLIF(count(*), 0)::numeric) * 100 
        END as open_rate,
        
        count(*) FILTER (WHERE event_type = 'notification_failed')::bigint as failures
    FROM public.analytics_tracking
    WHERE event_type IN ('notification_sent', 'notification_opened', 'notification_failed')
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Storage Analytics RPCs
CREATE OR REPLACE FUNCTION get_storage_by_module()
RETURNS TABLE (module_name text, storage_bytes bigint)
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    -- Using a mock or a real join if storage assets table exists. 
    -- Assuming a 'storage_assets' view or table is needed.
    -- For now, returning aggregation from analytics if available, or empty if not.
    RETURN QUERY
    SELECT 
        COALESCE(metadata->>'module', 'General')::text as module_name,
        SUM((metadata->>'size_bytes')::bigint)::bigint as storage_bytes
    FROM public.analytics_tracking
    WHERE event_type = 'storage_upload'
    GROUP BY 1
    ORDER BY 2 DESC;
END;
$$;
