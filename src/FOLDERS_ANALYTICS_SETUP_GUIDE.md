# 📁 Wallpaper Folders & Analytics - Complete Setup Guide

## 🎯 Overview

This guide will help you set up the complete folder management and analytics system for your Murugan Wallpapers Admin Panel. The system includes:

- ✅ **Folder Management**: Organize wallpapers into folders/categories
- ✅ **Folder Sidebar**: Beautiful sidebar with create/edit/delete functionality
- ✅ **Individual Analytics**: Detailed analytics for each wallpaper
- ✅ **Analytics Drawer**: Slide-in drawer with charts, metrics, and insights
- ✅ **Backend APIs**: Complete REST API for folders and analytics
- ✅ **Database Tables**: Proper schema with indexes and triggers

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create Database Tables

1. Open your **Supabase Dashboard** (Admin backend project)
2. Go to **SQL Editor** in the sidebar
3. Copy **ALL** the SQL from `/DATABASE_SETUP_FOLDERS_ANALYTICS.sql`
4. Paste into SQL Editor and click **Run**
5. ✅ Check that you see "Success. No rows returned"

### Step 2: Verify Setup

Run these queries in SQL Editor to verify:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wallpaper_folders', 'wallpaper_analytics');

-- Check wallpapers has folder_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'wallpapers' AND column_name = 'folder_id';

-- Check functions were created
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE 'increment_wallpaper_%';
```

✅ **Expected Results:**
- 2 tables: `wallpaper_folders`, `wallpaper_analytics`
- 1 column: `folder_id`
- 4 functions: increment views, downloads, likes, shares

### Step 3: Test in Admin Panel

1. Open your Admin Panel
2. Navigate to **Wallpapers** module
3. You should see:
   - **Left sidebar** with folders
   - **Blue analytics icon (📊)** on each wallpaper card
4. Try:
   - ✅ Click "New Folder" to create a folder
   - ✅ Click a folder to filter wallpapers
   - ✅ Click the analytics icon to view detailed metrics

---

## 📊 Features Breakdown

### 1. Folder Management Sidebar

**Location**: Left side of Wallpapers page (320px wide)

**Features**:
- 📁 Create new folders with name & description
- ✏️ Edit existing folders
- 🗑️ Delete folders (wallpapers are moved to "uncategorized")
- 🔢 Shows wallpaper count per folder
- 🎨 Green theme matching your app

**Usage**:
```typescript
// Folders are automatically loaded on page load
// Click "New Folder" button → Enter name & description → Save
// Click folder name → Wallpapers filter by folder
// Click edit icon → Update folder details
// Click delete icon → Confirm deletion
```

### 2. Individual Wallpaper Analytics

**Location**: Click the **blue chart icon (📊)** on any wallpaper card

**Metrics Shown**:
- 👁️ **Total Views** (all-time + today + week + month)
- 📥 **Total Downloads** (all-time + today + week + month)
- ❤️ **Total Likes** (all-time)
- 📤 **Total Shares**
- 📈 **Conversion Rate** (downloads / views %)
- 💚 **Engagement Rate** ((likes + shares) / views %)
- 📅 **Last 7 Days Chart** (line chart with views/downloads/likes)
- ⏰ **Peak Hours** (top 5 hours with most activity)
- 🌍 **Top Locations** (if location tracking is enabled)
- 🕐 **Last Interaction** timestamp

**Technical Details**:
- Analytics data is stored in `wallpaper_analytics` table
- Events: `view`, `download`, `like`, `share`
- Analytics drawer slides in from right (500px wide)
- Charts powered by **Recharts** library
- Data refreshes automatically when drawer opens

### 3. Backend API Endpoints

All endpoints use the admin backend Supabase project.

#### Folder Endpoints

```bash
# Get all folders
GET /api/wallpaper-folders
Response: { success: true, data: [{ id, name, description, wallpaper_count, created_at }] }

# Create folder
POST /api/wallpaper-folders
Body: { name: "Temple Wallpapers", description: "..." }
Response: { success: true, data: { id, name, description } }

# Update folder
PUT /api/wallpaper-folders/:id
Body: { name: "Updated Name", description: "..." }
Response: { success: true, data: { id, name, description } }

