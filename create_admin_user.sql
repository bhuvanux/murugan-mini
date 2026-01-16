-- Create Admin User for Tamil Kadavul Murugan App
-- Run this in your Supabase SQL Editor

-- Create the admin user with email/password authentication
-- Email: support@tamilkadavulmurugan.com
-- Password: Bhuvan@2026!

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'support@tamilkadavulmurugan.com',
  crypt('Bhuvan@2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'support@tamilkadavulmurugan.com'
);

-- Verify the user was created
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'support@tamilkadavulmurugan.com';
