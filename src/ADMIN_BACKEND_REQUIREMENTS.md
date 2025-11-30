# 🔧 Admin Backend - Required Endpoints for User Panel Integration

## ⚠️ CRITICAL: Your Admin Backend MUST Implement These Endpoints!

The user panel is trying to connect to your admin backend at:
```
https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb
```

## 📋 Required Endpoints

### 1. **GET /media/list** - List all media (CRITICAL - MISSING!)

This is the PRIMARY endpoint the user panel uses to fetch wallpapers.

**Query Parameters:**
- `visibility` (string) - Filter by visibility (e.g., "public")
- `excludeYoutube` (boolean) - If "true", exclude YouTube videos
- `search` (string) - Search query
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "media-uuid-123",
      "type": "photo",
      "title": "Lord Murugan Blessing",
      "description": "Beautiful HD wallpaper",
      "url": "https://images.unsplash.com/photo-xxx",
      "thumbnail": "https://images.unsplash.com/photo-xxx",
      "tags": ["murugan", "hd", "wallpaper"],
      "category": "murugan",
      "visibility": "public",
      "isPremium": false,
      "uploadedBy": "admin",
      "uploadedAt": "2024-11-15T10:30:00Z",
      "stats": {
        "views": 0,
        "likes": 0,
        "downloads": 0,
        "shares": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "hasMore": true
  }
}
```

**Important Field Names:**
- `type` - Must be "photo", "video", or "youtube"
- `url` - The main image/video URL (user panel looks for this!)
- `thumbnail` - Thumbnail URL
- `stats.views`, `stats.likes`, `stats.downloads`, `stats.shares` - All required

---

### 2. **POST /media/:id/like** - Track likes

Called when user clicks the heart button.

**Request:**
```
POST /media/abc-123/like
Authorization: Bearer {ANON_KEY}
X-User-Token: {user_token} (optional)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Like tracked",
  "newCount": 1
}
```

**Action Required:**
- Increment the `likes` counter in your database
- Store in media stats table

---

### 3. **POST /media/:id/download** - Track downloads

Called when user downloads media.

**Request:**
```
POST /media/abc-123/download
Authorization: Bearer {ANON_KEY}
X-User-Token: {user_token} (optional)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Download tracked",
  "newCount": 1
}
```

**Action Required:**
- Increment the `downloads` counter
- Log the download event

---

### 4. **POST /media/:id/share** - Track shares (CRITICAL - MISSING!)

Called when user shares media.

**Request:**
```
POST /media/abc-123/share
Authorization: Bearer {ANON_KEY}
X-User-Token: {user_token} (optional)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Share tracked",
  "newCount": 1
}
```

**Action Required:**
- Increment the `shares` counter
- Log the share event

---

### 5. **GET /media/:id** - Get single media (for view tracking)

Called when user opens media in full-screen.

**Expected Response:**
```json
{
  "success": true,
  "media": {
    "id": "abc-123",
    "type": "photo",
    "title": "Lord Murugan",
    "url": "https://...",
    "thumbnail": "https://...",
    "tags": ["murugan"],
    "stats": {
      "views": 10,
      "likes": 5,
      "downloads": 2,
      "shares": 1
    }
  }
}
```

**Action Required:**
- Increment the `views` counter when called
- Return the media details

---

### 6. **GET /media/list?type=youtube** - List YouTube videos

For the Songs tab.

**Query Parameters:**
- `type` (string) - Filter by type "youtube"
- `visibility` (string) - "public"
- `category` (string) - Optional filter by category
- `page`, `limit` - Pagination

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "youtube-123",
      "type": "youtube",
      "title": "Murugan Devotional Song",
      "description": "Beautiful song",
      "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      "tags": ["devotional", "song"],
      "category": "songs",
      "stats": {
        "views": 0,
        "likes": 0,
        "downloads": 0,
        "shares": 0
      }
    }
  ]
}
```

---

### 7. **GET /sparkle/list** - List Sparkle articles

For the Spark tab.

