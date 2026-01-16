// Removed Portal import
// import { Portal } from './ui/Portal'; 

// ... imports
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Repeat, Shuffle, List, X, ChevronDown, Heart, Share2, ArrowLeft } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PlayingIndicator } from './PlayingIndicator';
// import { Portal } from './ui/Portal'; // Deprecated
import { musicControls, MusicControlAction } from '../utils/musicControls';
import { YouTubeMedia } from '../utils/api/client';

// Use shared type
export type YouTubeSong = YouTubeMedia;

export interface YouTubeMusicPlayerProps {
  songs: YouTubeSong[]; // Now compatible with YouTubeMedia
  currentIndex: number;
  autoPlay?: boolean;
  onClose?: () => void;
  onSongChange?: (index: number) => void;
  onToggleFavorite?: (songId: string) => void;
  onShare?: (song: YouTubeSong) => void;
  favorites?: Set<string>;
}

// Helper to extract YouTube ID from URL or return the ID itself
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

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function YouTubeMusicPlayer({
  songs,
  currentIndex: initialIndex,
  autoPlay = false,
  onClose,
  onSongChange,
  onToggleFavorite,
  onShare,
  favorites = new Set(),
}: YouTubeMusicPlayerProps) {
  // ... state ...
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('all');
  const [shuffle, setShuffle] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const currentSong = songs[currentIndex];
  const currentYouTubeId = currentSong ? extractYouTubeId(currentSong.embedUrl) : '';

  // Load YouTube IFrame API (Same as before)
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!isPlayerReady && !useIframeFallback && currentYouTubeId) {
        console.log('[YouTubeMusicPlayer] API timeout, switching to iframe fallback');
        setUseIframeFallback(true);
        setIsBuffering(false);
      }
    }, 5000);

    if ((window as any).YT && (window as any).YT.Player) {
      clearTimeout(fallbackTimeout);
      setTimeout(() => { if (currentYouTubeId) initPlayer(); }, 100);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      clearTimeout(fallbackTimeout);
      setTimeout(() => { if (currentYouTubeId) initPlayer(); }, 100);
    };

    return () => {
      clearTimeout(fallbackTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.stopVideo === 'function') playerRef.current.stopVideo();
          if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
        } catch (e) { console.error(e); }
      }
      playerRef.current = null;
      musicControls.destroy().catch(console.error);
    };
  }, [currentYouTubeId, useIframeFallback]);

  // Handle song changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current && currentYouTubeId) {
      setIsBuffering(true);
      try {
        playerRef.current.loadVideoById(currentYouTubeId);
        if (isPlaying) {
          setTimeout(() => {
            if (typeof playerRef.current?.playVideo === 'function') playerRef.current.playVideo();
          }, 100);
        }
      } catch (e) {
        setIsBuffering(false);
      }
    }
  }, [currentIndex, isPlayerReady]);

  useEffect(() => { setCurrentIndex(initialIndex); }, [initialIndex]);

  // Re-implementing simplified helpers for completeness of the refactor block
  const handleNext = () => {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= songs.length) nextIndex = 0; // Simple loop for now
    setCurrentIndex(nextIndex);
    onSongChange?.(nextIndex);
  };
  const handlePrevious = () => {
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = songs.length - 1;
    setCurrentIndex(prevIndex);
    onSongChange?.(prevIndex);
  };
  const togglePlay = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function' && typeof playerRef.current.pauseVideo === 'function') {
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
      // State will update via listener
    }
  };
  const toggleRepeat = () => { }; // Placeholder
  const toggleShuffle = () => { }; // Placeholder
  const seekTo = (t: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(t);
    }
  };

  // Player Init (Simplified)
  const initPlayer = () => {
    const containerId = 'youtube-player-frame';
    // We rely on React rendering the div with this ID now! 

    try {
      playerRef.current = new (window as any).YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: currentYouTubeId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0, // Custom controls
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
        },
        events: {
          onReady: (e: any) => { setIsPlayerReady(true); setIsBuffering(false); setDuration(e.target.getDuration()); if (autoPlay) e.target.playVideo(); },
          onStateChange: (e: any) => {
            if (e.data === 1) setIsPlaying(true);
            else if (e.data === 2) setIsPlaying(false);
            else if (e.data === 3) setIsBuffering(true);
            else if (e.data === 0) handleNext();
          }
        }
      });
    } catch (e) { console.error(e); }
  };

  // Progress tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isVideo = currentSong && (currentSong.category?.toLowerCase() === 'video' || currentSong.category?.toLowerCase() === 'videos');

  // New Persistent Render
  return (
    <div
      className={`fixed transition-all duration-300 ease-in-out z-[9999] overflow-hidden ${isExpanded
        ? 'inset-0 bg-black'
        : 'left-0 right-0 bottom-[80px] h-16 bg-black rounded-t-2xl shadow-2xl border-t border-white/10'
        }`}
      style={!isExpanded ? { bottom: 'calc(env(safe-area-inset-bottom) + 80px)' } : {}}
    >

      {/* 1. Header (Expanded Only) */}
      <div
        className={`flex items-center justify-between p-4 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none absolute top-0 w-full'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-sm font-medium text-white">Now Playing</h2>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* 2. Main Content Area (Video + Info) */}
      <div className={`flex flex-col h-full ${!isExpanded ? 'hidden' : ''}`}>

        {/* VIDEO FRAME WRAPPER - PERMANENT HOME OF IFRAME */}
        {/* In expanded: it's a visible block. In mini: it's hidden but MOUNTED. */}
        <div className={`w-full max-w-2xl mx-auto aspect-video bg-black relative shrink-0 transition-all duration-300 ${isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0 overflow-hidden'}`}>
          <div id="youtube-player-frame" className="w-full h-full" />
          {/* Buffering Overlay */}
          {(isBuffering || !isPlayerReady) && isExpanded && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Expanded Controls Scroll View */}
        <div className={`flex-1 overflow-y-auto ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="p-6 flex flex-col items-center">
            {/* Metadata */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">{currentSong?.title}</h1>
              <p className="text-white/60">{currentSong?.description}</p>
            </div>

            {/* Seek Bar */}
            <div className="w-full max-w-md mb-6">
              <div className="w-full h-1 bg-white/20 rounded-full relative">
                <div className="absolute h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                <input type="range" min="0" max={duration} value={currentTime} onChange={(e) => seekTo(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              </div>
              <div className="flex justify-between text-xs text-white/60 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={handlePrevious} className="p-3 hover:bg-white/10 rounded-full"><SkipBack className="w-8 h-8 text-white" /></button>
              <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>
              <button onClick={handleNext} className="p-3 hover:bg-white/10 rounded-full"><SkipForward className="w-8 h-8 text-white" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mini Player Overlay (Visible only when !isExpanded) */}
      <div
        className={`absolute inset-0 flex items-center px-4 gap-3 bg-black/90 backdrop-blur-md cursor-pointer transition-opacity duration-300 ${!isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsExpanded(true)}
      >
        {/* Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20">
          <div className="h-full bg-white" style={{ width: `${progress}%` }} />
        </div>

        <ImageWithFallback src={currentSong?.thumbnail || getThumbnail(currentSong?.embedUrl || '')} alt="Thumb" className="w-10 h-10 rounded object-cover bg-gray-800" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{currentSong?.title}</p>
          <p className="text-xs text-white/50 truncate">{currentSong?.description || 'Devotional'}</p>
        </div>

        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-2 hover:bg-white/10 rounded-full text-white">
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
        </button>

        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 hover:bg-white/10 rounded-full text-white/60"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        )}
      </div>

    </div>
  );
}
