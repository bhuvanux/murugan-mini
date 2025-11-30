# 📋 Quick Reference - Folders & Analytics

## 🚀 3-Minute Setup

1. **Database**: Copy SQL from `DATABASE_SETUP_FOLDERS_ANALYTICS.sql` → Paste in Supabase SQL Editor → Run
2. **Verify**: Refresh Admin Panel → See folder sidebar + analytics icons
3. **Test**: Create folder → Click analytics icon → Done!

---

## 📁 Folder Management

### Create Folder
```typescript
Click "New Folder" button → Enter name & description → Save
```

### Edit Folder
```typescript
Hover over folder → Click ✏️ icon → Update → Save
```

### Delete Folder
```typescript
Hover over folder → Click 🗑️ icon → Confirm
// Wallpapers automatically move to "uncategorized"
```

### Filter by Folder
```typescript
Click folder name → Wallpapers filter to that folder
Click "All Folders" → Show all wallpapers
```

---

## 📊 Analytics

### View Analytics
```typescript
Click blue chart icon (📊) on any wallpaper card
→ Drawer slides in from right
→ Shows all metrics, charts, and insights
```

### Metrics Available
- **Views**: Total, Today, Week, Month
- **Downloads**: Total, Today, Week, Month  
- **Likes**: Total
- **Shares**: Total
- **Conversion Rate**: Downloads ÷ Views %
- **Engagement Rate**: (Likes + Shares) ÷ Views %
- **Daily Stats**: Last 7 days chart
- **Peak Hours**: Top 5 most active hours
- **Locations**: Top regions (if tracked)

### Close Analytics
```typescript
Click ✕ button OR Click overlay OR Press ESC
```

---

## 🔌 API Endpoints

### Folders
```bash
# List all folders
GET /make-server-4a075ebc/api/wallpaper-folders

# Create folder
POST /make-server-4a075ebc/api/wallpaper-folders
Body: { name: "Folder Name", description: "..." }

# Update folder
PUT /make-server-4a075ebc/api/wallpaper-folders/:id
Body: { name: "Updated Name", description: "..." }

# Delete folder
DELETE /make-server-4a075ebc/api/wallpaper-folders/:id
```

### Analytics
```bash
# Get wallpaper analytics
GET /make-server-4a075ebc/api/wallpapers/:id/analytics

# Track event (for user app)
POST /make-server-4a075ebc/api/wallpapers/:id/track
Body: { event_type: "view|download|like|share", metadata: {} }
```

---

## 🗄️ Database Tables

### `wallpaper_folders`
```sql
id           UUID PRIMARY KEY
name         TEXT NOT NULL
description  TEXT
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### `wallpaper_analytics`
```sql
id            UUID PRIMARY KEY
wallpaper_id  UUID (FK → wallpapers)
event_type    TEXT ('view'|'download'|'like'|'share')
user_id       UUID
session_id    TEXT
metadata      JSONB
created_at    TIMESTAMPTZ
```

### `wallpapers` (new columns)
```sql
folder_id       UUID (FK → wallpaper_folders)
view_count      INTEGER DEFAULT 0
download_count  INTEGER DEFAULT 0
like_count      INTEGER DEFAULT 0
share_count     INTEGER DEFAULT 0
```

---

## 🎨 Component Files

### Frontend
- `/components/admin/FolderManager.tsx` - Folder sidebar
- `/components/admin/WallpaperAnalyticsDrawer.tsx` - Analytics drawer
- `/components/admin/AdminWallpaperManager.tsx` - Main manager (updated)

### Backend
- `/supabase/functions/server/wallpaper-folders-analytics.tsx` - Handlers
- `/supabase/functions/server/index.tsx` - Routes (updated)

---

## 🎯 Key Visual Elements

### Folder Sidebar (Left, 320px)
- White background
- Green "New Folder" button
- Folder list with counts
- Green background when selected
- Edit/delete icons on hover

### Wallpaper Cards
- **NEW**: Blue analytics icon (📊) on left
- Publish/unpublish button in middle
- Delete button on right
- Stats: views, downloads, likes

### Analytics Drawer (Right, 500px)
- Slides in from right
- Wallpaper thumbnail at top
- Large metric cards with icons
- Line chart for daily stats
- Peak hours and locations

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No folder sidebar | Refresh page, check console errors |
| Analytics drawer empty | Check SQL was run, verify functions exist |
| Can't create folder | Verify permissions: `GRANT ALL ON wallpaper_folders TO service_role;` |
| Wallpapers not filtering | Check `folder_id` column exists on wallpapers table |
| Charts not rendering | Ensure Recharts is available, check data format |

---

## ✅ Verification Queries

Run in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wallpaper_folders', 'wallpaper_analytics');

-- Check wallpapers has folder_id
SELECT column_name FROM information_schema.columns
WHERE table_name = 'wallpapers' AND column_name = 'folder_id';

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE 'increment_wallpaper_%';

-- Expected: 2 tables, 1 column, 4 functions
```

---

## 📊 Usage Examples

### Track View Event
```typescript
await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpapers/${wallpaperId}/track`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  },
  body: JSON.stringify({
    event_type: 'view',
    metadata: {
      location: 'Homepage',
      device: 'mobile'
    }
  })
});
```

### Get Analytics Data
```typescript
const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpapers/${wallpaperId}/analytics`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
  }
});
const result = await response.json();
console.log(result.data); // All metrics
```

---

## 🔗 Quick Links

- **Setup Guide**: `/FOLDERS_ANALYTICS_SETUP_GUIDE.md`
- **Database SQL**: `/DATABASE_SETUP_FOLDERS_ANALYTICS.sql`
- **Visual Checklist**: `/VISUAL_VERIFICATION_CHECKLIST.md`
- **This Reference**: `/QUICK_REFERENCE.md`

---

## 🎊 Features Summary

✅ Folder Management with CRUD
✅ Sidebar Navigation (320px)
✅ Wallpaper Filtering by Folder
✅ Individual Wallpaper Analytics
✅ Analytics Drawer (500px)
✅ Comprehensive Metrics
✅ Charts & Visualizations
✅ Peak Hours Analysis
✅ Location Tracking
✅ Event Tracking API
✅ Atomic Counter Increments
✅ Beautiful Green Theme UI
✅ Smooth Animations
✅ Mobile Responsive
✅ Full Documentation

**Total Lines of Code**: ~2,000+
**Tables**: 2 new (folders, analytics)
**API Endpoints**: 6 new
**Components**: 2 new, 1 updated
**Functions**: 4 database functions

---

**Status**: ✅ PRODUCTION READY

All features are fully implemented, tested, and documented. Ready to use!

