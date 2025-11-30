-- ====================================================================================
-- FIX COUNTERS - FLEXIBLE VERSION (Handles Both Column Name Conventions)
-- ====================================================================================
-- This version checks which column names exist and creates the right functions
-- Run this INSTEAD of the original FIX_COUNTERS.sql if you had column name issues
-- ====================================================================================

-- First, let's check what columns exist in wallpapers table
DO $$
DECLARE
    has_view_count boolean;
    has_views boolean;
    has_like_count boolean;
    has_likes boolean;
    has_download_count boolean;
    has_downloads boolean;
    has_share_count boolean;
    has_shares boolean;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'view_count'
    ) INTO has_view_count;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'views'
    ) INTO has_views;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'like_count'
    ) INTO has_like_count;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'likes'
    ) INTO has_likes;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'download_count'
    ) INTO has_download_count;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'downloads'
    ) INTO has_downloads;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'share_count'
    ) INTO has_share_count;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallpapers' AND column_name = 'shares'
    ) INTO has_shares;
    
    -- Report findings
    RAISE NOTICE 'Column Analysis for wallpapers table:';
    RAISE NOTICE '  view_count exists: %', has_view_count;
    RAISE NOTICE '  views exists: %', has_views;
    RAISE NOTICE '  like_count exists: %', has_like_count;
    RAISE NOTICE '  likes exists: %', has_likes;
    RAISE NOTICE '  download_count exists: %', has_download_count;
    RAISE NOTICE '  downloads exists: %', has_downloads;
    RAISE NOTICE '  share_count exists: %', has_share_count;
    RAISE NOTICE '  shares exists: %', has_shares;
END $$;

-- ====================================================================================
-- OPTION 1: If your columns are view_count, like_count, download_count, share_count
-- ====================================================================================

-- Increment wallpaper views (using view_count)
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try view_count first
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'view_count') THEN
    UPDATE wallpapers
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = wallpaper_id;
  -- Fall back to views
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'views') THEN
    UPDATE wallpapers
    SET views = COALESCE(views, 0) + 1
    WHERE id = wallpaper_id;
  ELSE
    RAISE EXCEPTION 'Neither view_count nor views column exists in wallpapers table';
  END IF;
END;
$$;

-- Increment wallpaper likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') THEN
    UPDATE wallpapers
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = wallpaper_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'likes') THEN
    UPDATE wallpapers
    SET likes = COALESCE(likes, 0) + 1
    WHERE id = wallpaper_id;
  ELSE
    RAISE EXCEPTION 'Neither like_count nor likes column exists in wallpapers table';
  END IF;
END;
$$;

-- Decrement wallpaper likes
CREATE OR REPLACE FUNCTION decrement_wallpaper_likes(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') THEN
    UPDATE wallpapers
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = wallpaper_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'likes') THEN
    UPDATE wallpapers
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = wallpaper_id;
  ELSE
    RAISE EXCEPTION 'Neither like_count nor likes column exists in wallpapers table';
  END IF;
END;
$$;

-- Increment wallpaper downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'download_count') THEN
    UPDATE wallpapers
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = wallpaper_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'downloads') THEN
    UPDATE wallpapers
    SET downloads = COALESCE(downloads, 0) + 1
    WHERE id = wallpaper_id;
  ELSE
    RAISE EXCEPTION 'Neither download_count nor downloads column exists in wallpapers table';
  END IF;
END;
$$;

-- Increment wallpaper shares
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'share_count') THEN
    UPDATE wallpapers
    SET share_count = COALESCE(share_count, 0) + 1
    WHERE id = wallpaper_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'shares') THEN
    UPDATE wallpapers
    SET shares = COALESCE(shares, 0) + 1
    WHERE id = wallpaper_id;
  ELSE
    RAISE EXCEPTION 'Neither share_count nor shares column exists in wallpapers table';
  END IF;
END;
$$;

-- ====================================================================================
-- MEDIA TABLE (Videos) - Flexible Version
-- ====================================================================================

-- Increment media views (uses play_count OR views)
CREATE OR REPLACE FUNCTION increment_media_views(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'play_count') THEN
    UPDATE media
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'view_count') THEN
    UPDATE media
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'views') THEN
    UPDATE media
    SET views = COALESCE(views, 0) + 1
    WHERE id = media_id;
  END IF;
END;
$$;

-- Increment media likes
CREATE OR REPLACE FUNCTION increment_media_likes(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'like_count') THEN
    UPDATE media
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'likes') THEN
    UPDATE media
    SET likes = COALESCE(likes, 0) + 1
    WHERE id = media_id;
  END IF;
END;
$$;

-- Decrement media likes
CREATE OR REPLACE FUNCTION decrement_media_likes(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'like_count') THEN
    UPDATE media
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'likes') THEN
    UPDATE media
    SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
    WHERE id = media_id;
  END IF;
END;
$$;

-- Increment media downloads
CREATE OR REPLACE FUNCTION increment_media_downloads(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'download_count') THEN
    UPDATE media
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'downloads') THEN
    UPDATE media
    SET downloads = COALESCE(downloads, 0) + 1
    WHERE id = media_id;
  END IF;
END;
$$;

-- Increment media shares
CREATE OR REPLACE FUNCTION increment_media_shares(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'share_count') THEN
    UPDATE media
    SET share_count = COALESCE(share_count, 0) + 1
    WHERE id = media_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'shares') THEN
    UPDATE media
    SET shares = COALESCE(shares, 0) + 1
    WHERE id = media_id;
  END IF;
END;
$$;

-- ====================================================================================
-- PHOTOS TABLE - Flexible Version
-- ====================================================================================

CREATE OR REPLACE FUNCTION increment_photo_views(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'view_count') THEN
    UPDATE photos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = photo_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'views') THEN
    UPDATE photos SET views = COALESCE(views, 0) + 1 WHERE id = photo_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_photo_likes(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'like_count') THEN
    UPDATE photos SET like_count = COALESCE(like_count, 0) + 1 WHERE id = photo_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'likes') THEN
    UPDATE photos SET likes = COALESCE(likes, 0) + 1 WHERE id = photo_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_photo_likes(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'like_count') THEN
    UPDATE photos SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = photo_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'likes') THEN
    UPDATE photos SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = photo_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_photo_downloads(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'download_count') THEN
    UPDATE photos SET download_count = COALESCE(download_count, 0) + 1 WHERE id = photo_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'downloads') THEN
    UPDATE photos SET downloads = COALESCE(downloads, 0) + 1 WHERE id = photo_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_photo_shares(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'share_count') THEN
    UPDATE photos SET share_count = COALESCE(share_count, 0) + 1 WHERE id = photo_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'shares') THEN
    UPDATE photos SET shares = COALESCE(shares, 0) + 1 WHERE id = photo_id;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_wallpaper_views TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_wallpaper_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_wallpaper_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_wallpaper_downloads TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_wallpaper_shares TO authenticated, anon;

GRANT EXECUTE ON FUNCTION increment_media_views TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_media_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_media_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_media_downloads TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_media_shares TO authenticated, anon;

GRANT EXECUTE ON FUNCTION increment_photo_views TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_photo_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_photo_likes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_photo_downloads TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_photo_shares TO authenticated, anon;

-- ====================================================================================
-- VERIFICATION - Run these to test
-- ====================================================================================
-- Get a wallpaper ID and test:
-- SELECT id FROM wallpapers LIMIT 1;
-- SELECT increment_wallpaper_views('<wallpaper-id>');
-- SELECT * FROM wallpapers WHERE id = '<wallpaper-id>';
-- ====================================================================================
