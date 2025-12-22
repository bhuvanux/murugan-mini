-- Add fields to support push state for popup banners
ALTER TABLE popup_banners
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS force_show BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_popup_banners_is_active ON popup_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_popup_banners_force_show ON popup_banners(force_show);
CREATE INDEX IF NOT EXISTS idx_popup_banners_pushed_at ON popup_banners(pushed_at DESC);
