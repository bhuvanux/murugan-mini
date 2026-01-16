import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Download,
  Heart,
  Share2,
  Play,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Loader2,
  BarChart3,
  FolderInput,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";

interface MediaAnalytics {
  media_id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string;

  date_range?: {
    start: string;
    end: string;
    days: number;
  };

  // Core metrics
  total_plays: number;
  total_downloads: number;
  total_likes: number;
  total_shares: number;
  total_add_to_playlist: number;
  total_youtube_opens: number;

  // Range-specific metrics
  range_plays?: number;
  range_downloads?: number;
  range_likes?: number;
  range_shares?: number;
  range_add_to_playlist?: number;
  range_youtube_opens?: number;

  // Time-based metrics
  plays_today: number;
  plays_week: number;
  plays_month: number;
  downloads_today: number;
  downloads_week: number;
  downloads_month: number;

  // Engagement metrics
  completion_rate: number;
  engagement_rate: number;

  // Time series data
  daily_stats?: Array<{
    date: string;
    plays: number;
    downloads: number;
    likes: number;
    shares: number;
  }>;

  peak_hours?: Array<{
    hour: number;
    activity_count: number;
  }>;

  top_locations?: Array<{
    location: string;
    count: number;
  }>;

  created_at: string;
  last_interaction?: string;
}

interface MediaAnalyticsDrawerProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaAnalyticsDrawer({
  mediaId,
  isOpen,
  onClose,
}: MediaAnalyticsDrawerProps) {
  const [analytics, setAnalytics] = useState<MediaAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());
  const [datePreset, setDatePreset] = useState<DateRangePreset>("month");

  useEffect(() => {
    if (isOpen && mediaId) {
      loadAnalytics();
    }
  }, [isOpen, mediaId, startDate, endDate]);

  const loadAnalytics = async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

      const response = await fetch(
        `${baseUrl}/api/analytics/media-details/${mediaId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
          cache: "no-store",
        }
      );

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}`);
        }
        setAnalytics(result.data);
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text || "Unknown error"}`);
        }
        throw new Error("Received non-JSON response from server");
      }
    } catch (err: any) {
      console.error("[MediaAnalytics] Load error:", err);
      setError(err.message);
      toast.error("Failed to load analytics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-inter-bold-20 text-gray-800">Media Analytics</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
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
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && !analytics ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 text-inter-regular-14">Loading analytics...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 text-inter-regular-14">{error}</p>
              <button
                onClick={loadAnalytics}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-inter-medium-16"
              >
                Retry
              </button>
            </div>
          ) : analytics ? (
            <>
              {/* Core Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-5 h-5 text-green-600" />
                    <span className="text-gray-600 text-inter-regular-14">Total Plays</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_plays?.toLocaleString() || "0"}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-600 text-inter-regular-14">Downloads</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_downloads?.toLocaleString() || "0"}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    <span className="text-gray-600 text-inter-regular-14">Likes</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_likes?.toLocaleString() || "0"}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-600 text-inter-regular-14">Shares</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_shares?.toLocaleString() || "0"}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderInput className="w-5 h-5 text-orange-600" />
                    <span className="text-gray-600 text-inter-regular-14">Playlist Adds</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_add_to_playlist?.toLocaleString() || "0"}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-5 h-5 text-red-500" />
                    <span className="text-gray-600 text-inter-regular-14">YouTube Opens</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_youtube_opens?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-700" />
                    <span className="text-green-800 font-medium text-inter-medium-16">
                      Completion Rate
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-900 text-inter-bold-20">
                    {(analytics.completion_rate || 0).toFixed(1)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-700" />
                    <span className="text-purple-800 font-medium text-inter-medium-16">
                      Engagement Rate
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900 text-inter-bold-20">
                    {(analytics.engagement_rate || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Time-Based Metrics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-inter-semibold-18">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Time-Based Performance
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">Today</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.plays_today || 0} plays
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Week</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.plays_week || 0} plays
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Month</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.plays_month || 0} plays
                    </p>
                  </div>
                </div>
              </div>

              {/* Daily Stats Chart */}
              {analytics.daily_stats && analytics.daily_stats.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 text-inter-semibold-18">
                    Daily Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.daily_stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) =>
                          new Date(date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="plays"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Plays"
                      />
                      <Line
                        type="monotone"
                        dataKey="downloads"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Downloads"
                      />
                      <Line
                        type="monotone"
                        dataKey="likes"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Likes"
                      />
                      <Line
                        type="monotone"
                        dataKey="shares"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="Shares"
                      />
                      <Line
                        type="monotone"
                        dataKey="playlist_adds"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        name="Playlist Adds"
                      />
                      <Line
                        type="monotone"
                        dataKey="youtube_opens"
                        stroke="#dc2626"
                        strokeWidth={2}
                        name="YouTube Opens"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}