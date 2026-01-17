
// WALLPAPER FULL-VIEW COMPONENT
// Cloned from SparkScreen but simplified for wallpapers only
// No heading, no content/description, no date/time
// Shows: Image + Right action buttons (Like, WhatsApp, Download) + Bottom metadata

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Heart,
  ArrowLeft,
  X,
  MessageCircle,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MediaItem, userAPI } from "../utils/api/client";
import { useWallpaperAnalytics } from "../utils/analytics/useAnalytics";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { InterstitialAdModal } from "./ui/overlays/InterstitialAdModal";
// @ts-ignore
import mockAdImage from "../assets/mock_ad_murugan.png";
import { Portal } from "./ui/Portal";
import { optimizeSupabaseUrl } from "../utils/imageHelper";

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

  // Ad Modal State
  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingDownloadItem, setPendingDownloadItem] = useState<MediaItem | null>(null);

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

      // Track like/unlike on backend using new analytics (Non-blocking)
      import("../utils/analytics/useAnalytics")
        .then(({ analyticsTracker }) => {
          if (isLiked) {
            analyticsTracker.untrack('wallpaper', mediaId, 'like').catch(console.warn);
          } else {
            analyticsTracker.track('wallpaper', mediaId, 'like').catch(console.warn);
          }
        })
        .catch(console.warn);

      toast.success(isLiked ? "Removed from favorites" : "Added to favorites");
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

      // Check if sharing is supported
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Native sharing using Capacitor Share
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            // Create a temp file to share
            const fileName = `Murugan_Share_${Date.now()}.${extension}`;
            await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Cache
            });

            const fileUri = await Filesystem.getUri({
              directory: Directory.Cache,
              path: fileName
            });

            await Share.share({
              title: mediaItem.title || 'Murugan Wallpaper',
              text: 'Checkout this divine wallpaper from Tamil Kadavul Murugan app\\n\\nDownload the app: https://play.google.com/store/apps/details?id=com.tamilkadavulmurugan.app',
              url: fileUri.uri,
              dialogTitle: 'Share Wallpaper',
            });

            import("../utils/analytics/useAnalytics").then(({ analyticsTracker }) => {
              userAPI.trackShare(mediaItem.id);
              analyticsTracker.track('wallpaper', mediaItem.id, 'share');
            });
            toast.dismiss(loadingToast);
          } catch (err) {
            console.error("Native share error:", err);
            toast.dismiss(loadingToast);
            toast.error("Failed to share image.");
          }
        };
        return;
      }

      if (!navigator.share) {
        toast.error("Sharing not supported on this browser. Please use the download button.");
        return;
      }

      // Share using Web Share API (opens native share sheet with WhatsApp option)
      navigator.share({
        title: mediaItem.title || 'Murugan Wallpaper',
        text: 'Checkout this divine wallpaper from Tamil Kadavul Murugan app\\n\\nDownload: https://play.google.com/store/apps/details?id=com.tamilkadavulmurugan.app',
        files: [file],
      })
        .then(() => {
          // Track share using analytics (only after successful share)
          import("../utils/analytics/useAnalytics").then(({ analyticsTracker }) => {
            userAPI.trackShare(mediaItem.id);
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

  const startDownloadProcess = (mediaItem: MediaItem) => {
    console.log("[WallpaperFullView] Starting download process for:", mediaItem.id);
    setPendingDownloadItem(mediaItem);
    setShowAdModal(true);

    // Silent prefetch if not in cache to ensure instant download after ad
    if (!blobCache.current.has(mediaItem.id)) {
      console.log("[WallpaperFullView] Prefetching blob for:", mediaItem.id);
      fetch(mediaItem.storage_path)
        .then(r => r.blob())
        .then(b => {
          blobCache.current.set(mediaItem.id, b);
          console.log("[WallpaperFullView] Blob prefetched successfully during ad");
        })
        .catch(err => console.error("[WallpaperFullView] Prefetch failed", err));
    }
  };

  const handleDownloadConfirm = async (itemOverride?: MediaItem) => {
    // Robust fallback: If pending item is missing (race condition), use current item
    const mediaItem = itemOverride || pendingDownloadItem || media[currentIndex];

    if (!mediaItem) {
      console.error("[WallpaperFullView] No media item to download");
      toast.error("Error: Could not find image");
      return;
    }

    try {
      console.log("[WallpaperFullView] Starting download for:", mediaItem.id);

      // Generate user-friendly display name for filename (not for toast)
      const displayName = (() => {
        const title = (mediaItem.title || "").trim();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(title);
        return (!title || isUUID || title.length < 3) ? "wallpaper" : title;
      })();

      // No toast here - InterstitialAdModal already shows "Preparing your content"

      // 1. Get Blob (likely cached now)
      let blob = blobCache.current.get(mediaItem.id);

      if (!blob) {
        console.log("[WallpaperFullView] Blob not in cache, fetching...", mediaItem.storage_path);
        // Fallback fetch if not cached yet
        // Add cache-busting timestamp to ensure fresh headers
        const fetchUrl = `${mediaItem.storage_path}${mediaItem.storage_path.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("Fetch failed");
        blob = await response.blob();
        blobCache.current.set(mediaItem.id, blob);
      }

      console.log("[WallpaperFullView] Blob ready, creating URL:", {
        size: blob.size,
        type: blob.type
      });

      // 2. Identify Format using Magic Numbers (MIME Sniffing)
      // This is crucial if the server/browser returns generic "application/octet-stream"
      const buffer = await blob.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const header = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

      console.log("[WallpaperFullView] Sniffing magic numbers:", header);

      let extension = 'jpg';
      let mimeType = blob.type;

      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        extension = 'jpg';
        mimeType = 'image/jpeg';
      }
      // PNG: 89 50 4E 47
      else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        extension = 'png';
        mimeType = 'image/png';
      }
      // WEB P: 52 49 46 46 (RIFF) + 57 45 42 50 (WEBP)
      else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        extension = 'webp';
        mimeType = 'image/webp';
      }
      // GIF: 47 49 46 38
      else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        extension = 'gif';
        mimeType = 'image/gif';
      }
      // MP4: 00 00 00 ... 66 74 79 70 (ftyp)
      else if (header.includes('66 74 79 70')) {
        extension = 'mp4';
        mimeType = 'video/mp4';
      }
      else {
        // Fallback to existing logic if sniffing failed
        const mimeToExtMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'video/mp4': 'mp4'
        };
        extension = mimeToExtMap[blob.type] || 'jpg';
      }

      console.log("[WallpaperFullView] Final detection:", { extension, mimeType });

      // 3. Create a clean Blob with the correct MIME type (fixes "corrupted" alerts in some OSes)
      const cleanBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(cleanBlob);
      const link = document.createElement("a");
      link.href = url;

      // Use a consistent, descriptive base name
      // If title is a UUID or missing, use a generic name
      let baseName = (mediaItem.title || "").trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(baseName);

      if (!baseName || isUUID || baseName.length < 3) {
        baseName = "kadavul_murugan";
      }

      const cleanTitle = baseName
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 50);

      link.download = `${cleanTitle}_${mediaItem.id.substring(0, 4)}.${extension}`;

      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Native Android/iOS Download
        const reader = new FileReader();
        reader.readAsDataURL(cleanBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const fileName = `${cleanTitle}_${mediaItem.id.substring(0, 4)}.${extension}`;

            // On Android, we save to Documents or a public-ish folder
            // Note: Saving to Gallery directly requires extra plugins or intent
            // but writing to Documents is usually accessible to the user
            await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents,
              recursive: true
            });

            toast.success(`Saved to Documents/${fileName}`);

            // Record analytics
            import("../utils/analytics/useAnalytics").then(({ analyticsTracker }) => {
              analyticsTracker.track('wallpaper', mediaItem.id, 'download').catch(console.warn);
            });
          } catch (err) {
            console.error("Native filesystem error:", err);
            toast.error("Failed to save image to device.");
          }
        };
        return;
      }

      document.body.appendChild(link);
      console.log("[WallpaperFullView] Triggering download link for:", link.download);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      // 3. Track analytics (Fire and forget)
      import("../utils/analytics/useAnalytics")
        .then(({ analyticsTracker }) => {
          analyticsTracker.track('wallpaper', mediaItem.id, 'download').catch(console.warn);
        });

    } catch (error: any) {
      console.error("[WallpaperFullView] Download Error (Fetch failed):", error);

      // FALLBACK 1: Try Canvas-based download (Bypasses some CORS fetch issues)
      try {
        if (!mediaItem.is_video && mediaItem.type !== 'video') {
          toast.info("Retrying with secure canvas proxy...");
          const canvasBlob = await downloadImageViaCanvas(mediaItem.storage_path);
          if (canvasBlob) {
            const extension = canvasBlob.type.split('/')[1] || 'jpg';
            triggerBlobDownload(canvasBlob, mediaItem, extension);
            return;
          }
        }
      } catch (canvasErr) {
        console.error("[WallpaperFullView] Canvas fallback failed:", canvasErr);
      }

      // FALLBACK 2: Forced Direct Download (Last Resort)
      toast.error("Enhanced download failed. Trying direct browser save...");

      // Try to append download param if it's a Supabase URL
      const extension = mediaItem.storage_path.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${(mediaItem.title || 'wallpaper').substring(0, 20)}.${extension}`;
      const fallbackUrl = mediaItem.storage_path.includes('?')
        ? `${mediaItem.storage_path}&download=${encodeURIComponent(fileName)}`
        : `${mediaItem.storage_path}?download=${encodeURIComponent(fileName)}`;

      window.open(fallbackUrl, '_blank');
    }
  };

  /**
   * Helper to download images via Canvas (CORS bypass for <img>)
   */
  const downloadImageViaCanvas = (url: string): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  /**
   * Helper to trigger the actual browser download action
   */
  const triggerBlobDownload = (blob: Blob, mediaItem: MediaItem, extension: string) => {
    const cleanBlob = new Blob([blob], { type: blob.type });
    const url = window.URL.createObjectURL(cleanBlob);
    const link = document.createElement("a");
    link.href = url;

    let baseName = (mediaItem.title || "").trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(baseName);
    if (!baseName || isUUID || baseName.length < 3) {
      baseName = "kadavul_murugan";
    }

    const cleanTitle = baseName.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    link.download = `${cleanTitle}.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 2000);

    toast.success("Download started!");
  };

  const handleDownloadClick = (mediaItem: MediaItem) => {
    console.log("[WallpaperFullView] Download clicked for:", mediaItem.id);
    startDownloadProcess(mediaItem);
  };

  const currentMedia = media[currentIndex];

  return (
    <Portal>
      <div className="fixed inset-0 z-[2000] bg-black">
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
        {media.length > 0 && !showAdModal && (
          <div className="fixed right-4 bottom-32 flex flex-col-reverse gap-4 z-[2100]">
            {/* Like Button */}
            <button
              onClick={() => toggleLike(currentMedia.id)}
              className="group"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
                <Heart
                  className={`w-6 h-6 transition-all ${likedMedia.has(currentMedia.id)
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

            {/* Download Button - Direct Download */}
            <button
              onClick={() => handleDownloadClick(currentMedia)}
              className="group"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
                <Download className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* Top Gradient for visibility */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-[2050] pointer-events-none" />

        {/* Back / Close Button - Positioned safely below status bar */}
        {!showAdModal && (
          <button
            onClick={() => {
              console.log("[WallpaperFullView] Close/Back button clicked");
              onClose();
            }}
            className="absolute top-12 left-4 z-[3010] p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-lg flex items-center justify-center group"
            style={{
              top: 'calc(env(safe-area-inset-top, 24px) + 16px)'
            }}
          >
            <ArrowLeft className="w-6 h-6 text-white drop-shadow-md group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />

        {/* Ad Modal for Downloads */}
        <InterstitialAdModal
          isOpen={showAdModal}
          onClose={() => setShowAdModal(false)}
          onActionTrigger={() => {
            if (pendingDownloadItem) {
              handleDownloadConfirm(pendingDownloadItem);
            }
          }}
          title="Preparing your wallpaper"
          description="Please wait a few moments for the download to begin"
          actionLabel="Download Now"
          adImage={mockAdImage}
        />
      </div>
    </Portal>
  );

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
              src={media.storage_path || media.video_url || ""}
              isActive={isActive}
            />
          ) : (
            <ImageWithFallback
              src={optimizeSupabaseUrl(media.storage_path, 1200)}
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
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((err) => {
                console.warn("[WallpaperFullView] Video autoplay failed:", err);
                // Fallback to muted autoplay
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  const retryPromise = videoRef.current.play();
                  if (retryPromise !== undefined) {
                    retryPromise
                      .then(() => setIsPlaying(true))
                      .catch(e => console.error("[WallpaperFullView] Muted autoplay also failed:", e));
                  }
                }
              });
          } else {
            setIsPlaying(true);
          }
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
          setIsPlaying(false);
        } else {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((err) => {
                console.warn("[WallpaperFullView] Manual play failed:", err);
                toast.error("Unable to play video");
              });
          } else {
            setIsPlaying(true);
          }
        }
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
          muted
          preload="metadata"
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
}