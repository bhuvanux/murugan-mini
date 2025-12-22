-- =====================================================
-- SPARKLE AUTOMATION & YOUTUBE SHORTS INTEGRATION
-- Run this in your Admin Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to 'sparkle' table
-- We use 'sparkle' as the table name based on recent usage, but check for 'sparkles' too just in case.
-- (The codebase seems to switch between them, sticking to 'sparkle' as per recent fixes)

DO $$
BEGIN
    -- Rename table if needed (normalization)
    -- Only rename if 'sparkles' exists AND 'sparkle' does NOT exist to avoid collision
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sparkles') 
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sparkle') THEN
        ALTER TABLE sparkles RENAME TO sparkle;
    END IF;

    -- Add columns if they don't exist
    
    -- video_id (Unique identifier from YouTube/Source)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'video_id') THEN
        ALTER TABLE sparkle ADD COLUMN video_id TEXT;
        ALTER TABLE sparkle ADD CONSTRAINT uq_sparkle_video_id UNIQUE (video_id);
    END IF;

    -- video_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'video_url') THEN
        ALTER TABLE sparkle ADD COLUMN video_url TEXT;
    END IF;

    -- tags (Array of strings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'tags') THEN
        ALTER TABLE sparkle ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- source (youtube, instagram, manual, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'source') THEN
        ALTER TABLE sparkle ADD COLUMN source TEXT DEFAULT 'manual';
    END IF;

    -- original_published_at (Original publish time on platform)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'original_published_at') THEN
        ALTER TABLE sparkle ADD COLUMN original_published_at TIMESTAMPTZ;
    END IF;
    
    -- published_at (When it goes live on our app)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'published_at') THEN
        ALTER TABLE sparkle ADD COLUMN published_at TIMESTAMPTZ;
    END IF;

    -- ingested_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'ingested_at') THEN
        ALTER TABLE sparkle ADD COLUMN ingested_at TIMESTAMPTZ;
    END IF;

    -- ingested_by ("autobot", "user", etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'ingested_by') THEN
        ALTER TABLE sparkle ADD COLUMN ingested_by TEXT;
    END IF;

    -- meta (Raw JSON payload for future proofing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'meta') THEN
        ALTER TABLE sparkle ADD COLUMN meta JSONB DEFAULT '{}';
    END IF;

END $$;

-- 2. Create index for video_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_sparkle_video_id ON sparkle(video_id);
CREATE INDEX IF NOT EXISTS idx_sparkle_source ON sparkle(source);

-- 3. Verify Constraints
-- Ensure video_id is unique
-- (Handled in DO block above, but double check isn't harmful in SQL generally, but DO block covers it)

-- =====================================================
-- AUTOMATION SETUP COMPLETE
-- =====================================================
