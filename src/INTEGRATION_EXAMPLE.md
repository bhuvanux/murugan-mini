# Murugan App - Complete Integration Example

## 🎯 Real-World Usage Examples

This document shows how all the backend systems work together in a complete user flow.

---

## 📱 SCENARIO 1: Admin Uploads New Wallpaper

### Admin Panel Flow:

```typescript
// AdminWallpaperManager.tsx
import { uploadOptimizedImage } from '../utils/image/imageOptimizer';
import { toast } from 'sonner@2.0.3';

async function handleWallpaperUpload(file: File, category: string) {
  try {
    // Step 1: Show upload progress
    setUploading(true);
    toast.info('Optimizing image...');
    
    // Step 2: Upload with optimization
    // This automatically:
    // - Validates the image
    // - Creates thumbnail, small, medium, large versions
    // - Converts to WebP/AVIF
    // - Generates LQIP placeholder
    // - Uploads to storage
    // - Creates database entry with version: 1
    const metadata = await uploadOptimizedImage(file, 'wallpaper', category);
    
    // Step 3: Backend triggers sync
    // The backend automatically:
    // - Increments version number
    // - Sets synced: true
    // - Broadcasts to all connected clients
    
    // Step 4: Update local state
    setWallpapers((prev) => [
      ...prev,
      {
        id: metadata.id,
        title: 'New Wallpaper',
        category: category,
        urls: metadata.urls,
        published: true,
        version: 1,
        createdAt: new Date().toISOString(),
      },
    ]);
    
    toast.success('Wallpaper uploaded and synced!');
  } catch (error) {
    console.error('Upload failed:', error);
    toast.error('Upload failed. Please try again.');
  } finally {
    setUploading(false);
  }
}

// Render
return (
  <div>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleWallpaperUpload(file, selectedCategory);
      }}
    />
  </div>
);
```

---

### User App Auto-Update:

```typescript
// MasonryFeed.tsx (User App)
import { useSyncEngine } from '../utils/sync/syncEngine';
import { useProgressiveImage } from '../utils/image/imageOptimizer';

function MasonryFeed() {
  const { getCachedData, subscribeToCollection } = useSyncEngine();
  const [wallpapers, setWallpapers] = useState(getCachedData('wallpapers'));
  
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCollection('wallpapers', (updates) => {
      console.log('New wallpapers received:', updates);
      
      // Merge updates (only newer versions)
      setWallpapers((prev) => {
        const merged = [...prev];
        
        updates.forEach((update) => {
          const index = merged.findIndex((w) => w.id === update.id);
          
          if (index >= 0) {
            // Update if newer version
            if (update.version > merged[index].version) {
              merged[index] = update;
              toast.success('New wallpaper available!');
            }
          } else {
            // Add new wallpaper
            merged.unshift(update); // Add to beginning
            toast.success('New wallpaper added!');
          }
        });
        
        return merged;
      });
    });
    
    return unsubscribe;
  }, [subscribeToCollection]);
  
  return (
    <div className="masonry-grid">
      {wallpapers.map((wallpaper) => (
        <WallpaperCard key={wallpaper.id} wallpaper={wallpaper} />
      ))}
    </div>
  );
}

// Wallpaper Card with Progressive Loading
function WallpaperCard({ wallpaper }) {
  const { currentUrl, isLoading } = useProgressiveImage(wallpaper.urls);
  
  return (
    <div className="wallpaper-card">
      {/* Progressive loading stages:
          1. LQIP (instant, blurred)
          2. Thumbnail (128px)
          3. Small (480px)
          4. Medium (1080px)
      */}
      <img
        src={currentUrl}
        alt={wallpaper.title}
        className={isLoading ? 'loading' : 'loaded'}
      />
      {isLoading && (
        <div className="loading-overlay">
          <Spinner />
        </div>
      )}
      <div className="wallpaper-info">
        <h3>{wallpaper.title}</h3>
        <span className="category">{wallpaper.category}</span>
      </div>
    </div>
  );
}
```

