import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  HardDrive,
  Zap,
  TrendingUp,
  AlertCircle,
  Info,
  Download,
  Eye,
  Heart,
  Share2,
  ArrowUpDown,
  Loader2,
  Trash2,
  Play,
} from "lucide-react";
import * as adminAPI from "../../utils/adminAPI";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { ThumbnailImage } from "../ThumbnailImage";
import { FileTypeExplorer } from "./FileTypeExplorer";
import {
  formatBytes,
  calculateTotalStorage,
  calculateModuleStats,
  calculateMediaTypeStats,
  convertToFileWithAnalytics,
  calculateBandwidthStats,
  generateOptimizationInsights,
  calculateEngagementMetrics,
  detectWaste,
  estimateGrowthAndCapacity,
} from "../../utils/storageUtils";
import type {
  StorageStats,
  ModuleStats,
  FileWithAnalytics,
  OptimizationInsight,
} from "../../types/storageTypes";

export function AdminStorageMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [sparkles, setSparkles] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Map<string, any>>(new Map());

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<'zero' | 'low_engagement' | 'stale' | null>(null);
  const [filesToDelete, setFilesToDelete] = useState<any[]>([]);

  // File preview modal state
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);

  // File type explorer state
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<'thumbnail' | 'video' | 'audio' | null>(null);

  // Top Accessed Files state
  const [activeEngagementTab, setActiveEngagementTab] = useState<'views' | 'downloads' | 'plays' | 'shares' | 'likes'>('views');
  const [sortBy, setSortBy] = useState<'count' | 'bandwidth'>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      console.log("[Storage Monitor] Starting to load data for all modules...");

      // Load all modules in parallel
      // We need to fetch media twice: once for audio and once for video
      const [wallpapersRes, audioRes, videoRes, sparklesRes, bannersRes, photosRes] = await Promise.all([
        adminAPI.getWallpapers(),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media?mediaType=audio`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).then(res => res.json()),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/media?mediaType=video`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).then(res => res.json()),
        adminAPI.getSparkles(),
        adminAPI.getBanners(),
        supabase.from("photos").select("*"),
      ]);

      const wallpapersData = Array.isArray(wallpapersRes?.data) ? wallpapersRes.data : (Array.isArray(wallpapersRes) ? wallpapersRes : []);
      const audioData = Array.isArray(audioRes?.data) ? audioRes.data : (Array.isArray(audioRes) ? audioRes : []);
      const videoData = Array.isArray(videoRes?.data) ? videoRes.data : (Array.isArray(videoRes) ? videoRes : []);
      const sparklesData = Array.isArray(sparklesRes?.data) ? sparklesRes.data : (Array.isArray(sparklesRes) ? sparklesRes : []);
      const bannersData = Array.isArray(bannersRes?.data) ? bannersRes.data : (Array.isArray(bannersRes) ? bannersRes : []);
      const photosData = Array.isArray(photosRes?.data) ? photosRes.data : (Array.isArray(photosRes) ? photosRes : []);

      console.log("[Storage Monitor] Data counts:", {
        wallpapers: wallpapersData.length,
        audio: audioData.length,
        video: videoData.length,
        sparkles: sparklesData.length,
        banners: bannersData.length,
        photos: photosData.length,
      });

      setWallpapers(wallpapersData);
      setMedia([...audioData, ...videoData]);
      setSparkles(sparklesData);
      setBanners(bannersData);
      setPhotos(photosData);

      // Load analytics data
      await loadAnalyticsData([
        ...wallpapersData,
        ...audioData,
        ...videoData,
        ...sparklesData,
        ...bannersData,
        ...photosData,
      ]);
    } catch (error) {
      console.error("[Storage Monitor] Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyticsData = async (allItems: any[]) => {
    try {
      // Query analytics_tracking table for all items
      const itemIds = allItems.map((item) => item.id);

      if (itemIds.length === 0) {
        return;
      }

      const { data: analyticsData } = await supabase
        .from("analytics_tracking")
        .select("item_id, event_type, created_at")
        .in("item_id", itemIds);

      // Aggregate analytics by item_id
      const analyticsAgg = new Map<string, any>();

      (analyticsData || []).forEach((event) => {
        if (!analyticsAgg.has(event.item_id)) {
          analyticsAgg.set(event.item_id, {
            views: 0,
            downloads: 0,
            likes: 0,
            shares: 0,
            lastAccessed: event.created_at,
          });
        }

        const stats = analyticsAgg.get(event.item_id)!;

        switch (event.event_type) {
          case "view":
            stats.views += 1;
            break;
          case "download":
            stats.downloads += 1;
            break;
          case "like":
            stats.likes += 1;
            break;
          case "share":
            stats.shares += 1;
            break;
        }

        // Track last accessed
        if (new Date(event.created_at) > new Date(stats.lastAccessed)) {
          stats.lastAccessed = event.created_at;
        }
      });

      setAnalyticsMap(analyticsAgg);
    } catch (error) {
      console.error("[Storage Monitor] Failed to load analytics:", error);
    }
  };

  // Calculate all statistics
  const allFiles = useMemo(() => [...wallpapers, ...media, ...sparkles, ...banners, ...photos], [
    wallpapers,
    media,
    sparkles,
    banners,
    photos,
  ]);

  const totalStorage = useMemo(() => calculateTotalStorage(allFiles), [allFiles]);

  const moduleStats: ModuleStats[] = useMemo(() => {
    return [
      calculateModuleStats(wallpapers, "wallpapers", "Wallpapers", analyticsMap),
      calculateModuleStats(media, "media", "Media", analyticsMap),
      calculateModuleStats(sparkles, "sparkle", "Sparkle", analyticsMap),
      calculateModuleStats(banners, "banners", "Banners", analyticsMap),
      calculateModuleStats(photos, "photos", "Photos", analyticsMap),
    ].sort((a, b) => b.totalOptimizedSize - a.totalOptimizedSize);
  }, [wallpapers, media, sparkles, banners, photos, analyticsMap]);

  const mediaTypeStats = useMemo(() => calculateMediaTypeStats(allFiles), [allFiles]);

  const filesWithAnalytics = useMemo(() => {
    const addUrls = (items: any[], moduleName: string) => {
      return convertToFileWithAnalytics(items, moduleName, analyticsMap).map((file) => {
        const original = items.find((i) => i.id === file.id);
        return {
          ...file,
          imageUrl: original?.image_url || original?.file_url || original?.thumbnail_url || '',
          thumbnailUrl: original?.thumbnail_url || original?.image_url || original?.file_url || '',
        };
      });
    };

    return [
      ...addUrls(wallpapers, "wallpapers"),
      ...addUrls(media, "media"),
      ...addUrls(sparkles, "sparkle"),
      ...addUrls(banners, "banners"),
      ...addUrls(photos, "photos"),
    ];
  }, [wallpapers, media, sparkles, banners, photos, analyticsMap]);

  const bandwidthStats = useMemo(
    () => calculateBandwidthStats(filesWithAnalytics, moduleStats),
    [filesWithAnalytics, moduleStats]
  );

  const insights = useMemo(
    () => generateOptimizationInsights(filesWithAnalytics),
    [filesWithAnalytics]
  );

  const engagementMetrics = useMemo(
    () => calculateEngagementMetrics(filesWithAnalytics),
    [filesWithAnalytics]
  );

  const wasteDetection = useMemo(() => detectWaste(filesWithAnalytics), [filesWithAnalytics]);

  const { growthRatePerDay, estimatedDaysToFull } = useMemo(
    () => estimateGrowthAndCapacity(allFiles, totalStorage.totalOptimized),
    [allFiles, totalStorage.totalOptimized]
  );

  // Top Accessed Files - By Engagement Type
  const topFilesByEngagement = useMemo(() => {
    const getTopFiles = (metric: 'views' | 'downloads' | 'plays' | 'shares' | 'likes') => {
      const metricField = metric === 'plays' ? 'plays' : metric;

      return filesWithAnalytics
        .filter(f => (f[metricField as keyof typeof f] as number) > 0)
        .sort((a, b) => {
          const aValue = a[metricField as keyof typeof a] as number;
          const bValue = b[metricField as keyof typeof b] as number;

          if (sortBy === 'count') {
            return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
          } else {
            // Sort by bandwidth
            const aBandwidth = aValue * a.optimizedSize;
            const bBandwidth = bValue * b.optimizedSize;
            return sortDirection === 'desc' ? bBandwidth - aBandwidth : aBandwidth - bBandwidth;
          }
        })
        .slice(0, 20);
    };

    return {
      views: getTopFiles('views'),
      downloads: getTopFiles('downloads'),
      plays: getTopFiles('plays'),
      shares: getTopFiles('shares'),
      likes: getTopFiles('likes'),
    };
  }, [filesWithAnalytics, sortBy, sortDirection]);

  // Handle bulk delete by category
  const handleBulkDelete = async (category: 'zero' | 'low_engagement' | 'stale', files: FileWithAnalytics[]) => {
    if (files.length === 0) {
      toast.info("No files to delete in this category");
      return;
    }

    // Open modal instead of browser confirm
    setDeleteCategory(category);
    setFilesToDelete(files);
    setShowDeleteModal(true);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!filesToDelete || filesToDelete.length === 0 || !deleteCategory) return;

    const categoryNames = {
      zero: "Zero Engagement Files",
      low_engagement: "Large Low-Value Files",
      stale: "Stale Bandwidth Hogs",
    };

    try {
      setIsDeleting(true);

      // Group files by module for appropriate delete API
      const filesByModule = filesToDelete.reduce((acc: Record<string, any[]>, file: any) => {
        if (!acc[file.moduleName]) acc[file.moduleName] = [];
        acc[file.moduleName].push(file);
        return acc;
      }, {} as Record<string, FileWithAnalytics[]>);

      // Delete in parallel by module
      const deletePromises: any[] = [];

      for (const [moduleName, moduleFiles] of Object.entries(filesByModule) as [string, any[]][]) {
        for (const file of moduleFiles) {
          switch (moduleName) {
            case 'wallpapers':
              deletePromises.push(adminAPI.deleteWallpaper(file.id));
              break;
            case 'media':
              deletePromises.push(adminAPI.deleteMedia(file.id));
              break;
            case 'sparkle':
              deletePromises.push(adminAPI.deleteSparkle(file.id));
              break;
            case 'banners':
              deletePromises.push(adminAPI.deleteBanner(file.id));
              break;
            case 'photos':
              deletePromises.push(supabase.from('photos').delete().eq('id', file.id).then(() => { }));
              break;
          }
        }
      }

      await Promise.all(deletePromises);

      toast.success(
        `Successfully deleted ${filesToDelete.length} file(s)`,
        {
          description: `Recovered ${formatBytes(filesToDelete.reduce((sum: number, f: any) => sum + f.optimizedSize, 0))} of storage`,
        }
      );

      // Reload data
      await loadAllData();

      // Close modal
      setShowDeleteModal(false);
      setFilesToDelete([]);
      setDeleteCategory(null);
    } catch (error: any) {
      console.error("[Bulk Delete] Error:", error);
      toast.error("Failed to delete files", {
        description: error.message || "An error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Storage Monitor</h2>
        <p className="text-gray-500 mt-1">
          Real-time storage insights and optimization opportunities
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          icon={Database}
          label="Total Storage Used"
          value={formatBytes(totalStorage.totalOptimized)}
          color="blue"
          tooltip="Current total storage consumption across all modules"
        />
        <KPICard
          icon={HardDrive}
          label="Original Size"
          value={formatBytes(totalStorage.totalOriginal)}
          color="gray"
          tooltip="Total size before optimization"
        />
        <KPICard
          icon={Zap}
          label="Storage Saved"
          value={`${totalStorage.percentSaved}%`}
          subValue={formatBytes(totalStorage.totalSaved)}
          color="green"
          tooltip="Space saved through compression and optimization"
        />
        <KPICard
          icon={Database}
          label="Total Files"
          value={totalStorage.totalFiles.toLocaleString()}
          subValue={`${totalStorage.filesWithOptimization} optimized`}
          color="purple"
          tooltip="Total number of files across all modules"
        />
        <KPICard
          icon={TrendingUp}
          label="Growth Rate"
          value={formatBytes(growthRatePerDay)}
          subValue="per day"
          color="orange"
          tooltip="Average storage growth based on last 30 days"
        />
        <KPICard
          icon={AlertCircle}
          label="Storage Status"
          value={
            estimatedDaysToFull === Infinity
              ? "Healthy"
              : estimatedDaysToFull > 365
                ? "> 1 year"
                : estimatedDaysToFull > 30
                  ? `${Math.round(estimatedDaysToFull / 30)} months`
                  : `${estimatedDaysToFull} days`
          }
          subValue={estimatedDaysToFull === Infinity ? "No capacity issues" : "until full"}
          color={estimatedDaysToFull < 90 ? "red" : "green"}
          tooltip={
            estimatedDaysToFull === Infinity
              ? "Storage is healthy with no capacity concerns"
              : `Estimated time until storage capacity is reached: ${estimatedDaysToFull} days`
          }
        />
      </div>

      {/* File Type Breakdown - Interactive Cards */}
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-sm border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              File Type Breakdown
            </h3>
            <p className="text-sm text-gray-500 mt-1">Click a card to explore files by type</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">{totalStorage.totalFiles}</div>
            <div className="text-xs text-gray-500">Total Files</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Filter to show only the 3 main actionable types */}
          {mediaTypeStats
            .filter(stat => ['thumbnail', 'video', 'audio'].includes(stat.type))
            .sort((a, b) => {
              const order = { thumbnail: 0, video: 1, audio: 2 };
              return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
            })
            .map((stat) => (
              <button
                key={stat.type}
                onClick={() => {
                  setSelectedFileType(stat.type as 'thumbnail' | 'video' | 'audio');
                  setShowFileExplorer(true);
                }}
                className="group relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-purple-400 hover:shadow-lg transition-all duration-200 cursor-pointer text-left"
              >
                {/* Hover indicator */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>

                {/* Count */}
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.count}</div>

                {/* Type Label */}
                <div className="text-sm font-medium text-gray-700 capitalize mb-4">
                  {stat.type}{stat.count !== 1 ? 's' : ''}
                </div>

                {/* Stats Grid */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Size</span>
                    <span className="font-semibold text-gray-900">{formatBytes(stat.totalSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Avg Size</span>
                    <span className="font-medium text-gray-700">{formatBytes(stat.avgSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Saved</span>
                    <span className="font-semibold text-green-600">{stat.compressionRatio}%</span>
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-purple-600 font-medium group-hover:text-purple-700">
                    <span>View Files</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Top 20 Accessed Files - Tab-Based with Sorting */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Top 20 Accessed Files</h3>
              <p className="text-sm text-gray-500 mt-1">Most viewed, downloaded, played, shared, and liked content</p>
            </div>
          </div>

          {/* Engagement Type Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-gray-200">
            {[
              { key: 'views', label: 'Most Viewed', icon: Eye },
              { key: 'downloads', label: 'Most Downloaded', icon: Download },
              { key: 'plays', label: 'Most Played', icon: Play },
              { key: 'shares', label: 'Most Shared', icon: Share2 },
              { key: 'likes', label: 'Most Liked', icon: Heart },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveEngagementTab(key as typeof activeEngagementTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 ${activeEngagementTab === key
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-20 px-4 py-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider align-middle">
                  Preview
                </th>
                <th className="w-auto px-4 py-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider align-middle">
                  File
                </th>
                <th className="w-32 px-4 py-3 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider align-middle">
                  Module
                </th>
                <th className="w-28 px-4 py-3 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider align-middle">
                  Size
                </th>
                <th
                  className="w-32 px-4 py-3 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 align-middle"
                  onClick={() => {
                    if (sortBy === 'count') {
                      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortBy('count');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{activeEngagementTab === 'views' ? 'VIEWS' : activeEngagementTab === 'downloads' ? 'DOWNLOADS' : activeEngagementTab === 'plays' ? 'PLAYS' : activeEngagementTab === 'shares' ? 'SHARES' : 'LIKES'}</span>
                    {sortBy === 'count' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                    )}
                  </div>
                </th>
                <th
                  className="w-32 px-4 py-3 text-right text-[9px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 align-middle"
                  onClick={() => {
                    if (sortBy === 'bandwidth') {
                      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortBy('bandwidth');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>BANDWIDTH</span>
                    {sortBy === 'bandwidth' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {topFilesByEngagement[activeEngagementTab].map((file: any) => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {file.thumbnailUrl ? (
                        <ThumbnailImage
                          src={file.thumbnailUrl}
                          alt={file.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Database className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 align-middle">
                    <div className="truncate" title={file.title}>
                      {file.title.length > 40 ? `${file.title.substring(0, 40)}...` : file.title}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize align-middle">{file.moduleName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium align-middle">
                    {formatBytes(file.optimizedSize)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold align-middle">
                    {file[activeEngagementTab]?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right align-middle">
                    {formatBytes((file[activeEngagementTab] || 0) * file.optimizedSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">Module-Wise Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Storage and engagement metrics by module</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Size
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Optimized Size
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saved
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moduleStats.map((module) => (
                <tr key={module.moduleName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{module.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {module.lastUploadDate
                        ? `Last upload: ${new Date(module.lastUploadDate).toLocaleDateString()}`
                        : "No uploads"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {module.totalFiles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatBytes(module.totalOriginalSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatBytes(module.totalOptimizedSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {module.storageSavedPercent}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {module.totalViews.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {module.totalDownloads.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {module.engagementScore.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Media Type Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Media Type Distribution</h3>
          <div className="space-y-3">
            {mediaTypeStats.map((stat) => (
              <div key={stat.type} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-gray-900 capitalize">{stat.type}</span>
                  <span className="text-sm text-gray-500 ml-2">({stat.count} files)</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatBytes(stat.totalSize)}</div>
                  <div className="text-xs text-green-600">{stat.compressionRatio}% saved</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Bandwidth Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Bandwidth Used</span>
              <span className="font-bold text-gray-900">{formatBytes(bandwidthStats.totalBandwidth)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bandwidth Saved</span>
              <span className="font-bold text-green-600">
                {formatBytes(bandwidthStats.totalBandwidthSaved)}
              </span>
            </div>
            <div className="border-t pt-3 mt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">By Module</h4>
              {bandwidthStats.bandwidthByModule.slice(0, 3).map((module) => (
                <div key={module.moduleName} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{module.moduleName}</span>
                  <span className="text-gray-900">{formatBytes(module.bandwidth)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Engagement Quality</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {engagementMetrics.viewToDownloadRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">View → Download</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {engagementMetrics.viewToLikeRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">View → Like</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">
              {engagementMetrics.shareRate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Share Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(engagementMetrics.avgEngagementScore)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Engagement</div>
          </div>
        </div>
      </div>

      {/* Optimization Insights */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">Optimization Opportunities</h3>
          <p className="text-sm text-gray-500 mt-1">Data-driven recommendations for storage optimization</p>
        </div>
        <div className="p-6 space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Everything is optimized!</p>
              <p className="text-sm">No optimization opportunities found.</p>
            </div>
          ) : (
            insights.map((insight, idx) => (
              <InsightCard
                key={idx}
                insight={insight}
                onViewFiles={(files) => {
                  setPreviewFiles(files);
                  setShowFilePreview(true);
                }}
                onTakeAction={(insight) => {
                  if (insight.type === 'zero_engagement' || insight.type === 'low_compression') {
                    // Open delete confirmation
                    setFilesToDelete(insight.affectedFiles);
                    setDeleteCategory('zero'); // Generic delete
                    setShowDeleteModal(true);
                  } else if (insight.type === 'missing_optimization') {
                    // TODO: Implement bulk optimization
                    toast.info("Bulk optimization feature coming soon!");
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Waste Detection */}
      {wasteDetection.totalWastedSpace > 0 && (
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-800">Waste Detection</h3>
              <p className="text-sm text-gray-600">
                Potential {formatBytes(wasteDetection.totalWastedSpace)} can be cleaned up
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-gray-900">
                {wasteDetection.zeroEngagementFiles.length}
              </div>
              <div className="text-xs text-gray-500 mt-1 mb-3">Zero Engagement Files</div>
              {wasteDetection.zeroEngagementFiles.length > 0 && (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    {formatBytes(wasteDetection.zeroEngagementFiles.reduce((sum, f) => sum + f.optimizedSize, 0))} to recover
                  </div>
                  <button
                    onClick={() => handleBulkDelete('zero', wasteDetection.zeroEngagementFiles)}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete All"}
                  </button>
                </>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-gray-900">
                {wasteDetection.lowEngagementLargeFiles.length}
              </div>
              <div className="text-xs text-gray-500 mt-1 mb-3">Large Low-Value Files</div>
              {wasteDetection.lowEngagementLargeFiles.length > 0 && (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    {formatBytes(wasteDetection.lowEngagementLargeFiles.reduce((sum, f) => sum + f.optimizedSize, 0))} to recover
                  </div>
                  <button
                    onClick={() => handleBulkDelete('low_engagement', wasteDetection.lowEngagementLargeFiles)}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete All"}
                  </button>
                </>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-gray-900">
                {wasteDetection.staleBandwidthHogs.length}
              </div>
              <div className="text-xs text-gray-500 mt-1 mb-3">Stale Bandwidth Hogs</div>
              {wasteDetection.staleBandwidthHogs.length > 0 && (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    {formatBytes(wasteDetection.staleBandwidthHogs.reduce((sum, f) => sum + f.optimizedSize, 0))} to recover
                  </div>
                  <button
                    onClick={() => handleBulkDelete('stale', wasteDetection.staleBandwidthHogs)}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete All"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && filesToDelete.length > 0 && (
        <DeleteConfirmationModal
          category={deleteCategory!}
          files={filesToDelete}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setFilesToDelete([]);
            setDeleteCategory(null);
          }}
        />
      )}

      {/* File Preview Modal */}
      {showFilePreview && previewFiles.length > 0 && (
        <FilePreviewModal
          files={previewFiles}
          onClose={() => {
            setShowFilePreview(false);
            setPreviewFiles([]);
          }}
        />
      )}

      {/* File Type Explorer */}
      {showFileExplorer && selectedFileType && (
        <FileTypeExplorer
          fileType={selectedFileType}
          files={filesWithAnalytics}
          onClose={() => {
            setShowFileExplorer(false);
            setSelectedFileType(null);
          }}
        />
      )}
    </div>
  );
}

// KPI Card Component
function KPICard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  tooltip,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  tooltip?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border relative group" title={tooltip}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Insight Card Component
function InsightCard({ insight, onViewFiles, onTakeAction }: {
  insight: OptimizationInsight;
  onViewFiles?: (files: any[]) => void;
  onTakeAction?: (insight: OptimizationInsight) => void;
}) {
  const severityColors = {
    high: "bg-red-50 border-red-200 text-red-900",
    medium: "bg-yellow-50 border-yellow-200 text-yellow-900",
    low: "bg-blue-50 border-blue-200 text-blue-900",
  };

  const severityIcons = {
    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-600",
    low: "bg-blue-100 text-blue-600",
  };

  return (
    <div className={`rounded-lg border p-4 ${severityColors[insight.severity]}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${severityIcons[insight.severity]}`}>
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{insight.title}</h4>
          <p className="text-sm mt-1 opacity-80">{insight.description}</p>
          {insight.potentialSavings && (
            <p className="text-sm font-medium mt-2">
              Potential savings: {formatBytes(insight.potentialSavings)}
            </p>
          )}
          <p className="text-xs mt-2 opacity-70">
            <strong>Action:</strong> {insight.actionable}
          </p>
          <p className="text-xs mt-1 opacity-60">
            {insight.affectedFiles.length} file(s) affected
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => onViewFiles && onViewFiles(insight.affectedFiles)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              View {insight.affectedFiles.length} File{insight.affectedFiles.length > 1 ? 's' : ''}
            </button>

            {(insight.type === 'zero_engagement' || insight.type === 'low_compression') && (
              <button
                onClick={() => onTakeAction && onTakeAction(insight)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Files
              </button>
            )}

            {insight.type === 'missing_optimization' && (
              <button
                onClick={() => onTakeAction && onTakeAction(insight)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                Optimize Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// Append to end of AdminStorageMonitor.tsx file

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  category,
  files,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  category: 'zero' | 'low_engagement' | 'stale';
  files: any[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const categoryNames = {
    zero: "Zero Engagement Files",
    low_engagement: "Large Low-Value Files",
    stale: "Stale Bandwidth Hogs",
  };

  const totalSize = files.reduce((sum: number, f: any) => sum + f.optimizedSize, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Delete {files.length} {categoryNames[category]}
              </p>
            </div>
          </div>
        </div>

        {/* File List with Previews */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900 font-medium">
              ⚠️ This action cannot be undone. {files.length} file{files.length > 1 ? 's' : ''} will be permanently deleted.
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Total space to recover: <strong>{formatBytes(totalSize)}</strong>
            </p>
          </div>

          <div className="space-y-2">
            {files.slice(0, 10).map((file: any) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                  {file.thumbnailUrl ? (
                    <ThumbnailImage
                      src={file.thumbnailUrl}
                      alt={file.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Database className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 capitalize">{file.moduleName}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{formatBytes(file.optimizedSize)}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {file.views} views, {file.downloads} downloads
                    </span>
                  </div>
                </div>

                {/* Delete Icon */}
                <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
              </div>
            ))}

            {files.length > 10 && (
              <div className="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                ...and {files.length - 10} more file{files.length - 10 > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete {files.length} File{files.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
// File Preview Modal Component - Add to end of AdminStorageMonitor.tsx

// File Preview Modal Component
function FilePreviewModal({
  files,
  onClose,
}: {
  files: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Affected Files</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {files.length} file{files.length > 1 ? 's' : ''} in this category
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <AlertCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* File Grid with Previews */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            {files.map((file: any) => (
              <div
                key={file.id}
                className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-200 mb-3 flex items-center justify-center">
                  {file.thumbnailUrl ? (
                    <ThumbnailImage
                      src={file.thumbnailUrl}
                      alt={file.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Database className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <div>
                  <p className="font-medium text-sm text-gray-900 truncate" title={file.title}>
                    {file.title}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span className="capitalize">{file.moduleName}</span>
                    <span>{formatBytes(file.optimizedSize)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {file.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {file.downloads}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
