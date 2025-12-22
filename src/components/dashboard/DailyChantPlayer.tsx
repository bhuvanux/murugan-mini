import React from "react";
import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";
import kidMurugan from "@/custom-assets/kid-murugan.png";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { userAPI, YouTubeMedia } from "@/utils/api/client";

const LAST_PLAYED_MEDIA_ID_KEY = "last_played_media_id";

const extractYouTubeId = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
};

const getThumbnail = (embedUrl: string): string => {
  const youtubeId = extractYouTubeId(embedUrl);
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isTamilText(value: string) {
  return /[\u0B80-\u0BFF]/.test(value);
}

export function DailyChantPlayer() {
  const playerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [hasAudioError, setHasAudioError] = React.useState(false);
  const [isPlayerReady, setIsPlayerReady] = React.useState(false);
  const [songs, setSongs] = React.useState<YouTubeMedia[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isLargePhone, setIsLargePhone] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(() =>
    typeof window === "undefined" ? 0 : window.visualViewport?.width || window.innerWidth,
  );

  React.useEffect(() => {
    const update = () => {
      const width = window.visualViewport?.width || window.innerWidth;
      setViewportWidth(width);
      setIsLargePhone(width >= 430);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const currentSong = songs[currentIndex];
  const currentYouTubeId = currentSong?.embedUrl ? extractYouTubeId(currentSong.embedUrl) : "";
  const currentTitle = currentSong?.title || "முருகன் சஷ்டி சிறப்பு பக்தி பாடல்கள்";
  const titleFontFamily = isTamilText(currentTitle) ? "var(--font-tamil)" : "var(--font-english)";

  React.useEffect(() => {
    if (currentSong?.id) {
      localStorage.setItem(LAST_PLAYED_MEDIA_ID_KEY, currentSong.id);
    }
  }, [currentSong?.id]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await userAPI.getYouTubeMedia({ page: 1, limit: 100 });
        if (cancelled) return;

        const songsList = (result.data || []).filter((item) => {
          const cat = item.category?.toLowerCase() || "";
          return cat === "songs" || cat === "song";
        });

        setSongs(songsList);

        const lastId = localStorage.getItem(LAST_PLAYED_MEDIA_ID_KEY);
        if (lastId) {
          const idx = songsList.findIndex((s) => s.id === lastId);
          if (idx >= 0) setCurrentIndex(idx);
        }
      } catch {
        if (cancelled) return;
        setSongs([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const initPlayer = () => {
      if (!currentYouTubeId) return;
      if (playerRef.current) return;

      try {
        playerRef.current = new (window as any).YT.Player("dashboard-daily-chant-youtube-player", {
          height: "0",
          width: "0",
          videoId: currentYouTubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              setHasAudioError(false);
              setDuration(event.target.getDuration?.() || 0);
              intervalRef.current = window.setInterval(() => {
                if (playerRef.current?.getCurrentTime) {
                  try {
                    setCurrentTime(playerRef.current.getCurrentTime() || 0);
                  } catch {
                    // ignore
                  }
                }
              }, 500);
            },
            onStateChange: (event: any) => {
              const state = event.data;
              if (state === 1) {
                setIsPlaying(true);
                setDuration(event.target.getDuration?.() || 0);
              } else if (state === 2) {
                setIsPlaying(false);
              } else if (state === 0) {
                handleNext();
              }
            },
            onError: () => {
              setHasAudioError(true);
              setIsPlaying(false);
            },
          },
        });
      } catch {
        setHasAudioError(true);
      }
    };

    if (!currentYouTubeId) return;

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
      return;
    }

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") {
        try {
          prev();
        } catch {
          // ignore
        }
      }
      initPlayer();
    };
  }, [currentYouTubeId]);

  React.useEffect(() => {
    if (!isPlayerReady || !playerRef.current || !currentYouTubeId) return;

    try {
      setHasAudioError(false);
      if (isPlaying) playerRef.current.loadVideoById(currentYouTubeId);
      else playerRef.current.cueVideoById(currentYouTubeId);
      setCurrentTime(0);
      setDuration(playerRef.current.getDuration?.() || 0);
      if (isPlaying) {
        setTimeout(() => {
          try {
            playerRef.current.playVideo();
          } catch {
            // ignore
          }
        }, 100);
      }
    } catch {
      setHasAudioError(true);
      setIsPlaying(false);
    }
  }, [currentYouTubeId, isPlayerReady]);

  const togglePlay = () => {
    if (!playerRef.current || !isPlayerReady || hasAudioError) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {
      setHasAudioError(true);
      setIsPlaying(false);
    }
  };

  const restart = () => {
    if (!playerRef.current || !isPlayerReady || hasAudioError) return;
    try {
      playerRef.current.seekTo(0);
      setCurrentTime(0);
    } catch {
      setHasAudioError(true);
      setIsPlaying(false);
    }
  };

  const onSeek = (value: number) => {
    if (!playerRef.current || !isPlayerReady || hasAudioError) return;
    if (!Number.isFinite(value)) return;
    try {
      playerRef.current.seekTo(value);
      setCurrentTime(value);
    } catch {
      setHasAudioError(true);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (songs.length <= 1) return;
    setCurrentIndex((prev) => {
      const next = prev + 1;
      return next >= songs.length ? 0 : next;
    });
  };

  const handlePrevious = () => {
    if (songs.length <= 1) return;
    if (currentTime > 3) {
      restart();
      return;
    }
    setCurrentIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? songs.length - 1 : next;
    });
  };

  const isCompactPhone = viewportWidth > 0 && viewportWidth < 360;
  const titleFontSize = isLargePhone ? 18 : isCompactPhone ? 14 : 16;
  const timeFontSize = isLargePhone ? 18 : isCompactPhone ? 14 : 16;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-[0px_10px_28px_rgba(0,0,0,0.10)] border border-black/10 overflow-hidden">
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="rounded-xl overflow-hidden bg-[#F2FFF6] border border-black/10 shrink-0 w-12 h-12 sm:w-14 sm:h-14"
          >
            <ImageWithFallback
              src={currentSong?.thumbnail || (currentSong?.embedUrl ? getThumbnail(currentSong.embedUrl) : kidMurugan)}
              alt=""
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-gray-900"
              style={{ fontFamily: titleFontFamily, fontSize: titleFontSize, lineHeight: 1.15 }}
            >
              {currentTitle}
            </div>
            <div
              className="text-gray-900 mt-1"
              style={{ fontFamily: "var(--font-english)", fontSize: timeFontSize, lineHeight: 1.15 }}
            >
              {formatTime(currentTime)}/{formatTime(duration || 0)}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="relative">
            <div
              className="w-full overflow-hidden"
              style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.15)" }}
            >
              <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "#0d5e38" }} />
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={hasAudioError || duration === 0 || !isPlayerReady}
              className="absolute inset-0 w-full h-full opacity-0"
              aria-label="Seek"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8 text-gray-900">
          <button type="button" className="p-1.5 sm:p-2" aria-label="Shuffle" disabled={hasAudioError}>
            <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            type="button"
            className="p-1.5 sm:p-2"
            aria-label="Previous"
            disabled={hasAudioError}
            onClick={handlePrevious}
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={hasAudioError || !isPlayerReady}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-sm ${
              hasAudioError ? "bg-gray-200 text-gray-400" : "bg-black text-white"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </button>

          <button type="button" className="p-1.5 sm:p-2" aria-label="Next" disabled={hasAudioError} onClick={handleNext}>
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button type="button" onClick={restart} className="p-1.5 sm:p-2" aria-label="Repeat" disabled={hasAudioError}>
            <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div style={{ position: "absolute", top: -9999, left: -9999 }}>
          <div id="dashboard-daily-chant-youtube-player" />
        </div>
      </div>
    </div>
  );
}
