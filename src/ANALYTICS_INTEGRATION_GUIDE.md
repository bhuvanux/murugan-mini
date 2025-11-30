# Analytics Integration Guide

## Overview
The Murugan Wallpapers app now has a **unified analytics system** that tracks all user interactions across all modules (wallpapers, songs, sparkle, etc.). This guide explains how everything is connected.

## Architecture

### Two-System Integration

#### 1. Unified Analytics System (Primary)
- **Table**: `unified_analytics`
- **API Endpoints**: `/api/analytics/track`, `/api/analytics/untrack`
- **Tracks**: All events with IP-based deduplication
- **Used by**: User panel (WallpaperFullView, SparkScreen, etc.)

#### 2. Module-Specific Counters (Secondary)
- **Tables**: `wallpapers.view_count`, `wallpapers.like_count`, etc.
- **Database Functions**: `increment_wallpaper_views`, `increment_wallpaper_likes`, etc.
- **Used by**: Admin Panel analytics views

### How They Work Together

When a user performs an action in the User Panel:

1. **Frontend** calls `analyticsTracker.track('wallpaper', id, 'view')`
2. **Backend** (`/api/analytics/track`):
   - Calls `track_analytics_event` RPC to store in `unified_analytics` table
   - **THEN** increments the wallpaper counter (`increment_wallpaper_views`)
3. **Admin Panel** reads from BOTH:
   - Wallpaper counters for totals (`view_count`, `like_count`, `download_count`)
   - `unified_analytics` table for time-series data and daily breakdowns

## Database Setup Required

### 1. Unified Analytics Table

You need to create the `unified_analytics` table in your **Admin Supabase project**:

