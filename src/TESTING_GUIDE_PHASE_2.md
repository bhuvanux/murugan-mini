# 🧪 PHASE 2 TESTING GUIDE - STEP BY STEP

## 📋 **PRE-REQUISITES CHECKLIST**

Before testing, ensure you have:
- [ ] Supabase project credentials (projectId, publicAnonKey)
- [ ] Access to Supabase Dashboard
- [ ] Admin Panel access
- [ ] User Panel access
- [ ] Browser DevTools knowledge (for console logs)

---

## 🚀 **STEP 1: RUN DATABASE MIGRATION**

### **1.1 Access Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your Murugan project (user panel backend)
3. Navigate to **SQL Editor** (left sidebar)

### **1.2 Execute Migration**
1. Open the file: `/supabase/migrations/003_unified_analytics_system.sql`
2. Copy the **entire content** (all ~450 lines)
3. Paste into Supabase SQL Editor
4. Click **"Run"** button
5. Wait for completion (should take 5-10 seconds)

### **1.3 Verify Migration Success**
You should see messages like:
```
✓ CREATE TABLE analytics_tracking
✓ CREATE TABLE analytics_config
✓ CREATE INDEX idx_analytics_module_item
✓ CREATE FUNCTION track_analytics_event()
✓ INSERT INTO analytics_config
```

If you see errors:
- Check if tables already exist (drop them first if needed)
- Ensure you're using the correct Supabase project
- Check for syntax errors in copy/paste

---

## 🔍 **STEP 2: VERIFY DATABASE SETUP**

### **2.1 Check Tables Created**
In Supabase SQL Editor, run:

```sql
-- Check analytics_tracking table
SELECT * FROM analytics_tracking LIMIT 5;

-- Check analytics_config table
SELECT * FROM analytics_config ORDER BY module_name, sort_order;
```

**Expected Results:**
- `analytics_tracking`: Empty table (0 rows) - this is correct
- `analytics_config`: ~20 rows with default configurations

### **2.2 Check Functions Created**
Run:
```sql
-- Test dashboard function
SELECT get_analytics_dashboard();

-- Test track function (dry run)
SELECT track_analytics_event(
  'wallpaper',
  gen_random_uuid(),
  'view',
  '192.168.1.1',
  'Test User Agent',
  'mobile',
  '{}'::jsonb
);
```

**Expected Results:**
- Dashboard function returns JSON with stats
- Track function returns JSON with `success: true`

### **2.3 Check RLS Policies**
Run:
```sql
-- View policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('analytics_tracking', 'analytics_config');
```

**Expected Results:**
- 3-5 policies for each table
- Policies for INSERT, SELECT, DELETE

---

## 🖥️ **STEP 3: USE AUTOMATED TESTING DASHBOARD**

### **3.1 Access Testing Dashboard**
1. Open Admin Panel
2. Look in sidebar for **"Analytics Testing"** menu item
3. Click it to open the Testing Dashboard

### **3.2 Run Automated Tests**
1. Click **"Run All Tests"** button (top right)
2. Watch as 12 tests run automatically:
   - ✅ Database Tables
   - ✅ Database Functions
   - ✅ Config Seeding
   - ✅ Track Endpoint
   - ✅ Untrack Endpoint
   - ✅ Stats Endpoint
   - ✅ Check Endpoint
   - ✅ IP-Based Uniqueness
   - ✅ Like/Unlike Toggle
   - ✅ Admin Dashboard
   - ✅ Admin Config
   - ✅ Reset Function

### **3.3 Review Results**
- **Green = Passed** ✅
- **Red = Failed** ❌
- **Blue = Running** 🔄
- **Gray = Pending** ⏸️

**Target:** All 12 tests should pass

### **3.4 If Tests Fail**
1. Click **"Show details"** under failed test
2. Review error message
3. Check console logs (F12 → Console)
4. Check Supabase Edge Function logs:
   - Supabase Dashboard → Edge Functions → Logs
5. Fix issues and re-run

---

## 📱 **STEP 4: TEST USER PANEL TRACKING**

### **4.1 Open User Panel**
1. Open your Murugan app (user panel)
2. Open Browser DevTools (F12)
3. Go to Console tab

### **4.2 Test Wallpaper View Tracking**
1. Navigate to **Wallpapers tab**
2. Tap/click any wallpaper to open fullscreen
3. Check console for:
   ```
   [Analytics] Tracking view for wallpaper:abc-123 from IP xxx.xxx.xxx.xxx
   [Analytics] Track result: { tracked: true, unique_count: 1 }
   ```

