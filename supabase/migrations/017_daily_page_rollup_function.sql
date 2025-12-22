-- Daily page rollup function (DB-side aggregation)

CREATE OR REPLACE FUNCTION public.rollup_daily_page_stats(from_ts timestamptz, to_ts timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_page_stats (page, date, views, avg_time_seconds, scroll_100_percent)
  SELECT
    COALESCE(e.page, e.route, 'unknown') AS page,
    (e.created_at AT TIME ZONE 'utc')::date AS date,
    COUNT(*) FILTER (WHERE e.event_name = 'page_enter')::int AS views,
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
    COUNT(*) FILTER (WHERE e.event_name = 'scroll_100')::int AS scroll_100_percent
  FROM public.analytics_events e
  WHERE e.created_at >= from_ts
    AND e.created_at < to_ts
    AND e.event_name IN ('page_enter', 'time_spent', 'scroll_100')
  GROUP BY COALESCE(e.page, e.route, 'unknown'), (e.created_at AT TIME ZONE 'utc')::date
  ON CONFLICT (page, date)
  DO UPDATE SET
    views = EXCLUDED.views,
    avg_time_seconds = EXCLUDED.avg_time_seconds,
    scroll_100_percent = EXCLUDED.scroll_100_percent;
END;
$$;

REVOKE ALL ON FUNCTION public.rollup_daily_page_stats(timestamptz, timestamptz) FROM PUBLIC;
