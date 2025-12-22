import { useMemo, useState } from "react";

import { AdminBannerManager } from "./AdminBannerManager";
import { AdminWallpaperManager } from "./AdminWallpaperManager";
import { AdminMediaManager } from "./AdminMediaManager";
import { AdminSyncedLyricsManager } from "./AdminSyncedLyricsManager";
import { AdminSparkleManager } from "./AdminSparkleManager";

import { AdminPopupBannerManager } from "./AdminPopupBannerManager";
import { AdminAdTest } from "./AdminAdTest";

type ContentTab =
  | "banners"
  | "popup-banners"

  | "wallpapers"
  | "media"
  | "synced-lyrics"
  | "sparkle"
  | "ads-test";

export function AdminContent() {
  const tabs = useMemo(
    () => [
      { id: "wallpapers" as const, label: "Wallpapers" },
      { id: "media" as const, label: "Media" },
      { id: "synced-lyrics" as const, label: "Synced Lyrics" },
      { id: "sparkle" as const, label: "Sparkle" },
      { id: "banners" as const, label: "Banners" },
      { id: "popup-banners" as const, label: "Popup Banners" },
      { id: "ads-test" as const, label: "Ad Test" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState<ContentTab>("wallpapers");

  const render = () => {
    switch (activeTab) {
      case "wallpapers":
        return <AdminWallpaperManager />;
      case "media":
        return <AdminMediaManager />;
      case "synced-lyrics":
        return <AdminSyncedLyricsManager />;
      case "sparkle":
        return <AdminSparkleManager />;
      case "banners":
        return <AdminBannerManager />;
      case "popup-banners":
        return <AdminPopupBannerManager />;
      case "ads-test":
        return <AdminAdTest />;

      default:
        return <AdminWallpaperManager />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "var(--font-english)" }}>
          Content
        </h2>
        <p className="text-gray-500 mt-1">Manage app content modules</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-green-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {render()}
    </div>
  );
}
