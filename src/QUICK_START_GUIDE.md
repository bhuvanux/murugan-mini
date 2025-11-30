# Quick Start Guide - Murugan Wallpapers & Videos

## 🚀 Get Started in 3 Easy Steps

### Step 1: Database Setup (5 minutes)

1. **Open your Supabase project**: Go to https://supabase.com/dashboard
2. **Navigate to SQL Editor**: Click "SQL Editor" in the left sidebar
3. **Create a new query**: Click "New Query"
4. **Copy and paste ALL of the following SQL commands**:

```sql
-- Create media table
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

-- Create user_favorites table
CREATE TABLE user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, media_id)
);

-- Create increment_views function
CREATE OR REPLACE FUNCTION increment_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET views = views + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON media FOR SELECT USING (true);
CREATE POLICY "Users can read own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);
```

5. **Click "Run" (or press Ctrl/Cmd + Enter)** to execute ALL the SQL commands at once
6. **Verify success**: You should see "Success. No rows returned" message
7. **Test the setup**: Go back to the app and click "Test Connection" in the setup guide

### Step 2: Login to the App (1 minute)

Since phone OTP requires SMS provider setup, use email for testing:

1. Open the app
2. Click **"Use Email Instead (Testing)"**
3. Enter any email (e.g., `demo@test.com`)
4. Enter a password (at least 6 characters)
5. Click **"Create Test Account"**
6. Sign in with the same credentials

### Step 3: Load Sample Images (30 seconds)

1. After logging in, tap **"Profile"** tab at the bottom
2. Tap **"Admin: Upload Media"**
3. Click the **"Load Sample Data"** button at the top
4. Wait a few seconds for the page to reload
5. Go back to **"Home"** tab
6. Enjoy 10 beautiful devotional images! 🕉️

---

## ✨ What You Can Do Now

### Browse Images
- Scroll through the masonry feed
- Tap any image to view full-screen
- Swipe or tap X to close

### Save Favorites
- Tap the heart icon on any image
- View all saved items in the **"Saved"** tab

### Download Images
- Open an image full-screen
- Tap the **"Download"** button
- Image will be saved to your device

### Share to WhatsApp
- Open an image full-screen
- Tap the **"WhatsApp"** button
- Choose to share to chats or Status

### Search
- Use the search bar on the Home screen
- Search by title or tags (e.g., "murugan", "temple", "peacock")

---

## 🎯 What's Included in Sample Data

The sample data includes 10 devotional images:

1. Lord Murugan Divine Blessing
2. Sacred Temple Deity
3. Divine Murugan Statue
4. Peacock - Vehicle of Lord Murugan
5. Temple Ritual Ceremony
6. Sacred Temple Architecture
7. Divine Temple Art
8. Festival Celebration
9. Sacred Flower Offerings
10. Prayer and Meditation

Each image includes:
- High-quality devotional imagery
- Descriptive titles and tags
- Full download and share capabilities

---

## 🔧 Troubleshooting

### "No media found" after loading sample data
- Make sure Step 1 (database setup) was completed
- Check browser console for errors
- Verify Supabase connection in the dashboard

### Can't create account / sign in
- Make sure you're using email login (not phone)
- Password must be at least 6 characters
- Check if Email Auth is enabled in Supabase (Authentication → Providers)

### Sample data button not working
- Check browser console for errors
- Verify the server endpoint is deployed
- Make sure database tables exist

---

## 📱 Next Steps

### Add Your Own Content
1. Go to Profile → Admin: Upload Media
2. For images from external URLs:
   - Use the SQL Editor to insert records directly
   - See `SUPABASE_SETUP.md` for examples

### Set Up Storage Buckets (for file uploads)
1. Go to Supabase Dashboard → Storage
2. Create two public buckets:
   - `media-images`
   - `media-videos`
3. Now you can upload files directly through the admin panel

### Configure Phone Authentication (Production)
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Phone" provider
3. Configure an SMS provider (Twilio, MessageBird, etc.)
4. See `SUPABASE_SETUP.md` for detailed instructions

---

## 💡 Tips

- **Mobile First**: The app is designed for mobile - try it on your phone!
- **Performance**: Images load lazily as you scroll for better performance
- **Offline**: Downloaded images are saved to your device gallery
- **Privacy**: Only your favorites are stored - no tracking or analytics

---

## 📚 Full Documentation

For complete details, see:
- `README.md` - Full feature list and architecture
- `SUPABASE_SETUP.md` - Detailed database and storage setup
- `Attributions.md` - Image credits and licenses

---

**Made with devotion for Lord Murugan** 🙏

**Version**: 1.0.0  
**Last Updated**: November 12, 2025
