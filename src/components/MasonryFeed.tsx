import React, { useEffect, useState, useRef, useCallback } from 'react';
import { userAPI, MediaItem } from '../utils/api/client';
import { MediaCard } from './MediaCard';
import { EmptyState } from './EmptyState';
import { WallpaperSkeleton } from './WallpaperSkeleton';
import { MuruganLoader } from './MuruganLoader';
import { ModuleBannerCarousel } from './ModuleBannerCarousel';

import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { ImageOff } from 'lucide-react';
import { ContentBanner } from './ui/overlays/ContentBanner';
import { FeedAdCard } from './ui/overlays/FeedAdCard';
import { shuffleArray } from '../utils/shuffle';

type MasonryFeedProps = {
  category?: 'wallpapers' | 'media';
  searchQuery?: string;
  onSelectMedia: (media: MediaItem, allMedia: MediaItem[]) => void;
  onTablesNotFound?: () => void;
};

export function MasonryFeed({ category = 'wallpapers', searchQuery, onSelectMedia, onTablesNotFound }: MasonryFeedProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [errorCount, setErrorCount] = useState(0);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const { user } = useAuth();
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

      // Pinterest-style shuffle: randomize content on every load
      const shuffledData = shuffleArray(result.data);
      console.log('[MasonryFeed] ✨ Shuffled wallpapers for fresh discovery');

      if (shuffledData.length < pageSize) {
        setHasMore(false);
      }

      setMedia((prev) => (pageNum === 1 ? shuffledData : [...prev, ...shuffledData]));

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
  }, [searchQuery, category, loadMedia]);

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
      <div className="pb-[79px]">
        {/* Banner Carousel - Always visible even during loading */}
        <ModuleBannerCarousel bannerType="wallpaper" />

        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 gap-1 p-[5px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <WallpaperSkeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Banner Carousel - For wallpapers/photos module */}
      <ModuleBannerCarousel
        bannerType="wallpaper"
        onBannerClick={(bannerId) => {
          // Check if this banner is meant for subscription
          // Ideally we check banner metadata, but for now we can rely on specific IDs or just navigate for ALL banners if user is not premium
          // Or better, let's look for a specific "target" property if available, or assume the "Home Banner" user asked for IS this one.
          // The user said "in that banner only i need place the image for conversion".
          // So we can assume clicking ANY banner in this carousel leads to subscription IF it's promoting subscription.
          // I'll add a simple heuristic: if user is not premium, open subscription.

          // To be more precise, let's navigate to subscription.
          // Since MasonryFeed doesn't have direct access to 'setCurrentPage' from App, we need to pass a callback or use window event/history.
          // App.tsx uses 'currentPage' state. We passed 'onSelectMedia' but not 'onNavigate'.
          // I should modify MasonryFeed props to accept onNavigate, OR dispatch a custom event.
          // Dispatching a custom event is easier to avoid prop drilling if not strictly needed.
          // Actually, I'll update App.tsx to pass onNavigate to MasonryFeed later? 
          // EASIER: Just use window.dispatchEvent logic or a global event for "navigate_to_subscription".

          window.dispatchEvent(new CustomEvent('navigate_to', { detail: 'subscription' }));
        }}
      />

      {/* Masonry Grid with Ads */}
      <div className="grid grid-cols-2 gap-1 p-[5px]">
        {media
          .filter(item => {
            if (category === 'wallpapers') return item.type === 'image';
            if (category === 'media') return item.type === 'video';
            return true;
          })
          .flatMap((item, index) => {
            const elements = [
              <MediaCard
                key={item.id}
                media={item}
                onSelect={(mediaItem) => onSelectMedia(mediaItem, media)}
                isFavorite={favorites.has(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            ];

            // Inject Ad every 6 items (index 5, 11, 17...)
            // CHECK PREMIUM STATUS (Remove Ads)
            // We use 'user' from useAuth, but we need 'profile' (or check metadata if synced).
            // For now, let's assume useAuth returns 'profile' (since we updated it).
            // If TS errors, we cast it or fix types.
            // @ts-ignore
            const { profile } = useAuth();
            const isPremium = profile?.is_premium === true;

            if (!isPremium && (index + 1) % 6 === 0) {
              elements.push(
                <div key={`ad-${index}`} className="col-span-2 py-2">
                  <FeedAdCard />
                </div>
              );
            }
            return elements;
          })}
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


      {media.length === 0 && !loading && (
        <div className="px-4">


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