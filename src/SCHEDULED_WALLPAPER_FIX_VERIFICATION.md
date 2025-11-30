# ✅ Scheduled Wallpaper Fix - Verification Guide

## 🔍 Problem Identified
The diagnostic tool revealed that **7 wallpapers had `publish_status = "scheduled"` but NO `scheduled_at` date in the database**.

### Root Cause
1. ❌ Frontend (`utils/adminAPI.ts`): Not sending `scheduled_at` field to backend
2. ❌ Backend (`api-routes.tsx`): Not saving `scheduled_at` to database (only stored in KV store)

## ✅ Fixes Applied

### 1. Frontend Fix (`/utils/adminAPI.ts`)
- ✅ Added `folder_id` and `scheduled_at` to `WallpaperUploadData` interface
- ✅ Modified `uploadWallpaper()` to append these fields to FormData:
  ```typescript
  if (data.folder_id) formData.append("folder_id", data.folder_id);
  if (data.scheduled_at) formData.append("scheduled_at", data.scheduled_at);
  ```

### 2. Backend Upload Fix (`/supabase/functions/server/api-routes.tsx`)
- ✅ Modified wallpaper insert to save `scheduled_at` to database:
  ```typescript
  scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
  ```
- ✅ Removed KV store logic (no longer needed)
- ✅ Added logging to confirm scheduled_at is saved

### 3. Backend Update Fix (`/supabase/functions/server/api-routes.tsx`)
- ✅ Changed `updateWallpaper()` to save `scheduled_at` directly to database
- ✅ Removed KV store extraction logic
- ✅ Simplified the update flow

### 4. Backend Get Fix (`/supabase/functions/server/api-routes.tsx`)
- ✅ Changed `getWallpapers()` to read `scheduled_at` from database
- ✅ Removed KV store merge logic
- ✅ Simplified the query

## 🧪 Testing Instructions

### Test 1: Upload New Scheduled Wallpaper
1. Go to **Admin Panel → Wallpaper Manager**
2. Click **Upload Wallpaper**
3. Select an image
4. Fill in:
   - Title: "Test Scheduled Upload"
   - Publish Status: **Scheduled**
   - Schedule Date: Tomorrow at 3:00 PM
5. Click **Upload & Schedule**

**Expected Result:**
- ✅ Upload succeeds
- ✅ Wallpaper appears in **Scheduled** tab
- ✅ Shows countdown timer badge
- ✅ Diagnostic tool shows it under "Valid Scheduled" (not "Broken Scheduled")

### Test 2: Verify in Diagnostic Tool
1. Go to **Admin Panel → Wallpaper Manager**
2. Scroll to bottom and open **Scheduled Wallpapers Debugger**
3. Check the stats:

**Expected Result:**
```
✅ Marked as Scheduled: 8 (7 old + 1 new)
✅ Valid Scheduled: 1 (the one you just uploaded)
⚠️ Broken Scheduled: 7 (the old ones without dates)
```

### Test 3: Fix Existing Broken Wallpapers
In the Debugger, you have two options:

**Option A: Schedule All for Tomorrow**
- Click **Schedule All for Tomorrow** button
- All 7 broken wallpapers will be scheduled for tomorrow at current time

**Option B: Convert All to Drafts**
- Click **Convert All to Drafts** button  
- All 7 broken wallpapers will be changed to draft status

Choose Option A or B, then verify:
- ✅ "Broken Scheduled" count goes to 0
- ✅ "Valid Scheduled" count increases
- ✅ All wallpapers appear in correct tabs

### Test 4: Edit Scheduled Wallpaper
1. Find a scheduled wallpaper
2. Click the **reschedule icon** (calendar with clock)
3. Change the date/time
4. Save

**Expected Result:**
- ✅ Update succeeds
- ✅ Timer badge shows new countdown
- ✅ Stays in Scheduled tab

### Test 5: Publish a Scheduled Wallpaper
1. Find a scheduled wallpaper
2. Click **Publish Now** from the action dropdown
3. Confirm

**Expected Result:**
- ✅ Wallpaper moves to Published tab
- ✅ `publish_status` changes to "published"
- ✅ `scheduled_at` is cleared or kept for history (check backend logs)

## 🔧 Database Verification (Advanced)

If you have direct database access, you can verify with SQL:

```sql
-- Check scheduled wallpapers
SELECT 
  id, 
  title, 
  publish_status, 
  scheduled_at,
  CASE 
    WHEN publish_status = 'scheduled' AND scheduled_at IS NOT NULL 
    THEN 'Valid' 
    ELSE 'Broken' 
  END as status
FROM wallpapers 
WHERE publish_status = 'scheduled'
ORDER BY scheduled_at;
```

**Expected:**
- All scheduled wallpapers should have a non-null `scheduled_at` timestamp
- No wallpapers with `publish_status = 'scheduled'` and `scheduled_at = NULL`

## 📊 Success Criteria

✅ **Fix is successful if:**
1. New scheduled wallpapers appear in Scheduled tab
2. Countdown timers display correctly
3. Diagnostic tool shows 0 "Broken Scheduled" (after fixing old ones)
4. Database has `scheduled_at` values for all scheduled wallpapers
5. Edit/reschedule works properly

## 🚨 If Issues Persist

### Check Browser Console Logs
Look for:
```
[uploadWallpaper] ✅ Wallpaper created with scheduled_at: {...}
[updateWallpaper] ✅ Wallpaper updated: {...}
```

### Check Network Tab
1. Open DevTools → Network
2. Upload a scheduled wallpaper
3. Find the POST request to `/api/upload/wallpaper`
4. Check **Request Payload** → should include `scheduled_at`
5. Check **Response** → `data.scheduled_at` should not be null

### Common Issues
- **Still seeing KV errors**: Clear browser cache and hard reload
- **Scheduled tab empty**: Check date filter - make sure it includes future dates
- **No timer badge**: Verify `scheduled_at` is a valid future date

## 📝 Notes

- The old KV store logic has been removed since `scheduled_at` is now in the database
- Existing broken wallpapers need manual fixing using the Debugger tool
- The fix is forward-compatible - all new uploads will work correctly
- Backend now returns `scheduled_at` directly from database, no extra processing needed
