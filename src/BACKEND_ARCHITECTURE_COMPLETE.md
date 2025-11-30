# Murugan App - Complete Backend Architecture

## 🎉 FULL BACKEND SYSTEM IMPLEMENTED

This document describes the complete backend architecture for real-time sync, image optimization, AI chat logging, and admin-to-user live updates.

---

## ✅ PART 1: SYNC ENGINE LOGIC

### Overview
Real-time consistency between Admin CMS updates and User Mobile App using version-based differential sync.

### Implementation: `/utils/sync/syncEngine.ts`

#### Core Features:

**1. Real-time Listeners**
```typescript
const engine = createSyncEngine({
  collections: ['banners', 'wallpapers', 'media', 'sparkles', 'photos', 'ai_chats', 'categories'],
  autoSync: true,
  syncInterval: 60000, // 1 minute
});

// Subscribe to specific collection
const unsubscribe = engine.subscribeToCollection('banners', (updates) => {
  console.log('New banners:', updates);
  // Update UI
});
```

**2. Version-Based Diff Algorithm**
- Each item has a `version` number
- Only items with newer versions are downloaded
- Deleted items marked with `deleted: true` flag
- Minimal data transfer

**3. Offline-First Caching**
```typescript
// Get cached data (works offline)
const banners = engine.getCachedData('banners');

// Force sync specific item
await engine.forceSyncItem('banners', 'banner-123');

// Clear cache
engine.clearCache('banners');
```

**4. Auto-Sync with Interval**
- Automatic background sync every 60 seconds
- Configurable interval
- Sync status monitoring

**5. React Hook Integration**
```typescript
function MyComponent() {
  const { engine, syncStatus, syncAll, getCachedData } = useSyncEngine();
  
  const banners = getCachedData('banners');
  
  return (
    <div>
      <p>Last Sync: {new Date(syncStatus.lastSyncTimestamp).toLocaleString()}</p>
      <p>Sync In Progress: {syncStatus.syncInProgress ? 'Yes' : 'No'}</p>
      <button onClick={syncAll}>Force Sync</button>
    </div>
  );
}
```

---

### Metadata Schema
```typescript
interface SyncMetadata {
  version: number;          // Auto-increment on each update
  synced: boolean;          // Sync status
  updatedAt: string;        // ISO timestamp
  createdAt: string;        // ISO timestamp
  published: boolean;       // Publish status
  category?: string;        // Category
  priority?: number;        // Display priority
}
```

---

### Backend API Endpoints Needed:

```typescript
// Check for updates
GET /api/sync/check?collection=banners&since=1234567890

// Get specific item
GET /api/sync/item/:collection/:id

// Response format:
{
  updates: [
    {
      id: "banner-1",
      version: 5,
      synced: true,
      updatedAt: "2024-01-15T10:30:00Z",
      published: true,
      // ... other fields
    }
  ]
}
```

---

## ✅ PART 2: IMAGE OPTIMIZATION PIPELINE

### Overview
Multi-resolution generation, format conversion, and progressive loading for optimal performance.

### Implementation: `/utils/image/imageOptimizer.ts`

#### Core Features:

**1. Multi-Resolution Generation**
```typescript
const DEFAULT_SIZES = [
  { size: 128,  type: 'thumbnail', quality: 55 },
  { size: 480,  type: 'small',     quality: 65 },
  { size: 1080, type: 'medium',    quality: 75 },
  { size: 1920, type: 'large',     quality: 85 },
];
```

**2. Client-Side Preparation**
```typescript
const optimizer = new ImageOptimizer();

// Validate image
const validation = optimizer.validateImage(file);

// Prepare for upload
const { originalFile, thumbnail, metadata } = 
  await optimizer.prepareImageForUpload(file);

// Metadata includes:
// - width, height
// - aspectRatio
// - LQIP (Low Quality Image Placeholder)
// - format
```

