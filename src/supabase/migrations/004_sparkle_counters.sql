-- ============================================================================
-- SPARKLE COUNTER FUNCTIONS
-- ============================================================================

-- Add view_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'view_count') THEN
        ALTER TABLE sparkle ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Increment Sparkle Views
CREATE OR REPLACE FUNCTION increment_sparkle_views(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET view_count = view_count + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

-- Increment Sparkle Likes
CREATE OR REPLACE FUNCTION increment_sparkle_likes(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET like_count = like_count + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement Sparkle Likes (for unlike)
CREATE OR REPLACE FUNCTION decrement_sparkle_likes(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

-- Increment Sparkle Shares
CREATE OR REPLACE FUNCTION increment_sparkle_shares(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET share_count = share_count + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;

-- Increment Sparkle Reads
CREATE OR REPLACE FUNCTION increment_sparkle_reads(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET read_count = read_count + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;
