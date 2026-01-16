-- Check sparkles table for publish_status
SELECT 
  id,
  title, 
  publish_status,
  folder_id,
  created_at,
  scheduled_at
FROM sparkles 
ORDER BY created_at DESC 
LIMIT 15;

-- Check if publish_status column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sparkles';

-- Count by status
SELECT 
  publish_status,
  COUNT(*) as count
FROM sparkles
GROUP BY publish_status;
