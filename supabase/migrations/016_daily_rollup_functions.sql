-- Daily rollup functions for production-grade, DB-side aggregation
-- Called by Edge cron to populate daily rollup tables.

-- Feature stats: (feature_key, date, impressions, clicks)
CREATE OR REPLACE FUNCTION public.rollup_daily_feature_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_feature_stats (feature_key, date, impressions, clicks)
  SELECT
    e.feature_key,
    (e.created_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*) FILTER (WHERE e.event_name = 'feature_card_impression')::int AS impressions,
    COUNT(*) FILTER (WHERE e.event_name = 'feature_card_click')::int AS clicks
  FROM public.analytics_events e
  WHERE e.created_at >= from_ts
    AND e.created_at < to_ts
    AND e.feature_key IS NOT NULL
    AND e.event_name IN ('feature_card_impression', 'feature_card_click')
  GROUP BY e.feature_key, (e.created_at AT TIME ZONE 'utc')::date
  ON CONFLICT (feature_key, date)
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks;
END;
$$;

-- Session stats: (date, sessions, avg_active_duration_seconds)
CREATE OR REPLACE FUNCTION public.rollup_daily_session_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_session_stats (date, sessions, avg_active_duration_seconds)
  SELECT
    (s.started_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*)::int AS sessions,
    COALESCE(ROUND(AVG(s.active_duration_seconds))::int, 0) AS avg_active_duration_seconds
  FROM public.analytics_sessions s
  WHERE s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY (s.started_at AT TIME ZONE 'utc')::date
  ON CONFLICT (date)
  DO UPDATE SET
    sessions = EXCLUDED.sessions,
    avg_active_duration_seconds = EXCLUDED.avg_active_duration_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_daily_feature_stats(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollup_daily_session_stats(timestamptz, timestamptz) FROM PUBLIC;
