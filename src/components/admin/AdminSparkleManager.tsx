import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, BarChart3, FolderInput, Settings, CheckSquare, Grid3x3, List, Calendar as CalendarIcon, Clock, Heart, Share2, Download, AlertCircle, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { AddSparkleModal } from "./AddSparkleModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { FolderDropdown } from "./FolderDropdown";
import { CountdownTimerBadge } from "./CountdownTimerBadge";
import { ScheduleActionDropdown } from "./ScheduleActionDropdown";
import { RescheduleDialog } from "./RescheduleDialog";
import { FoldersSetupGuide } from "./FoldersSetupGuide";
import { SparkleAnalyticsDrawer } from "./SparkleAnalyticsDrawer";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";
import { BackendDiagnostics } from "../BackendDiagnostics";
import { MetadataBackfill } from "./analytics/MetadataBackfill";
import * as adminAPI from "../../utils/adminAPI";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { format } from "date-fns";

interface Sparkle {
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
  like_count: number;
  share_count: number;
  download_count: number;
  created_at: string;
  tags?: string[];
  folder_id?: string;
  scheduled_at?: string;
}

interface SparkleFolder {
  id: string;
  name: string;
  description?: string;
  sparkle_count: number;
  created_at: string;
}

type ViewMode = "card" | "list";

