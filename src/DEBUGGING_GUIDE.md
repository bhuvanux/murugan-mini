# 🔍 Debugging Guide - Photos Not Showing & Tracking Not Working

## Step-by-Step Diagnosis

### Step 1: Check if Admin Backend is Running

Open browser console and run:

```javascript
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend health:', data))
  .catch(err => console.error('❌ Backend down:', err));
```

**Expected:** `{ status: "ok", timestamp: "..." }`

**If fails:** Your admin backend is not running or not deployed.

---

### Step 2: Check if /media/list Endpoint Exists

```javascript
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/list?visibility=public&excludeYoutube=true&limit=5', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Media list response:', data);
  console.log('📊 Number of media items:', data.data?.length || 0);
  console.log('📷 First media item:', data.data?.[0]);
})
.catch(err => console.error('❌ /media/list failed:', err));
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "media-123",
      "type": "photo",
      "title": "Lord Murugan",
      "url": "https://images.unsplash.com/...",
      "thumbnail": "https://images.unsplash.com/...",
      "tags": ["murugan"],
      "stats": {
        "views": 0,
        "likes": 0,
        "downloads": 0,
        "shares": 0
      }
    }
  ],
  "pagination": {...}
}
```

**If you get 404:** `/media/list` endpoint doesn't exist in your admin backend!  
→ **Solution:** See ADMIN_BACKEND_REQUIREMENTS.md to add it.

**If you get empty array:** No media uploaded yet!  
→ **Solution:** Upload media via admin panel.

**If response structure is wrong:** Field names don't match.  
→ **Solution:** Ensure your response has `url`, `thumbnail`, `stats` fields.

---

### Step 3: Verify Media Has Required Fields

If you got media in Step 2, check each item has:

```javascript
// Run after Step 2
const media = data.data[0]; // First media item
console.log('Checking required fields...');
console.log('✓ Has id?', !!media.id);
console.log('✓ Has type?', !!media.type);
console.log('✓ Has title?', !!media.title);
console.log('✓ Has url?', !!media.url);  // CRITICAL!
console.log('✓ Has thumbnail?', !!media.thumbnail); // CRITICAL!
console.log('✓ Has stats?', !!media.stats);
console.log('✓ Has stats.likes?', media.stats?.likes !== undefined);
console.log('✓ Has stats.downloads?', media.stats?.downloads !== undefined);
console.log('✓ Has stats.shares?', media.stats?.shares !== undefined);

if (!media.url) {
  console.error('❌ PROBLEM: Media missing "url" field!');
  console.log('Available fields:', Object.keys(media));
}
```

**If "url" is missing:**  
Your admin backend is not returning the image URL properly!  
Check your upload code and ensure it saves the `url` field.

---

### Step 4: Test Like Endpoint

```javascript
// Replace MEDIA_ID with actual media ID from Step 2
const MEDIA_ID = 'your-media-id-here';

fetch(`https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/${MEDIA_ID}/like`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Like tracked:', data))
.catch(err => console.error('❌ Like failed:', err));
```

**Expected:** `{ success: true, message: "Like tracked" }`

**If you get 404:** `/media/:id/like` endpoint doesn't exist!  
→ **Solution:** Add it to your admin backend.

---

### Step 5: Test Download Endpoint

```javascript
const MEDIA_ID = 'your-media-id-here';

fetch(`https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/${MEDIA_ID}/download`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Download tracked:', data))
.catch(err => console.error('❌ Download failed:', err));
```

---

### Step 6: Test Share Endpoint

```javascript
const MEDIA_ID = 'your-media-id-here';

fetch(`https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/${MEDIA_ID}/share`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Share tracked:', data))
.catch(err => console.error('❌ Share failed:', err));
```

**If you get 404:** `/media/:id/share` endpoint doesn't exist!  
→ **Solution:** Add it to your admin backend.

---

## 🎯 Quick Diagnosis Table

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| "No wallpapers found" | `/media/list` returns empty or doesn't exist | Upload media OR add endpoint |
| Photos show but no images | Media missing `url` field | Fix admin upload to include `url` |
| Placeholder images only | `url` field is empty string | Check image URLs are valid |
| Like button doesn't work | `/media/:id/like` endpoint missing | Add endpoint to admin backend |
| Download doesn't work | `/media/:id/download` endpoint missing | Add endpoint to admin backend |
| Share doesn't work | `/media/:id/share` endpoint missing | Add endpoint to admin backend |
| Stats not updating | Endpoints exist but don't update database | Check database update logic |

---

## 📋 Complete Testing Script

Copy this entire script into your browser console:

