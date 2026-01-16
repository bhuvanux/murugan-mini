-- Add INSERT policy to allow user creation during signup

-- Allow anyone (anon/authenticated) to insert users
create policy "Allow user creation"
  on public.users
  for insert
  to anon, authenticated
  with check ( true );

-- Also allow UPDATE for existing users (for last_login_at updates via upsert)
create policy "Allow user updates"
  on public.users
  for update
  to anon, authenticated
  using ( true )
  with check ( true );
