CREATE TABLE IF NOT EXISTS daily_calendar_extras (
  gregorian_date DATE PRIMARY KEY,
  gowri_good_time_morning TEXT,
  gowri_good_time_evening TEXT,
  soolam TEXT,
  pariharam TEXT,
  karanam_time TEXT,
  sam_nokku_naal TEXT,
  chandrashtamam TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_calendar_extras_date ON daily_calendar_extras(gregorian_date);

CREATE TRIGGER update_daily_calendar_extras_updated_at
BEFORE UPDATE ON daily_calendar_extras
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE daily_calendar_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view daily calendar extras" ON daily_calendar_extras
FOR SELECT USING (true);