\`\`\`sql
-- Create unified analytics table
CREATE TABLE IF NOT EXISTS unified_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  item_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_analytics_module_item 
  ON unified_analytics(module_name, item_id);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_event_type 
  ON unified_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_created_at 
  ON unified_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_ip 
  ON unified_analytics(ip_address);

-- Create unique constraint for IP-based deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_analytics_unique_ip_event 
  ON unified_analytics(module_name, item_id, event_type, ip_address)
  WHERE event_type IN ('view', 'download');
\`\`\`

### 2. Database Functions

Create these RPC functions in your **Admin Supabase project**:

\`\`\`sql
-- Track analytics event (with IP-based deduplication)
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_already_tracked BOOLEAN;
  v_unique_count INTEGER;
BEGIN
  -- For views and downloads, check if IP has already tracked
  IF p_event_type IN ('view', 'download') THEN
    SELECT EXISTS (
      SELECT 1 FROM unified_analytics
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
        AND ip_address = p_ip_address
    ) INTO v_already_tracked;
    
    IF v_already_tracked THEN
      -- Get current unique count
      SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
      FROM unified_analytics
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type;
        
      RETURN jsonb_build_object(
        'tracked', false,
        'already_tracked', true,
        'unique_count', v_unique_count
      );
    END IF;
  END IF;
  
  -- Insert the event
  INSERT INTO unified_analytics (
    module_name, item_id, event_type, ip_address,
    user_agent, device_type, metadata
  ) VALUES (
    p_module_name, p_item_id, p_event_type, p_ip_address,
    p_user_agent, p_device_type, p_metadata
  );
  
  -- Get updated unique count
  SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
  FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type;
  
  RETURN jsonb_build_object(
    'tracked', true,
    'already_tracked', false,
    'unique_count', v_unique_count
  );
END;
$$ LANGUAGE plpgsql;

-- Untrack analytics event (for unlikes)
CREATE OR REPLACE FUNCTION untrack_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT
) RETURNS JSONB AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM analytics_tracking
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type
    AND ip_address = p_ip_address;
  
  -- FOUND is a boolean that's true if any rows were affected
  v_deleted := FOUND;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed', v_deleted,
    'unique_count', (
      SELECT COUNT(DISTINCT ip_address)
      FROM analytics_tracking
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Get analytics stats for an item
CREATE OR REPLACE FUNCTION get_analytics_stats(
  p_module_name TEXT,
  p_item_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_object_agg(event_type, count)
  INTO v_stats
  FROM (
    SELECT event_type, COUNT(DISTINCT ip_address) as count
    FROM unified_analytics
    WHERE module_name = p_module_name
      AND item_id = p_item_id
    GROUP BY event_type
  ) subquery;
  
  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;
\`\`\`

### 3. Wallpaper Counter Functions

Make sure these functions exist for wallpaper counters:

\`\`\`sql
-- Increment wallpaper views
CREATE OR REPLACE FUNCTION increment_wallpaper_views(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET view_count = view_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper likes
CREATE OR REPLACE FUNCTION increment_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = like_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement wallpaper likes (for unlikes)
CREATE OR REPLACE FUNCTION decrement_wallpaper_likes(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET like_count = GREATEST(0, like_count - 1) WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper downloads
CREATE OR REPLACE FUNCTION increment_wallpaper_downloads(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET download_count = download_count + 1 WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;

-- Increment wallpaper shares
CREATE OR REPLACE FUNCTION increment_wallpaper_shares(wallpaper_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallpapers SET share_count = GREATEST(0, share_count + 1) WHERE id = wallpaper_id;
END;
$$ LANGUAGE plpgsql;
\`\`\`

### 4. Wallpaper Columns

Ensure the `wallpapers` table has these counter columns:

\`\`\`sql
-- Add counter columns if they don't exist
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0 NOT NULL;
\`\`\`

## How to Test

1. **In User Panel**:
   - Open a wallpaper
   - Like it, view it, download it
   - Check browser console for logs: `[Analytics] Track result:`

2. **In Admin Panel**:
   - Open Wallpaper Manager
   - Click analytics icon on a wallpaper
   - Should see:
     - Total Views: X (from `view_count`)
     - Total Likes: X (from `like_count`)
     - Total Downloads: X (from `download_count`)
     - Daily breakdown chart (from `unified_analytics` table)

## Troubleshooting

### Analytics showing 0

**Check 1**: Does the `unified_analytics` table exist?
\`\`\`sql
SELECT * FROM unified_analytics LIMIT 10;
\`\`\`

**Check 2**: Are events being tracked?
\`\`\`sql
SELECT * FROM unified_analytics 
WHERE module_name = 'wallpaper' 
ORDER BY created_at DESC 
LIMIT 20;
\`\`\`

**Check 3**: Are wallpaper counters being incremented?
\`\`\`sql
SELECT id, title, view_count, like_count, download_count 
FROM wallpapers 
WHERE view_count > 0 OR like_count > 0;
\`\`\`

**Check 4**: Do the RPC functions exist?
\`\`\`sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%analytics%' 
   OR routine_name LIKE '%wallpaper%';
\`\`\`

### Error: "function track_analytics_event does not exist"

Run the database functions SQL from section 2 above.

### Error: "Could not find the 'scheduled_at' column"

Add the `scheduled_at` column to wallpapers table:
\`\`\`sql
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
\`\`\`

## Summary of Changes Made

### Backend Files Updated:

1. **`/supabase/functions/server/analytics-routes.tsx`**:
   - Added integration to increment wallpaper counters when tracking events
   - Added integration to decrement like counter when untracking
   
2. **`/supabase/functions/server/wallpaper-folders-analytics.tsx`**:
   - Updated `getWallpaperAnalytics` to read from `unified_analytics` table
   - Falls back to legacy `wallpaper_analytics` table if needed

### Frontend (No changes needed):

The frontend already uses `analyticsTracker.track()` correctly in:
- `WallpaperFullView.tsx` - tracks views, likes, downloads, shares
- `SparkScreen.tsx` - tracks likes, reads, shares
- All other modules follow the same pattern

## Next Steps

After running the SQL scripts above:

1. Test liking a wallpaper - should increment `like_count`
2. Test viewing a wallpaper - should increment `view_count`
3. Open Admin Panel → Wallpapers → Click Analytics icon
4. Should see real-time data!
