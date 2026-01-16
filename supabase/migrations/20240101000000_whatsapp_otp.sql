-- Create OTP Sessions Table
CREATE TABLE IF NOT EXISTS public.otp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Optional, usually handled by Edge Functions via Service Role)
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

-- Cleanup policy (Delete expired sessions)
CREATE OR REPLACE FUNCTION delete_expired_otps() 
RETURNS void AS $$
BEGIN
    DELETE FROM public.otp_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Suggested: A cron job to run the cleanup (if pg_cron is enabled)
-- SELECT cron.schedule('*/5 * * * *', 'SELECT delete_expired_otps()');
