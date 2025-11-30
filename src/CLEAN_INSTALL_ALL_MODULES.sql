-- =====================================================
-- CLEAN INSTALL - ALL MODULES
-- This will DROP all existing tables and recreate them
-- ⚠️ WARNING: THIS WILL DELETE ALL DATA!
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES
-- =====================================================

-- Drop Banner tables (in reverse dependency order)
DROP TABLE IF EXISTS banner_analytics CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS banner_folders CASCADE;

-- Drop Media tables (in reverse dependency order)
DROP TABLE IF EXISTS media_analytics CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS media_folders CASCADE;

-- Drop Sparkle tables (in reverse dependency order)
DROP TABLE IF EXISTS sparkle_analytics CASCADE;
DROP TABLE IF EXISTS sparkles CASCADE;
DROP TABLE IF EXISTS sparkle_folders CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS increment_banner_views(UUID);
DROP FUNCTION IF EXISTS increment_banner_clicks(UUID);
DROP FUNCTION IF EXISTS auto_publish_scheduled_banners();

DROP FUNCTION IF EXISTS increment_media_views(UUID);
DROP FUNCTION IF EXISTS increment_media_plays(UUID);
DROP FUNCTION IF EXISTS increment_media_downloads(UUID);
DROP FUNCTION IF EXISTS increment_media_likes(UUID);
DROP FUNCTION IF EXISTS decrement_media_likes(UUID);
DROP FUNCTION IF EXISTS increment_media_shares(UUID);
DROP FUNCTION IF EXISTS auto_publish_scheduled_media();

DROP FUNCTION IF EXISTS increment_sparkle_views(UUID);
DROP FUNCTION IF EXISTS increment_sparkle_likes(UUID);
DROP FUNCTION IF EXISTS decrement_sparkle_likes(UUID);
DROP FUNCTION IF EXISTS increment_sparkle_shares(UUID);
DROP FUNCTION IF EXISTS auto_publish_scheduled_sparkles();

-- =====================================================
-- STEP 2: CREATE BANNER MODULE
-- =====================================================

-- 1. Create banner_folders table FIRST
CREATE TABLE banner_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create banners table
CREATE TABLE banners (
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

-- 3. Create banner_analytics table
CREATE TABLE banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for banners
CREATE INDEX idx_banners_folder_id ON banners(folder_id);
CREATE INDEX idx_banners_publish_status ON banners(publish_status);
CREATE INDEX idx_banners_visibility ON banners(visibility);
CREATE INDEX idx_banners_banner_type ON banners(banner_type);
CREATE INDEX idx_banners_order_index ON banners(order_index ASC);
CREATE INDEX idx_banners_scheduled_at ON banners(scheduled_at);
CREATE INDEX idx_banners_expires_at ON banners(expires_at);
CREATE INDEX idx_banners_created_at ON banners(created_at DESC);
CREATE INDEX idx_banners_search_vector ON banners USING GIN(search_vector);
CREATE INDEX idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX idx_banner_analytics_event_type ON banner_analytics(event_type);
CREATE INDEX idx_banner_analytics_created_at ON banner_analytics(created_at DESC);

-- 5. Create RPC functions for banners
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners SET view_count = COALESCE(view_count, 0) + 1 WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE banners SET click_count = COALESCE(click_count, 0) + 1 WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- STEP 3: CREATE MEDIA MODULE
-- =====================================================

-- 1. Create media_folders table FIRST
CREATE TABLE media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create media table
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
  duration INTEGER,
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 3. Create media_analytics table
CREATE TABLE media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'play', 'download', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for media
CREATE INDEX idx_media_folder_id ON media(folder_id);
CREATE INDEX idx_media_publish_status ON media(publish_status);
CREATE INDEX idx_media_scheduled_at ON media(scheduled_at);
CREATE INDEX idx_media_created_at ON media(created_at DESC);
CREATE INDEX idx_media_media_type ON media(media_type);
CREATE INDEX idx_media_search_vector ON media USING GIN(search_vector);
CREATE INDEX idx_media_analytics_media_id ON media_analytics(media_id);
CREATE INDEX idx_media_analytics_event_type ON media_analytics(event_type);
CREATE INDEX idx_media_analytics_created_at ON media_analytics(created_at DESC);

-- 5. Create RPC functions for media
CREATE OR REPLACE FUNCTION increment_media_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET view_count = COALESCE(view_count, 0) + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_plays(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET play_count = COALESCE(play_count, 0) + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_downloads(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET download_count = COALESCE(download_count, 0) + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_likes(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET like_count = COALESCE(like_count, 0) + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_media_likes(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_media_shares(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media SET share_count = COALESCE(share_count, 0) + 1 WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- STEP 4: CREATE SPARKLE MODULE
-- =====================================================

-- 1. Create sparkle_folders table FIRST
CREATE TABLE sparkle_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d5e38',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sparkles table
CREATE TABLE sparkles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  author TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  folder_id UUID REFERENCES sparkle_folders(id) ON DELETE SET NULL,
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '') || ' ' || coalesce(author, ''))
  ) STORED
);

-- 3. Create sparkle_analytics table
CREATE TABLE sparkle_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sparkle_id UUID NOT NULL REFERENCES sparkles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for sparkles
CREATE INDEX idx_sparkles_folder_id ON sparkles(folder_id);
CREATE INDEX idx_sparkles_publish_status ON sparkles(publish_status);
CREATE INDEX idx_sparkles_scheduled_at ON sparkles(scheduled_at);
CREATE INDEX idx_sparkles_created_at ON sparkles(created_at DESC);
CREATE INDEX idx_sparkles_search_vector ON sparkles USING GIN(search_vector);
CREATE INDEX idx_sparkle_analytics_sparkle_id ON sparkle_analytics(sparkle_id);
CREATE INDEX idx_sparkle_analytics_event_type ON sparkle_analytics(event_type);
CREATE INDEX idx_sparkle_analytics_created_at ON sparkle_analytics(created_at DESC);

-- 5. Create RPC functions for sparkles
CREATE OR REPLACE FUNCTION increment_sparkle_views(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_sparkle_likes(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles SET like_count = COALESCE(like_count, 0) + 1 WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_sparkle_likes(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_sparkle_shares(sparkle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sparkles SET share_count = COALESCE(share_count, 0) + 1 WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

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

-- =====================================================
-- STEP 5: CREATE SHARED TRIGGERS
-- =====================================================

-- Trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER banners_updated_at_trigger
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER banner_folders_updated_at_trigger
  BEFORE UPDATE ON banner_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER media_updated_at_trigger
  BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER media_folders_updated_at_trigger
  BEFORE UPDATE ON media_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sparkles_updated_at_trigger
  BEFORE UPDATE ON sparkles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sparkle_folders_updated_at_trigger
  BEFORE UPDATE ON sparkle_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================

SELECT 'Clean installation complete! ✅' AS status;

-- Verify tables created
SELECT 
  'Tables created: ' || COUNT(*) || ' of 9' AS summary
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'banners', 'banner_folders', 'banner_analytics',
    'media', 'media_folders', 'media_analytics',
    'sparkles', 'sparkle_folders', 'sparkle_analytics'
  );

-- List all created tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%banner%'
   OR table_name LIKE '%media%'
   OR table_name LIKE '%sparkle%')
ORDER BY table_name;
