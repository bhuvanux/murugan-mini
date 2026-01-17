-- Allow authenticated users to update their own profile data
-- This fixes the issue where profile saves were failing silently due to RLS

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
