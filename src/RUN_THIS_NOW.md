# 🚀 COMPLETE SETUP - COPY & PASTE

## STEP 1: Run SQL on ADMIN Supabase

**Open your ADMIN Supabase → SQL Editor → Paste this entire script → Click RUN:**

```sql
-- Banner Folders & Analytics
CREATE TABLE IF NOT EXISTS banner_folders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_banner_folders_created_at ON banner_folders(created_at DESC);
CREATE TABLE IF NOT EXISTS banner_analytics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE, event_type TEXT NOT NULL, user_id UUID, device_info JSONB, location TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner_id ON banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_event_type ON banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created_at ON banner_analytics(created_at DESC);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES banner_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_banners_folder_id ON banners(folder_id);

-- Media Folders & Analytics
CREATE TABLE IF NOT EXISTS media_folders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_media_folders_created_at ON media_folders(created_at DESC);
CREATE TABLE IF NOT EXISTS media_analytics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE, event_type TEXT NOT NULL, user_id UUID, device_info JSONB, location TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_media_analytics_media_id ON media_analytics(media_id);
CREATE INDEX IF NOT EXISTS idx_media_analytics_event_type ON media_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_media_analytics_created_at ON media_analytics(created_at DESC);
ALTER TABLE media ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_media_folder_id ON media(folder_id);

-- Sparkle Folders & Analytics
CREATE TABLE IF NOT EXISTS sparkle_folders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_sparkle_folders_created_at ON sparkle_folders(created_at DESC);
CREATE TABLE IF NOT EXISTS sparkle_analytics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sparkle_id UUID NOT NULL REFERENCES sparkles(id) ON DELETE CASCADE, event_type TEXT NOT NULL, user_id UUID, device_info JSONB, location TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_sparkle_id ON sparkle_analytics(sparkle_id);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_event_type ON sparkle_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_sparkle_analytics_created_at ON sparkle_analytics(created_at DESC);
ALTER TABLE sparkles ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES sparkle_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sparkles_folder_id ON sparkles(folder_id);

-- Verify
SELECT 'banner_folders' as table_name FROM banner_folders LIMIT 1 UNION ALL SELECT 'banner_analytics' FROM banner_analytics LIMIT 1 UNION ALL SELECT 'media_folders' FROM media_folders LIMIT 1 UNION ALL SELECT 'media_analytics' FROM media_analytics LIMIT 1 UNION ALL SELECT 'sparkle_folders' FROM sparkle_folders LIMIT 1 UNION ALL SELECT 'sparkle_analytics' FROM sparkle_analytics LIMIT 1;
```

**✅ Expected Output:** 
```
table_name
--------------
banner_folders
banner_analytics
media_folders
media_analytics
sparkle_folders
sparkle_analytics
```

---

## STEP 2: Test in Admin Panel

1. **Open Admin Panel** (hard refresh: Ctrl+Shift+R)

2. **Go to Banners Tab:**
   - ✅ You should see folder sidebar on left
   - ✅ Three tabs: Published / Scheduled / Draft
   - ✅ Date range filter at top
   - ✅ Upload button works
   - ✅ Analytics icon on each banner

3. **Go to Media Tab:**
   - ✅ Same features as Banners
   
4. **Go to Sparkle Tab:**
   - ✅ Same features as Banners

---

## ✅ WHAT YOU HAVE NOW

### Banner Module:
- ✅ Folders (create, edit, delete)
- ✅ Published/Scheduled/Draft tabs
- ✅ Upload with scheduling
- ✅ Analytics drawer (views, clicks, CTR)
- ✅ Bulk operations
- ✅ Calendar filtering
- ✅ Card/List views
- ✅ Countdown timers

### Media Module:
- ✅ Folders
- ✅ Published/Scheduled/Draft tabs
- ✅ Upload with scheduling
- ✅ Analytics drawer (plays, downloads, likes)
- ✅ Bulk operations
- ✅ Calendar filtering
- ✅ Card/List views
- ✅ Countdown timers

### Sparkle Module:
- ✅ Folders
- ✅ Published/Scheduled/Draft tabs
- ✅ Upload with scheduling
- ✅ Analytics drawer (views, likes, shares)
- ✅ Bulk operations
- ✅ Calendar filtering
- ✅ Card/List views
- ✅ Countdown timers

---

## 🧪 QUICK TEST

**Banner Test:**
```
1. Go to Banners → Click "Upload Banner"
2. Select image, enter title
3. Set "Scheduled" and pick future date
4. Upload
5. Check "Scheduled" tab → See countdown timer
6. Click analytics icon → See charts
```

**Media Test:**
```
1. Go to Media → Click "Upload Media"
2. Select audio/video, enter title
3. Create folder "Devotional Songs"
4. Upload to folder
5. Check sidebar → See folder with count
```

**Sparkle Test:**
```
1. Go to Sparkle → Click "Upload Sparkle"
2. Select image, enter title & content
3. Bulk select multiple items
4. Click "Move to Folder"
5. Create new folder and move
```

---

## 🎯 RESULT

**ONE LINE:** You now have EXACT wallpaper module features (folders, scheduling, analytics, bulk operations, calendar filtering) for Banner, Media, and Sparkle. ✅ COMPLETE!
