-- ====================================================================
-- FIX: CREATE MISSING RPC FUNCTIONS FOR COUNTER INCREMENTS
-- ====================================================================
-- 
-- Issue: Backend calls increment_media_views, increment_media_likes, etc.
--        but these functions don't exist in the database.
-- 
-- Solution: Create all required RPC functions for wallpapers, media, and photos.
-- 
-- Run this in Supabase Dashboard → SQL Editor
-- ====================================================================

-- ====================================================================
-- WALLPAPERS TABLE COUNTER FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET share_count = share_count + 1,
      updated_at = NOW()
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- MEDIA TABLE COUNTER FUNCTIONS (Songs, Videos, YouTube)
-- ====================================================================
-- Note: media table uses play_count instead of view_count

CREATE OR REPLACE FUNCTION increment_media_views(media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media 
  SET play_count = play_count + 1,  -- ← Using play_count for media
      updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_media_likes(media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media 
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_media_downloads(media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_media_shares(media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media 
  SET share_count = share_count + 1,
      updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PHOTOS TABLE COUNTER FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION increment_photo_views(photo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE photos 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_photo_likes(photo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE photos 
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_photo_downloads(photo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE photos 
  SET download_count = download_count + 1,
      updated_at = NOW()
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_photo_shares(photo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE photos 
  SET share_count = share_count + 1,
      updated_at = NOW()
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these after creating functions to verify they work:

-- Test increment wallpaper views:
-- SELECT increment_wallpaper_views('<wallpaper-uuid>');
-- SELECT view_count FROM wallpapers WHERE id = '<wallpaper-uuid>';

-- Test increment media likes:
-- SELECT increment_media_likes('<media-uuid>');
-- SELECT like_count FROM media WHERE id = '<media-uuid>';

-- Test increment photo downloads:
-- SELECT increment_photo_downloads('<photo-uuid>');
-- SELECT download_count FROM photos WHERE id = '<photo-uuid>';

-- ====================================================================
-- GRANT PERMISSIONS (if needed)
-- ====================================================================
-- These functions use SECURITY DEFINER, so they run with creator privileges
-- No additional grants needed, but verify RLS policies allow updates

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
-- ✅ All RPC functions created successfully!
-- 
-- Next steps:
-- 1. Update backend routes to call correct functions based on content type
-- 2. Test counter increments in user app
-- 3. Verify admin dashboard shows correct metrics
-- 
-- ====================================================================
