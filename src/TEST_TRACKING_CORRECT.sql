-- ====================================================================================
-- CORRECT TEST SEQUENCE (No angle brackets!)
-- ====================================================================================

-- Step 1: Get a real wallpaper ID
SELECT id, title FROM wallpapers LIMIT 1;

-- Step 2: Copy the ID from above (just the UUID, no brackets!)
-- It should look like: 6f8063f2-4d30-4226-809a-b4414a856a0d
-- Then paste it in the queries below

-- Step 3: Test view increment (REMOVE the <> brackets, paste just the UUID)
SELECT increment_wallpaper_views('6f8063f2-4d30-4226-809a-b4414a856a0d');
-- ❌ WRONG: '<6f8063f2-4d30-4226-809a-b4414a856a0d>'  (has < >)
-- ✅ RIGHT: '6f8063f2-4d30-4226-809a-b4414a856a0d'   (no < >)

-- Step 4: Check if view counter increased (your columns are view_count, NOT views)
SELECT id, 
       title,
       view_count,      -- Your actual column name
       like_count,
       download_count,  -- Your actual column name
       share_count
FROM wallpapers 
WHERE id = '6f8063f2-4d30-4226-809a-b4414a856a0d';  -- Same ID, no brackets

-- Step 5: Test download increment
SELECT increment_wallpaper_downloads('6f8063f2-4d30-4226-809a-b4414a856a0d');

-- Step 6: Verify download counter increased
SELECT id, title, download_count
FROM wallpapers 
WHERE id = '6f8063f2-4d30-4226-809a-b4414a856a0d';
