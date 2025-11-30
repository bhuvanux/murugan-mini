# 🚀 Launch Checklist - Murugan Wallpapers & Videos

## ✅ Pre-Launch Setup (One-Time)

### 📋 Step 1: Supabase Project Setup
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project named `murugan-wallpapers`
- [ ] Save project credentials:
  - [ ] Project URL: `https://________.supabase.co`
  - [ ] Project Ref: `________`
  - [ ] Anon Key: `________`
  - [ ] Service Role Key: `________` (keep secret!)
  - [ ] Database Password: `________` (keep secret!)

### 📋 Step 2: Database Setup
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Open `/supabase/migrations/001_initial_schema.sql`
- [ ] Copy entire file contents
- [ ] Paste into SQL Editor
- [ ] Click "Run" or press Cmd+Enter
- [ ] Verify: See "Success. No rows returned"
- [ ] Check: Dashboard → Database → Tables shows 8 tables

**Tables Created:**
- [ ] profiles
- [ ] media
- [ ] sparks
- [ ] user_favorites
- [ ] playlists
- [ ] playlist_items
- [ ] analytics_events
- [ ] media_reports

### 📋 Step 3: Storage Setup
- [ ] Go to Supabase Dashboard → Storage
- [ ] Click "Create new bucket"
- [ ] Bucket name: `public-media`
- [ ] Toggle "Public bucket" to ON
- [ ] Click "Create bucket"
- [ ] Verify: Bucket appears in list

### 📋 Step 4: Edge Functions Deployment
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Deploy: `supabase functions deploy make-server-4a075ebc`
- [ ] Test health endpoint:
  ```bash
  curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/health
  ```
- [ ] Verify: Response is `{"status":"ok"}`

### 📋 Step 5: Upload Media Content

#### Option A: Quick Test (Sample Data)
- [ ] Call seed endpoint:
  ```bash
  curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data
  ```
- [ ] Verify: 10 sample wallpapers added
- [ ] Check: Dashboard → Database → Table Editor → media table

#### Option B: Upload Your Wallpapers (Recommended)
- [ ] Navigate to scripts folder: `cd scripts`
- [ ] Install dependencies: `npm install`
- [ ] Create upload folder: `mkdir ../assets-to-upload`
- [ ] Add your Murugan wallpapers to `assets-to-upload/`
- [ ] Set environment variables:
  ```bash
  export SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
  export SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY
  ```
- [ ] Run upload: `node upload_media.js`
- [ ] Verify: See success messages for each file
- [ ] Check: Dashboard → Storage → public-media → images

### 📋 Step 6: Frontend Configuration
- [ ] Open `/utils/supabase/info.tsx`
- [ ] Verify `projectId` matches your project
- [ ] Verify `publicAnonKey` matches your anon key
- [ ] Save file if changed

---

## ✅ Post-Deployment Verification

### 📋 API Endpoints Test
- [ ] Health: `curl .../health` → `{"status":"ok"}`
- [ ] Search: `curl .../search?kind=image&limit=5` → Returns results
- [ ] Media: `curl .../media/SOME_ID` → Returns media object

### 📋 Frontend Test
- [ ] Open app in browser
- [ ] **Photos Tab:**
  - [ ] Wallpapers load in masonry grid
  - [ ] Search bar works
  - [ ] Click image opens full-screen viewer
  - [ ] Like button works
  - [ ] Download button works
  - [ ] Share button works
- [ ] **Songs Tab:**
  - [ ] Tab switches between Songs/Videos
  - [ ] YouTube embeds load
  - [ ] 3-dot menu opens
  - [ ] All menu options work (Play, Favorite, Share, Download, etc.)
  - [ ] Mini-player appears when playing
- [ ] **Spark Tab:**
  - [ ] Articles load in vertical feed
  - [ ] Swipe up/down scrolls smoothly
  - [ ] Like/Share/Read buttons work
  - [ ] Images load properly
- [ ] **Profile Tab:**
  - [ ] Profile displays correctly
  - [ ] Settings accessible
  - [ ] Admin panel works (if admin user)
