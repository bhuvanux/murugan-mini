-- ============================================
-- IDEMPOTENT LIKE/UNLIKE SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

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

-- Atomic toggle function (returns action & resulting like_count)
CREATE OR REPLACE FUNCTION wallpaper_like_toggle(p_wallpaper_id uuid, p_user_id text)
RETURNS JSON AS $$
DECLARE
  already BOOLEAN;
  new_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id) INTO already;

  IF already THEN
    -- Unlike: remove from likes table and decrement counter
    DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id;
    UPDATE wallpapers SET like_count = GREATEST(COALESCE(like_count,0) - 1, 0) WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','unliked','like_count', new_count);
  ELSE
    -- Like: add to likes table and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id)
      ON CONFLICT (wallpaper_id, user_id) DO NOTHING;
    UPDATE wallpapers SET like_count = COALESCE(like_count,0) + 1 WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','liked','like_count', new_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked a wallpaper
CREATE OR REPLACE FUNCTION check_wallpaper_like(p_wallpaper_id uuid, p_user_id text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions (if needed)
GRANT EXECUTE ON FUNCTION wallpaper_like_toggle(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_wallpaper_like(uuid, text) TO anon, authenticated, service_role;

-- Verify the functions were created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('wallpaper_like_toggle', 'check_wallpaper_like');
