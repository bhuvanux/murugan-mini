# 🎉 Complete Setup Guide - Murugan Wallpapers & Videos

## ✅ What's Been Done

You now have a **production-ready, scalable architecture** with:

### ✨ Database Schema
- ✅ **8 tables** with full RLS security
- ✅ **Full-text search** with GIN indexes
- ✅ **Analytics tracking** built-in
- ✅ **Playlists & favorites** support
- ✅ **Content moderation** system

### 🚀 Backend API
- ✅ **13 REST endpoints** for all operations
- ✅ **Search with filters** (text, tags, kind)
- ✅ **Favorites management**
- ✅ **Analytics logging**
- ✅ **Spark news feed** (with NewsAPI integration)
- ✅ **Profile management**

### 📦 Storage System
- ✅ **3-tier image optimization** (original, web, thumbnail)
- ✅ **Organized folder structure**
- ✅ **CDN-backed delivery**
- ✅ **Public bucket configuration**

### 🛠️ Tools & Scripts
- ✅ **Bulk upload script** with image processing
- ✅ **Automatic metadata extraction**
- ✅ **Progress tracking & error handling**

---

## 🚀 Quick Start (5 Steps)

### Step 1: Run the Migration

1. Open **Supabase Dashboard** → Your Project
2. Go to **SQL Editor**
3. Copy contents of `/supabase/migrations/001_initial_schema.sql`
4. Paste and click **"Run"**
5. ✅ Wait for "Success!" message

**What this does:**
- Creates all 8 tables
- Sets up indexes for fast search
- Enables Row Level Security
- Creates helper functions

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Name: `public-media`
4. Set to **Public** ✅
5. Click **"Create bucket"**

**Folder structure will be created automatically by upload script.**

### Step 3: Deploy Edge Function

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the server function
supabase functions deploy make-server-4a075ebc
```

**Set environment variables in Supabase Dashboard:**
1. Go to **Edge Functions** → **make-server-4a075ebc**
2. Add secrets:
   - `SUPABASE_URL` (already set)
   - `SUPABASE_SERVICE_ROLE_KEY` (already set)
   - `NEWS_API_KEY` (optional - for real-time news)

### Step 4: Upload Sample Media

```bash
# Navigate to scripts directory
cd scripts

# Install dependencies
npm install

# Create upload directory
mkdir -p ../assets-to-upload

# Add some images to assets-to-upload/

# Set environment variables
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_KEY=your-service-role-key

# Run upload script
npm run upload
```

**Or manually:**
```bash
node upload_media.js
```

### Step 5: Seed Sample Data (Quick Test)

If you want to test immediately without uploading:

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

✅ **Done!** Your app is now connected to real data!

---

## 📊 API Endpoints Reference

Base URL: `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc`

### Media

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/media/search?q=murugan&kind=image&limit=20` | GET | No | Search media |
| `/media/:id` | GET | No | Get single media |
| `/media/:id/view` | POST | No | Increment views |
| `/media/:id/download` | POST | No | Increment downloads |

### Favorites

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/favorites` | GET | Yes | Get user favorites |
| `/favorites` | POST | Yes | Add to favorites |
| `/favorites/:media_id` | DELETE | Yes | Remove favorite |

### Analytics

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/analytics` | POST | Optional | Log events (batch) |

### Spark (News)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/spark/articles` | GET | No | Get news articles |

### Profile

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/profile` | GET | Yes | Get user profile |
| `/profile/background` | POST | Yes | Set profile wallpaper |

### Admin

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/admin/seed-sample-data` | POST | Service Role | Seed test data |

---

## 🎨 Frontend Integration

### Update Client Code

The app is already configured! But here's what's connected:

#### 1. Media Search
```javascript
const { results } = await fetch(
  `${apiUrl}/media/search?q=${query}&kind=image&limit=20`
).then(r => r.json());
```

#### 2. Add to Favorites
```javascript
await fetch(`${apiUrl}/favorites`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ media_id: mediaId })
});
```

#### 3. Track Analytics
```javascript
await fetch(`${apiUrl}/analytics`, {
  method: 'POST',
  body: JSON.stringify({
    events: [{
      event_type: 'media_view',
      object_type: 'media',
      object_id: mediaId,
      properties: { screen: 'home' }
    }]
  })
});
```

---

## 📁 File Upload Format

