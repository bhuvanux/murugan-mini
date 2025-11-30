# 📊 View Tracking - Admin Backend Update Required

## Issue

The user panel is now tracking views when users open photos in full-screen, but the admin backend needs an endpoint to receive these view counts.

## What You Need to Add to Admin Backend

Add this endpoint to your admin backend at:
`https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb`

### Endpoint: POST /media/:id/view

This endpoint is called when a user opens a photo/video in full-screen view.

```typescript
// Add to your Hono server in /supabase/functions/server/index.tsx
app.post('/make-server-d083adfb/media/:id/view', async (c) => {
  try {
    const mediaId = c.req.param('id');
    
    // Get all media from your database
    const allMedia = await kv.get('media_items') || [];
    
    // Find the media item
    const mediaIndex = allMedia.findIndex(m => m.id === mediaId);
    
    if (mediaIndex === -1) {
      return c.json({ error: 'Media not found' }, 404);
    }
    
    // Increment views
    if (!allMedia[mediaIndex].stats) {
      allMedia[mediaIndex].stats = { views: 0, likes: 0, downloads: 0, shares: 0 };
    }
    allMedia[mediaIndex].stats.views = (allMedia[mediaIndex].stats.views || 0) + 1;
    
    // Save back to database
    await kv.set('media_items', allMedia);
    
    console.log(`[Admin Backend] View tracked for media ${mediaId}, new count: ${allMedia[mediaIndex].stats.views}`);
    
    return c.json({
      success: true,
      message: 'View tracked',
      newCount: allMedia[mediaIndex].stats.views
    });
    
  } catch (error: any) {
    console.error('[Admin Backend] /media/:id/view error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

## When Views Are Tracked

Views are automatically tracked when:
1. User opens a photo/video in full-screen mode
2. User swipes to next/previous photo (each new photo = 1 view)
3. Each photo is only counted once per viewing session

## Testing

After implementing, test it:

```bash
curl -X POST "https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-d083adfb/media/YOUR_MEDIA_ID/view" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncXR5Y3NzaWZtcGZieG1xenJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDE5MjIsImV4cCI6MjA3ODY3NzkyMn0.yoI_jddrRBdMAlWIlHLAhB9cKhTPIO27pNIUwBY5l0g"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "View tracked",
  "newCount": 1
}
```

## Database Schema

Ensure each media item has a `stats` object:

```typescript
{
  id: string,
  title: string,
  url: string,
  // ... other fields
  stats: {
    views: number,      // ← This gets incremented
    likes: number,
    downloads: number,
    shares: number
  }
}
```

## Summary

Once you add this endpoint, views will be tracked automatically whenever users open photos in full-screen mode in the user panel. You'll see the view counts increase in your admin panel analytics!

**Priority:** MEDIUM (app works without it, but analytics will be incomplete)
