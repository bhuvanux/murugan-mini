-- Add download_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sparkle' AND column_name = 'download_count') THEN
        ALTER TABLE sparkle ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Increment Sparkle Downloads
CREATE OR REPLACE FUNCTION increment_sparkle_downloads(sparkle_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sparkle
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = sparkle_id;
END;
$$ LANGUAGE plpgsql;
