# Wallpaper Folders & Analytics Implementation Guide

## Overview
This document provides step-by-step instructions to add folder organization and individual wallpaper analytics to the Admin Panel Wallpapers module.

---

## ✅ COMPLETED COMPONENTS

### 1. Folder Manager Component ✅
**File**: `/components/admin/FolderManager.tsx`

**Features**:
- Create, edit, delete folders
- Display folder list with wallpaper counts
- Select folder to filter wallpapers
- "All Wallpapers" view
- Confirmation dialogs for destructive actions
- Beautiful green (#0d5e38) themed UI

**Usage**:
```tsx
import { FolderManager, WallpaperFolder } from './FolderManager';

<FolderManager
  folders={folders}
  selectedFolder={selectedFolderId}
  onSelectFolder={(id) => setSelectedFolderId(id)}
  onCreateFolder={async (name, desc) => { /* API call */ }}
  onUpdateFolder={async (id, name, desc) => { /* API call */ }}
  onDeleteFolder={async (id) => { /* API call */ }}
  onRefresh={() => loadFolders()}
/>
```

---

### 2. Wallpaper Analytics Drawer ✅
**File**: `/components/admin/WallpaperAnalyticsDrawer.tsx`

**Features**:
- Slide-in drawer from right side
- Key metrics cards (Views, Downloads, Likes, Shares)
- Time-based metrics (Today, Week, Month)
- Conversion & engagement rates
- Last 7 days performance chart
- Peak activity hours
- Top locations
- Wallpaper preview

**Usage**:
```tsx
import { WallpaperAnalyticsDrawer } from './WallpaperAnalyticsDrawer';

<WallpaperAnalyticsDrawer
  wallpaperId={selectedWallpaperId}
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
/>
```

---

### 3. Backend Endpoints ✅
**File**: `/supabase/functions/server/wallpaper-folders-analytics.tsx`

**Endpoints Created**:

#### Folder Management:
- `GET /api/wallpaper-folders` - Get all folders with counts
- `POST /api/wallpaper-folders` - Create new folder
- `PUT /api/wallpaper-folders/:id` - Update folder
- `DELETE /api/wallpaper-folders/:id` - Delete folder (moves wallpapers to uncategorized)

#### Analytics:
- `GET /api/wallpapers/:id/analytics` - Get detailed analytics for a wallpaper
- `POST /api/wallpapers/:id/track` - Track an analytics event

---

## 🔧 BACKEND INTEGRATION REQUIRED

### Step 1: Add Routes to Server

**File to Edit**: `/supabase/functions/server/index.tsx`

**Add after line 1512** (after wallpaper routes):

```typescript
// WALLPAPER FOLDERS & ANALYTICS
import * as wallpaperFoldersAnalytics from \"./wallpaper-folders-analytics.tsx\";
app.get(\"/make-server-4a075ebc/api/wallpaper-folders\", wallpaperFoldersAnalytics.getWallpaperFolders);
app.post(\"/make-server-4a075ebc/api/wallpaper-folders\", wallpaperFoldersAnalytics.createWallpaperFolder);
app.put(\"/make-server-4a075ebc/api/wallpaper-folders/:id\", wallpaperFoldersAnalytics.updateWallpaperFolder);
app.delete(\"/make-server-4a075ebc/api/wallpaper-folders/:id\", wallpaperFoldersAnalytics.deleteWallpaperFolder);
app.get(\"/make-server-4a075ebc/api/wallpapers/:id/analytics\", wallpaperFoldersAnalytics.getWallpaperAnalytics);
app.post(\"/make-server-4a075ebc/api/wallpapers/:id/track\", wallpaperFoldersAnalytics.trackWallpaperEvent);
```

---

## 📊 DATABASE SCHEMA UPDATES

### Required Tables:

#### 1. `wallpaper_folders` Table
```sql
CREATE TABLE wallpaper_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallpaper_folders_created ON wallpaper_folders(created_at);
```

#### 2. Add `folder_id` to `wallpapers` Table
```sql
ALTER TABLE wallpapers 
ADD COLUMN folder_id UUID REFERENCES wallpaper_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_wallpapers_folder ON wallpapers(folder_id);
```

#### 3. `wallpaper_analytics` Table
```sql
CREATE TABLE wallpaper_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallpaper_id UUID NOT NULL REFERENCES wallpapers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'download', 'like', 'share'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallpaper_analytics_wallpaper ON wallpaper_analytics(wallpaper_id);
CREATE INDEX idx_wallpaper_analytics_event ON wallpaper_analytics(event_type);
CREATE INDEX idx_wallpaper_analytics_created ON wallpaper_analytics(created_at);
```

#### 4. Database Functions for Counter Increments
```sql
-- Increment views
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 FRONTEND INTEGRATION

### Step 1: Update AdminWallpaperManager

**File to Edit**: `/components/admin/AdminWallpaperManager.tsx`

Add these imports at the top:
```typescript
import { FolderManager, WallpaperFolder } from "./FolderManager";
import { WallpaperAnalyticsDrawer } from "./WallpaperAnalyticsDrawer";
import { BarChart3 } from "lucide-react";
```

Add state variables:
```typescript
const [folders, setFolders] = useState<WallpaperFolder[]>([]);
const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
const [analyticsWallpaperId, setAnalyticsWallpaperId] = useState<string | null>(null);
const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
```

Add folder loading function:
```typescript
const loadFolders = async () => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    const result = await response.json();
    if (result.success) {
      setFolders(result.data || []);
    }
  } catch (error) {
    console.error("Failed to load folders:", error);
  }
};
```

Add folder CRUD functions:
```typescript
const createFolder = async (name: string, description?: string) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ name, description }),
    }
  );
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
};

