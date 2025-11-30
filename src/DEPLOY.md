# 🚀 Deployment Guide - Production Ready

## Prerequisites

Before deploying, ensure you have:
- ✅ Supabase project created
- ✅ Node.js 18+ installed
- ✅ Supabase CLI installed (`npm install -g supabase`)

---

## 📋 Deployment Checklist

### 1️⃣ Database Setup (5 minutes)

#### Step 1.1: Run Migration
```bash
# Option A: Via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy content from: supabase/migrations/001_initial_schema.sql
3. Paste and click "Run"
4. Wait for success message

# Option B: Via CLI
supabase db push
```

#### Step 1.2: Verify Tables
```sql
-- Run in SQL Editor to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should see: profiles, media, sparks, user_favorites, 
--              playlists, playlist_items, analytics_events, media_reports
```

✅ **Expected Result:** 8 tables created with RLS enabled

---

### 2️⃣ Storage Configuration (2 minutes)

#### Step 2.1: Create Bucket
```bash
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: public-media
4. Public: ✅ ON
5. Click "Create"
```

#### Step 2.2: Test Bucket
```bash
# Upload a test file
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/storage/v1/object/public-media/test.txt" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: text/plain" \
  --data "Hello Murugan"

# Access it
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/public-media/test.txt
```

✅ **Expected Result:** File accessible via public URL

---

### 3️⃣ Edge Functions Deployment (3 minutes)

#### Step 3.1: Setup Supabase CLI
```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# You can find PROJECT_REF in:
# Dashboard → Settings → General → Reference ID
```

#### Step 3.2: Deploy Function
```bash
# Deploy the server
supabase functions deploy make-server-4a075ebc

# Expected output:
# ✓ Deployed function make-server-4a075ebc
# URL: https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc
```

#### Step 3.3: Set Environment Variables
```bash
# Via Dashboard:
1. Go to Edge Functions → make-server-4a075ebc
2. Click "Settings"
3. Add secrets (if not already set):
   - SUPABASE_URL (auto-set)
   - SUPABASE_SERVICE_ROLE_KEY (auto-set)
   
# Optional: Add NEWS_API_KEY for real-time news
4. Add: NEWS_API_KEY = your_newsapi_key_here

# Via CLI:
supabase secrets set NEWS_API_KEY=your_key_here
```

#### Step 3.4: Test Deployment
```bash
# Test health endpoint
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/health

# Expected response:
# {"status":"ok","timestamp":"2024-11-12T..."}
```

✅ **Expected Result:** Server responding with 200 OK

---

### 4️⃣ Initial Data Setup (Choose One)

#### Option A: Seed Sample Data (Fast - 1 minute)
```bash
# Quick test with sample images
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Expected output:
# {"success":true,"message":"Successfully seeded 3 sample media items"}
```

#### Option B: Upload Real Media (Recommended - 10 minutes)
```bash
# 1. Navigate to scripts directory
cd scripts

# 2. Install dependencies
npm install

# 3. Create upload directory
mkdir -p ../assets-to-upload

# 4. Add your images to assets-to-upload/
# Filename format: <slug>__<title>__<tag1>,<tag2>.jpg

# 5. Set environment variables
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_KEY=your_service_role_key_here

# 6. Run upload
npm run upload

# Or directly:
node upload_media.js
```

✅ **Expected Result:** Media uploaded and visible in app

---

### 5️⃣ Client App Configuration (2 minutes)

Your client is already configured with the correct endpoints!

#### Verify Configuration
File: `utils/supabase/info.tsx`
```typescript
export const projectId = "YOUR_PROJECT_ID"
export const publicAnonKey = "YOUR_ANON_KEY"
```

#### Test API Connection
```bash
# Test search endpoint
curl "https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/media/search?limit=5"

# Should return:
# {"results":[...], "count":5}
```

✅ **Expected Result:** App loads media from database

---

## 🎯 Post-Deployment Tests

### Test 1: Media Loading
```bash
# Should show media items
https://your-app.com → Photos tab
```

