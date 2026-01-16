-- ============================================================================
-- BACKFILL MEDIA COUNTERS
-- Syncs 'media' table counters with 'unified_analytics'
-- ============================================================================

-- Add missing columns if they don't exist (Safety check)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'add_to_playlist_count') THEN
    ALTER TABLE media ADD COLUMN add_to_playlist_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'youtube_open_count') THEN
    ALTER TABLE media ADD COLUMN youtube_open_count INTEGER DEFAULT 0;
  END IF;
  
  -- Ensure other counter columns exist
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'play_count') THEN
    ALTER TABLE media ADD COLUMN play_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'like_count') THEN
    ALTER TABLE media ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'download_count') THEN
    ALTER TABLE media ADD COLUMN download_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'share_count') THEN
    ALTER TABLE media ADD COLUMN share_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Backfill Plays (views) - maps 'play' AND 'play_video_inline' to play_count
UPDATE media m
SET play_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type IN ('play', 'play_video_inline', 'view')
);

-- Backfill Likes
UPDATE media m
SET like_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type = 'like'
);

-- Backfill Shares
UPDATE media m
SET share_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type = 'share'
);

-- Backfill Downloads
UPDATE media m
SET download_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type = 'download'
);

-- Backfill YouTube Opens
UPDATE media m
SET youtube_open_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type = 'open_in_youtube'
);

-- Backfill Playlist Adds
UPDATE media m
SET add_to_playlist_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name IN ('media', 'song', 'video')
    AND ua.item_id = m.id
    AND ua.event_type = 'add_to_playlist'
);