# Delete folder
DELETE /api/wallpaper-folders/:id
Response: { success: true }
```

#### Analytics Endpoints

```bash
# Get wallpaper analytics
GET /api/wallpapers/:id/analytics
Response: {
  success: true,
  data: {
    wallpaper_id, title, image_url,
    total_views, total_downloads, total_likes, total_shares,
    views_today, views_week, views_month,
    downloads_today, downloads_week, downloads_month,
    conversion_rate, engagement_rate,
    daily_stats: [{ date, views, downloads, likes }],
    peak_hours: [{ hour, activity_count }],
    top_locations: [{ location, count }],
    created_at, last_interaction
  }
}

# Track event (internal use by user app)
POST /api/wallpapers/:id/track
Body: { event_type: "view" | "download" | "like" | "share", metadata: {} }
Response: { success: true }
```

---

## 🗄️ Database Schema

### `wallpaper_folders` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Folder name (required) |
| `description` | TEXT | Optional description |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### `wallpaper_analytics` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `wallpaper_id` | UUID | Foreign key to wallpapers |
| `event_type` | TEXT | 'view', 'download', 'like', 'share' |
| `user_id` | UUID | Optional user identifier |
| `session_id` | TEXT | Optional session identifier |
| `metadata` | JSONB | Additional event data (location, device, etc.) |
| `created_at` | TIMESTAMPTZ | Event timestamp |

**Indexes**: Optimized for fast queries on wallpaper_id, event_type, and created_at

### `wallpapers` Table Updates

Added columns:
- `folder_id` (UUID) - Links to wallpaper_folders table
- `view_count` (INTEGER) - Counter for total views
- `download_count` (INTEGER) - Counter for total downloads
- `like_count` (INTEGER) - Counter for total likes
- `share_count` (INTEGER) - Counter for total shares

### Database Functions

- `increment_wallpaper_views(wallpaper_id UUID)` - Atomically increment view count
- `increment_wallpaper_downloads(wallpaper_id UUID)` - Atomically increment download count
- `increment_wallpaper_likes(wallpaper_id UUID)` - Atomically increment like count
- `increment_wallpaper_shares(wallpaper_id UUID)` - Atomically increment share count

---

## 🔧 Technical Implementation

### Frontend Components

1. **`/components/admin/FolderManager.tsx`**
   - Folder sidebar with CRUD operations
   - State management for selected folder
   - Create/edit modal with form validation

2. **`/components/admin/WallpaperAnalyticsDrawer.tsx`**
   - Analytics drawer that slides in from right
   - Fetches analytics data from API
   - Displays metrics, charts, and insights
   - Uses Recharts for data visualization

3. **`/components/admin/AdminWallpaperManager.tsx`** (Updated)
   - Integrated folder sidebar on left
   - Added analytics icon to each wallpaper card
   - Handles folder filtering
   - Opens analytics drawer on icon click

### Backend Files

1. **`/supabase/functions/server/wallpaper-folders-analytics.tsx`**
   - All folder CRUD handlers
   - Analytics data aggregation logic
   - Event tracking handler

2. **`/supabase/functions/server/index.tsx`** (Updated)
   - Imported and mounted folder/analytics routes
   - Routes: `/api/wallpaper-folders`, `/api/wallpapers/:id/analytics`

---

## 🎨 UI/UX Details

### Folder Sidebar
- **Width**: 320px fixed
- **Background**: White with subtle shadow
- **Active state**: Green background (#0d5e38)
- **Icons**: Folder, Edit, Trash icons from lucide-react
- **Modal**: Green-themed create/edit modal with validation

### Analytics Drawer
- **Width**: 500px from right side
- **Overlay**: Semi-transparent backdrop (backdrop-blur)
- **Animation**: Smooth slide-in transition
- **Charts**: Line chart for daily stats (green theme)
- **Metrics**: Large numbers with icons and labels
- **Peak Hours**: Bar display with time labels
- **Responsive**: Scales on smaller screens

### Wallpaper Card Updates
- **New Icon**: Blue analytics icon (BarChart3)
- **Position**: Left side of action buttons
- **Hover**: Darker blue background
- **Click**: Opens analytics drawer immediately

---

## 🚦 Testing Checklist

### Folders
- [ ] Create a new folder → Appears in sidebar
- [ ] Edit folder name → Updates immediately
- [ ] Delete folder → Wallpapers move to uncategorized
- [ ] Click folder → Wallpapers filter correctly
- [ ] Click "All Folders" → Shows all wallpapers
- [ ] Folder count updates when wallpapers added/removed

### Analytics
- [ ] Click analytics icon → Drawer opens
- [ ] Metrics display correctly (views, downloads, likes)
- [ ] Daily stats chart renders with data
- [ ] Conversion and engagement rates calculated
- [ ] Peak hours display top 5 hours
- [ ] Close button works → Drawer closes smoothly
- [ ] Click outside drawer → Drawer closes

### API
- [ ] GET /api/wallpaper-folders → Returns folders
- [ ] POST /api/wallpaper-folders → Creates folder
- [ ] PUT /api/wallpaper-folders/:id → Updates folder
- [ ] DELETE /api/wallpaper-folders/:id → Deletes folder
- [ ] GET /api/wallpapers/:id/analytics → Returns analytics data
- [ ] POST /api/wallpapers/:id/track → Records event

---

## 🐛 Troubleshooting

### Issue: "Folders not showing"
**Solution**: 
1. Check SQL was run in correct Supabase project (Admin backend)
2. Verify `wallpaper_folders` table exists: `SELECT * FROM wallpaper_folders LIMIT 1;`
3. Check browser console for API errors
4. Verify Supabase URL and ANON_KEY in frontend

### Issue: "Analytics drawer is empty"
**Solution**:
1. Check `wallpaper_analytics` table exists
2. Verify increment functions were created
3. Try tracking a manual event: 
   ```sql
   INSERT INTO wallpaper_analytics (wallpaper_id, event_type) 
   VALUES ('your-wallpaper-id', 'view');
   ```
4. Refresh analytics drawer

### Issue: "Cannot create folder - 500 error"
**Solution**:
1. Check Supabase function logs in Dashboard
2. Verify service_role permissions: `GRANT ALL ON wallpaper_folders TO service_role;`
3. Check network tab for exact error message
4. Ensure folder name is not empty

### Issue: "Wallpapers not filtering by folder"
**Solution**:
1. Check `folder_id` column exists on wallpapers table
2. Verify wallpapers have folder_id assigned: `SELECT id, title, folder_id FROM wallpapers;`
3. Check AdminWallpaperManager filter logic in console

---

## 📈 Future Enhancements

Potential features to add later:

1. **Batch Operations**
   - Select multiple wallpapers
   - Move to folder in bulk
   - Bulk publish/unpublish

2. **Advanced Analytics**
   - Date range picker (custom time periods)
   - Export analytics to CSV
   - Compare multiple wallpapers
   - User demographics (age, gender, location)
   - Device type breakdown (mobile vs desktop)

3. **Folder Features**
   - Drag & drop wallpapers to folders
   - Nested folders (sub-categories)
   - Folder colors and icons
   - Folder-level analytics (aggregate metrics)
   - Folder sorting options

4. **Real-time Updates**
   - Live analytics updates with WebSocket
   - Real-time folder count updates
   - Collaborative editing indicators

5. **User App Integration**
   - Show folders in user app wallpaper browse
   - Filter by folder in user app
   - "Most Popular" folder based on analytics
   - "Trending" wallpapers based on recent activity

---

## 📞 Support

If you encounter issues:

1. **Check Database**: Run verification queries in SQL Editor
2. **Check Logs**: Open browser DevTools → Console tab
3. **Check Network**: DevTools → Network tab → Look for failed requests
4. **Check Backend**: Supabase Dashboard → Functions → Logs
5. **Rerun SQL**: Sometimes needed after Supabase updates

---

## ✅ Setup Complete!

You now have a fully functional folder management and analytics system. Your Admin Panel can:

- ✅ Organize wallpapers into folders
- ✅ View detailed analytics for each wallpaper
- ✅ Track views, downloads, likes, and shares
- ✅ Analyze engagement with charts and metrics
- ✅ Make data-driven decisions about content

**Next Steps**:
1. Create your first folder
2. Upload some wallpapers
3. Assign wallpapers to folders
4. Track analytics as users interact
5. Use insights to optimize content strategy

---

**Happy Managing! 🎉📊**