4. Swipe to next wallpaper
5. Should see similar logs for new wallpaper

### **4.3 Test Like/Unlike Tracking**
1. In fullscreen wallpaper view
2. Tap **Heart/Like button**
3. Check console for:
   ```
   [Analytics] Tracking like for wallpaper:abc-123
   ```
4. Toast notification: "Added to favorites"

5. Tap **Heart button again** (unlike)
6. Check console for:
   ```
   [Analytics] Untracking like for wallpaper:abc-123
   ```
7. Toast notification: "Removed from favorites"

### **4.4 Test Share Tracking**
1. In fullscreen view
2. Tap **WhatsApp/Share button**
3. Check console for:
   ```
   [Analytics] Tracking share for wallpaper:abc-123
   ```
4. WhatsApp should open

### **4.5 Test Download Tracking**
1. Tap **Download button**
2. Check console for:
   ```
   [Analytics] Tracking download for wallpaper:abc-123
   ```
3. Download should start
4. Toast notification: "Downloading..."

---

## 🔄 **STEP 5: TEST IP-BASED UNIQUENESS**

### **5.1 Test Same Event Twice**
1. View a wallpaper → Check count
2. Close and re-open **same wallpaper**
3. Check console:
   ```
   [Analytics] Track result: { 
     tracked: false, 
     already_tracked: true,
     unique_count: 1  // Should stay 1
   }
   ```

### **5.2 Test Different Events**
1. View wallpaper (count = 1)
2. Like wallpaper (separate counter)
3. Download wallpaper (separate counter)
4. Each event should have its own counter

### **5.3 Test Unlike Behavior**
1. Like wallpaper → Count = 1
2. Unlike wallpaper → Count = 0
3. Like again → Count = 1
4. Counts should increment/decrement correctly

---

## 🎛️ **STEP 6: TEST ADMIN ANALYTICS CENTER**

### **6.1 Open Analytics Center**
1. Admin Panel → Click **"Analytics Center"**
2. Should see:
   - Overview cards (Total Events, Unique IPs, Modules)
   - Module sections (Wallpaper, Song, Sparkle, etc.)

### **6.2 Test Module Expansion**
1. Click any module header
2. Should expand to show events
3. Click again → Should collapse

### **6.3 Test Event Toggle**
1. Expand Wallpaper module
2. Find "View" event
3. Toggle switch OFF
4. Try viewing wallpaper in user panel
5. Should fail silently (tracking disabled)
6. Toggle back ON
7. Try again → Should work

### **6.4 Test Stats Display**
1. After testing user panel (Step 4)
2. Refresh Analytics Center
3. Should see counts updated:
   - Wallpaper Views: X
   - Wallpaper Likes: Y
   - Wallpaper Downloads: Z

### **6.5 Test Reset Function**
1. Click **"Reset"** button for any event
2. Confirm in dialog
3. Count should reset to 0
4. Toast notification: "Reset successful"

### **6.6 Test Add Event**
1. Click **"Add Event Type"** button
2. Fill form:
   - Module Name: `wallpaper`
   - Event Type: `custom_test`
   - Display Name: `Custom Test Event`
   - Description: `Testing custom events`
3. Submit
4. Should appear in Wallpaper module list

### **6.7 Test Refresh Cache**
1. Click **"Refresh Cache"** button (top right)
2. Should reload all stats
3. Toast notification: "Cache refreshed"

---

## 🔍 **STEP 7: VERIFY API ENDPOINTS**

### **7.1 Test Track Endpoint (cURL)**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/track \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "module_name": "wallpaper",
    "item_id": "test-123",
    "event_type": "view"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tracked": true,
  "already_tracked": false,
  "unique_count": 1
}
```

### **7.2 Test Stats Endpoint**
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/stats/wallpaper/test-123 \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "module": "wallpaper",
  "item_id": "test-123",
  "stats": {
    "view": 1,
    "like": 0,
    "download": 0
  }
}
```

