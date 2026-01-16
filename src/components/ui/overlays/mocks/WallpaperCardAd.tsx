
import { AdLabel } from '../ui/AdLabel';
import { AdCTA } from '../ui/AdCTA';

export function WallpaperCardAd() {
    return (
        <div className="relative w-full h-full min-h-[250px] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex flex-col">
            {/* Image Area */}
            <div className="w-full h-[60%] bg-gradient-to-tr from-orange-100 to-amber-100 flex items-center justify-center relative">
                <div className="absolute top-2 left-2">
                    <AdLabel className="bg-white/80 backdrop-blur-sm" />
                </div>
                <div className="text-4xl">🎮</div>
            </div>

            {/* Content Area */}
            <div className="p-3 flex flex-col justify-between flex-1">
                <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">Play New Games</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">Join millions of players in this epic adventure.</p>
                </div>

                <div className="mt-3">
                    <AdCTA text="Play" className="w-full py-1.5 text-xs" />
                </div>
            </div>
        </div>
    );
}
