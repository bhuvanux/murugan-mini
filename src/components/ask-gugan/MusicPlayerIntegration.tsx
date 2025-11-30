// Spotify-style Music Player with Mini & Full View
// Mobile-first YouTube player with playlist support
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Repeat, Shuffle, List, X, ChevronDown } from 'lucide-react';

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

// Helper to extract YouTube ID from URL or return the ID itself
const extractYouTubeId = (song: Song): string => {
  const urlOrId = song.youtubeId || song.embedUrl || song.id || '';
  if (!urlOrId) return '';
  
  // If it's already just an ID (11 characters, alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  
  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }
  
  return '';
};

export function MusicPlayer({ songs, autoPlay = false, onClose }: MusicPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('all');
  const [shuffle, setShuffle] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const currentSong = songs[currentIndex];
  const currentYouTubeId = currentSong ? extractYouTubeId(currentSong) : '';

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
      return;
    }

    // Load the API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('[MusicPlayer] YouTube API Ready');
      initPlayer();
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('[MusicPlayer] Error destroying player:', e);
        }
      }
    };
  }, []);

  // Handle song changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current && currentYouTubeId) {
      console.log('[MusicPlayer] Loading video:', currentYouTubeId);
      try {
        playerRef.current.loadVideoById(currentYouTubeId);
        if (isPlaying) {
          setTimeout(() => {
            playerRef.current.playVideo();
          }, 100);
        }
      } catch (e) {
        console.error('[MusicPlayer] Error loading video:', e);
      }
    }
  }, [currentIndex, isPlayerReady]);

  const initPlayer = () => {
    if (!currentYouTubeId) {
      console.error('[MusicPlayer] No valid YouTube ID found');
      return;
    }

    try {
      console.log('[MusicPlayer] Initializing player with ID:', currentYouTubeId);
      
      playerRef.current = new (window as any).YT.Player('youtube-player-frame', {
        height: '0',
        width: '0',
        videoId: currentYouTubeId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (e) {
      console.error('[MusicPlayer] Error creating player:', e);
    }
  };

  const onPlayerReady = (event: any) => {
    console.log('[MusicPlayer] Player ready');
    setIsPlayerReady(true);
    setDuration(event.target.getDuration());
    
    if (autoPlay) {
      event.target.playVideo();
      setIsPlaying(true);
    }

    // Start time tracking
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const time = playerRef.current.getCurrentTime();
          setCurrentTime(time);
        } catch (e) {
          // Ignore errors
        }
      }
    }, 1000);
  };

  const onPlayerStateChange = (event: any) => {
    const state = event.data;
    console.log('[MusicPlayer] State change:', state);
    
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (state === 1) {
      setIsPlaying(true);
      setDuration(event.target.getDuration());
    } else if (state === 2) {
      setIsPlaying(false);
    } else if (state === 0) {
      // Video ended
      handleNext();
    }
  };

  const onPlayerError = (event: any) => {
    console.error('[MusicPlayer] Player error:', event.data);
    // Try to skip to next song on error
    setTimeout(() => handleNext(), 1000);
  };

  const togglePlay = () => {
    if (!playerRef.current || !isPlayerReady) return;
    
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (e) {
      console.error('[MusicPlayer] Error toggling play:', e);
    }
  };

  const handleNext = () => {
    if (repeat === 'one') {
      // Replay current song
      if (playerRef.current && isPlayerReady) {
        playerRef.current.seekTo(0);
        playerRef.current.playVideo();
      }
      return;
    }

    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= songs.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentIndex(nextIndex);
  };

  const handlePrevious = () => {
    // If more than 3 seconds into song, restart it
    if (currentTime > 3) {
      if (playerRef.current && isPlayerReady) {
        playerRef.current.seekTo(0);
      }
      return;
    }

    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = repeat === 'all' ? songs.length - 1 : 0;
    }
    
    setCurrentIndex(prevIndex);
  };

  const toggleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeat);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    setRepeat(nextMode);
  };

  const toggleShuffle = () => {
    setShuffle(!shuffle);
    // TODO: Implement shuffle logic
  };

  const selectSong = (index: number) => {
    setCurrentIndex(index);
    setShowPlaylist(false);
  };

  const seekTo = (value: number) => {
    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.seekTo(value);
        setCurrentTime(value);
      } catch (e) {
        console.error('[MusicPlayer] Error seeking:', e);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden YouTube Player */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="youtube-player-frame"></div>
      </div>

      {/* Full Player Modal (Spotify-style) */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black text-white z-[100] animate-fade-in flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <h2 className="text-sm" style={{ fontFamily: 'var(--font-english)' }}>
              Now Playing
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Content Container */}
          <div className="flex-1 overflow-y-auto">
            {/* Album Art Section */}
            <div className="p-6 sm:p-8 flex flex-col items-center">
              {currentSong?.thumbnail ? (
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-64 h-64 sm:w-80 sm:h-80 rounded-lg shadow-2xl object-cover mb-6"
                />
              ) : (
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-lg bg-gradient-to-br from-[#0d5e38] to-[#0a4a2b] mb-6 flex items-center justify-center">
                  <Play className="w-24 h-24 text-white/30" />
                </div>
              )}

              {/* Song Info */}
              <div className="text-center w-full max-w-md mb-8">
                <h1 className="text-2xl sm:text-3xl mb-2" style={{ fontFamily: 'var(--font-english)' }}>
                  {currentSong?.title || 'Loading...'}
                </h1>
                <p className="text-white/60">
                  {currentSong?.description || 'Devotional Song'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mb-2">
                <div className="w-full h-1.5 bg-white/20 rounded-full relative">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 w-full max-w-md">
                <button
                  onClick={toggleShuffle}
                  className={`p-3 rounded-full hover:bg-white/10 transition-colors ${
                    shuffle ? 'text-[#0d5e38]' : 'text-white/60'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePrevious}
                  className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="Previous"
                >
                  <SkipBack className="w-6 h-6" fill="white" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={!isPlayerReady}
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 ml-1" fill="currentColor" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-full hover:bg-white/10 transition-colors"
                  title="Next"
                >
                  <SkipForward className="w-6 h-6" fill="white" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-3 rounded-full hover:bg-white/10 transition-colors relative ${
                    repeat !== 'none' ? 'text-[#0d5e38]' : 'text-white/60'
                  }`}
                  title={`Repeat: ${repeat}`}
                >
                  <Repeat className="w-5 h-5" />
                  {repeat === 'one' && (
                    <span className="absolute top-1 right-1 text-[10px] font-bold">1</span>
                  )}
                </button>
              </div>

              {/* Playlist Toggle */}
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <List className="w-5 h-5" />
                <span className="text-sm" style={{ fontFamily: 'var(--font-english)' }}>
                  {showPlaylist ? 'Hide' : 'Show'} Playlist ({songs.length})
                </span>
              </button>

              {/* Playlist */}
              {showPlaylist && (
                <div className="w-full max-w-2xl mt-6">
                  <div className="space-y-2">
                    {songs.map((song, index) => (
                      <button
                        key={song.id}
                        onClick={() => selectSong(index)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                          index === currentIndex
                            ? 'bg-white/20'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm font-semibold min-w-[24px] text-white/60">
                          {index + 1}
                        </span>
                        {song.thumbnail && (
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ fontFamily: 'var(--font-english)' }}>
                            {song.title}
                          </p>
                          <p className="text-xs text-white/60 truncate">
                            {song.description || 'Devotional Song'}
                          </p>
                        </div>
                        {index === currentIndex && isPlaying && (
                          <div className="w-4 h-4 flex items-center gap-0.5">
                            <span className="w-0.5 h-3 bg-[#0d5e38] animate-pulse"></span>
                            <span className="w-0.5 h-4 bg-[#0d5e38] animate-pulse delay-75"></span>
                            <span className="w-0.5 h-2 bg-[#0d5e38] animate-pulse delay-150"></span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini Player (Bottom Bar) */}
      {!isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white shadow-2xl z-50 border-t border-white/10">
          {/* Thin Progress Bar */}
          <div className="w-full h-1 bg-white/20 relative">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Mini Player Content */}
          <div 
            className="px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsExpanded(true)}
          >
            <div className="flex items-center gap-3 max-w-6xl mx-auto">
              {/* Thumbnail */}
              {currentSong?.thumbnail && (
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ fontFamily: 'var(--font-english)' }}>
                  {currentSong?.title || 'Loading...'}
                </p>
                <p className="text-xs text-white/60 truncate">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                disabled={!isPlayerReady}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 flex-shrink-0"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
