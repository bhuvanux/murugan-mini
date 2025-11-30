-- 🔍 Check Current Banners Table Schema
-- Run this in Supabase SQL Editor to see what columns exist

-- 1. List all columns in banners table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'banners'
ORDER BY ordinal_position;

-- 2. Check if specific columns exist
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'published_at'
  ) THEN '✅ published_at exists' ELSE '❌ published_at MISSING' END as published_at_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'visibility'
  ) THEN '✅ visibility exists' ELSE '❌ visibility MISSING' END as visibility_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'banner_type'
  ) THEN '✅ banner_type exists' ELSE '❌ banner_type MISSING' END as banner_type_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'original_url'
  ) THEN '✅ original_url exists' ELSE '❌ original_url MISSING' END as original_url_check,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'storage_path'
  ) THEN '✅ storage_path exists' ELSE '❌ storage_path MISSING' END as storage_path_check;

-- 3. Count existing banners
SELECT 
  COUNT(*) as total_banners,
  COUNT(CASE WHEN publish_status = 'published' THEN 1 END) as published_count,
  COUNT(CASE WHEN publish_status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN publish_status = 'scheduled' THEN 1 END) as scheduled_count
FROM banners;

-- 4. Sample data (if any exists)
SELECT * FROM banners LIMIT 3;
