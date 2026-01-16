-- 1. DROP THE BLOCKING CONSTRAINT
-- This is what causes the 500 Error on upload
ALTER TABLE analytics_tracking DROP CONSTRAINT IF EXISTS analytics_tracking_module_name_check;

-- 2. CHECK FOR DUPLICATE TABLES
-- This counts rows in 'sparkle' (old) and 'sparkles' (new)
-- If 'sparkle' has 9 rows and 'sparkles' has 0, then we know the app was reading the old table.
SELECT 
  (SELECT count(*) FROM sparkle) as old_table_sparkle_count,
  (SELECT count(*) FROM sparkles) as new_table_sparkles_count;

-- 3. CHECK IF TRIGGER EXISTS
-- If there is a trigger on 'sparkles' that inserts into analytics, we need to know
SELECT event_object_table, trigger_name 
FROM information_schema.triggers 
WHERE event_object_table IN ('sparkle', 'sparkles');
