-- ====================================================================
-- MURUGAN APP - FULL DATABASE SCHEMA
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. CATEGORIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wallpaper', 'media', 'photo', 'sparkle', 'banner')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. BANNERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  small_url TEXT,
  medium_url TEXT,
  large_url TEXT,
  original_url TEXT,
  storage_path TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. WALLPAPERS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS wallpapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  small_url TEXT,
  medium_url TEXT,
  large_url TEXT,
  original_url TEXT,
  storage_path TEXT NOT NULL,
  is_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  aspect_ratio TEXT DEFAULT '9:16',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. MEDIA TABLE (Songs, Videos, YouTube)
-- ====================================================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video', 'youtube')),
  file_url TEXT,
  thumbnail_url TEXT,
  youtube_id TEXT,
  youtube_url TEXT,
  storage_path TEXT,
  artist TEXT,
  duration INTEGER, -- in seconds
  file_size INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. PHOTOS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  small_url TEXT,
  medium_url TEXT,
  large_url TEXT,
  original_url TEXT,
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. SPARKLE (NEWS/ARTICLES) TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS sparkle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  content_json JSONB, -- Rich text editor content
  cover_image_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  author TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  read_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 7. USERS APP TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS users_app (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID, -- Link to Supabase Auth
  email TEXT UNIQUE,
  phone TEXT,
  name TEXT,
  avatar_url TEXT,
  profile_bg_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  device_id TEXT,
  fcm_token TEXT, -- Firebase Cloud Messaging
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 8. AI CHATS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_app(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  last_message TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. AI CHAT MESSAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES ai_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 10. DOWNLOADS LOG TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS downloads_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_app(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('wallpaper', 'photo', 'media')),
  content_id UUID NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 11. LIKES LOG TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS likes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_app(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('wallpaper', 'photo', 'media', 'sparkle')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- ====================================================================
-- 12. ADMIN ACTIVITY LOG TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish', 'upload')),
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================

-- Banners
CREATE INDEX idx_banners_publish_status ON banners(publish_status);
CREATE INDEX idx_banners_visibility ON banners(visibility);
CREATE INDEX idx_banners_category_id ON banners(category_id);
CREATE INDEX idx_banners_created_at ON banners(created_at DESC);

-- Wallpapers
CREATE INDEX idx_wallpapers_publish_status ON wallpapers(publish_status);
CREATE INDEX idx_wallpapers_visibility ON wallpapers(visibility);
CREATE INDEX idx_wallpapers_category_id ON wallpapers(category_id);
CREATE INDEX idx_wallpapers_is_featured ON wallpapers(is_featured);
CREATE INDEX idx_wallpapers_tags ON wallpapers USING GIN(tags);
CREATE INDEX idx_wallpapers_created_at ON wallpapers(created_at DESC);

-- Media
CREATE INDEX idx_media_media_type ON media(media_type);
CREATE INDEX idx_media_publish_status ON media(publish_status);
CREATE INDEX idx_media_category_id ON media(category_id);
CREATE INDEX idx_media_tags ON media USING GIN(tags);
CREATE INDEX idx_media_created_at ON media(created_at DESC);

-- Photos
CREATE INDEX idx_photos_publish_status ON photos(publish_status);
CREATE INDEX idx_photos_category_id ON photos(category_id);
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);

-- Sparkle
CREATE INDEX idx_sparkle_publish_status ON sparkle(publish_status);
CREATE INDEX idx_sparkle_category_id ON sparkle(category_id);
CREATE INDEX idx_sparkle_is_featured ON sparkle(is_featured);
CREATE INDEX idx_sparkle_tags ON sparkle USING GIN(tags);
CREATE INDEX idx_sparkle_published_at ON sparkle(published_at DESC);

-- AI Chats
CREATE INDEX idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX idx_ai_chat_messages_chat_id ON ai_chat_messages(chat_id);

-- Logs
CREATE INDEX idx_downloads_log_user_id ON downloads_log(user_id);
CREATE INDEX idx_downloads_log_content ON downloads_log(content_type, content_id);
CREATE INDEX idx_likes_log_user_content ON likes_log(user_id, content_type, content_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- ====================================================================
-- FUNCTIONS & TRIGGERS
-- ====================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallpapers_updated_at BEFORE UPDATE ON wallpapers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sparkle_updated_at BEFORE UPDATE ON sparkle FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_app_updated_at BEFORE UPDATE ON users_app FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_chats_updated_at BEFORE UPDATE ON ai_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment view/download/like counters
CREATE OR REPLACE FUNCTION increment_counter(
  table_name TEXT,
  record_id UUID,
  counter_name TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, counter_name, counter_name)
  USING record_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- INSERT DEFAULT CATEGORIES
-- ====================================================================

INSERT INTO categories (name, slug, type, icon, color) VALUES
  ('Festivals', 'festivals', 'banner', '🎉', '#FF6B6B'),
  ('Temples', 'temples', 'banner', '🛕', '#4ECDC4'),
  ('Lord Murugan', 'lord-murugan', 'wallpaper', '🙏', '#FFD93D'),
  ('Peacock', 'peacock', 'wallpaper', '🦚', '#6BCB77'),
  ('Vel', 'vel', 'wallpaper', '⚡', '#FF6B9D'),
  ('Arupadai Veedu', 'arupadai-veedu', 'wallpaper', '🏔️', '#C77DFF'),
  ('Devotional Songs', 'devotional-songs', 'media', '🎵', '#F72585'),
  ('Bhajans', 'bhajans', 'media', '🎶', '#7209B7'),
  ('Temple Videos', 'temple-videos', 'media', '🎬', '#560BAD'),
  ('Temple Photos', 'temple-photos', 'photo', '📸', '#3A0CA3'),
  ('Deity Photos', 'deity-photos', 'photo', '🖼️', '#4361EE'),
  ('Festival News', 'festival-news', 'sparkle', '📰', '#4CC9F0'),
  ('Temple Updates', 'temple-updates', 'sparkle', '📢', '#F15BB5')
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sparkle ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads_log ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public can view published banners" ON banners FOR SELECT USING (publish_status = 'published' AND visibility = 'public');
CREATE POLICY "Public can view published wallpapers" ON wallpapers FOR SELECT USING (publish_status = 'published' AND visibility = 'public');
CREATE POLICY "Public can view published media" ON media FOR SELECT USING (publish_status = 'published' AND visibility = 'public');
CREATE POLICY "Public can view published photos" ON photos FOR SELECT USING (publish_status = 'published' AND visibility = 'public');
CREATE POLICY "Public can view published sparkle" ON sparkle FOR SELECT USING (publish_status = 'published' AND visibility = 'public');

-- Admin full access (bypass RLS for service role)
-- Note: Service role key bypasses RLS automatically

-- Users can manage their own data
CREATE POLICY "Users can view own profile" ON users_app FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Users can update own profile" ON users_app FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can view own chats" ON ai_chats FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users_app WHERE id = user_id));
CREATE POLICY "Users can create own chats" ON ai_chats FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users_app WHERE id = user_id));

CREATE POLICY "Users can view own messages" ON ai_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM ai_chats WHERE ai_chats.id = chat_id AND auth.uid() = (SELECT auth_id FROM users_app WHERE id = ai_chats.user_id))
);
CREATE POLICY "Users can create own messages" ON ai_chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM ai_chats WHERE ai_chats.id = chat_id AND auth.uid() = (SELECT auth_id FROM users_app WHERE id = ai_chats.user_id))
);

CREATE POLICY "Users can manage own likes" ON likes_log FOR ALL USING (auth.uid() = (SELECT auth_id FROM users_app WHERE id = user_id));
CREATE POLICY "Users can create download logs" ON downloads_log FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM users_app WHERE id = user_id));

-- ====================================================================
-- STORAGE BUCKETS SETUP (Run via Supabase Dashboard or API)
-- ====================================================================
-- This SQL creates the schema. Storage buckets are created via server code.
-- See /supabase/functions/server/storage-init.tsx
