import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  MousePointer,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Loader2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";

interface BannerAnalytics {
  banner_id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string;
  
  // Date range info
  date_range?: {
    start: string;
    end: string;
    days: number;
  };
  
  // Core metrics (all time)
  total_views: number;
  total_clicks: number;
  
  // Range-specific metrics
  range_views?: number;
  range_clicks?: number;
  
  // Time-based metrics
  views_today: number;
  views_week: number;
  views_month: number;
  clicks_today: number;
  clicks_week: number;
  clicks_month: number;
  
  // Engagement metrics
  ctr: number; // click-through rate (clicks / views)
  engagement_rate: number;
  
  // Time series data
  daily_stats?: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
  
  // Popular times
  peak_hours?: Array<{
    hour: number;
    activity_count: number;
  }>;
  
  // User demographics (if available)
  top_locations?: Array<{
    location: string;
    count: number;
  }>;
  
  // Created/updated
  created_at: string;
  last_interaction?: string;
}

interface BannerAnalyticsDrawerProps {
  bannerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BannerAnalyticsDrawer({
  bannerId,
  isOpen,
  onClose,
}: BannerAnalyticsDrawerProps) {
  const [analytics, setAnalytics] = useState<BannerAnalytics | null>(null);
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
    if (isOpen && bannerId) {
      loadAnalytics();
    }
  }, [isOpen, bannerId, startDate, endDate]);

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
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/banner/${bannerId}?${params}`,
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
      console.error("[BannerAnalytics] Load error:", err);
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
              <h3 className="text-inter-bold-20 text-gray-800">Banner Analytics</h3>
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
              {/* Banner Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <img
                  src={analytics.thumbnail_url || analytics.image_url}
                  alt={analytics.title}
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>

              {/* Date Range Info */}
              {analytics.date_range && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-inter-medium-16">
                      Date Range
                    </span>
                  </div>
                  <p className="text-sm text-blue-800 text-inter-regular-14">
                    {new Date(analytics.date_range.start).toLocaleDateString()} -{" "}
                    {new Date(analytics.date_range.end).toLocaleDateString()}{" "}
                    ({analytics.date_range.days} days)
                  </p>
                </div>
              )}

              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-600 text-inter-regular-14">Total Views</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_views.toLocaleString()}
                  </p>
                  {analytics.range_views !== undefined && (
                    <p className="text-sm text-blue-600 mt-1 text-inter-regular-14">
                      {analytics.range_views.toLocaleString()} in range
                    </p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointer className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-600 text-inter-regular-14">Total Clicks</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-800 text-inter-bold-20">
                    {analytics.total_clicks.toLocaleString()}
                  </p>
                  {analytics.range_clicks !== undefined && (
                    <p className="text-sm text-purple-600 mt-1 text-inter-regular-14">
                      {analytics.range_clicks.toLocaleString()} in range
                    </p>
                  )}
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-700" />
                    <span className="text-green-800 font-medium text-inter-medium-16">
                      Click-Through Rate
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-900 text-inter-bold-20">
                    {analytics.ctr.toFixed(2)}%
                  </p>
                  <p className="text-sm text-green-700 mt-1 text-inter-regular-14">
                    {analytics.total_clicks} clicks / {analytics.total_views} views
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
                    {analytics.engagement_rate.toFixed(2)}%
                  </p>
                  <p className="text-sm text-purple-700 mt-1 text-inter-regular-14">
                    Overall user engagement
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
                      {analytics.views_today} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.clicks_today} clicks
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Week</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.views_week} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.clicks_week} clicks
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 text-inter-regular-14">This Month</p>
                    <p className="text-xl font-bold text-gray-800 text-inter-bold-20">
                      {analytics.views_month} views
                    </p>
                    <p className="text-sm text-gray-600 text-inter-regular-14">
                      {analytics.clicks_month} clicks
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
                        dataKey="views"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Views"
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#a855f7"
                        strokeWidth={2}
                        name="Clicks"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Peak Hours */}
              {analytics.peak_hours && analytics.peak_hours.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 text-inter-semibold-18">
                    Peak Activity Hours
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.peak_hours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(hour) =>
                          `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(hour) =>
                          `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`
                        }
                      />
                      <Bar dataKey="activity_count" fill="#10b981" name="Activity" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Locations */}
              {analytics.top_locations && analytics.top_locations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 text-inter-semibold-18">
                    Top Locations
                  </h3>
                  <div className="space-y-3">
                    {analytics.top_locations.slice(0, 5).map((location, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-800 text-inter-regular-14">
                          {location.location}
                        </span>
                        <span className="font-semibold text-gray-800 text-inter-medium-16">
                          {location.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-inter-regular-14">Created</p>
                    <p className="text-gray-800 font-medium text-inter-medium-16">
                      {new Date(analytics.created_at).toLocaleString()}
                    </p>
                  </div>
                  {analytics.last_interaction && (
                    <div>
                      <p className="text-gray-600 text-inter-regular-14">Last Interaction</p>
                      <p className="text-gray-800 font-medium text-inter-medium-16">
                        {new Date(analytics.last_interaction).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 text-inter-medium-16"
          >
            <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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