-- Migration: 007_media_analytics_rpc.sql
-- Description: Add analytics columns and RPCs for media module (songs/videos)

-- 1. Add missing columns to media table if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'add_to_playlist_count') THEN
    ALTER TABLE media ADD COLUMN add_to_playlist_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'media' AND COLUMN_NAME = 'youtube_open_count') THEN
    ALTER TABLE media ADD COLUMN youtube_open_count INTEGER DEFAULT 0;
  END IF;

  -- Ensure other counter columns exist (they should, based on 001_initial_schema.sql)
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

-- 2. Create RPC functions for atomic increments/decrements

-- Increment Plays
CREATE OR REPLACE FUNCTION increment_media_plays(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET play_count = COALESCE(play_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Likes
CREATE OR REPLACE FUNCTION increment_media_likes(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET like_count = COALESCE(like_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement Likes
CREATE OR REPLACE FUNCTION decrement_media_likes(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Downloads
CREATE OR REPLACE FUNCTION increment_media_downloads(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET download_count = COALESCE(download_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Shares
CREATE OR REPLACE FUNCTION increment_media_shares(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET share_count = COALESCE(share_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Playlist Adds
CREATE OR REPLACE FUNCTION increment_media_add_to_playlist(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET add_to_playlist_count = COALESCE(add_to_playlist_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment YouTube Opens
CREATE OR REPLACE FUNCTION increment_media_youtube_opens(p_media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET youtube_open_count = COALESCE(youtube_open_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill Logic (Optional but good)
-- If there's already data in unified_analytics for 'media', we can backfill the counters
DO $$
BEGIN
  -- Backfill play_count
  UPDATE media m
  SET play_count = (
    SELECT count(*)
    FROM unified_analytics u
    WHERE u.module_name = 'media' AND u.item_id = m.id::text AND u.event_type = 'play'
  )
  WHERE m.id IN (
    SELECT (item_id::uuid) FROM unified_analytics WHERE module_name = 'media' AND event_type = 'play'
  );

  -- Backfill like_count
  UPDATE media m
  SET like_count = (
    SELECT count(*)
    FROM unified_analytics u
    WHERE u.module_name = 'media' AND u.item_id = m.id::text AND u.event_type = 'like'
  )
  WHERE m.id IN (
    SELECT (item_id::uuid) FROM unified_analytics WHERE module_name = 'media' AND event_type = 'like'
  );

  -- Backfill share_count
  UPDATE media m
  SET share_count = (
    SELECT count(*)
    FROM unified_analytics u
    WHERE u.module_name = 'media' AND u.item_id = m.id::text AND u.event_type = 'share'
  )
  WHERE m.id IN (
    SELECT (item_id::uuid) FROM unified_analytics WHERE module_name = 'media' AND event_type = 'share'
  );
  
  -- Add more backfills as needed
END $$;
