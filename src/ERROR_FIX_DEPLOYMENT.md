# 🔧 ERROR FIX - Wallpaper Likes Functions Missing

## 🐛 Problem

The backend is trying to call RPC functions that don't exist in the database:
- `like_wallpaper(p_wallpaper_id, p_user_id)` - ❌ Not found
- `unlike_wallpaper(p_wallpaper_id, p_user_id)` - ❌ Not found  
- `check_wallpaper_like(p_wallpaper_id, p_user_id)` - ❌ Not found

**Error Message:**
```
Could not find the function public.like_wallpaper(p_user_id, p_wallpaper_id) in the schema cache
```

## ✅ Solution (2 Minutes)

### Step 1: Run SQL Migration

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your **USER PANEL** project (not admin)

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Paste**
   - Open `/FIX_WALLPAPER_LIKES_SIMPLE.sql`
   - Copy **ALL** contents (from top to bottom)
   - Paste into SQL Editor

4. **Run**
   - Click "Run" button (bottom right)
   - Wait for "Success" message

5. **Verify**
   - You should see at bottom:
   ```
   Success. Rows: 3
   ```
   - This means 3 functions were created

### Step 2: Test in Browser

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Open your app**
3. **Click any wallpaper** to open full view
4. **Tap the heart button**
5. **Check browser console** - should see:
   ```
   [Like] ✅ Wallpaper like result: {success: true, liked: true, like_count: 1, ...}
   ```

### Step 3: Verify Database

```sql
-- Run this in Supabase SQL Editor

-- 1. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('like_wallpaper', 'unlike_wallpaper', 'check_wallpaper_like');

-- Should return 3 rows:
-- like_wallpaper
-- unlike_wallpaper
-- check_wallpaper_like

-- 2. Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'wallpaper_likes';

-- Should return 1 row:
-- wallpaper_likes

-- 3. Test like function
SELECT like_wallpaper(
  (SELECT id FROM wallpapers LIMIT 1),
  'test-user-123'
);

-- Should return JSON:
-- {"success": true, "liked": true, "like_count": 1, "already_liked": false, ...}
```

---

## 🔍 What the Migration Does

### Creates Table
```sql
CREATE TABLE wallpaper_likes (
  id UUID PRIMARY KEY,
  wallpaper_id UUID REFERENCES wallpapers(id),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  UNIQUE(wallpaper_id, user_id)  -- One like per user
);
```

### Creates 3 Functions

**1. like_wallpaper(wallpaper_id, user_id)**
- Checks if user already liked
- If yes: returns current count (no increment)
- If no: inserts record + increments counter
- Returns: `{success: true, liked: true, like_count: 5, already_liked: false}`

**2. unlike_wallpaper(wallpaper_id, user_id)**
- Deletes like record
- Does NOT decrement counter (as per requirements)
- Returns: `{success: true, liked: false, like_count: 5, was_liked: true}`

**3. check_wallpaper_like(wallpaper_id, user_id)**
- Returns true if user liked, false otherwise
- Used on component mount to show filled/unfilled heart

---

## 🧪 Testing After Fix

### Test 1: Like a Wallpaper
1. Open app, click any wallpaper
2. Tap heart button
3. **Expected:**
   - Heart fills with green immediately
   - Count increments by 1
   - Console shows: `[Like] ✅ Wallpaper like result`
4. **Check database:**
   ```sql
   SELECT * FROM wallpaper_likes WHERE user_id LIKE 'anon_%';
   -- Should show 1 row
   ```

### Test 2: Like Again (Idempotency)
1. Tap heart button again (unlike)
2. Tap heart button again (re-like)
3. **Expected:**
   - Heart stays filled
   - Count doesn't change (still same as before)
   - Console shows: `already_liked: true`
4. **Check database:**
   ```sql
   SELECT * FROM wallpaper_likes WHERE user_id LIKE 'anon_%';
   -- Should still show 1 row (not 2)
   
   SELECT like_count FROM wallpapers WHERE id = 'your-wallpaper-id';
   -- Should be same count (not incremented)
   ```

