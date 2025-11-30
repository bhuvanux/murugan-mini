-- ============================================
-- IDEMPOTENT LIKE/UNLIKE SYSTEM MIGRATION (FIXED)
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS wallpaper_like_toggle(uuid, text);
DROP FUNCTION IF EXISTS wallpaper_like_toggle(text, uuid);
DROP FUNCTION IF EXISTS check_wallpaper_like(uuid, text);
DROP FUNCTION IF EXISTS check_wallpaper_like(text, uuid);

-- Create table to store unique likes
CREATE TABLE IF NOT EXISTS wallpaper_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id uuid NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (wallpaper_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_user ON wallpaper_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_wallpaper ON wallpaper_likes(wallpaper_id);

-- Atomic toggle function (FIXED: parameters in alphabetical order for Supabase RPC)
-- Note: Supabase RPC uses alphabetical order when parameters are passed as object
-- CRITICAL FIX: Using 'likes' column (not 'like_count') to match existing schema
CREATE OR REPLACE FUNCTION wallpaper_like_toggle(p_user_id text, p_wallpaper_id uuid)
RETURNS JSON AS $$
DECLARE
  already BOOLEAN;
  new_count INTEGER;
BEGIN
  -- Check if user has already liked this wallpaper
  SELECT EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  ) INTO already;

  IF already THEN
    -- Unlike: remove from likes table and decrement counter
    DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id;
    UPDATE wallpapers SET likes = GREATEST(COALESCE(likes,0) - 1, 0) WHERE id = p_wallpaper_id;
    SELECT COALESCE(likes, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','unliked','like_count', new_count);
  ELSE
    -- Like: add to likes table and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id)
      ON CONFLICT (wallpaper_id, user_id) DO NOTHING;
    UPDATE wallpapers SET likes = COALESCE(likes,0) + 1 WHERE id = p_wallpaper_id;
    SELECT COALESCE(likes, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','liked','like_count', new_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked a wallpaper (FIXED: alphabetical order)
CREATE OR REPLACE FUNCTION check_wallpaper_like(p_user_id text, p_wallpaper_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION wallpaper_like_toggle(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_wallpaper_like(text, uuid) TO anon, authenticated, service_role;

-- Verify the functions were created (should show 2 functions)
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN ('wallpaper_like_toggle', 'check_wallpaper_like')
ORDER BY proname;
