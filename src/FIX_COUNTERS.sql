-- ====================================================================================
-- FIX COUNTERS - Create RPC Functions for View/Like/Download/Share Tracking
-- ====================================================================================
-- Run this SQL in your Supabase SQL Editor (User Panel Project)
-- This creates 12 atomic increment functions for safe counter tracking
-- ====================================================================================

-- ==================== WALLPAPERS ====================

-- Increment wallpaper views
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallpapers
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$;

-- Increment wallpaper likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallpapers
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$;

-- Decrement wallpaper likes
CREATE OR REPLACE FUNCTION decrement_wallpaper_likes(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallpapers
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = wallpaper_id;
END;
$$;

-- Increment wallpaper downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallpapers
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$;

-- Increment wallpaper shares
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallpapers
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$;

-- ==================== MEDIA (Videos) ====================

-- Increment media views (uses play_count)
CREATE OR REPLACE FUNCTION increment_media_views(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = media_id;
END;
$$;

-- Increment media likes
CREATE OR REPLACE FUNCTION increment_media_likes(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = media_id;
END;
$$;

-- Decrement media likes
CREATE OR REPLACE FUNCTION decrement_media_likes(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = media_id;
END;
$$;

-- Increment media downloads
CREATE OR REPLACE FUNCTION increment_media_downloads(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = media_id;
END;
$$;

-- Increment media shares
CREATE OR REPLACE FUNCTION increment_media_shares(media_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = media_id;
END;
$$;

-- ==================== PHOTOS ====================

-- Increment photo views
CREATE OR REPLACE FUNCTION increment_photo_views(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = photo_id;
END;
$$;

-- Increment photo likes
CREATE OR REPLACE FUNCTION increment_photo_likes(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = photo_id;
END;
$$;

-- Decrement photo likes
CREATE OR REPLACE FUNCTION decrement_photo_likes(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = photo_id;
END;
$$;

-- Increment photo downloads
CREATE OR REPLACE FUNCTION increment_photo_downloads(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = photo_id;
END;
$$;

-- Increment photo shares
CREATE OR REPLACE FUNCTION increment_photo_shares(photo_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE photos
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = photo_id;
END;
$$;

-- ====================================================================================
-- VERIFICATION QUERIES (Run these AFTER the migration to test)
-- ====================================================================================
-- Replace <some-uuid> with actual IDs from your tables
-- 
-- Test wallpaper view increment:
-- SELECT increment_wallpaper_views('<some-wallpaper-uuid>');
-- SELECT id, view_count FROM wallpapers WHERE id = '<same-uuid>';
--
-- Test media like increment:
-- SELECT increment_media_likes('<some-media-uuid>');
-- SELECT id, like_count FROM media WHERE id = '<same-uuid>';
--
-- Test photo download increment:
-- SELECT increment_photo_downloads('<some-photo-uuid>');
-- SELECT id, download_count FROM photos WHERE id = '<same-uuid>';
-- ====================================================================================

-- Grant execute permissions to authenticated users and anon
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
-- MIGRATION COMPLETE
-- ====================================================================================
