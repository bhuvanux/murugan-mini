-- Add hourly bucket support to analytics_feature_stats (STEP 5)
-- Keeps existing daily rows (date) while allowing hourly rows (hour).

ALTER TABLE analytics_feature_stats
  ADD COLUMN IF NOT EXISTS hour TIMESTAMPTZ;

-- Allow hourly uniqueness (date stays supported via the existing UNIQUE(feature_key, date))
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_feature_stats_feature_hour_unique'
  ) THEN
    ALTER TABLE analytics_feature_stats
      ADD CONSTRAINT analytics_feature_stats_feature_hour_unique UNIQUE(feature_key, hour);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_feature_hour
  ON analytics_feature_stats(feature_key, hour);

CREATE INDEX IF NOT EXISTS idx_analytics_feature_stats_hour
  ON analytics_feature_stats(hour);
