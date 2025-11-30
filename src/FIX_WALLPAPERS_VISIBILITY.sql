-- ===================================================================
-- FIX EXISTING WALLPAPERS: Set visibility = 'public'
-- ===================================================================
-- 
-- Problem: Existing wallpapers have NULL visibility, causing them
-- to not appear in user panel (which filters by visibility = 'public')
--
-- Solution: Update all existing wallpapers to set visibility = 'public'
-- ===================================================================

-- Step 1: Check current state
SELECT 
  COUNT(*) as total_wallpapers,
  COUNT(*) FILTER (WHERE visibility IS NULL) as missing_visibility,
  COUNT(*) FILTER (WHERE visibility = 'public') as public_wallpapers,
  COUNT(*) FILTER (WHERE publish_status = 'published') as published_wallpapers
FROM wallpapers;

-- Step 2: Fix all existing wallpapers with NULL visibility
UPDATE wallpapers 
SET visibility = 'public'
WHERE visibility IS NULL;

-- Step 3: Ensure published wallpapers also have published_at timestamp
UPDATE wallpapers 
SET published_at = COALESCE(published_at, NOW())
WHERE publish_status = 'published' 
  AND published_at IS NULL;

-- Step 4: Verify the fix
SELECT 
  id,
  title,
  publish_status,
  visibility,
  published_at,
  created_at
FROM wallpapers
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Count how many wallpapers are now visible to users
SELECT 
  COUNT(*) as user_visible_count
FROM wallpapers
WHERE publish_status = 'published' 
  AND visibility = 'public';

-- ===================================================================
-- Expected Result:
-- All wallpapers should now have visibility = 'public'
-- Published wallpapers should have published_at timestamp
-- User panel should now show all published wallpapers
-- ===================================================================
