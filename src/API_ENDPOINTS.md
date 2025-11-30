# Murugan Wallpapers & Videos - API Documentation

## Base URL
```
https://<your-project>.supabase.co/functions/v1/make-server-4a075ebc
```

## Authentication
Most endpoints accept an optional `Authorization: Bearer <token>` header.
- Use `publicAnonKey` for anonymous requests
- Use user's `access_token` from Supabase Auth for authenticated requests

---

## 📋 **Endpoints Overview**

### 1. Search Media
**GET** `/search`

Search for wallpapers, audio, videos by query, tags, and type.

**Query Parameters:**
- `q` (string, optional): Search query (uses full-text search)
- `tags` (string, optional): Comma-separated tags (e.g., "murugan,temple")
- `kind` (string, optional): Filter by type (`image`, `audio`, `youtube`, `article`)
- `limit` (number, optional): Results per page (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**
```bash
GET /search?q=palani&tags=temple,festival&kind=image&limit=20
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "kind": "image",
      "title": "Palani Temple Murugan",
      "description": "...",
      "tags": ["palani", "temple", "murugan"],
      "url": "https://...storage.../web/...",
      "thumb": "https://...storage.../thumb/...",
      "original": "https://...storage.../original/...",
      "views": 1234,
      "likes": 567,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 20
}
```

---

### 2. Get Media by ID
**GET** `/media/:id`

Get detailed information about a specific media item.

**Example:**
```bash
GET /media/abc-123-def-456
```

**Response:**
```json
{
  "media": {
    "id": "abc-123-def-456",
    "kind": "image",
    "title": "...",
    "description": "...",
    "url": "https://...",
    "thumb": "https://...",
    "tags": ["..."],
    "duration": null,
    "views": 1234,
    "likes": 567,
    "downloads": 89,
    "allow_download": true,
    "created_at": "..."
  }
}
```

---

### 3. Track Analytics Events
**POST** `/analytics`

Log user actions for analytics tracking.

**Headers:**
```
Authorization: Bearer <user-access-token>  (optional)
Content-Type: application/json
```

**Body:**
```json
{
  "events": [
    {
      "event_type": "media_view",
      "object_type": "media",
      "object_id": "media-uuid",
      "session_id": "session-123",
      "device_type": "mobile",
      "properties": {
        "source": "home_feed",
        "duration": 5.2
      }
    },
    {
      "event_type": "search_query",
      "properties": {
        "query": "murugan temple",
        "results_count": 42
      }
    }
  ]
}
```

**Event Types:**
- `media_view` - User viewed media
- `media_download` - User downloaded media
- `media_like` - User liked media
- `media_share` - User shared media
- `search_query` - User performed search
- `spark_view` - User viewed Spark article
- `profile_bg_set` - User set profile background
- `app_open` - App launched

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

---

### 4. Set Profile Background
**POST** `/profile/bg`

Set user's profile background wallpaper.

**Headers:**
```
Authorization: Bearer <user-access-token>  (required)
Content-Type: application/json
```

**Body:**
```json
{
  "media_id": "uuid-of-media",
  "url": "https://optional-direct-url.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "user-uuid",
    "display_name": "...",
    "profile_bg_media_id": "uuid",
    "profile_bg_url": "https://...",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### 5. Get Spark News/Articles
**GET** `/sparks`

Fetch news articles and devotional content.

**Query Parameters:**
- `q` (string, optional): Search query
- `limit` (number, optional): Results per page (default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Example:**
```bash
GET /sparks?q=festival&limit=10
```

**Response:**
```json
{
  "sparks": [
    {
      "id": "uuid",
      "title": "Palani Temple Festival 2024",
      "excerpt": "...",
      "body": "...",
      "author": "Temple Times",
      "source": "Temple Times",
      "source_url": "https://...",
      "image_url": "https://...",
      "tags": ["festival", "palani"],
      "published_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 10
}
```

---

### 6. Get Spark Articles (Cached)
**GET** `/spark/articles`

Fetch cached Murugan news articles (used by Spark tab).

**Response:**
```json
{
  "articles": [
    {
      "id": "article-id",
      "title": "...",
      "snippet": "...",
      "content": "...",
      "source": "Temple Times",
      "publishedAt": "...",
      "url": "https://...",
      "image": "https://...",
      "tags": ["murugan", "temple"]
    }
  ],
  "cached": true
}
```

---

### 7. Increment Media Views
**POST** `/media/:id/view`

Increment view count for a media item.

**Example:**
```bash
POST /media/abc-123-def-456/view
```

**Response:**
```json
{
  "success": true
}
```

---

### 8. Increment Media Likes
**POST** `/media/:id/like`

Increment like count for a media item.

**Response:**
```json
{
  "success": true
}
```

---

### 9. Get Download URL
**POST** `/media/:id/download`

Get download URL and increment download count.

**Response:**
```json
{
  "success": true,
  "download_url": "https://.../storage/...original.jpg"
}
```

---

## 🔐 **Admin Endpoints**

### 10. Upload Media (Admin)
**POST** `/admin/media`

Upload new media metadata (admin only).

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "kind": "image",
  "title": "Divine Murugan Wallpaper",
  "description": "...",
  "tags": ["murugan", "wallpaper"],
  "storage_path": "images/original/20240101/abc123_wallpaper.jpg",
  "thumbnail_url": "images/thumb/20240101/abc123_thumb.jpg",
  "duration": null,
  "downloadable": true,
  "uploader": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "kind": "image",
    "title": "...",
    "created_at": "..."
  }
}
```

---

### 11. Seed Sample Data (Admin)
**POST** `/admin/seed-sample-data`

Populate database with sample Murugan wallpapers and content.

**Response:**
```json
{
  "success": true,
  "message": "Successfully seeded 10 sample media items",
  "data": [...]
}
```

---

## 🗄️ **Database Functions (Direct SQL)**

These are Postgres functions you can call via Supabase client:

### search_media
```sql
SELECT * FROM search_media(
  search_query := 'palani temple',
  search_tags := ARRAY['murugan', 'temple'],
  search_kind := 'image',
  limit_count := 50,
  offset_count := 0
);
```

### get_user_favorites
```sql
SELECT * FROM get_user_favorites(p_user_id := 'user-uuid');
```

### increment_media_views
```sql
SELECT increment_media_views(media_id := 'media-uuid');
```

### increment_media_likes
```sql
SELECT increment_media_likes(media_id := 'media-uuid');
```

### increment_media_downloads
```sql
SELECT increment_media_downloads(media_id := 'media-uuid');
```

---

## 📊 **Analytics Properties Examples**

### Media View Event
```json
{
  "event_type": "media_view",
  "object_type": "media",
  "object_id": "media-uuid",
  "properties": {
    "source": "search_results|home_feed|saved|profile",
    "view_duration_seconds": 5.2,
    "full_screen": true
  }
}
```

### Search Query Event
```json
{
  "event_type": "search_query",
  "properties": {
    "query": "murugan temple",
    "filters": {
      "tags": ["temple"],
      "kind": "image"
    },
    "results_count": 42
  }
}
```

### Download Event
```json
{
  "event_type": "media_download",
  "object_type": "media",
  "object_id": "media-uuid",
  "properties": {
    "download_quality": "original|web|thumb",
    "file_size_bytes": 2456789
  }
}
```

---

## 🚀 **Usage Examples**

### Client-side Search Implementation

```typescript
import { projectId, publicAnonKey } from './utils/supabase/info';

async function searchMedia(query: string, tags: string[] = []) {
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;
  const params = new URLSearchParams({
    q: query,
    tags: tags.join(','),
    kind: 'image',
    limit: '20'
  });

  const response = await fetch(`${baseUrl}/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  const data = await response.json();
  return data.results;
}
```

### Track Media View

```typescript
async function trackMediaView(mediaId: string, accessToken: string) {
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;
  
  // Increment server-side counter
  await fetch(`${baseUrl}/media/${mediaId}/view`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`
    }
  });

  // Log analytics event
  await fetch(`${baseUrl}/analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      events: [{
        event_type: 'media_view',
        object_type: 'media',
        object_id: mediaId,
        properties: {
          source: 'home_feed',
          timestamp: new Date().toISOString()
        }
      }]
    })
  });
}
```

---

## 🔧 **Error Responses**

All endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing auth token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## 🎯 **Rate Limiting**

- Anonymous requests: Limited by Supabase Edge Function quotas
- Authenticated requests: Higher limits based on your Supabase plan
- Analytics endpoint: Supports batching (up to 100 events per request)

---

## 📚 **Next Steps**

1. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy make-server-4a075ebc
   ```

2. **Test Endpoints:**
   ```bash
   curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/health
   ```

3. **Upload Media:**
   Use the bulk upload script in `/scripts/upload_media.js`

4. **Monitor Usage:**
   Check Supabase Dashboard → Edge Functions → Logs

---

**Made with 🙏 for Lord Murugan devotees**
