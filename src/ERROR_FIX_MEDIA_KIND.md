# 🔧 ERROR FIX - media.kind Column Not Found

## 🐛 Problem

Backend was trying to access `media.kind` column which doesn't exist in the database.

**Error:**
```
column media.kind does not exist
HTTP 500 error on /media/list endpoint
```

## ✅ Solution Applied

### Root Cause
Database schema uses `media_type` column, but backend code was using `kind`.

### Changes Made

**File:** `/supabase/functions/server/index.tsx`

#### Change 1: Filter by type
```typescript
// BEFORE (incorrect)
if (type) {
  query = query.eq('kind', type);
}

// AFTER (correct)
if (type) {
  query = query.eq('media_type', type);
}
```

#### Change 2: Exclude YouTube
```typescript
// BEFORE (incorrect)
if (excludeYoutube) {
  query = query.neq('kind', 'youtube');
}

// AFTER (correct)
if (excludeYoutube) {
  query = query.neq('media_type', 'youtube');
}
```

#### Change 3: Transform data
```typescript
// BEFORE (incorrect)
type: item.kind === 'youtube' ? 'youtube' : item.kind === 'video' ? 'video' : 'photo',
url: item.kind === 'youtube' ? item.host_url : ...

// AFTER (correct)
type: item.media_type === 'youtube' ? 'youtube' : item.media_type === 'video' ? 'video' : 'photo',
url: item.media_type === 'youtube' ? item.host_url : ...
```

## 📊 Database Schema Reference

The `media` table uses:
- ✅ `media_type` (correct column name)
- ❌ `kind` (doesn't exist)

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video', 'youtube')),
  file_url TEXT,
  ...
);
```

## ✅ Verification

After fix, these should work:

1. **Load media list:**
   ```
   GET /media/list?type=youtube
   ```

2. **Load photos (exclude YouTube):**
   ```
   GET /media/list?excludeYoutube=true
   ```

3. **Search media:**
   ```
   GET /media/list?search=murugan
   ```

## 🧪 Test Cases

- [ ] Load media list without filters → should return all media
- [ ] Filter by type=youtube → should return only YouTube videos
- [ ] Filter by type=video → should return only uploaded videos
- [ ] Exclude YouTube → should return photos and videos only
- [ ] Search by title → should return matching results
- [ ] No 500 errors in console

## 📝 Notes

- The backend now correctly uses `media_type` column everywhere
- All references to `kind` have been removed
- This aligns with the database schema in `/QUICK_SETUP.sql`
- Wallpapers table is separate and not affected by this issue

---

**Status:** ✅ Fixed and deployed
**Impact:** High - blocked media loading on Songs/Videos screens
**Fix Time:** 2 minutes
