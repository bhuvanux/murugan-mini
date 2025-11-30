-- =====================================================
-- SPARKLE MODULE DATABASE SETUP
-- Run this in your Admin Supabase SQL Editor
-- =====================================================

-- 1. Create sparkle_folders table FIRST (referenced by sparkles)
CREATE TABLE IF NOT EXISTS sparkle_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sparkles table
CREATE TABLE IF NOT EXISTS sparkles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Main sparkle content/quote
  author TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  
  -- Folder organization
  folder_id UUID REFERENCES sparkle_folders(id) ON DELETE SET NULL,
  
  -- Publishing control
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  
  -- Analytics counters
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '') || ' ' || coalesce(author, ''))
  ) STORED
);

-- 3. Create sparkle_analytics table (legacy, for backwards compatibility)
CREATE TABLE IF NOT EXISTS sparkle_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sparkle_id UUID NOT NULL REFERENCES sparkles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sparkles_folder_id ON sparkles(folder_id);
CREATE INDEX IF NOT EXISTS idx_sparkles_publish_status ON sparkles(publish_status);
CREATE INDEX IF NOT EXISTS idx_sparkles_scheduled_at ON sparkles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sparkles_created_at ON sparkles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sparkles_search_vector ON sparkles USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_sparkle_id ON sparkle_analytics(sparkle_id);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_event_type ON sparkle_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_created_at ON sparkle_analytics(created_at DESC);

-- 5. Create RPC functions for atomic counter updates
CREATE OR REPLACE FUNCTION increment_sparkle_views(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_sparkle_likes(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles 
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_sparkle_likes(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles 
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_sparkle_shares(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles 
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to auto-publish scheduled sparkles
CREATE OR REPLACE FUNCTION auto_publish_scheduled_sparkles()
RETURNS void AS $$
BEGIN
  UPDATE sparkles
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sparkle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sparkles_updated_at_trigger
  BEFORE UPDATE ON sparkles
  FOR EACH ROW
  EXECUTE FUNCTION update_sparkle_updated_at();

CREATE TRIGGER sparkle_folders_updated_at_trigger
  BEFORE UPDATE ON sparkle_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_sparkle_updated_at();

-- 8. Add entries to unified_analytics table (if it exists)
-- Note: unified_analytics should already exist from wallpaper module
-- We'll use module_name = 'sparkle' for all sparkle analytics

-- 9. Enable Row Level Security (RLS) - Optional, uncomment if needed
-- ALTER TABLE sparkles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sparkle_folders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sparkle_analytics ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies if needed (example - adjust as needed)
-- CREATE POLICY "Allow all for service role" ON sparkles FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON sparkle_folders FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON sparkle_analytics FOR ALL USING (true);

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================
-- Now you can use the Sparkle Manager in your Admin Panel.
-- All 7 features are supported:
-- 1. ✅ Folder creation and organization
-- 2. ✅ Calendar date range filtering  
-- 3. ✅ Analytics drawer with detailed stats
-- 4. ✅ Tabs (Published, Scheduled, Draft)
-- 5. ✅ Database checker in settings
-- 6. ✅ Upload scheduling
-- 7. ✅ Complete analytics tracking
-- =====================================================
