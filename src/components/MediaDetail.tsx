import React, { useState, useEffect, useRef } from 'react';
import { MediaItem, userAPI } from '../utils/api/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, Heart, Download } from 'lucide-react';
import { toast } from 'sonner';
import { MuruganLoader } from './MuruganLoader';

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

type MediaDetailProps = {
  media: MediaItem;
  allMedia: MediaItem[];
  onClose: () => void;
  onMediaChange: (media: MediaItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string) => void;
  onMediaUpdate?: (mediaId: string, updates: Partial<MediaItem>) => void; // ✅ NEW: Update parent's media array
};

export function MediaDetail({ 
  media, 
  allMedia, 
  onClose, 
  onMediaChange,
  isFavorite: _isFavorite,
  onToggleFavorite: _onToggleFavorite,
  onMediaUpdate // ✅ NEW: Accept callback
}: MediaDetailProps) {
  const [downloading, setDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // Like state management
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(media.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);

  // Find current media index and track view
  useEffect(() => {
    const index = allMedia.findIndex(m => m.id === media.id);
    setCurrentIndex(index);
    setLikeCount(media.likes || 0);
    
    // Track view when media detail opens (only once per media)
    if (!hasTrackedView) {
      (async () => {
        try {
          console.log('[MediaDetail] Tracking view for:', media.id);
          await userAPI.trackView(media.id);
          console.log('[MediaDetail] View tracked successfully');
        } catch (error: any) {
          console.error('[MediaDetail] Failed to track view:', error);
        }
      })();
      setHasTrackedView(true);
    }

    // Check like status
    (async () => {
      try {
        const liked = await userAPI.checkIfLiked(media.id);
        setIsLiked(liked);
      } catch (error) {
        console.error('Failed to check like status:', error);
      }
    })();
  }, [media.id, allMedia, hasTrackedView]); // ✅ Fix dependencies

  // Preload adjacent images for smooth swiping
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

  const handleLike = async (e: React.MouseEvent | React.TouchEvent) => {
    // CRITICAL: Stop all event propagation to prevent swipe gestures
    e.stopPropagation();
    e.preventDefault();
    if ('nativeEvent' in e && e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
    }
    
    // Debounce: prevent rapid taps
    if (isLiking) return;
    
    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    // Optimistic UI update
    const willBeLiked = !isLiked;
    setIsLiked(willBeLiked);
    setLikeCount(prev => willBeLiked ? prev + 1 : Math.max(prev - 1, 0));
    
    // Show like animation
    if (willBeLiked) {
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
    
    try {
      // Use the new toggle endpoint (atomic and idempotent)
      const result = await userAPI.toggleLike(media.id);
      
      // Update with server response
      if (result.success && result.like_count !== undefined) {
        setLikeCount(result.like_count);
        setIsLiked(result.action === 'liked');
        console.log(`[MediaDetail] ✅ ${result.action} successfully - count: ${result.like_count}`);
        
        // ✅ NEW: Update parent's media array
        if (onMediaUpdate) {
          onMediaUpdate(media.id, { likes: result.like_count });
        }
      }
    } catch (error: any) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('[MediaDetail] ❌ Toggle like failed, rolled back:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('migration required') || error.message?.includes('could not find')) {
        toast.error('Database setup required. Please run the SQL migration in Supabase.');
      } else {
        toast.error('Failed to update like. Please try again.');
      }
    } finally {
      // Small delay to prevent double-tap issues
      setTimeout(() => {
        setIsLiking(false);
      }, 300);
    }
  };

  // Handle swipe gestures with improved threshold
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const deltaY = touchStartY.current - touchEndY.current;
    const deltaX = Math.abs(touchStartX.current - touchEndX.current);
    const minSwipeDistance = 120; // Increased threshold

    // Only trigger if primarily vertical swipe (not horizontal)
    if (deltaX < 30 && Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        // Swiped up - next media
        navigateNext();
      } else {
        // Swiped down - previous media
        navigatePrevious();
      }
    }
  };

  const navigateNext = () => {
    if (currentIndex < allMedia.length - 1 && !isTransitioning) {
      setSlideDirection('up');
      setIsTransitioning(true);
      setTimeout(() => {
        const nextMedia = allMedia[currentIndex + 1];
        onMediaChange(nextMedia);
        setHasTrackedView(false); // Reset view tracking for new media
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
        const prevMedia = allMedia[currentIndex - 1];
        onMediaChange(prevMedia);
        setHasTrackedView(false); // Reset view tracking for new media
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
      console.log('[MediaDetail] Starting download for:', media.id);
      
      // Track download
      await userAPI.downloadMedia(media.id);
      
      // Create download link
      const link = document.createElement('a');
      link.href = media.storage_path;
      link.download = media.title || 'murugan-wallpaper';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('[MediaDetail] Download started successfully');
    } catch (error) {
      console.error('[MediaDetail] Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    try {
      console.log('[MediaDetail] Sharing:', media.id);
      
      // Track share
      await userAPI.trackShare(media.id);
      
      // Share via WhatsApp
      const text = encodeURIComponent(`Check out this Murugan wallpaper: ${media.title}`);
      const url = encodeURIComponent(media.storage_path);
      window.open(`https://wa.me/?text=${text}%0A${url}`, '_blank');
      
      console.log('[MediaDetail] Share initiated');
    } catch (error) {
      console.error('[MediaDetail] Share failed:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-[9998] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
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
      >
        {/* Wallpaper Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <ImageWithFallback
            src={media.storage_path}
            alt={media.title}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm 
                     flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Floating Action Buttons (Instagram/YouTube Style) */}
        <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
          
          {/* Like Button */}
          <button
            onClick={handleLike}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            disabled={isLiking}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="relative w-[50px] h-[50px] rounded-full bg-white/85 backdrop-blur-sm 
                       flex flex-col items-center justify-center shadow-lg 
                       hover:scale-110 active:scale-95 transition-transform duration-200
                       disabled:opacity-50"
          >
            <Heart 
              className={`w-6 h-6 transition-all duration-200 ${
                isLiked 
                  ? 'fill-red-500 text-red-500 scale-110' 
                  : 'text-gray-700'
              }`}
            />
            <span className="text-[10px] text-gray-700 mt-0.5">
              {likeCount > 0 ? likeCount : ''}
            </span>
            
            {/* Like Animation */}
            {showLikeAnimation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart 
                  className="w-12 h-12 fill-red-500 text-red-500 animate-ping opacity-75"
                />
              </div>
            )}
          </button>
          
          {/* Share Button (WhatsApp) */}
          <button
            onClick={handleShare}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="w-[50px] h-[50px] rounded-full bg-[#25D366]/90 backdrop-blur-sm 
                       flex items-center justify-center shadow-lg 
                       hover:scale-110 active:scale-95 transition-transform duration-200"
          >
            <WhatsAppIcon className="w-6 h-6 text-white" />
          </button>
          
          {/* Download Button */}
          <button
            onClick={handleDownload}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            disabled={downloading}
            className="w-[50px] h-[50px] rounded-full bg-white/85 backdrop-blur-sm 
                       flex items-center justify-center shadow-lg 
                       hover:scale-110 active:scale-95 transition-transform duration-200
                       disabled:opacity-50"
          >
            {downloading ? (
              <MuruganLoader variant="button" />
            ) : (
              <Download className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Wallpaper Info (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <h2 className="text-white text-xl mb-2" style={{ fontFamily: 'var(--font-tamil)' }}>
            {media.title}
          </h2>
          {media.description && (
            <p className="text-white/80 text-sm" style={{ fontFamily: 'var(--font-tamil)' }}>
              {media.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-white/60 text-sm">
            <span>{media.views || 0} views</span>
            <span>•</span>
            <span>{likeCount} likes</span>
            {media.downloads && media.downloads > 0 && (
              <>
                <span>•</span>
                <span>{media.downloads} downloads</span>
              </>
            )}
          </div>
        </div>

        {/* Swipe Indicator (Bottom Center) */}
        {currentIndex < allMedia.length - 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-bounce">
            Swipe up for next
          </div>
        )}
      </div>
    </div>
  );
}