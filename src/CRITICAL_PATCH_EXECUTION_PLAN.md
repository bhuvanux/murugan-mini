# 🚨 CRITICAL PATCH EXECUTION PLAN

## STATUS: IN PROGRESS

---

## ✅ PART 1: CORS FIXES (COMPLETED)
### Issue: PATCH method blocked by preflight

**Status:** ✅ ALREADY FIXED
- CORS middleware already includes PATCH in allowMethods
- credentials: true added
- X-User-Token added to allowHeaders

**File:** `/supabase/functions/server/index.tsx`
```typescript
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ PATCH included
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));
```

---

## ✅ PART 2: PUBLISH/UNPUBLISH ENDPOINTS (VERIFIED)
### Issue: Wrong API endpoint being called

**Status:** ✅ ALREADY CORRECT
- Admin calls `/api/banners/${id}` with PATCH
- Route exists: `app.patch("/make-server-4a075ebc/api/banners/:id", api.updateBanner)`
- Update function handles publish_status correctly

**Files:**
- `/utils/adminAPI.ts` - calls correct endpoint ✅
- `/supabase/functions/server/index.tsx` - route exists ✅  
- `/supabase/functions/server/api-routes.tsx` - handles publish_status ✅

---

## 🔧 PART 3: ADD BANNER_TYPE DROPDOWN (TO DO)
### Issue: banner_type must be set manually in database

**Status:** ⏳ NEEDS IMPLEMENTATION

**Required Changes:**
1. Add banner_type dropdown to UploadModal
2. Options: "wallpaper", "home", "media", "sparkle"
3. Pass banner_type to upload API
4. Store in database on upload

**Files to modify:**
- `/components/admin/UploadModal.tsx` - add dropdown
- `/supabase/functions/server/api-routes.tsx` - accept banner_type

---

## 🔧 PART 4: WIRE UP ALL MODULE UPLOADS (TO DO)
### Issue: Only wallpaper uploads work, others are TODO

**Status:** ⏳ NEEDS IMPLEMENTATION

### Modules to fix:
1. **Photos Manager** - `/components/admin/AdminPhotosManager.tsx`
2. **Media Manager** - `/components/admin/AdminMediaManager.tsx`
3. **Sparkle Manager** - `/components/admin/AdminSparkleManager.tsx`

### Each needs:
- Upload form connected to API
- Storage upload to correct bucket
- Database insert with correct table
- Sync engine trigger after upload

---

## 🔧 PART 5: ADD DATABASE INSERT LOGIC (TO DO)
### Issue: Missing insert() calls for Photos, Media, Sparkle

**Status:** ⏳ NEEDS IMPLEMENTATION

**Files:** `/supabase/functions/server/api-routes.tsx`

### Functions to create:
```typescript
export async function uploadPhoto(c: Context)
export async function uploadMedia(c: Context)  
export async function uploadSparkle(c: Context)
```

Each function must:
1. Upload file to Supabase Storage
2. Get public URL
3. INSERT into correct table (photos, media, sparkle)
4. Trigger sync engine
5. Return success response

---

## 🔧 PART 6: FIX SYNC ENGINE TRIGGERS (TO DO)
### Issue: Sync not called after all uploads

**Status:** ⏳ NEEDS IMPLEMENTATION

**Required sync keys:**
- `user_banners` ✅ (already working)
- `user_wallpapers` ✅ (already working)
- `user_media` ⏳ (needs implementation)
- `user_photos` ⏳ (needs implementation)  
- `user_sparkle` ⏳ (needs implementation)

**Files to modify:**
- `/supabase/functions/server/api-routes.tsx` - add sync functions
- `/utils/api/client.ts` - add fetch functions

---

## 🔧 PART 7: FIX USER PANEL DATA LOADING (VERIFY)
### Issue: Banner carousel not loading, wallpaper grid empty

**Status:** ⏳ NEEDS VERIFICATION

**Current state:**
- `/wallpapers/list` endpoint exists ✅
- `/banners/list` endpoint exists ✅
- MasonryFeed calls correct endpoint ✅
- ModuleBannerCarousel calls correct endpoint ✅

