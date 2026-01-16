-- Add fcm_token column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS fcm_token text;

-- Create an index for faster lookups (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON public.users(fcm_token);

-- Allow authenticated users to update their own fcm_token
-- (Assuming RLS is enabled, you might need a policy like this)
-- CREATE POLICY "Users can update their own fcm_token" ON public.users FOR UPDATE USING (auth.uid() = id);
