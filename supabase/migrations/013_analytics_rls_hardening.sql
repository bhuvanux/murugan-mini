-- Harden analytics RLS: clients should NOT write to analytics tables directly.
-- Edge Functions use the service role key and will continue to work.

-- ============================
-- analytics_events
-- ============================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;

DROP POLICY IF EXISTS "Service role can manage analytics events" ON analytics_events;
CREATE POLICY "Service role can manage analytics events"
  ON analytics_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================
-- analytics_sessions
-- ============================
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics sessions" ON analytics_sessions;

DROP POLICY IF EXISTS "Service role can manage analytics sessions" ON analytics_sessions;
CREATE POLICY "Service role can manage analytics sessions"
  ON analytics_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
