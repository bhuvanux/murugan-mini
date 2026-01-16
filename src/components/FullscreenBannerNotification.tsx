import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { supabase } from '../utils/supabase/client';
import { trackNotificationView, trackNotificationOpen } from '../utils/notificationTracking';

interface FullscreenBannerNotification {
    id: string;
    title: string;
    image_url: string; // Required for fullscreen banner
    navigation_url?: string;
}

/**
 * FullscreenBannerNotification
 * 
 * Full-width vertical banner notification (Type 3)
 * - 9:16 aspect ratio image
 * - Tap anywhere to navigate
 * - Dismissible with X button
 * - Full-screen overlay
 */
export function FullscreenBannerNotification() {
    const [notification, setNotification] = useState<FullscreenBannerNotification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchLatestFullscreenNotification();
    }, []);

    const fetchLatestFullscreenNotification = async () => {
        try {
            // Get dismissed notification IDs from local storage
            const dismissed = JSON.parse(localStorage.getItem('dismissedFullscreenNotifications') || '[]');
            setDismissedIds(dismissed);

            // Build query for fullscreen_banner type notifications
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('display_type', 'fullscreen_banner');

            // Only apply the .not() filter if there are dismissed IDs
            if (dismissed.length > 0) {
                query = query.not('id', 'in', `(${dismissed.join(',')})`);
            }

            const { data, error } = await query
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[FullscreenNotification] Fetch error:', error);
                return;
            }

            if (data) {
                setNotification(data);
                setIsVisible(true);
                console.log('[FullscreenNotification] Tracking view for:', data.id);
                await trackNotificationView(data.id);
            }
        } catch (err) {
            console.error('[FullscreenNotification] Exception:', err);
        }
    };

    const handleDismiss = () => {
        if (!notification) return;

        const newDismissedIds = [...dismissedIds, notification.id];
        setDismissedIds(newDismissedIds);
        localStorage.setItem('dismissedFullscreenNotifications', JSON.stringify(newDismissedIds));

        setIsVisible(false);
        setTimeout(() => setNotification(null), 300);
    };

    const handleBannerClick = async () => {
        if (!notification) return;

        console.log('[FullscreenNotification] Tracking open for:', notification.id);
        await trackNotificationOpen(notification.id);

        if (notification.navigation_url) {
            let url = notification.navigation_url;
            // Add https:// if URL doesn't start with http:// or https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            console.log('[FullscreenNotification] Opening URL in browser:', url);

            // Use Capacitor Browser API to open external URLs properly
            await Browser.open({ url });
        }

        handleDismiss();
    };

    if (!isVisible || !notification) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
            {/* Close Button */}
            <button
                onClick={handleDismiss}
                className="absolute top-16 right-4 z-10 bg-white/10 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Banner Image - 9:16 aspect ratio */}
            <div
                onClick={handleBannerClick}
                className="relative max-w-sm w-full cursor-pointer"
                style={{ aspectRatio: '9/16' }}
            >
                <img
                    src={notification.image_url}
                    alt={notification.title}
                    className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
            </div>
        </div>
    );
}
