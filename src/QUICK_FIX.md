# ⚡ QUICK FIX - Banner Errors

## 🚨 Error: "column banners.small_url does not exist"

### ✅ THE FIX (3 Steps)

---

### Step 1: Identify Which Database

Your error shows: `[User Banners] Database error`

This means you need to fix the **USER Supabase** database.

---

### Step 2: Open USER Supabase

1. Go to https://supabase.com
2. **Select your USER project** (not Admin project)
3. Click **SQL Editor** in the left sidebar

**Not sure which is which?** Your app has TWO Supabase projects:
- **Admin Supabase** = For Admin Panel (content management)
- **User Supabase** = For User App (content serving) ⭐ **You need this one!**

Check the project name or ask if you're unsure.

---

### Step 3: Run the Migration

1. In SQL Editor, create a new query
2. Copy ALL the contents of `/ADD_MISSING_BANNER_COLUMNS.sql`
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. ✅ Wait for: "Banner columns migration complete!"

---

## ✅ Verify It Worked

Run this quick test query:

```sql
SELECT small_url, medium_url, large_url, banner_type 
FROM banners 
LIMIT 1;
```

**If it works:** ✅ Columns added successfully!
**If it errors:** ❌ You're in the wrong database

---

## 🔄 If You Need to Setup Admin Database Too

If you also need to setup the Admin database:

1. Open **Admin Supabase** project (different project)
2. SQL Editor → New query
3. Copy and run: `/CLEAN_INSTALL_ALL_MODULES.sql`

---

## 🆘 Still Confused?

**Read these guides:**
- `/CRITICAL_FIX_USER_BANNERS.md` - Detailed User database fix
- `/TWO_DATABASES_EXPLANATION.md` - Understand the architecture
- `/START_HERE.md` - Complete setup guide

---

## 📞 Quick Summary

```
Error Location         →  Which Database  →  Which File
─────────────────────────────────────────────────────────
[User Banners] error  →  User Supabase   →  /ADD_MISSING_BANNER_COLUMNS.sql
Admin Panel error     →  Admin Supabase  →  /CLEAN_INSTALL_ALL_MODULES.sql
```

---

**Your current error is from User App, so run `/ADD_MISSING_BANNER_COLUMNS.sql` on USER Supabase!** ⚡
