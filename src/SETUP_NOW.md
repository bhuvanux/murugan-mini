# 🚨 SETUP REQUIRED - READ THIS FIRST! 

## ⚠️ Error You're Seeing

```
Error loading media: {
  "code": "PGRST205",
  "message": "Could not find the table 'public.media' in the schema cache"
}
```

**What this means:** The database tables haven't been created yet.

---

## ✅ Quick Fix (2 Minutes)

Follow these 3 simple steps:

### **Step 1: Copy SQL** 
Click the "Copy SQL" button in the app's setup guide, OR copy this:

```sql
-- Create media table
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploader TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration_seconds INTEGER,
  downloadable BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  downloaded BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, media_id)
);

-- Create increment_views function
CREATE OR REPLACE FUNCTION increment_views(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE media
  SET views = views + 1
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON media;
DROP POLICY IF EXISTS "Users can read own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;

-- Create policies
CREATE POLICY "Public read access" ON media FOR SELECT USING (true);
CREATE POLICY "Users can read own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);
```

### **Step 2: Run in Supabase**

1. Go to https://supabase.com/dashboard
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New Query"**
4. **Paste the SQL** from Step 1
5. Click **"Run"** (or Ctrl+Enter)
6. Wait for success message: "Success. No rows returned"

### **Step 3: Reload App**

1. Go back to the app
2. Click "Test Connection" to verify
3. **Reload the page (F5)**
4. Done! ✅

---

## 🎉 After Setup

Once setup is complete:

1. **Login** using email/password (testing mode)
2. Go to **Profile → Admin: Upload Media**
3. Click **"Load Sample Data"** to get 10 beautiful devotional images instantly
4. Or upload your own content!

---

## 🆘 Need Help?

**The app now has a built-in setup guide!**

- Look for the **red warning banner** in the app
- Click **"🚀 Start Setup (Required)"** button
- Follow the step-by-step visual guide
- Use the "Copy SQL" button for easy copying
- Use "Test Connection" to verify success

**Still stuck?**
- Check `QUICK_START_GUIDE.md` for detailed instructions
- Check `ERROR_FIXES.md` for troubleshooting
- Check browser console (F12) for detailed error messages

---

## 📋 What We Fixed

✅ **Graceful error handling** - App doesn't crash when tables are missing  
✅ **Visual warnings** - Big red banner shows when setup is needed  
✅ **Auto-detection** - App detects missing tables automatically  
✅ **Setup guide** - Built-in popup with copy-paste SQL  
✅ **Test connection** - Verify your setup instantly  
✅ **Help everywhere** - Access setup guide from Profile screen  

---

## 🔥 Bottom Line

**The app won't work until you create the database tables.**

This is a **ONE-TIME** setup that takes **2 minutes**.

Just copy the SQL, paste it in Supabase SQL Editor, click Run, and reload the app!

---

**Made with devotion for Lord Murugan** 🕉️  
**Questions?** support@tamilkadavulmurugan.com
