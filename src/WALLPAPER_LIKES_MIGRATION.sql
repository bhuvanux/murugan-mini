-- ====================================================================================
-- WALLPAPER LIKES MIGRATION - Per-User Like Tracking
-- ====================================================================================
-- Run this in Supabase SQL Editor (User Panel Project)
-- This creates tables and functions for proper like tracking
-- ====================================================================================

-- ==================== CREATE TABLES ====================

-- Table to track which users liked which wallpapers (prevents duplicate likes)
CREATE TABLE IF NOT EXISTS wallpaper_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Can be UUID or device fingerprint for anonymous users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallpaper_id, user_id) -- Prevent same user liking twice
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_wallpaper_id ON wallpaper_likes(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_user_id ON wallpaper_likes(user_id);

-- Optional: Table to track shares (for analytics)
CREATE TABLE IF NOT EXISTS wallpaper_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id TEXT, -- Optional, can be null for anonymous
  platform TEXT, -- 'whatsapp', 'copy_link', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallpaper_shares_wallpaper_id ON wallpaper_shares(wallpaper_id);

-- ==================== DROP OLD FUNCTIONS ====================

DROP FUNCTION IF EXISTS increment_wallpaper_likes(UUID);
DROP FUNCTION IF EXISTS decrement_wallpaper_likes(UUID);

-- ==================== NEW LIKE FUNCTIONS (PER-USER) ====================

-- Check if user has already liked this wallpaper
CREATE OR REPLACE FUNCTION check_wallpaper_like(
  p_wallpaper_id UUID,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id 
    AND user_id = p_user_id
  );
END;
$$;

-- Like wallpaper (only if not already liked)
CREATE OR REPLACE FUNCTION like_wallpaper(
  p_wallpaper_id UUID,
  p_user_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Check if already liked
  v_already_liked := check_wallpaper_like(p_wallpaper_id, p_user_id);
  
  IF v_already_liked THEN
    -- Already liked, return current count without incrementing
    SELECT COALESCE(like_count, 0) INTO v_new_count
    FROM wallpapers
    WHERE id = p_wallpaper_id;
    
    RETURN json_build_object(
      'success', true,
      'already_liked', true,
      'like_count', v_new_count,
      'message', 'Already liked'
    );
  ELSE
    -- Not liked yet, insert record and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id)
    VALUES (p_wallpaper_id, p_user_id);
    
    UPDATE wallpapers
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = p_wallpaper_id
    RETURNING like_count INTO v_new_count;
    
    RETURN json_build_object(
      'success', true,
      'already_liked', false,
      'like_count', v_new_count,
      'message', 'Liked successfully'
    );
  END IF;
END;
$$;

-- Unlike wallpaper (removes record but does NOT decrement counter)
CREATE OR REPLACE FUNCTION unlike_wallpaper(
  p_wallpaper_id UUID,
  p_user_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_was_liked BOOLEAN;
  v_current_count INTEGER;
BEGIN
  -- Check if was liked
  v_was_liked := check_wallpaper_like(p_wallpaper_id, p_user_id);
  
  IF v_was_liked THEN
    -- Remove like record (but do NOT decrement counter)
    DELETE FROM wallpaper_likes
    WHERE wallpaper_id = p_wallpaper_id
    AND user_id = p_user_id;
    
    -- Get current count (unchanged)
    SELECT COALESCE(like_count, 0) INTO v_current_count
    FROM wallpapers
    WHERE id = p_wallpaper_id;
    
    RETURN json_build_object(
      'success', true,
      'was_liked', true,
      'like_count', v_current_count,
      'message', 'Unliked successfully'
    );
  ELSE
    -- Wasn't liked, nothing to do
    SELECT COALESCE(like_count, 0) INTO v_current_count
    FROM wallpapers
    WHERE id = p_wallpaper_id;
    
    RETURN json_build_object(
      'success', true,
      'was_liked', false,
      'like_count', v_current_count,
      'message', 'Not previously liked'
    );
  END IF;
END;
$$;

-- ==================== KEEP EXISTING FUNCTIONS FOR OTHER COUNTERS ====================

-- These functions remain unchanged (already working correctly)
-- increment_wallpaper_views
-- increment_wallpaper_downloads  
-- increment_wallpaper_shares

-- Update share function to use new logging table
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(
  p_wallpaper_id UUID,
  p_user_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment counter
  UPDATE wallpapers
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = p_wallpaper_id;
  
  -- Log the share (optional, for analytics)
  INSERT INTO wallpaper_shares (wallpaper_id, user_id, platform)
  VALUES (p_wallpaper_id, p_user_id, p_platform);
END;
$$;

-- ==================== ANALYTICS FUNCTION ====================

-- Get detailed analytics for a wallpaper
CREATE OR REPLACE FUNCTION get_wallpaper_analytics(p_wallpaper_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'wallpaper_id', w.id,
    'title', w.title,
    'stats', json_build_object(
      'views', COALESCE(w.view_count, 0),
      'likes', COALESCE(w.like_count, 0),
      'unique_likes', (SELECT COUNT(*) FROM wallpaper_likes WHERE wallpaper_id = w.id),
      'downloads', COALESCE(w.download_count, 0),
      'shares', COALESCE(w.share_count, 0),
      'trending_score', (
        COALESCE(w.view_count, 0) + 
        COALESCE(w.like_count, 0) * 5 + 
        COALESCE(w.share_count, 0) * 10 + 
        COALESCE(w.download_count, 0) * 2
      )
    ),
    'engagement', json_build_object(
      'like_rate', CASE 
        WHEN COALESCE(w.view_count, 0) > 0 
        THEN ROUND((COALESCE(w.like_count, 0)::NUMERIC / w.view_count::NUMERIC) * 100, 2)
        ELSE 0
      END,
      'download_rate', CASE 
        WHEN COALESCE(w.view_count, 0) > 0 
        THEN ROUND((COALESCE(w.download_count, 0)::NUMERIC / w.view_count::NUMERIC) * 100, 2)
        ELSE 0
      END
    ),
    'recent_activity', json_build_object(
      'last_7_days_likes', (
        SELECT COUNT(*) FROM wallpaper_likes 
        WHERE wallpaper_id = w.id 
        AND created_at > NOW() - INTERVAL '7 days'
      ),
      'last_7_days_shares', (
        SELECT COUNT(*) FROM wallpaper_shares 
        WHERE wallpaper_id = w.id 
        AND created_at > NOW() - INTERVAL '7 days'
      )
    ),
    'created_at', w.created_at,
    'updated_at', w.updated_at
  ) INTO v_result
  FROM wallpapers w
  WHERE w.id = p_wallpaper_id;
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_wallpaper_like TO authenticated, anon;
GRANT EXECUTE ON FUNCTION like_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unlike_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_wallpaper_shares TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_wallpaper_analytics TO authenticated, anon;

-- Grant table access
GRANT SELECT, INSERT, DELETE ON wallpaper_likes TO authenticated, anon;
GRANT SELECT, INSERT ON wallpaper_shares TO authenticated, anon;

-- ====================================================================================
-- VERIFICATION QUERIES
-- ====================================================================================

-- Test the new like system:
-- 1. Get a wallpaper ID
-- SELECT id FROM wallpapers LIMIT 1;

-- 2. Like it as user 'test-user-123'
-- SELECT like_wallpaper('<wallpaper-id>', 'test-user-123');

-- 3. Try to like again (should return already_liked: true)
-- SELECT like_wallpaper('<wallpaper-id>', 'test-user-123');

-- 4. Check likes table
-- SELECT * FROM wallpaper_likes WHERE wallpaper_id = '<wallpaper-id>';

-- 5. Unlike it
-- SELECT unlike_wallpaper('<wallpaper-id>', 'test-user-123');

-- 6. Check likes table again (record should be gone)
-- SELECT * FROM wallpaper_likes WHERE wallpaper_id = '<wallpaper-id>';

-- 7. Check wallpaper counter (should NOT have decreased)
-- SELECT id, like_count FROM wallpapers WHERE id = '<wallpaper-id>';

-- 8. Get analytics
-- SELECT get_wallpaper_analytics('<wallpaper-id>');

-- ====================================================================================
