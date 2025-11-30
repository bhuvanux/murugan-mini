-- ========================================
-- QUICK SETUP: Run this SQL in Supabase
-- ========================================
-- Copy ALL of this and paste in Supabase SQL Editor → Click RUN
-- ========================================

-- 1. Create wallpaper_folders table
CREATE TABLE IF NOT EXISTS wallpaper_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create wallpaper_analytics table
CREATE TABLE IF NOT EXISTS wallpaper_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'like', 'share')),
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add folder_id to wallpapers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN folder_id UUID REFERENCES wallpaper_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add counter columns to wallpapers if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'view_count') THEN
    ALTER TABLE wallpapers ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'download_count') THEN
    ALTER TABLE wallpapers ADD COLUMN download_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'like_count') THEN
    ALTER TABLE wallpapers ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallpapers' AND column_name = 'share_count') THEN
    ALTER TABLE wallpapers ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 5. Create increment functions
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET view_count = view_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET download_count = download_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = like_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET share_count = share_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_wallpaper_folders_created_at ON wallpaper_folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_folder_id ON wallpapers(folder_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_wallpaper_id ON wallpaper_analytics(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_event_type ON wallpaper_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_created_at ON wallpaper_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_wallpaper_event_date ON wallpaper_analytics(wallpaper_id, event_type, created_at DESC);

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallpaper_folders_updated_at ON wallpaper_folders;
CREATE TRIGGER update_wallpaper_folders_updated_at
  BEFORE UPDATE ON wallpaper_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
GRANT ALL ON wallpaper_folders TO service_role;
GRANT ALL ON wallpaper_analytics TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_views TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_downloads TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_likes TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_shares TO service_role;

-- ========================================
-- VERIFICATION: Check if everything was created
-- ========================================

SELECT 'Tables Created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wallpaper_folders', 'wallpaper_analytics')
ORDER BY table_name;

SELECT 'Wallpapers Columns:' as status;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'wallpapers'
  AND column_name IN ('folder_id', 'view_count', 'download_count', 'like_count', 'share_count')
ORDER BY column_name;

SELECT 'Functions Created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'increment_wallpaper_%'
ORDER BY routine_name;

-- ========================================
-- ✅ DONE! If you see tables and functions above, you're ready!
-- ========================================
