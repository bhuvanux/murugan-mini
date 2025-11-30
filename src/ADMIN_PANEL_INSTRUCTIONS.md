# 🔧 ADMIN PANEL - Required Setup & Testing

## ⚠️ CRITICAL: Admin Must Upload Content First!

The user panel will show **NO media** until you upload content in the admin panel.

---

## 📋 Step 1: Access Admin Panel

1. Open your admin panel at the admin project URL
2. Login with admin credentials:
   - Email: `admin@muruganwallpapers.com`
   - Password: `admin123`

---

## 📤 Step 2: Upload Test Content

### Option A: Use the Upload Form

Navigate to the Media Upload section and fill in:

#### For Photos/Wallpapers:
```
Type: photo
Title: Lord Murugan Blessing
Description: Beautiful HD wallpaper of Lord Murugan
URL: https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=800&h=1200
Thumbnail: https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=400&h=600
Tags: murugan, hd, wallpaper, devotional
Category: murugan
Visibility: public
Premium: No (unchecked)
```

#### For YouTube Songs:
```
Type: youtube
Title: Murugan Devotional Song
Description: Beautiful devotional song
Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
Thumbnail: https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg
Tags: devotional, song, murugan
Category: songs
Visibility: public
```

#### For Sparkle Articles:
```
Type: article
Title: Divine Grace of Lord Murugan
Short Description: A devotional story about Lord Murugan's blessings
Full Article: (Add your full article text here)
Cover Image: https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800
Tags: murugan, story, devotional
Public: Yes (checked)
```

### Option B: Use API Directly

Open your browser console and run:

```javascript
// Upload a photo
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g',
    'X-User-Token': 'YOUR_ADMIN_TOKEN_HERE'
  },
  body: JSON.stringify({
    type: 'photo',
    title: 'Lord Murugan Blessing',
    description: 'Beautiful HD wallpaper',
    url: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=400',
    tags: ['murugan', 'hd', 'wallpaper'],
    category: 'murugan',
    visibility: 'public',
    isPremium: false
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 🧪 Step 3: Verify Upload

After uploading, check:

### 1. In Admin Panel:
- Go to Media List
- You should see your uploaded items
- Stats should show: views: 0, likes: 0, downloads: 0, shares: 0

### 2. Test API Endpoint:
```javascript
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/list?visibility=public&excludeYoutube=true', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Total media:', data.data.length);
  console.log('First item:', data.data[0]);
});
```

**Expected Result:**
```json
{
  "success": true,
  "data": [
    {
      "id": "media-...",
      "type": "photo",
      "title": "Lord Murugan Blessing",
      "url": "https://images.unsplash.com/...",
      "thumbnail": "https://images.unsplash.com/...",
      "stats": {
        "likes": 0,
        "downloads": 0,
        "shares": 0,
        "views": 0
      }
    }
  ],
  "pagination": {...}
}
```

---

## 🎨 Step 4: Upload More Sample Content

For best testing, upload at least:
- ✅ 10-20 photos/wallpapers
- ✅ 5-10 YouTube songs/videos  
- ✅ 3-5 Sparkle articles

**Good Unsplash Photos for Testing:**
```
https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=800
https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800
https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800
https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800
https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800
```

**YouTube Video IDs for Testing:**
```
dQw4w9WgXcQ
jNQXAC9IVRw
9bZkp7q19f0
kJQP7kiw5Fk
```

---

## 📊 Step 5: Verify User Panel Can See Content

After uploading content:

1. Open **User Panel** (your main app)
2. Login with test user
3. Go to **Photos Tab**
4. You should now see all uploaded photos!

**If you don't see content:**
- Check browser console for errors
- Verify content has `visibility: 'public'`
- Check admin backend is running
- Test the API endpoint directly (see Step 3)

---

## 🔍 Step 6: Test Tracking

After content is visible in user panel:

### Test Like:
1. In user panel, click ❤️ on any photo
2. In admin panel, refresh Media List
3. Check that `likes` count increased by 1

### Test Download:
1. In user panel, open photo full-screen
2. Click Download button 📥
3. In admin panel, check `downloads` count increased

### Test Share:
1. In user panel, open photo full-screen
2. Click Share button 📤
3. In admin panel, check `shares` count increased

### Test Views:
1. In user panel, open any photo full-screen
2. In admin panel, check `views` count increased

---

## ⚠️ Common Issues & Fixes

### Issue 1: "No wallpapers found" in user panel

**Cause:** No content uploaded or visibility not set to "public"

**Fix:**
1. Go to admin panel
2. Check Media List has items
3. Verify each item has `visibility: "public"`
4. Re-upload if needed with correct visibility

### Issue 2: Images not loading

**Cause:** Invalid image URLs

**Fix:**
1. Use valid Unsplash URLs (they work cross-origin)
2. Format: `https://images.unsplash.com/photo-XXXXX?w=800`
3. Don't use local file paths
4. Don't use URLs that require authentication

### Issue 3: Tracking not working

**Cause:** User not authenticated or backend error

**Fix:**
1. Ensure user is logged in
2. Check browser console for errors
3. Verify admin backend is running
4. Check network tab for failed API calls

### Issue 4: Backend not responding

**Cause:** Server might be asleep or not deployed

**Fix:**
1. Wake up backend:
```bash
curl https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/health
```
2. Should return: `{"status":"ok","timestamp":"..."}`

---

## 📝 Quick Upload Script

Save this as `quick-upload.js` and run with Node:

```javascript
const uploads = [
  {
    type: 'photo',
    title: 'Lord Murugan - Temple',
    url: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=400',
    tags: ['murugan', 'temple', 'hd'],
    category: 'murugan',
    visibility: 'public',
    isPremium: false
  },
  {
    type: 'photo',
    title: 'Divine Murugan',
    url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400',
    tags: ['murugan', 'divine', 'wallpaper'],
    category: 'murugan',
    visibility: 'public',
    isPremium: false
  },
  // Add more...
];

const API_BASE = 'https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb';
const TOKEN = 'YOUR_ADMIN_TOKEN'; // Get from login

async function uploadAll() {
  for (const item of uploads) {
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbG...',
        'X-User-Token': TOKEN
      },
      body: JSON.stringify(item)
    });
    const result = await response.json();
    console.log('Uploaded:', result.media?.title || 'Failed');
  }
}

uploadAll();
```

---

## ✅ Success Checklist

Before testing user panel, ensure:

- [ ] Admin panel is accessible
- [ ] At least 10 photos uploaded
- [ ] At least 5 YouTube songs uploaded
- [ ] At least 3 articles uploaded
- [ ] All content has `visibility: "public"`
- [ ] Backend health check returns OK
- [ ] API endpoint returns data
- [ ] User panel shows content
- [ ] Like button works and tracks
- [ ] Download button works and tracks
- [ ] Share button works and tracks

---

## 🎯 Ready to Test!

Once you've uploaded content:
1. Refresh user panel
2. Photos should appear in grid
3. Test all features
4. Check admin analytics

**Your devotional wallpaper app is ready! 🙏**
