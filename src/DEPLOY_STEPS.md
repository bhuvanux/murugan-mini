# 🚀 DEPLOYMENT STEPS

## ✅ STEP 1: Fix Wallpapers API (DONE ✓)

All code changes complete:
- ✅ Backend accepts POST only
- ✅ OPTIONS handler added
- ✅ CORS headers added
- ✅ Frontend uses POST
- ✅ Mobile app NO auth
- ✅ Admin uses ADMIN_JWT

---

## 🔧 STEP 2: Set ADMIN_JWT

**Option A: If you have Supabase service_role key:**

1. Open browser console in Figma Make
2. Run:
```javascript
localStorage.setItem("ADMIN_JWT", "YOUR_SUPABASE_SERVICE_ROLE_KEY");
```

**Get service_role key:**
- Go to: https://supabase.com/dashboard/project/xgqtycssifmpfbxmqzri
- Settings → API
- Copy `service_role` secret (NOT anon key)

**Option B: If you don't have the key:**

The app will work without ADMIN_JWT in mobile mode. ADMIN_JWT is only needed for admin panel operations.

---

## 🧪 STEP 3: Verify the Fix

### Test in User Panel (Mobile App):

1. **Reload Figma Make**
2. **Open User Panel** (not Admin Panel)
3. **Navigate to Photos tab**
4. **Open browser console (F12)**

**Expected Console Output:**
```
[UserAPI] MOBILE MODE - POST /wallpapers/list { page: 1, limit: 20 }
[User Wallpapers] POST request - Fetching published wallpapers...
[User Wallpapers] Body params: page=1, limit=20, search=none
[User Wallpapers] Found X wallpapers (page 1, total X)
[EdgeFunction] CORS OK
[UserAPI] Admin backend response: { success: true, dataLength: X }
```

### Check Network Tab:

1. **Open DevTools → Network tab**
2. **Look for request to `/wallpapers/list`**
3. **Verify:**
   - Method: POST
   - Status: 200 OK
   - Response Headers include:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`

### Success Signs:

✅ **No CORS errors**  
✅ **Console shows "CORS OK"**  
✅ **Wallpapers load in grid**  
✅ **Network tab shows POST 200**  

---

## 🚨 TROUBLESHOOTING

### If you see CORS 508 error:

**This means Edge Function is not deployed or not responding.**

**Quick Fix:**
The app will automatically use demo wallpapers as fallback. You'll see:
```
[UserAPI] Backend unavailable - using demo data for offline browsing
```

This is expected if the Edge Function isn't deployed yet.

### If you see "No wallpapers found":

**This means the database table is empty.**

**Options:**
1. Upload wallpapers via Admin Panel
2. The table hasn't been created yet
3. All wallpapers are in "draft" status (not "published")

### If you see 401 Unauthorized:

**This shouldn't happen in mobile app.**

If it does:
1. Check network tab - is Authorization header being sent? (it shouldn't be)
2. Clear browser cache
3. Check if ADMIN_JWT is somehow leaking to mobile requests

---

## 📊 WHAT HAPPENS NOW?

### Scenario A: Edge Function Deployed + Database Has Wallpapers

✅ **User Panel loads real wallpapers from database**  
✅ **Console shows: "Found 25 wallpapers"**  
✅ **Users can browse uploaded content**  

### Scenario B: Edge Function NOT Deployed OR Database Empty

✅ **User Panel loads 12 demo wallpapers as fallback**  
✅ **Console shows: "Backend unavailable - using demo data"**  
✅ **Users can still browse demo content**  
✅ **App doesn't break - graceful fallback**  

---

## 🎯 FINAL VERIFICATION

After completing Step 2, verify these in console:

```
✅ [UserAPI] MOBILE MODE - POST /wallpapers/list
✅ [EdgeFunction] CORS OK
✅ No CORS errors
✅ Wallpapers visible in grid
```

If all 4 show up → **SUCCESS! Fix is working.**

---

## 📝 SUMMARY

| Step | Status | Action |
|------|--------|--------|
| 1. Fix Code | ✅ DONE | Backend + Frontend updated |
| 2. Set JWT | ⏳ YOUR ACTION | Run localStorage command |
| 3. Verify | ⏳ YOUR ACTION | Check console logs |

---

**Ready to test!** Just complete Step 2 and reload the app. 🚀

**Last Updated:** November 25, 2024