**What happens automatically:**
1. ✅ Admin uploads → Backend optimizes → Database updated
2. ✅ Real-time broadcast sent to all users
3. ✅ User apps detect update via sync engine
4. ✅ Only the new wallpaper is downloaded (delta sync)
5. ✅ UI updates automatically with toast notification
6. ✅ Progressive loading shows instant preview, then high quality

---

## 💬 SCENARIO 2: User Chats with Gugan AI

### User App Flow:

```typescript
// AskGuganChatScreen.tsx
import { chatLogger } from '../utils/ai/chatLogger';

function AskGuganChatScreen() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const userId = useAuth().user?.id;
  
  useEffect(() => {
    // Start chat session when screen opens
    if (userId) {
      chatLogger.startChat(userId).then((id) => {
        setChatId(id);
        console.log('Chat started:', id);
        
        // Load greeting
        const greeting = getRandomGreeting();
        setMessages([
          {
            type: 'ai',
            content: greeting,
            timestamp: new Date().toISOString(),
          },
        ]);
      });
    }
    
    // End chat when screen closes
    return () => {
      if (chatId) {
        chatLogger.endChat(); // Auto-saves to backend
      }
    };
  }, [userId]);
  
  async function handleSend() {
    if (!inputText.trim()) return;
    
    const userMessage = {
      type: 'user' as const,
      content: inputText,
      timestamp: new Date().toISOString(),
    };
    
    // Update UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    
    // Log user message
    await chatLogger.logUserMessage(inputText);
    
    // Call AI
    try {
      const startTime = Date.now();
      const response = await callMuruganAI(inputText);
      const latency = Date.now() - startTime;
      
      const aiMessage = {
        type: 'ai' as const,
        content: response.text,
        timestamp: new Date().toISOString(),
      };
      
      // Update UI
      setMessages((prev) => [...prev, aiMessage]);
      
      // Log AI response
      await chatLogger.logAIResponse(response.text, latency, response.tokens);
      
      console.log(`AI responded in ${latency}ms`);
    } catch (error) {
      console.error('AI call failed:', error);
      toast.error('Failed to get response. Please try again.');
    }
  }
  
  return (
    <div className="chat-screen">
      {/* Messages */}
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            <p>{msg.content}</p>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="input-bar">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <button onClick={handleSend}>
          <Send />
        </button>
      </div>
    </div>
  );
}

// AI API Call
async function callMuruganAI(message: string): Promise<{
  text: string;
  tokens: number;
}> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  
  return await response.json();
}
```

---

### Admin Panel Analytics:

```typescript
// AdminGuganAnalytics.tsx
import { chatAnalytics } from '../utils/ai/chatLogger';

function AdminGuganAnalytics() {
  const [stats, setStats] = useState(null);
  const [topQuestions, setTopQuestions] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  
  useEffect(() => {
    // Load analytics data
    async function loadData() {
      // Overall stats
      const statsData = await chatAnalytics.getChatStats();
      setStats(statsData);
      
      // Top questions
      const questions = await chatAnalytics.getTopQuestions(10);
      setTopQuestions(questions);
      
      // Recent chat logs
      const { chats } = await chatAnalytics.getChatLogs(1, 20);
      setChatLogs(chats);
    }
    
    loadData();
  }, []);
  
  return (
    <div className="ai-analytics">
      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Chats"
          value={stats?.totalChats}
          icon={<MessageCircle />}
        />
        <StatCard
          title="Avg Response Time"
          value={`${stats?.avgResponseTime}ms`}
          icon={<Clock />}
        />
        <StatCard
          title="Success Rate"
          value={`${stats?.successRate}%`}
          icon={<CheckCircle />}
        />
      </div>
      
      {/* Top Questions */}
      <div className="top-questions">
        <h3>Top User Questions</h3>
        <table>
          <thead>
            <tr>
              <th>Question</th>
              <th>Count</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {topQuestions.map((q, i) => (
              <tr key={i}>
                <td>{q.question}</td>
                <td>{q.count}</td>
                <td><Badge>{q.category}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Chat Logs */}
      <div className="chat-logs">
        <h3>Recent Chats</h3>
        {chatLogs.map((chat) => (
          <div key={chat.chatId} className="chat-log-item">
            <div className="chat-header">
              <span className="user">{chat.userId}</span>
              <span className="date">
                {new Date(chat.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="chat-stats">
              <span>{chat.meta.totalMessages} messages</span>
              <span>{chat.meta.aiLatencyAvg}ms avg</span>
              <span className={`sentiment ${chat.sentiment}`}>
                {chat.sentiment}
              </span>
            </div>
            <button onClick={() => viewChatDetails(chat.chatId)}>
              View Full Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**What gets tracked automatically:**
- ✅ Every user message
- ✅ Every AI response with latency
- ✅ Image/audio queries
- ✅ Session duration
- ✅ Device information
- ✅ Keyword extraction
- ✅ Sentiment analysis
- ✅ User satisfaction rating

---

## 🔄 SCENARIO 3: Offline → Online Sync

### User Opens App Offline:

```typescript
// App.tsx
import { useSyncEngine } from './utils/sync/syncEngine';