### Test 2: Search
```bash
# Type "murugan" in search box
# Should filter results
```

### Test 3: Authentication
```bash
# Click Profile → Sign in
# Create account with email
# Should redirect to profile page
```

### Test 4: Favorites
```bash
# Heart icon on any photo
# Go to Profile → Liked Photos
# Should show favorited items
```

### Test 5: Spark News
```bash
# Click Spark tab
# Should show articles
# Swipe up/down to navigate
```

---

## 📊 Monitoring & Analytics

### Check Logs

#### Edge Function Logs
```bash
# Via Dashboard
1. Go to Edge Functions → make-server-4a075ebc
2. Click "Logs" tab
3. Filter by time range

# Via CLI
supabase functions logs make-server-4a075ebc
```

#### Database Queries
```sql
-- Most viewed media
SELECT title, views, likes 
FROM media 
ORDER BY views DESC 
LIMIT 10;

-- Recent analytics events
SELECT event_type, COUNT(*) 
FROM analytics_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;

-- User activity
SELECT COUNT(DISTINCT user_id) as active_users
FROM analytics_events 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Set Up Alerts

```bash
# Monitor database size
SELECT pg_size_pretty(pg_database_size('postgres'));

# Check storage usage
# Dashboard → Settings → Usage
```

---

## 🔐 Security Checklist

- [x] RLS enabled on all tables
- [x] Service role key never exposed to client
- [x] Storage bucket properly configured (public-media)
- [x] Edge function environment variables set
- [x] CORS configured correctly
- [x] Authentication required for sensitive endpoints

---

## 🚨 Troubleshooting

### Issue: "Table does not exist"
**Solution:** Run migration SQL in Supabase Dashboard

### Issue: "Bucket not found"
**Solution:** Create `public-media` bucket in Storage

### Issue: Images return 404
**Solution:** 
1. Check bucket is public
2. Verify file paths in database match storage
3. Test URL directly in browser

### Issue: Edge function timeouts
**Solution:**
1. Check function logs for errors
2. Verify SUPABASE_URL and keys are set
3. Increase timeout in function config

### Issue: Search returns nothing
**Solution:**
1. Verify media table has data: `SELECT COUNT(*) FROM media;`
2. Check document column is populated
3. Run seed data script

### Issue: Authentication errors
**Solution:**
1. Check RLS policies are enabled
2. Verify JWT token is valid
3. Check auth.users table has entry

---

## 📈 Performance Optimization

### Enable Connection Pooling
```bash
# In Supabase Dashboard → Settings → Database
# Enable: "Connection pooling"
# Mode: "Transaction"
```

### Add Database Indexes (Already Done!)
```sql
-- These are already in the migration:
-- media_tags_idx (GIN on tags)
-- media_document_idx (GIN on document)
-- media_created_idx (on created_at)
```

### Configure CDN Caching
```bash
# Storage files already have:
# Cache-Control: public, max-age=86400, s-maxage=2592000
```

### Monitor Query Performance
```sql
-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🎉 Deployment Complete!

Your production environment is now live with:

- ✅ Database with full-text search
- ✅ CDN-backed storage
- ✅ Serverless API endpoints
- ✅ Real-time analytics
- ✅ Secure authentication
- ✅ Automated backups (via Supabase)

### Production URLs

- **App:** `https://your-domain.com`
- **API:** `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc`
- **Storage:** `https://YOUR_PROJECT.supabase.co/storage/v1/object/public/public-media/`
- **Dashboard:** `https://app.supabase.com/project/YOUR_PROJECT`

---

## 📞 Support

- 📖 **Architecture:** See `/ARCHITECTURE.md`
- 🔧 **Setup Guide:** See `/SETUP_COMPLETE.md`
- 💾 **Database:** See `/supabase/migrations/001_initial_schema.sql`
- 📊 **Supabase Docs:** https://supabase.com/docs

---

**🙏 May Lord Murugan bless your deployment!**

**Next:** Start uploading devotional content and grow your user base!
