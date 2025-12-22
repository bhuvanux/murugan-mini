CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS daily_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  background_url TEXT,
  storage_path TEXT,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'scheduled', 'archived', 'expired')),
  scheduled_for DATE NOT NULL,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  auto_delete BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_quotes_publish_status ON daily_quotes(publish_status);
CREATE INDEX IF NOT EXISTS idx_daily_quotes_scheduled_for ON daily_quotes(scheduled_for);

CREATE OR REPLACE FUNCTION increment_daily_quote_views(quote_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE daily_quotes
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'unified_analytics'
  ) THEN
    EXECUTE '
      CREATE VIEW unified_analytics AS
      SELECT
        module_name,
        item_id,
        event_type,
        ip_address,
        user_agent,
        device_type,
        created_at,
        metadata
      FROM analytics_tracking
    ';
  END IF;
END $$;

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
      'wallpaper', 'song', 'video', 'sparkle', 'photo', 'ask_gugan', 'banner', 'temple', 'quote'
    ));
END $$;

INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
VALUES ('quote', 'view', 'Quote Views', 'Track daily quote views', 'Eye', 70)
ON CONFLICT (module_name, event_type) DO NOTHING;