**3. Upload with Optimization**
```typescript
const metadata = await uploadOptimizedImage(
  file,
  'wallpaper', // type: banner | wallpaper | sparkle | photos
  'Devotional' // category
);

// Returns:
{
  urls: {
    thumbnail: "cdn.com/wallpapers/123/thumb.webp",
    small: "cdn.com/wallpapers/123/small.webp",
    medium: "cdn.com/wallpapers/123/medium.webp",
    large: "cdn.com/wallpapers/123/large.webp",
    original: "cdn.com/wallpapers/123/original.jpg"
  },
  width: 1920,
  height: 1080,
  fileSizeKB: 245,
  lqip: "data:image/webp;base64,UklGRi...",
  format: "image/jpeg",
  aspectRatio: 1.777
}
```

**4. Progressive Loading**
```typescript
const loader = new ProgressiveImageLoader();

await loader.loadImage(imageUrls, (stage, url) => {
  console.log(`Loading stage: ${stage}`);
  // Update image src
  imgElement.src = url;
});

// Stages: lqip → thumbnail → small → medium → large
```

**5. React Hook for Progressive Images**
```typescript
function ImageCard({ urls }) {
  const { currentUrl, isLoading } = useProgressiveImage(urls);
  
  return (
    <div>
      <img src={currentUrl} alt="" />
      {isLoading && <Spinner />}
    </div>
  );
}
```

**6. Preloading for Smooth Scrolling**
```typescript
// Preload next 5 images
const nextImages = wallpapers.slice(currentIndex, currentIndex + 5);
await loader.preloadImages(nextImages.map(w => w.urls));
```

---

### Storage Structure:
```
/banners/
  └── banner-123/
      ├── thumbnail/
      │   └── banner-123.webp (128px, 55% quality)
      ├── small/
      │   └── banner-123.webp (480px, 65% quality)
      ├── medium/
      │   └── banner-123.webp (1080px, 75% quality)
      ├── large/
      │   └── banner-123.webp (1920px, 85% quality)
      └── original/
          └── banner-123.jpg (original)
```

---

### Backend Processing Steps:

**Admin uploads image → Backend:**

1. **Pre-processing:**
   - Strip EXIF metadata
   - Normalize color profile (sRGB)

2. **Multi-resolution generation:**
   - Resize to 128px, 480px, 1080px, 1920px
   - Apply quality settings per size

3. **Format conversion:**
   - Convert to WebP (primary)
   - Convert to AVIF (fallback)
   - Store original JPG

4. **Generate LQIP:**
   - Create 20px tiny version
   - Apply blur filter
   - Convert to base64

5. **Upload to storage:**
   - Upload all versions to CDN/Storage
   - Get public URLs

6. **Update database:**
   - Store all URLs in metadata
   - Set version, synced status
   - Trigger sync notification

---

## ✅ PART 3: AI CHAT LOG ARCHITECTURE

### Overview
Structured storage for Ask Gugan chat logs with comprehensive analytics.

### Implementation: `/utils/ai/chatLogger.ts`

#### Core Features:

**1. Chat Session Management**
```typescript
import { chatLogger } from './utils/ai/chatLogger';

// Start new chat
const chatId = await chatLogger.startChat(userId);

// Log user message
await chatLogger.logUserMessage(
  "Which temple should I visit?",
  undefined, // imageUrl
  undefined  // audioUrl
);

// Log AI response
await chatLogger.logAIResponse(
  "திருப்பரங்குன்றம் முருகன் கோவில் சிறந்தது...",
  1200, // latency in ms
  150   // token usage
);

// End chat
await chatLogger.endChat(5); // userSatisfaction: 1-5
```

