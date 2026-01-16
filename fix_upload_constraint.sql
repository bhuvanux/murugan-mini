-- 1. Fix the analytics constraint that is blocking uploads
-- The error "violates check constraint analytics_tracking_module_name_check" happens because
-- the database restricts what 'module_name' can be (e.g. only 'wallpaper', 'media').
-- When we try to upload a 'sparkle', it tries to log an event with module='sparkle', and the DB rejects it.
-- We must remove this restriction to allow 'sparkle' events.

ALTER TABLE analytics_tracking DROP CONSTRAINT IF EXISTS analytics_tracking_module_name_check;

-- 2. Verify if there is an old 'sparkle' table causing confusion
SELECT table_name, (SELECT count(*) FROM sparkle) as row_count 
FROM information_schema.tables 
WHERE table_name = 'sparkle';

-- 3. Verify 'sparkles' table (should be empty right now)
SELECT count(*) as real_sparkles_count FROM sparkles;
