-- ====================================================================================
-- VERIFY RPC FUNCTIONS EXIST
-- ====================================================================================

-- Check if all 15 counter functions were created
SELECT 
    routine_name as function_name,
    routine_type as type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND (routine_name LIKE 'increment_%' OR routine_name LIKE 'decrement_%')
ORDER BY routine_name;

-- You should see these 15 functions:
-- ✅ decrement_media_likes
-- ✅ decrement_photo_likes
-- ✅ decrement_wallpaper_likes
-- ✅ increment_media_downloads
-- ✅ increment_media_likes
-- ✅ increment_media_shares
-- ✅ increment_media_views
-- ✅ increment_photo_downloads
-- ✅ increment_photo_likes
-- ✅ increment_photo_shares
-- ✅ increment_photo_views
-- ✅ increment_wallpaper_downloads  ← Need this for downloads
-- ✅ increment_wallpaper_likes      ← This one works
-- ✅ increment_wallpaper_shares
-- ✅ increment_wallpaper_views      ← Need this for views

-- ====================================================================================
-- If you DON'T see all 15 functions, run this:
-- ====================================================================================
-- Copy and run the ENTIRE /FIX_COUNTERS.sql file
-- (Not the FLEXIBLE version - your schema is standard)
