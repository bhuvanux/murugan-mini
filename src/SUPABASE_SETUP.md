# Supabase Setup Instructions for Murugan Wallpapers & Videos

## Database Tables

You need to create the following tables in your Supabase project:

### 1. media table

```sql
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploader TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration_seconds INTEGER,
  downloadable BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0
);

CREATE INDEX idx_media_created_at ON media(created_at DESC);
CREATE INDEX idx_media_tags ON media USING GIN(tags);
CREATE INDEX idx_media_type ON media(type);
```

### 2. user_favorites table

```sql
CREATE TABLE user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, media_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_saved_at ON user_favorites(saved_at DESC);
```

### 3. Database Function for View Counting

```sql
CREATE OR REPLACE FUNCTION increment_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET views = views + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS) Policies

### media table policies

```sql
-- Enable RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read media
CREATE POLICY "Public read access"
ON media FOR SELECT
USING (true);

-- Only authenticated users with admin role can insert/update/delete
-- (You'll need to set up admin role checking or use service role key)
```

### user_favorites table policies

```sql
-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can read their own favorites
CREATE POLICY "Users can read own favorites"
ON user_favorites FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
ON user_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
ON user_favorites FOR DELETE
USING (auth.uid() = user_id);
```

## Storage Buckets

Create the following storage buckets in Supabase Storage:

### 1. media-images bucket (Public)

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-images', 'media-images', true);
```

Storage policies:
```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-images');

-- Allow authenticated uploads (or use service role for admin uploads)
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-images' AND auth.role() = 'authenticated');
```

### 2. media-videos bucket (Public)

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-videos', 'media-videos', true);
```

Storage policies:
```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-videos');

-- Allow authenticated uploads (or use service role for admin uploads)
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media-videos' AND auth.role() = 'authenticated');
```

## Authentication Setup

### Email Authentication (For Testing)

1. Go to **Authentication > Providers** in Supabase dashboard
2. Make sure **Email** provider is **enabled** (it's usually enabled by default)
3. You can now create test accounts using email/password

### Phone Authentication (For Production)

1. Go to **Authentication > Providers** in Supabase dashboard
2. Enable **Phone** provider
3. Configure your phone auth provider (Twilio, etc.)
4. For testing, you can use Supabase's test OTP feature

**Important**: For production, you MUST configure a proper SMS provider (Twilio, MessageBird, etc.) and set up rate limiting.

## Sample Data

To test the app, insert some sample media:

```sql
INSERT INTO media (title, description, tags, type, storage_path, thumbnail_url, uploader, downloadable)
VALUES
  (
    'Lord Murugan with Peacock',
    'Beautiful image of Lord Murugan with his vehicle peacock',
    ARRAY['murugan', 'peacock', 'devotional'],
    'image',
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800',
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400',
    'admin',
    true
  ),
  (
    'Murugan Temple',
    'Sacred temple dedicated to Lord Murugan',
    ARRAY['temple', 'worship', 'spiritual'],
    'image',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400',
    'admin',
    true
  );
```

## Environment Variables

No additional environment variables needed - the app uses the auto-configured Supabase connection.

## Admin Upload Process

To upload new media as an admin:

1. Upload the image/video file to the appropriate storage bucket using Supabase Dashboard or API
2. Use the admin API endpoint to create the media record:

```bash
curl -X POST https://[your-project-id].supabase.co/functions/v1/make-server-4a075ebc/admin/media \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "title": "Your Media Title",
    "description": "Description here",
    "tags": ["tag1", "tag2"],
    "type": "image",
    "storage_path": "https://[your-project-id].supabase.co/storage/v1/object/public/media-images/filename.jpg",
    "thumbnail_url": "https://[your-project-id].supabase.co/storage/v1/object/public/media-images/filename_thumb.jpg",
    "downloadable": true,
    "uploader": "admin",
    "duration_seconds": null
  }'
```

## Security Notes

1. **Phone Authentication**: Ensure you have proper rate limiting and fraud detection in place
2. **Storage**: Large video files can be expensive - consider file size limits
3. **Privacy Policy**: Update the privacy policy link in ProfileScreen.tsx with your actual policy
4. **Admin Access**: Implement proper admin authentication before allowing media uploads in production

## Next Steps

1. Run all SQL commands in the Supabase SQL Editor
2. Configure phone authentication provider
3. Create storage buckets
4. Insert sample data for testing
5. Test the app with phone OTP login
6. Set up admin workflow for uploading content

## Support

For issues or questions, contact: support@tamilkadavulmurugan.com
