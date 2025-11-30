-- ====================================================================================
-- DIAGNOSTIC SCRIPT - Check Column Names in Your Tables
-- ====================================================================================
-- Run this in Supabase SQL Editor to see actual column names
-- ====================================================================================

-- Check wallpapers table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallpapers' 
  AND column_name LIKE '%count%' OR column_name LIKE '%view%' OR column_name LIKE '%download%' OR column_name LIKE '%like%' OR column_name LIKE '%share%'
ORDER BY column_name;

-- Show sample row from wallpapers
SELECT id, 
       title,
       -- Try all possible column name variations
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'view_count') 
            THEN (SELECT view_count FROM wallpapers LIMIT 1) END as view_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'views') 
            THEN (SELECT views FROM wallpapers LIMIT 1) END as views,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') 
            THEN (SELECT like_count FROM wallpapers LIMIT 1) END as like_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'likes') 
            THEN (SELECT likes FROM wallpapers LIMIT 1) END as likes,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'download_count') 
            THEN (SELECT download_count FROM wallpapers LIMIT 1) END as download_count,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'downloads') 
            THEN (SELECT downloads FROM wallpapers LIMIT 1) END as downloads
FROM wallpapers 
LIMIT 1;

-- Simpler version - just show all columns
SELECT * FROM wallpapers LIMIT 1;
