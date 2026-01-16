import React, { useState, useEffect } from "react";
import { X, Loader2, Eye, MousePointerClick, Calendar } from "lucide-react";
import * as adminAPI from "../../utils/adminAPI";

interface NotificationAnalyticsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    notificationId: string | null;
}

export function NotificationAnalyticsDrawer({
    isOpen,
    onClose,
    notificationId,
}: NotificationAnalyticsDrawerProps) {
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && notificationId) {
            loadAnalytics();
        }
    }, [isOpen, notificationId]);

    const loadAnalytics = async () => {
        if (!notificationId) return;

        setIsLoading(true);
        try {
            const response = await adminAPI.getNotificationAnalytics(notificationId, null, null);
            if (response.success && response.data) {
                setAnalytics(response.data);
            }
        } catch (error: any) {
            console.error("Failed to load analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-end z-50">
            <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                    <h3 className="text-lg font-semibold text-gray-800">Notification Analytics</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
                            <p className="text-gray-600">Loading analytics...</p>
                        </div>
                    ) : analytics ? (
                        <div className="space-y-6">
                            {/* Notification Info */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">{analytics.title}</h4>
                                <div className="flex gap-2">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${analytics.type === "important"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                    >
                                        {analytics.type}
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${analytics.status === "sent"
                                                ? "bg-green-100 text-green-700"
                                                : analytics.status === "scheduled"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                    >
                                        {analytics.status}
                                    </span>
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye className="w-4 h-4 text-blue-600" />
                                        <p className="text-sm text-blue-600 font-medium">Total Views</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {analytics.total_views || 0}
                                    </p>
                                </div>

                                <div className="bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MousePointerClick className="w-4 h-4 text-green-600" />
                                        <p className="text-sm text-green-600 font-medium">Total Opens</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">
                                        {analytics.total_opens || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Open Rate */}
                            <div className="bg-purple-50 rounded-lg p-4">
                                <p className="text-sm text-purple-600 font-medium mb-2">Open Rate</p>
                                <p className="text-3xl font-bold text-purple-900">
                                    {analytics.open_rate || 0}%
                                </p>
                                <div className="mt-3 bg-purple-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-purple-600 h-full transition-all duration-500"
                                        style={{ width: `${analytics.open_rate || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Timestamps */}
                            {analytics.sent_at && (
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Sent: {new Date(analytics.sent_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {analytics.scheduled_at && analytics.status === "scheduled" && (
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Scheduled: {new Date(analytics.scheduled_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center">No analytics data available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
