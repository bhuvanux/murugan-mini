import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { MasonryFeed } from "./components/MasonryFeed";
import { WallpaperFullView } from "./components/WallpaperFullView";
import { SongsScreen } from "./components/SongsScreen";
import { SparkScreen } from "./components/SparkScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { SavedScreen } from "./components/SavedScreen";
import { NotificationsScreen } from "./components/NotificationsScreen";
import { AccountSettingsScreen } from "./components/AccountSettingsScreen";
import { ContactScreen } from "./components/ContactScreen";
import { PrivacyPolicyScreen } from "./components/PrivacyPolicyScreen";
import { SearchBar } from "./components/SearchBar";
import { AdminLauncher } from "./components/AdminLauncher";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { SetupGuide } from "./components/SetupGuide";
import { MuruganLoader } from "./components/MuruganLoader";
import { ServerWarmup } from "./components/ServerWarmup";
import { AppHeader } from "./components/AppHeader";
import { GreenHeader } from "./components/GreenHeader";
import { adService } from "./services/AdService";

import { MediaItem } from "./utils/api/client";
import { supabase } from "./utils/supabase/client";
import { flushAnalytics, setAnalyticsRoute, trackEvent } from "./utils/analytics/trackEvent";
import { startEngagementTracking } from "./utils/analytics/engagement";
import { endSession, startSession } from "./utils/analytics/analyticsSession";
import { hasStoredAnalyticsConsent, setAnalyticsConsent } from "./utils/analytics/consent";
import { ensureControlPollingStarted } from "./core/control/controlSnapshot";
import {

  ImageIcon,
  Music,
  Sparkles,
  User,
} from "lucide-react";

type Tab =
  | "photos"
  | "songs"
  | "spark"
  | "profile"
  | "admin"
  | "saved"
  | "notifications"
  | "account"
  | "contact"
  | "privacy";
type AppMode = "launcher" | "mobile" | "admin";

