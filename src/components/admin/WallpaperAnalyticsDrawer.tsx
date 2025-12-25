import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Download,
  Heart,
  Share2,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Loader2,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { DateRangeFilter, DateRangePreset } from "./DateRangeFilter";

interface WallpaperAnalytics {
  wallpaper_id: string;
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
  total_downloads: number;
  total_likes: number;
  total_shares: number;
  
  // Range-specific metrics
  range_views?: number;
  range_downloads?: number;
  range_likes?: number;
  range_shares?: number;
  
  // Time-based metrics
  views_today: number;
  views_week: number;
  views_month: number;
  downloads_today: number;
  downloads_week: number;
  downloads_month: number;
  
  // Engagement metrics
  conversion_rate: number; // downloads / views
  engagement_rate: number; // (likes + shares) / views
  
  // Time series data
  daily_stats?: Array<{
    date: string;
    views: number;
    downloads: number;
    likes: number;
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

interface WallpaperAnalyticsDrawerProps {
  wallpaperId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WallpaperAnalyticsDrawer({
  wallpaperId,
  isOpen,
  onClose,
}: WallpaperAnalyticsDrawerProps) {
  const [analytics, setAnalytics] = useState<WallpaperAnalytics | null>(null);
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
    if (isOpen && wallpaperId) {
      loadAnalytics();
    }
  }, [isOpen, wallpaperId, startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with date range params if provided
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpapers/${wallpaperId}/analytics`;
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate.toISOString());
      if (endDate) params.append('end_date', endDate.toISOString());
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load analytics');
      }

      setAnalytics(result.data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      setError(error.message);
      toast.error('Failed to load analytics');
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
              <h3 className="text-inter-bold-20 text-gray-800">Wallpaper Analytics</h3>
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                <p className="text-gray-600 text-inter-regular-14">Loading analytics...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-inter-medium-16">Error loading analytics</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={loadAnalytics}
                className="mt-3 text-sm text-red-600 underline"
              >
                Try again
              </button>
            </div>
          ) : analytics ? (
            <>
              {/* Wallpaper Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={analytics.thumbnail_url || analytics.image_url}
                    alt={analytics.title}
                    className="w-24 h-40 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-inter-semibold-16 text-gray-800 mb-1">
                      {analytics.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Created {new Date(analytics.created_at).toLocaleDateString()}
                    </p>
                    {analytics.last_interaction && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last activity {new Date(analytics.last_interaction).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Range Info */}
              {analytics.date_range && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">
                      Showing data from {new Date(analytics.date_range.start).toLocaleDateString()} to {new Date(analytics.date_range.end).toLocaleDateString()} ({analytics.date_range.days} days)
                    </p>
                  </div>
                </div>
              )}

              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Views */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">Views</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {(analytics.range_views ?? analytics.total_views).toLocaleString()}
                  </p>
                  {analytics.range_views !== undefined ? (
                    <p className="text-xs text-blue-600 mt-1">In selected range</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-xs text-blue-700">
                      <p>Today: {analytics.views_today}</p>
                      <p>This Week: {analytics.views_week}</p>
                      <p>This Month: {analytics.views_month}</p>
                    </div>
                  )}
                </div>

                {/* Downloads */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">Downloads</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {(analytics.range_downloads ?? analytics.total_downloads).toLocaleString()}
                  </p>
                  {analytics.range_downloads !== undefined ? (
                    <p className="text-xs text-green-600 mt-1">In selected range</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-xs text-green-700">
                      <p>Today: {analytics.downloads_today}</p>
                      <p>This Week: {analytics.downloads_week}</p>
                      <p>This Month: {analytics.downloads_month}</p>
                    </div>
                  )}
                </div>

                {/* Likes */}
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <p className="text-sm text-pink-600 font-medium">Likes</p>
                  </div>
                  <p className="text-2xl font-bold text-pink-900">
                    {(analytics.range_likes ?? analytics.total_likes).toLocaleString()}
                  </p>
                  {analytics.range_likes !== undefined && (
                    <p className="text-xs text-pink-600 mt-1">In selected range</p>
                  )}
                </div>

                {/* Shares */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4 text-purple-600" />
                    <p className="text-sm text-purple-600 font-medium">Shares</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {(analytics.range_shares ?? analytics.total_shares).toLocaleString()}
                  </p>
                  {analytics.range_shares !== undefined && (
                    <p className="text-xs text-purple-600 mt-1">In selected range</p>
                  )}
                </div>
              </div>

              {/* Engagement Rates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-600 font-medium">Conversion Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{analytics.conversion_rate}%</p>
                  <p className="text-xs text-green-700 mt-1">Downloads ÷ Views</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-600 font-medium">Engagement Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{analytics.engagement_rate}%</p>
                  <p className="text-xs text-blue-700 mt-1">(Likes + Shares) ÷ Views</p>
                </div>
              </div>

              {/* Daily Stats Chart */}
              {analytics.daily_stats && analytics.daily_stats.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h4 className="text-inter-semibold-16 text-gray-800">Last 7 Days</h4>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.daily_stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#0d5e38" strokeWidth={2} />
                      <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Peak Hours */}
              {analytics.peak_hours && analytics.peak_hours.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <h4 className="text-inter-semibold-16 text-gray-800">Peak Activity Hours</h4>
                  </div>
                  <div className="space-y-2">
                    {analytics.peak_hours.map((peak, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {peak.hour === 0 ? '12 AM' : peak.hour < 12 ? `${peak.hour} AM` : peak.hour === 12 ? '12 PM' : `${peak.hour - 12} PM`}
                        </span>
                        <div className="flex items-center gap-2 flex-1 mx-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${(peak.activity_count / (analytics.peak_hours?.[0]?.activity_count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-800 w-12 text-right">
                            {peak.activity_count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Locations */}
              {analytics.top_locations && analytics.top_locations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-600" />
                    <h4 className="text-inter-semibold-16 text-gray-800">Top Locations</h4>
                  </div>
                  <div className="space-y-2">
                    {analytics.top_locations.map((location, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{location.location}</span>
                        <span className="text-sm font-medium text-gray-800">{location.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {(!analytics.daily_stats || analytics.daily_stats.length === 0) && 
               (!analytics.peak_hours || analytics.peak_hours.length === 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-inter-medium-16">No detailed analytics yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Analytics data will appear as users interact with this wallpaper
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
