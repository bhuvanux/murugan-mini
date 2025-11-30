# 🔄 Understanding Your Two-Database Architecture

## 📊 Architecture Overview

Your app uses **TWO separate Supabase projects**:

```
┌──────────────────────────────────────────────────┐
│                  ADMIN SIDE                      │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────┐        ┌─────────────────┐  │
│  │  Admin Panel   │   ←→   │ Admin Supabase  │  │
│  │   (Frontend)   │        │   (Database)    │  │
│  └────────────────┘        └─────────────────┘  │
│                                                  │
│  Purpose: Create, edit, manage content          │
│  Users: Administrators only                     │
│  Tables: wallpapers, banners, media, sparkles   │
│           + folders, analytics, etc.            │
│                                                  │
└──────────────────────────────────────────────────┘

                        ↓
                  SYNC PROCESS
                        ↓

┌──────────────────────────────────────────────────┐
│                   USER SIDE                      │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────┐        ┌─────────────────┐  │
│  │   User App     │   ←→   │ Edge Functions  │  │
│  │  (Frontend)    │        │   (Backend)     │  │
│  └────────────────┘        └────────┬────────┘  │
│                                     │           │
│                                     ↓           │
│                            ┌─────────────────┐  │
│                            │  User Supabase  │  │
│                            │   (Database)    │  │
│                            └─────────────────┘  │
│                                                  │
│  Purpose: Serve published content to users      │
│  Users: End users (app users)                   │
│  Tables: banners, media, wallpapers (synced)    │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Why Two Databases?

### 🔐 Security
- Admin database has full permissions
- User database only serves published content
- Separates admin operations from user operations

### 📈 Performance
- User database optimized for fast reads
- Admin database handles complex writes
- No admin overhead affecting user experience

### 🔄 Content Control
- Admins create/edit in Admin DB
- Content synced to User DB when published
- Unpublished content never reaches users

---

## 📋 What SQL to Run Where

### On **Admin Supabase** ⭐

**Purpose:** Set up tables for Admin Panel

**Run these files:**
```bash
/CLEAN_INSTALL_ALL_MODULES.sql
```
OR individually:
```bash
/BANNER_DATABASE_SETUP.sql
/MEDIA_DATABASE_SETUP.sql
/SPARKLE_DATABASE_SETUP.sql
```

**Creates:**
- ✅ banners, banner_folders, banner_analytics
- ✅ media, media_folders, media_analytics
- ✅ sparkles, sparkle_folders, sparkle_analytics
- ✅ All RPC functions
- ✅ All indexes and triggers

---

### On **User Supabase** ⭐

**Purpose:** Set up tables for User App

**Run these files:**
```bash
/ADD_MISSING_BANNER_COLUMNS.sql
```

**Creates/Adds:**
- ✅ Adds missing columns to existing banners table
- ✅ small_url, medium_url, large_url, original_url
- ✅ banner_type, visibility, order_index
- ✅ category, expires_at
- ✅ Required indexes

**Note:** The User database might already have a `banners` table from previous setup. This script just adds the missing columns.

---

## 🔍 How to Identify Which Database

### Check 1: Look at Environment Variables

**Admin Supabase:**
- Used in Admin Panel frontend code
- Different project URL/keys

**User Supabase:**
- Check `/supabase/functions/server/index.tsx`
- Uses these environment variables:
  ```typescript
  Deno.env.get("SUPABASE_URL")
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ```
- These point to the USER database

### Check 2: Look at Project Purpose

**Admin Supabase:**
- Has "Admin" in the name (usually)
- More tables (wallpapers, analytics, folders, etc.)
- Bigger database with edit history

**User Supabase:**
- Has "User" or "App" in the name (usually)
- Fewer tables
- Only published content

### Check 3: Check Supabase Dashboard

**Admin Project:**
- Go to Settings → General
- Check project name
- Look for admin-related naming

**User Project:**
- Go to Settings → General
- Check project name
- Look for user/app-related naming

---

## ❌ Common Mistakes

### Mistake 1: Running SQL on Wrong Database
```
❌ Running Admin SQL on User database
❌ Running User SQL on Admin database
✅ Run each SQL file on the correct database
```

### Mistake 2: Forgetting Second Database
```
❌ Only setting up Admin database
✅ Set up BOTH Admin AND User databases
```

### Mistake 3: Using Wrong Environment Variables
```
❌ Edge Functions pointing to Admin database
✅ Edge Functions should point to User database
```

---

## ✅ Setup Checklist

### Admin Supabase Setup:
- [ ] Open Admin Supabase project
- [ ] Go to SQL Editor
- [ ] Run `/CLEAN_INSTALL_ALL_MODULES.sql`
- [ ] Verify 9 tables created
- [ ] Test Admin Panel works

### User Supabase Setup:
- [ ] Open User Supabase project (different!)
- [ ] Go to SQL Editor
- [ ] Run `/ADD_MISSING_BANNER_COLUMNS.sql`
- [ ] Verify columns added
- [ ] Test User App works

### Verify Both Working:
- [ ] Admin Panel can create banners
- [ ] User App can display banners
- [ ] No console errors
- [ ] Analytics tracking works

---

## 🆘 Troubleshooting

### Error: "column small_url does not exist"
**Problem:** User Supabase missing columns
**Solution:** Run `/ADD_MISSING_BANNER_COLUMNS.sql` on **User Supabase**

### Error: "relation banners does not exist"
**Problem:** Admin Supabase missing tables
**Solution:** Run `/CLEAN_INSTALL_ALL_MODULES.sql` on **Admin Supabase**

### Error: "folder_id does not exist"
**Problem:** Tables created in wrong order
**Solution:** Run `/CLEAN_INSTALL_ALL_MODULES.sql` (it drops and recreates)

---

## 🎯 Quick Decision Tree

```
Which error are you getting?

├─ "column small_url does not exist"
│  └─ Run SQL on USER Supabase
│     File: /ADD_MISSING_BANNER_COLUMNS.sql
│
├─ "relation banners does not exist"
│  └─ Run SQL on ADMIN Supabase
│     File: /CLEAN_INSTALL_ALL_MODULES.sql
│
└─ "column folder_id does not exist"
   └─ Run SQL on ADMIN Supabase
      File: /CLEAN_INSTALL_ALL_MODULES.sql
```

---

## 📞 Need More Help?

See these guides:
- `/CRITICAL_FIX_USER_BANNERS.md` - For User database issues
- `/FIX_BANNER_ERRORS.md` - For banner-specific errors
- `/SQL_SETUP_TROUBLESHOOTING.md` - For general SQL issues
- `/START_HERE.md` - For complete setup guide

---

**Remember: TWO databases = TWO SQL scripts to run!** ⭐
