// WALLPAPER FULL-VIEW COMPONENT
// Cloned from SparkScreen but simplified for wallpapers only
// No heading, no content/description, no date/time
// Shows: Image + Right action buttons (Like, WhatsApp, Download) + Bottom metadata

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Download,
  Heart,
  X,
  MessageCircle,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MediaItem } from "../utils/api/client";
import { useWallpaperAnalytics } from "../utils/analytics/useAnalytics";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

interface WallpaperFullViewProps {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export function WallpaperFullView({ media, initialIndex, onClose }: WallpaperFullViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [likedMedia, setLikedMedia] = useState<Set<string>>(new Set());
  const [mediaStats, setMediaStats] = useState<Record<string, { likes: number; views: number; downloads: number; shares: number }>>({}); // ✅ Track stats locally
  const containerRef = useRef<HTMLDivElement>(null);
  // ✅ Cache blobs for instant sharing (fixes permission denied error)
  const blobCache = useRef<Map<string, Blob>>(new Map());

  useEffect(() => {
    // Load liked media from localStorage
    const saved = localStorage.getItem("user_favorites");
    if (saved) {
      setLikedMedia(new Set(JSON.parse(saved)));
    }

    // ✅ FIX: Load persisted like counts from localStorage, merge with media data
    const savedLikeCounts = localStorage.getItem("wallpaper_like_counts");
    const persistedLikes: Record<string, number> = savedLikeCounts ? JSON.parse(savedLikeCounts) : {};
    
    const initialStats: Record<string, { likes: number; views: number; downloads: number; shares: number }> = {};
    media.forEach(item => {
      initialStats[item.id] = {
        // ✅ Use persisted like count if available, otherwise use the count from media
        likes: persistedLikes[item.id] !== undefined ? persistedLikes[item.id] : (item.likes || 0),
        views: item.views || 0,
        downloads: item.downloads || 0,
        shares: item.shares || 0,
      };
    });
    setMediaStats(initialStats);

    // ✅ Pre-fetch blobs for current and nearby images (for instant sharing)
    const prefetchBlobs = async () => {
      const indicesToPrefetch = [
        initialIndex,
        initialIndex - 1,
        initialIndex + 1,
      ].filter(i => i >= 0 && i < media.length);

      for (const index of indicesToPrefetch) {
        const item = media[index];
        if (item && !blobCache.current.has(item.id)) {
          try {
            const response = await fetch(item.storage_path);
            const blob = await response.blob();
            blobCache.current.set(item.id, blob);
          } catch (error) {
            console.error(`Error prefetching blob for ${item.id}:`, error);
          }
        }
      }
    };
    
    prefetchBlobs();

    // ✅ Scroll to the correct initial image
    setTimeout(() => {
      if (containerRef.current) {
        const cardHeight = window.innerHeight;
        containerRef.current.scrollTop = initialIndex * cardHeight;
      }
    }, 0);

    // Track view when component mounts
    if (media[currentIndex]) {
      trackView(media[currentIndex].id);
    }

    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []); // ✅ Run only once on mount

  useEffect(() => {
    // Track view when index changes
    if (media[currentIndex]) {
      trackView(media[currentIndex].id);
      
      // ✅ Prefetch adjacent images when scrolling
      const prefetchAdjacent = async () => {
        const indicesToPrefetch = [
          currentIndex - 1,
          currentIndex + 1,
        ].filter(i => i >= 0 && i < media.length);

        for (const index of indicesToPrefetch) {
          const item = media[index];
          if (item && !blobCache.current.has(item.id)) {
            try {
              const response = await fetch(item.storage_path);
              const blob = await response.blob();
              blobCache.current.set(item.id, blob);
            } catch (error) {
              console.error(`Error prefetching blob for ${item.id}:`, error);
            }
          }
        }
      };
      
      prefetchAdjacent();
    }
  }, [currentIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / cardHeight);

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < media.length
    ) {
      setCurrentIndex(newIndex);
    }
  };

  const trackView = async (mediaId: string) => {
    try {
      const { analyticsTracker } = await import("../utils/analytics/useAnalytics");
      await analyticsTracker.track('wallpaper', mediaId, 'view');
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const toggleLike = async (mediaId: string) => {
    const isLiked = likedMedia.has(mediaId);
    
    try {
      // Optimistic update - update UI immediately
      setLikedMedia((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        localStorage.setItem(
          "user_favorites",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });

      // ✅ FIX: Update the like count in mediaStats immediately and persist to localStorage
      setMediaStats((prev) => {
        const currentStats = prev[mediaId] || { likes: 0, views: 0, downloads: 0, shares: 0 };
        const newLikeCount = isLiked ? Math.max(currentStats.likes - 1, 0) : currentStats.likes + 1;
        
        const updatedStats = {
          ...prev,
          [mediaId]: {
            ...currentStats,
            likes: newLikeCount,
          },
        };
        
        // ✅ Persist like counts to localStorage
        const likeCounts: Record<string, number> = {};
        Object.entries(updatedStats).forEach(([id, stats]) => {
          likeCounts[id] = stats.likes;
        });
        localStorage.setItem("wallpaper_like_counts", JSON.stringify(likeCounts));
        
        return updatedStats;
      });

      // Track like/unlike on backend using new analytics
      const { analyticsTracker } = await import("../utils/analytics/useAnalytics");
      if (isLiked) {
        await analyticsTracker.untrack('wallpaper', mediaId, 'like');
        toast.success("Removed from favorites");
      } else {
        await analyticsTracker.track('wallpaper', mediaId, 'like');
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setLikedMedia((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        localStorage.setItem(
          "user_favorites",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });
      
      // ✅ Revert the like count on error and update localStorage
      setMediaStats((prev) => {
        const currentStats = prev[mediaId] || { likes: 0, views: 0, downloads: 0, shares: 0 };
        const revertedLikeCount = isLiked ? currentStats.likes + 1 : Math.max(currentStats.likes - 1, 0);
        
        const updatedStats = {
          ...prev,
          [mediaId]: {
            ...currentStats,
            likes: revertedLikeCount,
          },
        };
        
        // ✅ Update localStorage with reverted counts
        const likeCounts: Record<string, number> = {};
        Object.entries(updatedStats).forEach(([id, stats]) => {
          likeCounts[id] = stats.likes;
        });
        localStorage.setItem("wallpaper_like_counts", JSON.stringify(likeCounts));
        
        return updatedStats;
      });
    }
  };

  const handleShare = (mediaItem: MediaItem) => {
    // ✅ Share the actual image file like GPay screenshot sharing
    // Note: Must be called directly from user click (no async delay before share)
    
    // Show loading immediately
    const loadingToast = toast.loading("Preparing image...");
    
    // Fetch and share the image
    const blob = blobCache.current.get(mediaItem.id);
    if (blob) {
      // Get file extension
      const urlParts = mediaItem.storage_path.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'jpg';
      const mimeType = blob.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      
      // Create File object
      const fileName = `Murugan_Wallpaper.${extension}`;
      const file = new File([blob], fileName, { type: mimeType });
      
      // Dismiss loading
      toast.dismiss(loadingToast);
      
      // Check if sharing is supported
      if (!navigator.share) {
        toast.error("Sharing not supported on this browser. Please use the download button.");
        return;
      }
      
      // Share using Web Share API (opens native share sheet with WhatsApp option)
      navigator.share({
        files: [file],
      })
      .then(() => {
        // Track share using analytics (only after successful share)
        import("../utils/analytics/useAnalytics").then(({ analyticsTracker }) => {
          analyticsTracker.track('wallpaper', mediaItem.id, 'share');
        });
        toast.success("Shared successfully!");
      })
      .catch((shareError: any) => {
        // User cancelled the share - don't show error
        if (shareError.name === 'AbortError') {
          return;
        }
        
        console.error("Error sharing image:", shareError);
        toast.error("Failed to share. Please try again.");
      });
    } else {
      toast.dismiss(loadingToast);
      console.error("Blob not found for sharing:", mediaItem.id);
      toast.error("Failed to load image for sharing.");
    }
  };

  const handleDownload = async (mediaItem: MediaItem) => {
    try {
      // Track download using new analytics
      const { analyticsTracker } = await import("../utils/analytics/useAnalytics");
      await analyticsTracker.track('wallpaper', mediaItem.id, 'download');
      
      toast.success("Downloading...");
      
      // Trigger download
      const link = document.createElement("a");
      link.href = mediaItem.storage_path;
      link.download = mediaItem.title || "wallpaper";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Failed to download");
    }
  };

  const currentMedia = media[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {media.map((item, index) => (
          <div
            key={item.id}
            className="h-screen w-full snap-start snap-always relative"
          >
            <WallpaperCard
              media={item}
              isActive={index === currentIndex}
            />
          </div>
        ))}
      </div>

      {/* Fixed Action Buttons - Aligned with bottom metadata */}
      {media.length > 0 && (
        <div className="fixed right-4 bottom-32 flex flex-col-reverse gap-4 z-50 p-[0px] mt-[0px] mr-[0px] mb-[-60px] ml-[0px]">
          {/* Like Button */}
          <button
            onClick={() => toggleLike(currentMedia.id)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Heart
                className={`w-6 h-6 transition-all ${
                  likedMedia.has(currentMedia.id)
                    ? "fill-red-500 text-red-500"
                    : "text-white group-hover:scale-110"
                }`}
              />
            </div>
          </button>

          {/* WhatsApp Share Button */}
          <button
            onClick={() => handleShare(currentMedia)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <WhatsAppIcon className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform" />
            </div>
          </button>

          {/* Download Button */}
          <button
            onClick={() => handleDownload(currentMedia)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Download className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}

interface WallpaperCardProps {
  media: MediaItem;
  isActive: boolean;
}

function WallpaperCard({ media, isActive }: WallpaperCardProps) {
  return (
    <div className="relative w-full h-full">
      {/* Wallpaper Image or Video */}
      <div className="absolute inset-0">
        {media.is_video || media.type === 'video' ? (
          <CustomVideoPlayer
            src={media.storage_path || media.video_url}
            isActive={isActive}
          />
        ) : (
          <ImageWithFallback
            src={media.storage_path}
            alt={media.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />
      </div>

      {/* No metadata displayed - clean wallpaper view */}
    </div>
  );
}

// Custom Video Player with Pinterest-style controls
interface CustomVideoPlayerProps {
  src: string;
  isActive: boolean;
}

function CustomVideoPlayer({ src, isActive }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Auto play when active
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  // Update current time
  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Load duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle progress bar click/drag
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressDragMove = (e: MouseEvent) => {
    if (isDragging && progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = pos * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleProgressDragMove);
      window.addEventListener('mouseup', handleProgressDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleProgressDragMove);
        window.removeEventListener('mouseup', handleProgressDragEnd);
      };
    }
  }, [isDragging, duration]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full h-full">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlayPause}
      />

      {/* Custom Controls Bar - Pinterest Style */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2.5 flex items-center gap-3">
          {/* Current Time */}
          <span className="text-white text-sm font-medium tabular-nums min-w-[45px]">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar */}
          <div
            ref={progressBarRef}
            className="flex-1 relative h-1 bg-white/30 rounded-full cursor-pointer group"
            onClick={handleProgressClick}
            onMouseDown={handleProgressDragStart}
          >
            {/* Filled Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform group-hover:scale-125"
              style={{ left: `${progress}%`, marginLeft: '-8px' }}
            />
          </div>

          {/* Duration */}
          <span className="text-white text-sm font-medium tabular-nums min-w-[45px]">
            {formatTime(duration)}
          </span>

          {/* Volume Button */}
          <button
            onClick={toggleMute}
            className="text-white hover:scale-110 transition-transform p-1"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}