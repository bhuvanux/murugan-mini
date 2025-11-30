-- ============================================================================
-- UNIFIED ANALYTICS SYSTEM - Complete Rebuild
-- IP-Based Unique Tracking for All Modules
-- Future-Proof & Plug-and-Play Architecture
-- ============================================================================

-- Drop old analytics tables and triggers if they exist
DROP TABLE IF EXISTS analytics_tracking CASCADE;
DROP TABLE IF EXISTS media_analytics CASCADE;
DROP TABLE IF EXISTS wallpaper_analytics CASCADE;
DROP TABLE IF EXISTS sparkle_analytics CASCADE;
DROP TABLE IF EXISTS analytics_config CASCADE;

-- ============================================================================
-- 1. MAIN ANALYTICS TABLE (IP-Based Unique Tracking)
-- ============================================================================

CREATE TABLE analytics_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Module & Item Identification
  module_name TEXT NOT NULL CHECK (module_name IN (
    'wallpaper', 'song', 'video', 'sparkle', 'photo', 'ask_gugan', 'banner'
  )),
  item_id UUID NOT NULL,
  
  -- Event Type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view', 'like', 'unlike', 'download', 'share', 
    'play', 'watch_complete', 'read', 'click'
  )),
  
  -- User Identification (IP-based for unique tracking)
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', -- For future extensibility
  
  -- UNIQUE CONSTRAINT: One event per IP per item
  UNIQUE(module_name, item_id, event_type, ip_address)
);

-- Indexes for performance
CREATE INDEX idx_analytics_module_item ON analytics_tracking(module_name, item_id);
CREATE INDEX idx_analytics_event ON analytics_tracking(event_type);
CREATE INDEX idx_analytics_ip ON analytics_tracking(ip_address);
CREATE INDEX idx_analytics_created ON analytics_tracking(created_at DESC);
CREATE INDEX idx_analytics_module_event ON analytics_tracking(module_name, event_type);

-- ============================================================================
-- 2. ANALYTICS CONFIGURATION TABLE (Admin Control)
-- ============================================================================

CREATE TABLE analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Module & Event Configuration
  module_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Control Flags
  is_enabled BOOLEAN DEFAULT TRUE,
  track_anonymous BOOLEAN DEFAULT TRUE, -- Allow tracking without user login
  
  -- Metadata
  display_name TEXT NOT NULL, -- Human-readable name for admin panel
  description TEXT,
  icon TEXT, -- Icon name for UI
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(module_name, event_type)
);

-- Insert default tracking configurations
INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order) VALUES
-- Wallpaper Events
('wallpaper', 'view', 'Wallpaper Views', 'Track when users view wallpapers', 'Eye', 1),
('wallpaper', 'like', 'Wallpaper Likes', 'Track wallpaper favorites', 'Heart', 2),
('wallpaper', 'unlike', 'Wallpaper Unlikes', 'Track when users remove favorites', 'HeartOff', 3),
('wallpaper', 'download', 'Wallpaper Downloads', 'Track wallpaper downloads', 'Download', 4),
('wallpaper', 'share', 'Wallpaper Shares', 'Track wallpaper shares via WhatsApp', 'Share2', 5),
('wallpaper', 'play', 'Video Plays', 'Track video wallpaper plays', 'Play', 6),
('wallpaper', 'watch_complete', 'Video Watch Complete', 'Track when 80% of video is watched', 'CheckCircle', 7),

-- Song Events
('song', 'play', 'Song Plays', 'Track when songs are played', 'Music', 10),
('song', 'like', 'Song Likes', 'Track song favorites', 'Heart', 11),
('song', 'share', 'Song Shares', 'Track song shares', 'Share2', 12),
('song', 'download', 'Song Downloads', 'Track song downloads', 'Download', 13),

-- Sparkle Events
('sparkle', 'view', 'Article Views', 'Track article views', 'Eye', 20),
('sparkle', 'read', 'Article Reads', 'Track full article reads', 'BookOpen', 21),
('sparkle', 'like', 'Article Likes', 'Track article likes', 'Heart', 22),
('sparkle', 'share', 'Article Shares', 'Track article shares', 'Share2', 23),

-- Photo Events
('photo', 'view', 'Photo Views', 'Track photo views', 'Eye', 30),
('photo', 'like', 'Photo Likes', 'Track photo likes', 'Heart', 31),
('photo', 'download', 'Photo Downloads', 'Track photo downloads', 'Download', 32),
('photo', 'share', 'Photo Shares', 'Track photo shares', 'Share2', 33),

-- Ask Gugan Events
('ask_gugan', 'view', 'Chat Sessions', 'Track chat session starts', 'MessageCircle', 40),
('ask_gugan', 'play', 'Messages Sent', 'Track messages sent to AI', 'Send', 41),

-- Banner Events
('banner', 'view', 'Banner Views', 'Track banner impressions', 'Eye', 50),
('banner', 'click', 'Banner Clicks', 'Track banner clicks', 'MousePointer', 51);

-- ============================================================================
-- 3. AGGREGATED STATS VIEW (For Fast Queries)
-- ============================================================================

CREATE MATERIALIZED VIEW analytics_stats_aggregated AS
SELECT 
  module_name,
  item_id,
  event_type,
  COUNT(DISTINCT ip_address) as unique_count,
  COUNT(*) as total_count,
  MAX(created_at) as last_event_at
FROM analytics_tracking
GROUP BY module_name, item_id, event_type;

-- Index on materialized view
CREATE UNIQUE INDEX idx_analytics_stats_unique ON analytics_stats_aggregated(module_name, item_id, event_type);

