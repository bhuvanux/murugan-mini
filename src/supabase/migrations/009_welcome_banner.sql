-- ====================================================================
-- WELCOME BANNER FOR NEW USERS
-- Add display_orientation field and welcome banner tracking
-- ====================================================================

DO $$ 
BEGIN
  -- Add display_orientation column (horizontal/vertical)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='display_orientation') THEN
    ALTER TABLE banners ADD COLUMN display_orientation TEXT DEFAULT 'horizontal';
    ALTER TABLE banners ADD CONSTRAINT banners_display_orientation_check 
      CHECK (display_orientation IN ('horizontal', 'vertical'));
  END IF;

  -- Add is_welcome_banner flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='is_welcome_banner') THEN
    ALTER TABLE banners ADD COLUMN is_welcome_banner BOOLEAN DEFAULT false;
  END IF;

  -- Add target_audience column (all, new_users, returning_users)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='banners' AND column_name='target_audience') THEN
    ALTER TABLE banners ADD COLUMN target_audience TEXT DEFAULT 'all';
    ALTER TABLE banners ADD CONSTRAINT banners_target_audience_check 
      CHECK (target_audience IN ('all', 'new_users', 'returning_users'));
  END IF;
END $$;

-- Create banner_dismissals table to track which users dismissed which banners
CREATE TABLE IF NOT EXISTS banner_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id UUID REFERENCES banners(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  phone TEXT, -- For mock users
  UNIQUE(user_id, banner_id),
  UNIQUE(phone, banner_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_banner_dismissals_user_id ON banner_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_banner_dismissals_phone ON banner_dismissals(phone);
CREATE INDEX IF NOT EXISTS idx_banners_welcome ON banners(is_welcome_banner) WHERE is_welcome_banner = true;
CREATE INDEX IF NOT EXISTS idx_banners_orientation ON banners(display_orientation);

-- Success message
SELECT '✅ Welcome banner migration complete!' as message;
