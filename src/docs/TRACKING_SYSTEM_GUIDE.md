# Tracking System Guide

## Overview
The **Unified Tracking System** consolidates all analytics into one simple, powerful module. No more separate dashboards for each feature - everything is tracked in one place!

## Features
✅ **Modular Design** - Easy to add/remove tracking modules  
✅ **Real-time Stats** - Auto-refresh every 30 seconds  
✅ **Calendar Heatmap** - Visual activity tracking  
✅ **Test Panel** - Send test events to verify tracking  
✅ **Status Indicators** - Active/Inactive/Error states  
✅ **Trend Analysis** - Day-over-day comparison

## Modules Tracked
1. **Wallpapers** - Views, Likes, Unlikes, Downloads, Shares, Favorites
2. **Sparkle Videos** - Views, Plays, Reads, Likes, Shares
3. **Songs** - Views, Listens, Plays, Pauses, Skips, Likes, Downloads
4. **Banners** - Impressions, Clicks
5. **Ask Gugan AI** - Conversations, Messages sent/received
6. **Authentication** - Logins, Signups, Logouts
7. **App Usage** - App opens, Tab switches

## Backend Routes
All routes are prefixed with `/make-server-4a075ebc/tracking/`

### POST /track
Track a new event
```json
{
  "module": "wallpaper",
  "action": "view",
  "content_id": "wallpaper-123",
  "user_id": "user-456",
  "metadata": {}
}
```

### GET /stats
Get stats for all modules
```json
{
  "stats": [
    {
      "module": "wallpaper",
      "total_events": 1250,
      "today_events": 45,
      "active_users": 28,
      "top_actions": [...],
      "trend": "up",
      "trend_percentage": 12,
      "status": "active",
      "last_event": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /stats/:module
Get stats for a specific module

### GET /events/:module
Get recent events for a module

### GET /calendar/:module
Get calendar heatmap data

### DELETE /reset/:module
Reset module stats (for testing)

## Frontend Integration

### 1. Import tracking utilities
```typescript
import {
  trackWallpaperView,
  trackWallpaperLike,
  trackWallpaperUnlike,
  trackSparkleView,
  trackSparkleRead,
  trackSongPlay,
  trackBannerClick,
  trackAskGuganMessageSent,
  setTrackingUserId
} from './utils/tracking';
```

### 2. Track events in components

#### Wallpapers
```typescript
// In WallpaperFullView.tsx or MasonryFeed.tsx
useEffect(() => {
  if (wallpaper?.id) {
    trackWallpaperView(wallpaper.id);
  }
}, [wallpaper?.id]);

const handleLike = () => {
  trackWallpaperLike(wallpaper.id);
  // ... rest of like logic
};

const handleUnlike = () => {
  trackWallpaperUnlike(wallpaper.id);
  // ... rest of unlike logic
};

const handleDownload = () => {
  trackWallpaperDownload(wallpaper.id);
  // ... rest of download logic
};
```

#### Sparkle Videos
```typescript
// In SparkScreen.tsx
useEffect(() => {
  if (article?.id) {
    trackSparkleView(article.id);
  }
}, [article?.id]);

const handleRead = () => {
  const readTime = Date.now() - startTime;
  trackSparkleRead(article.id, readTime / 1000);
};
```

#### Songs
```typescript
// In SongsScreen.tsx
const handlePlay = (song) => {
  trackSongPlay(song.id);
  // ... rest of play logic
};

const handlePause = (song) => {
  trackSongPause(song.id);
  // ... rest of pause logic
};
```

#### Banners
```typescript
// In Banner component
useEffect(() => {
  trackBannerImpression(banner.id);
}, [banner.id]);

const handleClick = () => {
  trackBannerClick(banner.id, banner.targetUrl);
  // ... rest of click logic
};
```

#### Ask Gugan AI
```typescript
// In AskGuganChatScreen.tsx
useEffect(() => {
  trackAskGuganConversationStart();
}, []);

const handleSendMessage = (message) => {
  const messageId = crypto.randomUUID();
  trackAskGuganMessageSent(messageId, message.length);
  // ... send message
};

const handleReceiveResponse = (messageId, responseTime) => {
  trackAskGuganMessageReceived(messageId, responseTime);
};
```

### 3. Set user ID on login
```typescript
// In AuthContext.tsx or login handler
import { setTrackingUserId } from './utils/tracking';

// After successful login
setTrackingUserId(user.id);

// On logout
setTrackingUserId(null);
```

## Access the Dashboard
1. Go to Admin Panel
2. Click "Tracking System" in the sidebar
3. View real-time stats for all modules
4. Use Calendar tab for heatmap view
5. Use Test Panel to verify tracking

## Testing
1. Go to Tracking System → Test Panel
2. Select a module (e.g., Wallpaper)
3. Select an action (e.g., view)
4. Add optional content ID
5. Click "Send Test Event"
6. Go back to Dashboard tab - you should see stats updated!

## Troubleshooting

### Events not tracking?
- Check browser console for errors
- Verify backend is running (Health check: `/make-server-4a075ebc/health`)
- Use Test Panel to send a test event
- Check if tracking utility is imported correctly

### Stats not updating?
- Hard refresh the dashboard (Ctrl+Shift+R)
- Click the Refresh button
- Check if events are being sent (Network tab)

### Module shows "Inactive" status?
- No events in the last 24 hours
- Send a test event to activate

### Module shows "Error" status?
- No events in the last 24+ hours
- Backend might be down
- Check server logs

## Benefits Over Old System
- ✅ **Simplified**: One dashboard instead of 6 separate ones
- ✅ **Faster**: Optimized queries and caching
- ✅ **Modular**: Easy to add new tracking modules
- ✅ **Visual**: Calendar heatmap for activity patterns
- ✅ **Testable**: Built-in test panel
- ✅ **Flexible**: Easy to reset data for testing

## Migration from Old Analytics
The new Tracking System replaces:
- Analytics Setup
- Analytics Center
- Analytics Testing
- Analytics Unified
- Analytics Test Suite
- Analytics Install

All functionality is now in one place: **Tracking System**

## Next Steps
1. Integrate tracking calls into all user-facing components
2. Test each module using the Test Panel
3. Monitor stats in the Dashboard
4. Use Calendar view to identify usage patterns
5. Archive old analytics components once migration is complete
