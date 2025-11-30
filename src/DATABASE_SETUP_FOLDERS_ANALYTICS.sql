-- ========================================
-- WALLPAPER FOLDERS & ANALYTICS TABLES
-- Complete Database Setup for Admin Panel
-- ========================================

-- 1. CREATE WALLPAPER FOLDERS TABLE
-- This table stores folder/category information for organizing wallpapers
CREATE TABLE IF NOT EXISTS wallpaper_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallpaper_folders_created_at ON wallpaper_folders(created_at DESC);

-- 2. ADD FOLDER_ID COLUMN TO WALLPAPERS TABLE
-- This links wallpapers to their folders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN folder_id UUID REFERENCES wallpaper_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for faster folder filtering
CREATE INDEX IF NOT EXISTS idx_wallpapers_folder_id ON wallpapers(folder_id);

-- 2B. ADD SCHEDULED_AT COLUMN TO WALLPAPERS TABLE
-- This stores the scheduled publish date/time for wallpapers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Index for faster scheduled wallpaper queries
CREATE INDEX IF NOT EXISTS idx_wallpapers_scheduled_at ON wallpapers(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- 3. CREATE WALLPAPER ANALYTICS TABLE
-- This table stores detailed analytics events for each wallpaper
CREATE TABLE IF NOT EXISTS wallpaper_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download', 'like', 'share')),
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_wallpaper_id ON wallpaper_analytics(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_event_type ON wallpaper_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_created_at ON wallpaper_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_user_id ON wallpaper_analytics(user_id) WHERE user_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_wallpaper_analytics_wallpaper_event_date 
ON wallpaper_analytics(wallpaper_id, event_type, created_at DESC);

-- 4. ENSURE COUNTER COLUMNS EXIST ON WALLPAPERS TABLE
-- Add counter columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'download_count'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN download_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallpapers' AND column_name = 'share_count'
  ) THEN
    ALTER TABLE wallpapers ADD COLUMN share_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 5. CREATE INCREMENT FUNCTIONS FOR WALLPAPER COUNTERS
-- These functions safely increment counters atomically

-- Increment views
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET view_count = view_count + 1 
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET download_count = download_count + 1 
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET like_count = like_count + 1 
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment shares
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers 
  SET share_count = share_count + 1 
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE UPDATED_AT TRIGGER FOR FOLDERS
-- Automatically update the updated_at timestamp
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

-- 7. INSERT SAMPLE FOLDERS (OPTIONAL)
-- Uncomment to create default folders
/*
INSERT INTO wallpaper_folders (name, description) VALUES
  ('Lord Murugan', 'Wallpapers featuring Lord Murugan'),
  ('Temples', 'Beautiful temple wallpapers'),
  ('Festivals', 'Festival celebration wallpapers'),
  ('Nature', 'Nature and devotional wallpapers')
ON CONFLICT DO NOTHING;
*/

-- 8. GRANT NECESSARY PERMISSIONS
-- Grant access to service role (adjust if using different role)
GRANT ALL ON wallpaper_folders TO service_role;
GRANT ALL ON wallpaper_analytics TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_wallpaper_views TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_downloads TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_likes TO service_role;
GRANT EXECUTE ON FUNCTION increment_wallpaper_shares TO service_role;

-- ========================================
-- VERIFICATION QUERIES
-- Run these to verify the setup is complete
-- ========================================

-- Verify tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('wallpaper_folders', 'wallpaper_analytics', 'wallpapers')
ORDER BY table_name;

-- Verify wallpapers has all required columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'wallpapers'
  AND column_name IN ('folder_id', 'scheduled_at', 'view_count', 'download_count', 'like_count', 'share_count')
ORDER BY column_name;

-- Verify functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'increment_wallpaper_%'
ORDER BY routine_name;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- 
-- To use this setup:
-- 1. Copy all SQL above
-- 2. Go to your Supabase Admin Dashboard
-- 3. Navigate to SQL Editor
-- 4. Paste and run the SQL
-- 5. Check verification queries at the bottom
-- 6. Your folder management and analytics system is ready!
-- ========================================
