import { projectId, publicAnonKey } from "./supabase/info";

export type PopupBanner = {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  target_url?: string | null;
  publish_status: string;
  is_enabled: boolean;
  priority: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  view_count?: number;
  click_count?: number;
};

const SUPABASE_URL = `https://${projectId}.supabase.co`;

export async function fetchActivePopupBanner(): Promise<PopupBanner | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/make-server-4a075ebc/api/popup-banners/active?t=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      },
    );

    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success) return null;
    return json.data || null;
  } catch {
    return null;
  }
}

export function resolvePopupBannerNavigationTarget(targetUrl?: string | null):
  | { kind: "tab"; tab: string }
  | { kind: "url"; url: string }
  | null {
  if (!targetUrl) return null;

  const trimmed = targetUrl.trim();
  if (!trimmed) return null;

  // Internal tab navigation via custom event.
  // Convention: target_url can be like "tab:dashboard" or "tab:spark".
  if (trimmed.toLowerCase().startsWith("tab:")) {
    const tab = trimmed.slice(4).trim();
    return tab ? { kind: "tab", tab } : null;
  }

  // External or absolute url
  return { kind: "url", url: trimmed };
}

export function navigateFromPopupBanner(targetUrl?: string | null) {
  const target = resolvePopupBannerNavigationTarget(targetUrl);
  if (!target) return;

  if (target.kind === "tab") {
    window.dispatchEvent(
      new CustomEvent("murugan:navigate", {
        detail: { tab: target.tab, source: "popup_banner" },
      }),
    );
    return;
  }

  // Default: open in same tab
  window.location.href = target.url;
}
