-- ===================================================================
-- SIMPLE WALLPAPER LIKES FIX - Run this in Supabase SQL Editor
-- ===================================================================
-- This creates the missing RPC functions for per-user like tracking
-- ===================================================================

-- Drop old functions if they exist (clean slate)
DROP FUNCTION IF EXISTS like_wallpaper(UUID, TEXT);
DROP FUNCTION IF EXISTS unlike_wallpaper(UUID, TEXT);
DROP FUNCTION IF EXISTS check_wallpaper_like(UUID, TEXT);

-- Create wallpaper_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS wallpaper_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallpaper_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_wallpaper_id ON wallpaper_likes(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_user_id ON wallpaper_likes(user_id);

-- ===================================================================
-- FUNCTION 1: like_wallpaper (idempotent)
-- ===================================================================
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
  v_like_count INTEGER;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id 
    AND user_id = p_user_id
  ) INTO v_already_liked;
  
  IF v_already_liked THEN
    -- Already liked - return current count without incrementing
    SELECT COALESCE(like_count, 0) INTO v_like_count
    FROM wallpapers
    WHERE id = p_wallpaper_id;
    
    RETURN json_build_object(
      'success', true,
      'liked', true,
      'like_count', v_like_count,
      'already_liked', true,
      'message', 'Already liked'
    );
  ELSE
    -- Not liked yet - insert record and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id)
    VALUES (p_wallpaper_id, p_user_id)
    ON CONFLICT (wallpaper_id, user_id) DO NOTHING;
    
    UPDATE wallpapers
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = p_wallpaper_id
    RETURNING COALESCE(like_count, 0) INTO v_like_count;
    
    RETURN json_build_object(
      'success', true,
      'liked', true,
      'like_count', v_like_count,
      'already_liked', false,
      'message', 'Liked successfully'
    );
  END IF;
END;
$$;

-- ===================================================================
-- FUNCTION 2: unlike_wallpaper (removes record, doesn't decrement)
-- ===================================================================
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
  v_like_count INTEGER;
BEGIN
  -- Check if was liked
  SELECT EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id 
    AND user_id = p_user_id
  ) INTO v_was_liked;
  
  IF v_was_liked THEN
    -- Delete like record (but do NOT decrement counter)
    DELETE FROM wallpaper_likes
    WHERE wallpaper_id = p_wallpaper_id
    AND user_id = p_user_id;
  END IF;
  
  -- Get current count (unchanged)
  SELECT COALESCE(like_count, 0) INTO v_like_count
  FROM wallpapers
  WHERE id = p_wallpaper_id;
  
  RETURN json_build_object(
    'success', true,
    'liked', false,
    'like_count', v_like_count,
    'was_liked', v_was_liked,
    'message', CASE 
      WHEN v_was_liked THEN 'Unliked successfully' 
      ELSE 'Not previously liked' 
    END
  );
END;
$$;

-- ===================================================================
-- FUNCTION 3: check_wallpaper_like
-- ===================================================================
CREATE OR REPLACE FUNCTION check_wallpaper_like(
  p_wallpaper_id UUID,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id 
    AND user_id = p_user_id
  );
END;
$$;

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================
GRANT EXECUTE ON FUNCTION like_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unlike_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_wallpaper_like TO authenticated, anon;

GRANT SELECT, INSERT, DELETE ON wallpaper_likes TO authenticated, anon;

-- ===================================================================
-- VERIFICATION
-- ===================================================================
-- Run these to verify functions were created:

-- 1. Check functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('like_wallpaper', 'unlike_wallpaper', 'check_wallpaper_like');

-- 2. Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'wallpaper_likes';

-- Success! You should see 3 functions and 1 table.
