// USER PANEL - SongsScreen.tsx with Spotify-style Player
// Integrated with YouTubeMusicPlayer component

import React, { useState, useEffect } from "react";
import {
  Music,
  Heart,
  MoreVertical,
  Play,
  Share2,
  ListPlus,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { userAPI, YouTubeMedia } from "../utils/api/client";
import { MuruganLoader } from "./MuruganLoader";
import { AppHeader } from "./AppHeader";
import { PlayingIndicator } from "./PlayingIndicator";
import { PlaylistDialog } from "./PlaylistDialog";
import { YouTubeMusicPlayer } from "./YouTubeMusicPlayer";

type TabType = "songs" | "videos";

// Utility functions
function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

function getThumbnail(embedUrl: string): string {
  const youtubeId = extractYouTubeId(embedUrl);
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

export function SongsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("songs");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [songs, setSongs] = useState<YouTubeMedia[]>([]);
  const [videos, setVideos] = useState<YouTubeMedia[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Playlist state
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadMedia();
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("media_favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    try {
      console.log("[SongsScreen] Loading YouTube media from admin backend...");

      const result = await userAPI.getYouTubeMedia({
        page: 1,
        limit: 100,
      });

      console.log(`[SongsScreen] ✅ Loaded ${result.data.length} YouTube items`);

      const songsList = result.data.filter((item) => {
        const cat = item.category?.toLowerCase() || "";
        return cat === "songs" || cat === "song";
      });

      const videosList = result.data.filter((item) => {
        const cat = item.category?.toLowerCase() || "";
        return cat === "videos" || cat === "video";
      });

      console.log(`[SongsScreen] 📊 Filtered: ${songsList.length} songs, ${videosList.length} videos`);

      setSongs(songsList);
      setVideos(videosList);

      if (result.data.length === 0) {
        console.log("⚠️ No YouTube media found. Admin should upload content via Admin Panel > YouTube Upload");
      } else if (songsList.length === 0 && videosList.length === 0) {
        console.warn(
          `⚠️ Found ${result.data.length} YouTube items but none are categorized as 'songs' or 'videos'.`,
          "Categories found:",
          [...new Set(result.data.map((i) => i.category))],
        );
      }
    } catch (error) {
      console.error("❌ Error loading media:", error);
      setSongs([]);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (mediaId: string) => {
    const isFavorited = favorites.has(mediaId);

    try {
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        localStorage.setItem("media_favorites", JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      if (!isFavorited) {
        await userAPI.likeMedia(mediaId);
        console.log('[SongsScreen] ✅ Like tracked to backend analytics');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        localStorage.setItem("media_favorites", JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    }
  };

  const playSong = (index: number) => {
    setCurrentSongIndex(index);
    console.log('[SongsScreen] ▶️ Playing song:', songs[index]?.title);
  };

  const handleShare = async (item: YouTubeMedia) => {
    const youtubeId = extractYouTubeId(item.embedUrl);
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    try {
      await userAPI.trackShare(item.id);
      console.log('[SongsScreen] ✅ Share tracked to backend analytics');

      if (navigator.share) {
        await navigator.share({
          title: item.title,
          url: url,
        });
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          toast.success("Link copied to clipboard!");
        } catch (e) {
          console.error("Failed to copy link");
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleAddToPlaylist = (song: YouTubeMedia) => {
    setSelectedSongForPlaylist({ id: song.id, title: song.title });
    setPlaylistDialogOpen(true);
  };

  const handleOpenYouTube = (embedUrl: string) => {
    const youtubeId = extractYouTubeId(embedUrl);
    window.open(`https://www.youtube.com/watch?v=${youtubeId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-140px)]">
        <div className="flex justify-center pt-8 pb-4">
          <MuruganLoader size={50} />
        </div>
        <p className="text-gray-500 text-center text-sm" style={{ fontFamily: 'var(--font-english)' }}>
          Loading media...
        </p>
      </div>
    );
  }

  const displayItems = activeTab === "songs" ? songs : videos;

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] bg-[#F2FFF6]">
      {/* Header with Kolam */}
      <AppHeader title="Songs & Videos" />

      {/* Tabs - Spotify Style */}
      <div
        className="flex gap-0 px-4 border-b border-white/10"
        style={{ background: "#0d5e38" }}
      >
        <button
          onClick={() => setActiveTab("songs")}
          className={`flex-1 text-center py-4 transition-all relative ${
            activeTab === "songs" ? "text-white" : "text-white/60"
          }`}
          style={{ fontFamily: 'var(--font-english)', fontWeight: activeTab === "songs" ? 600 : 400 }}
        >
          Songs
          {activeTab === "songs" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex-1 text-center py-4 transition-all relative ${
            activeTab === "videos" ? "text-white" : "text-white/60"
          }`}
          style={{ fontFamily: 'var(--font-english)', fontWeight: activeTab === "videos" ? 600 : 400 }}
        >
          Videos
          {activeTab === "videos" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3" style={{ paddingBottom: currentSongIndex !== null ? '140px' : '16px' }}>
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Music className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-gray-600 mb-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
              No {activeTab} yet
            </h3>
            <p className="text-gray-400 text-sm text-center px-4" style={{ fontFamily: 'var(--font-english)' }}>
              Ask the admin to upload some YouTube {activeTab}!
            </p>
          </div>
        ) : activeTab === "songs" ? (
          <div className="space-y-2">
            {displayItems.map((song, index) => (
              <div
                key={song.id}
                className="bg-white rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                {/* Thumbnail with Play Overlay or Playing Indicator */}
                <div
                  className="relative flex-shrink-0 cursor-pointer group"
                  onClick={() => playSong(index)}
                >
                  <ImageWithFallback
                    src={song.thumbnail || getThumbnail(song.embedUrl)}
                    alt={song.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  {currentSongIndex === index ? (
                    // ✅ Show animated bars for currently playing song
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                      <PlayingIndicator isPlaying={true} size="sm" />
                    </div>
                  ) : (
                    // Show play button on hover for other songs
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <Play className="w-4 h-4 text-[#0d5e38] fill-current ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h3 
                    className="truncate" 
                    style={{ 
                      fontFamily: 'var(--font-english)', 
                      fontSize: '16px', 
                      fontWeight: 600,
                      color: currentSongIndex === index ? '#0d5e38' : '#111827'
                    }}
                  >
                    {song.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-0.5 truncate" style={{ fontFamily: 'var(--font-english)' }}>
                    {song.description || "Devotional Song"} • {song.stats.views || 0} views
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 transition-all ${
                        favorites.has(song.id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-400"
                      }`}
                    />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => playSong(index)}>
                        <Play className="w-4 h-4 mr-2" />
                        Play Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFavorite(song.id)}>
                        <Heart className="w-4 h-4 mr-2" />
                        {favorites.has(song.id) ? "Remove from Favorites" : "Add to Favorites"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToPlaylist(song)}>
                        <ListPlus className="w-4 h-4 mr-2" />
                        Add to Playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(song)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenYouTube(song.embedUrl)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in YouTube
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((video, index) => {
              const youtubeId = extractYouTubeId(video.embedUrl);
              return (
                <div
                  key={video.id}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative pb-[56.25%] bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=1&modestbranding=1&rel=0`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>

                  <div className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 line-clamp-2" style={{ fontFamily: 'var(--font-english)', fontSize: '16px', fontWeight: 600 }}>
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-gray-500 text-sm mt-1 line-clamp-1" style={{ fontFamily: 'var(--font-english)' }}>
                          {video.description}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleShare(video)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenYouTube(video.embedUrl)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in YouTube
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spotify-style Music Player */}
      {currentSongIndex !== null && songs.length > 0 && (
        <YouTubeMusicPlayer
          songs={songs}
          currentIndex={currentSongIndex}
          autoPlay={true}
          onClose={() => setCurrentSongIndex(null)}
          onSongChange={(index) => setCurrentSongIndex(index)}
          onToggleFavorite={toggleFavorite}
          onShare={handleShare}
          favorites={favorites}
        />
      )}

      {/* Playlist Dialog */}
      <PlaylistDialog
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
        songId={selectedSongForPlaylist?.id}
        songTitle={selectedSongForPlaylist?.title}
      />
    </div>
  );
}
