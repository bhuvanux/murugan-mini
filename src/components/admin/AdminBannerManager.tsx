import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, BarChart3, FolderInput, Settings, CheckSquare, Square, Grid3x3, List, Calendar as CalendarIcon, Clock, MousePointer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AddBannerModal } from "./AddBannerModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { BannerDatabaseChecker } from "./BannerDatabaseChecker";
import { FolderDropdown } from "./FolderDropdown";
import { CountdownTimerBadge } from "./CountdownTimerBadge";
import { ScheduleActionDropdown } from "./ScheduleActionDropdown";
import { RescheduleDialog } from "./RescheduleDialog";
import { FoldersSetupGuide } from "./FoldersSetupGuide";
import { BannerAnalyticsDrawer } from "./BannerAnalyticsDrawer";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";
import * as adminAPI from "../../utils/adminAPI";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { optimizeSupabaseUrl } from "../../utils/imageHelper";
import { subscribeToBannerChanges, unsubscribeFromBannerChanges } from "../../utils/bannerAPI";

interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  small_url?: string;
  medium_url?: string;
  large_url?: string;
  thumbnail_url?: string;
  publish_status: string;
  visibility: string;
  view_count: number;
  click_count: number;
  created_at: string;
  tags?: string[];
  folder_id?: string;
  scheduled_at?: string;
  target_url?: string;
}

interface BannerFolder {
  id: string;
  name: string;
  description?: string;
  banner_count: number;
  created_at: string;
}

type ViewMode = "card" | "list";

