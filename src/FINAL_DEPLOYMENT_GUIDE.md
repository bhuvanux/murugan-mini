# 🚀 Murugan Wallpapers & Videos - Final Deployment Guide

## Prerequisites Checklist

Before you begin, ensure you have:
- ✅ Supabase account (free tier works)
- ✅ Node.js 18+ installed
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Collection of Murugan wallpapers ready to upload

---

## 🎯 **5-Minute Quick Start**

### Step 1: Create Supabase Project (2 minutes)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `murugan-wallpapers`
   - **Database Password:** (generate strong password - save it!)
   - **Region:** Choose closest to your users
4. Click **"Create new project"**
5. Wait for project to deploy (~2 minutes)

---

### Step 2: Run Database Migration (1 minute)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy entire contents of `/supabase/migrations/001_initial_schema.sql`
4. Paste into SQL editor
5. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)
6. You should see: **"Success. No rows returned"**

**What this did:**
- Created 8 tables (profiles, media, sparks, favorites, playlists, analytics, reports)
- Added full-text search indexes
- Set up Row-Level Security policies
- Created 5 database functions
- Ready for data!

---

### Step 3: Create Storage Bucket (1 minute)

1. In Supabase Dashboard, go to **Storage**
2. Click **"Create new bucket"**
3. Fill in:
   - **Bucket name:** `public-media`
   - **Public bucket:** Toggle ON (✅)
4. Click **"Create bucket"**

**Storage is now ready for wallpapers!**

---

### Step 4: Deploy Edge Functions (1 minute)

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the server function
supabase functions deploy make-server-4a075ebc
```

**Your project ref** is in your Supabase URL:
```
https://[YOUR_PROJECT_REF].supabase.co
```

**Verify deployment:**
```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/health
# Should return: {"status":"ok"}
```

---

### Step 5: Upload Wallpapers (Variable time)

#### Option A: Upload via Script (Bulk)

```bash
# Navigate to scripts folder
cd scripts

# Install dependencies
npm install

# Set environment variables (get these from Supabase Dashboard → Settings → API)
export SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY  # Settings → API → service_role key

# Create upload directory
mkdir ../assets-to-upload

# Add your images to assets-to-upload folder
# Filename format (optional): slug__Title__tag1,tag2.jpg
# Example: palani__Palani Temple Murugan__temple,murugan,devotion.jpg

# Run upload script
node upload_media.js
```

**What this does:**
- Scans for all .jpg, .png, .webp files
- Generates 3 optimized sizes (original, web, thumbnail)
- Uploads to Supabase Storage
- Creates database records
- Shows progress for each file

#### Option B: Use Seed Data (Quick Test)

```bash
# Call the seed endpoint
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# This adds 10 sample Murugan wallpapers from Unsplash
```

---

## ✅ **Verify Everything Works**

### Test 1: Health Check
```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/health
# Expected: {"status":"ok"}
```

### Test 2: Search Endpoint
```bash
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/search?kind=image&limit=5"
# Expected: {"results":[...], "count":5}
```

### Test 3: Database Query
In Supabase Dashboard → SQL Editor:
```sql
SELECT id, kind, title, tags FROM media LIMIT 5;
```
You should see your uploaded media!

### Test 4: Storage Files
In Supabase Dashboard → Storage → `public-media`:
- Expand `images/original/` - see original images
- Expand `images/web/` - see web versions
- Expand `images/thumb/` - see thumbnails

---

## 🎨 **Configure Frontend**

Your `/utils/supabase/info.tsx` should already have:
```typescript
export const projectId = "YOUR_PROJECT_REF"
export const publicAnonKey = "YOUR_ANON_KEY"
```

If not, update it with values from:
**Supabase Dashboard → Settings → API**

---

## 🎉 **Launch Your App!**

Your app is now ready! Open it in a browser and you should see:

1. **Photos Tab:** Masonry grid of Murugan wallpapers
2. **Songs Tab:** Audio/video player (add YouTube videos)
3. **Spark Tab:** News articles about Murugan temples
4. **Profile Tab:** User profile and settings

---

## 📊 **Monitor Your App**

### Check Logs
**Supabase Dashboard → Edge Functions → make-server-4a075ebc → Logs**

See all API requests, errors, and performance metrics.

### View Analytics
```sql
-- In SQL Editor, check analytics events
SELECT 
  event_type, 
  COUNT(*) as count,
  DATE(created_at) as date
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, DATE(created_at)
ORDER BY date DESC, count DESC;
```

### Popular Content
```sql
-- Most viewed wallpapers
SELECT id, title, views, likes, downloads
FROM media
WHERE kind = 'image'
ORDER BY views DESC
LIMIT 10;
```

---

## 🔧 **Common Issues & Fixes**

### Issue: "relation 'media' does not exist"
**Fix:** Run the migration SQL again (Step 2)

### Issue: Upload script fails with "bucket not found"
**Fix:** Create the `public-media` bucket (Step 3)

### Issue: Edge function returns 404
**Fix:** Deploy function again:
```bash
supabase functions deploy make-server-4a075ebc --no-verify-jwt
```

### Issue: Images not showing in app
**Fix:** Check:
1. Storage bucket is public
2. Media records exist in database
3. Browser console for CORS errors

### Issue: Search returns no results
**Fix:** 
1. Verify media exists: `SELECT COUNT(*) FROM media;`
2. Check indexes: `SELECT * FROM pg_indexes WHERE tablename = 'media';`
3. Rebuild search vectors:
```sql
UPDATE media SET document = to_tsvector('simple', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(array_to_string(tags, ' '), '')
);
```

---

## 🚀 **Next Steps**

### Add More Content
```bash
# Add more wallpapers anytime
cd scripts
# Add images to ../assets-to-upload/
node upload_media.js
```

### Add YouTube Songs
In Supabase Dashboard → SQL Editor:
```sql
INSERT INTO media (kind, title, description, host_url, duration, tags)
VALUES (
  'youtube',
  'கந்த சஷ்டி கவசம்',
  'Devotional song by K. Veeramani',
  'u2mHcGB1VoE',  -- YouTube video ID
  '41:31',
  ARRAY['murugan', 'devotional', 'kanda-sashti']
);
```

### Enable Real-Time News (Optional)
1. Get free API key from https://newsapi.org
2. In Supabase Dashboard → Edge Functions → Secrets:
   - Add secret: `NEWS_API_KEY` = `your-key`
3. Articles will auto-fetch from real news sources!

### Customize Colors
In your code, change:
- Header: `#0d5e38` (current green)
- Bottom nav: `#052A16` (dark green) & `#015E2C` (active)

