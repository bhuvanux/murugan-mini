-- ============================================================================
-- MURUGAN CALENDAR (REAL-TIME READY)
-- Computed Panchang cache + admin override + reminders
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1) CALENDAR DAYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gregorian_date DATE NOT NULL UNIQUE,
  tamil_month TEXT,
  tamil_day INTEGER,
  tamil_year INTEGER,
  weekday_tamil TEXT,
  paksham TEXT CHECK (paksham IN ('Valar', 'Thei')),
  is_today BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_days_gregorian_date ON calendar_days(gregorian_date);

CREATE TRIGGER update_calendar_days_updated_at
BEFORE UPDATE ON calendar_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2) PANCHANG COMPUTED (ENGINE OUTPUT + OVERRIDE SOURCE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS panchang_computed (
  calendar_day_id UUID PRIMARY KEY REFERENCES calendar_days(id) ON DELETE CASCADE,

  tithi_name TEXT,
  tithi_start TIMESTAMPTZ,
  tithi_end TIMESTAMPTZ,

  nakshatra_name TEXT,
  nakshatra_start TIMESTAMPTZ,
  nakshatra_end TIMESTAMPTZ,

  yogam TEXT,
  karanam TEXT,

  is_sashti BOOLEAN DEFAULT FALSE,
  is_skanda_sashti BOOLEAN DEFAULT FALSE,
  is_amavasai BOOLEAN DEFAULT FALSE,
  is_pournami BOOLEAN DEFAULT FALSE,

  computation_source TEXT NOT NULL DEFAULT 'engine'
    CHECK (computation_source IN ('engine', 'admin_override', 'fallback')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panchang_computed_flags ON panchang_computed(is_sashti, is_skanda_sashti, is_amavasai, is_pournami);

CREATE TRIGGER update_panchang_computed_updated_at
BEFORE UPDATE ON panchang_computed
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3) TIMINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS timings (
  calendar_day_id UUID PRIMARY KEY REFERENCES calendar_days(id) ON DELETE CASCADE,

  sunrise TIMESTAMPTZ,
  sunset TIMESTAMPTZ,

  nalla_neram_morning TEXT,
  nalla_neram_evening TEXT,

  rahu_kalam TEXT,
  yamagandam TEXT,
  kuligai TEXT,
  abhijit TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_timings_updated_at
BEFORE UPDATE ON timings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4) MURUGAN EVENTS + DAY MAPPING
-- ============================================================================
CREATE TABLE IF NOT EXISTS murugan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_murugan_events_updated_at
BEFORE UPDATE ON murugan_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS calendar_day_events (
  calendar_day_id UUID REFERENCES calendar_days(id) ON DELETE CASCADE,
  murugan_event_id UUID REFERENCES murugan_events(id) ON DELETE CASCADE,
  PRIMARY KEY (calendar_day_id, murugan_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_day_events_day ON calendar_day_events(calendar_day_id);

-- ============================================================================
-- 5) ADMIN REFERENCE DATA (FALLBACK LAYER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS panchang_reference_days (
  gregorian_date DATE PRIMARY KEY,
  reference_payload JSONB NOT NULL,
  source TEXT DEFAULT 'admin_upload',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_panchang_reference_days_updated_at
BEFORE UPDATE ON panchang_reference_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6) ADMIN OVERRIDES (TRUST LAYER + AUDIT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS panchang_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_day_id UUID NOT NULL UNIQUE REFERENCES calendar_days(id) ON DELETE CASCADE,
  editor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  override_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_panchang_overrides_updated_at
BEFORE UPDATE ON panchang_overrides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS panchang_override_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id UUID NOT NULL REFERENCES panchang_overrides(id) ON DELETE CASCADE,
  editor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  before_payload JSONB,
  after_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panchang_override_audit_override_id ON panchang_override_audit_log(override_id);

-- ============================================================================
-- 7) USER REMINDER PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_reminder_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sashti_enabled BOOLEAN DEFAULT FALSE,
  skanda_sashti_enabled BOOLEAN DEFAULT FALSE,
  festival_enabled BOOLEAN DEFAULT FALSE,
  daily_panchang_enabled BOOLEAN DEFAULT FALSE,
  preferred_time TIME DEFAULT '06:00',
  notify_previous_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_reminder_preferences_updated_at
BEFORE UPDATE ON user_reminder_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8) SCHEDULED NOTIFICATIONS + DELIVERY LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_day_id UUID REFERENCES calendar_days(id) ON DELETE SET NULL,
  murugan_event_id UUID REFERENCES murugan_events(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('sashti', 'skanda_sashti', 'festival', 'daily_panchang')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_time ON scheduled_notifications(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_time ON scheduled_notifications(status, scheduled_at);

CREATE TRIGGER update_scheduled_notifications_updated_at
BEFORE UPDATE ON scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9) RLS POLICIES
-- ============================================================================

-- Public read-only calendar data (client reads via Edge Function anyway, but allow SELECT).
ALTER TABLE calendar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE panchang_computed ENABLE ROW LEVEL SECURITY;
ALTER TABLE timings ENABLE ROW LEVEL SECURITY;
ALTER TABLE murugan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_day_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view calendar days" ON calendar_days
FOR SELECT USING (true);

CREATE POLICY "Public can view computed panchang" ON panchang_computed
FOR SELECT USING (true);

CREATE POLICY "Public can view timings" ON timings
FOR SELECT USING (true);

CREATE POLICY "Public can view murugan events" ON murugan_events
FOR SELECT USING (true);

CREATE POLICY "Public can view calendar day events" ON calendar_day_events
FOR SELECT USING (true);

-- User-owned settings and notifications
ALTER TABLE user_reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder preferences" ON user_reminder_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own reminder preferences" ON user_reminder_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder preferences" ON user_reminder_preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own scheduled notifications" ON scheduled_notifications
FOR SELECT USING (auth.uid() = user_id);

-- Admin reference/overrides (no public access)
ALTER TABLE panchang_reference_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE panchang_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE panchang_override_audit_log ENABLE ROW LEVEL SECURITY;
