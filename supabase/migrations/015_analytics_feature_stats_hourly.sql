CREATE TABLE IF NOT EXISTS analytics_feature_stats_hourly (
  feature_key TEXT NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_key, hour)
);

CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_hourly_feature_hour
  ON analytics_feature_stats_hourly(feature_key, hour);

CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_hourly_hour
  ON analytics_feature_stats_hourly(hour);

ALTER TABLE analytics_feature_stats_hourly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics feature stats hourly" ON analytics_feature_stats_hourly;
CREATE POLICY "Service role can manage analytics feature stats hourly"
  ON analytics_feature_stats_hourly
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
