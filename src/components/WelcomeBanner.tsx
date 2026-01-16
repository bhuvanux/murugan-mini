import React from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface WelcomeBannerProps {
    bannerId: string;
    imageUrl: string;
    onDismiss: () => void;
}

export function WelcomeBanner({ bannerId, imageUrl, onDismiss }: WelcomeBannerProps) {
    const { user } = useAuth();

    const handleDismiss = async () => {
        try {
            // Track dismissal in database
            await supabase.from('banner_dismissals').insert({
                banner_id: bannerId,
                user_id: user?.id.startsWith('mock-') ? null : user?.id,
                phone: user?.phone,
                dismissed_at: new Date().toISOString()
            });

            // Save dismissal to localStorage as well (for offline/quick check)
            const dismissedBanners = JSON.parse(localStorage.getItem('dismissed_banners') || '[]');
            if (!dismissedBanners.includes(bannerId)) {
                dismissedBanners.push(bannerId);
                localStorage.setItem('dismissed_banners', JSON.stringify(dismissedBanners));
            }

            onDismiss();
        } catch (error) {
            console.error('[WelcomeBanner] Failed to track dismissal:', error);
            // Still dismiss locally even if tracking fails
            onDismiss();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
                    aria-label="Close welcome banner"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {/* Banner Image */}
                <div className="w-full">
                    <img
                        src={imageUrl}
                        alt="Welcome Banner"
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '80vh' }}
                    />
                </div>
            </div>
        </div>
    );
}
