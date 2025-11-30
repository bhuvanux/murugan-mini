# ⚡ QUICK FIX - Run This SQL Now

## 🚨 Error You're Seeing:
```
Could not find the function public.like_wallpaper in the schema cache
```

## ✅ Solution (30 seconds):

### Step 1: Open Supabase
1. Go to https://app.supabase.com
2. Click your **USER PANEL** project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy + Paste + Run

Copy **ALL** of this and paste into SQL Editor, then click **Run**:

```sql
-- Create wallpaper_likes table
CREATE TABLE IF NOT EXISTS wallpaper_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallpaper_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_wallpaper_id ON wallpaper_likes(wallpaper_id);
CREATE INDEX IF NOT EXISTS idx_wallpaper_likes_user_id ON wallpaper_likes(user_id);

-- Function 1: like_wallpaper
CREATE OR REPLACE FUNCTION like_wallpaper(p_wallpaper_id UUID, p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_already_liked BOOLEAN; v_like_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id) INTO v_already_liked;
  IF v_already_liked THEN
    SELECT COALESCE(like_count, 0) INTO v_like_count FROM wallpapers WHERE id = p_wallpaper_id;
    RETURN json_build_object('success', true, 'liked', true, 'like_count', v_like_count, 'already_liked', true, 'message', 'Already liked');
  ELSE
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id) ON CONFLICT DO NOTHING;
    UPDATE wallpapers SET like_count = COALESCE(like_count, 0) + 1 WHERE id = p_wallpaper_id RETURNING COALESCE(like_count, 0) INTO v_like_count;
    RETURN json_build_object('success', true, 'liked', true, 'like_count', v_like_count, 'already_liked', false, 'message', 'Liked successfully');
  END IF;
END; $$;

-- Function 2: unlike_wallpaper
CREATE OR REPLACE FUNCTION unlike_wallpaper(p_wallpaper_id UUID, p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_was_liked BOOLEAN; v_like_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id) INTO v_was_liked;
  IF v_was_liked THEN DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id; END IF;
  SELECT COALESCE(like_count, 0) INTO v_like_count FROM wallpapers WHERE id = p_wallpaper_id;
  RETURN json_build_object('success', true, 'liked', false, 'like_count', v_like_count, 'was_liked', v_was_liked, 'message', CASE WHEN v_was_liked THEN 'Unliked successfully' ELSE 'Not previously liked' END);
END; $$;

-- Function 3: check_wallpaper_like
CREATE OR REPLACE FUNCTION check_wallpaper_like(p_wallpaper_id UUID, p_user_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id);
END; $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION like_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unlike_wallpaper TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_wallpaper_like TO authenticated, anon;
GRANT SELECT, INSERT, DELETE ON wallpaper_likes TO authenticated, anon;

-- Verify (you should see "Success" at bottom)
SELECT 'Functions created successfully!' as status;
```

### Step 3: Refresh Browser

1. Open your app
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. Click any wallpaper
4. Tap heart button

**Expected:** Heart fills green, no errors in console

---

## ✅ Verification

After running SQL, check console should show:
```
[Like] ✅ Wallpaper like result: {success: true, liked: true, like_count: 1}
```

No more errors! ✨

---

## 📝 What This Does

- Creates `wallpaper_likes` table to track who liked what
- Creates 3 functions: `like_wallpaper`, `unlike_wallpaper`, `check_wallpaper_like`
- Grants permissions so frontend can call them
- Enables per-user like tracking (one like per user)

---

## 🐛 Still Getting Errors?

**Wrong Supabase project:** Make sure you're in USER PANEL, not admin panel

**Functions not found:** Restart Supabase Edge Functions:
1. Supabase Dashboard → Functions
2. Find "server" function
3. Click three dots → Restart

**Table already exists:** Skip the CREATE TABLE part, run only function creation

---

That's it! Error should be fixed in 30 seconds. 🚀
