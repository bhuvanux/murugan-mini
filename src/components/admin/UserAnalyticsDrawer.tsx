import React, { useState, useEffect } from "react";
import {
    X,
    User,
    Calendar,
    Clock,
    Smartphone,
    MapPin,
    Activity,
    Heart,
    Download,
    Eye,
    Loader2,
    BarChart3,
    TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserAnalytics {
    user_id: string;
    full_name: string;
    phone: string;
    city: string;
    created_at: string;
    last_login_at?: string;

    // Engagement metrics
    total_sessions: number;
    total_views: number;
    total_downloads: number;
    total_likes: number;
    avg_session_duration: number;

    // Recent activity
    recent_activity?: Array<{
        event_type: string;
        content_type: string;
        content_title?: string;
        created_at: string;
    }>;

    // Device info
    device_id?: string;
    last_device?: string;
    phone_type?: string;
    android_version?: string;
}

interface UserAnalyticsDrawerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function UserAnalyticsDrawer({
    userId,
    isOpen,
    onClose,
}: UserAnalyticsDrawerProps) {
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            loadAnalytics();
        }
    }, [isOpen, userId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // Import supabase client
            const { supabase } = await import('../../utils/supabase/client');

            // Fetch user data from users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!userData) throw new Error('User not found');

            // Fetch content analytics (views, likes, etc.)
            const { data: contentEvents, error: contentError } = await supabase
                .from('analytics_tracking')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (contentError) console.error('Content analytics error:', contentError);

            // Fetch auth/session analytics (logins, heartbeats for time spent)
            const { data: authEvents, error: authError } = await supabase
                .from('auth_events')
                .select('*')
                .eq('user_id', userId)
                .order('event_time', { ascending: false });

            if (authError) console.error('Auth analytics error:', authError);

            // Calculate metrics
            const views = contentEvents?.filter(e => e.event_type === 'view' || e.event_type === 'play' || e.event_type === 'play_video_inline').length || 0;
            const downloads = contentEvents?.filter(e => e.event_type === 'download').length || 0;
            const likes = contentEvents?.filter(e => e.event_type === 'like').length || 0;

            // Calculate Total Time Spent from heartbeats (assuming 30s per heartbeat)
            // Or fallback to checking session start/end if available
            const heartbeats = authEvents?.filter(e => e.event_type === 'auth_heartbeat').length || 0;
            const totalMinutes = Math.round((heartbeats * 30) / 60); // 30s interval

            // Sessions (Login successes)
            const sessions = authEvents?.filter(e => e.event_type === 'auth_login_success' || e.event_type === 'auth_session_started').length || 0;


            // Get recent activity (Merge and sort)
            const allActivity = [
                ...(contentEvents || []).map(e => ({
                    event_type: e.event_type,
                    content_type: e.module_name || 'content',
                    content_title: e.item_id || '',
                    created_at: e.created_at,
                    metadata: e.metadata
                })),
                ...(authEvents || []).filter(e => e.event_type !== 'auth_heartbeat').map(e => ({
                    event_type: e.event_type.replace('auth_', ''),
                    content_type: 'system',
                    content_title: e.metadata?.method || '',
                    created_at: e.event_time,
                    metadata: e.metadata
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 20);

            // Get device info from latest Auth Event (usually has richer metadata) or Analytics Event
            // Prefer Auth Event for device info as it often captures login context
            const latestAuth = authEvents?.find(e => e.metadata?.device_model || e.user_agent);
            const latestContent = contentEvents?.[0];

            let phoneType = 'Unknown';
            let androidVersion = 'Unknown';
            let deviceId = userData.device_id || '';

            // Helper to parse UA
            const parseUA = (ua: string) => {
                const modelMatch = ua.match(/\(([^;]+);/);
                const model = modelMatch ? modelMatch[1].trim() : 'Unknown';
                const androidMatch = ua.match(/Android\s+([0-9.]+)/);
                const version = androidMatch ? `Android ${androidMatch[1]}` : 'Unknown';
                return { model, version };
            };

            // Try Auth Metadata first (cleaner)
            if (latestAuth?.metadata?.device_model) {
                phoneType = latestAuth.metadata.device_model;
                androidVersion = latestAuth.metadata.os_version || 'Unknown';
            } else if (latestAuth?.user_agent) {
                const { model, version } = parseUA(latestAuth.user_agent);
                if (model !== 'Unknown') phoneType = model;
                if (version !== 'Unknown') androidVersion = version;
            } else if (latestContent?.metadata?.device_model) {
                // Fallback to content metadata
                phoneType = latestContent.metadata.device_model;
            }

            const deviceInfo = phoneType !== 'Unknown'
                ? `${phoneType} • ${androidVersion}`
                : 'No device info';

            setAnalytics({
                user_id: userId,
                full_name: userData.full_name || userData.name || 'Anonymous',
                phone: userData.phone || 'No phone',
                city: userData.city || 'Unknown',
                created_at: userData.created_at,
                last_login_at: userData.last_login_at,
                total_sessions: sessions,
                total_views: views,
                total_downloads: downloads,
                total_likes: likes,
                avg_session_duration: totalMinutes, // Using this field for Total Time Spent (in minutes)
                recent_activity: allActivity,
                device_id: deviceId,
                last_device: deviceInfo,
                phone_type: phoneType,
                android_version: androidVersion
            });

            setLoading(false);
        } catch (error: any) {
            console.error('Failed to load user analytics:', error);
            setError(error.message);
            toast.error('Failed to load user analytics');
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
                <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">User Analytics</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">Loading user data...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-medium">Error loading analytics</p>
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
                            {/* User Profile Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-black">
                                        {analytics.full_name ? analytics.full_name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">
                                            {analytics.full_name}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Smartphone className="w-3 h-3" /> {analytics.phone}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {analytics.city}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-100">
                                    <div>
                                        <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Joined</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {format(new Date(analytics.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Last Active</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {analytics.last_login_at
                                                ? format(new Date(analytics.last_login_at), 'MMM d, h:mm a')
                                                : 'Never'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye className="w-4 h-4 text-blue-600" />
                                        <p className="text-sm text-blue-600 font-medium">Total Views</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{analytics.total_views}</p>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Download className="w-4 h-4 text-green-600" />
                                        <p className="text-sm text-green-600 font-medium">Downloads</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">{analytics.total_downloads}</p>
                                </div>

                                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Heart className="w-4 h-4 text-pink-600" />
                                        <p className="text-sm text-pink-600 font-medium">Likes</p>
                                    </div>
                                    <p className="text-2xl font-bold text-pink-900">{analytics.total_likes}</p>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="w-4 h-4 text-purple-600" />
                                        <p className="text-sm text-purple-600 font-medium">Sessions</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">{analytics.total_sessions}</p>
                                </div>
                            </div>

                            {/* Total Time Spent */}
                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                    <p className="text-sm text-emerald-600 font-medium">Total Time Spent</p>
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-bold text-emerald-900">
                                        {Math.floor(analytics.avg_session_duration / 60)}h {analytics.avg_session_duration % 60}m
                                    </p>
                                    <p className="text-sm text-emerald-700 mb-1.5 font-medium opacity-80">
                                        approx based on activity
                                    </p>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <h4 className="text-base font-bold text-gray-900">Recent Activity</h4>
                                </div>
                                {analytics.recent_activity && analytics.recent_activity.length > 0 ? (
                                    <div className="space-y-3">
                                        {analytics.recent_activity.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {activity.event_type} • {activity.content_type}
                                                    </p>
                                                    {activity.content_title && (
                                                        <p className="text-xs text-gray-600 mt-0.5">{activity.content_title}</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No recent activity
                                    </div>
                                )}
                            </div>

                            {/* Device Info - only show if we have real device data */}
                            {(
                                (analytics.phone_type && analytics.phone_type !== 'Unknown') ||
                                (analytics.android_version && analytics.android_version !== 'Unknown') ||
                                analytics.device_id
                            ) && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Smartphone className="w-4 h-4 text-gray-600" />
                                            <h4 className="text-base font-bold text-gray-900">Device Info</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {analytics.phone_type && analytics.phone_type !== 'Unknown' && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Phone Model</p>
                                                    <p className="text-sm text-gray-900 font-semibold">{analytics.phone_type}</p>
                                                </div>
                                            )}
                                            {analytics.android_version && analytics.android_version !== 'Unknown' && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">OS Version</p>
                                                    <p className="text-sm text-gray-900 font-semibold">{analytics.android_version}</p>
                                                </div>
                                            )}
                                            {analytics.device_id && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Device ID</p>
                                                    <p className="text-xs font-mono text-gray-600 mt-1 break-all">
                                                        {analytics.device_id}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </>
                    ) : null}
                </div>
            </div>
        </>
    );
}
