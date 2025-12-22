-- Update daily rollup functions to fully populate existing rollup tables.

-- Feature stats: daily rollup keyed by (feature_key, date)
CREATE OR REPLACE FUNCTION public.rollup_daily_feature_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_feature_stats (feature_key, date, impressions, clicks, avg_time_seconds, last_clicked_at)
  SELECT
    e.feature_key,
    (e.created_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*) FILTER (WHERE e.event_name = 'feature_card_impression')::int AS impressions,
    COUNT(*) FILTER (WHERE e.event_name = 'feature_card_click')::int AS clicks,
    0::int AS avg_time_seconds,
    MAX(e.created_at) FILTER (WHERE e.event_name = 'feature_card_click') AS last_clicked_at
  FROM public.analytics_events e
  WHERE e.created_at >= from_ts
    AND e.created_at < to_ts
    AND e.feature_key IS NOT NULL
    AND e.event_name IN ('feature_card_impression', 'feature_card_click')
  GROUP BY e.feature_key, (e.created_at AT TIME ZONE 'utc')::date
  ON CONFLICT (feature_key, date)
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    avg_time_seconds = EXCLUDED.avg_time_seconds,
    last_clicked_at = EXCLUDED.last_clicked_at;
END;
$$;

-- Session stats: daily rollup keyed by date
CREATE OR REPLACE FUNCTION public.rollup_daily_session_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_session_stats (
    date,
    sessions,
    unique_users,
    avg_total_duration_seconds,
    avg_active_duration_seconds,
    avg_idle_duration_seconds
  )
  SELECT
    (s.started_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*)::int AS sessions,
    COUNT(DISTINCT s.user_id)::int AS unique_users,
    COALESCE(ROUND(AVG(s.total_duration_seconds))::int, 0) AS avg_total_duration_seconds,
    COALESCE(ROUND(AVG(s.active_duration_seconds))::int, 0) AS avg_active_duration_seconds,
    COALESCE(ROUND(AVG(s.idle_duration_seconds))::int, 0) AS avg_idle_duration_seconds
  FROM public.analytics_sessions s
  WHERE s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY (s.started_at AT TIME ZONE 'utc')::date
  ON CONFLICT (date)
  DO UPDATE SET
    sessions = EXCLUDED.sessions,
    unique_users = EXCLUDED.unique_users,
    avg_total_duration_seconds = EXCLUDED.avg_total_duration_seconds,
    avg_active_duration_seconds = EXCLUDED.avg_active_duration_seconds,
    avg_idle_duration_seconds = EXCLUDED.avg_idle_duration_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_daily_feature_stats(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollup_daily_session_stats(timestamptz, timestamptz) FROM PUBLIC;
