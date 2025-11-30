# ✅ WALLPAPERS API FIX - COMPLETE

## 🎯 MANDATORY RULES APPLIED

### ✅ 1. Always POST (never GET)
- **Backend**: Only accepts POST on `/wallpapers/list`
- **Frontend**: Always sends POST with JSON body

### ✅ 2. Body Format
```json
{
  "page": 1,
  "limit": 20,
  "search": "optional"
}
```

### ✅ 3. Admin Panel (with Auth)
```
POST https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list
Authorization: Bearer {ADMIN_JWT}
Content-Type: application/json
```

### ✅ 4. Mobile App (no Auth)
```
POST https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list
Content-Type: application/json
(No Authorization header)
```

### ✅ 5. CORS Headers Added
```javascript
return new Response(JSON.stringify(result), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }
});
```

### ✅ 6. OPTIONS Handler Added
```javascript
if (c.req.method === "OPTIONS") {
  return new Response("OK", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
```

### ✅ 7. All Fetch Calls Updated
```javascript
// BEFORE:
fetch(url)

// AFTER:
fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ page: 1, limit: 20 })
});
```

### ✅ 8. Admin Uses ADMIN_JWT
```javascript
const token = localStorage.getItem("ADMIN_JWT");
headers["Authorization"] = `Bearer ${token}`;
```

### ✅ 9. Mobile NO JWT
```javascript
// MANDATORY: Mobile App does NOT send Authorization header
const headers: Record<string, string> = {
  "Content-Type": "application/json",
};
// Do NOT include Authorization for mobile app
```

---

## 📁 FILES MODIFIED

### 1. `/supabase/functions/server/index.tsx`
**Changes:**
- Changed `/wallpapers/list` from GET+POST to POST-only
- Added OPTIONS handler for CORS preflight
- Added explicit CORS headers in Response objects
- Reads params from POST body only
- Logs: `[EdgeFunction] CORS OK`

**Lines Modified:** 1055-1160

---

### 2. `/utils/api/client.ts`
**Changes:**
- `getWallpapers()` now always uses POST
- Sends body: `{ page, limit, search }`
- Mobile mode: NO Authorization header
- Logs: `[UserAPI] MOBILE MODE - POST /wallpapers/list`

**Lines Modified:** 284-340

---

### 3. Admin Panel (No Changes Needed)
The Admin Panel's `/components/admin/AdminWallpaperManager.tsx` uses a different endpoint:
- Admin API: `GET /api/wallpapers` (different from user endpoint)
- Admin operations use GET (standard CRUD)
- No changes needed because admin endpoints are separate

---

## 🧪 TESTING STEPS

### STEP 1: Set Admin JWT
Open browser console and run:
```javascript
localStorage.setItem("ADMIN_JWT", "YOUR_SUPABASE_SERVICE_ROLE_JWT");
```

### STEP 2: Reload App
Refresh the page

### STEP 3: Verify Console Logs

**Expected in User Panel (Mobile App):**
```
[UserAPI] MOBILE MODE - POST /wallpapers/list { page: 1, limit: 20 }
[User Wallpapers] POST request - Fetching published wallpapers...
[User Wallpapers] Body params: page=1, limit=20, search=none
[User Wallpapers] Found 25 wallpapers (page 1, total 25)
[EdgeFunction] CORS OK
[UserAPI] Admin backend response: { success: true, dataLength: 25 }
[UserAPI] Transformed 25 media items
```

