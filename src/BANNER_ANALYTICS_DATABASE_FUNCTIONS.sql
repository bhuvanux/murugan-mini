-- ========================================
-- BANNER ANALYTICS - DATABASE FUNCTIONS
-- ========================================
-- Run this SQL in your Supabase SQL Editor to create the required functions
-- for banner analytics tracking

-- ========================================
-- INCREMENT FUNCTIONS
-- ========================================

-- Increment banner view counter
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = banner_id;
  
  -- Log for debugging (optional)
  RAISE NOTICE 'Incremented view_count for banner %', banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment banner click counter
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = NOW()
  WHERE id = banner_id;
  
  -- Log for debugging (optional)
  RAISE NOTICE 'Incremented click_count for banner %', banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- DECREMENT FUNCTIONS (for future use)
-- ========================================

-- Decrement banner view counter (rarely used, but here for consistency)
CREATE OR REPLACE FUNCTION decrement_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET view_count = GREATEST(COALESCE(view_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement banner click counter (rarely used, but here for consistency)
CREATE OR REPLACE FUNCTION decrement_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET click_count = GREATEST(COALESCE(click_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFY INSTALLATION
-- ========================================

-- Check if all functions were created successfully
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE 'increment_banner_%' 
   OR routine_name LIKE 'decrement_banner_%'
ORDER BY routine_name;

-- Expected output:
-- routine_name               | routine_type | return_type
-- ---------------------------+--------------+-------------
-- decrement_banner_clicks    | FUNCTION     | void
-- decrement_banner_views     | FUNCTION     | void
-- increment_banner_clicks    | FUNCTION     | void
-- increment_banner_views     | FUNCTION     | void

-- ========================================
-- TEST THE FUNCTIONS
-- ========================================

-- Test increment_banner_views
DO $$
DECLARE
  test_banner_id UUID;
  initial_views INT;
  final_views INT;
BEGIN
  -- Get a test banner ID (first banner in the table)
  SELECT id INTO test_banner_id FROM banners LIMIT 1;
  
  IF test_banner_id IS NULL THEN
    RAISE NOTICE 'No banners found in table. Create a banner first to test.';
    RETURN;
  END IF;
  
  -- Get initial view count
  SELECT COALESCE(view_count, 0) INTO initial_views FROM banners WHERE id = test_banner_id;
  
  -- Increment
  PERFORM increment_banner_views(test_banner_id);
  
  -- Get final view count
  SELECT COALESCE(view_count, 0) INTO final_views FROM banners WHERE id = test_banner_id;
  
  -- Verify
  IF final_views = initial_views + 1 THEN
    RAISE NOTICE '✅ increment_banner_views works! (% -> %)', initial_views, final_views;
  ELSE
    RAISE WARNING '❌ increment_banner_views FAILED! Expected %, got %', initial_views + 1, final_views;
  END IF;
END $$;

-- Test increment_banner_clicks
DO $$
DECLARE
  test_banner_id UUID;
  initial_clicks INT;
  final_clicks INT;
BEGIN
  -- Get a test banner ID (first banner in the table)
  SELECT id INTO test_banner_id FROM banners LIMIT 1;
  
  IF test_banner_id IS NULL THEN
    RAISE NOTICE 'No banners found in table. Create a banner first to test.';
    RETURN;
  END IF;
  
  -- Get initial click count
  SELECT COALESCE(click_count, 0) INTO initial_clicks FROM banners WHERE id = test_banner_id;
  
  -- Increment
  PERFORM increment_banner_clicks(test_banner_id);
  
  -- Get final click count
  SELECT COALESCE(click_count, 0) INTO final_clicks FROM banners WHERE id = test_banner_id;
  
  -- Verify
  IF final_clicks = initial_clicks + 1 THEN
    RAISE NOTICE '✅ increment_banner_clicks works! (% -> %)', initial_clicks, final_clicks;
  ELSE
    RAISE WARNING '❌ increment_banner_clicks FAILED! Expected %, got %', initial_clicks + 1, final_clicks;
  END IF;
END $$;

-- ========================================
-- USAGE EXAMPLES
-- ========================================

-- Manual increment (for testing)
-- SELECT increment_banner_views('your-banner-uuid-here');
-- SELECT increment_banner_clicks('your-banner-uuid-here');

-- Check current counts
-- SELECT id, title, view_count, click_count, created_at, updated_at 
-- FROM banners 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ========================================
-- NOTES
-- ========================================

-- These functions are automatically called by the unified analytics system
-- when tracking banner events:
--   - trackEvent({ module_name: 'banner', item_id: bannerId, event_type: 'view' })
--   - trackEvent({ module_name: 'banner', item_id: bannerId, event_type: 'click' })

-- The functions use SECURITY DEFINER to run with the privileges of the function
-- creator, allowing them to update the banners table even if the caller doesn't
-- have direct UPDATE permissions.

-- The GREATEST() function ensures counters never go below 0 when decrementing.

-- COALESCE() handles NULL values by treating them as 0.

-- ========================================
-- CLEANUP (if you need to remove these functions)
-- ========================================

-- DROP FUNCTION IF EXISTS increment_banner_views(UUID);
-- DROP FUNCTION IF EXISTS increment_banner_clicks(UUID);
-- DROP FUNCTION IF EXISTS decrement_banner_views(UUID);
-- DROP FUNCTION IF EXISTS decrement_banner_clicks(UUID);
