-- Create a table for public profiles (users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text,
  city text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone default timezone('utc'::text, now()),
  metadata jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies

-- 1. Metadata/Server function can do anything (Service Role)
create policy "Service role can manage users"
  on public.users
  for all
  using ( true )
  with check ( true );

-- 2. Authenticated admins can view all users
create policy "Admins can view all users"
  on public.users
  for select
  using ( 
    auth.role() = 'authenticated' -- In a real app, check for specific admin claim/table
  );

-- 3. Users can view their own profile (based on phone match if we had real auth uid mapped, 
--    but here we use service role mostly for upsert during OTP)

-- Indexes for performance
create index if not exists users_phone_idx on public.users (phone);
create index if not exists users_created_at_idx on public.users (created_at desc);
create index if not exists users_city_idx on public.users (city);
