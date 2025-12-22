-- ====================================================================
-- 004 - SYNCED LYRICS AUDIO PLAYER
-- Adds: audios, lyrics_blocks, (optional) lyrics_versions
-- ====================================================================

-- 1) AUDIOS
CREATE TABLE IF NOT EXISTS audios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_seconds DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_audios_created_at ON audios(created_at DESC);

-- 2) LYRICS BLOCKS (timestamped lines)
CREATE TABLE IF NOT EXISTS lyrics_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audio_id UUID NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  start DOUBLE PRECISION NOT NULL,
  "end" DOUBLE PRECISION NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_blocks_audio_index ON lyrics_blocks(audio_id, index);
CREATE INDEX IF NOT EXISTS idx_lyrics_blocks_audio_start ON lyrics_blocks(audio_id, start);

-- 3) OPTIONAL: LYRICS VERSIONS (audit/history)
CREATE TABLE IF NOT EXISTS lyrics_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audio_id UUID NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  lyrics_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_versions_audio_version ON lyrics_versions(audio_id, version);

-- 4) RLS
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics_versions ENABLE ROW LEVEL SECURITY;

-- Public read access (service role bypasses RLS automatically)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audios' AND policyname = 'Public can view audios'
  ) THEN
    CREATE POLICY "Public can view audios" ON audios FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lyrics_blocks' AND policyname = 'Public can view lyrics blocks'
  ) THEN
    CREATE POLICY "Public can view lyrics blocks" ON lyrics_blocks FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lyrics_versions' AND policyname = 'Public can view lyrics versions'
  ) THEN
    CREATE POLICY "Public can view lyrics versions" ON lyrics_versions FOR SELECT USING (true);
  END IF;
END $$;