### Recommended Filename Format

```
<slug>__<title>__<tag1>,<tag2>,<tag3>.<ext>
```

**Examples:**
```
palani-temple__Palani Murugan Temple__temple,murugan,palani.jpg
kanda-sashti__Kanda Sashti Kavacam__song,devotional,murugan.mp3
vel-murugan__Vel Muruga Haro Hara__chant,powerful,murugan.jpg
```

The upload script automatically:
- ✅ Parses title from filename
- ✅ Extracts tags
- ✅ Creates 3 image sizes
- ✅ Uploads to organized folders
- ✅ Inserts metadata to database

---

## 🔍 Search Features

### Full-Text Search
Search title, description, and tags:
```
GET /media/search?q=palani temple festival
```

### Filter by Kind
```
GET /media/search?kind=image
GET /media/search?kind=audio
GET /media/search?kind=youtube
```

### Filter by Tags
```
GET /media/search?tags=murugan,temple,devotional
```

### Combined Search
```
GET /media/search?q=kanda&kind=audio&tags=devotional&limit=10
```

---

## 📊 Database Schema Quick Reference

```sql
profiles
  ├── id (uuid, PK)
  ├── display_name
  ├── profile_bg_url (Murugan wallpaper)
  └── created_at

media
  ├── id (uuid, PK)
  ├── kind (image|audio|youtube|article)
  ├── title
  ├── description
  ├── thumb_path, web_path, storage_path
  ├── tags[] (array)
  ├── document (tsvector for search)
  ├── views, likes, downloads (counters)
  └── created_at

user_favorites
  ├── user_id → profiles
  ├── media_id → media
  └── saved_at

playlists
  ├── id (uuid, PK)
  ├── user_id → profiles
  ├── name
  └── is_public

playlist_items
  ├── playlist_id → playlists
  ├── media_id → media
  └── position

analytics_events
  ├── event_type (media_view, download, etc.)
  ├── user_id
  ├── object_type, object_id
  └── properties (jsonb)

sparks (news articles)
  ├── title
  ├── excerpt
  ├── source_url
  ├── tags[]
  └── published_at
```

---

## 🎯 Next Steps

### Immediate
1. ✅ Run migration
2. ✅ Create storage bucket
3. ✅ Deploy edge function
4. ✅ Upload sample media OR seed data
5. ✅ Test the app!

### This Week
1. 📸 Collect high-quality Murugan images
2. 🎵 Add devotional songs (as YouTube embeds)
3. 📰 Configure NewsAPI (optional)
4. 🎨 Customize default profile backgrounds

### This Month
1. 📊 Monitor analytics data
2. 🔍 Implement Meilisearch (for instant search)
3. 👥 Add user-generated content moderation
4. 🎨 Create featured collections/playlists
5. 📱 Build mobile app (Expo/React Native)

---

## 🐛 Troubleshooting

### "Table does not exist" error
➡️ Run the migration SQL in Supabase SQL Editor

### "Bucket not found" error
➡️ Create `public-media` bucket in Supabase Storage

### Images not loading
➡️ Check bucket is set to **Public**

### Search returns no results
➡️ Run seed data script or upload some media

### Edge function errors
➡️ Check logs in Supabase Dashboard → Edge Functions

### Upload script fails
➡️ Verify SUPABASE_URL and SUPABASE_KEY are correct

---

## 📚 Documentation

- 📖 **Full Architecture:** See `/ARCHITECTURE.md`
- 🔧 **Upload Script:** See `/scripts/upload_media.js`
- 🗄️ **Database Schema:** See `/supabase/migrations/001_initial_schema.sql`
- 🚀 **API Server:** See `/supabase/functions/server/index.tsx`

---

## 🎉 You're All Set!

Your Murugan Wallpapers & Videos app is now powered by:
- ✅ Scalable Postgres database with full-text search
- ✅ CDN-backed storage for fast image delivery
- ✅ Serverless Edge Functions for API
- ✅ Built-in analytics tracking
- ✅ Secure authentication & RLS
- ✅ Professional upload workflow

**Ready to grow from 0 to millions of devotees! 🙏**

---

**Need Help?**
- 📖 Read ARCHITECTURE.md for deep dive
- 🔍 Check Supabase Dashboard logs
- 💬 Review error messages carefully
- 🧪 Test with sample data first

**Happy building! 🚀**