function App() {
  const { getCachedData, syncAll, syncStatus } = useSyncEngine();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Monitor online status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  async function handleOnline() {
    setIsOnline(true);
    toast.success('Back online! Syncing...');
    
    // Sync all collections
    await syncAll();
    
    toast.success('All content synced!');
  }
  
  function handleOffline() {
    setIsOnline(false);
    toast.warning('Offline mode - viewing cached content');
  }
  
  return (
    <div className="app">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <AlertCircle />
          <span>You're offline. Viewing cached content.</span>
        </div>
      )}
      
      {/* Sync Status */}
      {isOnline && syncStatus.syncInProgress && (
        <div className="sync-banner">
          <Loader className="animate-spin" />
          <span>Syncing updates...</span>
        </div>
      )}
      
      {/* App Content */}
      <MainContent />
    </div>
  );
}

// Wallpapers work offline
function WallpaperScreen() {
  const { getCachedData } = useSyncEngine();
  const wallpapers = getCachedData('wallpapers');
  
  return (
    <div>
      <p className="text-gray-500">
        Showing {wallpapers.length} cached wallpapers
      </p>
      <MasonryFeed wallpapers={wallpapers} />
    </div>
  );
}
```

**What happens:**
1. ✅ User opens app offline
2. ✅ All content loads from cache (localStorage)
3. ✅ User can browse wallpapers, banners, media
4. ✅ Offline banner shows at top
5. ✅ User comes back online
6. ✅ Auto-sync starts immediately
7. ✅ Only changed items are downloaded (delta sync)
8. ✅ UI updates with new content
9. ✅ Toast notification confirms sync

---

## 🎨 SCENARIO 4: Progressive Image Loading in Feed

### User Scrolls Through Wallpapers:

```typescript
// MasonryFeed.tsx with Progressive Loading + Preloading
import { ProgressiveImageLoader } from '../utils/image/imageOptimizer';

function MasonryFeed({ wallpapers }) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const loader = useRef(new ProgressiveImageLoader()).current;
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Preload next 5 wallpapers
    const nextBatch = wallpapers.slice(visibleRange.end, visibleRange.end + 5);
    loader.preloadImages(nextBatch.map((w) => w.urls));
  }, [visibleRange]);
  
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Near bottom - load more
    if (scrollTop + clientHeight > scrollHeight * 0.8) {
      setVisibleRange((prev) => ({
        start: prev.start,
        end: prev.end + 10,
      }));
    }
  }
  
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="masonry-feed"
    >
      {wallpapers.slice(0, visibleRange.end).map((wallpaper) => (
        <ProgressiveWallpaperCard
          key={wallpaper.id}
          wallpaper={wallpaper}
          loader={loader}
        />
      ))}
    </div>
  );
}

