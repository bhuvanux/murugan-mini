import { useEffect, useState, useRef, useCallback } from 'react';
import { userAPI, MediaItem } from '../utils/api/client';
import { MediaCard } from './MediaCard';
import { EmptyState } from './EmptyState';
import { WallpaperSkeleton } from './WallpaperSkeleton';
import { MuruganLoader } from './MuruganLoader';
import { SimpleHealthCheck } from './SimpleHealthCheck';
import { TestBackendConnection } from './TestBackendConnection';
import { ImageOff } from 'lucide-react';

type MasonryFeedProps = {
  searchQuery?: string;
  onSelectMedia: (media: MediaItem, allMedia: MediaItem[]) => void;
  onTablesNotFound?: () => void;
};

export function MasonryFeed({ searchQuery, onSelectMedia }: MasonryFeedProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [errorCount, setErrorCount] = useState(0);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const pageSize = 20;
  const maxPages = 100; // Limit to 100 pages (2000 items) to avoid overwhelming the server
  const maxConsecutiveErrors = 3;

  const loadMedia = useCallback(async (pageNum: number, search?: string) => {
    // Check if we've hit the page limit
    if (pageNum > maxPages) {
      console.log(`[MasonryFeed] Reached max pages limit (${maxPages})`);
      setHasMore(false);
      return;
    }

    // Check if we should stop loading due to errors
    if (errorCount >= maxConsecutiveErrors) {
      console.log(`[MasonryFeed] Stopping due to ${errorCount} consecutive errors`);
      setHasMore(false);
      setShowErrorMessage(true);
      return;
    }

    try {
      console.log(`[MasonryFeed] Loading wallpapers - Page: ${pageNum}, Search: ${search || 'none'}`);
      
      const result = await userAPI.getWallpapers({
        search: search || undefined,
        page: pageNum,
        limit: pageSize,
      });

      console.log(`[MasonryFeed] Loaded ${result.data.length} wallpapers from admin backend`);
      console.log('[MasonryFeed] Sample item:', result.data[0]);

      if (result.data.length < pageSize) {
        setHasMore(false);
      }

      setMedia((prev) => (pageNum === 1 ? result.data : [...prev, ...result.data]));
      
      if (result.data.length === 0 && pageNum === 1) {
        console.log('[MasonryFeed] No wallpapers found. Admin needs to upload content.');
      }

      // Reset error count on successful load
      setErrorCount(0);
      setShowErrorMessage(false);
    } catch (error: any) {
      console.error('[MasonryFeed] Error loading wallpapers:', error);
      
      // Increment error count
      setErrorCount(prev => prev + 1);

      // If this is a pagination error (page > 1), stop loading more
      if (pageNum > 1) {
        console.log('[MasonryFeed] Stopping pagination due to error');
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [errorCount]);

  const loadFavorites = useCallback(async () => {
    try {
      const savedFavorites = localStorage.getItem('user_favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  useEffect(() => {
    setMedia([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setErrorCount(0); // Reset error count on new search
    setShowErrorMessage(false); // Hide error message on new search
    loadMedia(1, searchQuery);
  }, [searchQuery, loadMedia]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadMedia(nextPage, searchQuery);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, searchQuery, loadMedia]);

  const toggleFavorite = async (mediaId: string) => {
    const isFavorited = favorites.has(mediaId);

    try {
      // Update local state immediately (optimistic update)
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        // Save to localStorage
        localStorage.setItem('user_favorites', JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      // Call backend API to track like
      if (!isFavorited) {
        try {
          await userAPI.likeMedia(mediaId);
          console.log('[MasonryFeed] Like tracked successfully');
        } catch (apiError: any) {
          console.error('[MasonryFeed] Failed to track like:', apiError);
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(mediaId);
        } else {
          newSet.delete(mediaId);
        }
        localStorage.setItem('user_favorites', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
    }
  };

  if (loading && media.length === 0) {
    return (
      <>
        <div className="flex justify-center pt-6 pb-4">
          <MuruganLoader size={50} />
        </div>
        <div className="grid grid-cols-2 gap-1 px-1 pb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <WallpaperSkeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="pb-[79px]">
      {/* Masonry Grid */}
      <div className="grid grid-cols-2 gap-1 p-[5px]">
        {media.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            onSelect={(mediaItem) => onSelectMedia(mediaItem, media)}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>

      {hasMore && !showErrorMessage && (
        <div ref={observerTarget} className="flex justify-center py-4">
          <MuruganLoader size={40} />
        </div>
      )}

      {showErrorMessage && (
        <div className="px-4 py-6">
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 text-center">
            <p className="text-orange-900 font-medium mb-2">⚠️ Server Busy</p>
            <p className="text-sm text-gray-700 mb-3">
              The admin backend is temporarily overloaded. Showing {media.length} wallpapers from cache.
            </p>
            <p className="text-xs text-gray-600 mb-3">
              💡 <strong>Tip:</strong> Use search to find specific wallpapers, or wait a moment and refresh.
            </p>
            <button
              onClick={() => {
                setErrorCount(0);
                setShowErrorMessage(false);
                setPage(1);
                setHasMore(true);
                loadMedia(1, searchQuery);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {!hasMore && !showErrorMessage && media.length > 0 && (
        <div className="px-4 py-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
            <p className="text-green-900 font-medium">🎉 You've reached the end!</p>
            <p className="text-sm text-gray-700 mt-1">
              Showing all {media.length} wallpapers
            </p>
          </div>
        </div>
      )}

      {media.length === 0 && !loading && (
        <div className="px-4">
          {/* Simple Health Check - Test if edge function is alive */}
          <SimpleHealthCheck />
          
          {/* Backend Connection Test Tool */}
          <TestBackendConnection />
          
          {!searchQuery && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
              <h3 className="text-orange-900 mb-2">📸 No Wallpapers Yet!</h3>
              <p className="text-sm text-gray-700 mb-3">
                The admin hasn't uploaded any wallpapers yet. 
              </p>
              <p className="text-sm text-gray-600">
                <strong>Admin:</strong> Go to your admin panel and upload some photos/videos to get started!
              </p>
            </div>
          )}
          <EmptyState
            icon={ImageOff}
            title="No wallpapers found"
            description={searchQuery 
              ? `No results for \"${searchQuery}\". Try a different search term.` 
              : "No wallpapers or videos have been uploaded yet."}
          />
        </div>
      )}
    </div>
  );
}