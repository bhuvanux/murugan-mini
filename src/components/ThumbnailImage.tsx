import React, { useState, useEffect } from "react";
import { optimizeSupabaseUrl } from "../utils/imageHelper";
import { Music, Play, Image as ImageIcon } from "lucide-react";
import placeholderImg from "../assets/splash-logo.png";

interface ThumbnailImageProps {
    src?: string | null;       // The priority image (thumbnail)
    fallbackSrc?: string | null; // The secondary source (original file)
    youtubeUrl?: string | null; // Explicit YouTube URL
    alt: string;
    className?: string;
    type?: "audio" | "video" | "image";
}

export function ThumbnailImage({ src, fallbackSrc, youtubeUrl, alt, className, type }: ThumbnailImageProps) {
    const getYouTubeId = (url: string) => {
        if (!url) return null;
        // Handle various YouTube URL patterns
        const match = url.match(/(?:\?v=|&v=|youtu\.be\/|\/embed\/|\/vi\/|\/shorts\/)([^&?#/]+)/);
        if (match) return match[1];

        // Handle raw 11-char IDs
        if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

        return null;
    };

    // Helper to determine the best initial URL
    const getInitialUrl = () => {
        // 1. Check ALL sources for a YouTube link
        const ytId = getYouTubeId(src || "") ||
            getYouTubeId(fallbackSrc || "") ||
            getYouTubeId(youtubeUrl || "");

        if (ytId) {
            return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }

        // 2. If explicit thumbnail exists, use it
        if (src && !src.startsWith('blob:')) {
            return optimizeSupabaseUrl(src);
        }

        // 3. Check fallbackSrc if it's an image
        if (fallbackSrc && !fallbackSrc.startsWith('blob:')) {
            const lower = fallbackSrc.toLowerCase();
            const isMedia = lower.includes('.mp4') ||
                lower.includes('.mov') ||
                lower.includes('.webm') ||
                lower.includes('.mp3') ||
                lower.includes('.wav') ||
                lower.includes('.m4a');

            if (!isMedia) {
                return optimizeSupabaseUrl(fallbackSrc);
            }
        }

        return null;
    };

    const [currentSrc, setCurrentSrc] = useState<string | null>(getInitialUrl());
    const [retryLevel, setRetryLevel] = useState(0); // 0: hq, 1: mq, 2: default, 3: fail
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
        setRetryLevel(0);
        setCurrentSrc(getInitialUrl());
    }, [src, fallbackSrc, youtubeUrl]);

    const handleLoadError = () => {
        if (currentSrc?.includes('img.youtube.com')) {
            const ytId = getYouTubeId(src || "") ||
                getYouTubeId(fallbackSrc || "") ||
                getYouTubeId(youtubeUrl || "");

            if (ytId) {
                if (retryLevel === 0) {
                    setRetryLevel(1);
                    setCurrentSrc(`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`);
                } else if (retryLevel === 1) {
                    setRetryLevel(2);
                    setCurrentSrc(`https://img.youtube.com/vi/${ytId}/default.jpg`);
                } else {
                    setHasError(true);
                }
            } else {
                setHasError(true);
            }
        } else {
            setHasError(true);
        }
    };

    if (hasError || !currentSrc) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                {type === "audio" ? (
                    <Music className="w-1/2 h-1/2 opacity-50" />
                ) : type === "video" ? (
                    <Play className="w-1/2 h-1/2 opacity-50" />
                ) : (
                    <ImageIcon className="w-1/2 h-1/2 opacity-50" />
                )}
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            onError={handleLoadError}
        />
    );
}
