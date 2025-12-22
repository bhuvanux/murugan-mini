import React, { useState, useEffect, useRef } from "react";
import { OptimizedImage } from "./OptimizedImage";
import {
  Banner,
  fetchModuleBanners,
  trackBannerClick,
  trackBannerView,
  getOptimalBannerImage,
} from "../utils/bannerAPI";

interface ModuleBannerCarouselProps {
  bannerType:
  | "wallpaper"
  | "photos"
  | "media"
  | "sparkle"
  | "home";
  onBannerClick?: (bannerId: string) => void;
}

export function ModuleBannerCarousel({
  bannerType,
  onBannerClick,
}: ModuleBannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch banners on mount
  useEffect(() => {
    loadBanners();
  }, [bannerType]);

  const loadBanners = async () => {
    setIsLoading(true);
    try {
      console.log("[Banner Carousel] Loading banners from admin...");

      // Fetch from API
      // Note: fetchModuleBanners handles caching expiration internally
      let apiType: Banner["type"] = "home"; // Default

      // Map component types to API types
      if (bannerType === "sparkle") apiType = "spark";
      else if (bannerType === "media") apiType = "songs";
      else if (['home', 'wallpaper', 'photos', 'songs', 'spark', 'temple'].includes(bannerType)) {
        apiType = bannerType as Banner["type"];
      }

      const data = await fetchModuleBanners(apiType);
      console.log(`[Banner Carousel] ✅ Loaded ${data.length} banners from admin panel`);

      if (data.length > 0) {
        console.log("[Banner Carousel] Sample banner:", data[0]);
      } else {
        console.warn(
          "[Banner Carousel] ⚠️ No banners found! Check admin panel.",
        );
      }

      setBanners(data);
    } catch (error) {
      console.error("[Banner Carousel] ❌ Failed to load banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return; // Don't auto-scroll if only 1 banner

    // Clear any existing timer
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    // Start auto-scroll
    autoScrollTimerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, 5000); // 5 seconds

    // Cleanup on unmount
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [banners.length]);

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollWidth = container.scrollWidth;
    const itemWidth = scrollWidth / banners.length;
    const scrollPosition = itemWidth * index;

    container.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;

    // Pause auto-scroll when user touches
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  // Handle touch end (swipe detection)
  const handleTouchEnd = () => {
    const swipeThreshold = 50; // Minimum swipe distance
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        const nextIndex = Math.min(currentIndex + 1, banners.length - 1);
        setCurrentIndex(nextIndex);
        scrollToIndex(nextIndex);
      } else {
        // Swiped right - go to previous
        const prevIndex = Math.max(currentIndex - 1, 0);
        setCurrentIndex(prevIndex);
        scrollToIndex(prevIndex);
      }
    }

    // Restart auto-scroll after swipe
    if (banners.length > 1) {
      autoScrollTimerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          scrollToIndex(nextIndex);
          return nextIndex;
        });
      }, 5000);
    }
  };

  // Handle scroll event to update current index
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.scrollWidth / banners.length;
    const index = Math.round(scrollLeft / itemWidth);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleBannerClick = (bannerId: string) => {
    // Track click
    trackBannerClick(bannerId);

    if (onBannerClick) {
      onBannerClick(bannerId);
    }
  };

  // Track view when banner changes
  useEffect(() => {
    if (banners.length > 0 && currentIndex < banners.length) {
      trackBannerView(banners[currentIndex].id);
    }
  }, [currentIndex, banners]);

  // Don't render if no banners
  if (!isLoading && banners.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full" style={{ padding: 5 }}>
        <div
          className="w-full bg-gray-100 rounded-2xl animate-pulse"
          style={{ height: 176 }}
        />
      </div>
    );
  }

  return (
    <div className="w-full" style={{ padding: 5 }}>
      {/* Horizontal Scrollable Banner */}
      <div className="relative">
        <style>{".module-banner-scroller::-webkit-scrollbar{display:none}"}</style>
        <div
          ref={scrollContainerRef}
          className="module-banner-scroller flex overflow-x-auto"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            touchAction: "pan-x pan-y pinch-zoom",
          }}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-shrink-0 w-full"
              style={{ scrollSnapAlign: "center" }}
              onClick={() => handleBannerClick(banner.id)}
            >
              <div
                className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer group"
                style={{ height: 176 }}
              >
                <OptimizedImage
                  src={getOptimalBannerImage(banner)}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  lqip={banner.thumbnail_url}
                  type="banner"
                />

                {/* Overlay gradient for text readability */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pb-8">
                  {banner.description && (
                    <p className="text-white/90 text-sm line-clamp-2">
                      {banner.description}
                    </p>
                  )}
                </div>

                {/* Pagination Dots - Inside banner, above 5px margin */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {banners.map((_, dotIndex) => (
                    <button
                      key={dotIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(dotIndex);
                        scrollToIndex(dotIndex);
                      }}
                      className="transition-all duration-300"
                      style={{
                        width: currentIndex === dotIndex ? "20px" : "6px",
                        height: "6px",
                        borderRadius: "3px",
                        backgroundColor: currentIndex === dotIndex
                          ? "rgba(255, 255, 255, 0.95)"
                          : "rgba(255, 255, 255, 0.4)",
                      }}
                      aria-label={`Go to banner ${dotIndex + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
