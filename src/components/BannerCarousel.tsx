import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Banner {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  order: number;
  isPublished: boolean;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoSlideInterval?: number;
}

export function BannerCarousel({ banners, autoSlideInterval = 3000 }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const publishedBanners = banners.filter((b) => b.isPublished).sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (publishedBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, autoSlideInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, publishedBanners.length, autoSlideInterval]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      handleNext();
    }, autoSlideInterval);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % publishedBanners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + publishedBanners.length) % publishedBanners.length);
    setTimeout(() => setIsTransitioning(false), 500);
    resetTimer();
  };

  const handleDotClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
    resetTimer();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swiped left
      handleNext();
      resetTimer();
    }

    if (touchStart - touchEnd < -75) {
      // Swiped right
      handlePrev();
    }
  };

  if (publishedBanners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full px-4 pt-4 pb-6">
      {/* Banner Container */}
      <div
        className="relative w-full aspect-[16/9] rounded-[20px] overflow-hidden shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Images */}
        {publishedBanners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title || `Banner ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Text Overlay */}
            {(banner.title || banner.description) && (
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-20">
                {banner.title && (
                  <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-tamil-bold)" }}>
                    {banner.title}
                  </h3>
                )}
                {banner.description && (
                  <p className="text-sm text-white/90 line-clamp-2">
                    {banner.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Navigation Arrows (Desktop) */}
        {publishedBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Dot Indicators */}
      {publishedBanners.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {publishedBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? "w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