const updateFolder = async (folderId: string, name: string, description?: string) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders/${folderId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ name, description }),
    }
  );
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
};

const deleteFolder = async (folderId: string) => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders/${folderId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
};
```

Add analytics handler:
```typescript
const openAnalytics = (wallpaperId: string) => {
  setAnalyticsWallpaperId(wallpaperId);
  setIsAnalyticsOpen(true);
};
```

Update wallpaper cards to include analytics icon:
```typescript
// Add to each wallpaper card
<button
  onClick={() => openAnalytics(wallpaper.id)}
  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
  title="View Analytics"
>
  <BarChart3 className="w-4 h-4" />
</button>
```

---

### Step 2: Update UploadModal for Folder Selection

**File to Edit**: `/components/admin/UploadModal.tsx`

Add folder prop and selection:
```typescript
interface UploadModalProps {
  // ... existing props
  folders?: WallpaperFolder[];
  selectedFolder?: string | null;
}

// Add folder selector in the form
<div>
  <label className="block text-sm text-gray-700 mb-2">
    Folder (Optional)
  </label>
  <select
    value={selectedFolder || ""}
    onChange={(e) => setSelectedFolder(e.target.value || null)}
    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
  >
    <option value="">Uncategorized</option>
    {folders?.map(folder => (
      <option key={folder.id} value={folder.id}>
        {folder.name}
      </option>
    ))}
  </select>
</div>
```

---

### Step 3: Layout with Folders Sidebar

Update the main layout in `AdminWallpaperManager.tsx`:

```tsx
return (
  <div className="p-6">
    <div className="flex gap-6">
      {/* Left Sidebar - Folders */}
      <div className="w-80 flex-shrink-0">
        <FolderManager
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={createFolder}
          onUpdateFolder={updateFolder}
          onDeleteFolder={deleteFolder}
          onRefresh={loadFolders}
        />
      </div>

      {/* Right Content - Wallpapers Grid */}
      <div className="flex-1">
        {/* Header with upload button */}
        {/* Wallpapers grid */}
        {/* ... existing wallpaper display code */}
      </div>
    </div>

    {/* Analytics Drawer */}
    <WallpaperAnalyticsDrawer
      wallpaperId={analyticsWallpaperId || ""}
      isOpen={isAnalyticsOpen}
      onClose={() => setIsAnalyticsOpen(false)}
    />
  </div>
);
```

---

## 🎯 FINAL FEATURES

### What Users Can Do:

1. **Folder Management**:
   - Create folders to organize wallpapers
   - Edit folder names and descriptions
   - Delete folders (wallpapers move to "Uncategorized")
   - See wallpaper count per folder
   - Filter wallpapers by folder

2. **Multiple Upload with Folder**:
   - Upload multiple wallpapers at once
   - Assign to existing folder or create new folder
   - All uploaded wallpapers go to selected folder

3. **Individual Analytics**:
   - Click analytics icon on any wallpaper
   - See detailed metrics:
     - Total views, downloads, likes, shares
     - Today/week/month breakdown
     - Conversion & engagement rates
     - Last 7 days performance chart
     - Peak activity hours
     - Top locations (if available)

---

## 📝 TODO CHECKLIST

Backend:
- [ ] Add routes to `/supabase/functions/server/index.tsx` (line 1512)
- [ ] Create database tables (wallpaper_folders, wallpaper_analytics)
- [ ] Add folder_id column to wallpapers table
- [ ] Create database functions (increment counters)

Frontend:
- [ ] Update AdminWallpaperManager with folder state
- [ ] Add FolderManager component to layout
- [ ] Add folder CRUD functions
- [ ] Add analytics icon to wallpaper cards
- [ ] Add analytics drawer state
- [ ] Update UploadModal with folder selector
- [ ] Filter wallpapers by selected folder

Testing:
- [ ] Test folder creation, editing, deletion
- [ ] Test wallpaper upload with folder assignment
- [ ] Test analytics drawer opening
- [ ] Test filtering by folder
- [ ] Test "All Wallpapers" view

---

## 🎨 UI DESIGN NOTES

**Color Scheme**:
- Primary: #0d5e38 (devotional green)
- Folders: Green gradient backgrounds
- Analytics drawer: Blue/green/red/purple gradient cards
- Icons: Folder, BarChart3 from lucide-react

**Layout**:
- Folders sidebar: 320px (w-80)
- Main content: flex-1
- Analytics drawer: max-w-2xl from right

**Animations**:
- Drawer slides in from right (300ms)
- Hover effects on buttons
- Scale on active press

---

**Implementation Date**: November 28, 2025  
**Status**: Components Ready, Backend Integration Pending
