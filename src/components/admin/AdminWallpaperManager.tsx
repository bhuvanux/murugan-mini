import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, Download, Heart, BarChart3, FolderInput, Settings, CheckSquare, Square, Grid3x3, List, Calendar as CalendarIcon, Clock, AlertCircle, HardDrive, Database, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AddWallpaperModal } from "./AddWallpaperModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { WallpaperDatabaseChecker } from "./WallpaperDatabaseChecker";
import { BackendDiagnostics } from "../BackendDiagnostics";
import { MetadataBackfill } from "./analytics/MetadataBackfill";
import { FolderManager, WallpaperFolder } from "./FolderManager";
import { FolderDropdown } from "./FolderDropdown";
import { CountdownTimerBadge } from "./CountdownTimerBadge";
import { ScheduleActionDropdown } from "./ScheduleActionDropdown";
import { RescheduleDialog } from "./RescheduleDialog";
import { ScheduledPublisherButton } from "./ScheduledPublisherButton";
import { FoldersSetupGuide } from "./FoldersSetupGuide";
import { WallpaperAnalyticsDrawer } from "./WallpaperAnalyticsDrawer";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";
import { ScheduledWallpapersDebugger } from "./ScheduledWallpapersDebugger";
import * as adminAPI from "../../utils/adminAPI";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { ThumbnailImage } from "../ThumbnailImage";
import { supabase } from "../../utils/supabase/client";

interface Wallpaper {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  publish_status: string;
  visibility: string;
  view_count: number;
  download_count: number;
  like_count: number;
  share_count: number;
  created_at: string;
  tags?: string[];
  folder_id?: string;
  scheduled_at?: string;
  metadata?: any;
  medium_url?: string;
  small_url?: string;
  video_url?: string;
  is_video?: boolean;
  original_size_bytes?: number;
  optimized_size_bytes?: number;
}

type ViewMode = "card" | "list";
type SortField = "created_at" | "view_count" | "like_count" | "share_count" | "download_count" | "publish_status" | "compression";
type SortDirection = "asc" | "desc";

