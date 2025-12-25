
import { AdLabel } from '../ui/AdLabel';
import { AdCTA } from '../ui/AdCTA';
import { Heart, VolumeX } from 'lucide-react';

interface SparkReelAdProps {
    isActive: boolean;
}

export function SparkReelAd({ isActive: _isActive }: SparkReelAdProps) {
    // Simulate video playing only when active if we had a video

    return (
        <div className="relative w-full h-full bg-black">
            {/* Background (Simulated Video) */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-700 via-slate-900 to-black"></div>
                </div>
                <div className="text-center z-10 p-8">
                    <div className="w-24 h-24 bg-blue-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                        <span className="text-5xl">⚡</span>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">POWER UP</h2>
                    <p className="text-blue-200 text-lg">Your productivity workflow</p>
                </div>
            </div>

            {/* Overlays */}
            <div className="absolute top-[calc(env(safe-area-inset-top,0px)+16px)] left-4 z-20">
                <AdLabel className="bg-black/50 text-white border-white/20 backdrop-blur-sm" />
            </div>

            {/* Simulated Right Actions (Disabled/Mocked) */}
            <div className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+120px)] flex flex-col gap-4 z-20 opacity-50 pointer-events-none">
                <div className="flex flex-col items-center">
                    <Heart className="w-8 h-8 text-white mb-1" />
                    <span className="text-white text-xs">24k</span>
                </div>
                <div className="flex flex-col items-center">
                    <VolumeX className="w-8 h-8 text-white mb-1" />
                </div>
            </div>


            {/* Content & CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10">
                <h3 className="text-white font-bold text-lg mb-1">Productivity Master Pro</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    Design, collaborate, and ship faster than ever before. Try it free today.
                </p>

                <AdCTA text="Install App" className="w-full py-3 text-base" />
            </div>
        </div>
    );
}