function ProgressiveWallpaperCard({ wallpaper, loader }) {
  const [currentUrl, setCurrentUrl] = useState(wallpaper.urls.thumbnail);
  const [loadingStage, setLoadingStage] = useState<string>('lqip');
  
  useEffect(() => {
    // Load progressively: LQIP → thumbnail → small → medium
    loader.loadImage(wallpaper.urls, (stage, url) => {
      setCurrentUrl(url);
      setLoadingStage(stage);
    });
  }, [wallpaper.id]);
  
  return (
    <div className="wallpaper-card">
      <img
        src={currentUrl}
        alt={wallpaper.title}
        className={`progressive-image stage-${loadingStage}`}
      />
      
      {loadingStage !== 'medium' && (
        <div className="loading-indicator">
          <div className="loading-shimmer" />
        </div>
      )}
      
      <div className="wallpaper-info">
        <h3>{wallpaper.title}</h3>
        <div className="meta">
          <span>{wallpaper.category}</span>
          <span>{wallpaper.meta?.views} views</span>
        </div>
      </div>
    </div>
  );
}
```

**Progressive Loading Stages:**
1. ✅ **LQIP** (instant): Tiny blurred 20px placeholder
2. ✅ **Thumbnail** (100ms): 128px low quality preview
3. ✅ **Small** (200ms): 480px medium quality
4. ✅ **Medium** (500ms): 1080px high quality
5. ✅ **Large** (on fullscreen): 1920px full resolution

**Preloading Strategy:**
- Preload next 5 wallpapers when scrolling
- Smooth, seamless experience
- Minimal data usage

---

## 🔧 SCENARIO 5: Admin Monitors Performance

### Admin Dashboard Real-time Monitoring:

```typescript
// AdminDashboardHome.tsx
import { useSyncEngine } from '../utils/sync/syncEngine';
import { chatAnalytics } from '../utils/ai/chatLogger';

function AdminDashboardHome() {
  const { syncStatus } = useSyncEngine();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalWallpapers: 0,
    totalBanners: 0,
    aiChats: 0,
    storageUsed: 0,
  });
  
  useEffect(() => {
    // Real-time stats refresh
    const interval = setInterval(async () => {
      const [userStats, contentStats, aiStats, storageStats] = await Promise.all([
        fetch('/api/admin/stats/users').then((r) => r.json()),
        fetch('/api/admin/stats/content').then((r) => r.json()),
        chatAnalytics.getChatStats(),
        fetch('/api/admin/stats/storage').then((r) => r.json()),
      ]);
      
      setStats({
        totalUsers: userStats.total,
        activeToday: userStats.activeToday,
        totalWallpapers: contentStats.wallpapers,
        totalBanners: contentStats.banners,
        aiChats: aiStats.totalChats,
        storageUsed: storageStats.used,
      });
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="dashboard-home">
      {/* Sync Status */}
      <div className="sync-status">
        <div className={`sync-indicator ${syncStatus.syncInProgress ? 'syncing' : 'idle'}`}>
          {syncStatus.syncInProgress ? (
            <>
              <Loader className="animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Check className="text-green-600" />
              <span>All synced</span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Last sync: {new Date(syncStatus.lastSyncTimestamp).toLocaleString()}
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Active Today" value={stats.activeToday} />
        <StatCard title="Wallpapers" value={stats.totalWallpapers} />
        <StatCard title="AI Chats" value={stats.aiChats} />
        <StatCard title="Storage" value={`${stats.storageUsed} GB`} />
      </div>
      
      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
```

---

## வேல் முருகா! 🙏

**Complete Integration Flows Implemented:**
- ✅ Admin upload → Auto-sync → User receives update
- ✅ User chats → Logged → Admin sees analytics
- ✅ Offline mode → Cached content → Online sync
- ✅ Progressive loading → Smooth UX
- ✅ Real-time monitoring → Admin dashboard

**Everything works seamlessly together!** 🚀
