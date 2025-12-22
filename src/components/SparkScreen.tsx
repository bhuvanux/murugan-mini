import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Download, Heart, RefreshCw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Button } from "./ui/button";
import { ReelView } from "./ReelView";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MuruganLoader } from "./MuruganLoader";
import { analyticsTracker } from "../utils/analytics/useAnalytics";
import { SparkleArticle, userAPI } from "../utils/api/client";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";

export function SparkScreen() {
  const [articles, setArticles] = useState<SparkleArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const viewedSparkleIds = useRef<Set<string>>(new Set());

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      console.log("[SparkScreen] Loading sparkle articles...");
      const result = await userAPI.getSparkleArticles({
        page: 1,
        limit: 50,
      });

      setArticles(result.data || []);
      console.log(`[SparkScreen] Loaded ${result.data.length} sparkle items`);
    } catch (error) {
      console.error("[SparkScreen] Error loading sparkles:", error);
      toast.error("Failed to load sparkles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const handleItemView = useCallback(async (item: SparkleArticle) => {
    if (viewedSparkleIds.current.has(item.id)) return;

    viewedSparkleIds.current.add(item.id);
    try {
      console.log(`[SparkScreen] Tracking view for sparkle: ${item.id}`);
      const result = await analyticsTracker.track("sparkle", item.id, "view");
      console.log(`[SparkScreen] View tracking result:`, result);
    } catch (error) {
      console.error("[SparkScreen] Failed to track view", error);
    }
  }, []);

  const handleLikeToggle = useCallback(
    async (item: SparkleArticle, nextLiked: boolean) => {
      try {
        console.log(`[SparkScreen] ${nextLiked ? 'Liking' : 'Unliking'} sparkle: ${item.id}`);
        if (nextLiked) {
          const result = await analyticsTracker.track("sparkle", item.id, "like");
          console.log(`[SparkScreen] Like tracking result:`, result);
          toast.success("Added to favorites");
        } else {
          const result = await analyticsTracker.untrack("sparkle", item.id, "like");
          console.log(`[SparkScreen] Unlike tracking result:`, result);
          toast.success("Removed from favorites");
        }
        return true;
      } catch (error) {
        console.error("[SparkScreen] Failed to toggle like", error);
        toast.error("Failed to update favorite. Please try again.");
        return false;
      }
    },
    [],
  );

  const handleShare = useCallback(async (article: SparkleArticle) => {
    try {
      const shareData = {
        title: article.title,
        text: article.snippet,
        url: article.url,
      };

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        article.url &&
        article.url !== "#"
      ) {
        await navigator.share(shareData);
        await analyticsTracker.track("sparkle", article.id, "share");
        toast.success("Shared successfully!");
        return;
      }

      const textToCopy = `${article.title}\n\n${article.url ?? ""}`.trim();
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        await analyticsTracker.track("sparkle", article.id, "share");
        toast.success("Link copied to clipboard!");
      } catch (copyError) {
        console.error("[SparkScreen] Failed to copy link", copyError);
        toast.error("Failed to copy link");
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
      console.error("[SparkScreen] Error sharing sparkle", error);
      toast.error("Failed to share");
    }
  }, []);

  const handleDownload = useCallback(async (article: SparkleArticle) => {
    try {
      const source = article.videoUrl || article.image;
      if (!source) {
        toast.error("No media available to download");
        return;
      }

      await analyticsTracker.track("sparkle", article.id, "download");

      const link = document.createElement("a");
      link.href = source;
      link.download = article.title || "sparkle";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("[SparkScreen] Failed to download sparkle", error);
      toast.error("Failed to download");
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#0d5e38] to-black">
        <div className="flex justify-center pt-12 pb-4">
          <MuruganLoader size={50} />
        </div>
        <div className="text-center">
          <p className="text-white text-sm">Loading divine updates...</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return <SparkleEmptyState onRefresh={loadArticles} />;
  }

  return (
    <ReelView
      items={articles}
      storageKey="sparkle_reel_likes"
      onItemView={handleItemView}
      onLikeToggle={handleLikeToggle}
      actionsClassName="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+120px)] flex flex-col-reverse gap-4"
      renderCard={({ item, isActive }) => (
        <SparkleCard article={item} isActive={isActive} />
      )}
      renderActions={({ item, isLiked, toggleLike }) => (
        <SparkleActions
          article={item}
          isLiked={isLiked}
          onToggleLike={toggleLike}
          onShare={handleShare}
          onDownload={handleDownload}
        />
      )}
    />
  );
}

function SparkleEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#0d5e38] to-black px-4">
      <div className="text-center">
        <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-white">No sparkles yet</h3>
        <p className="text-white/80 mb-4">Check back later for divine updates</p>
        <Button
          onClick={onRefresh}
          className="bg-white text-[#0d5e38] hover:bg-white/90"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

interface SparkleCardProps {
  article: SparkleArticle;
  isActive: boolean;
}

function SparkleCard({ article, isActive }: SparkleCardProps) {
  const heading = article.title?.trim() ?? "";
  const body = (article.content || article.snippet || "").trim();
  
  // AGGRESSIVE: Hide ALL titles for now to eliminate filename issue completely
  const showHeading = false; // Temporarily disable all titles
  const showBody = body.length > 0 && body !== heading;
  const showTextOverlay = showHeading || showBody;
  
  console.log('[SparkleCard] Article data:', {
    id: article.id,
    title: heading,
    content: body.substring(0, 50) + '...',
    type: article.type,
    hasVideo: !!article.videoUrl
  });

  // DEBUG: Show that text overlays are disabled
  if (heading.length > 0) {
    console.log(`[SparkleCard] FILENAME HIDDEN: "${heading}" - Text overlays disabled`);
  }

  return (
    <div className="relative h-full w-full bg-black">
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          {article.type === "video" && article.videoUrl ? (
            <SparkleVideoPlayer
              src={article.videoUrl}
              poster={article.image || undefined}
              isActive={isActive}
            />
          ) : (
            <ImageWithFallback
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent via-[65%] to-black/85" />

        {/* TEMPORARILY DISABLED ALL TEXT OVERLAYS TO ELIMINATE FILENAME ISSUE */}
        {/* {showHeading && (
          <div className="pointer-events-none absolute left-4 right-20 top-[calc(env(safe-area-inset-top,0px)+16px)]">
            <motion.h3
              layout
              className="max-w-[70%] text-sm font-semibold uppercase tracking-wide text-white drop-shadow"
            >
              {heading}
            </motion.h3>
          </div>
        )}

        {showBody && (
          <div className="pointer-events-auto absolute left-4 right-24 bottom-[calc(env(safe-area-inset-bottom,0px)+140px)]">
            <motion.p
              layout
              className="max-w-[80%] text-base font-medium leading-snug text-white drop-shadow-lg"
            >
              {body}
            </motion.p>
          </div>
        )} */}
      </div>
    </div>
  );
}

interface SparkleActionsProps {
  article: SparkleArticle;
  isLiked: boolean;
  onToggleLike: () => Promise<void>;
  onShare: (article: SparkleArticle) => Promise<void> | void;
  onDownload: (article: SparkleArticle) => Promise<void> | void;
}

function SparkleActions({
  article,
  isLiked,
  onToggleLike,
  onShare,
  onDownload,
}: SparkleActionsProps) {
  return (
    <>
      <button
        onClick={() => {
          void onToggleLike();
        }}
        className="group"
        aria-label={isLiked ? "Unlike sparkle" : "Like sparkle"}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm transition-all group-hover:bg-white/20">
          <Heart
            className={`h-6 w-6 transition-all ${
              isLiked
                ? "fill-red-500 text-red-500"
                : "text-white group-hover:scale-110"
            }`}
          />
        </div>
      </button>

      <button
        onClick={() => {
          void onShare(article);
        }}
        className="group"
        aria-label="Share sparkle"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm transition-all group-hover:bg-white/20">
          <WhatsAppIcon className="h-6 w-6 text-[#25D366] transition-transform group-hover:scale-110" />
        </div>
      </button>

      <button
        onClick={() => {
          void onDownload(article);
        }}
        className="group"
        aria-label="Download sparkle"
        disabled={!(article.videoUrl || article.image)}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm transition-all group-hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40">
          <Download className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
        </div>
      </button>
    </>
  );
}

interface SparkleVideoPlayerProps {
  src: string;
  poster?: string;
  isActive: boolean;
}

function SparkleVideoPlayer({ src, poster, isActive }: SparkleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.warn("[SparkScreen] Autoplay blocked", error);
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
      if (!isDragging) {
        video.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [isActive, isDragging]);

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (isMuted) {
        video.muted = false;
        video.volume = 1;
        setIsMuted(false);
      }
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn("[SparkScreen] Playback failed", error);
          setIsPlaying(false);
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) {
      setIsMuted((prev) => !prev);
      return;
    }

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    if (!nextMuted) {
      video.volume = 1;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn("[SparkScreen] Unmute playback blocked", error);
        });
      }
    }
    setIsMuted(nextMuted);
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    const newTime = position * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(event);
  };

  const handleProgressDragMove = (event: MouseEvent) => {
    if (!isDragging || !progressBarRef.current || !videoRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const newTime = position * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener("mousemove", handleProgressDragMove);
    window.addEventListener("mouseup", handleProgressDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleProgressDragMove);
      window.removeEventListener("mouseup", handleProgressDragEnd);
    };
  }, [isDragging]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlayPause}
      />

      <button
        onClick={toggleMute}
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform hover:scale-110"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* PERFECT YOUTUBE SHORTS PROGRESS BAR */}
      <div
        ref={progressBarRef}
        className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+6px)] left-4 right-4 z-20 h-[2px] cursor-pointer bg-white/20 rounded-full"
        onClick={handleProgressClick}
        onMouseDown={handleProgressDragStart}
      >
        <div
          className="relative h-full rounded-full bg-[#ff0000] transition-all duration-0"
          style={{ width: `${progress}%` }}
        >
          <span className="absolute -top-[3px] right-0 h-[6px] w-[6px] translate-x-1/2 rounded-full bg-white shadow-md" />
        </div>
      </div>
    </div>
  );
}