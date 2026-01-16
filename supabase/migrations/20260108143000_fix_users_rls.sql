-- Fix: Allow service role to read users table
-- This allows admin dashboard to query users directly via supabase client

-- Drop existing restrictive policies if they exist
drop policy if exists "Service role can manage users" on public.users;
drop policy if exists "Admins can view all users" on public.users;

-- Create new comprehensive policies

-- 1. Service role has full access (for server functions and admin operations)
create policy "Service role full access"
  on public.users
  for all
  to service_role
  using ( true )
  with check ( true );

-- 2. Authenticated users can view all users (for admin dashboard)
create policy "Authenticated users can view users"
  on public.users
  for select
  to authenticated
  using ( true );

-- 3. Allow anon key with service role context (for admin dashboard direct queries)
create policy "Allow public read for admin"
  on public.users
  for select  
  to anon
  using ( true );