export function AdminWallpaperManager() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "scheduled" | "draft">("published");
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showFoldersSetup, setShowFoldersSetup] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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
    total_downloads: number;
    total_likes: number;
    total_shares: number;
  } | null>(null);

  // Folder & Analytics state
  const [folders, setFolders] = useState<WallpaperFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [analyticsWallpaperId, setAnalyticsWallpaperId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Bulk selection state
  const [selectedWallpapers, setSelectedWallpapers] = useState<Set<string>>(new Set());
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Reschedule modal state
  const [rescheduleWallpaper, setRescheduleWallpaper] = useState<Wallpaper | null>(null);

  // Load wallpapers from backend
  const loadWallpapers = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminWallpaperManager] Starting to load wallpapers...');

      // Always load ALL wallpapers - filtering is done client-side
      const result = await adminAPI.getWallpapers();

      console.log("[AdminWallpaperManager] Loaded wallpapers:", result);

      // DEBUG: Check scheduled wallpapers
      const scheduledWallpapers = (result.data || []).filter((w: any) => w.publish_status === 'scheduled');
      if (scheduledWallpapers.length > 0) {
        console.log("[AdminWallpaperManager] 📋 DEBUG - Scheduled wallpapers:", scheduledWallpapers);
        scheduledWallpapers.forEach((w: any) => {
          console.log(`[AdminWallpaperManager] 🕐 Wallpaper ${w.id}:`, {
            id: w.id,
            title: w.title,
            publish_status: w.publish_status,
            scheduled_at: w.scheduled_at,
            scheduled_at_type: typeof w.scheduled_at,
            scheduled_at_valid: w.scheduled_at ? !isNaN(new Date(w.scheduled_at).getTime()) : false,
            will_show_timer: !!(w.publish_status === 'scheduled' && w.scheduled_at)
          });
        });
      } else {
        console.log("[AdminWallpaperManager] ℹ️ No scheduled wallpapers found");
      }

      setWallpapers(result.data || []);

      if ((result.data || []).length === 0 && !selectedFolder) {
        toast.info("No wallpapers found. Upload your first wallpaper!");
      }

      // Hide database setup if data loaded successfully
      setShowDatabaseSetup(false);
    } catch (error: any) {
      console.error("[AdminWallpaperManager] Load error:", error);

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
      setWallpapers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load aggregate analytics for date range
  const loadAggregateAnalytics = async () => {
    if (!startDate || !endDate) return;

    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/aggregate?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setAggregateAnalytics(result.data);
      }
    } catch (error) {
      console.error('[AdminWallpaperManager] Failed to load aggregate analytics:', error);
    }
  };

  const storageStats = React.useMemo(() => {
    return wallpapers.reduce((acc, w) => {
      const original = w.metadata?.original_size || w.original_size_bytes || 0;
      const optimized = w.metadata?.optimized_size || w.optimized_size_bytes || 0;
      acc.totalOriginal += original;
      acc.totalOptimized += optimized;
      acc.totalSaved += (original > optimized ? original - optimized : 0);
      return acc;
    }, { totalOriginal: 0, totalOptimized: 0, totalSaved: 0 });
  }, [wallpapers]);

  const percentSaved = storageStats.totalOriginal > 0
    ? Math.round((storageStats.totalSaved / storageStats.totalOriginal) * 100)
    : 0;

  // Load folders
  const loadFolders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();

      // Check if response indicates missing tables
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        console.log('[Folders] Tables not set up yet - folder features will be hidden');
        setShowFoldersSetup(true);
        setFolders([]); // Empty folders - hide sidebar
        return;
      }

      if (result.success) {
        // Calculate wallpaper counts for each folder from loaded wallpapers
        const foldersWithCounts = (result.data || []).map((folder: any) => ({
          ...folder,
          wallpaper_count: wallpapers.filter(w => w.folder_id === folder.id).length,
        }));
        setFolders(foldersWithCounts);
        setShowFoldersSetup(false); // Hide setup guide if folders loaded successfully
      } else {
        // Check if error is about missing tables
        if (result.error?.includes('wallpaper_folders') || result.error?.includes('PGRST205') || result.code === 'PGRST205') {
          console.log('[Folders] Tables not found - showing setup guide');
          setShowFoldersSetup(true);
          setFolders([]);
        }
      }
    } catch (error: any) {
      console.log('[Folders] Error loading folders - likely tables not created yet');
      // Silently fail - folders are optional
      setShowFoldersSetup(true);
      setFolders([]);
    }
  };

  // Create folder
  const createFolder = async (name: string, description?: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders/${folderId}`,
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
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpaper-folders/${folderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete folder');
  };

  // Open analytics drawer
  const openAnalytics = (wallpaperId: string) => {
    setAnalyticsWallpaperId(wallpaperId);
    setIsAnalyticsOpen(true);
  };

  // Toggle wallpaper selection
  const toggleWallpaperSelection = (wallpaperId: string) => {
    const newSelection = new Set(selectedWallpapers);
    if (newSelection.has(wallpaperId)) {
      newSelection.delete(wallpaperId);
    } else {
      newSelection.add(wallpaperId);
    }
    setSelectedWallpapers(newSelection);
  };

  // Select all wallpapers
  const selectAll = () => {
    const filtered = getFilteredWallpapers();
    setSelectedWallpapers(new Set(filtered.map(w => w.id)));
  };

  // Deselect all wallpapers
  const deselectAll = () => {
    setSelectedWallpapers(new Set());
  };

  // Move selected wallpapers to folder
  const moveToFolder = async () => {
    if (selectedWallpapers.size === 0) {
      toast.error("No wallpapers selected");
      return;
    }

    try {
      // Update each wallpaper's folder_id
      const promises = Array.from(selectedWallpapers).map(wallpaperId =>
        adminAPI.updateWallpaper(wallpaperId, {
          folder_id: targetFolderId || null,
        })
      );

      await Promise.all(promises);

      toast.success(`Moved ${selectedWallpapers.size} wallpaper(s) to folder`);
      setShowMoveToFolderModal(false);
      setSelectedWallpapers(new Set());
      setTargetFolderId("");
      loadWallpapers();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to move wallpapers: " + error.message);
    }
  };

  // Get filtered wallpapers based on active tab
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionInfo = (wallpaper: any) => {
    const meta = wallpaper.metadata || {};
    const original = meta.original_size || wallpaper.original_size_bytes;
    const optimized = meta.optimized_size || wallpaper.optimized_size_bytes;

    if (!original) return null;

    const ratio = original > 0 ? Math.round((1 - optimized / original) * 100) : 0;

    return {
      original: formatBytes(original),
      optimized: formatBytes(optimized),
      ratio: ratio > 0 ? `-${ratio}%` : "0%"
    };
  };

  const getFilteredWallpapers = () => {
    let filtered = wallpapers;

    // Filter by active tab with CORRECT logic
    if (activeTab === "published") {
      // Published Tab: Only wallpapers with publish_status = "published"
      filtered = filtered.filter(w => w.publish_status === "published");
    } else if (activeTab === "scheduled") {
      // Scheduled Tab: Only scheduled wallpapers WITH valid scheduled_at date
      filtered = filtered.filter(w =>
        w.publish_status === "scheduled" && w.scheduled_at
      );
    } else if (activeTab === "draft") {
      // Drafts Tab: Draft wallpapers OR scheduled wallpapers WITHOUT scheduled_at
      filtered = filtered.filter(w =>
        w.publish_status === "draft" ||
        (w.publish_status === "scheduled" && !w.scheduled_at)
      );
    }

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(w => w.folder_id === selectedFolder);
    }

    // Filter by date range (for analytics view)
    if (startDate && endDate) {
      filtered = filtered.filter(w => {
        const createdAt = new Date(w.created_at);
        // Create end of day date to ensure we include items created today after the filter was set
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return createdAt >= startDate && createdAt <= endOfDay;
      });
    }

    // Filter out thumbnail artifacts
    filtered = filtered.filter(w => !w.title.startsWith("THUMB_") && !w.title.startsWith("PROP_THUMB_"));

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "view_count":
          comparison = (a.view_count || 0) - (b.view_count || 0);
          break;
        case "like_count":
          comparison = (a.like_count || 0) - (b.like_count || 0);
          break;
        case "share_count":
          comparison = (a.share_count || 0) - (b.share_count || 0);
          break;
        case "download_count":
          comparison = (a.download_count || 0) - (b.download_count || 0);
          break;
        case "publish_status":
          comparison = a.publish_status.localeCompare(b.publish_status);
          break;
        case "compression":
          const getRatio = (w: any) => {
            const meta = w.metadata || {};
            const original = meta.original_size || w.original_size_bytes || 0;
            const optimized = meta.optimized_size || w.optimized_size_bytes || 0;
            return original > 0 ? (1 - optimized / original) : 0;
          };
          comparison = getRatio(a) - getRatio(b);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 text-green-600 ml-1" />
      : <ArrowDown className="w-3 h-3 text-green-600 ml-1" />;
  };

  useEffect(() => {
    loadWallpapers();
  }, []); // Remove filter dependency - we load all wallpapers once

  useEffect(() => {
    if (wallpapers.length > 0) {
      loadFolders();
    }
  }, [wallpapers]);

  useEffect(() => {
    loadAggregateAnalytics();
  }, [startDate, endDate]);

  const handleTogglePublish = async (wallpaper: Wallpaper) => {
    try {
      const newStatus = wallpaper.publish_status === "published" ? "draft" : "published";

      await adminAPI.updateWallpaper(wallpaper.id, {
        publish_status: newStatus,
      });

      toast.success(`Wallpaper ${newStatus === "published" ? "published" : "unpublished"}`);
      loadWallpapers();
    } catch (error: any) {
      toast.error("Failed to update wallpaper: " + error.message);
    }
  };

  const handleDelete = async (wallpaper: Wallpaper) => {
    if (!confirm(`Delete "${wallpaper.title}"?`)) return;

    try {
      await adminAPI.deleteWallpaper(wallpaper.id);
      toast.success("Wallpaper deleted");
      loadWallpapers();
    } catch (error: any) {
      toast.error("Failed to delete wallpaper: " + error.message);
    }
  };

  const handleCancelSchedule = async (wallpaper: Wallpaper) => {
    if (!confirm(`Cancel schedule for "${wallpaper.title}"? It will be moved to drafts.`)) return;

    try {
      await adminAPI.updateWallpaper(wallpaper.id, {
        publish_status: "draft",
        scheduled_at: null,
      });
      toast.success("Schedule cancelled - wallpaper moved to drafts");
      loadWallpapers();
    } catch (error: any) {
      toast.error("Failed to cancel schedule: " + error.message);
    }
  };

  const handleReschedule = async (wallpaperId: string, newDate: Date) => {
    try {
      console.log('[AdminWallpaperManager] Rescheduling wallpaper:', {
        wallpaperId,
        newDate: newDate.toISOString(),
        timestamp: new Date().toISOString()
      });

      const result = await adminAPI.updateWallpaper(wallpaperId, {
        scheduled_at: newDate.toISOString(),
      });

      console.log('[AdminWallpaperManager] Reschedule response:', result);

      toast.success("Wallpaper rescheduled successfully");
      await loadWallpapers();

      console.log('[AdminWallpaperManager] Wallpapers reloaded after reschedule');
    } catch (error: any) {
      console.error('[AdminWallpaperManager] Reschedule error:', error);
      toast.error("Failed to reschedule: " + error.message);
      throw error;
    }
  };

  const handleAutoPublish = async (wallpaperId: string) => {
    try {
      await adminAPI.updateWallpaper(wallpaperId, {
        publish_status: "published",
        published_at: new Date().toISOString(),
        scheduled_at: null,
      });
      console.log(`[AdminWallpaperManager] Auto-published wallpaper ${wallpaperId}`);
      toast.success("Wallpaper auto-published!");
      loadWallpapers();
    } catch (error: any) {
      console.error(`[AdminWallpaperManager] Failed to auto-publish wallpaper ${wallpaperId}:`, error);
      toast.error("Failed to auto-publish wallpaper: " + error.message);
    }
  };

  const filteredWallpapers = getFilteredWallpapers();

  // Calculate accurate tab counts based on CORRECT logic
  const publishedCount = wallpapers.filter(w => w.publish_status === "published").length;
  const scheduledCount = wallpapers.filter(w => w.publish_status === "scheduled" && w.scheduled_at).length;
  const draftCount = wallpapers.filter(w =>
    w.publish_status === "draft" ||
    (w.publish_status === "scheduled" && !w.scheduled_at)
  ).length;
  const uncategorizedCount = wallpapers.filter(w => !w.folder_id).length;

  // DEBUG: Log when we're on scheduled tab
  useEffect(() => {
    if (activeTab === 'scheduled' && filteredWallpapers.length > 0) {
      console.log('[AdminWallpaperManager] 📌 RENDERING Scheduled tab with wallpapers:', filteredWallpapers.map(w => ({
        id: w.id,
        title: w.title,
        scheduled_at: w.scheduled_at,
        hasScheduledAt: !!w.scheduled_at,
        willShowTimer: !!(w.publish_status === 'scheduled' && w.scheduled_at)
      })));
    }
  }, [activeTab, filteredWallpapers]);

  return (
    <div className="space-y-6 text-inter-regular-14">
      {/* Database Setup Guide - Show prominently at top when tables missing */}
      {showDatabaseSetup && <DatabaseSetupGuide />}

      {/* Folders Setup Guide - Show when folder tables are missing */}
      {(showFoldersSetup || showSetupGuide) && <FoldersSetupGuide contentType="wallpapers" />}



      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Wallpaper Dashboard</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Manage wallpapers for the user app
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

          {/* Diagnostics Button */}
          <button
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className={`p-3 border rounded-lg transition-colors ${showSetupGuide ? "bg-orange-100 border-orange-300 text-orange-600" : "border-gray-300 hover:bg-gray-50"}`}
            title="Database Setup Guide"
          >
            <Database className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="System Diagnostics"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className={`p-3 border rounded-lg transition-colors ${showSetupGuide ? "bg-orange-100 border-orange-300 text-orange-600" : "border-gray-300 hover:bg-gray-50"}`}
            title="Database Setup Guide"
          >
            <Database className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              loadWallpapers();
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
            Upload Wallpaper
          </button>
        </div>
      </div>

      {/* Diagnostics Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="space-y-4">
          <BackendDiagnostics />
          <MetadataBackfill
            items={wallpapers}
            onUpdate={loadWallpapers}
            type="wallpaper"
          />
          <WallpaperDatabaseChecker />
          <ScheduledWallpapersDebugger />
        </div>
      )}

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%' }}>
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-500 text-sm text-inter-regular-14 text-zinc-500">Total Wallpapers</p>
          <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
            {wallpapers.length}
          </p>
          <p className="text-sm text-green-600 mt-1 text-inter-regular-14">
            {publishedCount} published
          </p>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm p-6 border border-gray-200 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-500 text-sm text-inter-regular-14 text-zinc-500">Total Views</p>
            {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
            {(aggregateAnalytics && aggregateAnalytics.total_views > 0) ? aggregateAnalytics.total_views.toLocaleString() : wallpapers.reduce((sum, w) => sum + (w.view_count || 0), 0).toLocaleString()}
          </p>
          {aggregateAnalytics && startDate && endDate && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-500 text-sm text-inter-regular-14 text-zinc-500">Total Likes</p>
            {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
            {(aggregateAnalytics && aggregateAnalytics.total_likes > 0) ? aggregateAnalytics.total_likes.toLocaleString() : wallpapers.reduce((sum, w) => sum + (w.like_count || 0), 0).toLocaleString()}
          </p>
          {aggregateAnalytics && startDate && endDate && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
          {!aggregateAnalytics && <p className="text-xs text-gray-500 mt-1.5 font-medium">Across all content</p>}
        </div>

        <div className="flex-1 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-sm p-6 border border-green-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2 relative z-10">
            <p className="text-green-700 font-bold text-[10px] uppercase tracking-widest">Storage Saved</p>
            <HardDrive className="w-5 h-5 text-green-600 animate-pulse" />
          </div>

          <div className="flex items-baseline gap-1 relative z-10">
            <p className="text-3xl font-black text-green-700 leading-none">
              {formatBytes(storageStats.totalSaved)}
            </p>
            <span className="text-green-600/60 font-bold text-xs">SAVED</span>
          </div>

          <div className="mt-4 relative z-10">
            <div className="h-1.5 w-full bg-green-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${percentSaved}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 items-center">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Efficiency</span>
              <span className="text-[10px] font-black text-green-700">{percentSaved}%</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-100 grid grid-cols-2 gap-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Uploaded</p>
              <p className="text-sm font-bold text-gray-700">{formatBytes(storageStats.totalOriginal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Compressed</p>
              <p className="text-sm font-bold text-gray-700">{formatBytes(storageStats.totalOptimized)}</p>
            </div>
          </div>

          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <HardDrive size={100} />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {
        selectedWallpapers.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-inter-medium-16 text-green-800">
                {selectedWallpapers.size} wallpaper(s) selected
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
          </div>
        )
      }

      {/* Main Layout: Wallpapers */}
      {
        !showDatabaseSetup && !showFoldersSetup && (
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
                    allWallpapersCount={wallpapers.length}
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
                  Published ({publishedCount})
                </button>
                <button
                  onClick={() => setActiveTab("scheduled")}
                  className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "scheduled"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  Scheduled ({scheduledCount})
                </button>
                <button
                  onClick={() => setActiveTab("draft")}
                  className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "draft"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  Drafts ({draftCount})
                </button>
              </div>

              {/* View Mode Toggle & Select All */}
              <div className="flex items-center gap-2">
                {filteredWallpapers.length > 0 && (
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
            {activeTab === "scheduled" && filteredWallpapers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm text-blue-800">
                    <span className="font-medium">Showing {filteredWallpapers.length} scheduled wallpaper{filteredWallpapers.length > 1 ? 's' : ''}.</span>
                    {' '}These will automatically publish at their scheduled time. Use the countdown timer to see when each wallpaper will go live.
                  </div>
                </div>
              </div>
            )}

            {/* Warning: Scheduled wallpapers without dates (shown in Drafts tab) */}
            {activeTab === "draft" && (() => {
              const brokenScheduled = filteredWallpapers.filter(w => w.publish_status === "scheduled" && !w.scheduled_at);
              if (brokenScheduled.length > 0) {
                return (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-inter-semibold-16 text-orange-800">⚠️ {brokenScheduled.length} Wallpaper{brokenScheduled.length > 1 ? 's' : ''} Marked as Scheduled but Missing Schedule Date</h3>
                        <p className="text-sm text-orange-700 mt-1">
                          These wallpapers have publish_status = "scheduled" but no schedule date. They are shown here in Drafts until you set a schedule date or convert them to proper drafts.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={async () => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              tomorrow.setHours(12, 0, 0, 0);

                              for (const w of brokenScheduled) {
                                await adminAPI.updateWallpaper(w.id, { scheduled_at: tomorrow.toISOString() });
                              }
                              toast.success(`Scheduled ${brokenScheduled.length} wallpaper(s) for tomorrow at noon!`);
                              loadWallpapers();
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Schedule All for Tomorrow
                          </button>
                          <button
                            onClick={async () => {
                              for (const w of brokenScheduled) {
                                await adminAPI.updateWallpaper(w.id, { publish_status: 'draft', scheduled_at: null });
                              }
                              toast.success(`Converted ${brokenScheduled.length} wallpaper(s) to proper drafts`);
                              loadWallpapers();
                            }}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                          >
                            Convert All to Drafts
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Wallpapers Display */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                  <p className="text-gray-600 text-inter-regular-14">Loading wallpapers...</p>
                </div>
              </div>
            ) : filteredWallpapers.length === 0 ? (
              <div className="space-y-4">
                {/* Show debugger when on Scheduled tab and no wallpapers */}
                {activeTab === "scheduled" && !selectedFolder && (
                  <ScheduledWallpapersDebugger />
                )}

                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-800 mb-2 text-inter-semibold-18">
                    {activeTab === "scheduled"
                      ? "No scheduled wallpapers"
                      : selectedFolder
                        ? "No wallpapers in this folder"
                        : "No wallpapers yet"}
                  </h3>
                  <p className="text-gray-500 mb-4 text-inter-regular-14">
                    {activeTab === "scheduled"
                      ? "Schedule wallpapers by uploading with 'Scheduled' status and setting a future date. Use the debugger above to check if you have scheduled wallpapers that aren't showing."
                      : selectedFolder
                        ? "Upload wallpapers and assign them to this folder"
                        : "Upload your first wallpaper to get started"}
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
                  >
                    Upload Wallpaper
                  </button>
                </div>
              </div>
            ) : viewMode === "card" ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredWallpapers.map((wallpaper) => (
                  <div
                    key={wallpaper.id}
                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${selectedWallpapers.has(wallpaper.id) ? 'border-green-500' : 'border-gray-200'
                      }`}
                  >
                    {/* Image with Selection Overlay - Square aspect ratio */}
                    <div className="relative aspect-square bg-gray-100">
                      <ThumbnailImage
                        src={wallpaper.thumbnail_url}
                        fallbackSrc={wallpaper.medium_url || wallpaper.image_url}
                        youtubeUrl={wallpaper.video_url}
                        alt={wallpaper.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        type={wallpaper.is_video ? "video" : "image"}
                      />

                      {/* Selection Checkbox */}
                      <button
                        onClick={() => toggleWallpaperSelection(wallpaper.id)}
                        className="absolute top-3 left-3 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                      >
                        {selectedWallpapers.has(wallpaper.id) ? (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* Status Badge */}
                      {/* Top Right: Status Badge or Countdown Timer + Actions */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {wallpaper.publish_status === "scheduled" && wallpaper.scheduled_at ? (
                          <>
                            <CountdownTimerBadge
                              scheduledAt={wallpaper.scheduled_at}
                              wallpaperId={wallpaper.id}
                              onTimeUp={(id) => id && handleAutoPublish(id)}
                            />
                            <ScheduleActionDropdown
                              onReschedule={() => setRescheduleWallpaper(wallpaper)}
                              onPublishNow={async () => {
                                await adminAPI.updateWallpaper(wallpaper.id, { publish_status: 'published', published_at: new Date().toISOString() });
                                toast.success("Wallpaper published immediately");
                                loadWallpapers();
                              }}
                              onCancelSchedule={() => handleCancelSchedule(wallpaper)}
                            />
                          </>
                        ) : wallpaper.publish_status === "scheduled" && !wallpaper.scheduled_at ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 bg-red-100 text-red-700">
                            ⚠️ No schedule
                          </span>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${wallpaper.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                              }`}
                          >
                            {wallpaper.publish_status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Title */}
                      <h3 className="font-semibold text-gray-800 text-inter-semibold-16 line-clamp-2">
                        {wallpaper.title}
                      </h3>

                      {/* Tags */}
                      {wallpaper.tags && wallpaper.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {wallpaper.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded text-inter-regular-14"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Missing Schedule Warning */}
                      {wallpaper.publish_status === "scheduled" && !wallpaper.scheduled_at && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs text-red-700 font-medium">⚠️ This wallpaper is marked as scheduled but has no schedule date.</p>
                          <button
                            onClick={() => setRescheduleWallpaper(wallpaper)}
                            className="mt-2 w-full px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            Set Schedule Date
                          </button>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-gray-200">
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <Eye className="w-3 h-3 text-gray-400" />
                            <p className="text-sm font-medium text-gray-800 text-inter-medium-16">
                              {wallpaper.view_count || 0}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 text-inter-regular-14">Views</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <Download className="w-3 h-3 text-gray-400" />
                            <p className="text-sm font-medium text-gray-800 text-inter-medium-16">
                              {wallpaper.download_count || 0}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 text-inter-regular-14">Downloads</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <Heart className="w-3 h-3 text-gray-400" />
                            <p className="text-sm font-medium text-gray-800 text-inter-medium-16">
                              {wallpaper.like_count || 0}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 text-inter-regular-14">Likes</p>
                        </div>
                      </div>

                      {/* Compression Stats (Card View) */}
                      {getCompressionInfo(wallpaper) && (
                        <div className="mx-4 mb-4 p-2.5 bg-green-50 rounded-xl border border-green-100">
                          <div className="flex items-center justify-between text-[10px] sm:text-xs">
                            <div className="flex flex-col">
                              <span className="text-gray-500 uppercase tracking-wider font-bold">Original</span>
                              <span className="font-semibold text-gray-700">{getCompressionInfo(wallpaper)!.original}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-green-600 uppercase tracking-wider font-bold">Saved {getCompressionInfo(wallpaper)!.ratio}</span>
                              <span className="font-semibold text-green-700">{getCompressionInfo(wallpaper)!.optimized}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        {/* Analytics Button */}
                        <button
                          onClick={() => openAnalytics(wallpaper.id)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>

                        {/* Publish/Unpublish - Only show for published and draft */}
                        {wallpaper.publish_status !== "scheduled" && (
                          <button
                            onClick={() => handleTogglePublish(wallpaper)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-inter-medium-16 ${wallpaper.publish_status === "published"
                              ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                          >
                            {wallpaper.publish_status === "published" ? (
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

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(wallpaper)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-inter-medium-16"
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
                          checked={selectedWallpapers.size === filteredWallpapers.length && filteredWallpapers.length > 0}
                          onChange={() => {
                            if (selectedWallpapers.size === filteredWallpapers.length && filteredWallpapers.length > 0) {
                              deselectAll();
                            } else {
                              selectAll();
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        WALLPAPER
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("publish_status")}
                      >
                        <div className="flex items-center">
                          STATUS
                          <SortIcon field="publish_status" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("view_count")}
                      >
                        <div className="flex items-center">
                          VIEWS
                          <SortIcon field="view_count" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("like_count")}
                      >
                        <div className="flex items-center">
                          LIKES
                          <SortIcon field="like_count" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("share_count")}
                      >
                        <div className="flex items-center">
                          SHARES
                          <SortIcon field="share_count" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("download_count")}
                      >
                        <div className="flex items-center">
                          DOWNLOADS
                          <SortIcon field="download_count" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("compression")}
                      >
                        <div className="flex items-center">
                          COMPRESSION
                          <SortIcon field="compression" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center">
                          CREATED
                          <SortIcon field="created_at" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredWallpapers.map((wallpaper) => (
                      <tr
                        key={wallpaper.id}
                        className={`hover:bg-gray-50 transition-colors ${selectedWallpapers.has(wallpaper.id) ? "bg-green-50" : ""
                          }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedWallpapers.has(wallpaper.id)}
                            onChange={() => toggleWallpaperSelection(wallpaper.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ThumbnailImage
                              src={wallpaper.thumbnail_url}
                              fallbackSrc={wallpaper.small_url || wallpaper.image_url}
                              youtubeUrl={wallpaper.video_url}
                              alt={wallpaper.title}
                              className="w-10 h-10 rounded object-cover"
                              type={wallpaper.is_video ? "video" : "image"}
                            />
                            <div>
                              <div className="font-medium text-gray-900 text-inter-medium-16 line-clamp-1">{wallpaper.title}</div>
                              {wallpaper.tags && wallpaper.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {wallpaper.tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-xs text-gray-500 bg-gray-100 px-1 rounded">#{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {wallpaper.publish_status === "scheduled" && wallpaper.scheduled_at ? (
                            <CountdownTimerBadge
                              scheduledAt={wallpaper.scheduled_at}
                              wallpaperId={wallpaper.id}
                              onTimeUp={(id) => id && handleAutoPublish(id)}
                              compact
                            />
                          ) : (
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${wallpaper.publish_status === "published"
                                ? "bg-green-100 text-green-700"
                                : wallpaper.publish_status === "scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                              {wallpaper.publish_status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                          {wallpaper.view_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                          {wallpaper.like_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                          {wallpaper.share_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                          {wallpaper.download_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getCompressionInfo(wallpaper) ? (
                            <div className="flex flex-col text-xs text-inter-regular-14">
                              <span className="text-gray-900">{getCompressionInfo(wallpaper)!.optimized}</span>
                              <span className="text-green-600 text-[10px] font-medium">
                                Saved {getCompressionInfo(wallpaper)!.ratio}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 text-inter-regular-14">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-inter-regular-14">
                          {new Date(wallpaper.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openAnalytics(wallpaper.id)}
                              className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title="View Analytics"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                            {wallpaper.publish_status !== "scheduled" && (
                              <button
                                onClick={() => handleTogglePublish(wallpaper)}
                                className="text-green-600 hover:text-green-700 p-1.5 hover:bg-green-50 rounded transition-colors"
                                title={wallpaper.publish_status === "published" ? "Unpublish" : "Publish"}
                              >
                                {wallpaper.publish_status === "published" ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(wallpaper)}
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
        )
      }

      {/* Upload Modal */}
      <AddWallpaperModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); loadWallpapers(); }}
        onSuccess={loadWallpapers}
        folders={showFoldersSetup ? [] : folders}
        onCreateFolder={createFolder}
      />


      {/* Analytics Drawer */}
      <WallpaperAnalyticsDrawer
        wallpaperId={analyticsWallpaperId || ""}
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {/* Move to Folder Modal */}
      {
        showMoveToFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-inter-bold-20 text-gray-800 mb-4">Move to Folder</h3>
              <p className="text-gray-600 mb-4 text-inter-regular-14">
                Select a folder to move {selectedWallpapers.size} wallpaper(s)
              </p>

              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-700">Folder</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Uncategorized</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMoveToFolderModal(false);
                    setTargetFolderId("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={moveToFolder}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Reschedule Dialog */}
      {
        rescheduleWallpaper && (
          <RescheduleDialog
            isOpen={true}
            onClose={() => setRescheduleWallpaper(null)}
            currentScheduledAt={rescheduleWallpaper.scheduled_at || null}
            onReschedule={(newDate) => handleReschedule(rescheduleWallpaper.id, newDate)}
            wallpaperTitle={rescheduleWallpaper.title}
          />
        )
      }
    </div >
  );
}
