# Test Scenarios for Scheduled Wallpapers

## 🎯 Objective
Verify that the Scheduled Wallpapers system is working correctly and wallpapers appear in the correct tabs.

## ✅ Prerequisites
1. Admin Panel is accessible
2. Database tables are set up
3. You can upload wallpapers

---

## Test 1: Upload a Properly Scheduled Wallpaper

### Steps:
1. Go to **Admin Panel → Wallpaper Management**
2. Click **"Upload Wallpaper"**
3. Select a test image file
4. Fill in:
   - Title: "Test Scheduled Wallpaper"
   - Description: "Testing scheduled feature"
   - Publish Status: **"Scheduled"** ⬅️ IMPORTANT
5. **Calendar picker will appear**
6. Click on tomorrow's date
7. Set time to 12:00 PM (noon)
8. Click **"Upload"**

### Expected Result:
✅ Success message appears
✅ Console shows: `[uploadWallpaper] ✅ Stored schedule data as OBJECT for <id>`
✅ Console shows: `[uploadWallpaper] Verified schedule data: { wallpaper_id: "...", scheduled_at: "...", created_at: "..." }`

### Verification:
1. Go to **"Scheduled" tab**
2. **You should see**: The wallpaper appears here
3. **You should see**: Countdown timer badge showing time until tomorrow noon
4. **Blue info banner** should say "Showing 1 scheduled wallpaper"

---

## Test 2: Check Scheduled Wallpaper Doesn't Show in Other Tabs

### Steps:
1. With the wallpaper from Test 1 still scheduled
2. Go to **"Published" tab**
3. Go to **"Drafts" tab**

### Expected Result:
❌ Wallpaper should NOT appear in Published tab
❌ Wallpaper should NOT appear in Drafts tab
✅ Wallpaper should ONLY appear in Scheduled tab

---

## Test 3: Reschedule a Wallpaper

### Steps:
1. Go to **"Scheduled" tab**
2. Find your test wallpaper
3. Click the **three-dot menu (⋮)** on the wallpaper card
4. Select **"Reschedule"**
5. Pick a new date (e.g., 2 days from now)
6. Set time to 3:00 PM
7. Click **"Reschedule"**

### Expected Result:
✅ Success message: "Wallpaper rescheduled successfully"
✅ Countdown timer updates to show new time
✅ Wallpaper still in Scheduled tab
✅ Console shows: `[updateWallpaper] Setting schedule for wallpaper <id>`

---

## Test 4: Cancel Schedule

### Steps:
1. Go to **"Scheduled" tab**
2. Find your test wallpaper
3. Click the **three-dot menu (⋮)**
4. Select **"Cancel Schedule"**
5. Confirm the action

### Expected Result:
✅ Success message: "Schedule cancelled - wallpaper moved to drafts"
✅ Wallpaper disappears from Scheduled tab
✅ Go to Drafts tab → wallpaper appears there
✅ No countdown timer visible
✅ Console shows schedule was removed from KV store

---

## Test 5: Upload as Draft, Then Schedule Later

### Steps:
1. Click **"Upload Wallpaper"**
2. Select a test image
3. Title: "Test Draft to Scheduled"
4. Publish Status: **"Draft"** ⬅️ Upload as draft
5. Click **"Upload"**
6. Go to **"Drafts" tab**
7. Find the wallpaper
8. Click **three-dot menu (⋮)**
9. Select **"Schedule"**
10. Pick tomorrow at 2:00 PM
11. Click **"Schedule"**

### Expected Result:
✅ Wallpaper moves from Drafts to Scheduled tab
✅ Countdown timer appears
✅ publish_status changed to "scheduled"
✅ scheduled_at date saved to KV store

---

## Test 6: Run the Debugger Tool

### Steps:
1. Go to **Admin Panel → Wallpaper Management**
2. Click **Settings icon (⚙️)** in top right
3. Find **"Scheduled Wallpapers Debugger"** (blue panel)
4. Click **"Run Diagnostic"**

### Expected Result:
✅ Summary shows:
   - Total Wallpapers: (your count)
   - Marked as Scheduled: (count of scheduled wallpapers)
   - Valid Scheduled: (should match Scheduled tab count)
   - Broken Scheduled: 0 ⬅️ Should be ZERO

✅ Green section shows "Valid Scheduled Wallpapers"
✅ Each wallpaper shows:
   - ✅ Status: scheduled
   - 🕐 Scheduled: (correct date/time)
❌ Orange section "Broken Scheduled Wallpapers" should be empty or not shown

---

## Test 7: Detect Broken Scheduled Wallpaper (Manual)

**NOTE**: This test is to verify the system detects broken data correctly. You need database access.

### Steps:
1. Go to Supabase SQL Editor
2. Run this query to create a broken scheduled wallpaper:
```sql
UPDATE wallpapers
SET publish_status = 'scheduled'
WHERE id = '<some-draft-wallpaper-id>'
-- This sets status to scheduled but doesn't add KV data
```
3. Go back to Admin Panel
4. Refresh the page
5. Go to **"Drafts" tab**