---

## 📚 **Reference Documentation**

- **Complete API Guide:** `/API_ENDPOINTS.md`
- **Architecture Overview:** `/ARCHITECTURE.md`
- **Implementation Status:** `/IMPLEMENTATION_STATUS.md`
- **Upload Script Guide:** `/scripts/README.md`
- **Database Schema:** `/supabase/migrations/001_initial_schema.sql`

---

## 🎯 **Production Checklist**

Before going live:
- [ ] Change database password from default
- [ ] Enable Supabase email confirmations (Dashboard → Authentication)
- [ ] Set up custom domain (optional)
- [ ] Configure rate limiting (Dashboard → Edge Functions)
- [ ] Set up monitoring alerts
- [ ] Backup database (Dashboard → Database → Backups)
- [ ] Review RLS policies for security
- [ ] Test on multiple devices/browsers
- [ ] Add privacy policy and terms of service
- [ ] Set up analytics export (BigQuery/export)

---

## 💡 **Tips for Success**

### Image Naming Convention
Use descriptive filenames for better search:
```
Good: palani__Palani Murugan Darshan__temple,murugan,palani.jpg
Bad: IMG_1234.jpg
```

### Tags to Use
Common tags for Murugan content:
- `murugan`, `kartikeya`, `skanda`
- `palani`, `thiruchendur`, `swamimalai` (temple names)
- `vel`, `peacock`, `kavadi` (symbols)
- `devotional`, `worship`, `prayer`
- `festival`, `thaipusam`, `skanda-sashti`

### Image Requirements
- **Format:** JPG, PNG, or WebP
- **Size:** 1920x1080 or higher recommended
- **Quality:** High resolution for devotional wallpapers
- **Content:** Only authentic Murugan-related images

---

## 🙏 **You're All Set!**

Your Murugan Wallpapers & Videos app is now:
- ✅ Fully deployed on Supabase
- ✅ Database schema with full-text search
- ✅ API endpoints for all features
- ✅ Storage configured for media
- ✅ Frontend connected and working
- ✅ Analytics tracking enabled
- ✅ Ready for users!

**Share the divine blessings with devotees worldwide!**

**Vel Vel Muruga! 🕉️🙏**

---

## 📞 **Need Help?**

1. Check `/IMPLEMENTATION_STATUS.md` for troubleshooting
2. Review Supabase logs for errors
3. Test individual endpoints with curl
4. Verify database tables and data exist

**Remember:** The architecture is designed to be simple and scalable. Start with the basics, then add advanced features as needed!
