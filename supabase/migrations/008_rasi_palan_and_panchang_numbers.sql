ALTER TABLE panchang_computed
ADD COLUMN IF NOT EXISTS tithi_number INTEGER;

ALTER TABLE panchang_computed
ADD COLUMN IF NOT EXISTS nakshatra_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_panchang_computed_tithi_number ON panchang_computed(tithi_number);
CREATE INDEX IF NOT EXISTS idx_panchang_computed_nakshatra_number ON panchang_computed(nakshatra_number);

CREATE TABLE IF NOT EXISTS daily_rasi_palan (
  gregorian_date DATE NOT NULL,
  rasi TEXT NOT NULL,
  palan TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (gregorian_date, rasi)
);

CREATE INDEX IF NOT EXISTS idx_daily_rasi_palan_date ON daily_rasi_palan(gregorian_date);

CREATE TRIGGER update_daily_rasi_palan_updated_at
BEFORE UPDATE ON daily_rasi_palan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE daily_rasi_palan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view daily rasi palan" ON daily_rasi_palan
FOR SELECT USING (true);
