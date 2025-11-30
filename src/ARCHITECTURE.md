# Murugan Wallpapers & Videos - Complete Architecture

## 📋 Overview

This document describes the complete Supabase-first architecture for the Murugan Wallpapers & Videos application.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Web/Mobile)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Photos   │  │   Songs    │  │   Spark    │            │
│  │   Feed     │  │   Videos   │  │   News     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API / Auth
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Search  │  │ Favorites│  │Analytics │  │  Spark   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ↓                                     ↓
┌──────────────────────┐          ┌──────────────────────┐
│  Supabase Postgres   │          │  Supabase Storage    │
│  ┌────────────────┐  │          │  ┌────────────────┐  │
│  │   profiles     │  │          │  │ public-media   │  │
│  │   media        │  │          │  │   /images/     │  │
│  │   favorites    │  │          │  │   /audio/      │  │
│  │   sparks       │  │          │  │   /videos/     │  │
│  │   analytics    │  │          │  └────────────────┘  │
│  └────────────────┘  │          └──────────────────────┘
└──────────────────────┘
         │
         ↓ (Optional)
┌──────────────────────┐
│    Meilisearch       │
│  (Instant Search)    │
└──────────────────────┘
```

## 📊 Database Schema

### Core Tables

#### 1. **profiles** - User Profiles
```sql
- id (uuid, PK, FK to auth.users)
- display_name (text)
- avatar_url (text)
- profile_bg_url (text) -- User's Murugan wallpaper
- profile_bg_media_id (uuid, FK to media)
- bio (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### 2. **media** - All Media Content
```sql
- id (uuid, PK)
- kind (text: 'image' | 'audio' | 'youtube' | 'article')
- title (text, NOT NULL)
- description (text)
- filename (text)

-- Storage paths
- storage_path (text) -- Original file
- thumb_path (text)   -- Thumbnail (640px)
- web_path (text)     -- Web optimized (1280px)

-- External hosting
- host_url (text)     -- YouTube ID or external URL

- duration (text)     -- e.g., "03:45"
- tags (text[])       -- Array of tags
- document (tsvector) -- Full-text search
- metadata (jsonb)    -- Extra data
- creator (uuid, FK to profiles)
- allow_download (boolean, default true)
- visibility (text, default 'public')

-- Stats
- views (bigint, default 0)
- likes (bigint, default 0)
- downloads (bigint, default 0)

- created_at (timestamptz)
- updated_at (timestamptz)
```

**Indexes:**
- `media_kind_idx` on kind
- `media_tags_idx` (GIN) on tags
- `media_document_idx` (GIN) on document (full-text)
- `media_created_idx` on created_at DESC

#### 3. **sparks** - News Articles
```sql
- id (uuid, PK)
- title (text, NOT NULL)
- excerpt (text)
- body (text)
- author (text)
- source (text)
- source_url (text)
- image_url (text)
- image_id (uuid, FK to media)
- tags (text[])
- document (tsvector)
- published_at (timestamptz)
- created_at (timestamptz)
```

#### 4. **user_favorites** - Saved Media
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- media_id (uuid, FK to media)
- saved_at (timestamptz)
- downloaded (boolean, default false)
- UNIQUE(user_id, media_id)
```

#### 5. **playlists** - User Playlists
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- name (text, NOT NULL)
- description (text)
- is_public (boolean, default false)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### 6. **playlist_items** - Playlist Contents
```sql
- id (uuid, PK)
- playlist_id (uuid, FK to playlists)
- media_id (uuid, FK to media)
- position (int)
- added_at (timestamptz)
- UNIQUE(playlist_id, media_id)
```

#### 7. **analytics_events** - Usage Analytics
```sql
- id (uuid, PK)
- event_type (text) -- e.g., 'media_view', 'media_download'
- user_id (uuid, FK to profiles)
- session_id (text)
- object_type (text) -- 'media' | 'spark' | 'profile'
- object_id (uuid)
- properties (jsonb)
- device_type (text)
- user_agent (text)
- ip_address (inet)
- created_at (timestamptz)
```

**Event Types:**
- `media_view` - User viewed media
- `media_download` - User downloaded media
- `media_like` - User liked media
- `media_share` - User shared media
- `search_query` - User searched
- `spark_view` - User viewed article
- `profile_bg_set` - User set profile background
- `app_open` - App opened

#### 8. **media_reports** - Content Moderation
```sql
- id (uuid, PK)
- media_id (uuid, FK to media)
- reporter_id (uuid, FK to profiles)
- reason (text, NOT NULL)
- description (text)
- status (text, default 'pending')
- reviewed_by (uuid, FK to profiles)
- reviewed_at (timestamptz)
- created_at (timestamptz)
```

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

### Profiles
- ✅ Everyone can view public profile data
- ✅ Users can update their own profile

### Media
- ✅ Everyone can view public media
- ✅ Users can view their own private media
- ✅ Authenticated users can insert media
- ✅ Users can update/delete their own media

### Favorites
- ✅ Users can view/insert/delete their own favorites

### Playlists
- ✅ Users can view their own + public playlists
- ✅ Users can manage their own playlists

### Analytics
- ✅ Users can insert their own analytics events

## 🗄️ Storage Structure

### Bucket: `public-media`

```
public-media/
├── images/
│   ├── original/
│   │   └── 20241112/
│   │       └── abc123_murugan-deity.jpg
│   ├── web/
│   │   └── 20241112/
│   │       └── abc123_web.jpg (1280px max)
│   └── thumb/
│       └── 20241112/
│           └── abc123_thumb.jpg (640px)
├── audio/
│   └── 20241112/
│       └── def456_kanda-sashti.mp3
└── profile-backgrounds/
    └── <user-id>/
        └── ghi789_bg.jpg
```

**Naming Convention:**
- Date prefix: `YYYYMMDD/`
- Unique ID: `<uuid>_<slug>.<ext>`
- Size suffix: `_web`, `_thumb`

**Cache Headers:**
```
Cache-Control: public, max-age=86400, s-maxage=2592000
```

## 🔌 API Endpoints

All endpoints are prefixed with `/make-server-4a075ebc/`

### Media Endpoints

#### `GET /media/search`
Search media with filters.

**Query Parameters:**
- `q` - Search query (full-text)
- `kind` - Filter by kind (image|audio|youtube)
- `tags` - Comma-separated tags
- `limit` - Results limit (default 50)
- `offset` - Pagination offset (default 0)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "kind": "image",
      "title": "Palani Temple Murugan",
      "description": "...",
      "thumbnail_url": "https://...",
      "storage_url": "https://...",
      "tags": ["palani", "temple", "murugan"],
      "views": 1250,
      "likes": 345,
      "created_at": "2024-11-12T..."
    }
  ],
  "count": 42
}
```

#### `GET /media/:id`
Get single media item by ID.

#### `POST /media/:id/view`
Increment view count.

#### `POST /media/:id/download`
Increment download count.

### Favorites Endpoints

#### `GET /favorites`
Get user's favorite media (requires auth).

#### `POST /favorites`
Add media to favorites (requires auth).

**Body:**
```json
{
  "media_id": "uuid"
}
```

#### `DELETE /favorites/:media_id`
Remove from favorites (requires auth).

### Analytics Endpoint

#### `POST /analytics`
Log analytics events (batch or single).

**Body:**
```json
{
  "events": [
    {
      "event_type": "media_view",
      "session_id": "session-123",
      "object_type": "media",
      "object_id": "uuid",
      "properties": {},
      "device_type": "mobile",
      "user_agent": "..."
    }
  ]
}
```

### Spark/News Endpoints

#### `GET /spark/articles`
Get Murugan-related news articles (cached 1 hour).

**Response:**
```json
{
  "articles": [
    {
      "id": "article-1",
      "title": "Palani Temple Festival",
      "snippet": "...",
      "source": "Temple Times",
      "publishedAt": "2024-11-12T...",
      "url": "https://...",
      "image": "https://...",
      "tags": ["palani", "festival"]
    }
  ],
  "cached": true
}
```

### Profile Endpoints

#### `GET /profile`
Get user profile (requires auth).

#### `POST /profile/background`
Set profile background wallpaper (requires auth).

**Body:**
```json
{
  "media_id": "uuid",
  "background_url": "https://..."
}
```

### Admin Endpoints

#### `POST /admin/seed-sample-data`
Seed database with sample media (for testing).

## 📤 Bulk Upload Workflow

### 1. Prepare Assets

Create directory structure:
```bash
mkdir -p assets-to-upload
```

Add images with optional filename format:
```
<slug>__<title>__<tag1>,<tag2>,<tag3>.<ext>

Examples:
palani-temple__Palani Murugan Temple__temple,murugan,palani.jpg
kanda-sashti__Kanda Sashti Kavacam__devotional,song,murugan.jpg
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js sharp fast-glob
```

### 3. Set Environment Variables

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your-service-role-key
```

### 4. Run Upload Script

```bash
node scripts/upload_media.js
```

The script will:
1. ✅ Read all images from directory
2. ✅ Generate 3 versions: original, web (1280px), thumb (640px)
3. ✅ Upload to Supabase Storage
4. ✅ Extract metadata from filename
5. ✅ Insert into `media` table with full-text search enabled

## 🔍 Search Implementation

### Basic Search (Built-in)

Uses PostgreSQL full-text search with `tsvector`:

```sql
-- Automatic trigger updates document column
CREATE TRIGGER media_tsv_trigger 
BEFORE INSERT OR UPDATE ON media
FOR EACH ROW EXECUTE PROCEDURE media_tsv_trigger();
```

**Search Query:**
```sql
SELECT * FROM media 
WHERE document @@ websearch_to_tsquery('simple', 'murugan temple');
```

### Advanced Search (Optional - Meilisearch)

For instant, typo-tolerant search:

1. **Install Meilisearch** (Docker or cloud)
2. **Sync on upload** - Add to upload script:
```javascript
await meilisearch.index('media').addDocuments([{
  id: media.id,
  title: media.title,
  description: media.description,
  tags: media.tags,
}]);
```
3. **Client-side search** - Use Meilisearch JavaScript SDK

## 📊 Analytics & Monitoring

### Event Tracking

Client sends events to `/analytics` endpoint:

```javascript
fetch('/analytics', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
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

### Key Metrics

Track in `analytics_events` table:
- **DAU/MAU** - Unique users per day/month
- **Popular Media** - Most viewed/downloaded
- **Search Queries** - Top searches
- **User Engagement** - Session duration, actions per session

### Export to BigQuery (Optional)

Set up scheduled export for deeper analytics:
1. Enable Supabase replication to BigQuery
2. Create dashboards in Looker Studio
3. Run ML models on user behavior

## 🚀 Deployment Checklist

### 1. Database Setup
- [ ] Run migration: `supabase/migrations/001_initial_schema.sql`
- [ ] Verify RLS policies are active
- [ ] Test full-text search functionality

### 2. Storage Setup
- [ ] Create `public-media` bucket in Supabase Dashboard
- [ ] Set bucket to public
- [ ] Configure CORS if needed

### 3. Edge Functions
- [ ] Deploy server function: `supabase functions deploy make-server-4a075ebc`
- [ ] Test all endpoints
- [ ] Set environment variables (NEWS_API_KEY optional)

### 4. Upload Initial Content
- [ ] Prepare sample images
- [ ] Run upload script
- [ ] Verify media appears in app

### 5. Client Configuration
- [ ] Update API endpoints
- [ ] Test authentication flow
- [ ] Verify media loading
- [ ] Test favorites/playlists

## 🔧 Environment Variables

### Client (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Server (Supabase Edge Function)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEWS_API_KEY=your-newsapi-key (optional)
```

### Upload Script
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
LOCAL_DIR=./assets-to-upload
```

## 📈 Scaling Considerations

### Current Architecture (Good for 10k-100k users)
- ✅ Supabase Postgres (handles millions of rows)
- ✅ Supabase Storage (CDN-backed)
- ✅ Edge Functions (auto-scales)

### Future Optimizations (100k+ users)
- 🔄 Add Meilisearch for instant search
- 🔄 Image CDN (Cloudflare, Cloudinary)
- 🔄 Redis cache for hot data
- 🔄 Read replicas for analytics queries
- 🔄 Separate analytics to BigQuery

## 🐛 Troubleshooting

### Images not loading?
1. Check storage bucket is public
2. Verify RLS policies allow SELECT
3. Check CORS configuration

### Search not working?
1. Verify `document` column is populated
2. Check GIN index exists
3. Test query in SQL Editor

### Upload script failing?
1. Check SUPABASE_KEY has service role permissions
2. Verify bucket exists and is accessible
3. Check network/firewall settings

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Meilisearch Docs](https://docs.meilisearch.com/)

---

**Last Updated:** November 12, 2024
**Version:** 2.0.0
