-- Analytics retention purge (raw tables)

CREATE OR REPLACE FUNCTION public.purge_old_analytics(retention_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_events timestamptz;
  cutoff_sessions timestamptz;
  deleted_events bigint := 0;
  deleted_sessions bigint := 0;
BEGIN
  retention_days := LEAST(GREATEST(COALESCE(retention_days, 90), 7), 365);

  cutoff_events := now() - make_interval(days => retention_days);
  cutoff_sessions := now() - make_interval(days => retention_days);

  DELETE FROM public.analytics_events
  WHERE created_at < cutoff_events;
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  DELETE FROM public.analytics_sessions
  WHERE started_at < cutoff_sessions;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  RETURN jsonb_build_object(
    'retention_days', retention_days,
    'cutoff_events', cutoff_events,
    'cutoff_sessions', cutoff_sessions,
    'deleted_events', deleted_events,
    'deleted_sessions', deleted_sessions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_analytics(integer) FROM PUBLIC;
