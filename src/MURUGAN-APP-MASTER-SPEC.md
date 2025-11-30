# MURUGAN APP — MASTER SPECIFICATION  
### THE OFFICIAL STANDARD FOR ADMIN PANEL • BACKEND • USER APP  
### Version 1.0 — Unified Architecture

---

# 🔥 PURPOSE
This document fixes ALL conflicts between:

- Admin Panel (Figma Make frontend)
- Supabase Database
- Edge Functions / Backend
- User Mobile App (Figma Make frontend)

This standardizes naming, schema, API behavior, storage structure, and UI fetch logic.

This avoids all problems like:

- Wallpaper banners showing as "home"
- Admin uploads not reflecting in User App
- Wrong API calls
- Missing banner carousel
- Broken pagination
- Storage path mismatch
- CORS errors
- Wrong banner types

---

# 🧠 SECTION 1 — DATABASE SCHEMA (FINALIZED)

## ✔ Table: `banners`

| field         | type               | description                                |
|---------------|--------------------|--------------------------------------------|
| id            | uuid (PK)          | primary key                                |
| title         | text               | banner title                               |
| description   | text               | optional subtitle                           |
| image_url     | text               | full image storage URL                      |
| thumbnail_url | text               | optimized thumbnail                         |
| banner_type   | banner_type_enum   | **STRICT ENUM** value                       |
| status        | text               | "published" | "draft"                        |
| published_at  | timestamp          | auto-set when published                     |
| order_index   | integer            | sort order                                   |
| metadata      | jsonb              | extra fields                                 |
| created_at    | timestamp          | created                                      |

## ✔ ENUM: `banner_type_enum`

Allowed values:

```
home
wallpaper
songs
photos
spark
temple
```

⚠ No uppercase  
⚠ No spaces  
⚠ No plural confusion  

---

# 🔥 SECTION 2 — ADMIN PANEL (UPLOAD MODAL)

## ✔ Admin must only send **correct enum values**:

```ts
banner_type: "wallpaper" | "home" | "songs" | "photos" | "spark" | "temple"
```

### Admin Upload Modal Values:

```ts
<Button data-type="home">Home Banner</Button>
<Button data-type="wallpaper">Wallpaper Banner</Button>
<Button data-type="songs">Songs Banner</Button>
<Button data-type="photos">Photos Banner</Button>
<Button data-type="spark">Spark Banner</Button>
<Button data-type="temple">Temple Banner</Button>
```

## ✔ Admin must send this payload:

```ts
{
  title,
  description,
  banner_type,
  status: "published",
  order_index,
  image_url,
  thumbnail_url
}
```

---

# 🔥 SECTION 3 — EDGE FUNCTION (Back End)

### In the banner API:

Replace:

```ts
select("*, type, status")
```

With:

```ts
select("*, banner_type as type, status")
```

### Validate incoming type:

```ts
const allowed = ["home","wallpaper","songs","photos","spark","temple"];
if (!allowed.includes(body.banner_type)) {
  body.banner_type = "home";
}
```

### API Response Format:

```ts
{
  id,
  title,
  type: banner_type,
  status,
  image_url,
  thumbnail_url,
  order_index
}
```

---

# 🔥 SECTION 4 — USER APP (FRONTEND)

## ✔ Correct API to fetch wallpaper banners:

```ts
const { data: banners } = await supabase
  .from("banners")
  .select("*, banner_type")
  .eq("banner_type", "wallpaper")
  .eq("status", "published")
  .order("order_index");
```

## ✔ DO NOT fetch from:
```
/wallpapers/list
/sparkle/list
/banners?type=wallpaper
/wallpaper_banners
```

Those are old and incorrect.

---

# 🔥 SECTION 5 — CAROUSEL COMPONENT

Correct usage:

```tsx
<BannerCarousel images={banners} />
```

Not:

```tsx
<Carousel images={wallpapers} />
```

Not:

```tsx
<Carousel images={homeBanners} />
```

---

# 🔥 SECTION 6 — STORAGE STRUCTURE

Files uploaded to Supabase Storage MUST follow:

```
/banners/{banner_id}/large.webp
/banners/{banner_id}/medium.webp
/banners/{banner_id}/small.webp
/banners/{banner_id}/thumb.webp
```

User App must load:

```ts
const url = supabase.storage
  .from("banners")
  .getPublicUrl(banner.image_url).data.publicUrl;
```

---

# 🔥 SECTION 7 — SYNC ENGINE

User app must subscribe:

```ts
syncEngine.subscribeToCollection("banners", handleBannerUpdates);
```

Collections list:

```ts
["banners", "wallpapers", "media", "photos", "sparkles"]
```

---

# 🔥 SECTION 8 — TESTING CHECKLIST

### When uploading a wallpaper banner:
1. Upload from Admin Panel ✔  
2. Check Supabase table: banner_type=wallpaper ✔  
3. Check status=published ✔  
4. Check image_url exists ✔  
5. Check storage URL loads in browser ✔  
6. User App → console.log banners fetched ✔  
7. Carousel renders ✔  
8. No more "home" type conflicts ✔  

---

# 🔥 SECTION 9 — RULES TO PREVENT FUTURE CONFLICTS

### 1. NEVER create a new type without adding it to the ENUM  
### 2. NEVER call APIs like `/wallpapers/list`  
### 3. ALWAYS return `banner_type AS type` in API  
### 4. ALWAYS validate type server-side  
### 5. ALWAYS restrict admin upload to fixed allowed values  
### 6. ALWAYS check storage URL before rendering  
### 7. ALWAYS keep Admin + Backend + User fields the same  
### 8. NEVER rename column without updating user app
### 9. NEVER allow free text input for types  
### 10. ALWAYS run this checklist before new modules

---

# 🔥 SECTION 10 — WHAT TO DO IF ADDING NEW MODULE

Add new enum:

```
ALTER TYPE banner_type_enum ADD VALUE 'newtype';
```

Add new button in Admin:

```ts
<Button data-type="newtype">New Type Banner</Button>
```

Add fetch rule in User App:

```ts
eq("banner_type", "newtype")
```

---

# END OF MASTER SPEC  
This document must be saved as:

**MURUGAN-APP-MASTER-SPEC.md**

Use this file to generate consistent code and avoid all future conflicts.
