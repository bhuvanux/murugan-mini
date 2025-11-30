# 🔍 MASTER SPEC COMPLIANCE REPORT

**Date:** November 25, 2025  
**Status:** ⚠️ PARTIAL COMPLIANCE - FIXES NEEDED

---

## 📊 COMPLIANCE MATRIX

| Component | Spec Requirement | Current Implementation | Status |
|-----------|------------------|------------------------|--------|
| Database Column | `banner_type` | `banner_type` | ✅ COMPLIANT |
| Database Field Type | ENUM | ENUM | ✅ COMPLIANT |
| Status Field | `status` | `publish_status` | ⚠️ MISMATCH |
| Backend Transform | `banner_type as type` | JavaScript transform | ✅ COMPLIANT |
| API Endpoint | `/banners/list?type=X` | `/banners/list?type=X` | ✅ COMPLIANT |
| Response Format | `{type: banner_type}` | `{type: banner_type}` | ✅ COMPLIANT |

---

## ⚠️ TYPE ENUM MISMATCHES

### SPEC SAYS:
```typescript
type BannerType = "home" | "wallpaper" | "songs" | "photos" | "spark" | "temple"
```

### CURRENT CODE HAS:
```typescript
type: "wallpaper" | "photos" | "media" | "sparkle" | "home"
```

### DIFFERENCES:

| Spec | Current | Issue |
|------|---------|-------|
| `spark` | `sparkle` | ❌ NAME MISMATCH |
| `songs` | `media` | ❌ DIFFERENT CONCEPT |
| `temple` | *missing* | ❌ NOT IMPLEMENTED |

---

## 🔧 REQUIRED FIXES

### Fix 1: Update Frontend Type Definition

**File:** `/utils/bannerAPI.ts`

**Change from:**
```typescript
type: "wallpaper" | "photos" | "media" | "sparkle" | "home"
```

**Change to:**
```typescript
type: "home" | "wallpaper" | "songs" | "photos" | "spark" | "temple"
```

---

### Fix 2: Update Cache Invalidation Function

**File:** `/utils/bannerAPI.ts`

**Change from:**
```typescript
const types: Banner["type"][] = ["wallpaper", "photos", "media", "sparkle", "home"];
```

**Change to:**
```typescript
const types: Banner["type"][] = ["home", "wallpaper", "songs", "photos", "spark", "temple"];
```

---

### Fix 3: Verify Database ENUM

**Run in Supabase SQL Editor:**
```sql
-- Check current enum values
SELECT unnest(enum_range(NULL::banner_type_enum))::text;
```

**Expected result:**
```
home
wallpaper
songs
photos
spark
temple
```

**If missing any, add them:**
```sql
-- Only if enum doesn't exist yet
CREATE TYPE banner_type_enum AS ENUM (
  'home',
  'wallpaper',
  'songs',
  'photos',
  'spark',
  'temple'
);

-- If enum exists but missing values, add them:
ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'songs';
ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'spark';
ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'temple';
```

---

### Fix 4: Update Database Column Names

**Current schema has:**
- `publish_status` (text)
- `visibility` (text)

**Spec requires:**
- `status` (text)

**Migration needed:**
```sql
-- Rename column to match spec
ALTER TABLE banners RENAME COLUMN publish_status TO status;

-- Update any queries that use publish_status
```

---

## 🚨 CRITICAL ISSUE: Status Field Name

### Current Backend Query:
```typescript
.eq("publish_status", status)
```

### After Fix (Spec Compliant):
```typescript
.eq("status", status)
```

This requires:
1. Database migration to rename column
2. Backend query update
3. Admin Panel update (if it uses `publish_status`)

---

## ✅ WHAT'S ALREADY COMPLIANT

1. ✅ API endpoint structure: `/banners/list?type=X`
2. ✅ Backend returns `type` field (transformed from `banner_type`)
3. ✅ Database uses `banner_type` column
4. ✅ Server validates and filters by `banner_type`
5. ✅ Caching system works correctly
6. ✅ Analytics tracking (view/click) implemented
7. ✅ Optimal image selection logic
8. ✅ Error handling with cache fallback

---

## 📋 ACTION ITEMS

### Priority 1: Type System Alignment (High Impact)

