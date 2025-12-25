import React, { useState } from 'react';
import { X } from 'lucide-react';

export function MockBannerAd() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center bg-gray-100 border-t border-gray-300 shadow-lg">
            <div className="relative w-full max-w-[320px] h-[50px] bg-gray-200 flex items-center justify-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold border border-gray-400 px-2 py-1">
                    Mock Ad Banner
                </div>

                {/* Close Simulator (AdMob banners don't usually have this, but for UX validation useful) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20"
                >
                    <X size={12} className="text-gray-600" />
                </button>
            </div>
        </div>
    );
}
