import React, { useState, useEffect, useRef } from 'react';
import { MediaItem, userAPI } from '../utils/api/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { X, Heart, Download, Loader2, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';

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
};

export function MediaDetail({ 
  media, 
  allMedia, 
  onClose, 
  onMediaChange,
  isFavorite, 
  onToggleFavorite 
}: MediaDetailProps) {
  const [downloading, setDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Find current media index and track view
  useEffect(() => {
    const index = allMedia.findIndex(m => m.id === media.id);
    setCurrentIndex(index);
    
    // Track view when media detail opens (only once per media)
    if (!hasTrackedView) {
      trackView();
      setHasTrackedView(true);
    }
  }, [media, allMedia]);

  const trackView = async () => {
    try {
      console.log('[MediaDetail] Tracking view for:', media.id);
      await userAPI.trackView(media.id);
      console.log('[MediaDetail] View tracked successfully');
    } catch (error: any) {
      console.error('[MediaDetail] Failed to track view:', error);
      // Don't show error to user, just log it
    }
  };

  // Check if user has seen swipe hint before
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('murugan_swipe_hint_seen');
    if (!hasSeenHint && currentIndex < allMedia.length - 1) {
      setShowSwipeHint(true);
      // Hide hint after 3 seconds
      setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('murugan_swipe_hint_seen', 'true');
      }, 3000);
    }
  }, [currentIndex, allMedia.length]);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaY) > minSwipeDistance) {
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        navigateNext();
      } else if (e.key === 'ArrowDown') {
        navigatePrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allMedia]);

  const handleDownload = async () => {
    if (!media.downloadable) {
      return;
    }

    setDownloading(true);
    try {
      console.log('[MediaDetail] Starting download for:', media.id);
      
      // Track download on admin backend
      try {
        await userAPI.downloadMedia(media.id);
        console.log('[MediaDetail] Download tracked successfully');
      } catch (trackError: any) {
        console.error('[MediaDetail] Failed to track download:', trackError);
        // Continue with download even if tracking fails
      }
      
      const response = await fetch(media.storage_path);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${media.title}.${media.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('[MediaDetail] Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    try {
      console.log('[MediaDetail] Sharing to WhatsApp:', media.id);
      
      // Track share on admin backend
      try {
        await userAPI.trackShare(media.id);
        console.log('[MediaDetail] Share tracked successfully');
      } catch (trackError: any) {
        console.error('[MediaDetail] Failed to track share:', trackError);
        // Continue with share even if tracking fails
      }
      
      // Create a clean message with just title and URL
      const message = `🙏 ${media.title}\n\nCheck out this beautiful devotional ${media.type}!\n\n${media.storage_path}`;
      const text = encodeURIComponent(message);
      
      // Use web.whatsapp.com for web/desktop or wa.me for mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const whatsappUrl = isMobile 
        ? `whatsapp://send?text=${text}`
        : `https://web.whatsapp.com/send?text=${text}`;
      
      window.open(whatsappUrl, '_blank');
    } catch (error: any) {
      console.error('[MediaDetail] WhatsApp share error:', error);
    }
  };

  // Get animation classes for smooth transition
  const getAnimationClass = () => {
    if (!isTransitioning) return 'opacity-100 transform translate-y-0';
    if (slideDirection === 'up') return 'opacity-0 transform -translate-y-8';
    if (slideDirection === 'down') return 'opacity-0 transform translate-y-8';
    return 'opacity-100 transform translate-y-0';
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-full flex flex-col">
        {/* Header - Simple close button only */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Swipe indicator - First time only */}
        {showSwipeHint && currentIndex < allMedia.length - 1 && (
          <div className="absolute top-1/2 right-4 z-10 flex flex-col items-center gap-1 animate-bounce">
            <ChevronUp className="w-8 h-8 text-white/80 drop-shadow-lg" />
            <span className="text-white/80 text-xs font-medium drop-shadow-lg">Swipe up</span>
          </div>
        )}

        {/* Media Content with smooth YouTube Shorts-style transition */}
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ease-out ${getAnimationClass()}`}>
          {media.type === 'image' ? (
            <ImageWithFallback
              src={media.storage_path}
              alt={media.title}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={media.storage_path}
              controls
              autoPlay
              className="max-w-full max-h-full"
            >
              Your browser does not support video playback.
            </video>
          )}
        </div>

        {/* Bottom Info & Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-6 px-4">
          {/* Title and Tags */}
          <div className="mb-4">
            <h2 className="text-white mb-1">{media.title}</h2>
            {media.description && (
              <p className="text-white/80 text-sm mb-2">{media.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {media.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/20 text-white">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons - WhatsApp Share, Download, Like */}
          <div className="grid grid-cols-3 gap-3">
            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1fb855] rounded-xl transition-all active:scale-95"
            >
              <WhatsAppIcon className="w-6 h-6 text-white" />
              <span className="text-white text-xs font-medium">WhatsApp</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!media.downloadable || downloading}
              className="flex flex-col items-center justify-center gap-2 py-3 bg-[#D97706] hover:bg-[#c76a05] rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                  <span className="text-white text-xs font-medium">Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-6 h-6 text-white" />
                  <span className="text-white text-xs font-medium">Download</span>
                </>
              )}
            </button>

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // ← Prevent event bubbling to parent swipe handler
                onToggleFavorite(media.id);
              }}
              onTouchStart={(e) => e.stopPropagation()} // ← Stop touch events from bubbling
              onTouchEnd={(e) => e.stopPropagation()}
              className="flex flex-col items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
            >
              <Heart
                className={`w-6 h-6 transition-all ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`}
              />
              <span className="text-white text-xs font-medium">
                {isFavorite ? 'Liked' : 'Like'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}