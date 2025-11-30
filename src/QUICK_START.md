# 🚀 Banner Fix - Quick Start Guide

## ⚡ 3-Step Fix (5 Minutes)

### Step 1: Run Diagnostic (1 minute)

Open this URL in your browser:

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4a075ebc/diagnostics/test-banner
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

---

### Step 2: Interpret Results (1 minute)

#### ✅ If you see this - You're done!
```json
{
  "status": "✅ ALL TESTS PASSED",
  "message": "Banner upload should work correctly"
}
```
**Action:** Skip to Step 3, test banner upload!

#### ❌ If you see this - Quick fix needed:
```json
{
  "step": "published_at_insert",
  "status": "FAILED",
  "error": { "code": "PGRST204" },
  "recommendation": "Add 'published_at TIMESTAMPTZ' column..."
}
```
**Action:** Continue to fix schema below ⬇️

---

### Step 3: Fix Database (If Needed) (2 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**

2. Copy and run this script:

```sql
-- Quick fix: Add missing columns
DO $$ 
BEGIN
  -- Add published_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE banners ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
  
  -- Add visibility if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE banners ADD COLUMN visibility TEXT DEFAULT 'private';
  END IF;
  
  -- Add banner_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'banner_type'
  ) THEN
    ALTER TABLE banners ADD COLUMN banner_type TEXT DEFAULT 'home';
  END IF;
  
  -- Add original_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'original_url'
  ) THEN
    ALTER TABLE banners ADD COLUMN original_url TEXT;
  END IF;
  
  -- Add storage_path if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banners' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE banners ADD COLUMN storage_path TEXT;
  END IF;
END $$;

-- Verify
SELECT '✅ Schema updated!' as status;
```

3. **Re-run diagnostic** from Step 1
4. Should now show "✅ ALL TESTS PASSED"

---

## 🎯 Test Banner Upload (1 minute)

1. Go to **Admin Panel** → **Banner Manager**
2. Click **"Upload Banner"**
3. Select an image
4. Fill in title and description
5. Click **"Upload"**
6. ✅ Banner should appear in the list!

---

## 🆘 Still Not Working?

### Check Console Logs

**In Browser:**
- Press `F12` → Console tab
- Look for `[Banner Upload]` logs
- Copy any errors

**In Supabase:**
- Dashboard → Edge Functions → Logs
- Look for errors from `make-server-4a075ebc`

### Run Full Diagnostics

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-4a075ebc/diagnostics/database
```

This will show:
- ✅ What's working
- ❌ What's broken
- 💡 Exact fix recommendations

---

## 📚 Need More Help?

See detailed documentation:

- **Complete Guide:** `/BANNER_FIX_COMPLETE.md`
- **Diagnostic Guide:** `/DIAGNOSTIC_GUIDE.md`
- **Schema Check:** `/CHECK_BANNERS_SCHEMA.sql`
- **Schema Fix:** `/ADD_MISSING_BANNER_COLUMNS.sql`

---

## 🎉 Success Checklist

- [ ] Diagnostic shows "✅ ALL TESTS PASSED"
- [ ] Banner upload completes
- [ ] Banner appears in list
- [ ] No errors in console

---

**That's it! 🚀 Banner upload should be working now!**

If you still have issues after following these steps, run the full diagnostic and share the JSON output.
