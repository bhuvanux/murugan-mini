import React, { useState, useEffect } from "react";
import {
    Bell,
    Plus,
    RefreshCw,
    Loader2,
    Eye,
    Trash2,
    Send,
    Calendar as CalendarIcon,
    Clock,
    BarChart3,
    AlertCircle,
    CheckCircle,
    Edit,
} from "lucide-react";
import { toast } from "sonner";
import * as adminAPI from "../../utils/adminAPI";
import { supabase } from "../../utils/supabase/client";
import { format } from "date-fns";
import { AddNotificationModal } from "./AddNotificationModal";
import { NotificationAnalyticsDrawer } from "./NotificationAnalyticsDrawer";

interface Notification {
    id: string;
    title: string;
    short_description?: string;
    message_content: string;
    image_url: string;
    display_type: "push" | "banner" | "fullscreen_banner";
    notification_type: "normal" | "important";
    status: "draft" | "scheduled" | "sent";
    target_audience: string;
    scheduled_at?: string;
    sent_at?: string;
    view_count: number;
    open_count: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
    metadata?: any;
}

interface NotificationStats {
    total_notifications: number;
    sent_notifications: number;
    scheduled_notifications: number;
    draft_notifications: number;
    important_notifications: number;
    total_views: number;
    total_opens: number;
    open_rate: number;
}