-- Function to refresh stats (call periodically or after bulk operations)
CREATE OR REPLACE FUNCTION refresh_analytics_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_stats_aggregated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR TRACKING
-- ============================================================================

-- Function to track event (with IP-based uniqueness)
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'mobile',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_result JSONB;
  v_already_tracked BOOLEAN;
BEGIN
  -- Check if tracking is enabled for this event
  SELECT * INTO v_config 
  FROM analytics_config 
  WHERE module_name = p_module_name 
    AND event_type = p_event_type
    AND is_enabled = TRUE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Tracking disabled for this event',
      'tracked', false
    );
  END IF;
  
  -- Check if already tracked
  SELECT EXISTS(
    SELECT 1 FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type
      AND ip_address = p_ip_address
  ) INTO v_already_tracked;
  
  -- Insert if not already tracked (ON CONFLICT DO NOTHING for uniqueness)
  INSERT INTO analytics_tracking (
    module_name, item_id, event_type, 
    ip_address, user_agent, device_type, metadata
  )
  VALUES (
    p_module_name, p_item_id, p_event_type,
    p_ip_address, p_user_agent, p_device_type, p_metadata
  )
  ON CONFLICT (module_name, item_id, event_type, ip_address) 
  DO NOTHING;
  
  -- Get updated count
  RETURN jsonb_build_object(
    'success', true,
    'tracked', NOT v_already_tracked,
    'already_tracked', v_already_tracked,
    'unique_count', (
      SELECT COUNT(DISTINCT ip_address)
      FROM analytics_tracking
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to remove tracking (for unlike events)
CREATE OR REPLACE FUNCTION untrack_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  -- Delete the tracking record
  DELETE FROM analytics_tracking
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type
    AND ip_address = p_ip_address;
  
  v_deleted := FOUND;
  
  -- Get updated count
  RETURN jsonb_build_object(
    'success', true,
    'removed', v_deleted,
    'unique_count', (
      SELECT COUNT(DISTINCT ip_address)
      FROM analytics_tracking
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get stats for an item
CREATE OR REPLACE FUNCTION get_analytics_stats(
  p_module_name TEXT,
  p_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(event_type, unique_count)
  INTO v_result
  FROM (
    SELECT 
      event_type,
      COUNT(DISTINCT ip_address) as unique_count
    FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
    GROUP BY event_type
  ) stats;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP has tracked an event
CREATE OR REPLACE FUNCTION check_analytics_tracked(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type
      AND ip_address = p_ip_address
  );
END;
$$ LANGUAGE plpgsql;

-- Function to reset stats for an item
CREATE OR REPLACE FUNCTION reset_analytics_stats(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  IF p_event_type IS NULL THEN
    -- Reset all events for this item
    DELETE FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id;
  ELSE
    -- Reset specific event
    DELETE FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type;
  END IF;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ADMIN ANALYTICS DASHBOARD QUERIES
-- ============================================================================

-- Function to get dashboard overview
CREATE OR REPLACE FUNCTION get_analytics_dashboard()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events', (SELECT COUNT(*) FROM analytics_tracking),
    'unique_ips', (SELECT COUNT(DISTINCT ip_address) FROM analytics_tracking),
    'modules', (
      SELECT jsonb_object_agg(module_name, stats)
      FROM (
        SELECT 
          module_name,
          jsonb_build_object(
            'total_events', COUNT(*),
            'unique_items', COUNT(DISTINCT item_id),
            'unique_ips', COUNT(DISTINCT ip_address),
            'events_by_type', (
              SELECT jsonb_object_agg(event_type, count)
              FROM (
                SELECT event_type, COUNT(*) as count
                FROM analytics_tracking t2
                WHERE t2.module_name = t1.module_name
                GROUP BY event_type
              ) event_counts
            )
          ) as stats
        FROM analytics_tracking t1
        GROUP BY module_name
      ) module_stats
    )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get top items by event
CREATE OR REPLACE FUNCTION get_top_items_by_event(
  p_module_name TEXT,
  p_event_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  item_id UUID,
  unique_count BIGINT,
  last_event_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.item_id,
    COUNT(DISTINCT t.ip_address) as unique_count,
    MAX(t.created_at) as last_event_at
  FROM analytics_tracking t
  WHERE t.module_name = p_module_name
    AND t.event_type = p_event_type
  GROUP BY t.item_id
  ORDER BY unique_count DESC, last_event_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE analytics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can track events (for anonymous users)
CREATE POLICY "Anyone can track events"
  ON analytics_tracking
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only authenticated users can view analytics
CREATE POLICY "Authenticated users can view analytics"
  ON analytics_tracking
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only service role can delete (for admin reset)
CREATE POLICY "Service role can delete analytics"
  ON analytics_tracking
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Policy: Anyone can view config
CREATE POLICY "Anyone can view config"
  ON analytics_config
  FOR SELECT
  USING (true);

-- Policy: Only service role can modify config
CREATE POLICY "Service role can modify config"
  ON analytics_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. CLEANUP OLD ANALYTICS COLUMNS
-- ============================================================================

-- Update wallpapers table to remove old counter columns (use analytics instead)
-- NOTE: Keep these columns for backward compatibility during migration
-- They will be deprecated in favor of analytics_tracking

-- Add computed columns for easy access (optional)
-- These will query analytics_tracking on-demand

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify installation
SELECT 'Analytics system installed successfully!' as status,
       COUNT(*) as config_entries
FROM analytics_config;
