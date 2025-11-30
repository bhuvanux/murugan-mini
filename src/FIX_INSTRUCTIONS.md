# 🔧 ERROR FIX INSTRUCTIONS

## 🔴 CRITICAL: Follow These Steps in Order

### **ISSUE 1: Like Function Parameter Order Error**

**Error Message:**
```
Could not find the function public.wallpaper_like_toggle(p_user_id, p_wallpaper_id) in the schema cache
```

**Root Cause:** 
Supabase RPC automatically sorts parameters **alphabetically** when you pass them as an object. Our function was defined with `(p_wallpaper_id, p_user_id)` but Supabase looks for `(p_user_id, p_wallpaper_id)`.

**Fix:**

1. **Go to Supabase Dashboard → SQL Editor**
2. **Click "New Query"**
3. **Copy and paste this SQL:**

```sql
-- ============================================
-- IDEMPOTENT LIKE/UNLIKE SYSTEM MIGRATION (FIXED)
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS wallpaper_like_toggle(uuid, text);
DROP FUNCTION IF EXISTS wallpaper_like_toggle(text, uuid);
DROP FUNCTION IF EXISTS check_wallpaper_like(uuid, text);
DROP FUNCTION IF EXISTS check_wallpaper_like(text, uuid);

-- Create table to store unique likes
CREATE TABLE IF NOT EXISTS wallpaper_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id uuid NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (wallpaper_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_user ON wallpaper_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_wallpaper ON wallpaper_likes(wallpaper_id);

-- Atomic toggle function (FIXED: parameters in alphabetical order for Supabase RPC)
-- IMPORTANT: p_user_id comes FIRST, then p_wallpaper_id (alphabetical order)
CREATE OR REPLACE FUNCTION wallpaper_like_toggle(p_user_id text, p_wallpaper_id uuid)
RETURNS JSON AS $$
DECLARE
  already BOOLEAN;
  new_count INTEGER;
BEGIN
  -- Check if user has already liked this wallpaper
  SELECT EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  ) INTO already;

  IF already THEN
    -- Unlike: remove from likes table and decrement counter
    DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id;
    UPDATE wallpapers SET like_count = GREATEST(COALESCE(like_count,0) - 1, 0) WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','unliked','like_count', new_count);
  ELSE
    -- Like: add to likes table and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id)
      ON CONFLICT (wallpaper_id, user_id) DO NOTHING;
    UPDATE wallpapers SET like_count = COALESCE(like_count,0) + 1 WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','liked','like_count', new_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked a wallpaper (FIXED: alphabetical order)
-- IMPORTANT: p_user_id comes FIRST, then p_wallpaper_id
CREATE OR REPLACE FUNCTION check_wallpaper_like(p_user_id text, p_wallpaper_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION wallpaper_like_toggle(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_wallpaper_like(text, uuid) TO anon, authenticated, service_role;

-- Verify the functions were created (should show 2 functions)
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN ('wallpaper_like_toggle', 'check_wallpaper_like')
ORDER BY proname;
```

4. **Click "RUN"**
5. **Verify Success** - You should see:
   ```
   function_name          | arguments                         | return_type
   -----------------------|-----------------------------------|-------------
   check_wallpaper_like   | p_user_id text, p_wallpaper_id uuid | boolean
   wallpaper_like_toggle  | p_user_id text, p_wallpaper_id uuid | json
   ```

---

### **ISSUE 2: Sparkle Endpoint Missing**

**Error Message:**
```
[UserAPI] Request failed for /sparkle/list?page=1&limit=50: Error: Request failed
```

**Root Cause:** 
The `/sparkle/list` endpoint didn't exist in the backend.

**Fix:**
✅ Already fixed! I've added the `/sparkle/list` endpoint to your backend (`/supabase/functions/server/index.tsx`).

**What it does:**
- Queries the `sparks` table
- Filters by visibility='public'
- Returns data in user panel format
- Includes pagination

---

## 📋 VERIFICATION CHECKLIST

After running the SQL migration:

### **1. Verify Database Functions**
- [ ] Go to Supabase Dashboard → Database → Functions
- [ ] You should see:
  - `wallpaper_like_toggle(text, uuid)`
  - `check_wallpaper_like(text, uuid)`

### **2. Verify Database Tables**
- [ ] Go to Supabase Dashboard → Table Editor
- [ ] You should see `wallpaper_likes` table with columns:
  - `id` (uuid)
  - `wallpaper_id` (uuid)
  - `user_id` (text)
  - `created_at` (timestamptz)

### **3. Test Like Feature**
1. [ ] Hard-refresh your app (Ctrl+Shift+R or Cmd+Shift+R)
2. [ ] Open a wallpaper
3. [ ] Tap the heart button
4. [ ] Should fill immediately ✅
5. [ ] Check browser console - should see: `[MediaDetail] ✅ liked successfully - count: X`
6. [ ] Tap again - should unlike ✅
7. [ ] Check Supabase → Table Editor → `wallpaper_likes` - should see rows being added/removed

### **4. Test Sparkle Tab**
1. [ ] Go to Sparkle tab in your app
2. [ ] Should load articles without errors
3. [ ] Check browser console - should see: `[Sparkle List] Found X items`

---

## 🚨 TROUBLESHOOTING

### **If Like Still Doesn't Work:**

1. **Check SQL ran successfully:**
   - Go to Supabase → SQL Editor → History
   - Verify the query ran without errors

2. **Refresh schema cache:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. **Check function exists:**
   ```sql
   SELECT 
     proname,
     pg_get_function_arguments(oid) as args
   FROM pg_proc 
   WHERE proname = 'wallpaper_like_toggle';
   ```
   Should return: `p_user_id text, p_wallpaper_id uuid`

4. **Test function directly:**
   ```sql
   SELECT wallpaper_like_toggle('test_user', '<some-wallpaper-uuid>');
   ```

### **If Sparkle Still Fails:**

1. **Check if `sparks` table exists:**
   - Go to Supabase → Table Editor
   - Look for `sparks` table
   
2. **If table doesn't exist, create it:**
   ```sql
   CREATE TABLE IF NOT EXISTS sparks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     title text NOT NULL,
     type text DEFAULT 'article',
     short_description text,
     full_article text,
     cover_image text,
     image_url text,
     source text,
     external_link text,
     published_at timestamptz DEFAULT now(),
     created_at timestamptz DEFAULT now(),
     visibility text DEFAULT 'public',
     tags text[]
   );
   ```

3. **Add sample data for testing:**
   ```sql
   INSERT INTO sparks (title, type, short_description, visibility) VALUES
   ('Sample Article', 'article', 'This is a test article', 'public');
   ```

---

## ✅ SUCCESS INDICATORS

You'll know everything is working when:

1. ✅ Heart button fills/empties instantly (no errors in console)
2. ✅ Like count increases/decreases
3. ✅ Supabase `wallpaper_likes` table has rows
4. ✅ Sparkle tab loads articles
5. ✅ No errors in browser console
6. ✅ Backend logs show: `[Like] ✅ Wallpaper toggle result: {action: 'liked', like_count: X}`

---

## 📞 STILL STUCK?

If errors persist:
1. Share the **exact error message** from browser console
2. Share the **SQL execution result** from Supabase
3. Share the **backend logs** from Supabase Functions → Logs

The system should work perfectly after running the SQL migration! 🎉
