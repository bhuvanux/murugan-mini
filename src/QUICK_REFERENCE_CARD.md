# 🎯 QUICK REFERENCE CARD

## 🔗 Key URLs

**Admin Backend:**
```
https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb
```

**Health Check:**
```
GET /make-server-d083adfb/health
```

---

## 📦 Admin API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/media/list` | GET | Get wallpapers/videos |
| `/media/:id` | GET | Get single media (tracks view) |
| `/media/:id/like` | POST | Like media (requires auth) |
| `/media/:id/download` | POST | Download (requires auth) |
| `/media/upload` | POST | Upload content (admin only) |
| `/sparkle/list` | GET | Get articles |
| `/sparkle/:id` | GET | Get single article |
| `/auth/login` | POST | User login |
| `/auth/signup` | POST | User signup |

---

## 🎨 User Panel Tabs

| Tab | Component | Fetches From |
|-----|-----------|--------------|
| Photos | `MasonryFeed` | `/media/list?excludeYoutube=true` |
| Songs | `SongsScreen` | `/media/list?type=youtube` |
| Spark | `SparkScreen` | `/sparkle/list` |
| Profile | `ProfileScreen` | Local state |

---

## 🔑 Auth Flow

```typescript
// Login
const result = await userAPI.login(email, password);
// → Sets token in localStorage as 'user_token'
// → AuthContext picks it up
// → All API calls include token in X-User-Token header

// Logout
await signOut();
// → Clears token from localStorage
// → Redirects to login
```

---

## 📊 Tracking Functions

```typescript
// In /utils/api/client.ts

// Like
await userAPI.likeMedia(mediaId);

// Download  
await userAPI.downloadMedia(mediaId);

// Share
await userAPI.trackShare(mediaId);

// View (automatic when fetching single media)
await userAPI.trackView(mediaId);
```

---

## 🎭 Sample Upload Requests

### Upload Photo (Admin Panel):
```bash
POST /make-server-d083adfb/media/upload
Headers: X-User-Token: {admin_token}

{
  "type": "photo",
  "title": "Lord Murugan Blessing",
  "url": "https://example.com/image.jpg",
  "thumbnail": "https://example.com/thumb.jpg",
  "tags": ["murugan", "hd"],
  "category": "murugan",
  "visibility": "public",
  "isPremium": false
}
```

### Upload YouTube Song:
```bash
POST /make-server-d083adfb/media/upload

{
  "type": "youtube",
  "title": "Devotional Song",
  "embedUrl": "https://youtube.com/embed/VIDEO_ID",
  "thumbnail": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
  "tags": ["song"],
  "category": "songs",
  "visibility": "public"
}
```

### Upload Article:
```bash
POST /make-server-d083adfb/sparkle/create

{
  "type": "article",
  "title": "Article Title",
  "shortDescription": "Short desc",
  "fullArticle": "Full content...",
  "coverImage": "https://example.com/image.jpg",
  "tags": ["story"],
  "isPublic": true
}
```

---

## 🐛 Debug Commands

```javascript
// Test API connection
fetch('https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/health')
  .then(r => r.json())
  .then(console.log);

// Check token
console.log(localStorage.getItem('user_token'));

// Test wallpapers fetch
import { userAPI } from './utils/api/client.ts';
userAPI.getWallpapers({ limit: 5 }).then(console.log);

// Test YouTube fetch
userAPI.getYouTubeMedia({ limit: 5 }).then(console.log);

// Test articles fetch
userAPI.getSparkleArticles({ limit: 5 }).then(console.log);
```

---

## 📁 File Locations

```
/utils/api/client.ts         → API client (main integration file)
/utils/supabase/client.tsx   → Supabase client (auth)
/contexts/AuthContext.tsx    → Auth management
/components/MasonryFeed.tsx  → Photos tab
/components/SongsScreen.tsx  → Songs tab
/components/SparkScreen.tsx  → Spark tab
/components/MediaDetail.tsx  → Full-screen viewer
/App.tsx                     → Main app component
```

---

## ⚡ Quick Commands

### Check if backend is running:
```bash
curl https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/health
```

### Expected response:
```json
{"status":"ok","timestamp":"2025-11-15T..."}
```

---

## 🎯 Testing Checklist

- [ ] Backend health check responds
- [ ] User can login
- [ ] Photos tab loads wallpapers
- [ ] Songs tab loads YouTube content
- [ ] Spark tab loads articles
- [ ] Like button works & tracks
- [ ] Download button works & tracks
- [ ] Share button works & tracks
- [ ] Full-screen viewer opens
- [ ] Navigation between items works
- [ ] Logout clears token

---

## 🔐 Credentials

### Demo Admin:
- Email: `admin@muruganwallpapers.com`
- Password: `admin123`

### Test User:
- Email: `test@murugan.com`
- Password: `test1234`

---

## 🎨 Color Palette

```css
Primary Green:     #0d5e38
Dark Green:        #052A16
Active Tab:        #015E2C
Orange (Download): #D97706
White/Text:        #FFFFFF
Gray (Inactive):   rgba(255,255,255,0.7)
```

---

## 📱 Tab Navigation Colors

```typescript
Bottom Nav Background: #052A16
Active Tab Highlight:  #015E2C
Inactive Tab:          transparent
Icon Active:           text-white
Icon Inactive:         text-white/70
```

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "No wallpapers found" | No content uploaded | Upload in admin panel |
| "Failed to fetch" | Backend offline | Check health endpoint |
| "Authentication required" | Not logged in | Login first |
| "Invalid token" | Token expired | Logout & login again |
| Import error | Wrong import path | Use `/utils/api/client` |

---

## 💡 Pro Tips

1. **Always check browser console** for errors
2. **Check Network tab** for failed API calls
3. **Verify token exists** in localStorage
4. **Test backend health** before debugging client
5. **Upload test content** before testing user panel

---

## 📞 Need Help?

1. Read `/INTEGRATION_COMPLETE.md` for full docs
2. Read `/ERRORS_FIXED.md` for error solutions  
3. Read `/FINAL_SUMMARY.md` for architecture overview
4. Check browser console for specific errors
5. Test backend health endpoint first

---

**EVERYTHING IS READY! 🚀**

Just upload content in admin and test the user panel!

*Vel Vel Muruga! 🔱*
