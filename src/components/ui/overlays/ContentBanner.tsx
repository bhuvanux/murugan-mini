import React, { useState } from 'react';
import { X } from 'lucide-react';

export function ContentBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="w-full flex justify-center py-4 px-2">
            <div className="relative w-full max-w-[340px] h-[60px] bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/40 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-green-500/5" />

                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-0.5">
                        Sponsored
                    </span>
                    <div className="text-xs font-semibold text-gray-700">
                        Premium Divine Content
                    </div>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute right-2 top-2 w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                >
                    <X size={10} className="text-gray-500" />
                </button>
            </div>
        </div>
    );
}
