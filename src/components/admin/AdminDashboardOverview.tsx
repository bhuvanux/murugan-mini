import React, { useEffect, useState } from "react";
import {
  Image,
  Music,
  Sparkles,
  Camera,
  MessageCircle,
  Users,
  Database,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCw,
  X,
  Eye,
  Download,
  Heart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as adminAPI from "../../utils/adminAPI";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

interface AnalyticsModuleStats {
  total_events: number;
  unique_items: number;
  unique_ips: number;
  events_by_type: Record<string, number>;
}

interface AnalyticsDashboard {
  total_events: number;
  unique_ips: number;
  modules: Record<string, AnalyticsModuleStats>;
}

interface StorageBucketStat {
  name: string;
  size: number;
  count: number;
}

const ANALYTICS_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = bytes / Math.pow(k, i);
  return `${num.toFixed(1)} ${sizes[i]}`;
}

export function AdminDashboardOverview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [sparkles, setSparkles] = useState<any[]>([]);

  const [storageStats, setStorageStats] = useState<StorageBucketStat[]>([]);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);

  const [analyticsDashboard, setAnalyticsDashboard] = useState<AnalyticsDashboard | null>(null);
  const [analyticsInstalled, setAnalyticsInstalled] = useState<boolean | null>(null);

  const [showChecklist, setShowChecklist] = useState(false);

  const modulesChecklist = [
    {
      name: "Wallpapers",
      icon: Image,
      description: "Wallpapers table, analytics and storage",
      available: [
        "Total wallpapers from wallpapers table",
        "Views / downloads / likes from counters or analytics",
        "Storage usage slice from storage stats",
      ],
      planned: [
        "Trend vs last week / month for wallpaper engagement",
        "Analytics-backed top wallpapers widget",
      ],
    },
    {
      name: "Media",
      icon: Music,
      description: "Audio and video media manager",
      available: [
        "Total media items (audio + video)",
        "Total plays and downloads from media manager / analytics",
        "Storage usage slice from storage stats",
      ],
      planned: [
        "Top media items table on dashboard",
        "Module-level engagement slice in analytics chart",
      ],
    },
    {
      name: "Sparkle",
      icon: Sparkles,
      description: "Short-form content and articles",
      available: [
        "Total sparkles from database",
        "Total views and likes from analytics or counters",
        "Storage usage slice from storage stats",
      ],
      planned: [
        "Top sparkles table on dashboard",
        "Module-level engagement slice in analytics chart",
      ],
    },
    {
      name: "Photos",
      icon: Camera,
      description: "Photo uploads and gallery",
      available: [
        "Upload pipeline via photo upload endpoint",
        "Storage usage slice for photos bucket",
      ],
      planned: [
        "Photos CRUD and total photos metric",
        "Photo engagement analytics (views / likes / downloads)",
      ],
    },
    {
      name: "Ask Gugan AI",
      icon: MessageCircle,
      description: "Chat analytics and response time",
      available: [
        "Frontend tracking helpers for conversations and messages",
        "Unified analytics schema for ask_gugan events",
      ],
      planned: [
        "Total chats metric on dashboard",
        "AI response time time-series chart",
        "DAU / MAU for Ask Gugan",
      ],
    },
    {
      name: "Users & Activity",
      icon: Users,
      description: "Active users and admin usage",
      available: [
        "IP-based tracking for all content modules",
        "App-level tracking helpers (app open, login, logout)",
      ],
      planned: [
        "DAU / MAU cards (daily and monthly active users)",
        "Daily active users time-series chart",
      ],
    },
    {
      name: "Storage",
      icon: Database,
      description: "Supabase storage usage",
      available: [
        "Per-bucket storage stats (size and file count)",
        "Storage monitor page with pie chart and breakdown",
      ],
      planned: [
        "Condensed storage widget on dashboard using same stats",
        "Automatic optimization suggestions",
      ],
    },
  ];

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    try {
      const [wallpapersResult, mediaResult, sparklesResult, storageResult] = await Promise.all([
        adminAPI.getWallpapers(),
        adminAPI.getMedia(),
        adminAPI.getSparkles(),
        adminAPI.getStorageStats(),
      ]);

      if (Array.isArray(wallpapersResult?.data)) {
        setWallpapers(wallpapersResult.data);
      } else {
        setWallpapers([]);
      }

      if (Array.isArray(mediaResult?.data)) {
        setMediaItems(mediaResult.data);
      } else {
        setMediaItems([]);
      }

      if (Array.isArray(sparklesResult?.data)) {
        setSparkles(sparklesResult.data);
      } else {
        setSparkles([]);
      }

      if (storageResult && Array.isArray(storageResult.data)) {
        const buckets: StorageBucketStat[] = storageResult.data;
        setStorageStats(buckets);
        const totalBytes = buckets.reduce((sum, item) => sum + (item.size || 0), 0);
        setTotalStorageBytes(totalBytes);
      } else {
        setStorageStats([]);
        setTotalStorageBytes(0);
      }

      try {
        const statusRes = await fetch(`${ANALYTICS_BASE}/api/analytics/admin/status`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const statusJson = await statusRes.json();
        const installed = !!statusJson.status?.installed;
        setAnalyticsInstalled(installed);

        if (installed) {
          const dashRes = await fetch(`${ANALYTICS_BASE}/api/analytics/admin/dashboard`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          const dashJson = await dashRes.json();
          if (dashJson.success && dashJson.dashboard) {
            setAnalyticsDashboard(dashJson.dashboard as AnalyticsDashboard);
          } else {
            setAnalyticsDashboard(null);
          }
        } else {
          setAnalyticsDashboard(null);
        }
      } catch (analyticsError) {
        console.error("Analytics load error", analyticsError);
        setAnalyticsDashboard(null);
      }
    } catch (err: any) {
      console.error("Dashboard load error", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const wallpaperCount = wallpapers.length;
  const mediaCount = mediaItems.length;
  const sparkleCount = sparkles.length;

  const storageChartData = storageStats
    .map((item) => {
      const colors: Record<string, string> = {
        wallpapers: "#3b82f6",
        banners: "#14b8a6",
        media: "#a855f7",
        photos: "#ec4899",
        sparkle: "#eab308",
      };
      const sizeGB = item.size / (1024 * 1024 * 1024);
      return {
        name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        value: sizeGB,
        color: colors[item.name] || "#9ca3af",
      };
    })
    .filter((d) => d.value > 0);

  const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024);

  const engagementData = analyticsDashboard
    ? Object.entries(analyticsDashboard.modules || {}).map(([moduleName, stats]) => {
        const events = stats.events_by_type || {};
        return {
          module: moduleName,
          likes: events.like || 0,
          shares: events.share || 0,
          downloads: events.download || 0,
        };
      }).filter((row) => row.likes || row.shares || row.downloads)
    : [];

  const topWallpapers = wallpapers
    .slice()
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  const statCards: {
    label: string;
    value: string;
    icon: React.ComponentType<any>;
    color: string;
  }[] = [
    {
      label: "Wallpapers",
      value: formatNumber(wallpaperCount),
      icon: Image,
      color: "bg-blue-500",
    },
    {
      label: "Media Items",
      value: formatNumber(mediaCount),
      icon: Music,
      color: "bg-purple-500",
    },
    {
      label: "Sparkles",
      value: formatNumber(sparkleCount),
      icon: Sparkles,
      color: "bg-yellow-500",
    },
    {
      label: "Total Storage",
      value: totalStorageBytes > 0 ? formatBytes(totalStorageBytes) : "0 B",
      icon: Database,
      color: "bg-emerald-500",
    },
  ];

  if (analyticsDashboard) {
    statCards.push(
      {
        label: "Analytics Events",
        value: formatNumber(analyticsDashboard.total_events),
        icon: MessageCircle,
        color: "bg-teal-500",
      },
      {
        label: "Unique Visitors (IPs)",
        value: formatNumber(analyticsDashboard.unique_ips),
        icon: Users,
        color: "bg-indigo-500",
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Overview of content, storage and analytics, using live data where available.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowChecklist(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <ListChecks className="w-4 h-4" />
            <span>Checklist</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Engagement by Module</h3>
          {analyticsInstalled === false && (
            <p className="text-sm text-gray-500">
              Analytics system is not installed. Run the migration SQL to enable analytics charts.
            </p>
          )}
          {analyticsInstalled && engagementData.length === 0 && (
            <p className="text-sm text-gray-500">No analytics events recorded yet.</p>
          )}
          {analyticsInstalled && engagementData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="module" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                <Bar dataKey="shares" fill="#3b82f6" name="Shares" />
                <Bar dataKey="downloads" fill="#10b981" name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Storage Usage {totalStorageBytes > 0 ? `(${totalStorageGB.toFixed(1)} GB)` : ""}
          </h3>
          {storageChartData.length === 0 ? (
            <p className="text-sm text-gray-500">No storage data available yet.</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={storageChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {storageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Top Performing Wallpapers</h3>
          <p className="text-xs text-gray-500 mt-1">
            Based on view counts from the wallpapers table.
          </p>
        </div>
        <div className="overflow-x-auto">
          {topWallpapers.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No wallpapers found.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Eye className="w-4 h-4 inline mr-1" />
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Download className="w-4 h-4 inline mr-1" />
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Heart className="w-4 h-4 inline mr-1" />
                    Likes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topWallpapers.map((wallpaper: any, index: number) => (
                  <tr key={wallpaper.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-yellow-500"
                              : index === 1
                              ? "bg-gray-400"
                              : index === 2
                              ? "bg-orange-600"
                              : "bg-gray-300"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wallpaper.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(wallpaper.view_count || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(wallpaper.download_count || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(wallpaper.like_count || 0)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showChecklist && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowChecklist(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Dashboard Wiring Checklist</h3>
                <p className="text-xs text-gray-500">
                  See which metrics are live and which are still planned.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadDashboardData}
                  disabled={loading}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowChecklist(false)}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {modulesChecklist.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.name}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{module.name}</h4>
                          <p className="text-xs text-gray-500">{module.description}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                        {module.available.length} wired  b7 {module.planned.length} planned
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-2xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                          Available now
                        </p>
                        <ul className="space-y-1.5">
                          {module.available.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                          {module.available.length === 0 && (
                            <li className="flex items-start gap-2 text-sm text-gray-500">
                              <CheckCircle2 className="w-4 h-4 text-gray-300 mt-0.5" />
                              <span>No metrics wired yet.</span>
                            </li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-2xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                          Planned
                        </p>
                        <ul className="space-y-1.5">
                          {module.planned.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                          {module.planned.length === 0 && (
                            <li className="flex items-start gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4 text-gray-300 mt-0.5" />
                              <span>No pending metrics for this module.</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
