-- ====================================================================
-- MIGRATION: 011_storage_policies.sql
-- PURPOSE: Fix "new row violates row-level security policy" error on profile upload
-- ====================================================================

-- 1. Create 'photos' bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (usually enabled by default, but ensuring it)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read Access (for viewing profile pics)
-- Drop first to avoid conflict if re-running
DROP POLICY IF EXISTS "Public Access Photos" ON storage.objects;
CREATE POLICY "Public Access Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'photos' );

-- 4. Policy: Authenticated Upload Access (INSERT)
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'photos' );

-- 5. Policy: Users can update their own uploads (UPDATE)
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'photos' AND auth.uid() = owner );

-- 6. Policy: Users can delete their own uploads (DELETE)
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'photos' AND auth.uid() = owner );

-- 7. Also ensure 'avatars' bucket exists and has similar policies (just in case used elsewhere)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );
