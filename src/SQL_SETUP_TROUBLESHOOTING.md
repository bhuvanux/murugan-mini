# 🔧 SQL Setup Troubleshooting Guide

## ⚠️ GETTING "folder_id does not exist" ERROR?

### 🎯 QUICK FIX (Recommended)

**Use the Clean Install Script - It drops old tables and recreates everything:**

1. Open **Admin Supabase** → SQL Editor
2. Copy and run **`/CLEAN_INSTALL_ALL_MODULES.sql`** ✅
3. Done! All 9 tables will be created in correct order

⚠️ **Warning:** This will delete any existing data in these tables.

---

## ✅ What Was the Problem?

**Problem:** Foreign key constraint tried to reference a table that didn't exist yet (old tables from previous failed attempts).

**Solution:** Clean install that drops everything first, then creates in correct order.

---

## 📋 Correct Setup Order

### Banner Module
1. ✅ `banner_folders` table (created FIRST)
2. ✅ `banners` table (references banner_folders)
3. ✅ `banner_analytics` table (references banners)

### Media Module
1. ✅ `media_folders` table (created FIRST)
2. ✅ `media` table (references media_folders)
3. ✅ `media_analytics` table (references media)

### Sparkle Module
1. ✅ `sparkle_folders` table (created FIRST)
2. ✅ `sparkles` table (references sparkle_folders)
3. ✅ `sparkle_analytics` table (references sparkles)

---

## 🚀 How to Run

### Option 1: Individual Files (Recommended)
Run these files in your Admin Supabase SQL Editor:

1. `/BANNER_DATABASE_SETUP.sql` ✅ FIXED
2. `/MEDIA_DATABASE_SETUP.sql` ✅ FIXED
3. `/SPARKLE_DATABASE_SETUP.sql` ✅ FIXED

### Option 2: All-in-One Script
Use the complete script in `/ALL_MODULES_DATABASE_SETUP_GUIDE.md` (already has correct order).

---

## ✅ Verification

After running the SQL, verify tables were created:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%banner%'
   OR table_name LIKE '%media%'
   OR table_name LIKE '%sparkle%')
ORDER BY table_name;
```

Expected output:
```
banner_analytics
banner_folders
banners
media
media_analytics
media_folders
sparkle_analytics
sparkle_folders
sparkles
```

---

## 🐛 Common Errors & Solutions

### Error: "column folder_id does not exist"
**Cause:** Tables created in wrong order  
**Solution:** ✅ FIXED - All SQL files now create folders first

### Error: "relation already exists"
**Cause:** Tables already created from previous run  
**Solution:** Safe to ignore, OR drop and recreate:

```sql
-- Drop all tables (DANGER: deletes data!)
DROP TABLE IF EXISTS banner_analytics CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS banner_folders CASCADE;

DROP TABLE IF EXISTS media_analytics CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS media_folders CASCADE;

DROP TABLE IF EXISTS sparkle_analytics CASCADE;
DROP TABLE IF EXISTS sparkles CASCADE;
DROP TABLE IF EXISTS sparkle_folders CASCADE;

-- Now re-run the setup SQL
```

### Error: "permission denied"
**Cause:** Using anon key instead of service role  
**Solution:** Make sure you're in Supabase SQL Editor (automatically uses service role)

### Error: "syntax error at or near..."
**Cause:** SQL not copied completely or corrupted  
**Solution:** Re-copy the entire SQL file contents

---

## ✅ Success Checklist

- [ ] All 9 tables created
- [ ] All RPC functions created
- [ ] All indexes created
- [ ] All triggers created
- [ ] No errors in SQL editor
- [ ] Verification query shows all tables

---

## 🆘 Still Having Issues?

If you still see errors:

1. **Copy error message exactly**
2. **Run verification query** (see above)
3. **Check which tables exist**
4. **Try dropping and recreating**
5. **Make sure you're in the right Supabase project** (Admin, not User)

---

## 🎉 Ready to Continue

Once all tables are created successfully:

✅ Database setup complete!  
📖 Next: Follow `/IMPLEMENTATION_MASTER_CHECKLIST.md`  
🚀 Start building the frontend components!

---

**Updated:** 2024-11-29  
**Status:** All SQL files fixed and ready to use! ✅
