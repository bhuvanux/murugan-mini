import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, BarChart3, FolderInput, Settings, CheckSquare, Grid3x3, List, Calendar as CalendarIcon, Clock, Heart, Share2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { UploadModal } from "./UploadModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { FolderDropdown } from "./FolderDropdown";
import { CountdownTimerBadge } from "./CountdownTimerBadge";
import { ScheduleActionDropdown } from "./ScheduleActionDropdown";
import { RescheduleDialog } from "./RescheduleDialog";
import { FoldersSetupGuide } from "./FoldersSetupGuide";
import { SparkleAnalyticsDrawer } from "./SparkleAnalyticsDrawer";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";
import * as adminAPI from "../../utils/adminAPI";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface Sparkle {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  small_url?: string;
  medium_url?: string;
  large_url?: string;
  thumbnail_url?: string;
  cover_image_url?: string;
  video_url?: string;
  video_id?: string;
  publish_status: string;
  visibility: string;
  view_count: number;
  like_count: number;
  share_count: number;
  created_at: string;
  tags?: string[];
  folder_id?: string;
  scheduled_at?: string;
  metadata?: any;
}

interface SparkleFolder {
  id: string;
  name: string;
  description?: string;
  sparkle_count: number;
  created_at: string;
}

type ViewMode = "card" | "list";