export function AdminBannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "scheduled" | "draft">("published");
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [showFoldersSetup, setShowFoldersSetup] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Date range filter for analytics
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());
  const [datePreset, setDatePreset] = useState<DateRangePreset>("month");

  // Aggregate analytics for the date range
  const [aggregateAnalytics, setAggregateAnalytics] = useState<{
    total_views: number;
    total_clicks: number;
  } | null>(null);

  // Folder & Analytics state
  const [folders, setFolders] = useState<BannerFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [analyticsBannerId, setAnalyticsBannerId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Bulk selection state
  const [selectedBanners, setSelectedBanners] = useState<Set<string>>(new Set());
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Reschedule modal state
  const [rescheduleBanner, setRescheduleBanner] = useState<Banner | null>(null);

  // Load banners from backend
  const loadBanners = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminBannerManager] Starting to load banners...');

      // Always load ALL banners - filtering is done client-side
      const result = await adminAPI.getBanners();

      console.log("[AdminBannerManager] Loaded banners:", result);

      setBanners(result.data || []);

      if ((result.data || []).length === 0 && !selectedFolder) {
        toast.info("No banners found. Upload your first banner!");
      }

      // Hide database setup if data loaded successfully
      setShowDatabaseSetup(false);
    } catch (error: any) {
      console.error("[AdminBannerManager] Load error:", error);

      // Show database setup guide if error indicates missing tables
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("500") ||
        error.message.includes("relation") ||
        error.message.includes("schema cache") ||
        error.message.includes("Could not find the table")
      ) {
        setShowDatabaseSetup(true);
      }

      // Show detailed error message
      toast.error("Database tables not found", {
        duration: 8000,
        description: "Please follow the setup guide above to create the database tables.",
      });

      // Set empty array so UI doesn't break
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load aggregate analytics for date range
  const loadAggregateAnalytics = async () => {
    if (!startDate || !endDate) {
      console.log('[AdminBannerManager] Skipping analytics load - missing dates');
      return;
    }

    // Validate dates are valid Date objects
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
      !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      console.error('[AdminBannerManager] Invalid date objects:', { startDate, endDate });
      setAggregateAnalytics(null);
      return;
    }

    try {
      console.log('[AdminBannerManager] Loading aggregate analytics for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        content_type: 'banner',
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/aggregate?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log('[AdminBannerManager] Aggregate analytics loaded:', result.data);
        setAggregateAnalytics(result.data);
      } else {
        console.warn('[AdminBannerManager] Analytics response not successful:', result);
        setAggregateAnalytics(null);
      }
    } catch (error: any) {
      console.error('[AdminBannerManager] Failed to load aggregate analytics:', error);
      // Don't crash - just clear the analytics
      setAggregateAnalytics(null);
    }
  };

  // Load folders
  const loadFolders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/banner-folders`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();

      // Check if response indicates missing tables
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        console.log('[Banner Folders] Tables not set up yet - folder features will be hidden');
        setShowFoldersSetup(true);
        setFolders([]); // Empty folders - hide sidebar
        return;
      }

      if (result.success) {
        // Calculate banner counts for each folder from loaded banners
        const foldersWithCounts = (result.data || []).map((folder: any) => ({
          ...folder,
          banner_count: banners.filter(b => b.folder_id === folder.id).length,
        }));
        setFolders(foldersWithCounts);
        setShowFoldersSetup(false); // Hide setup guide if folders loaded successfully
      } else {
        // Check if error is about missing tables
        if (result.error?.includes('banner_folders') || result.error?.includes('PGRST205') || result.code === 'PGRST205') {
          console.log('[Banner Folders] Tables not found - showing setup guide');
          setShowFoldersSetup(true);
          setFolders([]);
        }
      }
    } catch (error: any) {
      console.log('[Banner Folders] Error loading folders - likely tables not created yet');
      // Silently fail - folders are optional
      setShowFoldersSetup(true);
      setFolders([]);
    }
  };

  // Create folder
  const createFolder = async (name: string, description?: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/banner-folders`,
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

      // Check if response indicates missing tables
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        setShowFoldersSetup(true);
        throw new Error('Please set up the database tables first. See the orange banner above for instructions.');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to create folder');
      }

      // Reload folders
      await loadFolders();
    } catch (error: any) {
      // Check if it's a missing table error
      if (error.message?.includes('PGRST205') || error.message?.includes('schema cache') || error.message?.includes('database tables')) {
        setShowFoldersSetup(true);
      }
      throw error;
    }
  };

  // Update folder
  const updateFolder = async (folderId: string, name: string, description?: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/banner-folders/${folderId}`,
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
    if (!result.success) throw new Error(result.error || 'Failed to update folder');

    await loadFolders();
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/banner-folders/${folderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete folder');

    // Clear selection if deleted folder was selected
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }

    await loadFolders();
  };

  // Open analytics drawer
  const openAnalytics = (bannerId: string) => {
    setAnalyticsBannerId(bannerId);
    setIsAnalyticsOpen(true);
  };

  // Toggle banner selection
  const toggleBannerSelection = (bannerId: string) => {
    const newSelection = new Set(selectedBanners);
    if (newSelection.has(bannerId)) {
      newSelection.delete(bannerId);
    } else {
      newSelection.add(bannerId);
    }
    setSelectedBanners(newSelection);
  };

  // Select all banners
  const selectAll = () => {
    const filtered = getFilteredBanners();
    setSelectedBanners(new Set(filtered.map(b => b.id)));
  };

  // Deselect all banners
  const deselectAll = () => {
    setSelectedBanners(new Set());
  };

  // Move selected banners to folder
  const moveToFolder = async () => {
    if (selectedBanners.size === 0) {
      toast.error("No banners selected");
      return;
    }

    try {
      // Update each banner's folder_id
      const promises = Array.from(selectedBanners).map(bannerId =>
        adminAPI.updateBanner(bannerId, {
          folder_id: targetFolderId || null,
        })
      );

      await Promise.all(promises);

      toast.success(`Moved ${selectedBanners.size} banner(s) to folder`);
      setShowMoveToFolderModal(false);
      setSelectedBanners(new Set());
      setTargetFolderId("");
      loadBanners();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to move banners: " + error.message);
    }
  };

  // Delete selected banners
  const deleteSelectedBanners = async () => {
    if (selectedBanners.size === 0) {
      toast.error("No banners selected");
      return;
    }

    if (!confirm(`Delete ${selectedBanners.size} selected banner(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete each selected banner
      const promises = Array.from(selectedBanners).map(bannerId =>
        adminAPI.deleteBanner(bannerId)
      );

      await Promise.all(promises);

      toast.success(`Deleted ${selectedBanners.size} banner(s)`);
      setSelectedBanners(new Set());
      loadBanners();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to delete banners: " + error.message);
    }
  };

  // Get filtered banners based on active tab
  const getFilteredBanners = () => {
    let filtered = banners;

    // Filter by active tab
    if (activeTab === "published") {
      filtered = filtered.filter(b => b.publish_status === "published");
    } else if (activeTab === "scheduled") {
      filtered = filtered.filter(b =>
        b.publish_status === "scheduled" && b.scheduled_at
      );
    } else if (activeTab === "draft") {
      filtered = filtered.filter(b =>
        b.publish_status === "draft" ||
        (b.publish_status === "scheduled" && !b.scheduled_at)
      );
    }

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(b => b.folder_id === selectedFolder);
    }

    return filtered;
  };

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      loadFolders();
    }
  }, [banners]);

  useEffect(() => {
    loadAggregateAnalytics();
  }, [startDate, endDate]);

  // Subscribe to real-time banner changes
  useEffect(() => {
    // Set up Supabase Realtime subscription
    subscribeToBannerChanges();

    // Listen for custom bannersUpdated event
    const handleBannerUpdate = () => {
      console.log("[AdminBannerManager] Banners updated - reloading...");
      loadBanners();
    };

    window.addEventListener('bannersUpdated', handleBannerUpdate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('bannersUpdated', handleBannerUpdate);
      unsubscribeFromBannerChanges();
    };
  }, []);


  const handleTogglePublish = async (banner: Banner) => {
    try {
      const newStatus = banner.publish_status === "published" ? "draft" : "published";

      await adminAPI.updateBanner(banner.id, {
        publish_status: newStatus,
      });

      toast.success(`Banner ${newStatus === "published" ? "published" : "unpublished"}`);
      loadBanners();
    } catch (error: any) {
      toast.error("Failed to update banner: " + error.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionInfo = (banner: any) => {
    const meta = banner.metadata || {};
    const original = meta.original_size || banner.original_size_bytes;
    const optimized = meta.optimized_size || banner.optimized_size_bytes;

    if (!original) return null;

    const ratio = original > 0 ? Math.round((1 - optimized / original) * 100) : 0;

    return {
      original: formatBytes(original),
      optimized: formatBytes(optimized),
      ratio: ratio > 0 ? `-${ratio}%` : "0%"
    };
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Delete "${banner.title}"?`)) return;

    try {
      await adminAPI.deleteBanner(banner.id);
      toast.success("Banner deleted");
      loadBanners();
    } catch (error: any) {
      toast.error("Failed to delete banner: " + error.message);
    }
  };

  const handleCancelSchedule = async (banner: Banner) => {
    if (!confirm(`Cancel schedule for "${banner.title}"? It will be moved to drafts.`)) return;

    try {
      await adminAPI.updateBanner(banner.id, {
        publish_status: "draft",
        scheduled_at: null,
      });
      toast.success("Schedule cancelled - banner moved to drafts");
      loadBanners();
    } catch (error: any) {
      toast.error("Failed to cancel schedule: " + error.message);
    }
  };

  const handleReschedule = async (bannerId: string, newDate: Date) => {
    try {
      console.log('[AdminBannerManager] Rescheduling banner:', {
        bannerId,
        newDate: newDate.toISOString(),
      });

      const result = await adminAPI.updateBanner(bannerId, {
        scheduled_at: newDate.toISOString(),
      });

      console.log('[AdminBannerManager] Reschedule response:', result);

      toast.success("Banner rescheduled successfully");
      await loadBanners();
    } catch (error: any) {
      console.error('[AdminBannerManager] Reschedule error:', error);
      toast.error("Failed to reschedule: " + error.message);
      throw error;
    }
  };

  const handlePublishNow = async (banner: Banner) => {
    if (!confirm(`Publish "${banner.title}" immediately?`)) return;

    try {
      await adminAPI.updateBanner(banner.id, {
        publish_status: "published",
        published_at: new Date().toISOString(),
        scheduled_at: null,
      });
      console.log(`[AdminBannerManager] Published banner ${banner.id} immediately`);
      toast.success("Banner published!");
      loadBanners();
    } catch (error: any) {
      console.error(`[AdminBannerManager] Failed to publish banner ${banner.id}:`, error);
      toast.error("Failed to publish banner: " + error.message);
    }
  };

  const filteredBanners = getFilteredBanners();

  // Calculate accurate tab counts
  const publishedCount = banners.filter(b => b.publish_status === "published").length;
  const scheduledCount = banners.filter(b => b.publish_status === "scheduled" && b.scheduled_at).length;
  const draftCount = banners.filter(b =>
    b.publish_status === "draft" ||
    (b.publish_status === "scheduled" && !b.scheduled_at)
  ).length;
  const uncategorizedCount = banners.filter(b => !b.folder_id).length;

  return (
    <div className="space-y-6 text-inter-regular-14">
      {/* Database Setup Guide - Show prominently at top when tables missing */}
      {showDatabaseSetup && <DatabaseSetupGuide />}

      {/* Folders Setup Guide - Show when folder tables are missing */}
      {showFoldersSetup && <FoldersSetupGuide contentType="banners" />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Banner Management</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Manage carousel banners for the user app
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <DateRangeFilter
            onDateRangeChange={(start, end, preset) => {
              setStartDate(start);
              setEndDate(end);
              setDatePreset(preset);
            }}
          />

          {/* Diagnostics Button (Settings Icon) */}
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="System Diagnostics"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              loadBanners();
              loadFolders();
            }}
            disabled={isLoading}
            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={showDatabaseSetup}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium text-inter-medium-16 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Upload Banner
          </button>
        </div>
      </div>

      {/* Diagnostics Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="space-y-4">
          <BannerDatabaseChecker />
        </div>
      )}

      {/* Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-sm text-inter-regular-14">Total Banners</p>
            <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
              {banners.length}
            </p>
            <p className="text-sm text-green-600 mt-1 text-inter-regular-14">
              {publishedCount} published
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-sm text-inter-regular-14">Total Views</p>
              {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
              {aggregateAnalytics ? (aggregateAnalytics.total_views || 0).toLocaleString() : banners.reduce((sum, b) => sum + (b.view_count || 0), 0).toLocaleString()}
            </p>
            {aggregateAnalytics && startDate && endDate && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-sm text-inter-regular-14">Total Clicks</p>
              {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
              {aggregateAnalytics ? (aggregateAnalytics.total_clicks || 0).toLocaleString() : banners.reduce((sum, b) => sum + (b.click_count || 0), 0).toLocaleString()}
            </p>
            {aggregateAnalytics && startDate && endDate && (
              <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedBanners.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-inter-medium-16 text-green-800">
              {selectedBanners.size} banner(s) selected
            </p>
            <button
              onClick={deselectAll}
              className="text-sm text-green-600 hover:text-green-700 underline"
            >
              Deselect All
            </button>
          </div>
          {!showFoldersSetup && (
            <button
              onClick={() => setShowMoveToFolderModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FolderInput className="w-4 h-4" />
              Move to Folder
            </button>
          )}
          <button
            onClick={deleteSelectedBanners}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Main Layout: Banners */}
      {!showDatabaseSetup && !showFoldersSetup && (
        <div className="space-y-4">
          {/* Compact Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Folder Dropdown (only show if tables exist) */}
            {!showFoldersSetup && (
              <div className="w-64">
                <FolderDropdown
                  folders={folders}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  onCreateFolder={createFolder}
                  onUpdateFolder={updateFolder}
                  onDeleteFolder={deleteFolder}
                  allWallpapersCount={banners.length}
                  uncategorizedCount={uncategorizedCount}
                />
              </div>
            )}

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("published")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "published"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <Eye className="w-4 h-4 inline mr-1.5" />
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "scheduled"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <Clock className="w-4 h-4 inline mr-1.5" />
                Scheduled ({scheduledCount})
              </button>
              <button
                onClick={() => setActiveTab("draft")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "draft"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <EyeOff className="w-4 h-4 inline mr-1.5" />
                Drafts ({draftCount})
              </button>
            </div>

            {/* View Mode Toggle & Select All */}
            <div className="flex items-center gap-2">
              {filteredBanners.length > 0 && (
                <button
                  onClick={selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  title="Select All"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </button>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded transition-colors ${viewMode === "card"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                  title="Card View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${viewMode === "list"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Info Banner: Scheduled Tab */}
          {activeTab === "scheduled" && filteredBanners.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm text-blue-800">
                  <span className="font-medium">Showing {filteredBanners.length} scheduled banner{filteredBanners.length > 1 ? 's' : ''}.</span>
                  {' '}These will automatically publish at their scheduled time. Use the countdown timer to see when each banner will go live.
                </div>
              </div>
            </div>
          )}

          {/* Warning: Scheduled banners without dates (shown in Drafts tab) */}
          {activeTab === "draft" && (() => {
            const brokenScheduled = filteredBanners.filter(b => b.publish_status === "scheduled" && !b.scheduled_at);
            if (brokenScheduled.length > 0) {
              return (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-inter-semibold-16 text-orange-800">⚠️ {brokenScheduled.length} Banner{brokenScheduled.length > 1 ? 's' : ''} Marked as Scheduled but Missing Schedule Date</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        These banners have publish_status = "scheduled" but no schedule date. They are shown here in Drafts until you set a schedule date or convert them to proper drafts.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Banners Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 text-inter-regular-14">Loading banners...</p>
              </div>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-800 mb-2 text-inter-semibold-18">No banners yet</h3>
              <p className="text-gray-500 mb-4 text-inter-regular-14">
                {selectedFolder
                  ? "No banners in this folder. Try selecting a different folder or upload a new banner."
                  : "Upload your first banner to get started"}
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
              >
                Upload Banner
              </button>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners.map((banner) => (
                <div
                  key={banner.id}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${selectedBanners.has(banner.id) ? "border-green-500 ring-2 ring-green-200" : "border-gray-200"
                    }`}
                >
                  {/* Image */}
                  <div className="relative aspect-[16/9] bg-gray-100">
                    <img
                      src={optimizeSupabaseUrl(banner.thumbnail_url || banner.medium_url || banner.image_url)}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3">
                      <button
                        onClick={() => toggleBannerSelection(banner.id)}
                        className="w-6 h-6 rounded bg-white border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors"
                      >
                        {selectedBanners.has(banner.id) ? (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {banner.publish_status === "scheduled" && banner.scheduled_at ? (
                        <CountdownTimerBadge scheduledAt={banner.scheduled_at} />
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${banner.publish_status === "published"
                            ? "bg-green-100 text-green-700"
                            : banner.publish_status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                          {banner.publish_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-inter-semibold-18">
                      {banner.title}
                    </h3>
                    {banner.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 text-inter-regular-14">
                        {banner.description}
                      </p>
                    )}

                    {/* Target URL */}
                    {banner.target_url && (
                      <p className="text-xs text-blue-600 mb-2 truncate text-inter-regular-14">
                        🔗 {banner.target_url}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Views</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {banner.view_count || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Clicks</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {banner.click_count || 0}
                        </p>
                      </div>
                      <button
                        onClick={() => openAnalytics(banner.id)}
                        className="ml-auto text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scheduled Time */}
                    {banner.publish_status === "scheduled" && banner.scheduled_at && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-800 text-inter-regular-14">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Scheduled: {new Date(banner.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mb-3 text-inter-regular-14">
                      Created {new Date(banner.created_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {banner.publish_status === "scheduled" ? (
                        <ScheduleActionDropdown
                          onReschedule={() => setRescheduleBanner(banner)}
                          onPublishNow={() => handlePublishNow(banner)}
                          onCancelSchedule={() => handleCancelSchedule(banner)}
                        />
                      ) : (
                        <button
                          onClick={() => handleTogglePublish(banner)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-colors text-inter-medium-16 ${banner.publish_status === "published"
                            ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                            : "border-green-300 text-green-700 hover:bg-green-50"
                            }`}
                        >
                          {banner.publish_status === "published" ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Publish
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(banner)}
                        className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedBanners.size === filteredBanners.length && filteredBanners.length > 0}
                        onChange={() => {
                          if (selectedBanners.size === filteredBanners.length && filteredBanners.length > 0) {
                            deselectAll();
                          } else {
                            selectAll();
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BANNER
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VIEWS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CLICKS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      COMPRESSION
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CREATED
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBanners.map((banner) => (
                    <tr
                      key={banner.id}
                      className={`hover:bg-gray-50 transition-colors ${selectedBanners.has(banner.id) ? "bg-green-50" : ""
                        }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedBanners.has(banner.id)}
                          onChange={() => toggleBannerSelection(banner.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={optimizeSupabaseUrl(banner.thumbnail_url || banner.medium_url || banner.image_url)}
                            alt={banner.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900 text-inter-medium-16 line-clamp-1">{banner.title}</div>
                            {banner.description && (
                              <div className="text-sm text-gray-500 line-clamp-1 text-inter-regular-14">
                                {banner.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {banner.publish_status === "scheduled" && banner.scheduled_at ? (
                          <CountdownTimerBadge scheduledAt={banner.scheduled_at} compact />
                        ) : (
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${banner.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : banner.publish_status === "scheduled"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                              }`}
                          >
                            {banner.publish_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {banner.view_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {banner.click_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getCompressionInfo(banner) ? (
                          <div className="flex flex-col text-xs text-inter-regular-14">
                            <span className="text-gray-900">{getCompressionInfo(banner)!.optimized}</span>
                            <span className="text-green-600 text-[10px] font-medium">
                              Saved {getCompressionInfo(banner)!.ratio}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 text-inter-regular-14">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-inter-regular-14">
                        {new Date(banner.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAnalytics(banner.id)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          {banner.publish_status === "scheduled" ? (
                            <ScheduleActionDropdown
                              onReschedule={() => setRescheduleBanner(banner)}
                              onPublishNow={() => handlePublishNow(banner)}
                              onCancelSchedule={() => handleCancelSchedule(banner)}
                            />
                          ) : (
                            <button
                              onClick={() => handleTogglePublish(banner)}
                              className="text-green-600 hover:text-green-700 p-1.5 hover:bg-green-50 rounded transition-colors"
                              title={banner.publish_status === "published" ? "Unpublish" : "Publish"}
                            >
                              {banner.publish_status === "published" ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(banner)}
                            className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <AddBannerModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadBanners}
        folders={showFoldersSetup ? [] : folders}
        onCreateFolder={createFolder}
      />

      {/* Reschedule Dialog */}
      {rescheduleBanner && (
        <RescheduleDialog
          isOpen={!!rescheduleBanner}
          onClose={() => setRescheduleBanner(null)}
          onReschedule={async (newDate) => {
            await handleReschedule(rescheduleBanner.id, newDate);
            setRescheduleBanner(null);
          }}
          currentDate={rescheduleBanner.scheduled_at ? new Date(rescheduleBanner.scheduled_at) : new Date()}
          title={rescheduleBanner.title}
        />
      )}

      {/* Move to Folder Modal */}
      {showMoveToFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-inter-semibold-18 text-gray-800 mb-4">
              Move {selectedBanners.size} banner(s) to folder
            </h3>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-inter-regular-14"
            >
              <option value="">Select a folder...</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <button
                onClick={moveToFolder}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
              >
                Move
              </button>
              <button
                onClick={() => {
                  setShowMoveToFolderModal(false);
                  setTargetFolderId("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-inter-medium-16"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Drawer */}
      <BannerAnalyticsDrawer
        isOpen={isAnalyticsOpen}
        onClose={() => {
          setIsAnalyticsOpen(false);
          setAnalyticsBannerId(null);
        }}
        bannerId={analyticsBannerId || ""}
      />
    </div>
  );
}