import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import './InAppNotificationBanner.css';
import { supabase } from '../utils/supabase/client';
import { trackNotificationView, trackNotificationOpen } from '../utils/notificationTracking';

interface Notification {
    id: string;
    title: string;
    short_description?: string;
    message_content: string;
    image_url: string;
    notification_type: 'normal' | 'important';
    sent_at: string;
}

/**
 * InAppNotificationBanner
 * 
 * Displays in-app notifications as a banner at the top of the screen.
 * Handles ALL notification display types (banner, card, modal, fullscreen)
 * using the same consistent dark banner layout.
 */
export function InAppNotificationBanner() {
    console.log('[InAppNotificationBanner] 🎯 Component function called!');
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    console.log('[InAppNotificationBanner] 📍 About to register useEffect...');

    useEffect(() => {
        console.log('[InAppNotificationBanner] 🚀 Component mounted!');
        fetchLatestNotification();
    }, []);

    const fetchLatestNotification = async () => {
        try {
            console.log('[InAppNotification] 🔍 Starting fetch...');

            // Get dismissed notification IDs from local storage
            const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
            console.log('[InAppNotification] 📋 Dismissed IDs:', dismissed);
            setDismissedIds(dismissed);

            // Fetch latest sent notification that hasn't been dismissed
            console.log('[InAppNotification] 🌐 Querying Supabase...');

            // Build query conditionally based on whether there are dismissed notifications
            console.log('[InAppNotification] 🔧 Building query with dismissed count:', dismissed.length);

            let query = supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent');

            // Only apply the .not() filter if there are dismissed IDs
            if (dismissed.length > 0) {
                console.log('[InAppNotification] 🚫 Applying dismissed filter for IDs:', dismissed);
                query = query.not('id', 'in', `(${dismissed.join(',')})`);
            } else {
                console.log('[InAppNotification] ✅ No dismissed IDs, fetching latest notification');
            }

            console.log('[InAppNotification] 📡 About to execute query...');

            const { data, error } = await query
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            console.log('[InAppNotification] 📦 Query response:', {
                hasData: !!data,
                dataId: data?.id,
                dataTitle: data?.title,
                errorCode: error?.code,
                errorMessage: error?.message,
                errorDetails: error?.details,
                errorHint: error?.hint,
                dismissedCount: dismissed.length
            });

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                console.error('[InAppNotification] ❌ Fetch error:', error);
                return;
            }

            if (data) {
                console.log('[InAppNotification] ✅ Found notification:', data.title);
                setNotification(data);
                setIsVisible(true);

                // Track view
                await trackNotificationView(data.id);
                console.log('[InAppNotification] 👁️ View tracked for:', data.id);
            } else {
                console.log('[InAppNotification] ℹ️ No notifications to show');
            }
        } catch (err) {
            console.error('[InAppNotification] 💥 Exception:', err);
        }
    };

    const handleDismiss = () => {
        if (!notification) return;

        // Add to dismissed list
        const newDismissed = [...dismissedIds, notification.id];
        setDismissedIds(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify(newDismissed));

        setIsVisible(false);
        setNotification(null);
    };

    const handleClick = async () => {
        if (!notification) return;

        // Track open
        await trackNotificationOpen(notification.id);

        // Show full notification in alert (you can replace with a modal later)
        alert(`${notification.title}\n\n${notification.message_content}`);

        handleDismiss();
    };

    // Debug: Log render decision
    console.log('[InAppNotification] 🎨 Render decision:', {
        isVisible,
        hasNotification: !!notification,
        notificationId: notification?.id,
        notificationTitle: notification?.title,
        willRender: isVisible && !!notification
    });

    // Return null if no notification to show (AFTER useEffect has run)
    if (!isVisible || !notification) {
        console.log('[InAppNotification] ❌ Not rendering - isVisible:', isVisible, 'notification:', !!notification);
        return null;
    }

    console.log('[InAppNotification] ✅ Rendering banner for:', notification.title);

    return (
        <div className="fixed top-safe left-0 right-0 z-50 p-4 animate-slide-down">
            <div
                onClick={handleClick}
                className="relative flex items-center gap-3 p-4 rounded-xl shadow-2xl cursor-pointer transition-all hover:shadow-3xl text-white"
                style={{ backgroundColor: '#121212' }}
            >
                {/* Icon */}
                <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${notification.notification_type === 'important'
                        ? 'bg-red-500'
                        : 'bg-green-500'
                        }`}>
                        <Bell className="w-6 h-6" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                        {notification.title}
                    </h3>
                    <p className="text-sm text-white/90 line-clamp-2">
                        {notification.short_description || notification.message_content}
                    </p>
                </div>

                {/* Image */}
                {notification.image_url && (
                    <img
                        src={notification.image_url}
                        alt={notification.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                )}

                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss();
                    }}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
