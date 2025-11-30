# 🔧 How to Fix "wallpaper_folders table not found" Error

## Error You're Seeing

```
[Get Folders] Error: {
  code: "PGRST205",
  message: "Could not find the table 'public.wallpaper_folders' in the schema cache"
}
```

## Quick Fix (3 Steps - Takes 2 Minutes)

### Step 1: Copy the SQL

Open the file `/SETUP_TABLES_NOW.sql` and **copy ALL the SQL** (Ctrl+A, Ctrl+C)

**OR** use the **orange setup banner** that now appears on your Wallpaper Management page - it has a "Copy SQL" button!

### Step 2: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **Admin Backend Project** (the one with wallpapers data)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 3: Paste and Run

1. **Paste** the SQL you copied (Ctrl+V)
2. Click **RUN** button (bottom right)
3. Wait 2-3 seconds
4. You should see: ✅ "Success. No rows returned"

### Step 4: Refresh Page

1. Go back to your Admin Panel
2. **Refresh the page** (F5 or Ctrl+R)
3. ✅ The folder sidebar should now appear!
4. ✅ The error should be gone!

---

## What the SQL Does

The SQL script creates:

1. ✅ `wallpaper_folders` table - Stores folder information
2. ✅ `wallpaper_analytics` table - Stores analytics events
3. ✅ `folder_id` column on `wallpapers` - Links wallpapers to folders
4. ✅ Counter columns (view_count, download_count, etc.)
5. ✅ Increment functions for counters
6. ✅ Indexes for fast queries
7. ✅ Triggers for auto-updating timestamps
8. ✅ Permissions for service role

---

## Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│ 1. Copy SQL from /SETUP_TABLES_NOW.sql                  │
│    OR click "Copy SQL" button in orange banner          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Open Supabase Dashboard → SQL Editor → New Query    │
│    URL: https://supabase.com/dashboard                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Paste SQL → Click RUN                                │
│    Wait for: "Success. No rows returned"                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Refresh Admin Panel page                             │
│    Folder sidebar appears! ✅                           │
└─────────────────────────────────────────────────────────┘
```

---

## New Feature: Setup Banner

After this update, when tables are missing, you'll see:

```
┌────────────────────────────────────────────────────────┐
│ ⚠️  Database Tables Required                           │
│                                                         │
│ The folder management features require additional      │
│ database tables. Follow these steps:                   │
│                                                         │
│ 1️⃣  Copy the SQL Script                               │
│ 2️⃣  Open Supabase SQL Editor                          │
│ 3️⃣  Paste and Run                                      │
│ ✅  Refresh This Page                                  │
│                                                         │
│ [Copy SQL Script] [Refresh Page After Setup]          │
└────────────────────────────────────────────────────────┘
```

This makes it **much easier** to set up!

---

## Troubleshooting

### "Success but still showing error"
- Make sure you refreshed the page (F5)
- Clear browser cache (Ctrl+Shift+R)
- Check you ran SQL in the correct Supabase project

### "Permission denied" error
- Make sure you're logged into Supabase
- Check you're using the Admin Backend project
- Try running SQL again

### "Relation already exists"
- This is fine! It means tables already exist
- Just refresh the Admin Panel page
- The error should be gone

### SQL Editor won't open
- Check your internet connection
- Make sure you're logged into Supabase
- Try a different browser
- Direct link: https://supabase.com/dashboard/project/_/sql

---

## Verification

After running the SQL, verify it worked:

```sql
-- Run this in SQL Editor to check:

SELECT 'Tables:' as check;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('wallpaper_folders', 'wallpaper_analytics');

SELECT 'Functions:' as check;
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE 'increment_wallpaper_%';
```

You should see:
- ✅ 2 tables: `wallpaper_folders`, `wallpaper_analytics`
- ✅ 4 functions: `increment_wallpaper_views`, `increment_wallpaper_downloads`, etc.

---

## What Happens After Setup

Once tables are created:

1. ✅ **Folder sidebar appears** on left side (320px)
2. ✅ **Create folders** button works
3. ✅ **Folder counts** show correctly
4. ✅ **Move to folder** feature works
5. ✅ **Upload with folder** dropdown appears
6. ✅ **Analytics drawer** loads real data
7. ✅ No more errors in console!

---

## Alternative: Manual Setup

If the SQL script doesn't work, you can create tables manually:

### Table 1: wallpaper_folders

```sql
CREATE TABLE wallpaper_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table 2: wallpaper_analytics

```sql
CREATE TABLE wallpaper_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Add Columns

```sql
ALTER TABLE wallpapers ADD COLUMN folder_id UUID;
ALTER TABLE wallpapers ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE wallpapers ADD COLUMN download_count INTEGER DEFAULT 0;
ALTER TABLE wallpapers ADD COLUMN like_count INTEGER DEFAULT 0;
```

---

## Need More Help?

1. **Check**: Browser console for error messages
2. **Check**: Network tab for failed requests
3. **Check**: Supabase logs in Dashboard → Logs
4. **Verify**: You're using the correct Supabase project
5. **Try**: Running SQL multiple times (it's safe)

---

## Summary

**The Fix**:
1. Copy SQL from `/SETUP_TABLES_NOW.sql`
2. Paste in Supabase SQL Editor
3. Click RUN
4. Refresh Admin Panel

**Time**: 2 minutes
**Difficulty**: Easy
**Result**: ✅ Folder system fully functional!

---

*After this setup, you'll never need to do it again!*
*The tables will persist in your database.*

