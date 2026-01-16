-- ==========================================================
-- COMPREHENSIVE SCHEMA FIX FOR SPARKLES TABLE
-- ==========================================================

-- The error "column sparkles.published_at does not exist" confirms the table is incomplete.
-- We will add ALL potential missing columns safely.

DO $$
BEGIN
    -- 1. published_at (Critical for sorting)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'published_at') THEN
        ALTER TABLE sparkles ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 2. Basic content fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'subtitle') THEN
        ALTER TABLE sparkles ADD COLUMN subtitle TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'content') THEN
        ALTER TABLE sparkles ADD COLUMN content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'content_json') THEN
        ALTER TABLE sparkles ADD COLUMN content_json JSONB;
    END IF;

    -- 3. Media fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'cover_image_url') THEN
        ALTER TABLE sparkles ADD COLUMN cover_image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE sparkles ADD COLUMN thumbnail_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'storage_path') THEN
        ALTER TABLE sparkles ADD COLUMN storage_path TEXT;
    END IF;

    -- 4. Metadata fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'author') THEN
        ALTER TABLE sparkles ADD COLUMN author TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'tags') THEN
        ALTER TABLE sparkles ADD COLUMN tags TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'publish_status') THEN
        ALTER TABLE sparkles ADD COLUMN publish_status TEXT DEFAULT 'draft';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'is_featured') THEN
        ALTER TABLE sparkles ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkles' AND column_name = 'created_at') THEN
        ALTER TABLE sparkles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

END $$;

-- Verify columns at the end
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sparkles';