### Test 3: Unlike
1. Tap filled heart (unlike)
2. **Expected:**
   - Heart becomes hollow
   - Count stays same (doesn't decrement)
   - Console shows: `[Unlike] ✅ Wallpaper unlike result`
3. **Check database:**
   ```sql
   SELECT * FROM wallpaper_likes WHERE user_id LIKE 'anon_%';
   -- Should be empty (record deleted)
   
   SELECT like_count FROM wallpapers WHERE id = 'your-wallpaper-id';
   -- Should still be same count (didn't decrease)
   ```

### Test 4: Re-like After Unlike
1. Tap heart again (like after unlike)
2. **Expected:**
   - Heart fills green
   - Count increments by 1 (from previous total)
   - Console shows: `already_liked: false` (it's a new like)
3. **Check database:**
   ```sql
   SELECT * FROM wallpaper_likes WHERE user_id LIKE 'anon_%';
   -- Should show 1 row (new record)
   
   SELECT like_count FROM wallpapers WHERE id = 'your-wallpaper-id';
   -- Should be +1 from before unlike (e.g., if it was 5, now 6)
   ```

---

## 🚨 If Still Getting Errors

### Error: "Table wallpapers does not exist"
**Fix:** You're in the wrong Supabase project
- Make sure you're in the USER PANEL project
- Not the ADMIN PANEL project

### Error: "Permission denied for function"
**Fix:** Grant permissions
```sql
GRANT EXECUTE ON FUNCTION like_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unlike_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_wallpaper_like TO authenticated, anon;
```

### Error: "Relation wallpaper_likes already exists"
**Fix:** Table exists, just create functions
```sql
-- Run only the function creation parts of FIX_WALLPAPER_LIKES_SIMPLE.sql
-- Skip the CREATE TABLE section
```

### Error: Functions created but still getting 500 error
**Fix:** 
1. Restart Supabase Edge Functions (in Supabase dashboard)
2. Clear browser cache
3. Check function signatures match:
   ```sql
   SELECT routine_name, 
          array_agg(parameter_name ORDER BY ordinal_position) as params
   FROM information_schema.parameters 
   WHERE specific_schema = 'public'
   AND routine_name IN ('like_wallpaper', 'unlike_wallpaper')
   GROUP BY routine_name;
   
   -- Should show:
   -- like_wallpaper    | {p_wallpaper_id, p_user_id}
   -- unlike_wallpaper  | {p_wallpaper_id, p_user_id}
   ```

---

## 📊 Expected Console Output (Success)

### When liking a wallpaper:
```javascript
[MediaDetail] Tracking view for: 79576111-56c6-4559-ad46-0be10779349b
[MediaDetail] View tracked successfully
[UserAPI] Requesting: /media/79576111-56c6-4559-ad46-0be10779349b/check-like
[UserAPI] Requesting: /media/79576111-56c6-4559-ad46-0be10779349b/like
[Like] ✅ Wallpaper like result: {
  success: true,
  liked: true,
  like_count: 1,
  already_liked: false,
  message: "Liked successfully"
}
[MediaDetail] Liked successfully
```

### When unliking:
```javascript
[UserAPI] Requesting: /media/79576111-56c6-4559-ad46-0be10779349b/unlike
[Unlike] ✅ Wallpaper unlike result: {
  success: true,
  liked: false,
  like_count: 1,
  was_liked: true,
  message: "Unliked successfully"
}
[MediaDetail] Unliked successfully
```

### When liking again (idempotent):
```javascript
[UserAPI] Requesting: /media/79576111-56c6-4559-ad46-0be10779349b/like
[Like] ✅ Wallpaper like result: {
  success: true,
  liked: true,
  like_count: 1,
  already_liked: true,  // ← Notice this!
  message: "Already liked"
}
[MediaDetail] Liked successfully
```

---

## ✅ Success Checklist

After running the migration, verify all these work:

- [ ] Browser console shows no errors
- [ ] Tap heart → fills green immediately
- [ ] Tap heart again → stays green (idempotent)
- [ ] Tap filled heart → becomes hollow (unlike)
- [ ] Count updates correctly
- [ ] Database has wallpaper_likes table
- [ ] Database has 3 RPC functions
- [ ] No 500 errors in network tab

---

## 🎯 Quick Verification Script

Run this in Supabase SQL Editor to verify everything:

```sql
DO $$
DECLARE
  test_wallpaper_id UUID;
  test_user_id TEXT := 'test-user-verification';
  result1 JSON;
  result2 JSON;
  result3 JSON;
  check1 BOOLEAN;
  check2 BOOLEAN;
BEGIN
  -- Get a test wallpaper
  SELECT id INTO test_wallpaper_id FROM wallpapers LIMIT 1;
  
  RAISE NOTICE 'Testing with wallpaper: %', test_wallpaper_id;
  
  -- Test 1: Like wallpaper
  SELECT like_wallpaper(test_wallpaper_id, test_user_id) INTO result1;
  RAISE NOTICE 'Like result: %', result1;
  
  -- Test 2: Check if liked
  SELECT check_wallpaper_like(test_wallpaper_id, test_user_id) INTO check1;
  RAISE NOTICE 'Check like (should be true): %', check1;
  
  -- Test 3: Like again (idempotency)
  SELECT like_wallpaper(test_wallpaper_id, test_user_id) INTO result2;
  RAISE NOTICE 'Like again result (should show already_liked): %', result2;
  
  -- Test 4: Unlike
  SELECT unlike_wallpaper(test_wallpaper_id, test_user_id) INTO result3;
  RAISE NOTICE 'Unlike result: %', result3;
  
  -- Test 5: Check if liked after unlike
  SELECT check_wallpaper_like(test_wallpaper_id, test_user_id) INTO check2;
  RAISE NOTICE 'Check like after unlike (should be false): %', check2;
  
  -- Cleanup
  DELETE FROM wallpaper_likes WHERE user_id = test_user_id;
  
  RAISE NOTICE '✅ All tests passed!';
END $$;
```

Expected output:
```
NOTICE: Testing with wallpaper: 79576111-56c6-4559-ad46-0be10779349b
NOTICE: Like result: {"success": true, "liked": true, "like_count": 1, "already_liked": false}
NOTICE: Check like (should be true): t
NOTICE: Like again result (should show already_liked): {"success": true, "liked": true, "like_count": 1, "already_liked": true}
NOTICE: Unlike result: {"success": true, "liked": false, "like_count": 1, "was_liked": true}
NOTICE: Check like after unlike (should be false): f
NOTICE: ✅ All tests passed!
```

---

## 🎉 After Fixing

Once the SQL migration runs successfully:

1. **Refresh your app** (clear cache)
2. **Test wallpaper likes** - should work perfectly
3. **Check console** - no more 500 errors
4. **Proceed with** deploying MediaDetailReels component

**Total fix time:** ~2 minutes

Let me know if you see any errors after running the migration!
