import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem, userAPI } from '../utils/api/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, Heart, Share2, Download } from 'lucide-react';
import { Portal } from './ui/Portal';
import { analyticsTracker } from '../utils/analytics/useAnalytics';

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Format count to K/M notation
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

type MediaDetailProps = {
  media: MediaItem;
  allMedia: MediaItem[];
  onClose: () => void;
  onMediaChange: (media: MediaItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string) => void;
};

export function MediaDetailReels({
  media,
  allMedia,
  onClose,
  onMediaChange,
  isFavorite,
  onToggleFavorite
}: MediaDetailProps) {
  // State management
  const [downloading, setDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const [showUI, setShowUI] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  // Like state with optimistic updates
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(media.likes || 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // View tracking
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Gesture detection
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const MIN_SWIPE_DISTANCE = 100; // 100px threshold
  const DOUBLE_TAP_DELAY = 250; // ms
  const TAP_MAX_MOVEMENT = 10; // px

  // Find current media index
  useEffect(() => {
    const index = allMedia.findIndex(m => m.id === media.id);
    setCurrentIndex(index);
    setLikeCount(media.likes || 0);
    setHasTrackedView(false);
    setCaptionExpanded(false);

    // Check like status
    checkLikeStatus();
  }, [media, allMedia]);

  // Track view after 2 seconds of viewing
  useEffect(() => {
    if (!hasTrackedView) {
      viewTimerRef.current = setTimeout(() => {
        trackView();
        setHasTrackedView(true);
      }, 2000);
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [media.id, hasTrackedView]);

  // Preload adjacent images
  useEffect(() => {
    const preloadImages = () => {
      if (currentIndex > 0) {
        const prevImg = new Image();
        prevImg.src = allMedia[currentIndex - 1].storage_path;
      }
      if (currentIndex < allMedia.length - 1) {
        const nextImg = new Image();
        nextImg.src = allMedia[currentIndex + 1].storage_path;
      }
    };

    preloadImages();
  }, [currentIndex, allMedia]);

  // Check if user has liked this wallpaper
  const checkLikeStatus = async () => {
    try {
      const liked = await userAPI.checkIfLiked(media.id);
      setIsLiked(liked);
    } catch (error) {
      console.error('[MediaDetail] Failed to check like status:', error);
    }
  };

  const trackView = async () => {
    try {
      console.log('[MediaDetail] Tracking view for:', media.id);
      // Determine module name based on media type or use a common one
      const moduleName = media.is_video || media.type === 'video' ? 'video' : 'song';
      await analyticsTracker.track(moduleName as any, media.id, 'view');
      console.log('[MediaDetail] View tracked successfully via unified analytics');
    } catch (error: any) {
      console.error('[MediaDetail] Failed to track view:', error);
    }
  };

  // Optimistic like/unlike with error handling
  const handleLike = useCallback(async () => {
    if (isLikePending) return;

    setIsLikePending(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic UI update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newLiked) {
        const result = await userAPI.likeMedia(media.id);
        if (result.like_count !== undefined) {
          setLikeCount(result.like_count);
        }
      } else {
        const result = await userAPI.unlikeMedia(media.id);
        if (result.like_count !== undefined) {
          setLikeCount(result.like_count);
        }
      }
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('[MediaDetail] Like action failed:', error);
    } finally {
      setIsLikePending(false);
    }
  }, [isLiked, likeCount, isLikePending, media.id]);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  // Handle touch end - detect tap vs swipe
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const touchDuration = Date.now() - touchStartTime.current;

    const deltaY = touchStartY.current - touchEndY;
    const deltaX = Math.abs(touchStartX.current - touchEndX);
    const totalMovement = Math.sqrt(Math.pow(deltaY, 2) + Math.pow(deltaX, 2));

    // Check if it's a tap (minimal movement and quick)
    if (totalMovement < TAP_MAX_MOVEMENT && touchDuration < 300) {
      handleTap(e);
      return;
    }

    // Check if it's a valid swipe (primarily vertical)
    if (deltaX < 50 && Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
      if (deltaY > 0) {
        navigateNext();
      } else {
        navigatePrevious();
      }
    }
  };

  // Handle tap - detect single vs double tap
  const handleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      tapCount.current = 0;
      handleDoubleTap(e);
    } else {
      tapCount.current = 1;
      lastTapTime.current = now;

      setTimeout(() => {
        if (tapCount.current === 1) {
          handleSingleTap(e);
          tapCount.current = 0;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Single tap toggles UI chrome
  const handleSingleTap = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    setShowUI(prev => !prev);
  };

  // Double tap likes the wallpaper
  const handleDoubleTap = async (e: React.TouchEvent) => {
    e.stopPropagation();
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 1000);

    if (!isLiked && !isLikePending) {
      await handleLike();
    }
  };

  const navigateNext = () => {
    if (currentIndex < allMedia.length - 1 && !isTransitioning) {
      setSlideDirection('up');
      setIsTransitioning(true);
      setTimeout(() => {
        onMediaChange(allMedia[currentIndex + 1]);
        setSlideDirection(null);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const navigatePrevious = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setSlideDirection('down');
      setIsTransitioning(true);
      setTimeout(() => {
        onMediaChange(allMedia[currentIndex - 1]);
        setSlideDirection(null);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleDownload = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await userAPI.downloadMedia(media.id);
      const link = document.createElement('a');
      link.href = media.storage_path;
      link.download = media.title || 'murugan-wallpaper';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('[MediaDetail] Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    try {
      await userAPI.trackShare(media.id);
      if (navigator.share) {
        await navigator.share({
          title: media.title,
          text: `Check out this Murugan wallpaper: ${media.title}`,
          url: media.storage_path,
        });
      } else {
        const text = encodeURIComponent(`Check out this Murugan wallpaper: ${media.title}`);
        const url = encodeURIComponent(media.storage_path);
        window.open(`https://wa.me/?text=${text}%0A${url}`, '_blank');
      }
    } catch (error) {
      console.error('[MediaDetail] Share failed:', error);
    }
  };

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black z-[2000] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* Main Content with Swipe Animation */}
        <div
          className={`
            relative w-full h-full transition-all duration-300 ease-out
            ${slideDirection === 'up' ? '-translate-y-full opacity-0' : ''}
            ${slideDirection === 'down' ? 'translate-y-full opacity-0' : ''}
            ${slideDirection === null ? 'translate-y-0 opacity-100' : ''}
          `}
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Wallpaper Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Media Content */}
            {(media.type === 'video' || media.is_video) ? (
              <video
                src={media.storage_path}
                className="max-w-full max-h-full object-contain"
                autoPlay
                playsInline
                loop
                onClick={(e) => {
                  e.stopPropagation();
                  const video = e.target as HTMLVideoElement;
                  if (video.paused) video.play();
                  else video.pause();
                }}
              />
            ) : (
              <ImageWithFallback
                src={media.storage_path}
                alt={media.title}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Double Tap Heart Animation */}
            {showDoubleTapHeart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart
                  className="w-32 h-32 text-white fill-white animate-ping opacity-0"
                  style={{
                    animation: 'doubleTapHeart 1s ease-out forwards'
                  }}
                />
              </div>
            )}
          </div>

          {/* UI Chrome (conditionally shown) */}
          {showUI && (
            <>
              {/* Vertical Action Bar (Right Side, Bottom-Aligned) */}
              <div className="absolute right-4 bottom-24 z-50 flex flex-col items-center gap-6">
                {/* Like Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  onTouchStart={stopPropagation}
                  onTouchEnd={stopPropagation}
                  disabled={isLikePending}
                  className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
                >
                  <Heart
                    className={`w-8 h-8 transition-all duration-200 drop-shadow-lg ${isLiked
                      ? 'fill-[#0d5e38] text-[#0d5e38]'
                      : 'text-white'
                      }`}
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      transform: isLiked ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                  <span className="text-white text-xs drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {formatCount(likeCount)}
                  </span>
                </button>

                {/* Share Button (WhatsApp Icon fallback) */}
                <button
                  onClick={handleShare}
                  onTouchStart={stopPropagation}
                  onTouchEnd={stopPropagation}
                  className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
                >
                  <WhatsAppIcon className="w-8 h-8 text-[#25D366] drop-shadow-lg" />
                  <span className="text-white text-xs drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {media.shares && media.shares > 0 ? formatCount(media.shares) : ''}
                  </span>
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  onTouchStart={stopPropagation}
                  onTouchEnd={stopPropagation}
                  disabled={downloading}
                  className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
                >
                  <Download
                    className={`w-7 h-7 text-white drop-shadow-lg ${downloading ? 'animate-bounce' : ''}`}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  />
                  <span className="text-white text-xs drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {media.downloads && media.downloads > 0 ? formatCount(media.downloads) : ''}
                  </span>
                </button>
              </div>

              {/* Caption and Info - Bottom Left */}
              {(media.title || media.description) && (
                <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12">
                  {media.title && (
                    <h2
                      className="text-white text-lg mb-1 font-bold"
                      style={{ fontFamily: 'var(--font-tamil)' }}
                    >
                      {media.title}
                    </h2>
                  )}

                  {media.description && (
                    <div>
                      <p
                        className={`text-white/90 text-sm ${!captionExpanded ? 'line-clamp-2' : ''}`}
                        style={{ fontFamily: 'var(--font-tamil)' }}
                      >
                        {media.description}
                      </p>
                      {media.description.length > 100 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCaptionExpanded(!captionExpanded); }}
                          onTouchStart={stopPropagation}
                          onTouchEnd={stopPropagation}
                          className="text-white/60 text-sm mt-1"
                        >
                          {captionExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
                    <span>{formatCount(media.views || 0)} views</span>
                  </div>
                </div>
              )}

              {/* Swipe Indicator */}
              {currentIndex < allMedia.length - 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-widest">
                  Swipe up
                </div>
              )}
            </>
          )}
        </div>

        {/* Close Button - Top level fixed context */}
        <button
          onClick={() => {
            console.log("[MediaDetailReels] Close button clicked");
            onClose();
          }}
          onTouchStart={stopPropagation}
          onTouchEnd={stopPropagation}
          className="fixed top-[calc(env(safe-area-inset-top,0px)+24px)] left-4 z-[3010] w-12 h-12 rounded-full bg-black/40 backdrop-blur-md 
                     flex items-center justify-center hover:bg-black/50 active:scale-95 transition-all shadow-lg shadow-black/20 border border-white/20"
        >
          <X className="w-6 h-6 text-white drop-shadow-lg" />
        </button>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes doubleTapHeart {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1.5);
              opacity: 0.8;
            }
            100% {
              transform: scale(1.8);
              opacity: 0;
            }
          }
        `}} />
      </div>
    </Portal>
  );
}