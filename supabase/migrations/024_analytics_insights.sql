CREATE TABLE IF NOT EXISTS public.analytics_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  related_feature_key TEXT,
  related_page TEXT,
  metric_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_analytics_insights_created_at ON public.analytics_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_acknowledged_created_at ON public.analytics_insights(acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_type_created_at ON public.analytics_insights(insight_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_feature_created_at ON public.analytics_insights(related_feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_page_created_at ON public.analytics_insights(related_page, created_at DESC);

ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics insights" ON public.analytics_insights;
CREATE POLICY "Service role can manage analytics insights"
  ON public.analytics_insights
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