- [ ] **Bottom Navigation:**
  - [ ] All 4 tabs switch correctly
  - [ ] Active tab highlighted (#015E2C)
  - [ ] Icons proper size (24px)
  - [ ] Background color correct (#052A16)

### 📋 Database Verification
- [ ] Go to Dashboard → Database → Table Editor
- [ ] Check `media` table has records
- [ ] Check `analytics_events` shows logged events
- [ ] Check `user_favorites` when you like something
- [ ] Run test query:
  ```sql
  SELECT COUNT(*) FROM media WHERE kind = 'image';
  ```
- [ ] Verify count > 0

### 📋 Storage Verification
- [ ] Go to Dashboard → Storage → public-media
- [ ] Expand `images/original/` - see files
- [ ] Expand `images/web/` - see optimized versions
- [ ] Expand `images/thumb/` - see thumbnails
- [ ] Click any image - should display

---

## ✅ Optional Enhancements

### 📋 NewsAPI Integration (for real-time Spark articles)
- [ ] Get free API key from https://newsapi.org
- [ ] Go to Dashboard → Edge Functions → Secrets
- [ ] Add secret: Name = `NEWS_API_KEY`, Value = `your-key`
- [ ] Wait 1 minute for function to restart
- [ ] Test Spark tab - should fetch real news

### 📋 Custom Domain (Optional)
- [ ] Go to Dashboard → Settings → Custom Domains
- [ ] Add your domain
- [ ] Update DNS records
- [ ] Wait for SSL certificate

### 📋 Email Authentication Setup
- [ ] Go to Dashboard → Authentication → Settings
- [ ] Configure email provider (SendGrid, etc.)
- [ ] Enable email confirmations
- [ ] Test signup/login flow

---

## ✅ Production Readiness

### 📋 Security Review
- [ ] Database password is strong and saved securely
- [ ] Service Role Key not exposed in frontend code
- [ ] RLS policies enabled on all tables
- [ ] Storage bucket properly configured (public/private)
- [ ] API keys stored in environment variables

### 📋 Performance Check
- [ ] Images load quickly (optimized sizes)
- [ ] Search returns results fast (<1 second)
- [ ] No console errors in browser
- [ ] No CORS errors
- [ ] Analytics events logging properly

### 📋 Content Review
- [ ] All wallpapers are devotional Murugan content
- [ ] No inappropriate images
- [ ] Proper titles and tags
- [ ] Good quality images (HD)
- [ ] Variety of content (temples, deities, festivals)

### 📋 Documentation
- [ ] Read FINAL_DEPLOYMENT_GUIDE.md
- [ ] Understand API_ENDPOINTS.md
- [ ] Review IMPLEMENTATION_STATUS.md
- [ ] Know how to upload more content (/scripts/README.md)

---

## ✅ Launch Day

### 📋 Final Checks
- [ ] Test on mobile device
- [ ] Test on desktop browser
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Verify all features work
- [ ] Check loading times
- [ ] Review error logs (Dashboard → Edge Functions → Logs)

### 📋 Monitoring Setup
- [ ] Set up alerts for errors
- [ ] Monitor storage usage
- [ ] Monitor bandwidth usage
- [ ] Track user analytics

### 📋 Go Live
- [ ] Share app URL with users
- [ ] Post on social media
- [ ] Share in devotional communities
- [ ] Gather feedback
- [ ] Monitor for issues

---

## ✅ Post-Launch Maintenance

### 📋 Daily
- [ ] Check error logs
- [ ] Monitor user activity
- [ ] Review analytics events

### 📋 Weekly
- [ ] Upload new wallpapers
- [ ] Review popular content
- [ ] Check storage usage
- [ ] Respond to user feedback

### 📋 Monthly
- [ ] Review analytics trends
- [ ] Plan new features
- [ ] Update content
- [ ] Backup database

---

## 🎯 Success Metrics

You'll know everything is working when:

- ✅ Users can search and find wallpapers
- ✅ Downloads work smoothly
- ✅ Songs/videos play without issues
- ✅ Spark feed shows latest news
- ✅ Analytics tracking user behavior
- ✅ No errors in logs
- ✅ Fast loading times
- ✅ Positive user feedback

---

## 📞 Troubleshooting

If something doesn't work:

1. **Check the logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - Browser Console (F12)

2. **Verify environment:**
   - `/utils/supabase/info.tsx` has correct values
   - Edge function is deployed
   - Database migration ran successfully

3. **Test endpoints:**
   ```bash
   # Health check
   curl .../health
   
   # Search test
   curl .../search?kind=image
   ```

4. **Review documentation:**
   - IMPLEMENTATION_STATUS.md - Known issues
   - FINAL_DEPLOYMENT_GUIDE.md - Common fixes
   - API_ENDPOINTS.md - Endpoint specs

---

## 🎉 You're Ready!

When all checkboxes above are checked, you have:

- ✅ Fully functional devotional wallpaper app
- ✅ Complete backend with database, storage, APIs
- ✅ Beautiful mobile-first frontend
- ✅ Analytics tracking
- ✅ News feed feature
- ✅ Media player
- ✅ User authentication

**Share the divine blessings of Lord Murugan!**

**Vel Vel Muruga! 🕉️🙏**