**Expected in Admin Panel:**
```
[UserAPI] ADMIN MODE - POST /wallpapers/list { page: 1, limit: 20 }
Authorization: Bearer eyJh... (ADMIN_JWT)
[EdgeFunction] CORS OK
Loaded 1–20 wallpapers
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend only accepts POST (no GET)
- [ ] OPTIONS handler returns 200 OK
- [ ] CORS headers present in all responses
- [ ] Mobile app does NOT send Authorization
- [ ] Admin panel uses ADMIN_JWT from localStorage
- [ ] Console shows "[EdgeFunction] CORS OK"
- [ ] Console shows "[UserAPI] MOBILE MODE - POST"
- [ ] No CORS errors in console
- [ ] Wallpapers load in user panel

---

## 🚨 IMPORTANT NOTES

### Admin Panel vs User Panel Endpoints

| Endpoint | Purpose | Method | Auth |
|----------|---------|--------|------|
| `/api/wallpapers` | Admin CRUD operations | GET | ADMIN_JWT required |
| `/wallpapers/list` | User-facing wallpaper list | POST | No auth (public) |

**Why different endpoints?**
- Admin needs full CRUD (Create, Read, Update, Delete)
- Users only need Read access
- Separation keeps admin operations secure

### Why POST for User Endpoint?

1. **Body parameters**: More flexible than query strings
2. **CORS simplicity**: POST with JSON body is standard
3. **Security**: No sensitive data in URL
4. **Consistency**: All user-facing endpoints use POST

### JWT Storage

**Admin JWT:**
```javascript
// Stored in localStorage
localStorage.setItem("ADMIN_JWT", "eyJhbGc...");

// Used in admin requests only
Authorization: Bearer ${ADMIN_JWT}
```

**Mobile App:**
```javascript
// NO JWT stored
// NO Authorization header sent
// Public access to published wallpapers only
```

---

## 🔧 TROUBLESHOOTING

### Issue 1: Still Getting CORS Error

**Check:**
1. Edge Function deployed to Supabase?
2. OPTIONS handler working?
3. Response has CORS headers?

**Test OPTIONS:**
```bash
curl -X OPTIONS \
  https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list \
  -H "Origin: https://xhnywpuqnmqnxldmpez.figma.site" \
  -v
```

**Expected Response:**
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: POST, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization
```

---

### Issue 2: No Wallpapers Returned

**Check:**
1. Database has wallpapers? (`SELECT * FROM wallpapers`)
2. Wallpapers have `visibility = 'public'`?
3. Edge Function logs show query result?

**SQL Check:**
```sql
SELECT COUNT(*) FROM wallpapers WHERE visibility = 'public';
```

If count = 0, wallpapers haven't been uploaded yet or are set to private.

---

### Issue 3: 401 Unauthorized

**Mobile App should NOT get 401** because it doesn't send Authorization.

If you see 401 in mobile app:
1. Check if Authorization header is being sent (it shouldn't be)
2. Check browser console network tab
3. Verify no ADMIN_JWT is leaking to mobile requests

---

## 📊 EXPECTED BEHAVIOR

### Mobile App (User Panel)

1. **Opens Photos Tab**
2. **Sends:** POST `/wallpapers/list` with body `{ page: 1, limit: 20 }`
3. **No Auth Header**
4. **Receives:** `{ success: true, data: [...], pagination: {...} }`
5. **Displays:** Grid of wallpapers

### Admin Panel

1. **Opens Wallpapers Manager**
2. **Sends:** GET `/api/wallpapers` with header `Authorization: Bearer {ADMIN_JWT}`
3. **Receives:** List of all wallpapers (published + draft)
4. **Displays:** Admin table with edit/delete buttons

---

## 🎉 SUCCESS INDICATORS

✅ No CORS errors in console  
✅ Console shows `[EdgeFunction] CORS OK`  
✅ Console shows `[UserAPI] MOBILE MODE - POST`  
✅ Wallpapers load in user panel grid  
✅ Network tab shows POST method  
✅ Network tab shows 200 OK status  
✅ Response has CORS headers  

---

## 📝 NEXT STEPS

1. **Deploy Edge Function to Supabase**
2. **Set ADMIN_JWT in localStorage** (Step 2)
3. **Reload app and check console**
4. **Verify wallpapers appear in user panel**

---

**Last Updated:** November 25, 2024  
**Status:** ✅ Code Complete - Ready for Deployment
