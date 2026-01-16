import { useState } from 'react';
import { AdLabel } from '../ui/AdLabel';
import { AdCTA } from '../ui/AdCTA';
import { X } from 'lucide-react';

export function PhotoBannerAd() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="w-full py-4 px-1">
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm relative flex flex-col sm:flex-row items-center p-4 gap-4">
                {/* Ad Badge */}
                <div className="absolute top-2 left-2">
                    <AdLabel className="bg-white" />
                </div>

                {/* Close (Optional for Banner, but good for UX) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500"
                >
                    <X size={14} />
                </button>

                {/* Content */}
                <div className="h-16 w-16 bg-blue-100 rounded-lg flex-shrink-0 flex items-center justify-center text-blue-500">
                    <span className="text-2xl">🛍️</span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-sm font-bold text-gray-900">Exclusive Shopping Deal</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">Get 50% off on your first order. Limited time offer!</p>
                </div>

                <div className="flex-shrink-0">
                    <AdCTA text="Shop Now" className="py-1.5 px-4 text-xs" />
                </div>
            </div>
        </div>
    );
}
