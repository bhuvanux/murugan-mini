-- =====================================================
-- MEDIA MODULE DATABASE SETUP
-- Run this in your Admin Supabase SQL Editor
-- =====================================================

-- 1. Create media_folders table FIRST (referenced by media)
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  duration INTEGER, -- Duration in seconds
  
  -- Folder organization
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  
  -- Publishing control
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  
  -- Analytics counters
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 3. Create media_analytics table (legacy, for backwards compatibility)
CREATE TABLE IF NOT EXISTS media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'play', 'download', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_folder_id ON media(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_publish_status ON media(publish_status);
CREATE INDEX IF NOT EXISTS idx_media_scheduled_at ON media(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_search_vector ON media USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_media_analytics_media_id ON media_analytics(media_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_event_type ON media_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_media_analytics_created_at ON media_analytics(created_at DESC);

-- 5. Create RPC functions for atomic counter updates
CREATE OR REPLACE FUNCTION increment_media_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_plays(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_downloads(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_likes(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_media_likes(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_shares(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media 
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to auto-publish scheduled media
CREATE OR REPLACE FUNCTION auto_publish_scheduled_media()
RETURNS void AS $$
BEGIN
  UPDATE media
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_updated_at_trigger
  BEFORE UPDATE ON media
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

CREATE TRIGGER media_folders_updated_at_trigger
  BEFORE UPDATE ON media_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

-- 8. Add entries to unified_analytics table (if it exists)
-- Note: unified_analytics should already exist from wallpaper module
-- We'll use module_name = 'media' for all media analytics

-- 9. Enable Row Level Security (RLS) - Optional, uncomment if needed
-- ALTER TABLE media ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE media_analytics ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies if needed (example - adjust as needed)
-- CREATE POLICY "Allow all for service role" ON media FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON media_folders FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON media_analytics FOR ALL USING (true);

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================
-- Now you can use the Media Manager in your Admin Panel.
-- All 7 features are supported:
-- 1. ✅ Folder creation and organization
-- 2. ✅ Calendar date range filtering  
-- 3. ✅ Analytics drawer with detailed stats
-- 4. ✅ Tabs (Published, Scheduled, Draft)
-- 5. ✅ Database checker in settings
-- 6. ✅ Upload scheduling
-- 7. ✅ Complete analytics tracking
-- =====================================================
