# Counter Tracking Fix - Complete Setup Guide

## Overview
This guide will help you fix wallpaper counters (views, likes, downloads, shares) in your Murugan Wallpapers app. The fix involves running SQL migrations and verifying the backend integration.

## ✅ What's Already Fixed
1. **Splash Screen** - Now appears at top with z-index 9999
2. **Backend Endpoints** - Updated with smart content-type detection for wallpapers/media/photos
3. **Frontend stopPropagation** - Already implemented in MediaDetail.tsx to prevent swipe on like
4. **SQL Migration File** - Created at `/FIX_COUNTERS.sql`

## 🔧 Step 1: Run SQL Migration (REQUIRED)

### Instructions:
1. Open your **Supabase Dashboard** (User Panel Project)
2. Go to **SQL Editor**
3. Copy the entire contents of `/FIX_COUNTERS.sql`
4. Paste into SQL Editor
5. Click **Run** button

### What This Does:
Creates 15 RPC functions:
- `increment_wallpaper_views/likes/downloads/shares`
- `decrement_wallpaper_likes`
- `increment_media_views/likes/downloads/shares`
- `decrement_media_likes`
- `increment_photo_views/likes/downloads/shares`
- `decrement_photo_likes`

These functions safely increment/decrement counters using atomic operations.

---

## 📊 Step 2: Verify Migration Success

Run these test queries in Supabase SQL Editor:

### Test 1: Get a wallpaper ID
```sql
SELECT id, title, view_count, like_count FROM wallpapers LIMIT 1;
```
Copy the ID from the result.

### Test 2: Increment view counter
```sql
SELECT increment_wallpaper_views('<paste-wallpaper-id-here>');
```

### Test 3: Verify increment worked
```sql
SELECT id, view_count FROM wallpapers WHERE id = '<same-wallpaper-id>';
```
The `view_count` should be 1 higher than before.

### Test 4: Test like increment
```sql
SELECT increment_wallpaper_likes('<same-wallpaper-id>');
SELECT id, like_count FROM wallpapers WHERE id = '<same-wallpaper-id>';
```

### Test 5: Test like decrement
```sql
SELECT decrement_wallpaper_likes('<same-wallpaper-id>');
SELECT id, like_count FROM wallpapers WHERE id = '<same-wallpaper-id>';
```

If all tests pass, the migration is successful! ✅

---

## 🌐 Step 3: Test in User App

### Test Views:
1. Open the user app
2. Click any wallpaper to open full view
3. Check browser console for: `[MediaDetail] View tracked successfully`
4. In Supabase Dashboard, check wallpapers table - view_count should increase

### Test Likes:
1. In full view, tap the **Like** button
2. Heart should turn red and fill
3. Check console for: `[App] Like tracked successfully` or `[MasonryFeed] Like tracked successfully`
4. Verify the app DOES NOT swipe to next image (stopPropagation working)
5. In Supabase, like_count should increase

### Test Downloads:
1. Tap **Download** button
2. File should download
3. Check console for: `[MediaDetail] Download tracked successfully`
4. Backend console (Supabase Logs) should show: `[Download] ✅ Incremented wallpaper download: <id>`
5. In Supabase, download_count should increase

### Test Shares:
1. Tap **WhatsApp** button
2. Share dialog should open
3. Check console for: `[MediaDetail] Share tracked successfully`
4. Backend logs should show: `[Share] ✅ Incremented wallpaper share: <id>`
5. In Supabase, share_count should increase

---

## 🔍 Debugging Checklist

### If Views Not Tracking:
- ✅ Check SQL functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE 'increment_%';`
- ✅ Check browser console for errors
- ✅ Check Supabase Function Logs for backend errors
- ✅ Verify wallpaper ID exists: `SELECT id FROM wallpapers WHERE id = '<id>';`

### If Downloads Not Working:
- ✅ Check RPC function exists: `SELECT increment_wallpaper_downloads('<test-id>');`
- ✅ Check backend logs for error messages
- ✅ Verify `storage_path` or `web_path` exists in wallpapers table
- ✅ Check if `allow_download` is not set to false

### If Likes Cause Swipe:
- ✅ Already fixed! Check MediaDetail.tsx lines 323-328 for stopPropagation
- ✅ If still happening, increase swipe threshold in line 90: `const minSwipeDistance = 100;`

### If Share Not Tracking:
- ✅ Check backend logs for: `[Share] ✅ Incremented wallpaper share`
- ✅ Verify RPC function: `SELECT increment_wallpaper_shares('<test-id>');`
- ✅ Check browser console for API call errors

---

## 📈 Backend Improvements Made

### Smart Content-Type Detection:
The backend now automatically detects whether content is a wallpaper, media (video), or photo by querying all three tables in sequence. This means the frontend doesn't need to specify the content type.

**Endpoint Flow:**
```
POST /media/:id/view
  ↓
1. Check wallpapers table → if found, call increment_wallpaper_views()
2. Check media table → if found, call increment_media_views()
3. Check photos table → if found, call increment_photo_views()
4. Return 404 if not in any table
```

### Enhanced Logging:
All tracking endpoints now log:
- ✅ Success: `[View] ✅ Incremented wallpaper view: <id>`
- ⚠️ Warning: `[View] ⚠️ Content not found in any table: <id>`
- ❌ Error: `[View] ❌ Endpoint error: <message>`

Check Supabase Function Logs to see these messages.

---

## 🎯 Next Steps After Counters Work

Once all counters are tracking correctly, you can implement:

### Image Optimization Pipeline:
1. Generate multiple sizes on upload (thumbnail, small, medium, large)
2. Create LQIP (Low Quality Image Placeholder) base64
3. Store all URLs in database columns
4. Use progressive loading in frontend
5. Measure bandwidth savings

### Analytics Dashboard:
1. Create aggregate queries for Admin Panel
2. Show top viewed/liked/downloaded wallpapers
3. Add date range filters
4. Export analytics to CSV

---

## 🆘 Common Errors

### Error: "function increment_wallpaper_views does not exist"
**Solution:** Run the SQL migration from `/FIX_COUNTERS.sql`

### Error: "Content not found"
**Solution:** Verify the ID exists in one of the tables (wallpapers/media/photos)

### Error: "Download not allowed"
**Solution:** Update wallpapers table: `UPDATE wallpapers SET allow_download = true WHERE id = '<id>';`

### Error: Backend timeout
**Solution:** Already handled - ServerWarmup component pings every 5 minutes to keep warm

---

## ✅ Success Criteria

Your implementation is successful when:
1. ✅ All 15 SQL functions created and callable
2. ✅ Views increment automatically when opening full view
3. ✅ Likes increment on tap and don't cause swipe
4. ✅ Downloads increment and file downloads successfully
5. ✅ Shares increment when sharing to WhatsApp
6. ✅ Admin Dashboard shows correct totals
7. ✅ Backend logs show success messages
8. ✅ No console errors in browser

---

## 📞 Support

If you encounter issues:
1. Check browser console (F12)
2. Check Supabase Function Logs (Dashboard → Functions → server → Logs)
3. Run verification queries from Step 2
4. Check network tab for API responses
5. Verify SQL functions exist in database

---

## 🎉 Completion

After running the SQL migration and verifying all tests pass, your counter tracking system will be fully operational. All user interactions (views, likes, downloads, shares) will be accurately tracked across wallpapers, media, and photos.

**Estimated Time:** 10-15 minutes for setup and verification
**Difficulty:** Easy (just run SQL and test)
**Impact:** High (accurate analytics for your app)
