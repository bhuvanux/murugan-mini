# Analytics Testing Checklist

## Prerequisites

Before testing, make sure you've run all the SQL scripts from `/ANALYTICS_INTEGRATION_GUIDE.md`:

- [ ] Created `unified_analytics` table
- [ ] Created `track_analytics_event` function
- [ ] Created `untrack_analytics_event` function
- [ ] Created `get_analytics_stats` function
- [ ] Created wallpaper counter functions (`increment_wallpaper_views`, etc.)
- [ ] Added counter columns to `wallpapers` table (`view_count`, `like_count`, etc.)
- [ ] Added `scheduled_at` column to `wallpapers` table

## End-to-End Testing Flow

### Test 1: Wallpaper View Tracking

#### User Panel:
1. Open the app in browser
2. Navigate to Wallpapers tab
3. Click on any wallpaper to open full view
4. **Expected**: View should be tracked automatically

#### Check Browser Console:
```
[Analytics] Tracking view for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
[Analytics] Track result: { tracked: true, already_tracked: false, unique_count: 1 }
[Analytics] ✅ Incremented wallpaper view counter for abc-123
```

#### Check Admin Panel:
1. Open Admin Panel
2. Go to Wallpaper Manager
3. Find the wallpaper you viewed
4. Click the bar chart (📊) icon
5. **Expected**: 
   - Total Views: 1 (or more)
   - Today's Views: 1
   - Chart shows data point for today

#### Verify in Database:
```sql
-- Check unified analytics table
SELECT * FROM unified_analytics 
WHERE module_name = 'wallpaper' 
  AND event_type = 'view' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check wallpaper counter
SELECT id, title, view_count 
FROM wallpapers 
WHERE id = 'YOUR_WALLPAPER_ID';
```

---

### Test 2: Wallpaper Like Tracking

#### User Panel:
1. Open a wallpaper
2. Click the heart (❤️) button
3. **Expected**: Heart turns red

#### Check Browser Console:
```
[Analytics] Tracking like for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
[Analytics] Track result: { tracked: true, already_tracked: false, unique_count: 1 }
[Analytics] ✅ Incremented wallpaper like counter for abc-123
```

#### Check Admin Panel:
1. Open wallpaper analytics
2. **Expected**: 
   - Total Likes: 1 (or more)
   - Engagement Rate: > 0%

#### Verify in Database:
```sql
-- Check unified analytics
SELECT * FROM unified_analytics 
WHERE module_name = 'wallpaper' 
  AND event_type = 'like' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check wallpaper counter
SELECT id, title, like_count 
FROM wallpapers 
WHERE id = 'YOUR_WALLPAPER_ID';
```

---

### Test 3: Wallpaper Unlike Tracking

#### User Panel:
1. Click the heart button again to unlike
2. **Expected**: Heart turns outline/gray

#### Check Browser Console:
```
[Analytics] Untracking like for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
[Analytics] ✅ Decremented wallpaper like counter for abc-123
```

#### Check Admin Panel:
1. Refresh wallpaper analytics
2. **Expected**: Like count decremented by 1

#### Verify in Database:
```sql
-- Check that event was removed
SELECT COUNT(*) FROM unified_analytics 
WHERE module_name = 'wallpaper' 
  AND event_type = 'like'
  AND item_id = 'YOUR_WALLPAPER_ID'
  AND ip_address = 'YOUR_IP';
-- Should be 0

-- Check wallpaper counter was decremented
SELECT id, title, like_count 
FROM wallpapers 
WHERE id = 'YOUR_WALLPAPER_ID';
-- Should be decreased by 1
```

---

### Test 4: Wallpaper Download Tracking

#### User Panel:
1. Open a wallpaper
2. Click download button (↓)
3. **Expected**: Download starts

#### Check Browser Console:
```
[Analytics] Tracking download for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
[Analytics] ✅ Incremented wallpaper download counter for abc-123
```

#### Check Admin Panel:
1. Open wallpaper analytics
2. **Expected**: 
   - Total Downloads: 1 (or more)
   - Conversion Rate: > 0%

---

### Test 5: Wallpaper Share Tracking

#### User Panel:
1. Open a wallpaper
2. Click share button
3. Share via any method
4. **Expected**: Share tracked

#### Check Browser Console:
```
[Analytics] Tracking share for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
[Analytics] ✅ Incremented wallpaper share counter for abc-123
```

---

### Test 6: IP-Based Deduplication

#### Purpose: 
Ensure the same IP can't inflate view/download counts

#### Steps:
1. View the same wallpaper again from same browser/IP
2. **Expected**: Browser console shows:
```
[Analytics] Track result: { tracked: false, already_tracked: true, unique_count: 1 }
```

3. Check wallpaper counter - should NOT increment again
4. Note: Likes CAN be tracked multiple times (for unlike/relike)

---

### Test 7: Analytics Dashboard View

#### Admin Panel:
1. Go to Wallpaper Manager
2. Click analytics (📊) on any wallpaper
3. **Expected to see**:
   - ✅ Total Views with count
   - ✅ Total Downloads with count  
   - ✅ Total Likes with count
   - ✅ Total Shares with count
   - ✅ Views Today / This Week / This Month
   - ✅ Downloads Today / This Week / This Month
   - ✅ Conversion Rate (downloads/views)
   - ✅ Engagement Rate ((likes+shares)/views)
   - ✅ Line chart showing daily breakdown
   - ✅ Created date
   - ✅ Last interaction timestamp

---

### Test 8: Cross-Module Analytics

Test that other modules also track correctly:

#### Sparkle (News Articles):
```javascript
// In SparkScreen.tsx
analyticsTracker.track('sparkle', articleId, 'like');
analyticsTracker.track('sparkle', articleId, 'share');
analyticsTracker.track('sparkle', articleId, 'read');
```

#### Songs (Media):
```javascript
analyticsTracker.track('song', songId, 'play');
analyticsTracker.track('song', songId, 'like');
```

---

## Troubleshooting Common Issues

### Issue: Analytics showing all zeros

**Solution:**
1. Check if `unified_analytics` table exists
2. Check if tracking RPC functions exist
3. Check browser console for errors
4. Verify API endpoints are accessible

### Issue: "function track_analytics_event does not exist"

**Solution:**
Run the database functions SQL from `/ANALYTICS_INTEGRATION_GUIDE.md`

### Issue: "Could not find the 'scheduled_at' column"

**Solution:**
```sql
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
```

### Issue: Views increment but Admin Panel shows 0

**Solution:**
1. Check if wallpaper counter functions exist:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE 'increment_wallpaper%';
```

2. Manually verify counter:
```sql
SELECT id, title, view_count, like_count FROM wallpapers LIMIT 10;
```

3. Check if analytics drawer is reading from correct table - should see console log:
```
[Wallpaper Analytics] ✅ Found X events from unified analytics
```

---

## Success Criteria

✅ **All tests pass**
✅ **No errors in browser console**
✅ **Counters increment correctly in database**
✅ **Admin Panel shows accurate analytics**
✅ **IP deduplication works for views/downloads**
✅ **Like/unlike works correctly**
✅ **Charts display data**
✅ **All modules (wallpaper, sparkle, song) track independently**

---

## Final Verification Query

Run this in your Supabase SQL editor to see all recent analytics:

```sql
SELECT 
  module_name,
  item_id,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  MAX(created_at) as last_event
FROM unified_analytics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY module_name, item_id, event_type
ORDER BY last_event DESC;
```

This should show all tracked events from the last 24 hours across all modules.
