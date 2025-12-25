import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
import { SetupGuide } from "./components/SetupGuide";
import { MuruganLoader } from "./components/MuruganLoader";
import { ServerWarmup } from "./components/ServerWarmup";
import { AppHeader } from "./components/AppHeader";
import { MediaItem, userAPI } from "./utils/api/client";
import { supabase } from "./utils/supabase/client";
import {
  ImageIcon,
  Music,
  Sparkles,
  User,
  Loader2,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";

type Tab = "gugan" | "photos" | "songs" | "spark" | "profile" | "admin" | "saved" | "notifications" | "account" | "contact" | "privacy";
type AppMode = "launcher" | "mobile" | "admin";

function AppContent() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>("launcher");
  const [activeTab, setActiveTab] = useState<Tab>("gugan");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatListRefreshKey, setChatListRefreshKey] = useState(0);
  const [selectedMedia, setSelectedMedia] =
    useState<MediaItem | null>(null);
  const [allMediaItems, setAllMediaItems] = useState<MediaItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(),
  );
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [tablesExist, setTablesExist] = useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    if (user) {
      checkTablesAndLoadFavorites();
    }
  }, [user]);

  const checkTablesAndLoadFavorites = async () => {
    try {
      // Try to query the media table to check if it exists
      const { error: mediaError } = await supabase
        .from("media")
        .select("id")
        .limit(1);

      const { error: favError } = await supabase
        .from("user_favorites")
        .select("media_id")
        .limit(1);

      // Check if tables don't exist (PGRST205 error)
      if (
        mediaError?.code === "PGRST205" ||
        favError?.code === "PGRST205"
      ) {
        console.log(
          "Database tables not found. Please complete Supabase setup.",
        );
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
      // Load favorites from localStorage
      const savedFavorites = localStorage.getItem('user_favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (mediaId: string) => {
    const isFavorited = favorites.has(mediaId);

    try {
      // Update local state immediately (optimistic update)
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        // Save to localStorage
        localStorage.setItem('user_favorites', JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      // Call backend API to track like
      if (!isFavorited) {
        try {
          await userAPI.likeMedia(mediaId);
          console.log('[App] Like tracked successfully');
        } catch (apiError: any) {
          console.error('[App] Failed to track like:', apiError);
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        localStorage.setItem('user_favorites', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    }
  };

  const handleMediaSelect = (media: MediaItem, allMedia: MediaItem[]) => {
    setSelectedMedia(media);
    setAllMediaItems(allMedia);
  };

  const handleMediaChange = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  // ✅ NEW: Update media item in the allMediaItems array
  const handleMediaUpdate = (mediaId: string, updates: Partial<MediaItem>) => {
    if (allMediaItems) {
      const updatedMedia = allMediaItems.map(item =>
        item.id === mediaId ? { ...item, ...updates } : item
      );
      setAllMediaItems(updatedMedia);

      // Also update selectedMedia if it's the one being updated
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia({ ...selectedMedia, ...updates });
      }

      console.log(`[App] ✅ Updated media ${mediaId} with:`, updates);
    }
  };

  const closeMediaDetail = () => {
    setSelectedMedia(null);
    setAllMediaItems(null);
  };

  // Handle splash screen completion
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0d5e38] to-black">
        <MuruganLoader size={60} />
      </div>
    );
  }

  // Auth Guard: If no user, show AuthContainer
  if (!user) {
    return <AuthContainer />;
  }

  // Show setup guide if tables don't exist
  if (showSetupGuide && tablesExist === false) {
    return (
      <SetupGuide
        onComplete={() => {
          setShowSetupGuide(false);
          setTablesExist(null);
          checkTablesAndLoadFavorites();
        }}
      />
    );
  }

  // Show Launcher Screen
  if (appMode === "launcher") {
    return (
      <AdminLauncher
        onSelectMode={(mode) => setAppMode(mode)}
      />
    );
  }

  // Show Admin Dashboard
  if (appMode === "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminDashboard />
      </div>
    );
  }

  // Mobile App Mode
  const renderActiveScreen = () => {
    // Profile sub-screens
    if (activeTab === "saved") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-[#0d5e38] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white flex-1">Saved Items</h1>
          </div>

          {/* Content */}
          <div className="pt-16">
            <SavedScreen onSelectMedia={handleMediaSelect} />
          </div>
        </div>
      );
    }

    if (activeTab === "notifications") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-[#0d5e38] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white flex-1">Notifications</h1>
          </div>

          {/* Content */}
          <div className="pt-16">
            <NotificationsScreen />
          </div>
        </div>
      );
    }

    if (activeTab === "account") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header without kolam */}
          <AppHeader title="" showKolam={false}>
            <button
              onClick={() => setActiveTab("profile")}
              className="absolute left-4 top-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white text-center" style={{ fontFamily: 'var(--font-english)', fontWeight: 600, fontSize: '18px' }}>
              Account Settings
            </h1>
          </AppHeader>

          {/* Content */}
          <AccountSettingsScreen />
        </div>
      );
    }

    if (activeTab === "contact") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-[#0d5e38] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white flex-1">Contact Us</h1>
          </div>

          {/* Content */}
          <div className="pt-16">
            <ContactScreen />
          </div>
        </div>
      );
    }

    if (activeTab === "privacy") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-[#0d5e38] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white flex-1">Privacy Policy</h1>
          </div>

          {/* Content */}
          <div className="pt-16">
            <PrivacyPolicyScreen />
          </div>
        </div>
      );
    }

    // Main tabs
    if (activeTab === "gugan") {
      if (activeChatId) {
        return (
          <AskGuganChatScreen
            chatId={activeChatId}
            onBack={() => {
              setActiveChatId(null);
              setChatListRefreshKey((prev) => prev + 1);
            }}
            userId={user?.id}
          />
        );
      }
      return (
        <AskGuganScreen
          key={chatListRefreshKey}
          onStartChat={(chatId) => setActiveChatId(chatId)}
          userId={user?.id}
        />
      );
    }

    if (activeTab === "photos") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header Section with Green Background */}
          <AppHeader title="Wallpapers">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search murugan photos, videos..."
            />
          </AppHeader>

          {/* Masonry Feed */}
          <MasonryFeed
            searchQuery={searchQuery}
            onSelectMedia={handleMediaSelect}
            onTablesNotFound={() => setShowSetupGuide(true)}
          />
        </div>
      );
    }

    if (activeTab === "songs") {
      return (
        <div className="min-h-screen bg-[#F2FFF6]">
          <SongsScreen />
        </div>
      );
    }

    if (activeTab === "spark") {
      return <SparkScreen />;
    }

    if (activeTab === "profile") {
      return (
        <ProfileScreen
          onNavigate={(tab) => setActiveTab(tab)}
          onLogout={() => {
            console.log("User logged out");
            // Auth Guard in AppContent will handle showing AuthContainer
          }}
        />
      );
    }

    return null;
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Main Content */}
      {renderActiveScreen()}

      {/* Media Detail Overlay */}
      {selectedMedia && allMediaItems && (
        <WallpaperFullView
          media={allMediaItems}
          initialIndex={allMediaItems.findIndex(m => m.id === selectedMedia.id)}
          onClose={closeMediaDetail}
        />
      )}

      {/* Bottom Navigation - Hide on Chat screens only */}
      {!activeChatId && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 shadow-[0px_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
          style={{ background: "#0d5e38" }}
        >
          {/* Tab Buttons */}
          <div className="flex justify-around items-center px-2 pt-[12px] pb-[16px] pr-[0px] pl-[0px]">
            {/* Ask Gugan Tab */}
            <button
              onClick={() => {
                setActiveTab("gugan");
                setActiveChatId(null);
              }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === "gugan"
                  ? "bg-white/20 scale-105"
                  : "hover:bg-white/10"
                }`}
            >
              <MessageCircle
                className={`w-6 h-6 ${activeTab === "gugan" ? "text-white" : "text-white/70"
                  }`}
              />
              <span
                className={`text-xs ${activeTab === "gugan" ? "text-white" : "text-white/70"
                  }`}
              >
                Ask Gugan
              </span>
            </button>

            {/* Photos Tab */}
            <button
              onClick={() => setActiveTab("photos")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === "photos"
                  ? "bg-white/20 scale-105"
                  : "hover:bg-white/10"
                }`}
            >
              <ImageIcon
                className={`w-6 h-6 ${activeTab === "photos" ? "text-white" : "text-white/70"
                  }`}
              />
              <span
                className={`text-xs ${activeTab === "photos" ? "text-white" : "text-white/70"
                  }`}
              >
                Photos
              </span>
            </button>

            {/* Songs Tab */}
            <button
              onClick={() => setActiveTab("songs")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === "songs"
                  ? "bg-white/20 scale-105"
                  : "hover:bg-white/10"
                }`}
            >
              <Music
                className={`w-6 h-6 ${activeTab === "songs" ? "text-white" : "text-white/70"
                  }`}
              />
              <span
                className={`text-xs ${activeTab === "songs" ? "text-white" : "text-white/70"
                  }`}
              >
                Songs
              </span>
            </button>

            {/* Spark Tab */}
            <button
              onClick={() => setActiveTab("spark")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === "spark"
                  ? "bg-white/20 scale-105"
                  : "hover:bg-white/10"
                }`}
            >
              <Sparkles
                className={`w-6 h-6 ${activeTab === "spark" ? "text-white" : "text-white/70"
                  }`}
              />
              <span
                className={`text-xs ${activeTab === "spark" ? "text-white" : "text-white/70"
                  }`}
              >
                Spark
              </span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === "profile"
                  ? "bg-white/20 scale-105"
                  : "hover:bg-white/10"
                }`}
            >
              <User
                className={`w-6 h-6 ${activeTab === "profile" ? "text-white" : "text-white/70"
                  }`}
              />
              <span
                className={`text-xs ${activeTab === "profile" ? "text-white" : "text-white/70"
                  }`}
              >
                Profile
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ServerWarmup />
      <AppContent />
    </AuthProvider>
  );
}