import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "./contexts/AdminAuthContext";
import { SplashScreen } from "./components/SplashScreen";
import { AuthContainer } from "./components/auth/AuthContainer";
import { MasonryFeed } from "./components/MasonryFeed";
import { WallpaperFullView } from "./components/WallpaperFullView";
import { SongsScreen } from "./components/SongsScreen";
import { SparkScreen } from "./components/SparkScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { AskGuganScreen } from "./components/AskGuganScreen";
import { AskGuganChatScreen } from "./components/AskGuganChatScreen";
import { SavedScreen } from "./components/SavedScreen";
import { NotificationsScreen } from "./components/NotificationsScreen";
import { AccountSettingsScreen } from "./components/AccountSettingsScreen";
import { ContactScreen } from "./components/ContactScreen";
import { PrivacyPolicyScreen } from "./components/PrivacyPolicyScreen";
import { SearchBar } from "./components/SearchBar";
import { AdminUpload } from "./components/AdminUpload";
import { AdminLauncher } from "./components/AdminLauncher";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminLogin } from "./components/admin/AdminLogin";
import { SetupGuide } from "./components/SetupGuide";
import { MuruganLoader } from "./components/MuruganLoader";
import { ServerWarmup } from "./components/ServerWarmup";
import { AppHeader } from "./components/AppHeader";
import { MediaItem, userAPI } from "./utils/api/client";
import { apiCache } from "./utils/api/cache";
import { trackAppInstall, sendHeartbeat } from "./utils/analytics/installTracker";
import { YouTubeMusicPlayer } from "./components/YouTubeMusicPlayer";
import { supabase } from "./utils/supabase/client";
import { analyticsTracker } from "./utils/analytics/useAnalytics";
import {
  ImageIcon,
  Music,
  Sparkles,
  User,
  Loader2,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import { Toaster } from "sonner";
import 'sonner/dist/styles.css'; // Essential for proper styling
import { WelcomeBanner } from "./components/WelcomeBanner";
import { setupPushNotifications } from "./utils/pushNotifications";
import { InAppBannerNotification } from "./components/InAppBannerNotification";
import { FullscreenBannerNotification } from "./components/FullscreenBannerNotification";

type Tab = "photos" | "songs" | "spark" | "profile" | "admin" | "saved" | "notifications" | "account" | "contact" | "privacy";
type AppMode = "launcher" | "mobile" | "admin";

function AppContent() {
  const { user, loading } = useAuth();
  const { adminUser, loading: adminLoading } = useAdminAuth();

  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash screen for native mobile apps, not web
    return Capacitor.isNativePlatform();
  });
  const [appMode, setAppMode] = useState<AppMode>(() => {
    if (Capacitor.isNativePlatform()) return "mobile";
    // Check localStorage for persisted admin mode
    const savedMode = localStorage.getItem('app_mode');
    if (savedMode === 'admin') return 'admin';
    if (window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    return 'mobile';
  });

  // Debug user state
  console.log('[App] User state:', { user, loading, appMode });

  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [mediaCategory, setMediaCategory] = useState<'wallpapers' | 'media'>('wallpapers');
  const [isInnerPage, setIsInnerPage] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [allMediaItems, setAllMediaItems] = useState<MediaItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [welcomeBanner, setWelcomeBanner] = useState<{
    id: string,
    imageUrl: string,
    orientation?: 'vertical' | 'horizontal',
    title?: string,
    description?: string,
    targetUrl?: string
  } | null>(null);

  // Global Player State
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [playerPlaylist, setPlayerPlaylist] = useState<MediaItem[]>([]);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (user) {
      checkTablesAndLoadFavorites();
    }
  }, [user]);

  // Handle Android Back Button
  useEffect(() => {
    // Only run on native platform
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = async () => {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        console.log('[App] Back button pressed. State:', {
          isPlayerOpen,
          welcomeBanner: !!welcomeBanner,
          selectedMedia: !!selectedMedia,
          isInnerPage,
          activeTab
        });

        // Priority 1: Close Overlays
        if (welcomeBanner) {
          setWelcomeBanner(null);
          return;
        }

        if (selectedMedia) {
          closeMediaDetail();
          return;
        }

        if (isPlayerOpen) {
          // If player is expanded, collapse it (optional behavior, here we might want to just let it play correctly)
          // Assuming "back" means "close player view" but keep playing? 
          // Currently player is global bottom sheet style. 
          // Let's assume back closes the player view if we consider it a modal, 
          // BUT current UI shows player conditionally. 
          // Let's stick strictly to what "closeMediaDetail" logic covers or similar.
          setIsPlayerOpen(false);
          return;
        }

        // Priority 2: Inner Pages / Sub-screens
        if (isInnerPage) {
          // Return to main content for the current tab
          setIsInnerPage(false);
          return;
        }

        // Priority 3: Navigate Tabs
        if (activeTab !== 'photos') {
          setActiveTab('photos');
          return;
        }

        // Priority 4: Exit App (Home Tab)
        // If we are here, we are on Photos tab, no overlays, no inner page.
        // Let Capacitor handle default (which is usually exit or minimize)
        // or explicitly exit.
        CapacitorApp.exitApp();
      });
    };

    const listener = handleBackButton();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [welcomeBanner, selectedMedia, isPlayerOpen, isInnerPage, activeTab]);

  // Track session start for authenticated users
  React.useEffect(() => {
    if (user && !loading) {
      analyticsTracker.track('auth', '00000000-0000-0000-0000-000000000001', 'session_start', {
        user_id: user.id,
        city: user.user_metadata?.city
      });
    }
  }, [user, loading]);

  // Load welcome banner function
  const loadWelcomeBanner = React.useCallback(async () => {
    if (!user) {
      console.log('[WelcomeBanner] No user, skipping');
      return;
    }

    console.log('[WelcomeBanner] Starting load for user:', user.phone);

    try {
      // Check localStorage first (quick dismissal check)
      const dismissedBanners = JSON.parse(localStorage.getItem('dismissed_banners') || '[]');
      console.log('[WelcomeBanner] Dismissed banners:', dismissedBanners);

      // Fetch active welcome banner
      const { data: banners, error: fetchError } = await supabase
        .from('banners')
        .select('*')
        .eq('is_welcome_banner', true)
        .eq('publish_status', 'published')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('[WelcomeBanner] Fetch error:', fetchError);
        return;
      }

      console.log('[WelcomeBanner] Fetched banners:', banners);

      if (banners && banners.length > 0) {
        const banner = banners[0];

        // Skip if already dismissed locally
        if (dismissedBanners.includes(banner.id)) {
          console.log('[WelcomeBanner] Already dismissed locally');
          return;
        }

        // Check database dismissals
        const { data: dismissed } = await supabase
          .from('banner_dismissals')
          .select('id')
          .eq('banner_id', banner.id)
          .or(`user_id.eq.${user.id},phone.eq.${user.phone}`)
          .maybeSingle();

        if (!dismissed) {
          // Determine orientation from metadata or fallback to 'vertical'
          const metadata = banner.metadata || {};
          // Check both camelCase and snake_case keys in metadata, or top-level if column existed (but we rely on metadata here)
          const orientation = metadata.displayOrientation || metadata.display_orientation || banner.display_orientation || 'vertical';

          console.log(`[WelcomeBanner] Detected orientation: ${orientation}`);

          // Track view
          await supabase.from('unified_analytics').insert({
            module: 'banner',
            event_type: 'view',
            content_id: banner.id,
            user_id: user.id.startsWith('mock-') ? null : user.id,
            metadata: {
              banner_type: 'welcome',
              display_orientation: orientation,
              city: user.user_metadata?.city
            }
          });

          setWelcomeBanner({
            id: banner.id,
            imageUrl: banner.image_url,
            orientation: orientation as 'vertical' | 'horizontal',
            title: banner.title,
            description: banner.description,
            targetUrl: banner.target_url || metadata.target_url
          });
          console.log('[WelcomeBanner] ✅ Loaded and displaying:', banner.title);
        } else {
          console.log('[WelcomeBanner] Already dismissed in database');
        }
      } else {
        console.log('[WelcomeBanner] No welcome banners found in database');
      }
    } catch (error) {
      console.error('[WelcomeBanner] Failed to fetch:', error);
    }
  }, [user]);

  // Reset app state on user change (fresh login or logout)
  React.useEffect(() => {
    if (user?.id) {
      // New user logged in - reset to home tab and clear stale favorites
      setActiveTab('photos');
      setFavorites(new Set());
      console.log('[App] User changed, reset to fresh state');

      // Load welcome banner for this user
      loadWelcomeBanner();

      // Initialize Push Notifications
      setupPushNotifications(user.id);
    }
  }, [user?.id, loadWelcomeBanner]);

  const checkTablesAndLoadFavorites = async () => {
    try {
      const { error: mediaError } = await supabase.from("media").select("id").limit(1);
      const { error: favError } = await supabase.from("user_favorites").select("media_id").limit(1);

      if (mediaError?.code === "PGRST205" || favError?.code === "PGRST205") {
        setTablesExist(false);
        setShowSetupGuide(true);
        return;
      }
      setTablesExist(true);
      loadFavorites();
    } catch (error: any) {
      console.error("Error checking tables:", error);
    }
  };

  const loadFavorites = async () => {
    try {
      // DO NOT load from localStorage - it causes data bleeding between users
      // Favorites should be loaded from database based on authenticated user
      // For now, start with empty favorites - they'll be set when user likes items
      console.log('[App] Favorites initialized empty for fresh user session');
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (mediaId: string) => {
    const isFavorited = favorites.has(mediaId);
    try {
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        localStorage.setItem('user_favorites', JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      if (!isFavorited) {
        await userAPI.likeMedia(mediaId);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleMediaSelect = (media: MediaItem, allMedia: MediaItem[]) => {
    setSelectedMedia(media);
    setAllMediaItems(allMedia);
  };

  const handlePlaySong = (songs: any[], index: number) => {
    setPlayerPlaylist(songs);
    setCurrentSongIndex(index);
    setIsPlayerOpen(true);
  };

  const handleMediaUpdate = (mediaId: string, updates: Partial<MediaItem>) => {
    if (allMediaItems) {
      const updatedMedia = allMediaItems.map(item =>
        item.id === mediaId ? { ...item, ...updates } : item
      );
      setAllMediaItems(updatedMedia);
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia({ ...selectedMedia, ...updates });
      }
    }
  };

  const closeMediaDetail = () => {
    setSelectedMedia(null);
    setAllMediaItems(null);
  };

  // Reset inner page state and close player when switching tabs
  useEffect(() => {
    setIsPlayerOpen(false);
    setIsInnerPage(tabIsInner(activeTab));
  }, [activeTab]);

  const tabIsInner = (tab: Tab) => {
    return ["saved", "notifications", "account", "contact", "privacy"].includes(tab);
  };

  // Debug banner rendering
  React.useEffect(() => {
    console.log('[App] 🔔 Banner render decision:', {
      hasUser: !!user,
      userId: user?.id,
      userPhone: user?.phone,
      appMode,
      shouldRenderBanner: !!user
    });
  }, [user, appMode]);

  // Handle splash screen completion
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Track App Install & Periodic Heartbeat
  React.useEffect(() => {
    trackAppInstall();

    // Initial heartbeat
    sendHeartbeat();

    // Periodic heartbeat every 30 seconds for refined active user tracking (2min threshold)
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // Persist app mode to localStorage when it changes
  useEffect(() => {
    if (appMode === 'admin') {
      localStorage.setItem('app_mode', 'admin');
    } else if (appMode === 'mobile' && !Capacitor.isNativePlatform()) {
      localStorage.removeItem('app_mode');
    }
  }, [appMode]);

  if (showSplash) return <SplashScreen />;

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0d5e38] to-black">
        <MuruganLoader size={32} />
      </div>
    );
  }

  // For mobile mode, require user authentication first
  if (!user && appMode !== "admin") return <AuthContainer />;

  if (showSetupGuide && tablesExist === false) {
    return (
      <SetupGuide
        onClose={() => {
          setShowSetupGuide(false);
          setTablesExist(null);
          checkTablesAndLoadFavorites();
        }}
      />
    );
  }


  if (appMode === "launcher") {
    return <AdminLauncher onSelectMode={(mode) => setAppMode(mode)} />;
  }

  if (appMode === "admin") {
    // Show loading state while checking admin authentication
    if (adminLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
          <MuruganLoader size={32} />
        </div>
      );
    }

    // Require admin authentication
    if (!adminUser) {
      return <AdminLogin />;
    }

    // Admin is authenticated, show dashboard
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminDashboard />
      </div>
    );
  }

  const renderActiveScreen = () => {
    if (activeTab === "saved") return <SavedScreen onSelectMedia={handleMediaSelect} onBack={() => setActiveTab("profile")} />;
    if (activeTab === "notifications") return <NotificationsScreen onBack={() => setActiveTab("profile")} />;
    if (activeTab === "account") return <AccountSettingsScreen onBack={() => setActiveTab("profile")} />;
    if (activeTab === "contact") return <ContactScreen onBack={() => setActiveTab("profile")} />;
    if (activeTab === "privacy") return <PrivacyPolicyScreen onBack={() => setActiveTab("profile")} />;

    if (activeTab === "photos") {
      return (
        <div className="min-h-screen bg-white">
          <AppHeader title={mediaCategory === 'wallpapers' ? "Wallpapers" : "Videos"}>
            <div className="space-y-4">
              {/* Category Tabs */}
              <div className="flex bg-black/10 p-1 rounded-xl">
                <button
                  onClick={() => setMediaCategory('wallpapers')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mediaCategory === 'wallpapers' ? 'bg-white text-[#0d5e38] shadow-sm' : 'text-white/70'}`}
                >
                  Wallpapers
                </button>
                <button
                  onClick={() => setMediaCategory('media')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mediaCategory === 'media' ? 'bg-white text-[#0d5e38] shadow-sm' : 'text-white/70'}`}
                >
                  Videos
                </button>
              </div>

              {/* <SearchBar onSearch={setSearchQuery} placeholder={`Search murugan ${mediaCategory === 'wallpapers' ? 'photos' : 'videos'}...`} /> */}
            </div>
          </AppHeader>
          <div style={{ paddingTop: 'calc(145px + env(safe-area-inset-top))' }}> {/* Adjusted padding to match exact header height (user requested 145px) + safe area */}
            <MasonryFeed
              category={mediaCategory}
              searchQuery={searchQuery}
              onSelectMedia={handleMediaSelect}
              onTablesNotFound={() => setShowSetupGuide(true)}
            />
          </div>
        </div>
      );
    }

    if (activeTab === "songs") {
      return (
        <div className="h-screen bg-[#F2FFF6] overflow-hidden">
          <SongsScreen
            onPlaySong={handlePlaySong}
            externalCurrentIndex={currentSongIndex}
            externalPlaylist={playerPlaylist as any}
            onStopGlobalPlayer={() => {
              setCurrentSongIndex(null);
              setIsPlayerOpen(false);
            }}
          />
        </div>
      );
    }

    if (activeTab === "spark") return <SparkScreen />;

    if (activeTab === "profile") {
      return (
        <ProfileScreen
          onNavigate={(tab) => setActiveTab(tab)}
          onLogout={() => console.log("User logged out")}
          onSubScreenChange={setIsInnerPage}
        />
      );
    }

    return null;
  };

  return (
    <div className="relative min-h-screen bg-white text-gray-900">
      {/* In-App Notification Banner */}
      {/* In-app notifications */}
      {user && (
        <>
          <InAppBannerNotification />
          <FullscreenBannerNotification />
        </>
      )}

      {renderActiveScreen()}

      {selectedMedia && allMediaItems && (
        <WallpaperFullView
          media={allMediaItems}
          initialIndex={allMediaItems.findIndex(m => m.id === selectedMedia.id)}
          onClose={closeMediaDetail}
        />
      )}

      {!isInnerPage && !selectedMedia && activeTab !== "spark" && currentSongIndex !== null && playerPlaylist.length > 0 && (
        <YouTubeMusicPlayer
          songs={playerPlaylist as any}
          currentIndex={currentSongIndex}
          autoPlay={true}
          onClose={() => {
            setCurrentSongIndex(null);
            setIsPlayerOpen(false);
          }}
          onSongChange={(index) => setCurrentSongIndex(index)}
          onToggleFavorite={toggleFavorite}
          onShare={(song) => console.log('Sharing from global player:', song)}
          favorites={favorites}
        />
      )}

      {!isInnerPage && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[999] shadow-[0px_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-auto"
          style={{ background: "#0d5e38" }}
        >
          <div className="flex justify-around items-center px-2 pt-[12px]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <button
              onClick={() => setActiveTab("photos")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "photos" ? "bg-white/20 scale-105" : "hover:bg-white/10"}`}
            >
              <ImageIcon className={`w-6 h-6 transition-all duration-300 ${activeTab === "photos" ? "text-white" : "text-white/70"}`} />
              <span className={`text-xs transition-all duration-300 ${activeTab === "photos" ? "text-white font-bold" : "text-white/70 font-medium"}`}>Photos</span>
            </button>

            <button
              onClick={() => setActiveTab("songs")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "songs" ? "bg-white/20 scale-105" : "hover:bg-white/10"}`}
            >
              <Music className={`w-6 h-6 transition-all duration-300 ${activeTab === "songs" ? "text-white" : "text-white/70"}`} />
              <span className={`text-xs transition-all duration-300 ${activeTab === "songs" ? "text-white font-bold" : "text-white/70 font-medium"}`}>Songs</span>
            </button>

            <button
              onClick={() => setActiveTab("spark")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "spark" ? "bg-white/20 scale-105" : "hover:bg-white/10"}`}
            >
              <Sparkles className={`w-6 h-6 transition-all duration-300 ${activeTab === "spark" ? "text-white" : "text-white/70"}`} />
              <span className={`text-xs transition-all duration-300 ${activeTab === "spark" ? "text-white font-bold" : "text-white/70 font-medium"}`}>Spark</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ease-out ${activeTab === "profile" ? "bg-white/20 scale-105" : "hover:bg-white/10"}`}
            >
              <User className={`w-6 h-6 transition-all duration-300 ${activeTab === "profile" ? "text-white" : "text-white/70"}`} />
              <span className={`text-xs transition-all duration-300 ${activeTab === "profile" ? "text-white font-bold" : "text-white/70 font-medium"}`}>Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      {welcomeBanner && (
        <WelcomeBanner
          bannerId={welcomeBanner.id}
          imageUrl={welcomeBanner.imageUrl}
          onDismiss={() => setWelcomeBanner(null)}
        />
      )}
    </div>
  );
}

try {
  if (typeof window !== 'undefined') {
    apiCache.clear();
    localStorage.removeItem('api_cache');
  }
} catch (e) {
  console.error("Failed to clear cache", e);
}

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <ServerWarmup />
        <Toaster position="top-center" richColors toastOptions={{ style: { zIndex: 9999 } }} />
        <AppContent />
      </AdminAuthProvider>
    </AuthProvider>
  );
}