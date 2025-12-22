-- ============================================================================
-- DASHBOARD FEATURES + UNIVERSAL ANALYTICS EVENTS
-- Admin-only feature manager + app-wide analytics event stream
-- NOTE: This migration is backward-compatible with existing server inserts into
--       analytics_events (legacy columns: event_type/object_type/object_id/properties).
-- ============================================================================

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1) DASHBOARD FEATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  route TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  analytics_key TEXT NOT NULL UNIQUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT dashboard_features_bg_color_hex CHECK (bg_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT dashboard_features_text_color_hex CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- updated_at trigger (reuses update_updated_at_column from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_dashboard_features_updated_at ON dashboard_features;
CREATE TRIGGER update_dashboard_features_updated_at
BEFORE UPDATE ON dashboard_features
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enforce analytics_key immutability
CREATE OR REPLACE FUNCTION prevent_dashboard_feature_analytics_key_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.analytics_key IS DISTINCT FROM OLD.analytics_key THEN
    RAISE EXCEPTION 'analytics_key is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dashboard_features_immutable_analytics_key ON dashboard_features;
CREATE TRIGGER dashboard_features_immutable_analytics_key
BEFORE UPDATE ON dashboard_features
FOR EACH ROW
EXECUTE FUNCTION prevent_dashboard_feature_analytics_key_update();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_features_order ON dashboard_features(order_index);
CREATE INDEX IF NOT EXISTS idx_dashboard_features_visible ON dashboard_features(visible);
CREATE INDEX IF NOT EXISTS idx_dashboard_features_deleted_at ON dashboard_features(deleted_at);

-- RLS
ALTER TABLE dashboard_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible dashboard features" ON dashboard_features;
CREATE POLICY "Public can view visible dashboard features"
  ON dashboard_features
  FOR SELECT
  USING (visible = TRUE AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role can manage dashboard features" ON dashboard_features;
CREATE POLICY "Service role can manage dashboard features"
  ON dashboard_features
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed initial features to match current user dashboard (FeatureGrid.tsx)
-- These are safe defaults so switching to API-driven dashboard won't remove cards.
INSERT INTO dashboard_features (title, subtitle, icon, bg_color, text_color, route, order_index, visible, analytics_key)
VALUES
  ('விசேஷ\nநாட்கள்', NULL, 'diwali', '#DCEBFF', '#264E86', 'murugan-festivals', 0, TRUE, 'murugan-festivals'),
  ('விரத\nநாட்கள்', NULL, 'pray', '#E9E6F9', '#4332A5', 'viratha-days', 1, TRUE, 'viratha-days'),
  ('முருகன்\nகாலண்டர்', NULL, 'murugan-calendar', '#FFF0F5', '#8B0000', 'murugan-calendar', 2, TRUE, 'murugan-calendar'),
  ('புகழ்பெற்ற\nகோவில்கள்', NULL, 'popular-temple', '#E0F5E8', '#006644', 'popular-temples', 3, TRUE, 'popular-temples'),
  ('சுபமுகூர்த்த\nநாட்கள்', NULL, 'rings', '#F1FED5', '#8C6239', 'muhurtham-days', 4, TRUE, 'muhurtham-days'),
  ('கந்த சஷ்டி\nகவசம் பாடல்', NULL, 'kandha-sasti', '#F9EAE6', '#CA3910', 'kandha-sasti-kavasam', 5, TRUE, 'kandha-sasti-kavasam'),
  ('முருகன்\nவரலாறு', NULL, 'murugan-history', '#FFF3E0', '#8C6239', 'murugan-varalaru', 6, TRUE, 'murugan-varalaru'),
  ('விடுமுறை\nநாட்கள்', NULL, 'holiday', '#D5FFD9', '#1CA028', 'holidays-2026', 7, TRUE, 'holidays-2026')
ON CONFLICT (analytics_key) DO NOTHING;

-- ============================================================================
-- 2) UNIVERSAL ANALYTICS EVENT STREAM
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- New universal schema (as requested)
  event_name TEXT NOT NULL DEFAULT 'legacy_event',
  feature_key TEXT,
  page TEXT,
  route TEXT,
  user_id UUID,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Legacy compatibility fields (existing server code references these)
  event_type TEXT,
  object_type TEXT,
  object_id UUID,
  properties JSONB
);

-- Optional: keep metadata in sync for legacy inserts
CREATE OR REPLACE FUNCTION analytics_events_legacy_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- If legacy writes event_type, map it to event_name
  IF (NEW.event_type IS NOT NULL) AND (NEW.event_name = 'legacy_event' OR NEW.event_name IS NULL) THEN
    NEW.event_name := NEW.event_type;
  END IF;

  IF NEW.session_id IS NULL THEN
    NEW.session_id := gen_random_uuid();
  END IF;

  -- If legacy writes properties, merge into metadata
  IF NEW.properties IS NOT NULL THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || NEW.properties;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS analytics_events_legacy_sync_trigger ON analytics_events;
CREATE TRIGGER analytics_events_legacy_sync_trigger
BEFORE INSERT OR UPDATE ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION analytics_events_legacy_sync();

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_feature_key ON analytics_events(feature_key);
CREATE INDEX IF NOT EXISTS idx_analytics_events_route ON analytics_events(route);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can view analytics events" ON analytics_events;
CREATE POLICY "Service role can view analytics events"
  ON analytics_events
  FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3) ANALYTICS SESSIONS (TIME + ENGAGEMENT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID,
  device TEXT,
  platform TEXT,
  app_version TEXT,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  total_duration_seconds INT DEFAULT 0,
  idle_duration_seconds INT DEFAULT 0,
  active_duration_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at DESC);

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics sessions" ON analytics_sessions;
CREATE POLICY "Anyone can insert analytics sessions"
  ON analytics_sessions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can view analytics sessions" ON analytics_sessions;
CREATE POLICY "Service role can view analytics sessions"
  ON analytics_sessions
  FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 4) PAGE ANALYTICS (OPTIONAL PRE-AGG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_page_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  page TEXT NOT NULL,
  date DATE NOT NULL,

  views INT DEFAULT 0,
  avg_time_seconds INT DEFAULT 0,
  scroll_100_percent INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_stats_page_date ON analytics_page_stats(page, date);
CREATE INDEX IF NOT EXISTS idx_analytics_page_stats_date ON analytics_page_stats(date);

ALTER TABLE analytics_page_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics page stats" ON analytics_page_stats;
CREATE POLICY "Service role can manage analytics page stats"
  ON analytics_page_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
