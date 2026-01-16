import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Heart,
  Share2,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Loader2,
  BarChart3,
  MessageCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";

interface SparkleAnalytics {
  sparkle_id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string;

  date_range?: {
    start: string;
    end: string;
    days: number;
  };

  // Core metrics
  total_views: number;
  total_likes: number;
  total_shares: number;
  total_downloads: number;
  total_comments: number;

  // Range-specific metrics
  range_views?: number;
  range_likes?: number;
  range_shares?: number;
  range_downloads?: number;

  // Time-based metrics
  views_today: number;
  views_week: number;
  views_month: number;
  likes_today: number;
  likes_week: number;
  likes_month: number;
  downloads_today: number;
  downloads_week: number;
  downloads_month: number;

  // Engagement metrics
  engagement_rate: number;
  download_rate: number;
  virality_score: number;

  // Time series data
  daily_stats?: Array<{
    date: string;
    views: number;
    likes: number;
    shares: number;
    downloads: number;
  }>;

  created_at: string;
  last_interaction?: string;
}

interface SparkleAnalyticsDrawerProps {
  sparkleId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SparkleAnalyticsDrawer({
  sparkleId,
  isOpen,
  onClose,
}: SparkleAnalyticsDrawerProps) {
  const [analytics, setAnalytics] = useState<SparkleAnalytics | null>(null);
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
    if (isOpen && sparkleId) {
      loadAnalytics();
    }
  }, [isOpen, sparkleId, startDate, endDate]);

  const loadAnalytics = async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/sparkle/${sparkleId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load analytics");
      }

      if (result.success) {
        setAnalytics(result.data);
      } else {
        throw new Error(result.error || "Failed to load analytics");
      }
    } catch (err: any) {
      console.error("[SparkleAnalytics] Load error:", err);
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
      <div className="fixed right-0 top-0 h-full w-[45vw] min-w-[500px] bg-white shadow-2xl z-50 overflow-y-auto border-l border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-inter-bold-24 text-gray-800">Sparkle Analytics</h3>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <Eye className="w-7 h-7 text-blue-600" />
                    </div>
                    <span className="text-gray-500 font-medium text-inter-medium-14">Views</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 text-inter-bold-24">
                    {(analytics.total_views || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-red-50 rounded-xl">
                      <Heart className="w-7 h-7 text-red-600" />
                    </div>
                    <span className="text-gray-500 font-medium text-inter-medium-14">Likes</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 text-inter-bold-24">
                    {(analytics.total_likes || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-purple-50 rounded-xl">
                      <Share2 className="w-7 h-7 text-purple-600" />
                    </div>
                    <span className="text-gray-500 font-medium text-inter-medium-14">Shares</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 text-inter-bold-24">
                    {(analytics.total_shares || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-green-50 rounded-xl">
                      <Download className="w-7 h-7 text-green-600" />
                    </div>
                    <span className="text-gray-500 font-medium text-inter-medium-14">Downloads</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 text-inter-bold-24">
                    {(analytics.total_downloads || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-700" />
                    </div>
                    <span className="text-green-800 font-bold text-inter-bold-14 uppercase tracking-wider">
                      Engagement Rate
                    </span>
                  </div>
                  <p className="text-3xl font-black text-green-900 text-inter-bold-24">
                    {(analytics.engagement_rate || 0).toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-6 h-6 text-purple-700" />
                    </div>
                    <span className="text-purple-800 font-bold text-inter-bold-14 uppercase tracking-wider">
                      Virality Score
                    </span>
                  </div>
                  <p className="text-3xl font-black text-purple-900 text-inter-bold-24">
                    {(analytics.virality_score || 0).toFixed(1)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Download className="w-6 h-6 text-blue-700" />
                    </div>
                    <span className="text-blue-800 font-bold text-inter-bold-14 uppercase tracking-wider">
                      Download Rate
                    </span>
                  </div>
                  <p className="text-3xl font-black text-blue-900 text-inter-bold-24">
                    {(analytics.download_rate || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Time-Based Metrics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-inter-bold-18">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="w-6 h-6 text-gray-600" />
                  </div>
                  Time-Based Performance
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">Today</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.views_today || 0} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.likes_today || 0}L • {analytics.downloads_today || 0}D
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Week</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.views_week || 0} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.likes_week || 0}L • {analytics.downloads_week || 0}D
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Month</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.views_month || 0} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.likes_month || 0}L • {analytics.downloads_month || 0}D
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
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) => {
                          const d = new Date(date);
                          return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleDateString();
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Views"
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
                        stroke="#a855f7"
                        strokeWidth={2}
                        name="Shares"
                      />
                      <Line
                        type="monotone"
                        dataKey="downloads"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Downloads"
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