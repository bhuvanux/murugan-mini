# Tracking System - Quick Start

## 🎯 What is this?
A **unified tracking system** that consolidates ALL analytics into one powerful dashboard. No more separate analytics for wallpapers, sparkle, songs, banners, etc. - everything is tracked in one place!

## 🚀 Quick Access
1. Open Admin Panel
2. Click **"Tracking System"** in sidebar
3. Done! You'll see real-time stats for all modules

## 📊 What You'll See
- **Dashboard Tab**: Overview cards for each module with stats, trends, and status
- **Calendar Tab**: Beautiful heatmap showing activity patterns over time
- **Test Panel Tab**: Send test events to verify tracking is working

## 🎨 Module Status Indicators
- 🟢 **Active**: Events in the last hour
- 🟡 **Inactive**: No events in last 1-24 hours  
- 🔴 **Error**: No events in 24+ hours

## 📈 Trend Indicators
- ⬆️ **Up**: +5% or more vs yesterday
- ⬇️ **Down**: -5% or more vs yesterday
- ➡️ **Stable**: Within ±5% of yesterday

## ✅ Quick Test
1. Go to **Test Panel** tab
2. Select "Wallpaper" module
3. Select "view" action
4. Enter content ID: `test-wallpaper-123`
5. Click **"Send Test Event"**
6. Go back to **Dashboard** tab
7. Look for Wallpapers card - you should see stats updated!

## 🔧 Integration Status

### ✅ Backend Ready
- Tracking API routes created
- KV storage configured
- Stats calculation working
- Calendar data working

### ⚠️ Frontend Integration Needed
Add tracking calls to user-facing components:

**Example - Wallpaper Views:**
```typescript
import { trackWallpaperView } from './utils/tracking';

// In WallpaperFullView.tsx
useEffect(() => {
  trackWallpaperView(wallpaper.id);
}, [wallpaper.id]);
```

**Example - Sparkle Reads:**
```typescript
import { trackSparkleRead } from './utils/tracking';

// In SparkScreen.tsx  
const handleReadComplete = () => {
  trackSparkleRead(article.id, readTimeInSeconds);
};
```

See `/docs/TRACKING_SYSTEM_GUIDE.md` for complete integration examples.

## 🎯 Current Features
- [x] Unified dashboard
- [x] 7 tracking modules (Wallpaper, Sparkle, Song, Banner, Ask Gugan, Auth, App)
- [x] Real-time stats with auto-refresh
- [x] Calendar heatmap view
- [x] Test panel for debugging
- [x] Trend analysis (day-over-day)
- [x] Status indicators
- [x] Module reset functionality
- [x] Recent events viewer

## 📝 Modules Tracked
1. **Wallpapers** - View, Like, Unlike, Download, Share, Favorite
2. **Sparkle** - View, Play, Pause, Read, Like, Share
3. **Songs** - View, Listen, Play, Pause, Skip, Like, Download
4. **Banners** - Impression, Click
5. **Ask Gugan** - Conversation start, Message sent/received
6. **Auth** - Login, Signup, Logout
7. **App** - App open, Tab switch

## 🎨 Visual Features
- **Green theme** (#0d5e38) matching your app
- **Tamil fonts** (TAU-Paalai Bold, TAU-Nilavu Regular)
- **Responsive grid** layout
- **Hover effects** and animations
- **Color-coded** status badges
- **Interactive cards** - click to see details

## 🔄 Auto-Refresh
Dashboard automatically refreshes every **30 seconds** to show latest stats.

## 📅 Calendar View
- Heatmap visualization
- 7/30/90 day views
- Hover for detailed counts
- Color intensity = event volume

## 🧪 Test Panel Features
- Select any module + action
- Optional content ID and user ID
- Instant feedback on success/failure
- Reset module data for testing

## 🎉 Benefits
- ✅ **Simplified** - One dashboard vs 6 separate ones
- ✅ **Fast** - Optimized queries, auto-refresh
- ✅ **Modular** - Easy to add new modules
- ✅ **Visual** - Beautiful charts and heatmaps
- ✅ **Testable** - Built-in test tools
- ✅ **Flexible** - Per-module controls

## 🚨 Known Issues
- [ ] Frontend tracking calls not yet integrated (use Test Panel for now)
- [ ] Need to add tracking to: Sparkle reads, Wallpaper unlikes, Song plays, Banner clicks, Ask Gugan messages

## 📚 Need Help?
See full guide: `/docs/TRACKING_SYSTEM_GUIDE.md`
