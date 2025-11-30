# 🚀 Database Setup Instructions

## Quick Setup (5 minutes)

Your Admin Panel needs database tables to be created in Supabase. Here's how:

### Step 1: Get the SQL Migration File

The complete SQL migration is in the file: **`QUICK_SETUP.sql`** (in the project root)

### Step 2: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 3: Run the Migration

1. Open the `QUICK_SETUP.sql` file
2. **Copy the entire file contents**
3. Paste into the Supabase SQL Editor
4. Click the **"RUN"** button (or press Ctrl+Enter)
5. Wait for the success message

### Step 4: Verify Setup

1. Return to your Admin Panel
2. Click the **"Check Status"** button
3. You should see all tables marked as ready ✅

---

## What Gets Created?

The migration creates:

- ✅ **12 Database Tables**:
  - `categories` - Content categories
  - `banners` - Banner images
  - `wallpapers` - Wallpaper content
  - `media` - Audio/video content
  - `photos` - Photo galleries
  - `sparkle` - News/articles
  - `users_app` - App users
  - `ai_chats` - Chat sessions
  - `ai_chat_messages` - Chat history
  - `downloads_log` - Download tracking
  - `likes_log` - Like tracking
  - `admin_activity_log` - Admin actions

- ✅ **Default Categories** (13 pre-configured categories)
- ✅ **Indexes** for fast queries
- ✅ **Triggers** for auto-updating timestamps
- ✅ **Security Policies** (Row Level Security)
- ✅ **Helper Functions** for counters

---

## Troubleshooting

### ❌ "Could not find the table 'public.banners' in the schema cache"

**Solution**: You haven't run the SQL migration yet. Follow the steps above.

### ❌ SQL Error when running migration

**Solution**: Make sure you're running the SQL in the correct Supabase project. Check your project ID matches.

### ❌ "Permission denied"

**Solution**: Make sure you're logged into Supabase with admin access to your project.

---

## Alternative: Manual Setup via Supabase Migrations

If you prefer to use Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Run the migration
supabase db push
```

---

## Need Help?

If you encounter any issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active
3. Ensure you have the correct Service Role Key in your environment
4. Try the "Check Status" button in the Admin Panel

---

## After Setup

Once the database is set up, you can:

- ✅ Upload banners, wallpapers, photos
- ✅ Add media content (songs, videos)
- ✅ Create Sparkle news articles
- ✅ Manage categories
- ✅ View analytics and user data
- ✅ Monitor storage usage

**Everything is connected and ready to use!** 🎉