// Helper to calculate compression stats
const getCompressionInfo = (sparkle: any) => {
  // Check if we have the new metadata format
  if (sparkle.metadata && sparkle.metadata.original_size && sparkle.metadata.optimized_size) {
    const original = sparkle.metadata.original_size;
    const optimized = sparkle.metadata.optimized_size;
    const ratio = sparkle.metadata.compression_ratio;

    return {
      original: formatBytes(original),
      optimized: formatBytes(optimized),
      ratio: isNaN(parseFloat(ratio)) ? '0%' : `${(parseFloat(ratio) * 100).toFixed(0)}%`,
      rawRatio: parseFloat(ratio)
    };
  }

  // Fallback to legacy fields if available
  if (sparkle.original_size_bytes && sparkle.optimized_size_bytes) {
    const original = sparkle.original_size_bytes;
    const optimized = sparkle.optimized_size_bytes;
    const savings = 1 - (optimized / original);

    return {
      original: formatBytes(original),
      optimized: formatBytes(optimized),
      ratio: `${(savings * 100).toFixed(0)}%`,
      rawRatio: savings
    };
  }

  return null;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function AdminSparkleManager() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
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

  // Load sparkles from backend
  const loadSparkles = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminSparkleManager] Starting to load sparkles...');

      const result = await adminAPI.getSparkles();

      console.log("[AdminSparkleManager] Loaded sparkles:", result);

      setSparkles(result.data || []);

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
    const execId = Math.random().toString(36).substr(2, 5);
    let filtered = sparkles;

    console.log(`[${execId}] Initial count:`, sparkles.length, 'sparkles:', sparkles.map(s => ({ id: s.id.substr(0, 8), status: s.publish_status, folder: s.folder_id })));
    console.log(`[${execId}] activeTab:`, activeTab);
    console.log(`[${execId}] selectedFolder:`, selectedFolder);

    // Filter by active tab
    if (activeTab === "published") {
      filtered = filtered.filter(s => s.publish_status === "published");
      console.log(`[${execId}] After publish filter:`, filtered.length);
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
      console.log(`[${execId}] Applying folder filter for:`, selectedFolder);
      filtered = filtered.filter(s => s.folder_id === selectedFolder);
      console.log(`[${execId}] After folder filter:`, filtered.length);
    }

    console.log(`[${execId}] Final filtered count:`, filtered.length);
    console.log(`[${execId}] Actual filtered array:`, filtered);
    console.log(`[${execId}] About to return filtered`);
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

  const filteredSparkles = React.useMemo(() => {
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
  }, [sparkles, activeTab, selectedFolder]);

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
      {showFoldersSetup && <FoldersSetupGuide contentType="sparkle" />}

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
            className={`p-3 border rounded-lg transition-colors ${showDiagnostics ? "bg-gray-100 border-gray-400" : "border-gray-300 hover:bg-gray-50"}`}
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

      {/* Diagnostics Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="space-y-4 mb-6">
          <BackendDiagnostics />
          <MetadataBackfill
            items={sparkles}
            onUpdate={loadSparkles}
            type="sparkle"
          />
        </div>
      )}

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
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${selectedSparkles.has(sparkle.id) ? "border-green-500 ring-2 ring-green-200" : "border-gray-200"
                    }`}
                >
                  {/* Image */}
                  <div className="relative aspect-[9/16] bg-gray-100">
                    <img
                      src={sparkle.thumbnail_url || sparkle.medium_url || sparkle.image_url}
                      alt={sparkle.title}
                      className="w-full h-full object-cover"
                    />
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
                          className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${sparkle.publish_status === "published"
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
                    {sparkle.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 text-inter-regular-14">
                        {sparkle.description}
                      </p>
                    )}
                    {/* Stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>Views</span>
                        </div>
                        <span className="font-medium text-inter-medium-14">{sparkle.view_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>Likes</span>
                        </div>
                        <span className="font-medium text-inter-medium-14">{sparkle.like_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          <span>Shares</span>
                        </div>
                        <span className="font-medium text-inter-medium-14">{sparkle.share_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>Downloads</span>
                        </div>
                        <span className="font-medium text-inter-medium-14">{sparkle.download_count || 0}</span>
                      </div>
                    </div>

                    {/* Compression Stats (Card View) */}
                    {getCompressionInfo(sparkle) && (
                      <div className="mb-4 p-2.5 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs">
                          <div className="flex flex-col">
                            <span className="text-gray-500 uppercase tracking-wider font-bold">Original</span>
                            <span className="font-semibold text-gray-700">{getCompressionInfo(sparkle)!.original}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-green-600 uppercase tracking-wider font-bold">Saved {getCompressionInfo(sparkle)!.ratio}</span>
                            <span className="font-semibold text-green-700">{getCompressionInfo(sparkle)!.optimized}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end">
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
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-colors text-inter-medium-16 ${sparkle.publish_status === "published"
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
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
                      SHARES
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DOWNLOADS
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
                  {filteredSparkles.map((sparkle) => (
                    <tr
                      key={sparkle.id}
                      className={`hover:bg-gray-50 transition-colors ${selectedSparkles.has(sparkle.id) ? "bg-green-50" : ""
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
                          <img
                            src={sparkle.thumbnail_url || sparkle.medium_url || sparkle.image_url}
                            alt={sparkle.title}
                            className="w-10 h-16 object-cover rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900 text-inter-medium-16">{sparkle.title}</div>
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
                          <CountdownTimerBadge scheduledAt={sparkle.scheduled_at} compact />
                        ) : (
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${sparkle.publish_status === "published"
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
                        {sparkle.view_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {sparkle.like_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {sparkle.share_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {sparkle.download_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getCompressionInfo(sparkle) ? (
                          <div className="flex flex-col text-xs text-inter-regular-14">
                            <span className="text-gray-900">{getCompressionInfo(sparkle)!.optimized}</span>
                            <span className="text-green-600 text-[10px] font-medium">
                              Saved {getCompressionInfo(sparkle)!.ratio}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 text-inter-regular-14">-</span>
                        )}
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
      <AddSparkleModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); loadSparkles(); }}
        onSuccess={(status) => {
          loadSparkles();
          if (status === 'draft' || status === 'published' || status === 'scheduled') {
            setActiveTab(status);
            toast.success(`Switched to ${status} tab to show new uploads`);
          }
        }}
        folders={showFoldersSetup ? [] : folders}
        onCreateFolder={createFolder}
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
          currentDate={rescheduleSparkle.scheduled_at ? new Date(rescheduleSparkle.scheduled_at) : new Date()}
          title={rescheduleSparkle.title}
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
