# 🔧 FIX: Database Schema Error

## ❌ ERROR YOU'RE SEEING:
```
Could not find the table 'public.banners' in the schema cache
```

## ✅ SOLUTION (3 Simple Steps):

---

### **STEP 1: You Should See This Orange Box** 👇

When you open the Admin Panel → Banners, you'll now see a **large orange warning box at the top** with:
- ⚠️ "Database Setup Required" title
- Step-by-step instructions
- A copyable SQL script

**If you DON'T see it:**
- Refresh the page
- The error should trigger it to appear automatically

---

### **STEP 2: Click "Open SQL Editor"**

The orange box has a green button that says:
```
🔗 Open SQL Editor
```

Click it! This opens your Supabase dashboard in a new tab.

**Alternative:** Manually go to:
```
https://supabase.com/dashboard/project/lnherrwzjtemrvzahppg/sql
```

---

### **STEP 3: Copy & Run the SQL**

Back in the orange warning box:

1. Click **"Show SQL Migration"**
2. Click the **"Copy"** button (top right of the code block)
3. Go to your Supabase SQL Editor tab
4. **Paste** the SQL
5. Click **"RUN"** (bottom right)

You should see:
```
✅ "Database tables created successfully!"
```

---

### **STEP 4: Verify It Worked**

1. Go back to your Admin Panel
2. Click the **"Check Status"** button in the orange box
3. You should see:
   ```
   ✅ Database Ready!
   All required tables are set up and ready to use.
   ```
4. The orange box disappears
5. The **"Upload Banner"** button is now enabled

---

## 📋 WHAT THE SQL CREATES:

The migration creates these tables:
- ✅ `categories` - For organizing content
- ✅ `banners` - Carousel images
- ✅ `wallpapers` - Photo/video gallery
- ✅ `media` - Audio/video/YouTube
- ✅ `photos` - Photo gallery
- ✅ `sparkle` - News/articles

Plus 6 default categories ready to use!

---

## 🎯 QUICK SQL (Copy This):

If you want to copy the SQL directly, here it is:

```sql
-- MURUGAN APP DATABASE SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallpapers table  
CREATE TABLE IF NOT EXISTS wallpapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  is_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  youtube_id TEXT,
  youtube_url TEXT,
  storage_path TEXT,
  artist TEXT,
  duration INTEGER,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sparkle table
CREATE TABLE IF NOT EXISTS sparkle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  content_json JSONB,
  cover_image_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  author TEXT,
  category_id UUID REFERENCES categories(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  read_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, type, icon, color) VALUES
  ('Festivals', 'festivals', 'banner', '🎉', '#FF6B6B'),
  ('Temples', 'temples', 'banner', '🛕', '#4ECDC4'),
  ('Lord Murugan', 'lord-murugan', 'wallpaper', '🙏', '#FFD93D'),
  ('Devotional Songs', 'devotional-songs', 'media', '🎵', '#F72585'),
  ('Temple Photos', 'temple-photos', 'photo', '📸', '#3A0CA3'),
  ('Festival News', 'festival-news', 'sparkle', '📰', '#4CC9F0')
ON CONFLICT (slug) DO NOTHING;

SELECT 'Database tables created successfully!' as message;
```

---

## ✅ AFTER SETUP:

Once the SQL runs successfully:

1. ✅ Orange warning disappears
2. ✅ "Upload Banner" button works
3. ✅ Upload modal opens
4. ✅ Select image file
5. ✅ Fill in title/description
6. ✅ Click "Upload & Publish"
7. ✅ Banner appears in the grid!

---

## 🆘 TROUBLESHOOTING:

**Q: I don't see the orange warning box**
- Refresh the page
- Make sure you're in Admin Panel → Banners
- Check browser console for errors

**Q: SQL Editor won't open**
- Manually go to: https://supabase.com/dashboard
- Login
- Select your project
- Go to SQL Editor (left sidebar)

**Q: SQL gave an error**
- Make sure you copied the ENTIRE SQL script
- Check if tables already exist (you may see "already exists" - that's OK!)
- Try running each table creation separately

**Q: Still getting errors after running SQL**
- Click "Check Status" button
- Wait 10 seconds
- Click the refresh button (circular arrow icon)
- The tables might need a moment to register

**Q: Upload button is still disabled**
- Click "Check Status"
- Look at the table status - all should show ✓
- Refresh the entire page

---

## 📸 VISUAL GUIDE:

### What You'll See:

**BEFORE (Error State):**
```
🔴 Error toast: "Database tables not found"
📋 Orange warning box at top
🚫 Upload button is disabled/grayed out
```

**AFTER (Success State):**
```
✅ Green message: "Database Ready!"
🟢 Upload button is enabled (bright green)
📊 Stats showing 0 banners (ready to upload!)
```

---

## 🎉 YOU'RE DONE!

After following these steps:
- Database is fully set up
- All upload functionality works
- Ready to upload banners, wallpapers, media, photos, and articles
- Real-time sync between Admin Panel and User App

வேல் முருகா! 🙏
