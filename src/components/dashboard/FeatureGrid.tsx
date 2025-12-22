import muruganCalendarIcon from "@/assets/murugan-calendar.png";
import prayIcon from "@/assets/pray.png";
import diwaliIcon from "@/assets/diwali.png";
import popularTempleIcon from "@/assets/popular-temple.png";
import muruganHistoryIcon from "@/assets/murugan_history.png";
import kandhaSastiIcon from "@/assets/Kandha-sasti.png";
import ringsIcon from "@/assets/rings.png";
import holidayIcon from "@/assets/holiday.png";
import { useEffect, useMemo, useRef, useState } from "react";
import { projectId, publicAnonKey } from "@/utils/supabase/info";
import { trackEvent } from "@/utils/analytics/trackEvent";

type Feature = {
  id: string;
  title: string;
  iconSrc: string;
  bgColor: string;
  textColor: string;
  analyticsKey?: string;
  experimentId?: string;
  variant?: string;
};

const FEATURES: Feature[] = [
  {
    id: "murugan-festivals",
    title: "விசேஷ\nநாட்கள்",
    iconSrc: diwaliIcon,
    bgColor: "#DCEBFF",
    textColor: "#264E86",
    analyticsKey: "murugan-festivals",
  },
  {
    id: "viratha-days",
    title: "விரத\nநாட்கள்",
    iconSrc: prayIcon,
    bgColor: "#E9E6F9",
    textColor: "#4332A5",
    analyticsKey: "viratha-days",
  },
  {
    id: "murugan-calendar",
    title: "முருகன்\nகாலண்டர்",
    iconSrc: muruganCalendarIcon,
    bgColor: "#FFF0F5",
    textColor: "#8B0000",
    analyticsKey: "murugan-calendar",
  },
  {
    id: "popular-temples",
    title: "புகழ்பெற்ற\nகோவில்கள்",
    iconSrc: popularTempleIcon,
    bgColor: "#E0F5E8",
    textColor: "#006644",
    analyticsKey: "popular-temples",
  },
  {
    id: "muhurtham-days",
    title: "சுபமுகூர்த்த\nநாட்கள்",
    iconSrc: ringsIcon,
    bgColor: "#F1FED5",
    textColor: "#8C6239",
    analyticsKey: "muhurtham-days",
  },
  {
    id: "kandha-sasti-kavasam",
    title: "கந்த சஷ்டி\nகவசம் பாடல்",
    iconSrc: kandhaSastiIcon,
    bgColor: "#F9EAE6",
    textColor: "#CA3910",
    analyticsKey: "kandha-sasti-kavasam",
  },
  {
    id: "murugan-varalaru",
    title: "முருகன்\nவரலாறு",
    iconSrc: muruganHistoryIcon,
    bgColor: "#FFF3E0",
    textColor: "#8C6239",
    analyticsKey: "murugan-varalaru",
  },
  {
    id: "holidays-2026",
    title: "விடுமுறை\nநாட்கள்",
    iconSrc: holidayIcon,
    bgColor: "#D5FFD9",
    textColor: "#1CA028",
    analyticsKey: "holidays-2026",
  },
];

type ApiDashboardFeature = {
  id: string;
  title: string;
  subtitle?: string | null;
  icon: string;
  bg_color: string;
  text_color: string;
  route: string;
  order_index: number;
  visible: boolean;
  analytics_key: string;
  experiment_id?: string;
  variant?: string;
};

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

let memoryExperimentBucketId: string | null = null;