### Expected Result:
✅ **Orange warning banner** appears in Drafts tab
✅ Banner says "⚠️ 1 Wallpaper Marked as Scheduled but Missing Schedule Date"
✅ Wallpaper shows in Drafts (not in Scheduled)
✅ Two action buttons appear:
   - "Schedule All for Tomorrow"
   - "Convert All to Drafts"

### Cleanup:
Click **"Convert All to Drafts"** to fix the broken state

---

## Test 8: Bulk Schedule Multiple Wallpapers

### Steps:
1. Upload 3 wallpapers as **Drafts**
2. Go to **"Drafts" tab**
3. Click **"Select All"**
4. The 3 wallpapers should be selected (green border)
5. Manually use the three-dot menu on each to schedule them

### Expected Result:
✅ All 3 wallpapers move to Scheduled tab
✅ Each shows countdown timer
✅ Scheduled tab count shows 3

---

## Test 9: Auto-Publish Check (Optional - requires waiting)

**NOTE**: This test requires waiting until the scheduled time passes.

### Steps:
1. Upload a wallpaper scheduled for 5 minutes from now
2. Wait until the scheduled time passes
3. The backend publisher should auto-publish it

### Expected Result (after scheduled time):
✅ Wallpaper moves from Scheduled to Published tab
✅ publish_status = "published"
✅ published_at timestamp is set
✅ scheduled_at is cleared
✅ Wallpaper appears in user app

---

## Test 10: Multiple Scheduled Wallpapers Display

### Steps:
1. Upload 5 different wallpapers, all scheduled for different future dates:
   - Wallpaper 1: Tomorrow 10 AM
   - Wallpaper 2: Tomorrow 2 PM
   - Wallpaper 3: Day after tomorrow 9 AM
   - Wallpaper 4: 3 days from now 12 PM
   - Wallpaper 5: 1 week from now 6 PM

2. Go to **"Scheduled" tab**

### Expected Result:
✅ All 5 wallpapers appear in Scheduled tab
✅ Each has its own countdown timer showing correct time
✅ Blue info banner says "Showing 5 scheduled wallpapers"
✅ They appear in creation order (or custom sort if implemented)

---

## 🐛 Common Issues & Fixes

### Issue: Wallpaper not appearing in Scheduled tab
**Check:**
1. Run the Debugger tool
2. Look at browser console for errors
3. Check if wallpaper appears in Drafts (broken state)
4. Verify publish_status = "scheduled" in database
5. Verify scheduled_at exists in KV store

### Issue: Countdown timer not showing
**Check:**
1. Wallpaper has scheduled_at field
2. scheduled_at is a valid ISO date string
3. Date is in the future
4. Browser console for countdown component errors

### Issue: Date picker doesn't appear during upload
**Check:**
1. You selected "Scheduled" status (not Draft or Published)
2. Modal fully loaded before selecting status
3. Browser console for errors

---

## 📊 Success Criteria

All tests should pass with these results:
- ✅ Scheduled wallpapers appear in Scheduled tab
- ✅ Countdown timers display correctly
- ✅ Debugger shows 0 broken scheduled wallpapers
- ✅ Reschedule and cancel operations work
- ✅ Tab counts are accurate
- ✅ No console errors

---

## 📝 Report Template

If issues persist, provide:

1. **Screenshots** of:
   - Scheduled tab (showing empty or wrong wallpapers)
   - Debugger results
   - Upload modal with date picker

2. **Console Logs** (filtered by):
   ```
   [uploadWallpaper]
   [getWallpapers]
   [updateWallpaper]
   [AdminWallpaperManager]
   ```

3. **Database Query Results**:
```sql
-- Check wallpapers table
SELECT id, title, publish_status, created_at
FROM wallpapers
WHERE publish_status = 'scheduled';

-- Check KV store
SELECT key, value
FROM kv_store_4a075ebc
WHERE key LIKE 'wallpaper:schedule:%';
```

---

## 🎓 Understanding the System

### How a wallpaper becomes "Scheduled":
1. Upload with publish_status = "scheduled" ✅
2. Set a future date/time ✅
3. scheduled_at saved to KV store ✅
4. Result: Shows in Scheduled tab with countdown ✅

### How a wallpaper becomes "Broken Scheduled":
1. Has publish_status = "scheduled" ✅
2. BUT scheduled_at is missing/null ❌
3. Result: Shows in Drafts tab with warning ⚠️

### How auto-publish works:
1. Backend runs scheduled-publisher.tsx periodically
2. Checks wallpapers where scheduled_at <= NOW
3. Updates publish_status to "published"
4. Sets published_at timestamp
5. Clears scheduled_at from KV store
6. Wallpaper moves to Published tab
