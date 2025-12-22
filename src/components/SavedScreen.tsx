import { useEffect, useState } from 'react';
import { userAPI, MediaItem, YouTubeMedia } from '../utils/api/client';
import { useAuth } from '../contexts/AuthContext';
import { MediaCard } from './MediaCard';
import { WallpaperSkeleton } from './WallpaperSkeleton';
import { MuruganLoader } from './MuruganLoader';
import { toast } from 'sonner@2.0.3';
import { Heart, Music, Play, MoreVertical, Share2, ExternalLink } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type SavedScreenProps = {
  onSelectMedia: (media: MediaItem, allMedia: MediaItem[]) => void;
};

export function SavedScreen({ onSelectMedia }: SavedScreenProps) {
  const [savedMedia, setSavedMedia] = useState<MediaItem[]>([]);
  const [savedSongs, setSavedSongs] = useState<YouTubeMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [, setSongFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'songs'>('wallpapers');
  const { user } = useAuth();

  useEffect(() => {
    loadSavedMedia();
  }, [user]);

  const loadSavedMedia = async () => {
    try {
      // Get favorite IDs from localStorage for wallpapers
      const savedFavoritesStr = localStorage.getItem('user_favorites');
      const songFavoritesStr = localStorage.getItem('media_favorites');
      
      // Load wallpapers
      if (savedFavoritesStr) {
        const favoriteIds = JSON.parse(savedFavoritesStr) as string[];
        setFavorites(new Set(favoriteIds));

        if (favoriteIds.length > 0) {
          console.log('[SavedScreen] Loading liked wallpapers:', favoriteIds);
          const result = await userAPI.getWallpapers({
            limit: 100
          });
          const likedMedia = result.data.filter(media => favoriteIds.includes(media.id));
          console.log('[SavedScreen] Found', likedMedia.length, 'liked wallpapers');
          setSavedMedia(likedMedia);
        }
      }

      // Load songs/videos
      if (songFavoritesStr) {
        const songFavoriteIds = JSON.parse(songFavoritesStr) as string[];
        setSongFavorites(new Set(songFavoriteIds));

        if (songFavoriteIds.length > 0) {
          console.log('[SavedScreen] Loading liked songs/videos:', songFavoriteIds);
          const result = await userAPI.getYouTubeMedia({
            page: 1,
            limit: 100
          });
          const likedSongs = result.data.filter(media => songFavoriteIds.includes(media.id));
          console.log('[SavedScreen] Found', likedSongs.length, 'liked songs/videos');
          setSavedSongs(likedSongs);
        }
      }
    } catch (error: any) {
      console.error('[SavedScreen] Error loading saved media:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (mediaId: string) => {
    try {
      // Update localStorage
      const savedFavoritesStr = localStorage.getItem('user_favorites') || '[]';
      let favoriteIds = JSON.parse(savedFavoritesStr) as string[];
      
      // Remove from favorites
      favoriteIds = favoriteIds.filter(id => id !== mediaId);
      localStorage.setItem('user_favorites', JSON.stringify(favoriteIds));

      // Update UI
      setSavedMedia((prev) => prev.filter((item) => item.id !== mediaId));
      setFavorites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
    } catch (error: any) {
      console.error('[SavedScreen] Error removing favorite:', error);
    }
  };

  const toggleSongFavorite = async (mediaId: string) => {
    try {
      const savedFavoritesStr = localStorage.getItem('media_favorites') || '[]';
      let favoriteIds = JSON.parse(savedFavoritesStr) as string[];
      
      favoriteIds = favoriteIds.filter(id => id !== mediaId);
      localStorage.setItem('media_favorites', JSON.stringify(favoriteIds));

      setSavedSongs((prev) => prev.filter((item) => item.id !== mediaId));
      setSongFavorites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
      
      toast.success('Removed from favorites');
    } catch (error: any) {
      console.error('[SavedScreen] Error removing song favorite:', error);
    }
  };

  const extractYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
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

  const handleShare = async (item: YouTubeMedia) => {
    const youtubeId = extractYouTubeId(item.embedUrl);
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    try {
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

  const handleOpenYouTube = (embedUrl: string) => {
    const youtubeId = extractYouTubeId(embedUrl);
    window.open(`https://www.youtube.com/watch?v=${youtubeId}`, "_blank");
  };

  if (loading) {
    return (
      <>
        <div className="flex justify-center pt-6 pb-4">
          <MuruganLoader size={50} />
        </div>
        <div className="grid grid-cols-2 gap-1 px-1 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <WallpaperSkeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </>
    );
  }

  const hasNoFavorites = savedMedia.length === 0 && savedSongs.length === 0;

  if (hasNoFavorites && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-center mb-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
          No saved items yet
        </p>
        <p className="text-gray-500 text-sm text-center" style={{ fontFamily: 'var(--font-english)' }}>
          Tap the heart icon on any wallpaper, song, or video to save it here
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Tabs */}
      <div className="flex gap-0 px-[16px] border-b border-gray-200 sticky top-0 bg-[#F2FFF6] z-10 pt-[10px] pr-[16px] pb-[0px] pl-[16px] py-[10px]">
        <button
          onClick={() => setActiveTab('wallpapers')}
          className={`flex-1 text-center py-3 transition-all relative ${
            activeTab === 'wallpapers' ? 'text-[#0d5e38]' : 'text-gray-500'
          }`}
          style={{ fontFamily: 'var(--font-english)', fontWeight: activeTab === 'wallpapers' ? 600 : 400 }}
        >
          Wallpapers ({savedMedia.length})
          {activeTab === 'wallpapers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5e38]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('songs')}
          className={`flex-1 text-center py-3 transition-all relative ${
            activeTab === 'songs' ? 'text-[#0d5e38]' : 'text-gray-500'
          }`}
          style={{ fontFamily: 'var(--font-english)', fontWeight: activeTab === 'songs' ? 600 : 400 }}
        >
          Songs & Videos ({savedSongs.length})
          {activeTab === 'songs' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d5e38]" />
          )}
        </button>
      </div>

      {/* Wallpapers Tab */}
      {activeTab === 'wallpapers' && (
        <>
          {savedMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Heart className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center" style={{ fontFamily: 'var(--font-english)' }}>
                No liked wallpapers yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 px-1 pt-1">
              {savedMedia.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onSelect={(mediaItem) => onSelectMedia(mediaItem, savedMedia)}
                  isFavorite={favorites.has(item.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Songs & Videos Tab */}
      {activeTab === 'songs' && (
        <>
          {savedSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Music className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center" style={{ fontFamily: 'var(--font-english)' }}>
                No liked songs or videos yet
              </p>
            </div>
          ) : (
            <div className="px-4 pt-3 space-y-2">
              {savedSongs.map((song) => (
                <div
                  key={song.id}
                  className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <ImageWithFallback
                      src={song.thumbnail || getThumbnail(song.embedUrl)}
                      alt={song.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-current" />
                    </div>

                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 truncate" style={{ fontFamily: 'var(--font-english)', fontSize: '0.9375rem', fontWeight: 600 }}>
                      {song.title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5 truncate" style={{ fontFamily: 'var(--font-english)' }}>
                      {song.category || 'Media'} • {song.stats.views || 0} views
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSongFavorite(song.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleShare(song)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenYouTube(song.embedUrl)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in YouTube
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSongFavorite(song.id)} className="text-red-600">
                          <Heart className="w-4 h-4 mr-2" />
                          Remove from Favorites
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}