export function AdminNotificationManager() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"draft" | "scheduled" | "sent">("draft");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
    const [analyticsNotificationId, setAnalyticsNotificationId] = useState<string | null>(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Load notifications from API
    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await adminAPI.getNotifications();
            if (response.success && response.data) {
                setNotifications(response.data);
            }
        } catch (error: any) {
            toast.error("Failed to load notifications: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Load stats
    const loadStats = async () => {
        try {
            const response = await adminAPI.getNotificationStats();
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error: any) {
            console.error("Failed to load stats:", error);
        }
    };

    useEffect(() => {
        loadNotifications();
        loadStats();
    }, []);

    // Filter notifications by active tab
    const filteredNotifications = React.useMemo(() => {
        return notifications.filter((n) => n.status === activeTab);
    }, [notifications, activeTab]);

    // Calculate tab counts
    const draftCount = notifications.filter((n) => n.status === "draft").length;
    const scheduledCount = notifications.filter((n) => n.status === "scheduled").length;
    const sentCount = notifications.filter((n) => n.status === "sent").length;

    // Calculate open rate
    const calculateOpenRate = (views: number, opens: number) => {
        if (views === 0) return "0%";
        return `${((opens / views) * 100).toFixed(1)}%`;
    };

    // Handle delete
    const handleDelete = async (notification: Notification) => {
        if (!confirm(`Delete "${notification.title}"?`)) return;

        try {
            await adminAPI.deleteNotification(notification.id);
            toast.success("Notification deleted");
            loadNotifications();
            loadStats();
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    // Handle send now
    const handleSendNow = async (notification: Notification) => {
        if (!confirm(`Send "${notification.title}" immediately to all users?`)) return;

        try {
            await adminAPI.sendNotification(notification.id);
            toast.success("Notification sent successfully!");
            loadNotifications();
            loadStats();
        } catch (error: any) {
            toast.error("Failed to send: " + error.message);
        }
    };

    // Open analytics
    const openAnalytics = (notificationId: string) => {
        setAnalyticsNotificationId(notificationId);
        setIsAnalyticsOpen(true);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Delete ${selectedIds.length} notification(s)?`)) return;

        try {
            await adminAPI.bulkDeleteNotifications(selectedIds);
            toast.success(`Deleted ${selectedIds.length} notification(s)`);
            setSelectedIds([]);
            loadNotifications();
            loadStats();
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    // Toggle selection
    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Toggle select all
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredNotifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredNotifications.map(n => n.id));
        }
    };

    return (
        <div className="space-y-6 text-inter-regular-14">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-inter-bold-20 text-gray-800">Notification Management</h2>
                    <p className="text-gray-500 mt-1 text-inter-regular-14">
                        Manage push notifications with scheduling and analytics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            loadNotifications();
                            loadStats();
                        }}
                        disabled={isLoading}
                        className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-medium text-inter-medium-16"
                    >
                        <Plus className="w-5 h-5" />
                        Create Notification
                    </button>
                </div>
            </div>

            {/* Analytics Widgets */}
            <div className="grid grid-cols-3 gap-4">
                {/* Total Notifications */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Total Notifications</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.total_notifications || 0}
                    </p>
                </div>

                {/* Sent */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Sent</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.sent_notifications || 0}
                    </p>
                </div>

                {/* Scheduled */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Scheduled</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.scheduled_notifications || 0}
                    </p>
                </div>

                {/* Total Opens */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Total Opens</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.total_opens || 0}
                    </p>
                </div>

                {/* Open Rate */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Open Rate</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.open_rate || 0}%
                    </p>
                </div>

                {/* Important Notifications */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm text-inter-regular-14">Important</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2 text-inter-bold-20">
                        {stats?.important_notifications || 0}
                    </p>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 w-fit">
                <button
                    onClick={() => setActiveTab("draft")}
                    className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "draft"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <AlertCircle className="w-4 h-4 inline mr-1.5" />
                    Drafts ({draftCount})
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
                    onClick={() => setActiveTab("sent")}
                    className={`py-2 px-4 rounded text-sm font-medium transition-all text-inter-medium-14 ${activeTab === "sent"
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                >
                    <CheckCircle className="w-4 h-4 inline mr-1.5" />
                    Sent ({sentCount})
                </button>
            </div>

            {/* Notifications List Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
                        <p className="text-gray-600 text-inter-regular-14">Loading notifications...</p>
                    </div>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-gray-800 mb-2 text-inter-semibold-18">
                        No {activeTab} notifications
                    </h3>
                    <p className="text-gray-500 mb-4 text-inter-regular-14">
                        Create your first notification to get started
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-inter-medium-16"
                    >
                        Create Notification
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Notification
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Display Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Scheduled / Devices
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Views
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Opens
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Open Rate
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredNotifications.map((notification) => (
                                <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(notification.id)}
                                            onChange={() => toggleSelect(notification.id)}
                                            className="rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {notification.image_url && (
                                                <img
                                                    src={notification.image_url}
                                                    alt={notification.title}
                                                    className="w-12 h-12 rounded object-cover"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 text-inter-medium-14">
                                                    {notification.title}
                                                </p>
                                                {notification.short_description && (
                                                    <p className="text-sm text-gray-500 line-clamp-1">
                                                        {notification.short_description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${notification.display_type === "push"
                                                ? "bg-blue-100 text-blue-700"
                                                : notification.display_type === "banner"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-purple-100 text-purple-700"
                                                }`}
                                        >
                                            {notification.display_type?.replace("_", " ") || "banner"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${notification.status === "sent"
                                                ? "bg-green-100 text-green-700"
                                                : notification.status === "scheduled"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {notification.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {notification.scheduled_at
                                            ? format(new Date(notification.scheduled_at), "MMM dd, yyyy HH:mm")
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {notification.sent_at
                                            ? format(new Date(notification.sent_at), "MMM dd, yyyy HH:mm")
                                            : "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {notification.view_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {notification.open_count || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {calculateOpenRate(notification.view_count, notification.open_count)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openAnalytics(notification.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Analytics"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                            </button>
                                            {notification.status !== "sent" && (
                                                <>
                                                    <button
                                                        onClick={() => setEditingNotification(notification)}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendNow(notification)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Send Now"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(notification)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* Modals */}
            <AddNotificationModal
                isOpen={isCreateModalOpen || editingNotification !== null}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingNotification(null);
                }}
                onSuccess={() => {
                    loadNotifications();
                    loadStats();
                }}
                editingNotification={editingNotification}
            />

            <NotificationAnalyticsDrawer
                isOpen={isAnalyticsOpen}
                onClose={() => {
                    setIsAnalyticsOpen(false);
                    setAnalyticsNotificationId(null);
                }}
                notificationId={analyticsNotificationId}
            />
        </div>
    );
}
