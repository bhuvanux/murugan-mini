-- ====================================================================================
-- CLEAR SPARKLE FILENAME TITLES
-- This script will clear any sparkle titles that look like filenames
-- ====================================================================================

-- Step 1: Show sparkles with filename-like titles before clearing
SELECT id, title, created_at 
FROM sparkles 
WHERE title ~ '\.(mp4|mov|avi|mkv|jpg|jpeg|png|gif|webp)$'  -- Contains file extensions
   OR title ~ '^[0-9]{13}\.'  -- Looks like timestamp.filename
   OR title ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'  -- Looks like UUID
ORDER BY created_at DESC 
LIMIT 10;

-- Step 2: Clear filename-like titles (set to empty string)
UPDATE sparkles 
SET title = ''
WHERE title ~ '\.(mp4|mov|avi|mkv|jpg|jpeg|png|gif|webp)$'  -- Contains file extensions
   OR title ~ '^[0-9]{13}\.'  -- Looks like timestamp.filename
   OR title ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';  -- Looks like UUID

-- Step 3: Show updated sparkles
SELECT id, title, content, created_at 
FROM sparkles 
WHERE title = ''  -- Show sparkles with empty titles
ORDER BY created_at DESC 
LIMIT 10;

-- Step 4: Count total sparkles with empty titles
SELECT 
  COUNT(*) as total_sparkles,
  COUNT(CASE WHEN title = '' THEN 1 END) as sparkles_with_empty_titles,
  COUNT(CASE WHEN title != '' THEN 1 END) as sparkles_with_titles
FROM sparkles;
