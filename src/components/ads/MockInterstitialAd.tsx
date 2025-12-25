import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { AdCloseButton } from './ui/AdCloseButton';
import { AdLabel } from './ui/AdLabel';

interface MockInterstitialAdProps {
    onClose: () => void;
}

export function MockInterstitialAd({ onClose }: MockInterstitialAdProps) {
    const [canClose, setCanClose] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setCanClose(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white rounded-3xl relative flex flex-col overflow-hidden shadow-2xl"
            >
                {/* Ad Header */}
                <div className="absolute top-4 left-4 z-10">
                    <AdLabel className="bg-white/80 backdrop-blur-sm" />
                </div>

                <div className="absolute top-4 right-4 z-10">
                    {canClose ? (
                        <AdCloseButton onClose={onClose} />
                    ) : (
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            <span>{timeLeft}s</span>
                        </div>
                    )}
                </div>

                {/* Ad Content */}
                <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 min-h-[400px] flex flex-col items-center justify-center text-white text-center p-8 relative">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl -ml-10 -mb-10" />

                    <div className="w-24 h-24 bg-white/20 rounded-2xl mb-6 flex items-center justify-center shadow-lg border border-white/10">
                        <span className="text-4xl">🚀</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-3 tracking-tight">Boost Your Efficiency</h2>
                    <p className="text-white/80 mb-8 leading-relaxed text-sm">
                        Upgrade to the pro version today and unlock unlimited possibilities with our premier tools.
                    </p>

                    <button className="bg-white text-indigo-600 px-8 py-3.5 rounded-full font-bold shadow-xl active:scale-95 transition-all text-sm hover:bg-gray-50">
                        Install Now
                    </button>

                    <div className="mt-8">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Sponsored</p>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="py-2 bg-gray-50 text-[10px] text-center text-gray-400 border-t border-gray-100">
                    Ad by Google (Mock)
                </div>

            </motion.div>
        </div>
    );
}
