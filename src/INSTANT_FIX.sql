-- ====================================================================================
-- INSTANT FIX for Views & Downloads Not Working
-- ====================================================================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor, then click Run
-- This will show you which columns you have and fix the functions automatically
-- ====================================================================================

-- STEP 1: Show what columns exist in your wallpapers table
SELECT 
    'Your wallpapers table has these counter columns:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'wallpapers' 
  AND (column_name LIKE '%count%' 
       OR column_name LIKE '%view%' 
       OR column_name LIKE '%download%' 
       OR column_name LIKE '%like%' 
       OR column_name LIKE '%share%')
ORDER BY column_name;

-- STEP 2: Show a sample wallpaper
SELECT '👇 Sample wallpaper data:' as info;
SELECT id, title, 
       -- Show whichever columns exist
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'view_count') 
            THEN view_count END as view_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'views') 
            THEN views END as views,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') 
            THEN like_count END as like_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'likes') 
            THEN likes END as likes,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'download_count') 
            THEN download_count END as download_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'downloads') 
            THEN downloads END as downloads
FROM wallpapers 
LIMIT 1;

-- ====================================================================================
-- Now based on the output above, run the appropriate fix:
-- ====================================================================================
-- 
-- If you saw "view_count", "download_count", "like_count", "share_count":
--   → Run /FIX_COUNTERS.sql (original version)
--
-- If you saw "views", "downloads", "likes", "shares":
--   → Run /FIX_COUNTERS_FLEXIBLE.sql (flexible version)
--
-- If you're not sure or saw a mix:
--   → Run /FIX_COUNTERS_FLEXIBLE.sql (it handles both!)
--
-- ====================================================================================
