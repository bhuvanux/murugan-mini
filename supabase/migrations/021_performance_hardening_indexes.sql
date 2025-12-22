ALTER INDEX IF EXISTS public.idx_analytics_events_created_at RENAME TO idx_events_created_at;

CREATE INDEX IF NOT EXISTS idx_events_created_at
ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_feature_event_time
ON public.analytics_events (feature_key, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_page_event_time
ON public.analytics_events (page, event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_session_time
ON public.analytics_events (session_id, created_at);

DROP INDEX IF EXISTS public.idx_analytics_events_session_id;

ALTER INDEX IF EXISTS public.idx_analytics_sessions_started_at RENAME TO idx_sessions_started_at;
ALTER INDEX IF EXISTS public.idx_analytics_sessions_user_id RENAME TO idx_sessions_user;

CREATE INDEX IF NOT EXISTS idx_sessions_started_at
ON public.analytics_sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON public.analytics_sessions (user_id);

DROP INDEX IF EXISTS public.idx_analytics_feature_stats_date;
DROP INDEX IF EXISTS public.idx_feature_stats_date;

CREATE INDEX IF NOT EXISTS idx_feature_stats_date
ON public.analytics_feature_stats (date DESC);

DROP INDEX IF EXISTS public.idx_feature_stats_unique;
CREATE UNIQUE INDEX idx_feature_stats_unique
ON public.analytics_feature_stats (feature_key, date);

ALTER TABLE public.analytics_feature_stats
  DROP CONSTRAINT IF EXISTS analytics_feature_stats_feature_key_date_key;

ALTER TABLE public.analytics_feature_stats
  DROP CONSTRAINT IF EXISTS analytics_feature_stats_unique;

ALTER TABLE public.analytics_feature_stats
  ADD CONSTRAINT analytics_feature_stats_unique UNIQUE USING INDEX idx_feature_stats_unique;

DROP INDEX IF EXISTS public.idx_analytics_page_stats_date;
DROP INDEX IF EXISTS public.idx_page_stats_date;

CREATE INDEX IF NOT EXISTS idx_page_stats_date
ON public.analytics_page_stats (date DESC);

DROP INDEX IF EXISTS public.idx_page_stats_unique;
CREATE UNIQUE INDEX idx_page_stats_unique
ON public.analytics_page_stats (page, date);

ALTER TABLE public.analytics_page_stats
  DROP CONSTRAINT IF EXISTS analytics_page_stats_page_date_key;

ALTER TABLE public.analytics_page_stats
  DROP CONSTRAINT IF EXISTS analytics_page_stats_unique;

ALTER TABLE public.analytics_page_stats
  ADD CONSTRAINT analytics_page_stats_unique UNIQUE USING INDEX idx_page_stats_unique;

CREATE INDEX IF NOT EXISTS idx_features_visible_order
ON public.dashboard_features (visible, order_index);

CREATE TABLE IF NOT EXISTS public.analytics_system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_system_logs_created_at
  ON public.analytics_system_logs (created_at DESC);

ALTER TABLE public.analytics_system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics system logs" ON public.analytics_system_logs;
CREATE POLICY "Service role can manage analytics system logs"
  ON public.analytics_system_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
