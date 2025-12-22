ALTER TABLE IF EXISTS public.analytics_page_stats
  ADD COLUMN IF NOT EXISTS scroll_25_sessions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scroll_50_sessions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scroll_75_sessions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS button_clicks INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anchor_clicks INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_date_selects INT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.analytics_session_stats
  ADD COLUMN IF NOT EXISTS total_events INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.rollup_daily_page_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_page_stats (
    page,
    date,
    views,
    avg_time_seconds,
    scroll_100_percent,
    scroll_25_sessions,
    scroll_50_sessions,
    scroll_75_sessions,
    button_clicks,
    anchor_clicks,
    calendar_date_selects
  )
  SELECT
    COALESCE(e.page, e.route, 'unknown') AS page,
    (e.created_at AT TIME ZONE 'utc')::date AS date,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'page_enter')::int AS views,
    COALESCE(
      ROUND(AVG(
        CASE
          WHEN e.event_name = 'time_spent'
          THEN NULLIF((e.metadata->>'seconds')::numeric, 0)
          ELSE NULL
        END
      ))::int,
      0
    ) AS avg_time_seconds,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'scroll_100')::int AS scroll_100_percent,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'scroll_25')::int AS scroll_25_sessions,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'scroll_50')::int AS scroll_50_sessions,
    COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'scroll_75')::int AS scroll_75_sessions,
    COUNT(*) FILTER (WHERE e.event_name = 'button_click')::int AS button_clicks,
    COUNT(*) FILTER (WHERE e.event_name = 'anchor_click')::int AS anchor_clicks,
    COUNT(*) FILTER (WHERE e.event_name = 'calendar_date_select')::int AS calendar_date_selects
  FROM public.analytics_events e
  WHERE e.created_at >= from_ts
    AND e.created_at < to_ts
    AND e.event_name IN (
      'page_enter',
      'time_spent',
      'scroll_25',
      'scroll_50',
      'scroll_75',
      'scroll_100',
      'button_click',
      'anchor_click',
      'calendar_date_select'
    )
  GROUP BY COALESCE(e.page, e.route, 'unknown'), (e.created_at AT TIME ZONE 'utc')::date
  ON CONFLICT (page, date)
  DO UPDATE SET
    views = EXCLUDED.views,
    avg_time_seconds = EXCLUDED.avg_time_seconds,
    scroll_100_percent = EXCLUDED.scroll_100_percent,
    scroll_25_sessions = EXCLUDED.scroll_25_sessions,
    scroll_50_sessions = EXCLUDED.scroll_50_sessions,
    scroll_75_sessions = EXCLUDED.scroll_75_sessions,
    button_clicks = EXCLUDED.button_clicks,
    anchor_clicks = EXCLUDED.anchor_clicks,
    calendar_date_selects = EXCLUDED.calendar_date_selects;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_daily_page_stats(timestamptz, timestamptz) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rollup_daily_session_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ev AS (
    SELECT
      (e.created_at AT TIME ZONE 'utc')::date AS date,
      COUNT(*)::int AS total_events
    FROM public.analytics_events e
    WHERE e.created_at >= from_ts
      AND e.created_at < to_ts
    GROUP BY (e.created_at AT TIME ZONE 'utc')::date
  )
  INSERT INTO public.analytics_session_stats (
    date,
    sessions,
    unique_users,
    avg_total_duration_seconds,
    avg_active_duration_seconds,
    avg_idle_duration_seconds,
    total_events
  )
  SELECT
    (s.started_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*)::int AS sessions,
    COUNT(DISTINCT s.user_id)::int AS unique_users,
    COALESCE(ROUND(AVG(s.total_duration_seconds))::int, 0) AS avg_total_duration_seconds,
    COALESCE(ROUND(AVG(s.active_duration_seconds))::int, 0) AS avg_active_duration_seconds,
    COALESCE(ROUND(AVG(s.idle_duration_seconds))::int, 0) AS avg_idle_duration_seconds,
    COALESCE(ev.total_events, 0)::int AS total_events
  FROM public.analytics_sessions s
  LEFT JOIN ev ON ev.date = (s.started_at AT TIME ZONE 'utc')::date
  WHERE s.started_at >= from_ts
    AND s.started_at < to_ts
  GROUP BY (s.started_at AT TIME ZONE 'utc')::date, ev.total_events
  ON CONFLICT (date)
  DO UPDATE SET
    sessions = EXCLUDED.sessions,
    unique_users = EXCLUDED.unique_users,
    avg_total_duration_seconds = EXCLUDED.avg_total_duration_seconds,
    avg_active_duration_seconds = EXCLUDED.avg_active_duration_seconds,
    avg_idle_duration_seconds = EXCLUDED.avg_idle_duration_seconds,
    total_events = EXCLUDED.total_events;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_daily_session_stats(timestamptz, timestamptz) FROM PUBLIC;
