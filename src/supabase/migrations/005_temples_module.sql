  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS temples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temple_name_ta TEXT NOT NULL,
    temple_name_en TEXT,
    temple_fame TEXT NOT NULL,
    place TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    google_map_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_distance_enabled BOOLEAN DEFAULT TRUE,
    click_count INTEGER DEFAULT 0,
    search_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_temples_unique_key_place ON temples(search_key, place);
  CREATE INDEX IF NOT EXISTS idx_temples_is_active ON temples(is_active);
  CREATE INDEX IF NOT EXISTS idx_temples_click_count ON temples(click_count DESC);
  CREATE INDEX IF NOT EXISTS idx_temples_search_key_trgm ON temples USING GIN (search_key gin_trgm_ops);

  CREATE TABLE IF NOT EXISTS temple_click_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temple_id UUID REFERENCES temples(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    device_type TEXT,
    user_location JSONB
  );

  CREATE INDEX IF NOT EXISTS idx_temple_click_logs_temple_id ON temple_click_logs(temple_id);
  CREATE INDEX IF NOT EXISTS idx_temple_click_logs_clicked_at ON temple_click_logs(clicked_at DESC);

  CREATE TABLE IF NOT EXISTS temple_festivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temple_id UUID REFERENCES temples(id) ON DELETE CASCADE,
    festival_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(temple_id, festival_id)
  );

  CREATE INDEX IF NOT EXISTS idx_temple_festivals_temple_id ON temple_festivals(temple_id);

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
        'wallpaper', 'song', 'video', 'sparkle', 'photo', 'ask_gugan', 'banner', 'temple'
      ));
  END $$;

  INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
  VALUES ('temple', 'click', 'Temple Clicks', 'Track temple card clicks', 'MousePointer', 60)
  ON CONFLICT (module_name, event_type) DO NOTHING;

  CREATE OR REPLACE FUNCTION increment_temple_clicks(temple_id UUID)
  RETURNS void AS $$
  BEGIN
    UPDATE temples
    SET click_count = COALESCE(click_count, 0) + 1,
        updated_at = NOW()
    WHERE id = temple_id;
  END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE FUNCTION log_temple_click_from_analytics()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.module_name = 'temple' AND NEW.event_type = 'click' THEN
      PERFORM increment_temple_clicks(NEW.item_id);

      INSERT INTO temple_click_logs (temple_id, clicked_at, device_type, user_location)
      VALUES (
        NEW.item_id,
        NEW.created_at,
        NEW.device_type,
        CASE
          WHEN NEW.metadata ? 'user_location' THEN NEW.metadata->'user_location'
          ELSE NULL
        END
      );
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_log_temple_click_from_analytics ON analytics_tracking;
  CREATE TRIGGER trg_log_temple_click_from_analytics
  AFTER INSERT ON analytics_tracking
  FOR EACH ROW
  EXECUTE FUNCTION log_temple_click_from_analytics();
