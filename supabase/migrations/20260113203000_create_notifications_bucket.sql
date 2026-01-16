-- Create notifications storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notifications',
  'notifications',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for notifications bucket (allow authenticated users to upload)
CREATE POLICY "Authenticated users can upload notification images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notifications');

CREATE POLICY "Public can view notification images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'notifications');

CREATE POLICY "Authenticated users can update notification images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'notifications');

CREATE POLICY "Authenticated users can delete notification images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'notifications');