**Possible issues:**
- Empty database (no data uploaded yet)
- banner_type not set correctly
- Sync not triggered after upload

---

## 🔧 PART 8: STORAGE BUCKET CREATION (VERIFY)
### Issue: Buckets may not exist for all modules

**Status:** ⏳ NEEDS VERIFICATION

**Required buckets:**
- `banners` ✅ (exists)
- `wallpapers` ✅ (exists)
- `media` ⏳ (needs verification)
- `photos` ⏳ (needs verification)
- `sparkle` ⏳ (needs verification)

**File:** `/supabase/functions/server/storage-init.tsx`

---

## 📋 IMPLEMENTATION PRIORITY

### HIGH PRIORITY (Blocking publish):
1. ✅ CORS headers - COMPLETE
2. ✅ Publish endpoint - COMPLETE
3. 🔧 Banner_type dropdown - IN PROGRESS
4. 🔧 Verify publish workflow end-to-end

### MEDIUM PRIORITY (Blocking other uploads):
5. 🔧 Wire up Photos upload
6. 🔧 Wire up Media upload
7. 🔧 Wire up Sparkle upload
8. 🔧 Add database insert logic for all

### LOW PRIORITY (Enhancement):
9. 🔧 Add sync engine for all modules
10. 🔧 Fix user panel loading for all modules

---

## 🧪 TESTING PLAN

### Test 1: Banner Publish/Unpublish
1. Upload banner with banner_type = "wallpaper"
2. Click publish button
3. Check console for errors
4. Verify publish_status changes in database
5. Check sync engine logs

### Test 2: Wallpaper Upload
1. Upload wallpaper
2. Check storage bucket
3. Verify database entry
4. Check sync engine trigger
5. Verify shows in user panel

### Test 3: Photos/Media/Sparkle
1. Try upload in each module
2. Verify storage upload
3. Check database entry
4. Confirm sync trigger

---

## 🚨 CRITICAL BLOCKERS

### Blocker 1: CORS Errors
**Status:** ✅ RESOLVED (PATCH already in allowMethods)

### Blocker 2: Publish Not Working
**Status:** ⏳ TESTING NEEDED
- Endpoint exists ✅
- CORS configured ✅
- Need to test actual publish button

### Blocker 3: Banner Type Manual Entry
**Status:** 🔧 FIXING NOW (adding dropdown)

### Blocker 4: Other Modules Not Working
**Status:** 🔧 NEXT PRIORITY

---

## 📁 FILES BEING MODIFIED

### Backend:
1. `/supabase/functions/server/index.tsx` - ✅ CORS done
2. `/supabase/functions/server/api-routes.tsx` - 🔧 Adding upload functions
3. `/supabase/functions/server/storage-init.tsx` - 🔧 Verify buckets

### Frontend Admin:
4. `/components/admin/UploadModal.tsx` - 🔧 Add banner_type dropdown
5. `/components/admin/AdminPhotosManager.tsx` - 🔧 Wire upload
6. `/components/admin/AdminMediaManager.tsx` - 🔧 Wire upload
7. `/components/admin/AdminSparkleManager.tsx` - 🔧 Wire upload

### Frontend User:
8. `/utils/api/client.ts` - ⏳ Add fetch functions if needed

---

## ✅ SUCCESS CRITERIA

### Admin Panel:
- [✅] Upload banner → stores in DB
- [⏳] Publish banner → publish_status = "published"
- [⏳] Banner has banner_type dropdown
- [⏳] Upload photo → stores in DB
- [⏳] Upload media → stores in DB
- [⏳] Upload sparkle → stores in DB
- [⏳] All uploads trigger sync

### User Panel:
- [⏳] Wallpaper page loads
- [⏳] Banner carousel shows
- [⏳] Wallpaper grid shows
- [⏳] Media plays
- [⏳] Sparkle loads

---

**NEXT STEPS:** Implement Part 3 (banner_type dropdown) and test publish workflow

**Last Updated:** Nov 25, 2024
