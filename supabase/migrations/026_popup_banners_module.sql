CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS popup_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,
  target_url TEXT,
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('published', 'draft', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popup_banners_publish_status ON popup_banners(publish_status);
CREATE INDEX IF NOT EXISTS idx_popup_banners_is_enabled ON popup_banners(is_enabled);
CREATE INDEX IF NOT EXISTS idx_popup_banners_priority ON popup_banners(priority DESC);
CREATE INDEX IF NOT EXISTS idx_popup_banners_scheduled_at ON popup_banners(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_popup_banners_starts_at ON popup_banners(starts_at);
CREATE INDEX IF NOT EXISTS idx_popup_banners_ends_at ON popup_banners(ends_at);

CREATE OR REPLACE FUNCTION increment_popup_banner_views(popup_banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE popup_banners
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = popup_banner_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_popup_banner_clicks(popup_banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE popup_banners
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = NOW()
  WHERE id = popup_banner_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  constraint_to_drop TEXT;
BEGIN
  SELECT conname
  INTO constraint_to_drop
  FROM pg_constraint
  WHERE conrelid = 'analytics_tracking'::regclass
    AND contype = 'c'
    AND conname ILIKE '%module_name%check%'
  LIMIT 1;

  IF constraint_to_drop IS NOT NULL THEN
    EXECUTE format('ALTER TABLE analytics_tracking DROP CONSTRAINT %I', constraint_to_drop);
  END IF;

  ALTER TABLE analytics_tracking
    ADD CONSTRAINT analytics_tracking_module_name_check
    CHECK (module_name IN (
      'wallpaper', 'song', 'video', 'sparkle', 'photo', 'ask_gugan', 'banner', 'temple', 'quote', 'popup_banner'
    ));
END $$;

INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
VALUES
  ('popup_banner', 'view', 'Popup Banner Views', 'Track popup banner impressions', 'Eye', 80),
  ('popup_banner', 'click', 'Popup Banner Clicks', 'Track popup banner clicks', 'MousePointer', 81)
ON CONFLICT (module_name, event_type) DO NOTHING;
