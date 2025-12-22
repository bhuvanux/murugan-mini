CREATE TABLE IF NOT EXISTS analytics_feature_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_time_seconds INT DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_key, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_feature_date ON analytics_feature_stats(feature_key, date);
CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_date ON analytics_feature_stats(date);

ALTER TABLE analytics_feature_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics feature stats" ON analytics_feature_stats;
CREATE POLICY "Service role can manage analytics feature stats"
  ON analytics_feature_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS analytics_session_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  sessions INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  avg_total_duration_seconds INT DEFAULT 0,
  avg_active_duration_seconds INT DEFAULT 0,
  avg_idle_duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_session_stats_date ON analytics_session_stats(date);

ALTER TABLE analytics_session_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics session stats" ON analytics_session_stats;
CREATE POLICY "Service role can manage analytics session stats"
  ON analytics_session_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