function AppContent() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("launcher");
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [showAnalyticsConsentBanner, setShowAnalyticsConsentBanner] = useState(false);
  const prevTabRef = React.useRef<Tab>("photos");
  const engagementRef = React.useRef<ReturnType<typeof startEngagementTracking> | null>(null);
  const [selectedMedia, setSelectedMedia] =
    useState<MediaItem | null>(null);
  const [allMediaItems, setAllMediaItems] = useState<MediaItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [tablesExist, setTablesExist] = useState<
    boolean | null
  >(null);


  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const el = document.scrollingElement || document.documentElement;
        el?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    ensureControlPollingStarted();

    // Initialize AdMob
    adService.initialize().catch(err => {
      console.error('AdMob init error in App:', err);
    });

    try {
      if (!hasStoredAnalyticsConsent()) {
        setShowAnalyticsConsentBanner(true);
      }
    } catch {
      // ignore
    }

    if (!engagementRef.current) {
      engagementRef.current = startEngagementTracking({
        getRoute: () => prevTabRef.current,
        idleMs: 60000,
      });
    }

    startSession();
    setAnalyticsRoute(activeTab);

    trackEvent("app_open", { route: window.location.pathname });
    trackEvent("page_enter", { route: activeTab, page: activeTab });
    if (activeTab === "photos") {
      trackEvent("dashboard_view", { route: activeTab });
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        trackEvent("app_background", { route: window.location.pathname });
        endSession();
        flushAnalytics();
      }
    };

    const onBeforeUnload = () => {
      trackEvent("app_close", { route: window.location.pathname });
      endSession();
      flushAnalytics();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    const onNavigate = (e: any) => {
      try {
        const tab = e?.detail?.tab;
        if (typeof tab === "string" && tab.length > 0) {
          setActiveTab(tab as Tab);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("murugan:navigate", onNavigate as any);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("murugan:navigate", onNavigate as any);
      engagementRef.current?.stop();
      engagementRef.current = null;
      endSession();
    };
  }, []);

  React.useEffect(() => {
    const prev = prevTabRef.current;
    if (prev === activeTab) return;

    trackEvent("tab_switch", { from: prev, to: activeTab });
    trackEvent("page_exit", { route: prev, page: prev });
    trackEvent("page_enter", { route: activeTab, page: activeTab });
    if (activeTab === "photos") {
      trackEvent("dashboard_view", { route: activeTab });
    }

    prevTabRef.current = activeTab;
    engagementRef.current?.setRoute(activeTab);
    setAnalyticsRoute(activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    if (user) {
      setShowLogin(false);
      setActiveTab("photos");
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
    } catch (error: any) {
      console.error("Error checking tables:", error);
    }
  };

  const handleMediaSelect = (media: MediaItem, allMedia: MediaItem[]) => {
    setSelectedMedia(media);
    setAllMediaItems(allMedia);
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

  // Show setup guide if tables don't exist
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

  // Show Launcher Screen
  if (appMode === "launcher") {
    return (
      <AdminLauncher
        onSelectMode={(mode) => setAppMode(mode)}
      />
    );
  }

  const skipAuth = import.meta.env.DEV || import.meta.env.VITE_SKIP_AUTH === "true";
  const skipAdminAuth = import.meta.env.VITE_SKIP_ADMIN_AUTH === "true";

  // Show Admin Dashboard
  if (appMode === "admin") {
    if (!skipAdminAuth && !user) {
      return <LoginScreen />;
    }
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminDashboard onExitAdmin={() => setAppMode("launcher")} />
      </div>
    );
  }

  if (!skipAuth && (!user || showLogin)) {
    return <LoginScreen />;
  }

  // Mobile App Mode
  const renderActiveScreen = () => {
    // Profile sub-screens
    if (activeTab === "saved") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <GreenHeader
            title="Saved Items"
            onBack={() => setActiveTab("profile")}
            titleFontFamily="var(--font-english)"
          />

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
          <GreenHeader
            title="Notifications"
            onBack={() => setActiveTab("profile")}
            titleFontFamily="var(--font-english)"
          />

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
          <GreenHeader
            title="Account Settings"
            onBack={() => setActiveTab("profile")}
            titleFontFamily="var(--font-english)"
          />

          {/* Content */}
          <AccountSettingsScreen />
        </div>
      );
    }

    if (activeTab === "contact") {
      return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <GreenHeader
            title="Contact Us"
            onBack={() => setActiveTab("profile")}
            titleFontFamily="var(--font-english)"
          />

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
          <GreenHeader
            title="Privacy Policy"
            onBack={() => setActiveTab("profile")}
            titleFontFamily="var(--font-english)"
          />

          {/* Content */}
          <div className="pt-16">
            <PrivacyPolicyScreen />
          </div>
        </div>
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
            setShowLogin(true);
          }}
        />
      );
    }

    return null;
  };

  const showBottomNav = true;

  const contentBackground =
    activeTab === "spark" ? "#000" : activeTab === "photos" ? "#fff" : "#F2FFF6";

  return (
    <div className="relative min-h-screen bg-white">
      {/* Main Content */}
      <div
        style={{
          paddingBottom: showBottomNav ? "calc(120px + env(safe-area-inset-bottom, 0px))" : undefined,
          background: contentBackground,
        }}
      >
        {renderActiveScreen()}
      </div>

      {showAnalyticsConsentBanner && (
        <div
          className="fixed left-4 right-4 z-50 rounded-2xl border border-[#E6F0EA] bg-white shadow-[0px_10px_25px_rgba(0,0,0,0.12)]"
          style={{
            bottom: showBottomNav ? "calc(96px + env(safe-area-inset-bottom, 0px))" : "16px",
          }}
        >
          <div className="p-4">
            <div
              className="text-sm font-semibold text-gray-900"
              style={{ fontFamily: "var(--font-tamil-bold)" }}
            >
              இந்த செயலியில் பயன்பாட்டை மேம்படுத்த பயன்பாட்டு தகவல்கள் சேகரிக்கப்படுகின்றன.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-[#0d5e38] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setAnalyticsConsent({ analytics: true });
                  setShowAnalyticsConsentBanner(false);
                }}
              >
                சரி
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-[#E6F0EA] bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                onClick={() => {
                  setAnalyticsConsent({ analytics: false });
                  setShowAnalyticsConsentBanner(false);
                }}
              >
                வேண்டாம்
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Detail Overlay */}
      {selectedMedia && allMediaItems && (
        <WallpaperFullView
          media={allMediaItems}
          initialIndex={allMediaItems.findIndex(m => m.id === selectedMedia.id)}
          onClose={closeMediaDetail}
        />
      )}

      {/* Bottom Navigation - Hide on Chat screens only */}
      {showBottomNav && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 shadow-[0px_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
          style={{ background: "#0d5e38" }}
        >
          {/* Tab Buttons */}
          <div className="flex justify-around items-center px-2 pt-[12px] pb-[16px] pr-[0px] pl-[0px]">


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