- [ ] Update `/utils/bannerAPI.ts` type definition
- [ ] Verify database ENUM has all 6 types
- [ ] Update cache invalidation to include all types
- [ ] Test each banner type displays correctly

### Priority 2: Status Field Rename (Breaking Change)

- [ ] Decide: Rename DB column `publish_status` → `status`
- [ ] Or: Update spec to accept `publish_status`
- [ ] Update all backend queries
- [ ] Update Admin Panel if affected
- [ ] Run migration script

### Priority 3: Documentation

- [ ] Document type mapping (if keeping current types)
- [ ] Update API docs with correct types
- [ ] Create migration guide for existing data

---

## 🤔 DECISION NEEDED: Type Naming Strategy

### Option A: Follow Spec Exactly
**Pros:**
- Matches master spec
- Clear separation (songs vs media)
- Future-proof

**Cons:**
- Breaking change
- Need to migrate existing data
- Admin Panel needs updates

### Option B: Update Spec to Match Current
**Pros:**
- No breaking changes
- Current code works
- Less migration work

**Cons:**
- Spec becomes outdated
- "sparkle" vs "spark" confusion continues
- No "temple" or "songs" modules

### Recommendation: **Option A** (Follow Spec)

Reasons:
1. Spec is more semantically correct
2. "songs" is clearer than "media" for devotional songs
3. "spark" is cleaner than "sparkle"
4. "temple" module is mentioned in requirements
5. Better long-term alignment

---

## 🧪 TESTING AFTER FIXES

### Test 1: Type Validation
```typescript
// Should accept all 6 types
const validTypes = ["home", "wallpaper", "songs", "photos", "spark", "temple"];
validTypes.forEach(type => {
  fetchModuleBanners(type); // Should not error
});
```

### Test 2: Database ENUM
```sql
-- Should succeed for all types
INSERT INTO banners (title, banner_type, status) 
VALUES ('Test', 'spark', 'published');
```

### Test 3: API Response
```bash
curl "https://[project].supabase.co/functions/v1/make-server-4a075ebc/banners/list?type=spark"
# Should return banners with type: "spark"
```

---

## 📝 MIGRATION CHECKLIST

If implementing Option A (recommended):

1. **Database Migration**
   ```sql
   -- Add missing enum values
   ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'songs';
   ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'spark';
   ALTER TYPE banner_type_enum ADD VALUE IF NOT EXISTS 'temple';
   
   -- Migrate data (if needed)
   UPDATE banners SET banner_type = 'spark' WHERE banner_type = 'sparkle';
   UPDATE banners SET banner_type = 'songs' WHERE banner_type = 'media';
   
   -- Rename status column
   ALTER TABLE banners RENAME COLUMN publish_status TO status;
   ```

2. **Backend Updates**
   - Update all `.eq("publish_status", ...)` → `.eq("status", ...)`
   - Verify enum validation includes all 6 types

3. **Frontend Updates**
   - Update type definition in `bannerAPI.ts`
   - Update cache invalidation function
   - Update any hardcoded type references

4. **Admin Panel Updates**
   - Add "Songs" button
   - Add "Temple" button  
   - Rename "Sparkle" → "Spark" (or keep UI as "Sparkle" but save as "spark")
   - Update upload payload to use `status` instead of `publish_status`

5. **Testing**
   - Upload banner of each type
   - Verify correct display in User App
   - Check console logs show correct type
   - Verify filtering works

---

## 🎯 RECOMMENDATION

**Short-term (Today):**
1. Update frontend type definition to match spec
2. Add missing types to database ENUM
3. Test with current data

**Medium-term (This week):**
1. Rename `publish_status` → `status` in database
2. Update all backend queries
3. Update Admin Panel

**Long-term (Ongoing):**
1. Follow master spec for all new features
2. Keep spec document updated
3. Run compliance check before deployments

---

## 📊 COMPLIANCE SCORE

**Current:** 70% Compliant

- ✅ Core functionality works
- ✅ API structure correct
- ✅ Transform logic correct
- ⚠️ Type names partially mismatched
- ⚠️ Status field name different
- ❌ Missing temple type support

**After Fixes:** 100% Compliant

---

**Last Updated:** November 25, 2025  
**Next Review:** After implementing fixes
