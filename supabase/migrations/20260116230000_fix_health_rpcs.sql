-- System Health Analytics RPC
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
        -- Count error events
        count(*) FILTER (WHERE event_type IN ('error', 'api_error', 'system_failure'))::bigint as error_count,
        
        -- Calculate average latency from metadata if available, otherwise 0
        COALESCE(AVG((metadata->>'latency_ms')::numeric), 0) as avg_latency_ms,
        
        -- Count crash events
        count(*) FILTER (WHERE event_type = 'app_crash')::bigint as crash_count
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;