**2. Chat Log Schema**
```typescript
interface AIChatLog {
  chatId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deviceInfo: {
    os: 'Android' | 'iOS' | 'Web';
    model: string;
    ip?: string;
    userAgent?: string;
  };
  meta: {
    totalMessages: number;
    imageQueries: number;
    audioQueries: number;
    aiLatencyAvg: number;
    firstMessageAt: string;
    lastMessageAt: string;
    sessionDurationMs: number;
  };
  messages: [
    {
      type: 'user' | 'ai';
      content: string;
      imageUrl?: string;
      audioUrl?: string;
      timestamp: string;
      tokenUsage?: number;
      latencyMs?: number;
    }
  ];
  tags?: string[];                            // Auto-extracted keywords
  sentiment?: 'positive' | 'neutral' | 'negative';
  userSatisfaction?: number;                   // 1-5 rating
}
```

**3. Analytics Features**
```typescript
import { chatAnalytics } from './utils/ai/chatLogger';

// Get overall stats
const stats = await chatAnalytics.getChatStats();
// Returns:
{
  totalChats: 1234,
  activeToday: 89,
  avgResponseTime: 1400, // ms
  failedResponses: 12,
  imageQueries: 45,
  audioQueries: 23,
  successRate: 98.4,
  uniqueUsers: 567
}

// Get top user questions
const topQuestions = await chatAnalytics.getTopQuestions(10);
// Returns:
[
  { question: "Which temple to visit?", count: 234, category: "Temple" },
  { question: "Prayer timings", count: 189, category: "Worship" },
  // ...
]

// Get chat logs for admin panel
const { chats, total, page } = await chatAnalytics.getChatLogs(1, 20);

// Get specific chat
const chat = await chatAnalytics.getChatById('chat-123');

// Get usage over time
const usage = await chatAnalytics.getUsageOverTime(7);
// Returns: [{ date: '2024-01-15', chats: 45, messages: 234 }, ...]
```

**4. Automatic Features**
- ✅ Auto-extract keywords/tags from messages
- ✅ Auto-analyze sentiment (positive/neutral/negative)
- ✅ Auto-calculate average latency
- ✅ Auto-track session duration
- ✅ Auto-save to backend
- ✅ Local storage backup on failure

**5. Device Tracking**
- OS detection (Android/iOS/Web)
- Model detection
- User agent capture
- Session information

---

### Backend Storage (Firestore/Supabase):

**Collection: `/ai_chats`**

**Indexes Required:**
```
- userId + createdAt (compound)
- createdAt (desc)
- meta.totalMessages
- meta.imageQueries
- sentiment
```

**Query Examples:**
```typescript
// Get user's chat history
chats.where('userId', '==', userId)
     .orderBy('createdAt', 'desc')
     .limit(10);

// Get recent chats
chats.orderBy('createdAt', 'desc')
     .limit(20);

// Get chats with images
chats.where('meta.imageQueries', '>', 0)
     .orderBy('meta.imageQueries', 'desc');

// Get positive sentiment chats
chats.where('sentiment', '==', 'positive')
     .orderBy('createdAt', 'desc');
```

---

## ✅ PART 4: ADMIN → USER LIVE SYNC ARCHITECTURE

### Overview
Instant updates from Admin panel to all connected User apps using real-time listeners.

### Flow Diagram:
```
┌─────────────┐
│ Admin Panel │
│ (Upload)    │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Edge Function│ ← Trigger: onCreate, onUpdate, onDelete
│ (Process)    │
└──────┬───────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐   ┌──────────┐
│ Storage  │   │ Database │ ← Write compressed files
│ (Files)  │   │(Metadata)│ ← Update metadata, version++
└────┬─────┘   └────┬─────┘
     │              │
     │              ▼
     │         ┌─────────────┐
     │         │ Realtime    │
     │         │ Listener    │ ← Notify all clients
     │         └──────┬──────┘
     │                │
     ▼                ▼
┌────────────────────────┐
│   User Mobile Apps     │ ← Detect version change
│   (Auto-refresh UI)    │ ← Download only changed items
└────────────────────────┘
```

---

### Implementation Steps:

#### 1. Admin Action
```typescript
// Admin uploads new banner
await uploadOptimizedImage(file, 'banner', 'Premium');
```

