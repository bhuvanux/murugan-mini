-- 🔧 Add Missing Columns to Banners Table
-- Run this in Supabase SQL Editor if diagnostic shows missing columns

-- IMPORTANT: Run CHECK_BANNERS_SCHEMA.sql first to see which columns you're missing!
-- Only run the ALTER TABLE commands for columns that are actually missing.

-- ============================================================================
-- Option 1: Add ALL recommended columns (Full functionality)
-- ============================================================================

-- Add published_at if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE banners ADD COLUMN published_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added published_at column';
  ELSE
    RAISE NOTICE '⏭️  published_at already exists';
  END IF;
END $$;

-- Add visibility if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE banners ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private'));
    RAISE NOTICE '✅ Added visibility column';
  ELSE
    RAISE NOTICE '⏭️  visibility already exists';
  END IF;
END $$;

-- Add banner_type if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'banner_type'
  ) THEN
    ALTER TABLE banners ADD COLUMN banner_type TEXT DEFAULT 'home';
    RAISE NOTICE '✅ Added banner_type column';
  ELSE
    RAISE NOTICE '⏭️  banner_type already exists';
  END IF;
END $$;

-- Add original_url if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'original_url'
  ) THEN
    ALTER TABLE banners ADD COLUMN original_url TEXT;
    RAISE NOTICE '✅ Added original_url column';
  ELSE
    RAISE NOTICE '⏭️  original_url already exists';
  END IF;
END $$;

-- Add storage_path if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE banners ADD COLUMN storage_path TEXT;
    RAISE NOTICE '✅ Added storage_path column';
  ELSE
    RAISE NOTICE '⏭️  storage_path already exists';
  END IF;
END $$;

-- Add view_count if missing (for analytics)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE banners ADD COLUMN view_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added view_count column';
  ELSE
    RAISE NOTICE '⏭️  view_count already exists';
  END IF;
END $$;

-- Add click_count if missing (for analytics)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'click_count'
  ) THEN
    ALTER TABLE banners ADD COLUMN click_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added click_count column';
  ELSE
    RAISE NOTICE '⏭️  click_count already exists';
  END IF;
END $$;

-- Add folder_id if missing (for folder organization)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE banners ADD COLUMN folder_id UUID REFERENCES banner_folders(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added folder_id column';
  ELSE
    RAISE NOTICE '⏭️  folder_id already exists';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '⚠️  banner_folders table does not exist, skipping folder_id';
END $$;

-- ============================================================================
-- Verify the changes
-- ============================================================================

SELECT 
  '🎉 Schema Update Complete!' as status,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'banners';

-- Show all columns after update
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'banners'
ORDER BY ordinal_position;

-- ============================================================================
-- ALTERNATIVE: Create banner_type ENUM (Recommended for type safety)
-- ============================================================================

-- Uncomment this if you want strict type checking for banner_type

/*
DO $$ 
BEGIN
  -- Create ENUM type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'banner_type_enum') THEN
    CREATE TYPE banner_type_enum AS ENUM ('home', 'wallpaper', 'songs', 'photos', 'videos', 'spark');
    RAISE NOTICE '✅ Created banner_type_enum type';
  END IF;
  
  -- Alter column to use ENUM (if banner_type exists and is TEXT)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' 
      AND column_name = 'banner_type' 
      AND data_type = 'text'
  ) THEN
    -- First, update any invalid values to 'home'
    UPDATE banners SET banner_type = 'home' 
    WHERE banner_type NOT IN ('home', 'wallpaper', 'songs', 'photos', 'videos', 'spark');
    
    -- Then change the column type
    ALTER TABLE banners ALTER COLUMN banner_type TYPE banner_type_enum USING banner_type::banner_type_enum;
    RAISE NOTICE '✅ Converted banner_type to ENUM';
  END IF;
END $$;
*/

-- ============================================================================
-- ALTERNATIVE: Minimal Schema (Keep it simple)
-- ============================================================================

-- If you only run the code with the recent fixes, you only need these columns:
-- ✅ id (UUID, primary key)
-- ✅ created_at (TIMESTAMPTZ)
-- ✅ title (TEXT)
-- ✅ description (TEXT)
-- ✅ image_url (TEXT)
-- ✅ thumbnail_url (TEXT)
-- ✅ order_index (INTEGER)
-- ✅ publish_status (TEXT)

-- The minimal insert in the current code works with just these!
-- All other columns are OPTIONAL enhancements.