export function AdminSparkleManager() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [sparkleStats, setSparkleStats] = useState<Record<string, { views: number; likes: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "scheduled" | "draft">("published");
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [showFoldersSetup, setShowFoldersSetup] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
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
    total_likes: number;
  } | null>(null);

  // Folder & Analytics state
  const [folders, setFolders] = useState<SparkleFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [analyticsSparkleId, setAnalyticsSparkleId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Bulk selection state
  const [selectedSparkles, setSelectedSparkles] = useState<Set<string>>(new Set());
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Reschedule modal state
  const [rescheduleSparkle, setRescheduleSparkle] = useState<Sparkle | null>(null);

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const getCompressionInfo = (sparkle: Sparkle) => {
    const md = sparkle.metadata || {};
    const originalBytes = typeof md.original_bytes === "number" ? md.original_bytes : undefined;
    const compressedBytes = typeof md.compressed_bytes === "number" ? md.compressed_bytes : undefined;
    const applied = md.compression_applied === true;
    const method = typeof md.compression_method === "string" ? md.compression_method : undefined;

    if (!originalBytes && !compressedBytes) return null;

    return {
      originalBytes,
      compressedBytes,
      applied,
      method,
    };
  };

  const resolveSparkleImage = (sparkle: Sparkle) =>
    sparkle.cover_image_url ||
    sparkle.thumbnail_url ||
    sparkle.image_url ||
    sparkle.medium_url ||
    sparkle.small_url ||
    "";

  const renderSparklePreview = (sparkle: Sparkle, variant: "card" | "list" = "card") => {
    const baseImage = resolveSparkleImage(sparkle);
    const sharedVideoProps = {
      src: sparkle.video_url ? `${sparkle.video_url}#t=0.1` : undefined,
      muted: true,
      playsInline: true,
      loop: true,
      autoPlay: true,
      preload: "metadata" as const,
      poster: baseImage || undefined,
    };

    if (baseImage) {
      return (
        <img
          src={baseImage}
          alt={sparkle.title}
          className={
            variant === "card"
              ? "w-full h-full object-cover"
              : "w-10 h-16 object-cover rounded"
          }
        />
      );
    }

    if (sparkle.video_url) {
      return (
        <video
          {...sharedVideoProps}
          className={
            variant === "card"
              ? "w-full h-full object-cover"
              : "w-10 h-16 object-cover rounded"
          }
        />
      );
    }

    const fallbackClasses =
      variant === "card"
        ? "w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-green-100 to-green-200"
        : "w-10 h-16 flex flex-col items-center justify-center gap-1 rounded bg-gradient-to-br from-green-100 to-green-200";

    return (
      <div className={fallbackClasses}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs font-medium text-green-700">Video Content</p>
      </div>
    );
  };

  // Load per-sparkle analytics stats for list view (views/likes)
  const loadSparkleStats = async (items: Sparkle[]) => {
    try {
      const statsEntries = await Promise.all(
        items.map(async (s) => {
          try {
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/stats/sparkle/${s.id}`,
              {
                headers: {
                  Authorization: `Bearer ${publicAnonKey}`,
                },
              }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
              return [s.id, { views: 0, likes: 0 }] as const;
            }

            const stats = (result.stats || {}) as Record<string, number>;
            const views = (stats.view ?? stats.read ?? 0) as number;
            const likes = (stats.like ?? 0) as number;

            return [s.id, { views, likes }] as const;
          } catch {
            return [s.id, { views: 0, likes: 0 }] as const;
          }
        })
      );

      const next: Record<string, { views: number; likes: number }> = {};
      for (const [id, val] of statsEntries) {
        next[id] = val;
      }
      setSparkleStats(next);
    } catch {
      setSparkleStats({});
    }
  };

  // Load sparkles from backend
  const loadSparkles = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminSparkleManager] Starting to load sparkles...');
      
      const result = await adminAPI.getSparkles();
      
      console.log("[AdminSparkleManager] Loaded sparkles:", result);
      console.log("[AdminSparkleManager] Total sparkles:", (result.data || []).length);
      console.log("[AdminSparkleManager] By status:", {
        published: (result.data || []).filter((s: any) => s.publish_status === "published").length,
        draft: (result.data || []).filter((s: any) => s.publish_status === "draft").length,
        scheduled: (result.data || []).filter((s: any) => s.publish_status === "scheduled").length,
      });
      
      const items: Sparkle[] = result.data || [];
      setSparkles(items);
      void loadSparkleStats(items);
      
      if ((result.data || []).length === 0 && !selectedFolder) {
        toast.info("No sparkles found. Upload your first sparkle!");
      }
      
      setShowDatabaseSetup(false);
    } catch (error: any) {
      console.error("[AdminSparkleManager] Load error:", error);
      
      if (
        error.message.includes("Failed to fetch") || 
        error.message.includes("500") || 
        error.message.includes("relation") ||
        error.message.includes("schema cache") ||
        error.message.includes("Could not find the table")
      ) {
        setShowDatabaseSetup(true);
      }
      
      toast.error("Database tables not found", {
        duration: 8000,
        description: "Please follow the setup guide above to create the database tables.",
      });
      
      setSparkles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load aggregate analytics for date range
  const loadAggregateAnalytics = async () => {
    if (!startDate || !endDate) {
      console.log('[AdminSparkleManager] Skipping analytics load - missing dates');
      return;
    }

    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
        !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      console.error('[AdminSparkleManager] Invalid date objects:', { startDate, endDate });
      setAggregateAnalytics(null);
      return;
    }
    
    try {
      console.log('[AdminSparkleManager] Loading aggregate analytics for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        content_type: 'sparkle',
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
        console.log('[AdminSparkleManager] Aggregate analytics loaded:', result.data);
        setAggregateAnalytics(result.data);
      } else {
        console.warn('[AdminSparkleManager] Analytics response not successful:', result);
        setAggregateAnalytics(null);
      }
    } catch (error: any) {
      console.error('[AdminSparkleManager] Failed to load aggregate analytics:', error);
      setAggregateAnalytics(null);
    }
  };

  // Load folders
  const loadFolders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/sparkle-folders`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();
      
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        console.log('[Sparkle Folders] Tables not set up yet - folder features will be hidden');
        setShowFoldersSetup(true);
        setFolders([]);
        return;
      }
      
      if (result.success) {
        const foldersWithCounts = (result.data || []).map((folder: any) => ({
          ...folder,
          sparkle_count: sparkles.filter(s => s.folder_id === folder.id).length,
        }));
        setFolders(foldersWithCounts);
        setShowFoldersSetup(false);
      } else {
        if (result.error?.includes('sparkle_folders') || result.error?.includes('PGRST205') || result.code === 'PGRST205') {
          console.log('[Sparkle Folders] Tables not found - showing setup guide');
          setShowFoldersSetup(true);
          setFolders([]);
        }
      }
    } catch (error: any) {
      console.log('[Sparkle Folders] Error loading folders - likely tables not created yet');
      setShowFoldersSetup(true);
      setFolders([]);
    }
  };

  // Create folder
  const createFolder = async (name: string, description?: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/sparkle-folders`,
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
      
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        setShowFoldersSetup(true);
        throw new Error('Please set up the database tables first. See the orange banner above for instructions.');
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create folder');
      }
      
      await loadFolders();
    } catch (error: any) {
      if (error.message?.includes('PGRST205') || error.message?.includes('schema cache') || error.message?.includes('database tables')) {
        setShowFoldersSetup(true);
      }
      throw error;
    }
  };

  // Update folder
  const updateFolder = async (folderId: string, name: string, description?: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/sparkle-folders/${folderId}`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/sparkle-folders/${folderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete folder');
    
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
    
    await loadFolders();
  };

  // Open analytics drawer
  const openAnalytics = (sparkleId: string) => {
    setAnalyticsSparkleId(sparkleId);
    setIsAnalyticsOpen(true);
  };

  // Toggle sparkle selection
  const toggleSparkleSelection = (sparkleId: string) => {
    const newSelection = new Set(selectedSparkles);
    if (newSelection.has(sparkleId)) {
      newSelection.delete(sparkleId);
    } else {
      newSelection.add(sparkleId);
    }
    setSelectedSparkles(newSelection);
  };

  // Select all sparkles
  const selectAll = () => {
    const filtered = getFilteredSparkles();
    setSelectedSparkles(new Set(filtered.map(s => s.id)));
  };

  // Deselect all sparkles
  const deselectAll = () => {
    setSelectedSparkles(new Set());
  };

  // Move selected sparkles to folder
  const moveToFolder = async () => {
    if (selectedSparkles.size === 0) {
      toast.error("No sparkles selected");
      return;
    }

    try {
      const promises = Array.from(selectedSparkles).map(sparkleId =>
        adminAPI.updateSparkle(sparkleId, {
          folder_id: targetFolderId || null,
        })
      );

      await Promise.all(promises);
      
      toast.success(`Moved ${selectedSparkles.size} sparkle(s) to folder`);
      setShowMoveToFolderModal(false);
      setSelectedSparkles(new Set());
      setTargetFolderId("");
      loadSparkles();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to move sparkles: " + error.message);
    }
  };

  // Delete selected sparkles
  const deleteSelectedSparkles = async () => {
    if (selectedSparkles.size === 0) {
      toast.error("No sparkles selected");
      return;
    }

    if (!confirm(`Delete ${selectedSparkles.size} selected sparkle(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const promises = Array.from(selectedSparkles).map(sparkleId =>
        adminAPI.deleteSparkle(sparkleId)
      );

      await Promise.all(promises);
      
      toast.success(`Deleted ${selectedSparkles.size} sparkle(s)`);
      setSelectedSparkles(new Set());
      loadSparkles();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to delete sparkles: " + error.message);
    }
  };

  // Get filtered sparkles based on active tab
  const getFilteredSparkles = () => {
    let filtered = sparkles;

    // Filter by active tab
    if (activeTab === "published") {
      filtered = filtered.filter(s => s.publish_status === "published");
    } else if (activeTab === "scheduled") {
      filtered = filtered.filter(s => 
        s.publish_status === "scheduled" && s.scheduled_at
      );
    } else if (activeTab === "draft") {
      filtered = filtered.filter(s => 
        s.publish_status === "draft" || 
        (s.publish_status === "scheduled" && !s.scheduled_at)
      );
    }

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(s => s.folder_id === selectedFolder);
    }

    return filtered;
  };

  useEffect(() => {
    loadSparkles();
  }, []);

  useEffect(() => {
    if (sparkles.length > 0) {
      loadFolders();
    }
  }, [sparkles]);

  useEffect(() => {
    loadAggregateAnalytics();
  }, [startDate, endDate]);

  const handleTogglePublish = async (sparkle: Sparkle) => {
    try {
      const newStatus = sparkle.publish_status === "published" ? "draft" : "published";
      
      await adminAPI.updateSparkle(sparkle.id, {
        publish_status: newStatus,
      });

      toast.success(`Sparkle ${newStatus === "published" ? "published" : "unpublished"}`);
      loadSparkles();
    } catch (error: any) {
      toast.error("Failed to update sparkle: " + error.message);
    }
  };

  const handleDelete = async (sparkle: Sparkle) => {
    if (!confirm(`Delete "${sparkle.title}"?`)) return;

    try {
      await adminAPI.deleteSparkle(sparkle.id);
      toast.success("Sparkle deleted");
      loadSparkles();
    } catch (error: any) {
      toast.error("Failed to delete sparkle: " + error.message);
    }
  };

  const handleCancelSchedule = async (sparkle: Sparkle) => {
    if (!confirm(`Cancel schedule for "${sparkle.title}"? It will be moved to drafts.`)) return;

    try {
      await adminAPI.updateSparkle(sparkle.id, {
        publish_status: "draft",
        scheduled_at: null,
      });
      toast.success("Schedule cancelled - sparkle moved to drafts");
      loadSparkles();
    } catch (error: any) {
      toast.error("Failed to cancel schedule: " + error.message);
    }
  };

  const handleReschedule = async (sparkleId: string, newDate: Date) => {
    try {
      console.log('[AdminSparkleManager] Rescheduling sparkle:', {
        sparkleId,
        newDate: newDate.toISOString(),
      });
      
      const result = await adminAPI.updateSparkle(sparkleId, {
        scheduled_at: newDate.toISOString(),
      });
      
      console.log('[AdminSparkleManager] Reschedule response:', result);
      
      toast.success("Sparkle rescheduled successfully");
      await loadSparkles();
    } catch (error: any) {
      console.error('[AdminSparkleManager] Reschedule error:', error);
      toast.error("Failed to reschedule: " + error.message);
      throw error;
    }
  };

  const handlePublishNow = async (sparkle: Sparkle) => {
    if (!confirm(`Publish "${sparkle.title}" immediately?`)) return;

    try {
      await adminAPI.updateSparkle(sparkle.id, {
        publish_status: "published",
        published_at: new Date().toISOString(),
        scheduled_at: null,
      });
      console.log(`[AdminSparkleManager] Published sparkle ${sparkle.id} immediately`);
      toast.success("Sparkle published!");
      loadSparkles();
    } catch (error: any) {
      console.error(`[AdminSparkleManager] Failed to publish sparkle ${sparkle.id}:`, error);
      toast.error("Failed to publish sparkle: " + error.message);
    }
  };

  const filteredSparkles = getFilteredSparkles();
  
  // Calculate accurate tab counts
  const publishedCount = sparkles.filter(s => s.publish_status === "published").length;
  const scheduledCount = sparkles.filter(s => s.publish_status === "scheduled" && s.scheduled_at).length;
  const draftCount = sparkles.filter(s => 
    s.publish_status === "draft" || 
    (s.publish_status === "scheduled" && !s.scheduled_at)
  ).length;
  const uncategorizedCount = sparkles.filter(s => !s.folder_id).length;

  return (
    <div className="space-y-6 text-inter-regular-14">
      {/* Database Setup Guide */}
      {showDatabaseSetup && <DatabaseSetupGuide />}
      
      {/* Folders Setup Guide */}
      {showFoldersSetup && <FoldersSetupGuide />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Sparkle Management</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Manage short-form video content for the user app
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
              loadSparkles();
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
            Upload Sparkle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-sm text-inter-regular-14">Total Sparkles</p>
            <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
              {sparkles.length}
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
              {aggregateAnalytics ? (aggregateAnalytics.total_views || 0).toLocaleString() : sparkles.reduce((sum, s) => sum + (s.view_count || 0), 0).toLocaleString()}
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
              <p className="text-gray-500 text-sm text-inter-regular-14">Total Likes</p>
              {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
              {aggregateAnalytics ? (aggregateAnalytics.total_likes || 0).toLocaleString() : sparkles.reduce((sum, s) => sum + (s.like_count || 0), 0).toLocaleString()}
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
      {selectedSparkles.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-inter-medium-16 text-green-800">
              {selectedSparkles.size} sparkle(s) selected
            </p>
            <button
              onClick={deselectAll}
              className="text-sm text-green-600 hover:text-green-700 underline"
            >
              Deselect All
            </button>
          </div>
          <div className="flex items-center gap-3">
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
              onClick={deleteSelectedSparkles}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Layout: Sparkles */}
      {!showDatabaseSetup && (
        <div className="space-y-4">
          {/* Compact Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Folder Dropdown */}
            {!showFoldersSetup && (
              <div className="w-64">
                <FolderDropdown
                  folders={folders}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  onCreateFolder={createFolder}
                  onUpdateFolder={updateFolder}
                  onDeleteFolder={deleteFolder}
                  allWallpapersCount={sparkles.length}
                  uncategorizedCount={uncategorizedCount}
                />
              </div>
            )}

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("published")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${
                  activeTab === "published"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1.5" />
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${
                  activeTab === "scheduled"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1.5" />
                Scheduled ({scheduledCount})
              </button>
              <button
                onClick={() => setActiveTab("draft")}
                className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${
                  activeTab === "draft"
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
              {filteredSparkles.length > 0 && (
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
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "card"
                      ? "bg-green-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Card View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "list"
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

          {/* Sparkles Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 text-inter-regular-14">Loading sparkles...</p>
              </div>
            </div>
          ) : filteredSparkles.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-800 mb-2 text-inter-semibold-18">No sparkles yet</h3>
              <p className="text-gray-500 mb-4 text-inter-regular-14">
                {selectedFolder
                  ? "No sparkles in this folder. Try selecting a different folder or upload a new sparkle."
                  : "Upload your first sparkle to get started"}
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
              >
                Upload Sparkle
              </button>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSparkles.map((sparkle) => (
                <div
                  key={sparkle.id}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${
                    selectedSparkles.has(sparkle.id) ? "border-green-500 ring-2 ring-green-200" : "border-gray-200"
                  }`}
                >
                  {/* Image or Video Thumbnail */}
                  <div className="relative aspect-[9/16] bg-gray-100">
                    {renderSparklePreview(sparkle, "card")}
                    {/* Video Badge */}
                    {sparkle.video_url && (
                      <div className="absolute bottom-3 right-3">
                        <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <span className="text-xs text-white font-medium">Video</span>
                        </div>
                      </div>
                    )}
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3">
                      <button
                        onClick={() => toggleSparkleSelection(sparkle.id)}
                        className="w-6 h-6 rounded bg-white border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors"
                      >
                        {selectedSparkles.has(sparkle.id) && (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        )}
                      </button>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {sparkle.publish_status === "scheduled" && sparkle.scheduled_at ? (
                        <CountdownTimerBadge scheduledAt={sparkle.scheduled_at} />
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${
                            sparkle.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : sparkle.publish_status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {sparkle.publish_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-inter-semibold-18">
                      {sparkle.title}
                    </h3>

                    {(() => {
                      const info = getCompressionInfo(sparkle);
                      if (!info) return null;
                      return (
                        <div className="text-xs text-gray-500 mb-2">
                          {`Size: ${formatBytes(info.originalBytes)} → ${formatBytes(info.compressedBytes)}`}
                          {info.applied ? " (compressed)" : ""}
                          {info.method ? ` • ${info.method}` : ""}
                        </div>
                      );
                    })()}
                    {sparkle.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 text-inter-regular-14">
                        {sparkle.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Views</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {sparkleStats[sparkle.id]?.views ?? sparkle.view_count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Likes</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {sparkleStats[sparkle.id]?.likes ?? sparkle.like_count ?? 0}
                        </p>
                      </div>
                      <button
                        onClick={() => openAnalytics(sparkle.id)}
                        className="ml-auto text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-3 text-inter-regular-14">
                      Created {new Date(sparkle.created_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {sparkle.publish_status === "scheduled" ? (
                        <ScheduleActionDropdown
                          onReschedule={() => setRescheduleSparkle(sparkle)}
                          onPublishNow={() => handlePublishNow(sparkle)}
                          onCancelSchedule={() => handleCancelSchedule(sparkle)}
                        />
                      ) : (
                        <button
                          onClick={() => handleTogglePublish(sparkle)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-colors text-inter-medium-16 ${
                            sparkle.publish_status === "published"
                              ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                              : "border-green-300 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {sparkle.publish_status === "published" ? (
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
                        onClick={() => handleDelete(sparkle)}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedSparkles.size === filteredSparkles.length && filteredSparkles.length > 0}
                        onChange={() => {
                          if (selectedSparkles.size === filteredSparkles.length && filteredSparkles.length > 0) {
                            deselectAll();
                          } else {
                            selectAll();
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SPARKLE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VIEWS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LIKES
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
                  {filteredSparkles.map((sparkle) => (
                    <tr
                      key={sparkle.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedSparkles.has(sparkle.id) ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedSparkles.has(sparkle.id)}
                          onChange={() => toggleSparkleSelection(sparkle.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {renderSparklePreview(sparkle, "list")}
                          <div>
                            <div className="font-medium text-gray-900 text-inter-medium-16">{sparkle.title}</div>

                            {(() => {
                              const info = getCompressionInfo(sparkle);
                              if (!info) return null;
                              return (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {`Size: ${formatBytes(info.originalBytes)} → ${formatBytes(info.compressedBytes)}`}
                                  {info.applied ? " (compressed)" : ""}
                                  {info.method ? ` • ${info.method}` : ""}
                                </div>
                              );
                            })()}
                            {sparkle.description && (
                              <div className="text-sm text-gray-500 line-clamp-1 text-inter-regular-14">
                                {sparkle.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sparkle.publish_status === "scheduled" && sparkle.scheduled_at ? (
                          <CountdownTimerBadge scheduledAt={sparkle.scheduled_at} />
                        ) : (
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${
                              sparkle.publish_status === "published"
                                ? "bg-green-100 text-green-700"
                                : sparkle.publish_status === "scheduled"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {sparkle.publish_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {sparkleStats[sparkle.id]?.views ?? sparkle.view_count ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {sparkleStats[sparkle.id]?.likes ?? sparkle.like_count ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-inter-regular-14">
                        {new Date(sparkle.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAnalytics(sparkle.id)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          {sparkle.publish_status === "scheduled" ? (
                            <ScheduleActionDropdown
                              onReschedule={() => setRescheduleSparkle(sparkle)}
                              onPublishNow={() => handlePublishNow(sparkle)}
                              onCancelSchedule={() => handleCancelSchedule(sparkle)}
                            />
                          ) : (
                            <button
                              onClick={() => handleTogglePublish(sparkle)}
                              className="text-green-600 hover:text-green-700 p-1.5 hover:bg-green-50 rounded transition-colors"
                              title={sparkle.publish_status === "published" ? "Unpublish" : "Publish"}
                            >
                              {sparkle.publish_status === "published" ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sparkle)}
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
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadSparkles}
        title="Sparkle"
        uploadType="sparkle"
        uploadFunction={adminAPI.uploadSparkle}
      />

      {/* Reschedule Dialog */}
      {rescheduleSparkle && (
        <RescheduleDialog
          isOpen={!!rescheduleSparkle}
          onClose={() => setRescheduleSparkle(null)}
          onReschedule={async (newDate) => {
            await handleReschedule(rescheduleSparkle.id, newDate);
            setRescheduleSparkle(null);
          }}
          currentScheduledAt={rescheduleSparkle.scheduled_at || null}
          wallpaperTitle={rescheduleSparkle.title}
        />
      )}

      {/* Move to Folder Modal */}
      {showMoveToFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-inter-semibold-18 text-gray-800 mb-4">
              Move {selectedSparkles.size} sparkle(s) to folder
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
      <SparkleAnalyticsDrawer
        isOpen={isAnalyticsOpen}
        onClose={() => {
          setIsAnalyticsOpen(false);
          setAnalyticsSparkleId(null);
        }}
        sparkleId={analyticsSparkleId || ""}
      />
    </div>
  );
}
