// Spotify-style Music Player with Mini & Full View
// Mobile-first YouTube player with playlist support
import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  List,
  X,
  ChevronDown,
} from "lucide-react";

export interface Song {
  id: string;
  title: string;
  description?: string;
  youtubeId?: string;
  embedUrl?: string;
  thumbnail?: string;
  duration?: string;
  tags?: string[];
}

export interface MusicPlayerProps {
  songs: Song[];
  autoPlay?: boolean;
  onClose?: () => void;
}

// Helper to extract YouTube ID
const extractYouTubeId = (song: Song): string => {
  const value = song.youtubeId || song.embedUrl || song.id || "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const p of patterns) {
    const match = value.match(p);
    if (match) return match[1];
  }

  return "";
};

export function MusicPlayer({ songs, autoPlay = false, onClose }: MusicPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "one" | "all">("all");
  const [shuffle, setShuffle] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const currentSong = songs[currentIndex];
  const currentYouTubeId = currentSong ? extractYouTubeId(currentSong) : "";

  // Load YouTube Iframe API
  useEffect(() => {
    if ((window as any).YT?.Player) {
      initPlayer();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);

    (window as any).onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, []);

  // Handle track change
  useEffect(() => {
    if (isPlayerReady && playerRef.current && currentYouTubeId) {
      playerRef.current.loadVideoById(currentYouTubeId);
      if (isPlaying) playerRef.current.playVideo();
    }
  }, [currentIndex, isPlayerReady]);

  const initPlayer = () => {
    if (!currentYouTubeId) return;

    playerRef.current = new (window as any).YT.Player("youtube-player-frame", {
      height: "0",
      width: "0",
      videoId: currentYouTubeId,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (e: any) => {
          setIsPlayerReady(true);
          setDuration(e.target.getDuration());
          if (autoPlay) {
            e.target.playVideo();
            setIsPlaying(true);
          }
          intervalRef.current = setInterval(() => {
            if (playerRef.current?.getCurrentTime) {
              setCurrentTime(playerRef.current.getCurrentTime());
            }
          }, 1000);
        },
        onStateChange: (e: any) => {
          if (e.data === 1) setIsPlaying(true);
          if (e.data === 2) setIsPlaying(false);
          if (e.data === 0) handleNext();
        },
      },
    });
  };

  const togglePlay = () => {
    if (!playerRef.current || !isPlayerReady) return;

    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const handleNext = () => {
    if (repeat === "one") {
      playerRef.current.seekTo(0);
      return;
    }

    let next = currentIndex + 1;
    if (next >= songs.length) {
      if (repeat === "all") next = 0;
      else return;
    }
    setCurrentIndex(next);
  };

  const handlePrevious = () => {
    if (currentTime > 3) {
      playerRef.current.seekTo(0);
      return;
    }
    let prev = currentIndex - 1;
    if (prev < 0) prev = songs.length - 1;
    setCurrentIndex(prev);
  };

  const seekTo = (value: number) => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(value);
      setCurrentTime(value);
    }
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden YouTube Iframe */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        <div id="youtube-player-frame"></div>
      </div>

      {/* FULL PLAYER */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black text-white z-[100] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <button onClick={() => setIsExpanded(false)}>
              <ChevronDown className="w-6 h-6" />
            </button>
            <h2>Now Playing</h2>
            {onClose && (
              <button onClick={onClose}>
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Song Visual */}
          <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center text-center">
            {currentSong?.thumbnail ? (
              <img
                src={currentSong.thumbnail}
                className="w-64 h-64 object-cover rounded-lg mb-6"
              />
            ) : (
              <div className="w-64 h-64 bg-gray-700 rounded-lg mb-6 flex items-center justify-center">
                <Play className="w-20 h-20 text-white/30" />
              </div>
            )}

            <h1 className="text-2xl font-semibold mb-2">{currentSong?.title}</h1>
            <p className="text-white/60 mb-6">{currentSong?.description}</p>

            {/* Progress */}
            <div className="w-full max-w-md">
              <div className="h-1 bg-white/20 rounded">
                <div
                  className="h-full bg-white rounded"
                  style={{ width: `${progress}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="absolute opacity-0 w-full h-full"
                />
              </div>

              <div className="flex justify-between text-xs text-white/60 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <button onClick={() => setShuffle(!shuffle)}>
                <Shuffle className="w-6 h-6" />
              </button>

              <button onClick={handlePrevious}>
                <SkipBack className="w-8 h-8" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center"
              >
                {isPlaying ? <Pause /> : <Play className="ml-1" />}
              </button>

              <button onClick={handleNext}>
                <SkipForward className="w-8 h-8" />
              </button>

              <button
                onClick={() =>
                  setRepeat(repeat === "none" ? "all" : repeat === "all" ? "one" : "none")
                }
              >
                <Repeat className="w-6 h-6" />
              </button>
            </div>

            {/* Playlist Toggle */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="mt-8 px-4 py-2 rounded-full bg-white/10"
            >
              <List className="inline w-5 h-5 mr-2" />
              Playlist ({songs.length})
            </button>

            {/* Playlist */}
            {showPlaylist && (
              <div className="w-full max-w-lg mt-4 space-y-2">
                {songs.map((song, idx) => (
                  <button
                    key={song.id}
                    className={`flex items-center p-3 rounded-lg ${
                      idx === currentIndex ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowPlaylist(false);
                    }}
                  >
                    <img
                      src={song.thumbnail}
                      className="w-12 h-12 rounded object-cover mr-3"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm">{song.title}</p>
                      <p className="text-xs text-white/60">{song.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MINI PLAYER */}
      {!isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white border-t border-white/10 z-50">
          <div className="h-1 bg-white/20">
            <div
              className="h-full bg-white"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            {currentSong?.thumbnail && (
              <img
                src={currentSong.thumbnail}
                className="w-12 h-12 rounded object-cover"
              />
            )}

            <div className="flex-1">
              <p className="text-sm truncate">{currentSong?.title}</p>
              <p className="text-xs text-white/60 truncate">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
            >
              {isPlaying ? <Pause /> : <Play className="ml-1" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
