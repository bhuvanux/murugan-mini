-- ====================================================================
-- RESET ALL ANALYTICS FOR TESTING
-- Clears all analytics data while preserving table structures
-- ====================================================================

-- Clear unified analytics (all events, views, clicks, etc.)
TRUNCATE TABLE unified_analytics;

-- Clear banner dismissals (welcome banner will show again)
TRUNCATE TABLE banner_dismissals;

-- Clear auth events (login, signup tracking)
TRUNCATE TABLE auth_events;

-- Reset banner view/click counters to zero
UPDATE banners SET
  view_count = 0,
  click_count = 0;

-- Reset media counters to zero
UPDATE media SET
  view_count = 0,
  like_count = 0,
  download_count = 0,
  share_count = 0,
  play_count = 0
WHERE true;

-- Reset sparkle counters to zero
UPDATE sparkles SET
  view_count = 0,
  like_count = 0,
  share_count = 0,
  download_count = 0
WHERE true;

-- Reset wallpaper counters to zero (if separate table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallpapers') THEN
    UPDATE wallpapers SET
      view_count = 0,
      like_count = 0,
      download_count = 0,
      share_count = 0
    WHERE true;
  END IF;
END $$;

-- Clear user favorites (likes)
TRUNCATE TABLE user_favorites;

-- Success message
SELECT '✅ All analytics data cleared! Counters reset to zero.' as message;