**Query Parameters:**
- `type` (string) - Optional filter by type
- `page`, `limit` - Pagination

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "article-123",
      "type": "article",
      "title": "Divine Grace of Lord Murugan",
      "shortDescription": "A devotional story...",
      "fullArticle": "Full content here...",
      "coverImage": "https://...",
      "tags": ["murugan", "story"],
      "createdAt": "2024-11-15T10:00:00Z",
      "externalLink": "https://..."
    }
  ]
}
```

---

### 8. **GET /health** - Health check

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-15T10:30:00Z"
}
```

---

## 🛠️ Implementation Guide for Admin Backend

### Step 1: Add Missing Endpoints

If your admin backend doesn't have these endpoints, you need to add them:

```typescript
// In your admin backend (Hono server)

// GET /media/list
app.get('/make-server-d083adfb/media/list', async (c) => {
  const visibility = c.req.query('visibility') || 'public';
  const excludeYoutube = c.req.query('excludeYoutube') === 'true';
  const search = c.req.query('search') || '';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  
  // Query your database (KV store or Supabase table)
  // Filter by visibility, exclude YouTube if needed
  // Apply search if provided
  // Apply pagination
  
  const data = []; // Your media array
  
  return c.json({
    success: true,
    data: data,
    pagination: {
      page,
      limit,
      total: data.length,
      hasMore: data.length >= limit
    }
  });
});

// POST /media/:id/like
app.post('/make-server-d083adfb/media/:id/like', async (c) => {
  const mediaId = c.req.param('id');
  
  // Increment likes counter in your database
  // Example: UPDATE media SET likes = likes + 1 WHERE id = mediaId
  
  return c.json({
    success: true,
    message: 'Like tracked'
  });
});

// POST /media/:id/share
app.post('/make-server-d083adfb/media/:id/share', async (c) => {
  const mediaId = c.req.param('id');
  
  // Increment shares counter
  
  return c.json({
    success: true,
    message: 'Share tracked'
  });
});

// POST /media/:id/download
app.post('/make-server-d083adfb/media/:id/download', async (c) => {
  const mediaId = c.req.param('id');
  
  // Increment downloads counter
  
  return c.json({
    success: true,
    message: 'Download tracked'
  });
});
```

---

## 🧪 Testing Your Admin Backend

### Test 1: Check Health
```bash
curl https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/health
```

### Test 2: List Media (MOST IMPORTANT!)
```bash
curl "https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/list?visibility=public&excludeYoutube=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g"
```

**Expected:** JSON response with array of media

### Test 3: Track Like
```bash
curl -X POST "https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/YOUR_MEDIA_ID/like" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g"
```

---

## ⚠️ Common Issues

### Issue: "No wallpapers found" in user panel

**Diagnosis:**
```javascript
// Run this in browser console
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/list?visibility=public&excludeYoutube=true', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
}).then(r => r.json()).then(console.log);
```

**Possible Causes:**
1. `/media/list` endpoint doesn't exist → Add it!
2. Endpoint returns wrong format → Fix response structure
3. No media uploaded → Upload some test media
4. Media has wrong `visibility` → Set to "public"
5. Missing required fields (`url`, `thumbnail`) → Update your upload logic

---

## 📝 Quick Fix Checklist

For User Panel to Work, Your Admin Backend Must:

- [ ] Have `/media/list` endpoint
- [ ] Return `data` array with media objects
- [ ] Each media has `url` field (not just `storage_path`)
- [ ] Each media has `thumbnail` field
- [ ] Each media has `stats` object with `views`, `likes`, `downloads`, `shares`
- [ ] Have `/media/:id/like` endpoint
- [ ] Have `/media/:id/download` endpoint
- [ ] Have `/media/:id/share` endpoint
- [ ] All media has `visibility: "public"`
- [ ] CORS is enabled for all origins

---

## 🚀 Next Steps

1. **Update your admin backend** to implement missing endpoints
2. **Test each endpoint** using curl or browser console
3. **Upload sample content** with correct field names
4. **Refresh user panel** - wallpapers should now appear!

Need help? Check the example implementation above or review your admin backend code.