### **7.3 Test Admin Dashboard**
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/admin/dashboard \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "dashboard": {
    "total_events": 10,
    "unique_ips": 3,
    "modules": {
      "wallpaper": {
        "total_events": 10,
        "unique_items": 5,
        "unique_ips": 3,
        "events_by_type": {
          "view": 5,
          "like": 3,
          "download": 2
        }
      }
    }
  }
}
```

---

## 📊 **STEP 8: VERIFY DATA IN DATABASE**

### **8.1 Check Tracking Records**
```sql
SELECT 
  module_name,
  event_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT item_id) as unique_items
FROM analytics_tracking
GROUP BY module_name, event_type
ORDER BY module_name, event_type;
```

**Expected:** Shows breakdown by module and event type

### **8.2 Check Specific Item**
```sql
SELECT *
FROM analytics_tracking
WHERE module_name = 'wallpaper'
  AND item_id = 'your-test-id'
ORDER BY created_at DESC;
```

**Expected:** Shows all events for that item

### **8.3 Check IP Uniqueness**
```sql
-- Try to insert duplicate (should fail)
INSERT INTO analytics_tracking (module_name, item_id, event_type, ip_address)
VALUES ('wallpaper', 'test-123', 'view', '192.168.1.1');

-- Should return: duplicate key value violates unique constraint
```

---

## ✅ **STEP 9: FINAL CHECKLIST**

### **Database:**
- [ ] Migration executed successfully
- [ ] Tables created (analytics_tracking, analytics_config)
- [ ] Functions created (all 8 functions)
- [ ] Default config seeded (~20 rows)
- [ ] RLS policies working

### **Backend API:**
- [ ] Track endpoint works
- [ ] Untrack endpoint works
- [ ] Stats endpoint works
- [ ] Check endpoint works
- [ ] Admin dashboard works
- [ ] Config CRUD works
- [ ] Reset works

### **User Panel:**
- [ ] View tracking works
- [ ] Like/unlike works
- [ ] Share tracking works
- [ ] Download tracking works
- [ ] IP uniqueness enforced
- [ ] Counts accurate

### **Admin Panel:**
- [ ] Analytics Center loads
- [ ] Modules display correctly
- [ ] Events display correctly
- [ ] Toggles work
- [ ] Reset works
- [ ] Add event works
- [ ] Stats refresh works

### **Testing Dashboard:**
- [ ] All 12 tests pass
- [ ] No errors in console
- [ ] No errors in Supabase logs

---

## 🐛 **TROUBLESHOOTING**

### **Problem: Migration Fails**
**Solution:**
```sql
-- Drop existing tables if needed
DROP TABLE IF EXISTS analytics_tracking CASCADE;
DROP TABLE IF EXISTS analytics_config CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics_stats_aggregated CASCADE;

-- Then re-run migration
```

### **Problem: Functions Not Found**
**Check:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%analytics%';
```

### **Problem: RLS Blocking Requests**
**Temporary Fix:**
```sql
-- Disable RLS temporarily for testing
ALTER TABLE analytics_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_config DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE analytics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_config ENABLE ROW LEVEL SECURITY;
```

### **Problem: API Returns 404**
**Check:**
1. Edge function deployed
2. Correct projectId in code
3. Correct API route prefix
4. CORS configured

### **Problem: Counts Not Updating**
**Check:**
```sql
-- Refresh materialized view
SELECT refresh_analytics_stats();

-- Or refresh manually in Admin
```

### **Problem: IP Shows as "unknown"**
**Check:**
- Request headers (cf-connecting-ip, x-forwarded-for)
- Edge function deployment
- Supabase edge function logs

---

## 📞 **NEXT STEPS AFTER TESTING**

### **If All Tests Pass ✅**
1. Mark Phase 2 as verified
2. Proceed to update other components:
   - SparkScreen
   - SongsScreen
   - BannerCarousel
   - AskGuganChatScreen
3. Clean up old analytics code
4. Deploy to production

### **If Tests Fail ❌**
1. Document failing tests
2. Share error logs
3. Review migration
4. Re-run specific tests
5. Fix issues before proceeding

---

## 🎉 **SUCCESS CRITERIA**

You've successfully completed Phase 2 testing if:

✅ All 12 automated tests pass  
✅ Wallpaper tracking works in user panel  
✅ IP-based uniqueness enforced  
✅ Like/unlike toggle works correctly  
✅ Admin Analytics Center displays data  
✅ Event toggles work  
✅ Reset function works  
✅ No errors in console  
✅ No errors in Supabase logs  
✅ Database queries return expected data  

---

**READY TO TEST? START WITH STEP 1!** 🚀

