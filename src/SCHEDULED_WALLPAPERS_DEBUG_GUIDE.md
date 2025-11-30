# Scheduled Wallpapers Debug Guide

## Issue
You mentioned: "uploaded and scheduled many times but so such scheduled wallpapers i never seen under scheduled tabs"

## Solution: Use the Scheduled Wallpapers Debugger

I've created a comprehensive diagnostic tool to help you identify **exactly** why your scheduled wallpapers aren't appearing in the Scheduled tab.

## How to Access the Debugger

### Method 1: Via System Diagnostics (Recommended)
1. Go to **Admin Panel** → **Wallpaper Management**
2. Click the **Settings icon** (⚙️) in the top right corner
3. The System Diagnostics panel will expand
4. Scroll down to find the **"Scheduled Wallpapers Debugger"** (blue panel)
5. Click **"Run Diagnostic"** button

### Method 2: Via Scheduled Tab (Quick Access)
1. Go to **Admin Panel** → **Wallpaper Management**
2. Click on the **"Scheduled"** tab
3. If no wallpapers are showing, the debugger will appear automatically at the top
4. Click **"Run Diagnostic"** button

## What the Debugger Checks

The debugger analyzes ALL wallpapers in your database and provides:

### 📊 Summary Statistics
- **Total Wallpapers**: Total count of all wallpapers
- **Marked as Scheduled**: Wallpapers with `publish_status = "scheduled"`
- **Valid Scheduled**: Wallpapers that SHOULD appear in Scheduled tab
- **Broken Scheduled**: Wallpapers marked as scheduled but missing the schedule date
- **With Schedule Data**: Wallpapers that have `scheduled_at` field populated

### ✅ Valid Scheduled Wallpapers
Shows wallpapers that:
- Have `publish_status = "scheduled"` ✅
- Have `scheduled_at` date set ✅
- Have a valid date format ✅
- **WILL appear in the Scheduled tab**

### ⚠️ Broken Scheduled Wallpapers
Shows wallpapers that:
- Have `publish_status = "scheduled"` ✅
- BUT are missing `scheduled_at` date ❌
- **Will NOT appear in Scheduled tab** (they show in Drafts instead)

## Common Issues & Solutions

### Issue 1: Wallpapers Marked as Scheduled but No Date
**Symptom**: Debugger shows "Broken Scheduled" wallpapers
**Cause**: The wallpaper has `publish_status = "scheduled"` but no `scheduled_at` date
**Solution**: 
1. These wallpapers appear in the **Drafts tab** (not Scheduled tab)
2. Look for the orange warning banner in Drafts tab
3. Click **"Schedule All for Tomorrow"** to fix them all at once
4. Or click **"Convert All to Drafts"** to make them proper drafts

### Issue 2: Schedule Date Not Saved During Upload
**Symptom**: You select a schedule date during upload, but it's not saved
**Possible Causes**:
1. **Date picker not set**: Make sure to click a date in the calendar
2. **Time not set**: Make sure to set the time (default is 00:00)
3. **Past date selected**: You can only schedule for future dates
**Solution**: 
- Re-upload or edit the wallpaper
- Ensure both date AND time are set
- Verify the date is in the future

### Issue 3: No Scheduled Wallpapers at All
**Symptom**: Debugger shows 0 wallpapers with scheduled status
**Cause**: You may have uploaded wallpapers with "Draft" or "Published" status, not "Scheduled"
**Solution**:
1. When uploading, select **"Scheduled"** from the Publish Status dropdown
2. A date/time picker will appear
3. Select a future date and time
4. Complete the upload

## How Scheduled Wallpapers Work (Technical)

### Data Storage
Scheduled wallpapers use a **dual-storage system**:

1. **Database (`wallpapers` table)**:
   - Stores: `publish_status = "scheduled"`
   - Does NOT store the schedule date

2. **KV Store (`kv_store_4a075ebc` table)**:
   - Stores: `scheduled_at` timestamp
   - Key format: `wallpaper:schedule:<wallpaper_id>`
   - Value: `{ wallpaper_id, scheduled_at, created_at }`

### Display Logic
A wallpaper appears in the **Scheduled tab** if and only if:
```javascript
publish_status === "scheduled" 
AND 
scheduled_at !== null 
AND 
isValidDate(scheduled_at)
```

If `publish_status === "scheduled"` BUT `scheduled_at === null`:
- Wallpaper shows in **Drafts tab** (considered broken)
- Orange warning banner appears in Drafts tab
- You can fix it using the bulk actions

## API Debugging

If the debugger shows issues, check the browser console for detailed logs:

### During Upload
Look for:
```
[uploadWallpaper] ✅ Stored schedule data as OBJECT for <id>
[uploadWallpaper] Verified schedule data: {...}
```

### During Fetch
Look for:
```
[getWallpapers] ✅ Scheduled wallpaper <id> has schedule data: {...}
[getWallpapers] ⚠️ Wallpaper <id> is scheduled but has no schedule data in KV store!
```

### During Update/Reschedule
Look for:
```
[updateWallpaper] Setting schedule for wallpaper <id>: {...}
[updateWallpaper] Verified schedule data for <id>: {...}
```

## Manual Database Check

If you want to check the database directly, run these queries in Supabase SQL Editor:

### Check wallpapers table
```sql
SELECT id, title, publish_status, created_at
FROM wallpapers
WHERE publish_status = 'scheduled'
ORDER BY created_at DESC;
```

### Check KV store for schedule data
```sql
SELECT key, value
FROM kv_store_4a075ebc
WHERE key LIKE 'wallpaper:schedule:%'
ORDER BY created_at DESC;
```

### Find orphaned scheduled wallpapers
```sql
-- Wallpapers marked as scheduled but no KV data
SELECT w.id, w.title, w.publish_status
FROM wallpapers w
WHERE w.publish_status = 'scheduled'
AND NOT EXISTS (
  SELECT 1 FROM kv_store_4a075ebc kv
  WHERE kv.key = 'wallpaper:schedule:' || w.id
);
```

## Quick Fixes

### Fix Single Wallpaper
1. Go to the wallpaper in Drafts or Published tab
2. Click the **Schedule Action dropdown** (⋮)
3. Select **"Reschedule"**
4. Pick a new date and time
5. Click **"Reschedule"**

### Fix Multiple Wallpapers
1. Go to **Drafts tab**
2. Look for the orange "Broken Scheduled" warning banner
3. Click **"Schedule All for Tomorrow"** to schedule all for tomorrow at noon
4. OR click **"Convert All to Drafts"** to clear the scheduled status

### Re-upload with Correct Settings
1. Click **"Upload Wallpaper"**
2. Select file(s)
3. Choose **"Scheduled"** from Publish Status dropdown
4. **IMPORTANT**: Click the calendar and select a future date
5. **IMPORTANT**: Set the time (hour and minute)
6. Click **"Upload"**
7. Check the browser console for success messages

## Contact/Support

If the debugger reveals issues that you can't fix:

1. **Take a screenshot** of the debugger results
2. **Copy the browser console logs** (open DevTools → Console tab)
3. **Note the wallpaper IDs** that are having issues
4. Share this information with your developer

## Changelog

- **2024-11-29**: Created comprehensive debugger tool
- **2024-11-29**: Integrated debugger into Admin Panel
- **2024-11-29**: Added automatic display when Scheduled tab is empty
- **2024-11-29**: Added detailed issue detection and reporting
