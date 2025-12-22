import React from "react";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { ModuleBannerCarousel } from "@/components/ModuleBannerCarousel";
import { FeatureGrid } from "@/components/dashboard/FeatureGrid";
import { DailyQuoteCard } from "@/components/dashboard/DailyQuoteCard";
import { PopupBannerModal } from "@/components/PopupBannerModal";
import { fetchActivePopupBanner, PopupBanner } from "@/utils/popupBannerAPI";

export function Dashboard({
  onOpenMuruganCalendar,
  onOpenKandhaSasti,
  onOpenVirathaDays,
  onOpenMuruganFestivals,
  onOpenPopularTemples,
  onOpenMuruganVaralaru,
  onOpenMuhurthamDays,
  onOpenHolidays2026,
}: {
  onOpenMuruganCalendar?: () => void;
  onOpenKandhaSasti?: () => void;
  onOpenVirathaDays?: () => void;
  onOpenMuruganFestivals?: () => void;
  onOpenPopularTemples?: () => void;
  onOpenMuruganVaralaru?: () => void;
  onOpenMuhurthamDays?: () => void;
  onOpenHolidays2026?: () => void;
}) {
  const BANNER_OVERLAP_PX = 28;

  const [popupBanner, setPopupBanner] = React.useState<PopupBanner | null>(null);
  const [showPopupBanner, setShowPopupBanner] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const banner = await fetchActivePopupBanner();
        if (cancelled) return;
        if (!banner) return;

        const key = `popup_banner_dismissed_${banner.id}`;
        const dismissed = (() => {
          try {
            return sessionStorage.getItem(key) === "1";
          } catch {
            return false;
          }
        })();

        if (dismissed) return;
        setPopupBanner(banner);
        setShowPopupBanner(true);
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0d5e38" }}>
      {showPopupBanner && popupBanner && (
        <PopupBannerModal
          banner={popupBanner}
          onClose={() => {
            try {
              sessionStorage.setItem(`popup_banner_dismissed_${popupBanner.id}`, "1");
            } catch {
              // ignore
            }
            setShowPopupBanner(false);
          }}
        />
      )}

      <GreetingHeader />

      <div
        className="px-4"
        style={{
          background: "#0d5e38",
          paddingBottom: 12,
          position: "relative",
          zIndex: 1,
        }}
      >
        <ModuleBannerCarousel bannerType="home" />
      </div>

      <div style={{ height: BANNER_OVERLAP_PX, background: "#0d5e38" }} />

      <div
        className="rounded-t-[28px] bg-[#F2FFF6] pb-[96px]"
        style={{
          marginTop: -BANNER_OVERLAP_PX,
          paddingTop: 16,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="px-4">
          <div className="px-0">
            <DailyQuoteCard onOpenMuruganCalendar={onOpenMuruganCalendar} />
          </div>

          <div style={{ paddingTop: 16 }}>
            <FeatureGrid
              onOpenMuruganCalendar={onOpenMuruganCalendar}
              onOpenKandhaSasti={onOpenKandhaSasti}
              onOpenVirathaDays={onOpenVirathaDays}
              onOpenMuruganFestivals={onOpenMuruganFestivals}
              onOpenPopularTemples={onOpenPopularTemples}
              onOpenMuruganVaralaru={onOpenMuruganVaralaru}
              onOpenMuhurthamDays={onOpenMuhurthamDays}
              onOpenHolidays2026={onOpenHolidays2026}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
