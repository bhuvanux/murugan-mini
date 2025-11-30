-- ====================================================================
-- BANNER SYSTEM ENHANCEMENTS
-- Migration to add new banner columns for module routing
-- ====================================================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add banner_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='banner_type') THEN
    ALTER TABLE banners ADD COLUMN banner_type TEXT DEFAULT 'home';
    ALTER TABLE banners ADD CONSTRAINT banners_banner_type_check 
      CHECK (banner_type IN ('wallpaper', 'photos', 'media', 'sparkle', 'home'));
  END IF;

  -- Add category text column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='category') THEN
    ALTER TABLE banners ADD COLUMN category TEXT;
  END IF;

  -- Add expires_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='expires_at') THEN
    ALTER TABLE banners ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add multi-resolution image URLs if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='small_url') THEN
    ALTER TABLE banners ADD COLUMN small_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='medium_url') THEN
    ALTER TABLE banners ADD COLUMN medium_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='large_url') THEN
    ALTER TABLE banners ADD COLUMN large_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='original_url') THEN
    ALTER TABLE banners ADD COLUMN original_url TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banners_banner_type ON banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_banners_order_index ON banners(order_index ASC);
CREATE INDEX IF NOT EXISTS idx_banners_expires_at ON banners(expires_at);

-- Update existing banners to have a default banner_type
UPDATE banners 
SET banner_type = 'home' 
WHERE banner_type IS NULL;

-- Success message
SELECT '✅ Banner enhancements migration complete!' as message;
