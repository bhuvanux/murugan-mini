-- =====================================================
-- COMPLETE MODULE SETUP - BANNER, MEDIA, SPARKLE
-- Run this on ADMIN SUPABASE DATABASE
-- =====================================================
-- This script creates folder tables and analytics tables
-- for Banner, Media, and Sparkle modules with 100% parity
-- to the Wallpapers module.
-- =====================================================

-- =====================================================
-- BANNER MODULE
-- =====================================================

-- Banner Folders Table
CREATE TABLE IF NOT EXISTS banner_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_banner_folders_created_at ON banner_folders(created_at DESC);

-- Banner Analytics Table (for tracking banner performance)
CREATE TABLE IF NOT EXISTS banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'click', 'share'
  user_id UUID,
  device_info JSONB,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_event_type ON banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created_at ON banner_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_event ON banner_analytics(banner_id, event_type, created_at DESC);

-- Add folder_id to banners table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE banners ADD COLUMN folder_id UUID REFERENCES banner_folders(id) ON DELETE SET NULL;
    CREATE INDEX idx_banners_folder_id ON banners(folder_id);
  END IF;
END $$;

-- =====================================================
-- MEDIA MODULE
-- =====================================================

-- Media Folders Table
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_folders_created_at ON media_folders(created_at DESC);

-- Media Analytics Table (for tracking media performance)
CREATE TABLE IF NOT EXISTS media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'play', 'download', 'like', 'share'
  user_id UUID,
  device_info JSONB,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_media_analytics_media_id ON media_analytics(media_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_event_type ON media_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_media_analytics_created_at ON media_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_analytics_media_event ON media_analytics(media_id, event_type, created_at DESC);

-- Add folder_id to media table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE media ADD COLUMN folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;
    CREATE INDEX idx_media_folder_id ON media(folder_id);
  END IF;
END $$;

-- =====================================================
-- SPARKLE MODULE
-- =====================================================

-- Sparkle Folders Table
CREATE TABLE IF NOT EXISTS sparkle_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sparkle_folders_created_at ON sparkle_folders(created_at DESC);

-- Sparkle Analytics Table (for tracking sparkle performance)
CREATE TABLE IF NOT EXISTS sparkle_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sparkle_id UUID NOT NULL REFERENCES sparkles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'like', 'share', 'comment'
  user_id UUID,
  device_info JSONB,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_sparkle_id ON sparkle_analytics(sparkle_id);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_event_type ON sparkle_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_created_at ON sparkle_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_sparkle_event ON sparkle_analytics(sparkle_id, event_type, created_at DESC);

-- Add folder_id to sparkles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sparkles' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE sparkles ADD COLUMN folder_id UUID REFERENCES sparkle_folders(id) ON DELETE SET NULL;
    CREATE INDEX idx_sparkles_folder_id ON sparkles(folder_id);
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all tables exist
SELECT 'banner_folders' as table_name, COUNT(*) as row_count FROM banner_folders
UNION ALL
SELECT 'banner_analytics', COUNT(*) FROM banner_analytics
UNION ALL
SELECT 'media_folders', COUNT(*) FROM media_folders
UNION ALL
SELECT 'media_analytics', COUNT(*) FROM media_analytics
UNION ALL
SELECT 'sparkle_folders', COUNT(*) FROM sparkle_folders
UNION ALL
SELECT 'sparkle_analytics', COUNT(*) FROM sparkle_analytics;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ ALL MODULES SETUP COMPLETE!';
  RAISE NOTICE 'Banner folders, Media folders, and Sparkle folders are ready.';
  RAISE NOTICE 'Analytics tables created for all modules.';
  RAISE NOTICE 'You can now use folder management and analytics in Admin Panel.';
END $$;