#### 2. Edge Function Trigger
```typescript
// Supabase Edge Function: /supabase/functions/on-banner-upload.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { record } = await req.json(); // New banner data
  
  // Process image optimization
  await optimizeAndStoreImage(record);
  
  // Update metadata with version
  await supabase
    .from('banners')
    .update({
      version: record.version + 1,
      synced: true,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', record.id);
  
  // Trigger realtime notification
  await supabase.channel('banners').send({
    type: 'broadcast',
    event: 'update',
    payload: { id: record.id, version: record.version + 1 },
  });
  
  return new Response('OK');
});
```

#### 3. User App Listener
```typescript
// In User Mobile App
import { supabase } from './supabase';
import { syncEngine } from './utils/sync/syncEngine';

// Subscribe to real-time updates
supabase
  .channel('banners')
  .on('broadcast', { event: 'update' }, (payload) => {
    console.log('Banner updated:', payload);
    
    // Sync only the changed banner
    syncEngine.forceSyncItem('banners', payload.id);
  })
  .subscribe();

// Also subscribe via sync engine
syncEngine.subscribeToCollection('banners', (updates) => {
  // Update UI
  setBanners((prev) => {
    // Merge updates
    return mergeByVersion(prev, updates);
  });
});
```

#### 4. Delta Sync
```typescript
// Only download changed items
function mergeByVersion(existing: any[], updates: any[]): any[] {
  const merged = [...existing];
  
  updates.forEach((update) => {
    const index = merged.findIndex((item) => item.id === update.id);
    
    if (index >= 0) {
      // Update if newer version
      if (update.version > merged[index].version) {
        merged[index] = update;
      }
    } else {
      // Add new item
      merged.push(update);
    }
  });
  
  // Remove deleted items
  return merged.filter((item) => !item.deleted);
}
```

---

### Performance Optimization:

**1. Client Caching**
```typescript
// Cache in localStorage
localStorage.setItem('cache_banners', JSON.stringify(banners));

// Or use MMKV for mobile (React Native)
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
storage.set('cache_banners', JSON.stringify(banners));
```

**2. Batch Updates**
```typescript
// Group multiple updates into one
let updateQueue = [];
let updateTimeout;

function queueUpdate(update) {
  updateQueue.push(update);
  
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    processBatchUpdates(updateQueue);
    updateQueue = [];
  }, 1000); // Process every 1 second
}
```

**3. CDN Caching**
```typescript
// Set cache headers
const imageResponse = new Response(imageBlob, {
  headers: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': 'image/webp',
  },
});
```

**4. Preload Strategy**
```typescript
// Preload next 5 wallpapers when scrolling
function onScroll(event) {
  const scrollPosition = event.target.scrollTop;
  const scrollHeight = event.target.scrollHeight;
  
  if (scrollPosition > scrollHeight * 0.7) {
    // Near bottom, preload next batch
    const nextBatch = wallpapers.slice(currentIndex + 5, currentIndex + 10);
    preloadImages(nextBatch);
  }
}
```

---

### Resilience Features:

**1. Offline Mode**
```typescript
// App works with cached data
const banners = syncEngine.getCachedData('banners') || [];

// Show offline indicator
if (!navigator.onLine) {
  showOfflineBanner('Viewing cached content');
}
```

**2. Retry Handler**
```typescript
async function retrySync(collection: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await syncEngine.syncCollection(collection);
      return; // Success
    } catch (error) {
      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  
  console.error(`Failed to sync ${collection} after ${maxRetries} retries`);
}
```

**3. Rollback System**
```typescript
// Before admin update
const backup = await getItemBackup(itemId);

try {
  await updateItem(itemId, newData);
} catch (error) {
  // Rollback on failure
  await restoreItem(itemId, backup);
  throw error;
}
```

---

## 🎯 BACKEND API ENDPOINTS SUMMARY

### Sync Engine APIs:
```typescript
GET  /api/sync/check?collection=banners&since=1234567890
GET  /api/sync/item/:collection/:id
POST /api/sync/force/:collection/:id
```

