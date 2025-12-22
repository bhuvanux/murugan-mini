-- ====================================================================================
-- TEST SPARKLE ANALYTICS TRACKING
-- ====================================================================================

-- Step 1: Check if we have any sparkles in the database
SELECT id, title, view_count, like_count, share_count 
FROM sparkles 
LIMIT 5;

-- Step 2: If no sparkles exist, create a test sparkle
-- (Uncomment and run if needed)
-- INSERT INTO sparkles (title, content, author) 
-- VALUES ('Test Sparkle', 'This is a test sparkle for analytics', 'Test Author')
-- RETURNING id, title;

-- Step 3: Test the track_analytics_event function directly
-- Replace 'YOUR_SPARKLE_ID_HERE' with an actual sparkle ID from step 1
SELECT track_analytics_event(
  'sparkle',
  'YOUR_SPARKLE_ID_HERE', -- Replace with actual UUID
  'view',
  '127.0.0.1',
  'Test User Agent',
  'desktop',
  '{"test": true}'::jsonb
);

-- Step 4: Check if the analytics were recorded
SELECT * FROM analytics_tracking 
WHERE module_name = 'sparkle' 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 5: Test the adjustSparkleCounter function manually
-- Replace 'YOUR_SPARKLE_ID_HERE' with an actual sparkle ID
UPDATE sparkles 
SET view_count = COALESCE(view_count, 0) + 1 
WHERE id = 'YOUR_SPARKLE_ID_HERE';

-- Step 6: Verify the counter was updated
SELECT id, title, view_count, like_count, share_count 
FROM sparkles 
WHERE id = 'YOUR_SPARKLE_ID_HERE';

-- Step 7: Test like tracking
SELECT track_analytics_event(
  'sparkle',
  'YOUR_SPARKLE_ID_HERE', -- Replace with actual UUID
  'like',
  '127.0.0.1',
  'Test User Agent',
  'desktop',
  '{}'::jsonb
);

-- Step 8: Check like counter
UPDATE sparkles 
SET like_count = COALESCE(like_count, 0) + 1 
WHERE id = 'YOUR_SPARKLE_ID_HERE';

SELECT id, title, view_count, like_count, share_count 
FROM sparkles 
WHERE id = 'YOUR_SPARKLE_ID_HERE';
