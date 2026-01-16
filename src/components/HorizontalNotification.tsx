import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface HorizontalNotificationProps {
    bannerId: string;
    imageUrl: string;
    title?: string;
    description?: string;
    targetUrl?: string;
    onDismiss: () => void;
}

export function HorizontalNotification({
    bannerId,
    imageUrl,
    title,
    description,
    targetUrl,
    onDismiss
}: HorizontalNotificationProps) {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Slide in animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsVisible(false);

        // Allow animation to finish
        setTimeout(async () => {
            try {
                // Track dismissal in database
                await supabase.from('banner_dismissals').insert({
                    banner_id: bannerId,
                    user_id: user?.id.startsWith('mock-') ? null : user?.id,
                    phone: user?.phone,
                    dismissed_at: new Date().toISOString()
                });

                // Save dismissal to localStorage
                const dismissedBanners = JSON.parse(localStorage.getItem('dismissed_banners') || '[]');
                if (!dismissedBanners.includes(bannerId)) {
                    dismissedBanners.push(bannerId);
                    localStorage.setItem('dismissed_banners', JSON.stringify(dismissedBanners));
                }

                onDismiss();
            } catch (error) {
                console.error('[HorizontalNotification] Failed to track dismissal:', error);
                onDismiss();
            }
        }, 300);
    };

    const handleClick = () => {
        if (targetUrl) {
            window.open(targetUrl, '_blank');
        }
    };

    return (
        <div
            className={`fixed top-4 left-4 right-4 z-[9999] transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
            style={{ marginTop: 'calc(env(safe-area-inset-top) + 0px)' }}
        >
            <div
                className="bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer"
                onClick={handleClick}
            >
                <div className="relative flex items-center p-3 gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-gray-100">
                        <img
                            src={imageUrl}
                            alt={title || "Notification"}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {title && <h4 className="font-bold text-gray-900 truncate text-sm">{title}</h4>}
                        {description && <p className="text-gray-600 text-xs line-clamp-2">{description}</p>}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Dismiss notification"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress bar / Timeout indicator could go here if auto-dismiss is needed */}
            </div>
        </div>
    );
}
