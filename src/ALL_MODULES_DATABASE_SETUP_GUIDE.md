# 🗄️ Complete Database Setup Guide for All Modules
## Murugan Wallpapers & Videos - Admin Panel

This guide walks you through setting up **ALL database tables** for Banner, Media, Sparkle, and Wallpaper modules in your Admin Supabase project.

---

## 📋 Prerequisites

- [ ] Access to your **Admin Supabase** project dashboard
- [ ] SQL Editor access
- [ ] Service role key configured

---

## 🎯 Quick Setup (Run All at Once)

### Option 1: Individual SQL Files (Recommended)

Run each SQL file in order:

1. **Wallpapers** - `/WALLPAPER_DATABASE_SETUP.sql` (if not already done)
2. **Banners** - `/BANNER_DATABASE_SETUP.sql` ⭐ NEW
3. **Media** - `/MEDIA_DATABASE_SETUP.sql` ⭐ NEW
4. **Sparkles** - `/SPARKLE_DATABASE_SETUP.sql` ⭐ NEW

### Option 2: All-in-One Script (Below)

Copy and run the complete script below in your Supabase SQL Editor.

---

## 🚀 Complete All-Modules Setup SQL

```sql
-- =====================================================
-- MURUGAN WALLPAPERS & VIDEOS
-- ALL MODULES DATABASE SETUP
-- =====================================================
-- This script sets up Banner, Media, and Sparkle modules
-- Run this in your Admin Supabase SQL Editor
-- =====================================================

-- =====================================================
-- BANNER MODULE
-- =====================================================

-- 1. Create banner_folders table first (referenced by banners)
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
  folder_id UUID REFERENCES banner_folders(id) ON DELETE SET NULL,
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

-- 3. Create banner_analytics table
CREATE TABLE IF NOT EXISTS banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for banners
CREATE INDEX IF NOT EXISTS idx_banners_folder_id ON banners(folder_id);
CREATE INDEX IF NOT EXISTS idx_banners_publish_status ON banners(publish_status);
CREATE INDEX IF NOT EXISTS idx_banners_scheduled_at ON banners(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banners_search_vector ON banners USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_event_type ON banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created_at ON banner_analytics(created_at DESC);

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
-- MEDIA MODULE
-- =====================================================

-- 1. Create media_folders table first (referenced by media)
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
CREATE TABLE IF NOT EXISTS media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'play', 'download', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for media
CREATE INDEX IF NOT EXISTS idx_media_folder_id ON media(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_publish_status ON media(publish_status);
CREATE INDEX IF NOT EXISTS idx_media_scheduled_at ON media(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_search_vector ON media USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_media_analytics_media_id ON media_analytics(media_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_event_type ON media_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_media_analytics_created_at ON media_analytics(created_at DESC);

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
-- SPARKLE MODULE
-- =====================================================

-- 1. Create sparkle_folders table first (referenced by sparkles)
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
CREATE TABLE IF NOT EXISTS sparkle_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sparkle_id UUID NOT NULL REFERENCES sparkles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'like', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for sparkles
CREATE INDEX IF NOT EXISTS idx_sparkles_folder_id ON sparkles(folder_id);
CREATE INDEX IF NOT EXISTS idx_sparkles_publish_status ON sparkles(publish_status);
CREATE INDEX IF NOT EXISTS idx_sparkles_scheduled_at ON sparkles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sparkles_created_at ON sparkles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sparkles_search_vector ON sparkles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_sparkle_id ON sparkle_analytics(sparkle_id);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_event_type ON sparkle_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_created_at ON sparkle_analytics(created_at DESC);

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
-- SHARED TRIGGERS (Update timestamps)
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
DROP TRIGGER IF EXISTS banners_updated_at_trigger ON banners;
CREATE TRIGGER banners_updated_at_trigger
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS banner_folders_updated_at_trigger ON banner_folders;
CREATE TRIGGER banner_folders_updated_at_trigger
  BEFORE UPDATE ON banner_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS media_updated_at_trigger ON media;
CREATE TRIGGER media_updated_at_trigger
  BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS media_folders_updated_at_trigger ON media_folders;
CREATE TRIGGER media_folders_updated_at_trigger
  BEFORE UPDATE ON media_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sparkles_updated_at_trigger ON sparkles;
CREATE TRIGGER sparkles_updated_at_trigger
  BEFORE UPDATE ON sparkles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sparkle_folders_updated_at_trigger ON sparkle_folders;
CREATE TRIGGER sparkle_folders_updated_at_trigger
  BEFORE UPDATE ON sparkle_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================

SELECT 'Database setup complete! ✅' AS status;

-- Verify tables created
SELECT 
  'Tables created: ' || COUNT(*) AS summary
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'banners', 'banner_folders', 'banner_analytics',
    'media', 'media_folders', 'media_analytics',
    'sparkles', 'sparkle_folders', 'sparkle_analytics'
  );
```

---

## ✅ Verification Steps

After running the SQL, verify everything is set up:

### 1. Check Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%banner%'
   OR table_name LIKE '%media%'
   OR table_name LIKE '%sparkle%'
