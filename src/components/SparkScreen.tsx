// USER PANEL - UPDATED SparkScreen.tsx
// Replace your existing SparkScreen.tsx with this file

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Heart,
  Sparkles,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { userAPI, SparkleArticle } from "../utils/api/client";
import { MuruganLoader } from "./MuruganLoader";
import { analyticsTracker } from "../utils/analytics/useAnalytics";
import { SponsoredCard } from "./ui/overlays/SponsoredCard";
import { InterstitialAdModal } from "./ui/overlays/InterstitialAdModal";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { SwipeUpGuide } from "./ui/overlays/SwipeUpGuide";
import { shuffleArray } from "../utils/shuffle";

export function SparkScreen() {
  const [articles, setArticles] = useState<SparkleArticle[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedArticles, setLikedArticles] = useState<
    Set<string>
  >(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  // Cache blobs for instant sharing and downloading
  const blobCache = useRef<Map<string, Blob>>(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingDownloadItem, setPendingDownloadItem] = useState<SparkleArticle | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  // Global Mute State
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);

  // Helper to get total count including ads
  const adFrequency = 5;
  const getTotalCountWithAds = () => {
    if (articles.length === 0) return 0;
    return articles.length + Math.floor(articles.length / adFrequency);
  };

  useEffect(() => {
    loadArticles();
    // Load liked articles from localStorage
    const saved = localStorage.getItem("likedArticles");
    if (saved) {
      setLikedArticles(new Set(JSON.parse(saved)));
    }

    // Check if user has seen the swipe tutorial
    const hasSeenTutorial = localStorage.getItem("hasSeenSwipeTutorial");
    console.log("[SparkScreen] Checking tutorial status. Has seen:", hasSeenTutorial);

    if (!hasSeenTutorial) {
      console.log("[SparkScreen] Showing Swipe Up Guide");
      // Small delay to ensure loading is done or just show it
      setShowGuide(true);
    }
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      console.log(
        "[SparkScreen] Loading articles from admin backend...",
      );

      const result = await userAPI.getSparkleArticles({
        page: 1,
        limit: 50,
      });

      console.log(
        `[SparkScreen] Loaded ${result.data.length} articles`,
      );

      // Pinterest-style shuffle: randomize content on every load
      const shuffledArticles = shuffleArray(result.data || []);
      console.log('[SparkScreen] ✨ Shuffled articles for fresh discovery');

      setArticles(shuffledArticles);

      // Pre-fetch first few blobs
      if (shuffledArticles && shuffledArticles.length > 0) {
        prefetchBlobs(shuffledArticles.slice(0, 3));
      }

      if (shuffledArticles.length === 0) {
        console.log('No articles yet. Check back later!');
      } else {
        // Track view for the initial article
        analyticsTracker.track('sparkle', shuffledArticles[0].id, 'view').catch(console.warn);
      }
    } catch (error) {
      console.error("Error loading articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const prefetchBlobs = async (itemsToCache: SparkleArticle[]) => {
    for (const item of itemsToCache) {
      const mediaUrl = item.videoUrl || item.image;
      if (mediaUrl && !blobCache.current.has(item.id)) {
        try {
          fetch(mediaUrl)
            .then(r => r.blob())
            .then(blob => {
              blobCache.current.set(item.id, blob);
            })
            .catch(err => console.warn(`[SparkScreen] Prefetch failed for ${item.id}:`, err));
        } catch (e) {
          // Ignore prefetch errors
        }
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / cardHeight);

    // Dismiss guide on scroll if visible
    if (showGuide && scrollTop > 150) {
      setShowGuide(false);
      localStorage.setItem("hasSeenSwipeTutorial", "true");
    }

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < getTotalCountWithAds()
    ) {
      setCurrentIndex(newIndex);

      // Track view if it's an article
      const newItem = items[newIndex];
      if (newItem?.type === 'article' && newItem.data) {
        analyticsTracker.track('sparkle', newItem.data.id, 'view').catch(console.warn);
      }

      // Prefetch next items
      const nextItems = items
        .slice(newIndex + 1, newIndex + 3)
        .filter(item => item.type === 'article' && item.data)
        .map(item => item.data!);
      prefetchBlobs(nextItems);
    }
  };

  const toggleLike = async (articleId: string) => {
    const isLiked = likedArticles.has(articleId);

    try {
      // Optimistic update
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(articleId);
        } else {
          newSet.add(articleId);
        }
        localStorage.setItem(
          "likedArticles",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });

      // Track like/unlike on backend using new unified analytics
      if (isLiked) {
        await analyticsTracker.untrack('sparkle', articleId, 'like');
        toast.success("Removed from favorites");
      } else {
        await analyticsTracker.track('sparkle', articleId, 'like');
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(articleId);
        } else {
          newSet.delete(articleId);
        }
        localStorage.setItem(
          "likedArticles",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });
    }
  };

  const handleWhatsAppShare = async (article: SparkleArticle) => {
    try {
      // Track share using new unified analytics
      await analyticsTracker.track('sparkle', article.id, 'share');

      const shareText = `${article.title}\n\n${article.snippet || article.content || ''}`;
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Use native share on mobile
        await Share.share({
          title: article.title,
          text: shareText,
          dialogTitle: 'Share via WhatsApp',
        });
        toast.success("Shared successfully!");
      } else {
        // Use WhatsApp web URL on web
        const encodedText = encodeURIComponent(shareText);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
        toast.success("Opening WhatsApp...");
      }
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      toast.error("Failed to share");
    }
  };

  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingArticleId, setPendingArticleId] = useState<string | null>(null);

  const handleReadFull = async (url: string, articleId: string) => {
    if (url && url !== "#") {
      // Show interstitial every 2nd read attempt
      const readCount = parseInt(localStorage.getItem('readCount') || '0');
      if (readCount % 2 === 0 && readCount > 0) {
        setPendingUrl(url);
        setPendingArticleId(articleId);
        setShowAdModal(true);
        localStorage.setItem('readCount', (readCount + 1).toString());
      } else {
        await executeRead(url, articleId);
        localStorage.setItem('readCount', (readCount + 1).toString());
      }
    }
  };

  const executeRead = async (url: string, articleId: string) => {
    // Track view/read using new unified analytics
    await analyticsTracker.track('sparkle', articleId, 'read');
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAdFinished = () => {
    if (pendingUrl && pendingArticleId) {
      executeRead(pendingUrl, pendingArticleId);
      setPendingUrl(null);
      setPendingArticleId(null);
    } else if (pendingDownloadItem) {
      handleDownloadConfirm(pendingDownloadItem);
      setPendingDownloadItem(null);
    }
  };

  const handleDownloadClick = (article: SparkleArticle) => {
    setPendingDownloadItem(article);
    setShowAdModal(true);

    // Ensure blob is cached
    const mediaUrl = article.videoUrl || article.image;
    if (mediaUrl && !blobCache.current.has(article.id)) {
      fetch(mediaUrl)
        .then(r => r.blob())
        .then(b => blobCache.current.set(article.id, b))
        .catch(e => console.error("[SparkScreen] Download prefetch failed", e));
    }
  };

  const handleDownloadConfirm = async (article: SparkleArticle) => {
    try {
      setIsDownloading(true);
      const mediaUrl = article.videoUrl || article.image;
      if (!mediaUrl) throw new Error("No media URL found");

      // toast.info("Preparing download..."); // Removed as per request

      let blob = blobCache.current.get(article.id);
      if (!blob) {
        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error("Fetch failed");
        blob = await response.blob();
        blobCache.current.set(article.id, blob);
      }

      // Sniff mime type
      const buffer = await blob.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let extension = article.type === 'video' ? 'mp4' : 'jpg';
      let mimeType = blob.type;

      // JPEG
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        extension = 'jpg';
        mimeType = 'image/jpeg';
      }
      // MP4
      else if (Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ').includes('66 74 79 70')) {
        extension = 'mp4';
        mimeType = 'video/mp4';
      }

      const cleanBlob = new Blob([blob], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(cleanBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const cleanTitle = (article.title || "Murugan_Sparkle")
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 30);

      const fileName = `${cleanTitle}.${extension}`;
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const reader = new FileReader();
        reader.readAsDataURL(cleanBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents,
              recursive: true
            });
            toast.success(`Saved to Documents/${fileName}`);
            analyticsTracker.track('sparkle', article.id, 'download').catch(console.warn);
          } catch (err) {
            console.error("Native filesystem error:", err);
            toast.error("Failed to save to device.");
          }
        };
        return;
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      toast.success("Download started!");

      // Track download
      analyticsTracker.track('sparkle', article.id, 'download').catch(console.warn);

    } catch (error) {
      console.error("[SparkScreen] Download failed:", error);
      toast.error("Download failed. Opening in browser...");
      window.open(article.videoUrl || article.image, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Divine Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d5e38] to-black opacity-80" />

        <div className="z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#0d5e38] blur-xl opacity-50 rounded-full animate-pulse" />
            <MuruganLoader size={60} />
          </div>
          <p className="text-white/80 text-sm font-medium animate-pulse" style={{ fontFamily: 'var(--font-english)' }}>
            Fetching divine updates...
          </p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#0d5e38] to-black px-4">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">
            No articles yet
          </h3>
          <p className="text-white/80 mb-4">
            Check back later for divine updates
          </p>
          <Button
            onClick={loadArticles}
            className="bg-white text-[#0d5e38] hover:bg-white/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Create interleaved items list (articles and ads)
  const items: { type: 'article' | 'ad'; data?: SparkleArticle; id: string }[] = [];
  let articleCount = 0;
  for (let i = 0; i < articles.length; i++) {
    items.push({ type: 'article', data: articles[i], id: articles[i].id });
    articleCount++;
    if (articleCount % adFrequency === 0) {
      items.push({ type: 'ad', id: `ad-${articleCount}` });
    }
  }

  const currentItem = items[currentIndex];

  // Global Mute State


  const toggleGlobalMute = () => {
    setIsGlobalMuted(prev => !prev);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-black">
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
        {items.map((item, index) => (
          <div
            key={item.id}
            className="h-screen w-full snap-start snap-always relative overflow-hidden"
          >
            {item.type === 'article' && item.data ? (
              <ArticleCard
                article={item.data}
                isActive={index === currentIndex}
                formatDate={formatDate}
                isDownloading={isDownloading}
                isMuted={isGlobalMuted}
              />
            ) : (
              <SponsoredCard isActive={index === currentIndex} />
            )}
          </div>
        ))}
      </div>

      {/* Global Mute Toggle - Fixed Top Right - Only show for videos */}
      {(() => {
        if (!currentItem || currentItem.type !== 'article' || !currentItem.data) return null;
        const article = currentItem.data;
        const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
        const isVideoType = article.type === 'video';
        const imageUrl = article.image || article.thumbnailUrl || '';
        const isVideoExtension = imageUrl.match(/\.(mp4|webm|mov|avi)$/i);
        const shouldShowMute = (hasVideoUrl && isVideoType) || isVideoExtension;

        if (!shouldShowMute) return null;

        return (
          <button
            onClick={toggleGlobalMute}
            className="fixed top-20 right-4 p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white z-50 hover:bg-black/60 transition-colors"
            style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
          >
            {isGlobalMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        );
      })()}

      {/* Fixed Action Buttons - Aligned with description bottom */}
      {items.length > 0 && !showAdModal && currentItem?.type === 'article' && currentItem.data && (
        <div className="fixed right-4 flex flex-col-reverse gap-4 z-50 p-[0px] m-[0px]" style={{ bottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
          {/* Like Button */}
          <button
            onClick={() => toggleLike(currentItem.data!.id)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Heart
                className={`w-6 h-6 transition-all ${likedArticles.has(currentItem.data!.id)
                  ? "fill-red-500 text-red-500"
                  : "text-white group-hover:scale-110"
                  }`}
              />
            </div>
          </button>

          {/* WhatsApp Share Button */}
          <button
            onClick={() => handleWhatsAppShare(currentItem.data!)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <WhatsAppIcon className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform" />
            </div>
          </button>

          {/* Read Article Button (Now Download Icon) */}
          <button
            onClick={() => handleDownloadClick(currentItem.data!)}
            className="group"
            disabled={isDownloading}
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              {isDownloading ? (
                <RefreshCw className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              )}
            </div>
          </button>
        </div>
      )}

      {showGuide && (
        <SwipeUpGuide
          onDismiss={() => {
            setShowGuide(false);
            localStorage.setItem("hasSeenSwipeTutorial", "true");
          }}
        />
      )}

      <InterstitialAdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onActionTrigger={handleAdFinished}
        title="Preparing your content..."
        description="Please wait a few moments for the download to begin"
        actionLabel="DOWNLOAD NOW"
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}

interface ArticleCardProps {
  article: SparkleArticle;
  isActive: boolean;
  formatDate: (date: string) => string;
  isDownloading: boolean;
  isMuted: boolean;
}

function ArticleCard({
  article,
  isActive,
  formatDate,
  isDownloading,
  isMuted,
}: ArticleCardProps) {
  return (
    <div className="relative w-full h-full">
      {/* Hero Content (Image or Video) with Gradient Overlay */}
      <div className="absolute inset-0 bg-black">
        {/* Detect if it's a video by checking videoUrl OR file extension */}
        {(() => {
          const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
          const isVideoType = article.type === 'video';
          const imageUrl = article.image || article.thumbnailUrl || '';

          // Reverting to robust detection (checking extension too)
          // valid MP4/WEBM etc in URL means it likely IS a video even if type says otherwise
          const isVideoExtension = imageUrl.match(/\.(mp4|webm|mov|avi)$/i);

          const shouldRenderVideo = (hasVideoUrl && isVideoType) || isVideoExtension;

          console.log('[SparkScreen] Rendering logic:', {
            id: article.id,
            hasVideoUrl,
            isVideoType,
            isVideoExtension: !!isVideoExtension,
            shouldRenderVideo,
            imageUrl: article.image,
            videoUrl: article.videoUrl
          });

          if (shouldRenderVideo) {
            return (
              <SparkVideoPlayer
                src={(hasVideoUrl ? article.videoUrl : imageUrl) || ''}
                isActive={isActive}
                poster={article.thumbnailUrl || article.image}
                isDownloading={isDownloading}
                isMuted={isMuted}
              />
            );
          } else {
            const imageSrc = article.image || article.thumbnailUrl || '';
            console.log('[SparkScreen] Rendering IMAGE with src:', imageSrc);
            return (
              <ImageWithFallback
                src={imageSrc}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            );
          }
        })()}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/95 pointer-events-none" />
      </div>

      {/* Content */}
      <div
        className="relative h-full flex flex-col justify-between p-6 pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)', paddingBottom: 'calc(180px + env(safe-area-inset-bottom))' }}
      >
        {/* Top Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags && article.tags.length > 0 &&
              article.tags.slice(0, 3).map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-[#0d5e38]/90 backdrop-blur-sm text-white text-xs font-semibold rounded-full"
                >
                  #{tag}
                </span>
              ))
            }
          </div>


        </motion.div>
      </div>

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 z-20 flex flex-col justify-end h-full pointer-events-none">
        <div className="pointer-events-auto space-y-3 max-w-[85%] animate-in slide-in-from-bottom-4 duration-500">

          {/* Title & Metadata */}
          <div>
            {/* Temporarily hidden until enabled in admin panel */}
            {/* <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#0d5e38] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border border-[#1a7448]">
                {article.category || 'Devotional'}
              </span>
              <span className="text-white/60 text-[11px] font-medium flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                <Clock className="w-3 h-3" />
                {formatDate(article.created_at)}
              </span>
            </div> */}

            {/* Title - Only show if it's a proper title, not a filename */}
            {(() => {
              const title = article.title || '';
              // Check if title looks like a filename (long alphanumeric string or has file extensions)
              const looksLikeFilename = /^[a-f0-9]{20,}$/i.test(title) ||
                title.match(/\.(jpg|jpeg|png|mp4|webm|mov)$/i) ||
                title.length > 40;

              // Only show title if it's NOT a filename
              if (!looksLikeFilename && title.trim()) {
                return (
                  <h2 className="text-white text-xl font-bold leading-tight drop-shadow-md line-clamp-3" style={{ fontFamily: 'var(--font-tamil)' }}>
                    {title}
                  </h2>
                );
              }
              return null;
            })()}
          </div>

          {/* Description - Temporarily hidden until enabled in admin panel */}
          {/* {article.description && (
            <p className="text-white/90 text-sm leading-relaxed line-clamp-2 drop-shadow-sm font-light tracking-wide opacity-90">
              {article.description}
            </p>
          )} */}

        </div>
      </div>
    </div>
  );
}

interface SparkVideoPlayerProps {
  src: string;
  isActive: boolean;
  poster?: string;
  isDownloading?: boolean;
  isMuted: boolean;
}

function SparkVideoPlayer({ src, isActive, poster, isDownloading, isMuted }: SparkVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        // Only play if not downloading (or if downloading doesn't block playback? Assuming safe)
        if (!isDownloading) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((err) => {
                console.warn("[SparkVideoPlayer] Autoplay prevented:", err);
                setIsPlaying(false);
              });
          }
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isDownloading]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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
              console.warn("[SparkVideoPlayer] Manual play failed:", err);
            });
        } else {
          setIsPlaying(true);
        }
      }
      // Show icon animation
      setShowIcon(true);
      setTimeout(() => setShowIcon(false), 1000);
    }
  };

  if (hasError) {
    return <ImageWithFallback src={poster || src} alt="Video content" className="w-full h-full object-cover" />;
  }

  return (
    <div className="relative w-full h-full" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        loop
        playsInline
        poster={poster}
        muted={isMuted} // Init with prop
        preload="metadata"
        onError={(e) => {
          console.error("[SparkVideoPlayer] Video load error:", src);
          setHasError(true);
        }}
      />

      {/* Local Mute Button Removed - Global toggle used in SparkScreen */}

      {/* Play/Pause Icon Overlay */}
      {showIcon && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in duration-200">
            {isPlaying ? (
              <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}