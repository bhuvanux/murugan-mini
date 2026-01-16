import React from "react";
import { motion } from "framer-motion";
import { ChevronUp, Hand } from "lucide-react";

interface SwipeUpGuideProps {
    onDismiss: () => void;
}

export function SwipeUpGuide({ onDismiss }: SwipeUpGuideProps) {
    React.useEffect(() => {
        console.log("[SwipeUpGuide] Component mounted and visible");
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]"
            onClick={onDismiss}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="relative">
                    {/* Ripple effects */}
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                    <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse delay-75" />

                    <motion.div
                        animate={{
                            y: [20, -60],
                            opacity: [0, 1, 0],
                            scale: [0.9, 1, 0.9]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            repeatDelay: 0.2
                        }}
                        className="bg-white/10 backdrop-blur-md p-6 rounded-full border border-white/20 pointer-events-auto cursor-pointer relative z-10"
                    >
                        <Hand className="w-12 h-12 text-white" />
                    </motion.div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <ChevronUp className="w-8 h-8 text-white animate-bounce" />
                    <p className="text-white font-bold text-lg tracking-wider shadow-black drop-shadow-lg text-center px-4">
                        Swipe up to explore
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
