# 🔧 Fix Views & Downloads Tracking Issue

## Issue Summary
- ✅ **Likes working** - Counter increments correctly
- ❌ **Views not working** - Counter not incrementing  
- ❌ **Downloads not working** - Counter not incrementing

## Root Cause
**Column name mismatch** between SQL functions and actual database columns.

The SQL functions use: `view_count`, `download_count`  
But your database might have: `views`, `downloads`

---

## 🚀 Quick Fix (5 Minutes)

### Step 1: Run Flexible SQL (Handles Both Naming Conventions)
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy ALL of /FIX_COUNTERS_FLEXIBLE.sql
3. Paste and Run
4. Look for NOTICE messages showing which columns exist
```

This will:
- ✅ Detect which column names your table uses
- ✅ Create functions that work with your exact schema
- ✅ Support both naming conventions automatically

### Step 2: Verify Functions Created
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'increment_%'
ORDER BY routine_name;

-- Should show 12 functions:
-- increment_media_downloads
-- increment_media_likes
-- increment_media_shares
-- increment_media_views
-- increment_photo_downloads
-- increment_photo_likes
-- increment_photo_shares
-- increment_photo_views
-- increment_wallpaper_downloads  ← This one for downloads
-- increment_wallpaper_likes      ← This one working
-- increment_wallpaper_shares
-- increment_wallpaper_views      ← This one for views
```

### Step 3: Test View Tracking
```sql
-- Get a wallpaper ID
SELECT id, title FROM wallpapers LIMIT 1;

-- Copy the ID and test view increment
SELECT increment_wallpaper_views('<paste-wallpaper-id>');

-- Check if view counter increased
SELECT id, 
       COALESCE(view_count, 0) as view_count,
       COALESCE(views, 0) as views,
       COALESCE(download_count, 0) as download_count,
       COALESCE(downloads, 0) as downloads
FROM wallpapers 
WHERE id = '<same-wallpaper-id>';

-- One of these counters should have increased!
```

### Step 4: Test Download Tracking
```sql
-- Test download increment
SELECT increment_wallpaper_downloads('<same-wallpaper-id>');

-- Verify download counter increased
SELECT id, 
       COALESCE(download_count, 0) as download_count,
       COALESCE(downloads, 0) as downloads
FROM wallpapers 
WHERE id = '<same-wallpaper-id>';
```

---

## 🔍 Diagnostic: Find Your Actual Column Names

If you want to see which columns you actually have:

```sql
-- Show all counter columns in wallpapers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallpapers' 
  AND (column_name LIKE '%count%' 
       OR column_name LIKE '%view%' 
       OR column_name LIKE '%download%' 
       OR column_name LIKE '%like%' 
       OR column_name LIKE '%share%')
ORDER BY column_name;

-- Show a sample wallpaper with all its columns
SELECT * FROM wallpapers LIMIT 1;
```

Common schema variations:
| What Works (Likes) | What Doesn't Work | Likely Cause |
|--------------------|-------------------|--------------|
| `like_count` | `view_count`, `download_count` | Columns named `views`, `downloads` |
| `likes` | `views`, `downloads` | Different naming convention |

---

## 🎯 Expected Results After Fix

### In Browser Console:
```bash
# When you open a wallpaper
[MediaDetail] Tracking view for: <id>
[MediaDetail] View tracked successfully ✅

# When you download
[MediaDetail] Starting download for: <id>
[MediaDetail] Download tracked successfully ✅
```

### In Supabase Function Logs:
```bash
[View] ✅ Incremented wallpaper view: <id>
[Download] ✅ Incremented wallpaper download: <id>
```

### In Database:
- Views column increases when you open wallpaper
- Downloads column increases when you download

---

## 🚨 If Still Not Working After Running Flexible SQL

### Check 1: Verify RPC Call Success
```sql
-- This should return without error
SELECT increment_wallpaper_views('00000000-0000-0000-0000-000000000000');
-- Even with fake ID, should not crash (just won't update anything)
```

If you get error "function does not exist":
- ❌ Flexible SQL didn't run properly
- ✅ Re-run /FIX_COUNTERS_FLEXIBLE.sql

If you get error about columns:
- ❌ Your table has different column names entirely
- ✅ Run diagnostic queries above to find real column names

### Check 2: Backend Logs
```bash
1. Open Supabase Dashboard
2. Go to: Functions → server → Logs
3. Look for view/download tracking logs
```

Good logs:
```
[View] ✅ Incremented wallpaper view: abc-123
[Download] ✅ Incremented wallpaper download: abc-123
```

Bad logs:
```
[View] Wallpaper increment error: column "view_count" does not exist
[Download] Wallpaper increment error: column "download_count" does not exist
```

### Check 3: Network Tab
```bash
1. Open browser DevTools (F12)
2. Go to Network tab
3. Open a wallpaper
4. Look for: POST /media/<id>/view
5. Check response
```

Good response:
```json
{
  "success": true,
  "contentType": "wallpaper"
}
```

Bad response:
```json
{
  "error": "column \"view_count\" does not exist"
}
```

---

## 💡 Alternative: Rename Columns to Match Functions

If you prefer to keep the original SQL functions and rename your columns:

```sql
-- Only run this if you want to standardize column names
ALTER TABLE wallpapers RENAME COLUMN views TO view_count;
ALTER TABLE wallpapers RENAME COLUMN downloads TO download_count;
ALTER TABLE wallpapers RENAME COLUMN likes TO like_count;
ALTER TABLE wallpapers RENAME COLUMN shares TO share_count;

-- Then re-run original /FIX_COUNTERS.sql
```

⚠️ **Warning:** This will break if your Admin Panel code expects the old column names!

---

## ✅ Success Checklist

After running flexible SQL:

- [ ] No errors when running SQL
- [ ] 12 functions created (check with `SELECT routine_name...`)
- [ ] Test query increments view counter
- [ ] Test query increments download counter
- [ ] Browser console shows "View tracked successfully"
- [ ] Browser console shows "Download tracked successfully"
- [ ] Supabase logs show ✅ success messages
- [ ] Actual counters in database increase

---

## 📞 What to Check If Still Broken

1. **Run diagnostic query** from this file to find column names
2. **Copy paste the exact column names** you see
3. **Check if functions are updating the right columns**
4. **Look at Supabase Function Logs** for exact error messages

The flexible SQL should handle 99% of cases. If it still doesn't work, the issue might be:
- Table doesn't exist (not wallpapers)
- Permissions issue
- Backend not calling the RPC functions correctly

But most likely: ✅ **Flexible SQL will fix it!**
