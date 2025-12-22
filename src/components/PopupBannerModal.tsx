import React from "react";
import { X } from "lucide-react";
import { useAnalytics } from "../utils/analytics/useAnalytics";
import { trackEvent } from "../utils/analytics/trackEvent";
import { PopupBanner, navigateFromPopupBanner } from "../utils/popupBannerAPI";

export function PopupBannerModal({
  banner,
  onClose,
}: {
  banner: PopupBanner;
  onClose: () => void;
}) {
  const analytics = useAnalytics("popup_banner", banner.id);

  React.useEffect(() => {
    analytics.trackEvent("view", { placement: "dashboard_popup" });
    trackEvent("popup_banner_view", {
      feature_key: "popup_banner",
      popup_banner_id: banner.id,
      title: banner.title,
      placement: "dashboard_popup",
    });
  }, [banner.id]);

  const handleAction = () => {
    analytics.trackEvent("click", {
      placement: "dashboard_popup",
      target_url: banner.target_url,
    });
    trackEvent("popup_banner_click", {
      feature_key: "popup_banner",
      popup_banner_id: banner.id,
      title: banner.title,
      target_url: banner.target_url,
    });

    onClose();

    navigateFromPopupBanner(banner.target_url);

    trackEvent("popup_banner_navigate", {
      feature_key: "popup_banner",
      popup_banner_id: banner.id,
      target_url: banner.target_url,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur" />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-lg"
          aria-label="Close popup"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          onClick={handleAction}
          className="block"
          aria-label="Open popup link"
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="h-auto w-full object-cover"
          />
        </button>
      </div>
    </div>
  );
}
