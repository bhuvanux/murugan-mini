import React from "react";
import loginCover from "@/custom-assets/Login-cover.png";
import kidMurugan from "@/custom-assets/kid-murugan.png";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

type Slide = {
  id: string;
  imageSrc?: string;
};

const SLIDES: Slide[] = [
  {
    id: "s1",
    imageSrc: kidMurugan,
  },
  {
    id: "s2",
    imageSrc: loginCover,
  },
  {
    id: "s3",
    imageSrc: loginCover,
  },
];

export function DashboardBannerCarousel() {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const scrollToIndex = React.useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth;
      if (!w) return;
      const idx = Math.round(el.scrollLeft / w);
      setSelectedIndex(Math.max(0, Math.min(SLIDES.length - 1, idx)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const id = window.setInterval(() => {
      const next = (selectedIndex + 1) % SLIDES.length;
      scrollToIndex(next);
    }, 4500);

    return () => window.clearInterval(id);
  }, [scrollToIndex, selectedIndex]);

  return (
    <div className="relative">
      <style>{".dashboard-banner-scroller::-webkit-scrollbar{display:none}"}</style>
      <div
        ref={scrollerRef}
        className="dashboard-banner-scroller w-full overflow-x-auto overflow-y-hidden rounded-2xl bg-[#0d5e38]"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          touchAction: "pan-x pan-y pinch-zoom",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          height: 190,
        }}
      >
        <div className="flex select-none">
          {SLIDES.map((slide) => (
            <div
              key={slide.id}
              className="flex-[0_0_100%]"
              style={{ scrollSnapAlign: "start" }}
            >
              <div
                className="relative w-full rounded-2xl overflow-hidden bg-[#0d5e38]"
                style={{ height: 190 }}
              >
                {slide.imageSrc ? (
                  <ImageWithFallback
                    src={slide.imageSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#0d5e38]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
        {SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => scrollToIndex(idx)}
            className={`h-[7px] rounded-full transition-all ${
              idx === selectedIndex
                ? "w-[18px] bg-white"
                : "w-[7px] bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
