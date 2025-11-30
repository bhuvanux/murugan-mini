import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, RefreshCw, BarChart3, FolderInput, Settings, CheckSquare, Grid3x3, List, Calendar as CalendarIcon, Clock, Play, Download } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { AddMediaModal } from "./AddMediaModal";
import { DatabaseSetupGuide } from "./DatabaseSetupGuide";
import { FolderDropdown } from "./FolderDropdown";
import { CountdownTimerBadge } from "./CountdownTimerBadge";
import { ScheduleActionDropdown } from "./ScheduleActionDropdown";
import { RescheduleDialog } from "./RescheduleDialog";
import { FoldersSetupGuide } from "./FoldersSetupGuide";
import { MediaAnalyticsDrawer } from "./MediaAnalyticsDrawer";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface MediaItem {
  id: string;
  title: string;
  artist?: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  media_type: string;
  youtube_url?: string;
  publish_status: string;
  play_count: number;
  download_count: number;
  like_count: number;
  share_count: number;
  created_at: string;
  folder_id?: string;
  scheduled_at?: string;
}

interface MediaFolder {
  id: string;
  name: string;
  description?: string;
  media_count: number;
  created_at: string;
}

type ViewMode = "card" | "list";

export function AdminMediaManager() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "scheduled" | "draft">("published");
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [showFoldersSetup, setShowFoldersSetup] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");

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
    total_plays: number;
    total_downloads: number;
  } | null>(null);

  // Folder & Analytics state
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [analyticsMediaId, setAnalyticsMediaId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Bulk selection state
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Reschedule modal state
  const [rescheduleMedia, setRescheduleMedia] = useState<MediaItem | null>(null);

  // Load media from backend
  const loadMedia = async () => {
    try {
      setIsLoading(true);
      console.log('[AdminMediaManager] Starting to load media...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media?mediaType=${mediaType}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const result = await response.json();
      
      console.log("[AdminMediaManager] Loaded media:", result);
      
      if (result.success && Array.isArray(result.data)) {
        setMediaItems(result.data);
        if (result.data.length === 0 && !selectedFolder) {
          toast.info("No media found. Upload your first media!");
        }
        setShowDatabaseSetup(false);
      } else {
        throw new Error(result.error || 'Failed to load media');
      }
    } catch (error: any) {
      console.error("[AdminMediaManager] Load error:", error);
      
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
      
      setMediaItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load aggregate analytics for date range
  const loadAggregateAnalytics = async () => {
    if (!startDate || !endDate) {
      console.log('[AdminMediaManager] Skipping analytics load - missing dates');
      return;
    }

    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) ||
        !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      console.error('[AdminMediaManager] Invalid date objects:', { startDate, endDate });
      setAggregateAnalytics(null);
      return;
    }
    
    try {
      console.log('[AdminMediaManager] Loading aggregate analytics for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        content_type: 'media',
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
        console.log('[AdminMediaManager] Aggregate analytics loaded:', result.data);
        setAggregateAnalytics(result.data);
      } else {
        console.warn('[AdminMediaManager] Analytics response not successful:', result);
        setAggregateAnalytics(null);
      }
    } catch (error: any) {
      console.error('[AdminMediaManager] Failed to load aggregate analytics:', error);
      setAggregateAnalytics(null);
    }
  };

  // Load folders
  const loadFolders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media-folders`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();
      
      if (!response.ok || result.code === 'PGRST205' || result.message?.includes('schema cache')) {
        console.log('[Media Folders] Tables not set up yet - folder features will be hidden');
        setShowFoldersSetup(true);
        setFolders([]);
        return;
      }
      
      if (result.success) {
        const foldersWithCounts = (result.data || []).map((folder: any) => ({
          ...folder,
          media_count: mediaItems.filter(m => m.folder_id === folder.id).length,
        }));
        setFolders(foldersWithCounts);
        setShowFoldersSetup(false);
      } else {
        if (result.error?.includes('media_folders') || result.error?.includes('PGRST205') || result.code === 'PGRST205') {
          console.log('[Media Folders] Tables not found - showing setup guide');
          setShowFoldersSetup(true);
          setFolders([]);
        }
      }
    } catch (error: any) {
      console.log('[Media Folders] Error loading folders - likely tables not created yet');
      setShowFoldersSetup(true);
      setFolders([]);
    }
  };

  // Create folder
  const createFolder = async (name: string, description?: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media-folders`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media-folders/${folderId}`,
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
      `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media-folders/${folderId}`,
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
  const openAnalytics = (mediaId: string) => {
    setAnalyticsMediaId(mediaId);
    setIsAnalyticsOpen(true);
  };

  // Toggle media selection
  const toggleMediaSelection = (mediaId: string) => {
    const newSelection = new Set(selectedMedia);
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId);
    } else {
      newSelection.add(mediaId);
    }
    setSelectedMedia(newSelection);
  };

  // Select all media
  const selectAll = () => {
    const filtered = getFilteredMedia();
    setSelectedMedia(new Set(filtered.map(m => m.id)));
  };

  // Deselect all media
  const deselectAll = () => {
    setSelectedMedia(new Set());
  };

  // Move selected media to folder
  const moveToFolder = async () => {
    if (selectedMedia.size === 0) {
      toast.error("No media selected");
      return;
    }

    try {
      const promises = Array.from(selectedMedia).map(mediaId =>
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media/${mediaId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              folder_id: targetFolderId || null,
            }),
          }
        )
      );

      await Promise.all(promises);
      
      toast.success(`Moved ${selectedMedia.size} media item(s) to folder`);
      setShowMoveToFolderModal(false);
      setSelectedMedia(new Set());
      setTargetFolderId("");
      loadMedia();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to move media: " + error.message);
    }
  };

  // Delete selected media
  const deleteSelectedMedia = async () => {
    if (selectedMedia.size === 0) {
      toast.error("No media selected");
      return;
    }

    if (!confirm(`Delete ${selectedMedia.size} selected media item(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const promises = Array.from(selectedMedia).map(mediaId =>
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media/${mediaId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        )
      );

      await Promise.all(promises);
      
      toast.success(`Deleted ${selectedMedia.size} media item(s)`);
      setSelectedMedia(new Set());
      loadMedia();
      loadFolders();
    } catch (error: any) {
      toast.error("Failed to delete media: " + error.message);
    }
  };

  // Get filtered media based on active tab
  const getFilteredMedia = () => {
    let filtered = mediaItems;

    // Filter by active tab
    if (activeTab === "published") {
      filtered = filtered.filter(m => m.publish_status === "published");
    } else if (activeTab === "scheduled") {
      filtered = filtered.filter(m => 
        m.publish_status === "scheduled" && m.scheduled_at
      );
    } else if (activeTab === "draft") {
      filtered = filtered.filter(m => 
        m.publish_status === "draft" || 
        (m.publish_status === "scheduled" && !m.scheduled_at)
      );
    }

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(m => m.folder_id === selectedFolder);
    }

    return filtered;
  };

  useEffect(() => {
    loadMedia();
  }, [mediaType]);

  useEffect(() => {
    if (mediaItems.length > 0) {
      loadFolders();
    }
  }, [mediaItems]);

  useEffect(() => {
    loadAggregateAnalytics();
  }, [startDate, endDate]);

  const handleTogglePublish = async (media: MediaItem) => {
    try {
      const newStatus = media.publish_status === "published" ? "draft" : "published";
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media/${media.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            publish_status: newStatus,
          }),
        }
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success(`Media ${newStatus === "published" ? "published" : "unpublished"}`);
      loadMedia();
    } catch (error: any) {
      toast.error("Failed to update media: " + error.message);
    }
  };

  const handleDelete = async (media: MediaItem) => {
    if (!confirm(`Delete "${media.title}"?`)) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media/${media.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      toast.success("Media deleted");
      loadMedia();
    } catch (error: any) {
      toast.error("Failed to delete media: " + error.message);
    }
  };

  const filteredMedia = getFilteredMedia();
  
  // Calculate accurate tab counts
  const publishedCount = mediaItems.filter(m => m.publish_status === "published").length;
  const scheduledCount = mediaItems.filter(m => m.publish_status === "scheduled" && m.scheduled_at).length;
  const draftCount = mediaItems.filter(m => 
    m.publish_status === "draft" || 
    (m.publish_status === "scheduled" && !m.scheduled_at)
  ).length;
  const uncategorizedCount = mediaItems.filter(m => !m.folder_id).length;

  return (
    <div className="space-y-6 text-inter-regular-14">
      {/* Database Setup Guide */}
      {showDatabaseSetup && <DatabaseSetupGuide />}
      
      {/* Folders Setup Guide */}
      {showFoldersSetup && <FoldersSetupGuide contentType="media" />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-inter-bold-20 text-gray-800">Media Management</h2>
          <p className="text-gray-500 mt-1 text-inter-regular-14">
            Manage audio and video content for the user app
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Media Type Toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setMediaType("audio")}
              className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${
                mediaType === "audio"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setMediaType("video")}
              className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${
                mediaType === "video"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Video
            </button>
          </div>

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
              loadMedia();
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
            Upload Media
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <p className="text-gray-500 text-sm text-inter-regular-14">Total Media</p>
            <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
              {mediaItems.length}
            </p>
            <p className="text-sm text-green-600 mt-1 text-inter-regular-14">
              {publishedCount} published
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-sm text-inter-regular-14">Total Plays</p>
              {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
              {aggregateAnalytics ? (aggregateAnalytics.total_plays || 0).toLocaleString() : mediaItems.reduce((sum, m) => sum + (m.play_count || 0), 0).toLocaleString()}
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
              <p className="text-gray-500 text-sm text-inter-regular-14">Total Downloads</p>
              {aggregateAnalytics && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1 text-inter-bold-20">
              {aggregateAnalytics ? (aggregateAnalytics.total_downloads || 0).toLocaleString() : mediaItems.reduce((sum, m) => sum + (m.download_count || 0), 0).toLocaleString()}
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
      {selectedMedia.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-inter-medium-16 text-green-800">
              {selectedMedia.size} media item(s) selected
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
              onClick={deleteSelectedMedia}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Layout: Media */}
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
                  allWallpapersCount={mediaItems.length}
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
              {filteredMedia.length > 0 && (
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

          {/* Media Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 text-inter-regular-14">Loading media...</p>
              </div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-800 mb-2 text-inter-semibold-18">No media yet</h3>
              <p className="text-gray-500 mb-4 text-inter-regular-14">
                {selectedFolder
                  ? "No media in this folder. Try selecting a different folder or upload new media."
                  : "Upload your first media to get started"}
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
              >
                Upload Media
              </button>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMedia.map((media) => (
                <div
                  key={media.id}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all ${
                    selectedMedia.has(media.id) ? "border-green-500 ring-2 ring-green-200" : "border-gray-200"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-100">
                    <img
                      src={media.thumbnail_url || "/placeholder-media.png"}
                      alt={media.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3">
                      <button
                        onClick={() => toggleMediaSelection(media.id)}
                        className="w-6 h-6 rounded bg-white border-2 border-gray-300 flex items-center justify-center hover:border-green-500 transition-colors"
                      >
                        {selectedMedia.has(media.id) && (
                          <CheckSquare className="w-5 h-5 text-green-600" />
                        )}
                      </button>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-inter-medium-16 ${
                          media.publish_status === "published"
                            ? "bg-green-100 text-green-700"
                            : media.publish_status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {media.publish_status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-inter-semibold-18">
                      {media.title}
                    </h3>
                    {media.artist && (
                      <p className="text-gray-600 text-sm mb-3 text-inter-regular-14">
                        {media.artist}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Plays</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {media.play_count || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 text-inter-regular-14">Downloads</p>
                        <p className="font-semibold text-gray-800 text-inter-medium-16">
                          {media.download_count || 0}
                        </p>
                      </div>
                      <button
                        onClick={() => openAnalytics(media.id)}
                        className="ml-auto text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-3 text-inter-regular-14">
                      Created {new Date(media.created_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePublish(media)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border transition-colors text-inter-medium-16 ${
                          media.publish_status === "published"
                            ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                            : "border-green-300 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {media.publish_status === "published" ? (
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
                      <button
                        onClick={() => handleDelete(media)}
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
                        checked={selectedMedia.size === filteredMedia.length && filteredMedia.length > 0}
                        onChange={() => {
                          if (selectedMedia.size === filteredMedia.length && filteredMedia.length > 0) {
                            deselectAll();
                          } else {
                            selectAll();
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MEDIA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PLAYS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DOWNLOADS
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
                  {filteredMedia.map((media) => (
                    <tr
                      key={media.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedMedia.has(media.id) ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMedia.has(media.id)}
                          onChange={() => toggleMediaSelection(media.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={media.thumbnail_url || "/placeholder-media.png"}
                            alt={media.title}
                            className="w-16 h-10 object-cover rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900 text-inter-medium-16">{media.title}</div>
                            {media.artist && (
                              <div className="text-sm text-gray-500 line-clamp-1 text-inter-regular-14">
                                {media.artist}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${
                            media.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : media.publish_status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {media.publish_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {media.play_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-inter-regular-14">
                        {media.download_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-inter-regular-14">
                        {new Date(media.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAnalytics(media.id)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="View Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePublish(media)}
                            className="text-green-600 hover:text-green-700 p-1.5 hover:bg-green-50 rounded transition-colors"
                            title={media.publish_status === "published" ? "Unpublish" : "Publish"}
                          >
                            {media.publish_status === "published" ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(media)}
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
      <AddMediaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadMedia}
        mediaType={mediaType}
      />

      {/* Move to Folder Modal */}
      {showMoveToFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-inter-semibold-18 text-gray-800 mb-4">
              Move {selectedMedia.size} media item(s) to folder
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
      <MediaAnalyticsDrawer
        isOpen={isAnalyticsOpen}
        onClose={() => {
          setIsAnalyticsOpen(false);
          setAnalyticsMediaId(null);
        }}
        mediaId={analyticsMediaId || ""}
      />
    </div>
  );
}
