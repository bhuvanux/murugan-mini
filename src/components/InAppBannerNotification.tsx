import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { supabase } from '../utils/supabase/client';
import { trackNotificationView, trackNotificationOpen } from '../utils/notificationTracking';

interface BannerNotification {
    id: string;
    title: string;
    short_description?: string;
    message_content: string;
    image_url?: string;
    notification_type: 'normal' | 'important';
    button_text?: string;
    navigation_url?: string;
}

/**
 * InAppBannerNotification
 * 
 * Small top banner notification (Type 2)
 * - Dark background (#121212)
 * - No bell icon
 * - Title and short description
 * - Customizable button with navigation
 * - Dismissible
 */
export function InAppBannerNotification() {
    const [notification, setNotification] = useState<BannerNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchLatestBannerNotification();
    }, []);

    const fetchLatestBannerNotification = async () => {
        try {
            // Get dismissed notification IDs from local storage
            const dismissed = JSON.parse(localStorage.getItem('dismissedBannerNotifications') || '[]');
            setDismissedIds(dismissed);

            // Build query for banner type notifications
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('display_type', 'banner');

            // Only apply the .not() filter if there are dismissed IDs
            if (dismissed.length > 0) {
                query = query.not('id', 'in', `(${dismissed.join(',')})`);
            }

            const { data, error } = await query
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[BannerNotification] Fetch error:', error);
                return;
            }

            if (data) {
                setNotification(data);
                setIsVisible(true);
                await trackNotificationView(data.id);
            }
        } catch (err) {
            console.error('[BannerNotification] Exception:', err);
        }
    };

    const handleDismiss = () => {
        if (!notification) return;

        const newDismissedIds = [...dismissedIds, notification.id];
        setDismissedIds(newDismissedIds);
        localStorage.setItem('dismissedBannerNotifications', JSON.stringify(newDismissedIds));

        setIsVisible(false);
        setTimeout(() => setNotification(null), 300);
    };

    const handleButtonClick = async () => {
        if (!notification) return;

        console.log('[BannerNotification] Tracking open for:', notification.id);
        await trackNotificationOpen(notification.id);

        if (notification.navigation_url) {
            let url = notification.navigation_url;
            // Add https:// if URL doesn't start with http:// or https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            console.log('[BannerNotification] Opening URL in browser:', url);

            // Use Capacitor Browser API to open external URLs properly
            await Browser.open({ url });
        }

        handleDismiss();
    };

    if (!isVisible || !notification) return null;

    return (
        <div
            className="fixed left-0 right-0 z-50 p-4 animate-banner-intro"
            style={{
                top: 'max(env(safe-area-inset-top, 0px), 56px)',
                paddingTop: '8px'
            }}
        >
            <div
                style={{ backgroundColor: '#121212' }}
                className="rounded-lg shadow-lg p-4 flex items-start gap-4 relative"
            >
                {/* Optional Image */}
                {notification.image_url && (
                    <img
                        src={notification.image_url}
                        alt={notification.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm mb-1 break-words overflow-wrap-anywhere">
                        {notification.title}
                    </h3>
                    {notification.short_description && (
                        <p className="text-gray-300 text-xs mb-2 line-clamp-2 break-words overflow-wrap-anywhere">
                            {notification.short_description}
                        </p>
                    )}

                    {/* Button */}
                    {notification.button_text && (
                        <button
                            onClick={handleButtonClick}
                            className="mt-2 px-4 py-1.5 bg-white text-black rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                        >
                            {notification.button_text}
                        </button>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
