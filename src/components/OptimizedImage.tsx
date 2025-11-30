import React, { useState, useEffect } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  type?: "wallpaper" | "photo" | "media" | "avatar" | "banner";
  fallbackSrc?: string;
  lqip?: string;
  lqipSrc?: string; // Alias for lqip (support both)
  onLoad?: () => void;
  onError?: () => void;
}

const DEFAULT_MURUGAN_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%230d5e38' width='400' height='400'/%3E%3Cg transform='translate(200 200)'%3E%3Cpath fill='%23fbbf24' d='M0-60 L15-20 L60-20 L25 10 L40 50 L0 25 L-40 50 L-25 10 L-60-20 L-15-20 Z'/%3E%3Ccircle fill='%23fbbf24' cx='0' cy='0' r='15'/%3E%3C/g%3E%3Ctext x='200' y='320' font-family='Arial' font-size='24' fill='%23fbbf24' text-anchor='middle'%3EMurugan%3C/text%3E%3C/svg%3E";

/**
 * OptimizedImage Component
 * Features:
 * - LQIP (Low Quality Image Placeholder) support
 * - Progressive loading (blur to sharp)
 * - Lazy loading
 * - Fallback to Murugan icon
 * - Type-specific styling (avatar circular, wallpaper with corners, etc.)
 */
export function OptimizedImage({
  src,
  alt,
  className = "",
  type = "photo",
  fallbackSrc,
  lqip,
  lqipSrc,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState(
    lqip || lqipSrc || DEFAULT_MURUGAN_PLACEHOLDER,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Create image loader
    const img = new Image();

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    };

    img.onerror = () => {
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      } else {
        setCurrentSrc(DEFAULT_MURUGAN_PLACEHOLDER);
      }
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc, onLoad, onError]);

  // Type-specific classes
  const getTypeClasses = () => {
    switch (type) {
      case "avatar":
        return "rounded-full object-cover";
      case "wallpaper":
        return "rounded-lg object-cover";
      case "photo":
        return "rounded-xl object-cover";
      case "media":
        return "rounded-lg object-cover";
      case "banner":
        return "rounded-2xl object-cover";
      default:
        return "rounded-lg object-cover";
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${getTypeClasses()} ${className}`}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full transition-all duration-300 ${
          isLoading ? "blur-md scale-120" : "blur-0 scale-100"
        } ${getTypeClasses()}`}
        loading="lazy"
      />

      {isLoading && (
        <div className="absolute inset-0 bg-green-800/10 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Progressive Image Loader Hook
 * Usage: const { currentSrc, isLoading } = useProgressiveImage(imageUrls);
 */
export function useProgressiveImage(urls: {
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  original: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(
    urls.thumbnail || DEFAULT_MURUGAN_PLACEHOLDER,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
    };

    const loadSequence = async () => {
      try {
        // Stage 1: Thumbnail (instant)
        if (urls.thumbnail) {
          if (isMounted) setCurrentSrc(urls.thumbnail);
        }

        // Stage 2: Small
        if (urls.small) {
          await loadImage(urls.small);
          if (isMounted) setCurrentSrc(urls.small);
        }

        // Stage 3: Medium
        if (urls.medium) {
          await loadImage(urls.medium);
          if (isMounted) setCurrentSrc(urls.medium);
          if (isMounted) setIsLoading(false);
        }

        // Stage 4: Large (optional, lazy)
        if (urls.large) {
          setTimeout(async () => {
            try {
              await loadImage(urls.large!);
              if (isMounted) setCurrentSrc(urls.large!);
            } catch (e) {
              // Fallback to original
            }
          }, 500);
        }
      } catch (error) {
        // Fallback to original
        if (isMounted) {
          setCurrentSrc(urls.original);
          setIsLoading(false);
        }
      }
    };

    loadSequence();

    return () => {
      isMounted = false;
    };
  }, [urls]);

  return { currentSrc, isLoading };
}

/**
 * Auto-detect Tamil/English text helper
 */
export function getTamilFontClass(text: string): string {
  // Check if text contains Tamil Unicode characters
  const tamilRegex = /[\u0B80-\u0BFF]/;

  if (tamilRegex.test(text)) {
    return "font-tamil-body";
  }

  return "font-english-body";
}

/**
 * Smart text component that auto-detects language
 */
export function SmartText({
  children,
  variant = "body",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "title" | "subtitle" | "body" | "label";
  className?: string;
}) {
  const text = typeof children === "string" ? children : "";
  const isTamil = /[\u0B80-\u0BFF]/.test(text);

  const getFontClass = () => {
    if (variant === "title") {
      return isTamil
        ? "font-tamil-title"
        : "font-english-title";
    } else if (variant === "subtitle") {
      return isTamil
        ? "font-tamil-subtitle"
        : "font-english-label";
    } else if (variant === "label") {
      return isTamil ? "font-tamil-body" : "font-english-label";
    }
    return isTamil ? "font-tamil-body" : "font-english-body";
  };

  return (
    <span className={`${getFontClass()} ${className}`}>
      {children}
    </span>
  );
}