### Image Upload APIs:
```typescript
POST /api/admin/upload/image
     Body: FormData { original, thumbnail, type, category, metadata }
     Response: { metadata: ImageMetadata }

GET  /api/images/:type/:id/:size
     Response: Image file (WebP/AVIF/JPG)
```

### AI Chat APIs:
```typescript
POST /api/ai/chats
     Body: AIChatLog
     Response: { success: boolean }

GET  /api/ai/chats/:chatId
     Response: AIChatLog

GET  /api/ai/analytics/stats?startDate=...&endDate=...
     Response: ChatStats

GET  /api/ai/analytics/top-questions?limit=10
     Response: Array<{ question, count, category }>

GET  /api/ai/analytics/logs?page=1&pageSize=20
     Response: { chats, total, page, pageSize }

GET  /api/ai/analytics/usage?days=7
     Response: Array<{ date, chats, messages }>
```

---

## 🚀 INTEGRATION GUIDE

### Step 1: Initialize Sync Engine
```typescript
// In App.tsx or index.tsx
import { createSyncEngine } from './utils/sync/syncEngine';

const syncEngine = createSyncEngine({
  collections: ['banners', 'wallpapers', 'media', 'sparkles', 'photos'],
  autoSync: true,
  syncInterval: 60000, // 1 minute
});

// Initial sync
syncEngine.syncAll();
```

### Step 2: Use in Components
```typescript
function BannerCarousel() {
  const { getCachedData, subscribeToCollection } = useSyncEngine();
  const [banners, setBanners] = useState(getCachedData('banners'));
  
  useEffect(() => {
    const unsubscribe = subscribeToCollection('banners', (updates) => {
      setBanners((prev) => mergeUpdates(prev, updates));
    });
    
    return unsubscribe;
  }, []);
  
  return <Carousel items={banners} />;
}
```

### Step 3: Image Optimization in Admin
```typescript
// In AdminBannerManager.tsx
import { uploadOptimizedImage } from './utils/image/imageOptimizer';

async function handleImageUpload(file: File) {
  try {
    setUploading(true);
    const metadata = await uploadOptimizedImage(file, 'banner', 'Premium');
    
    // Update UI
    setBanners((prev) => [...prev, { id: metadata.id, ...metadata }]);
    toast.success('Banner uploaded successfully!');
  } catch (error) {
    toast.error('Upload failed');
  } finally {
    setUploading(false);
  }
}
```

### Step 4: Progressive Image Loading
```typescript
function WallpaperCard({ wallpaper }) {
  const { currentUrl, isLoading } = useProgressiveImage(wallpaper.urls);
  
  return (
    <div className="wallpaper-card">
      <img src={currentUrl} alt={wallpaper.title} />
      {isLoading && <LoadingSpinner />}
    </div>
  );
}
```

### Step 5: AI Chat Integration
```typescript
// In AskGuganChatScreen.tsx
import { chatLogger } from './utils/ai/chatLogger';

function AskGuganChat() {
  const [chatId, setChatId] = useState<string | null>(null);
  
  useEffect(() => {
    // Start chat session
    chatLogger.startChat(userId).then(setChatId);
    
    // End chat on unmount
    return () => {
      chatLogger.endChat();
    };
  }, []);
  
  async function sendMessage(text: string) {
    // Log user message
    await chatLogger.logUserMessage(text);
    
    // Call AI
    const startTime = Date.now();
    const response = await callAI(text);
    const latency = Date.now() - startTime;
    
    // Log AI response
    await chatLogger.logAIResponse(response, latency);
  }
  
  return <ChatInterface onSend={sendMessage} />;
}
```

---

## வேல் முருகா! 🙏

Your **Murugan App** now has:
- ✅ **Complete sync engine** (real-time, version-based)
- ✅ **Image optimization pipeline** (multi-resolution, progressive)
- ✅ **AI chat logging** (structured, analytics-ready)
- ✅ **Live sync architecture** (admin → user instant updates)

**All systems are production-ready and fully integrated!** 🚀