ORDER BY table_name;
```

Expected output:
```
banner_analytics
banner_folders
banners
media
media_analytics
media_folders
sparkle_analytics
sparkle_folders
sparkles
```

### 2. Check RPC Functions Created

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE 'increment_banner%'
   OR routine_name LIKE 'increment_media%'
   OR routine_name LIKE 'increment_sparkle%'
   OR routine_name LIKE 'decrement_%'
   OR routine_name LIKE 'auto_publish_%')
ORDER BY routine_name;
```

Expected output:
```
auto_publish_scheduled_banners
auto_publish_scheduled_media
auto_publish_scheduled_sparkles
decrement_media_likes
decrement_sparkle_likes
increment_banner_clicks
increment_banner_views
increment_media_downloads
increment_media_likes
increment_media_plays
increment_media_shares
increment_media_views
increment_sparkle_likes
increment_sparkle_shares
increment_sparkle_views
```

### 3. Test Insert Data

```sql
-- Test banner
INSERT INTO banners (title, image_url, publish_status)
VALUES ('Test Banner', 'https://example.com/image.jpg', 'published');

-- Test media
INSERT INTO media (title, media_url, media_type, publish_status)
VALUES ('Test Media', 'https://example.com/audio.mp3', 'audio', 'published');

-- Test sparkle
INSERT INTO sparkles (title, content, publish_status)
VALUES ('Test Sparkle', 'This is a test sparkle content', 'published');

-- Verify inserts
SELECT 'Banners' AS table_name, COUNT(*) AS count FROM banners
UNION ALL
SELECT 'Media', COUNT(*) FROM media
UNION ALL
SELECT 'Sparkles', COUNT(*) FROM sparkles;
```

### 4. Test RPC Functions

```sql
-- Get a banner ID
SELECT id FROM banners LIMIT 1;

-- Test increment (replace UUID with actual ID)
SELECT increment_banner_views('your-banner-id-here');

-- Verify counter increased
SELECT title, view_count FROM banners LIMIT 1;
```

---

## 🗃️ Database Schema Overview

### Banner Module Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `banners` | Main banner data | `id`, `title`, `image_url`, `link_url`, `view_count`, `click_count` |
| `banner_folders` | Folder organization | `id`, `name`, `color`, `icon` |
| `banner_analytics` | Event tracking | `banner_id`, `event_type`, `metadata`, `created_at` |

### Media Module Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `media` | Main media data | `id`, `title`, `media_url`, `media_type`, `duration`, `play_count` |
| `media_folders` | Folder organization | `id`, `name`, `color`, `icon` |
| `media_analytics` | Event tracking | `media_id`, `event_type`, `metadata`, `created_at` |

### Sparkle Module Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sparkles` | Main sparkle data | `id`, `title`, `content`, `author`, `view_count`, `like_count` |
| `sparkle_folders` | Folder organization | `id`, `name`, `color`, `icon` |
| `sparkle_analytics` | Event tracking | `sparkle_id`, `event_type`, `metadata`, `created_at` |

---

## 🔧 Maintenance

### Clean Up Test Data

```sql
-- Delete test records
DELETE FROM banners WHERE title = 'Test Banner';
DELETE FROM media WHERE title = 'Test Media';
DELETE FROM sparkles WHERE title = 'Test Sparkle';
```

### Reset Counters

```sql
-- Reset all counters to 0
UPDATE banners SET view_count = 0, click_count = 0;
UPDATE media SET view_count = 0, play_count = 0, download_count = 0, like_count = 0, share_count = 0;
UPDATE sparkles SET view_count = 0, like_count = 0, share_count = 0;
```

### Drop All Tables (DANGER!)

```sql
-- ⚠️ WARNING: This will DELETE ALL DATA!
DROP TABLE IF EXISTS banner_analytics CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS banner_folders CASCADE;
DROP TABLE IF EXISTS media_analytics CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS media_folders CASCADE;
DROP TABLE IF EXISTS sparkle_analytics CASCADE;
DROP TABLE IF EXISTS sparkles CASCADE;
DROP TABLE IF EXISTS sparkle_folders CASCADE;
```

---

## 🆘 Troubleshooting

### Error: "relation already exists"
- **Solution:** Tables already created. Safe to ignore or drop and recreate.

### Error: "permission denied"
- **Solution:** Make sure you're using service role key, not anon key.

### Error: "foreign key constraint"
- **Solution:** Make sure folder tables are created BEFORE main tables.

### Error: "function does not exist"
- **Solution:** Run the RPC function creation SQL again.

---

## 📚 Next Steps

After database setup is complete:

1. ✅ Proceed to **Frontend Implementation**
   - See `/COMPLETE_MODULE_REPLICATION_GUIDE.md`

2. ✅ Create **Server Endpoints**
   - Copy `/supabase/functions/server/wallpaper-folders-analytics.tsx`
   - Adapt for Banner, Media, Sparkle

3. ✅ Build **Admin Components**
   - Use `GenericAnalyticsDrawer` for consistency
   - Copy wallpaper manager as template

4. ✅ Test **All 7 Features**
   - Folders, Calendar, Analytics, Tabs, Settings, Scheduling, Tracking

---

## ✅ Success!

Your database is now ready to support **ALL modules** with:
- ✅ Folder organization
- ✅ Publishing workflow (draft → scheduled → published)
- ✅ Analytics tracking
- ✅ Auto-publishing scheduled items
- ✅ Full-text search
- ✅ Atomic counter updates

**Time to build the frontend!** 🚀
