-- =====================================================
-- BANNER MODULE DATABASE SETUP
-- Run this in your Admin Supabase SQL Editor
-- =====================================================

-- 1. Create banner_folders table FIRST (referenced by banners)
CREATE TABLE IF NOT EXISTS banner_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  link_url TEXT,
  
  -- Multi-resolution image URLs (for User App)
  small_url TEXT,
  medium_url TEXT,
  large_url TEXT,
  original_url TEXT,
  
  -- Banner routing and organization
  banner_type TEXT DEFAULT 'home' CHECK (banner_type IN ('wallpaper', 'photos', 'media', 'sparkle', 'home')),
  category TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Folder organization
  folder_id UUID REFERENCES banner_folders(id) ON DELETE SET NULL,
  
  -- Publishing control
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Analytics counters
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 3. Create banner_analytics table (legacy, for backwards compatibility)
CREATE TABLE IF NOT EXISTS banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_banners_folder_id ON banners(folder_id);
CREATE INDEX IF NOT EXISTS idx_banners_publish_status ON banners(publish_status);
CREATE INDEX IF NOT EXISTS idx_banners_visibility ON banners(visibility);
CREATE INDEX IF NOT EXISTS idx_banners_banner_type ON banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_banners_order_index ON banners(order_index ASC);
CREATE INDEX IF NOT EXISTS idx_banners_scheduled_at ON banners(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_banners_expires_at ON banners(expires_at);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banners_search_vector ON banners USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_event_type ON banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created_at ON banner_analytics(created_at DESC);

-- 5. Create RPC functions for atomic counter updates
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners 
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to auto-publish scheduled banners
CREATE OR REPLACE FUNCTION auto_publish_scheduled_banners()
RETURNS void AS $$
BEGIN
  UPDATE banners
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_banner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banners_updated_at_trigger
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banner_updated_at();

CREATE TRIGGER banner_folders_updated_at_trigger
  BEFORE UPDATE ON banner_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_banner_updated_at();

-- 8. Add entries to unified_analytics table (if it exists)
-- Note: unified_analytics should already exist from wallpaper module
-- We'll use module_name = 'banner' for all banner analytics

-- 9. Enable Row Level Security (RLS) - Optional, uncomment if needed
-- ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE banner_folders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE banner_analytics ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies if needed (example - adjust as needed)
-- CREATE POLICY "Allow all for service role" ON banners FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON banner_folders FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON banner_analytics FOR ALL USING (true);

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================
-- Now you can use the Banner Manager in your Admin Panel.
-- All 7 features are supported:
-- 1. ✅ Folder creation and organization
-- 2. ✅ Calendar date range filtering  
-- 3. ✅ Analytics drawer with detailed stats
-- 4. ✅ Tabs (Published, Scheduled, Draft)
-- 5. ✅ Database checker in settings
-- 6. ✅ Upload scheduling
-- 7. ✅ Complete analytics tracking
-- =====================================================
