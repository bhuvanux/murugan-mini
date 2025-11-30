# 🔧 Fix Banner Database Errors

## ❌ Error: "column banners.small_url does not exist"

This error means your **User Supabase** banners table is missing required columns.

### ⚠️ CRITICAL: Which Database?

**If error says "[User Banners]":**
→ Run SQL on **USER Supabase** (not Admin!)

**If error is in Admin Panel:**
→ Run SQL on **Admin Supabase**

👉 **See `/TWO_DATABASES_EXPLANATION.md` for full architecture explanation**

---

## ✅ SOLUTION 1: Add Missing Columns (SAFE - Keeps Data)

**Use this if you want to keep existing banner data:**

1. Open **Admin Supabase** → SQL Editor
2. Copy and run: `/ADD_MISSING_BANNER_COLUMNS.sql`
3. ✅ Done! All missing columns will be added

**This script:**
- ✅ Adds all missing columns (small_url, medium_url, large_url, original_url, banner_type, category, order_index, visibility, expires_at)
- ✅ Creates missing indexes
- ✅ Sets default values
- ✅ Safe to run multiple times
- ✅ **Preserves all existing data**

---

## ✅ SOLUTION 2: Clean Install (Deletes Data)

**Use this if you want a fresh start:**

1. Open **Admin Supabase** → SQL Editor
2. Copy and run: `/CLEAN_INSTALL_ALL_MODULES.sql`
3. ✅ Done! All tables recreated from scratch

**This script:**
- ⚠️ Drops all existing tables
- ✅ Creates all tables with ALL required columns
- ✅ Creates all indexes, functions, triggers
- ⚠️ **Deletes all existing data**

---

## 📋 Required Banner Columns

Your banners table MUST have these columns for the User App to work:

### Image URLs (Multi-resolution)
- `image_url` - Main image
- `thumbnail_url` - Thumbnail preview
- `small_url` - Small resolution
- `medium_url` - Medium resolution
- `large_url` - Large resolution
- `original_url` - Original full resolution

### Banner Configuration
- `banner_type` - Type: wallpaper, photos, media, sparkle, home
- `category` - Category text
- `order_index` - Display order (0 = first)
- `visibility` - public or private
- `expires_at` - Optional expiration date

### Publishing
- `publish_status` - published, draft, scheduled
- `scheduled_at` - When to publish (if scheduled)

### Analytics
- `view_count` - Number of views
- `click_count` - Number of clicks

### Organization
- `folder_id` - FK to banner_folders
- `title` - Banner title
- `description` - Banner description
- `link_url` - Optional link URL

### Metadata
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `created_by` - Creator user ID

---

## 🔍 Verify Your Schema

Run this query to check what columns you have:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'banners'
ORDER BY ordinal_position;
```

You should see **ALL** the columns listed above.

---

## ⚡ Quick Decision Guide

**Choose SOLUTION 1 if:**
- ✅ You have existing banner data
- ✅ You don't want to lose data
- ✅ You just need missing columns

**Choose SOLUTION 2 if:**
- ✅ You're setting up for the first time
- ✅ You only have test data
- ✅ You want a clean slate
- ✅ You're having multiple errors

---

## 🎯 Most Common Case

**For most users:** Run `/ADD_MISSING_BANNER_COLUMNS.sql` first.

If that doesn't fix all errors, then run `/CLEAN_INSTALL_ALL_MODULES.sql`.

---

## ✅ After Running the Fix

1. Refresh your Admin Panel
2. Go to Banner Manager
3. Upload a test banner
4. Check if it appears in User App
5. Verify no more errors in console

---

## 🆘 Still Getting Errors?

**Other common errors:**

### "column folder_id does not exist"
→ Run `/CLEAN_INSTALL_ALL_MODULES.sql`

### "relation banners does not exist"
→ Run `/CLEAN_INSTALL_ALL_MODULES.sql`

### "operator does not exist: boolean > integer"
→ Run `/FIX_ANALYTICS_UNTRACK.sql` (for wallpapers)

### Permission errors
→ Make sure you're using SQL Editor (not REST API)

---

**Need more help?** Check `/SQL_SETUP_TROUBLESHOOTING.md`
