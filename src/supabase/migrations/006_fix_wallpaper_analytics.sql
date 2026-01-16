-- ============================================================================
-- FIX WALLPAPER ANALYTICS - Table Naming and Missing RPCs
-- ============================================================================

-- 1. Rename analytics_tracking to unified_analytics if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_tracking') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_analytics') THEN
            -- Rename if target doesn't exist
            ALTER TABLE analytics_tracking RENAME TO unified_analytics;
            -- Rename indexes if they were created with specific names
            ALTER INDEX IF EXISTS idx_analytics_module_item RENAME TO idx_unified_analytics_module_item;
            ALTER INDEX IF EXISTS idx_analytics_event RENAME TO idx_unified_analytics_event;
            ALTER INDEX IF EXISTS idx_analytics_ip RENAME TO idx_unified_analytics_ip;
            ALTER INDEX IF EXISTS idx_analytics_created RENAME TO idx_unified_analytics_created;
            ALTER INDEX IF EXISTS idx_analytics_module_event RENAME TO idx_unified_analytics_module_event;
        ELSE
            -- Both exist, merge data and drop the old one
            -- First drop dependent materialized view
            DROP MATERIALIZED VIEW IF EXISTS analytics_stats_aggregated;

            INSERT INTO unified_analytics (module_name, item_id, event_type, ip_address, user_agent, device_type, metadata, created_at)
            SELECT t.module_name, t.item_id, t.event_type, t.ip_address, t.user_agent, t.device_type, t.metadata, t.created_at
            FROM analytics_tracking t
            WHERE NOT EXISTS (
                SELECT 1 FROM unified_analytics u
                WHERE u.module_name = t.module_name
                  AND u.item_id = t.item_id
                  AND u.event_type = t.event_type
                  AND u.ip_address = t.ip_address
            );
            
            DROP TABLE analytics_tracking;

            -- Re-create materialized view pointing to unified_analytics
            CREATE MATERIALIZED VIEW analytics_stats_aggregated AS
            SELECT 
              module_name,
              item_id,
              event_type,
              COUNT(DISTINCT ip_address) as unique_count,
              COUNT(*) as total_count,
              MAX(created_at) as last_event_at
            FROM unified_analytics
            GROUP BY module_name, item_id, event_type;

            CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_stats_unique ON analytics_stats_aggregated(module_name, item_id, event_type);
        END IF;
    END IF;
END $$;

-- 2. Create unified_analytics table if it still doesn't exist
CREATE TABLE IF NOT EXISTS unified_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  item_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_name, item_id, event_type, ip_address)
);

-- 3. Ensure indexes for unified_analytics
CREATE INDEX IF NOT EXISTS idx_unified_analytics_module_item ON unified_analytics(module_name, item_id);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_event_type ON unified_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_created_at ON unified_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_ip ON unified_analytics(ip_address);

-- 4. Add counter columns to wallpapers if missing
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0 NOT NULL;

-- 5. Implement Wallpaper Increment/Decrement RPCs

-- Drop existing functions first to avoid parameter name conflicts (PostgreSQL 42P13 error)
DROP FUNCTION IF EXISTS increment_wallpaper_views(UUID);
DROP FUNCTION IF EXISTS increment_wallpaper_likes(UUID);
DROP FUNCTION IF EXISTS decrement_wallpaper_likes(UUID);
DROP FUNCTION IF EXISTS increment_wallpaper_downloads(UUID);
DROP FUNCTION IF EXISTS increment_wallpaper_shares(UUID);

-- Increment wallpaper views
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET view_count = view_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = like_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement wallpaper likes (for unlikes)
CREATE OR REPLACE FUNCTION decrement_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = GREATEST(0, like_count - 1) WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET download_count = download_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper shares
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET share_count = share_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Updated track_analytics_event RPC
DROP FUNCTION IF EXISTS track_analytics_event(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION track_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_already_tracked BOOLEAN;
  v_unique_count INTEGER;
BEGIN
  -- Check if already tracked
  SELECT EXISTS (
    SELECT 1 FROM unified_analytics
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type
      AND ip_address = p_ip_address
  ) INTO v_already_tracked;
  
  IF NOT v_already_tracked THEN
    -- Insert the event
    INSERT INTO unified_analytics (
      module_name, item_id, event_type, ip_address,
      user_agent, device_type, metadata
    ) VALUES (
      p_module_name, p_item_id, p_event_type, p_ip_address,
      p_user_agent, p_device_type, p_metadata
    );
  END IF;
  
  -- Get updated unique count
  SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
  FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type;
  
  RETURN jsonb_build_object(
    'tracked', NOT v_already_tracked,
    'already_tracked', v_already_tracked,
    'unique_count', v_unique_count
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Updated untrack_analytics_event RPC
DROP FUNCTION IF EXISTS untrack_analytics_event(TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION untrack_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT
) RETURNS JSONB AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type
    AND ip_address = p_ip_address;
  
  v_deleted := FOUND;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed', v_deleted,
    'unique_count', (
      SELECT COUNT(DISTINCT ip_address)
      FROM unified_analytics
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Backfill wallpaper counters from existing analytics data
DO $$
BEGIN
  -- Backfill view_count
  UPDATE wallpapers w
  SET view_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics
    WHERE module_name = 'wallpaper'
      AND item_id = w.id
      AND event_type = 'view'
  );

  -- Backfill like_count
  UPDATE wallpapers w
  SET like_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics
    WHERE module_name = 'wallpaper'
      AND item_id = w.id
      AND event_type = 'like'
  );

  -- Backfill download_count
  UPDATE wallpapers w
  SET download_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics
    WHERE module_name = 'wallpaper'
      AND item_id = w.id
      AND event_type = 'download'
  );

  -- Backfill share_count
  UPDATE wallpapers w
  SET share_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics
    WHERE module_name = 'wallpaper'
      AND item_id = w.id
      AND event_type = 'share'
  );
END $$;