```javascript
// ===== COMPLETE ADMIN BACKEND TEST =====

const API_BASE = 'https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g';

async function runTests() {
  console.log('🔍 Starting Admin Backend Tests...\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    console.log('✅ Health:', health);
  } catch (err) {
    console.error('❌ Health failed:', err);
    return;
  }
  
  // Test 2: Media List
  console.log('\n2️⃣ Testing /media/list Endpoint...');
  let mediaId;
  try {
    const list = await fetch(`${API_BASE}/media/list?visibility=public&excludeYoutube=true&limit=5`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    }).then(r => r.json());
    
    console.log('✅ Media list response:', list);
    console.log(`   Found ${list.data?.length || 0} media items`);
    
    if (list.data && list.data.length > 0) {
      const media = list.data[0];
      mediaId = media.id;
      console.log('   First media:', {
        id: media.id,
        title: media.title,
        hasUrl: !!media.url,
        hasThumbnail: !!media.thumbnail,
        hasStats: !!media.stats,
        url: media.url?.substring(0, 50) + '...'
      });
      
      // Check required fields
      const missing = [];
      if (!media.url) missing.push('url');
      if (!media.thumbnail) missing.push('thumbnail');
      if (!media.stats) missing.push('stats');
      if (!media.stats?.likes === undefined) missing.push('stats.likes');
      if (!media.stats?.downloads === undefined) missing.push('stats.downloads');
      if (!media.stats?.shares === undefined) missing.push('stats.shares');
      
      if (missing.length > 0) {
        console.warn(`   ⚠️  Missing fields: ${missing.join(', ')}`);
      } else {
        console.log('   ✅ All required fields present!');
      }
    } else {
      console.warn('   ⚠️  No media found. Upload some content!');
      return;
    }
  } catch (err) {
    console.error('❌ /media/list failed:', err);
    return;
  }
  
  if (!mediaId) {
    console.log('\n⚠️  Cannot test tracking endpoints without media. Upload content first!');
    return;
  }
  
  // Test 3: Like Endpoint
  console.log(`\n3️⃣ Testing /media/${mediaId}/like...`);
  try {
    const like = await fetch(`${API_BASE}/media/${mediaId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    }).then(r => r.json());
    console.log('✅ Like response:', like);
  } catch (err) {
    console.error('❌ Like failed:', err);
  }
  
  // Test 4: Download Endpoint
  console.log(`\n4️⃣ Testing /media/${mediaId}/download...`);
  try {
    const download = await fetch(`${API_BASE}/media/${mediaId}/download`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    }).then(r => r.json());
    console.log('✅ Download response:', download);
  } catch (err) {
    console.error('❌ Download failed:', err);
  }
  
  // Test 5: Share Endpoint
  console.log(`\n5️⃣ Testing /media/${mediaId}/share...`);
  try {
    const share = await fetch(`${API_BASE}/media/${mediaId}/share`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    }).then(r => r.json());
    console.log('✅ Share response:', share);
  } catch (err) {
    console.error('❌ Share failed:', err);
  }
  
  console.log('\n✨ Tests complete! Check results above.');
  console.log('\n📋 Summary:');
  console.log('   - If all tests passed → Your backend is correctly configured!');
  console.log('   - If tests failed → Check ADMIN_BACKEND_REQUIREMENTS.md for fixes');
}

runTests();
```

---

## 🚨 Most Common Issues & Fixes

### Issue 1: "No wallpapers found" but you uploaded content

**Root Cause:** `/media/list` endpoint doesn't exist or returns wrong format

**How to Fix in Admin Backend:**

```typescript
// Add this to your admin backend server (Hono)
app.get('/make-server-d083adfb/media/list', async (c) => {
  // Get query params
  const visibility = c.req.query('visibility') || 'public';
  const excludeYoutube = c.req.query('excludeYoutube') === 'true';
  
  // Query your database (replace with your actual query)
  const allMedia = await kv.get('media_items') || [];
  
  // Filter
  let filtered = allMedia.filter(m => 
    m.visibility === visibility && 
    (!excludeYoutube || m.type !== 'youtube')
  );
  
  return c.json({
    success: true,
    data: filtered,
    pagination: {
      page: 1,
      limit: 20,
      total: filtered.length,
      hasMore: false
    }
  });
});
```

---

### Issue 2: Photos show but images are placeholders

**Root Cause:** Media objects missing `url` field

**How to Fix:** When uploading media, ensure you save the `url` field:

```typescript
// In your upload endpoint
const mediaItem = {
  id: generateId(),
  type: 'photo',
  title: req.title,
  url: req.url,  // ← MUST HAVE THIS!
  thumbnail: req.thumbnail || req.url,  // ← AND THIS!
  tags: req.tags || [],
  stats: {
    views: 0,
    likes: 0,
    downloads: 0,
    shares: 0
  },
  uploadedAt: new Date().toISOString(),
  visibility: 'public'
};
```

---

### Issue 3: Tracking buttons don't work

**Root Cause:** Missing tracking endpoints

**How to Fix:** Add these to your admin backend:

```typescript
// Like endpoint
app.post('/make-server-d083adfb/media/:id/like', async (c) => {
  const id = c.req.param('id');
  
  // Get media from database
  const allMedia = await kv.get('media_items') || [];
  const mediaIndex = allMedia.findIndex(m => m.id === id);
  
  if (mediaIndex === -1) {
    return c.json({ error: 'Media not found' }, 404);
  }
  
  // Increment likes
  allMedia[mediaIndex].stats.likes += 1;
  await kv.set('media_items', allMedia);
  
  return c.json({
    success: true,
    message: 'Like tracked',
    newCount: allMedia[mediaIndex].stats.likes
  });
});

// Download endpoint (same pattern)
app.post('/make-server-d083adfb/media/:id/download', async (c) => {
  // Same as like but increment downloads
});

// Share endpoint (same pattern)
app.post('/make-server-d083adfb/media/:id/share', async (c) => {
  // Same as like but increment shares
});
```

---

## ✅ Success Criteria

Your admin backend is correctly configured when:

1. ✅ Health check returns `{ status: "ok" }`
2. ✅ `/media/list` returns array of media with `url` and `thumbnail` fields
3. ✅ Each media has `stats` object with likes/downloads/shares
4. ✅ `/media/:id/like` increments like count
5. ✅ `/media/:id/download` increments download count
6. ✅ `/media/:id/share` increments share count
7. ✅ User panel shows photos in grid
8. ✅ Clicking photo opens full-screen view
9. ✅ Heart button adds to favorites
10. ✅ Download button downloads image
11. ✅ Share button opens share dialog

---

## 📞 Still Having Issues?

Run the complete testing script above and share the console output. That will show exactly what's wrong!
