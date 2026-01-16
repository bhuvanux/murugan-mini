import React, { useState, useEffect } from 'react';
import { X, Download, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterstitialAdModalProps {
    isOpen: boolean;
    onClose: () => void;
    onActionTrigger: () => void;
    title?: string;
    description?: string;
    actionLabel?: string;
    adImage?: string;
}

// Module-level variable to persist timer state across unmounts
let persistentTimeLeft = 10;

export function InterstitialAdModal({
    isOpen,
    onClose,
    onActionTrigger,
    title = "Preparing your content",
    description = "Please wait a few moments for the download to begin",
    actionLabel = "Continue",
    adImage
}: InterstitialAdModalProps) {
    const TOTAL_TIME = 10;
    const [timeLeft, setTimeLeft] = useState(persistentTimeLeft);
    const [isFinished, setIsFinished] = useState(timeLeft <= 0);

    // Sync state with persistent variable
    useEffect(() => {
        persistentTimeLeft = timeLeft;
    }, [timeLeft]);

    // Handle Body Scroll Lock and RESET timer on every open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeLeft(TOTAL_TIME);
            setIsFinished(false);
            persistentTimeLeft = TOTAL_TIME;
        } else {
            document.body.style.overflow = 'unset';
            persistentTimeLeft = TOTAL_TIME;
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Timer Logic
    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsFinished(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    const handleAction = () => {
        if (onActionTrigger) {
            onActionTrigger();
        }

        // Delay closing slightly to ensure parent handles the event
        setTimeout(() => {
            onClose();
        }, 200);

        // Reset for next time (even after success)
        setTimeout(() => {
            persistentTimeLeft = TOTAL_TIME;
            setTimeLeft(TOTAL_TIME);
            setIsFinished(false);
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 w-screen h-screen flex items-center justify-center z-[99999] p-6"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                width: '100vw',
                height: '100vh'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-[360px] rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col p-8 overflow-hidden"
                style={{
                    backgroundColor: '#1a1a1c',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative'
                }}
            >
                {/* Close Button - Strictly Top Right & Only after timer */}
                <AnimatePresence>
                    {isFinished && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={onClose}
                            className="absolute flex items-center justify-center transition-all bg-white/10 hover:bg-white/20 text-white rounded-full z-[100]"
                            style={{
                                top: '28px',
                                right: '28px',
                                width: '42px',
                                height: '42px',
                                position: 'absolute'
                            }}
                        >
                            <X size={24} strokeWidth={2.5} />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Header - Zedge Style (Top Left) */}
                <div className="w-full mb-8 mt-1">
                    <h2
                        className="text-[26px] font-black tracking-tight text-center leading-tight"
                        style={{ color: '#ffffff', fontFamily: 'Inter, sans-serif' }}
                    >
                        {title}
                    </h2>
                </div>

                {/* Ad Space - Zedge Style (Large Square Box) */}
                <div
                    className="w-full aspect-square rounded-[36px] flex items-center justify-center relative mb-10 overflow-hidden"
                    style={{ backgroundColor: '#111113', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    {adImage ? (
                        <img
                            src={adImage}
                            alt="Advertisement"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-6 opacity-30">
                            <ShieldCheck size={80} style={{ color: '#7c4dff' }} />
                            <span
                                className="text-[12px] uppercase tracking-[0.5em] font-black"
                                style={{ color: '#ffffff' }}
                            >
                                AD Placeholder
                            </span>
                        </div>
                    )}

                    <div
                        className="absolute top-5 right-5 text-[10px] font-black px-3 py-1 rounded-full border tracking-[0.15em] uppercase z-10"
                        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                        AD
                    </div>
                </div>

                {/* Footer - Zedge Style (Timer Row) */}
                <div className="w-full min-h-[70px] flex items-center">
                    <AnimatePresence mode="wait">
                        {!isFinished ? (
                            <motion.div
                                key="timer-row"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center w-full"
                                style={{ gap: '28px', paddingTop: '32px' }}
                            >
                                {/* Circle Timer */}
                                <div
                                    className="relative flex-shrink-0 flex items-center justify-center"
                                    style={{ width: '64px', height: '64px' }}
                                >
                                    {/* SVG Ring - Track + Progress */}
                                    <svg className="w-full h-full -rotate-90 absolute top-0 left-0">
                                        {/* Background Track */}
                                        <circle
                                            cx="32" cy="32" r="28"
                                            stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8"
                                            fill="transparent"
                                        />
                                        <motion.circle
                                            cx="32" cy="32" r="28"
                                            stroke="#7c4dff" strokeWidth="8"
                                            fill="transparent"
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 28}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - timeLeft / TOTAL_TIME) }}
                                            transition={{ duration: 1, ease: "linear" }}
                                        />
                                    </svg>
                                    <div className="z-10 flex items-center justify-center">
                                        <span
                                            className="text-[24px] font-black tabular-nums leading-none"
                                            style={{ color: '#ffffff' }}
                                        >
                                            {timeLeft}
                                        </span>
                                    </div>
                                </div>
                                <p
                                    className="text-[13px] leading-[1.4] font-medium text-left tracking-tight flex-1"
                                    style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                >
                                    {description}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="download-btn"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleAction}
                                className="w-full h-[64px] rounded-[20px] flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                                style={{
                                    backgroundColor: '#7c4dff',
                                    color: '#ffffff',
                                    fontWeight: 900,
                                    fontSize: '20px',
                                    boxShadow: '0 12px 32px rgba(124, 77, 255, 0.4)'
                                }}
                            >
                                <Download size={24} strokeWidth={3} />
                                <span>{actionLabel}</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
