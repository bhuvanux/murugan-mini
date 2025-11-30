# 🚨 CRITICAL: Run SQL on USER Supabase!

## ❌ The Problem

You're getting this error:
```
[User Banners] Database error: column banners.small_url does not exist
```

**Root Cause:** You ran the SQL scripts on the **Admin Supabase**, but the User App queries the **USER Supabase** database!

---

## 🎯 THE FIX: Run SQL on BOTH Databases

Your app has **TWO separate Supabase projects**:

### 1️⃣ **Admin Supabase** (Content Management)
- Used by: Admin Panel
- Purpose: Create/edit/manage content
- You probably already ran SQL here ✅

### 2️⃣ **User Supabase** (Content Serving) ⭐ **THIS ONE IS MISSING!**
- Used by: User App (Wallpaper, Banner, Media, Sparkle screens)
- Purpose: Serve content to end users
- **You need to run SQL here!** ❌

---

## ✅ SOLUTION: Run on USER Supabase

### Step 1: Open USER Supabase Project

1. Go to https://supabase.com
2. **Make sure you're in the USER project** (not Admin project)
3. Check the project name/URL - it should be your user-facing database

### Step 2: Run the Migration Script

1. Click **SQL Editor** (left sidebar)
2. Copy and paste this file: `/ADD_MISSING_BANNER_COLUMNS.sql`
3. Click **Run** (or Ctrl+Enter)
4. ✅ Wait for "Banner columns migration complete!"

### Step 3: Verify It Worked

Run this query in SQL Editor:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'banners' 
  AND column_name IN ('small_url', 'medium_url', 'large_url', 'original_url', 'banner_type', 'visibility', 'order_index')
ORDER BY column_name;
```

You should see all 7 columns listed.

---

## 📋 What Columns Are Added

The script adds these required columns to the USER database:

```sql
small_url TEXT          -- Small resolution image
medium_url TEXT         -- Medium resolution image
large_url TEXT          -- Large resolution image
original_url TEXT       -- Original full resolution
banner_type TEXT        -- Type: wallpaper, photos, media, sparkle, home
category TEXT           -- Category text
order_index INTEGER     -- Display order
visibility TEXT         -- public or private
expires_at TIMESTAMPTZ  -- Optional expiration
```

---

## 🔄 Architecture Reminder

```
┌─────────────────┐
│  ADMIN PANEL    │
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ ADMIN SUPABASE  │ ← You already ran SQL here ✅
│   (Database)    │
└─────────────────┘


┌─────────────────┐
│   USER APP      │
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  EDGE FUNCTION  │ ← Queries USER Supabase
│  (Backend API)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  USER SUPABASE  │ ← YOU NEED TO RUN SQL HERE! ⭐
│   (Database)    │
└─────────────────┘
```

---

## ⚡ Quick Checklist

- [ ] Identify which is your USER Supabase project
- [ ] Open USER Supabase → SQL Editor
- [ ] Run `/ADD_MISSING_BANNER_COLUMNS.sql`
- [ ] Verify columns were added
- [ ] Test User App - error should be gone!

---

## 🆘 How to Identify USER vs ADMIN Supabase

**Admin Supabase:**
- Used by Admin Panel code
- Has wallpapers table with lots of data
- Has analytics tables
- Environment variable: Different URL/keys

**User Supabase:**
- Used by Edge Functions (server code)
- Gets synced data from Admin
- Serves content to User App
- Environment variables in `/supabase/functions/server/index.tsx`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Check your environment variables** to see which database the User App connects to!

---

## 🎯 After Running the Fix

1. Refresh User App
2. Check console - no more "small_url does not exist" error
3. Banners should load correctly

---

**Run `/ADD_MISSING_BANNER_COLUMNS.sql` on USER Supabase now!** ⭐
