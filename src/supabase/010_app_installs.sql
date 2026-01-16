-- ============================================================================
-- APP INSTALL TRACKING - MIGRATION SCRIPT
-- ============================================================================

-- 1. Create app_installs table
CREATE TABLE IF NOT EXISTS app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Device Identification
  device_id TEXT NOT NULL,
  
  -- Device Information
  platform TEXT NOT NULL, -- ios, android, web
  os_version TEXT,
  model TEXT,
  manufacturer TEXT,
  app_version TEXT,
  
  -- Connection Info
  ip_address TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  
  -- Activity Tracking (Churn)
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UNIQUE CONSTRAINT: One record per device
  UNIQUE(device_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_installs_platform ON app_installs(platform);
CREATE INDEX IF NOT EXISTS idx_app_installs_created_at ON app_installs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_installs_device_id ON app_installs(device_id);
CREATE INDEX IF NOT EXISTS idx_app_installs_last_active ON app_installs(last_active_at);
CREATE INDEX IF NOT EXISTS idx_app_installs_country_code ON app_installs(country_code);

-- 3. Add to analytics_config if not exists
INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
VALUES ('app', 'install', 'App Installs', 'Track unique app installations', 'Download', 0)
ON CONFLICT (module_name, event_type) DO NOTHING;

-- 4. RLS Policies
ALTER TABLE app_installs ENABLE ROW LEVEL SECURITY;

-- Anyone can track install
CREATE POLICY "Anyone can track install"
  ON app_installs
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update heartbeat (based on device_id)
CREATE POLICY "Anyone can update heartbeat"
    ON app_installs
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Authenticated/Service role can view
CREATE POLICY "Admin can view installs"
  ON app_installs
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 5. Helper function for advanced insights (Optional)
CREATE OR REPLACE FUNCTION get_install_stats_by_period(p_period TEXT DEFAULT 'day', p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
  period_start TIMESTAMP WITH TIME ZONE,
  install_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc(p_period, created_at) as period_start,
    COUNT(*) as install_count
  FROM app_installs
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