function safeRandomUUID(): string {
  try {
    const c = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
    const grv = c?.getRandomValues?.bind(c);
    const bytes = new Uint8Array(16);
    if (grv) {
      grv(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${rnd()}${rnd()}-${rnd()}-4${rnd().slice(1)}-8${rnd().slice(1)}-${rnd()}${rnd()}${rnd()}`;
  }
}

function getExperimentBucketId(): string {
  const key = "murugan_experiment_bucket_id_v1";
  try {
    const storage = (globalThis as any)?.localStorage;
    if (storage?.getItem) {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const id = safeRandomUUID();
      storage.setItem(key, id);
      return id;
    }
  } catch {
    // ignore
  }
  if (memoryExperimentBucketId) return memoryExperimentBucketId;
  memoryExperimentBucketId = safeRandomUUID();
  return memoryExperimentBucketId;
}

function resolveIconSrc(icon: string): string {
  const value = (icon || "").trim();
  if (!value) return diwaliIcon;
  if (/^https?:\/\//i.test(value)) return value;

  // If API stores a storage path like "icons/abc.png", build Supabase public URL
  if (value.includes("/")) {
    return `https://${projectId}.supabase.co/storage/v1/object/public/dashboard-icons/${value}`;
  }

  return mapIconToSrc(value);
}

function mapIconToSrc(icon: string): string {
  const key = (icon || "").toLowerCase();
  const map: Record<string, string> = {
    diwali: diwaliIcon,
    diya: diwaliIcon,
    pray: prayIcon,
    hands: prayIcon,
    "murugan-calendar": muruganCalendarIcon,
    calendar: muruganCalendarIcon,
    "popular-temple": popularTempleIcon,
    "popular-temples": popularTempleIcon,
    temple: popularTempleIcon,
    rings: ringsIcon,
    "kandha-sasti": kandhaSastiIcon,
    "kandha-sasti-kavasam": kandhaSastiIcon,
    kandha: kandhaSastiIcon,
    "murugan-history": muruganHistoryIcon,
    "murugan-varalaru": muruganHistoryIcon,
    stories: muruganHistoryIcon,
    holiday: holidayIcon,
    "holidays-2026": holidayIcon,
  };
  return map[key] || diwaliIcon;
}

function titleToAriaLabel(title: string) {
  return title.replace(/\n/g, " ").trim();
}

export function FeatureGrid({
  onOpenMuruganCalendar,
  onOpenKandhaSasti,
  onOpenVirathaDays,
  onOpenMuruganFestivals,
  onOpenPopularTemples,
  onOpenMuruganVaralaru,
  onOpenMuhurthamDays,
  onOpenHolidays2026,
  onOpenMuruganBabyNames,
}: {
  onOpenMuruganCalendar?: () => void;
  onOpenKandhaSasti?: () => void;
  onOpenVirathaDays?: () => void;
  onOpenMuruganFestivals?: () => void;
  onOpenPopularTemples?: () => void;
  onOpenMuruganVaralaru?: () => void;
  onOpenMuhurthamDays?: () => void;
  onOpenHolidays2026?: () => void;
  onOpenMuruganBabyNames?: () => void;
}) {
  const [features, setFeatures] = useState<Feature[]>(FEATURES);
  const [loadedFromApi, setLoadedFromApi] = useState(false);
  const impressionSentRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const bucket = getExperimentBucketId();
        const res = await fetch(`${API_BASE}/api/dashboard/features`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "X-Experiment-Bucket": bucket,
          },
        });
        const json = await res.json().catch(() => null);
        const rows = (json?.data || []) as ApiDashboardFeature[];
        if (!res.ok || !Array.isArray(rows) || rows.length === 0) return;

        const mapped: Feature[] = rows.map((f) => ({
          id: f.route,
          title: f.title,
          iconSrc: resolveIconSrc(f.icon),
          bgColor: f.bg_color,
          textColor: f.text_color,
          analyticsKey: f.analytics_key,
          experimentId: f.experiment_id,
          variant: f.variant,
        }));

        if (!cancelled) {
          setFeatures(mapped);
          setLoadedFromApi(true);
        }
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    for (const f of features) {
      const k = f.analyticsKey || f.id;
      if (impressionSentRef.current.has(k)) continue;
      impressionSentRef.current.add(k);
      trackEvent("feature_card_impression", {
        feature_key: k,
        route: f.id,
        source: loadedFromApi ? "api" : "fallback",
        ...(f.experimentId && f.variant ? { experiment_id: f.experimentId, variant: f.variant } : {}),
      });
    }
  }, [features, loadedFromApi]);

  const handlersById = useMemo(
    () =>
      new Map<string, (() => void) | undefined>([
        ["murugan-calendar", onOpenMuruganCalendar],
        ["muhurtham-days", onOpenMuhurthamDays],
        ["kandha-sasti-kavasam", onOpenKandhaSasti],
        ["viratha-days", onOpenVirathaDays],
        ["murugan-festivals", onOpenMuruganFestivals],
        ["holidays-2026", onOpenHolidays2026],
        ["popular-temples", onOpenPopularTemples],
        ["murugan-varalaru", onOpenMuruganVaralaru],
      ]),
    [
      onOpenKandhaSasti,
      onOpenMuhurthamDays,
      onOpenMuruganCalendar,
      onOpenHolidays2026,
      onOpenMuruganFestivals,
      onOpenMuruganVaralaru,
      onOpenMuruganBabyNames,
      onOpenPopularTemples,
      onOpenVirathaDays,
    ]
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {features.map(({ id, title, iconSrc, bgColor, textColor, analyticsKey, experimentId, variant }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            trackEvent("feature_card_click", {
              feature_key: analyticsKey || id,
              route: id,
              ...(experimentId && variant ? { experiment_id: experimentId, variant } : {}),
            });
            handlersById.get(id)?.();
          }}
          aria-label={titleToAriaLabel(title)}
          className="group relative flex min-h-[124px] flex-col items-center justify-center rounded-2xl border border-black/5 p-4 text-center shadow-[0px_10px_22px_rgba(0,0,0,0.06)] transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5e38]/40"
          style={{ background: bgColor }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
            <img
              src={iconSrc}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 object-contain"
              draggable={false}
            />
          </div>
          <div
            className="mt-3 text-center text-[20px] font-bold"
            style={{
              fontFamily: "var(--font-tamil-bold)",
              color: textColor,
            }}
          >
            {title.split("\n").map((line, index) => (
              <div
                key={`${id}-line-${index}`}
                className={
                  index === 0
                    ? "leading-[0.9]"
                    : "-mt-2 leading-[0.9] min-[430px]:-mt-2.5"
                }
                style={{ fontFamily: "var(--font-tamil-bold)" }}
              >
                {line}
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
