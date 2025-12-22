import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import quotesBanner from "@/assets/quotes_banner.jpg";
import { projectId, publicAnonKey } from "@/utils/supabase/info";
import panchangMobile2025 from "@/assets/data/panchang_mobile_2025.json";
import panchangMobile2026 from "@/assets/data/panchang_mobile_2026.json";

type DailyQuote = {
  id?: string;
  text: string;
  background_url?: string | null;
};

type PanchangEntry = {
  date: string;
  tithi: number;
  paksha: string;
  nakshatra: number;
  sunrise: string;
  sunset: string;
  tamil_day: number;
  tamil_month: string;
  weekday_ta: string;
  festivals?: string[];
};

const NAKSHATRA_TAMIL: string[] = [
  "",
  "அசுவினி",
  "பரணி",
  "கிருத்திகை",
  "ரோகிணி",
  "மிருகசீரிஷம்",
  "திருவாதிரை",
  "புனர்பூசம்",
  "பூசம்",
  "ஆயில்யம்",
  "மகம்",
  "பூரம்",
  "உத்திரம்",
  "ஹஸ்தம்",
  "சித்திரை",
  "சுவாதி",
  "விசாகம்",
  "அனுஷம்",
  "கேட்டை",
  "மூலம்",
  "பூராடம்",
  "உத்திராடம்",
  "திருவோணம்",
  "அவிட்டம்",
  "சதயம்",
  "பூரட்டாதி",
  "உத்திரட்டாதி",
  "ரேவதி",
];

function safeIndexName(list: string[], idx: number) {
  return list[idx] || String(idx);
}

function formatDateTaLong(iso: string) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("ta-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateDDMMYYYY(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTamilWeekday(weekdayTa: string) {
  const w = String(weekdayTa || "").trim();
  if (!w) return "";
  if (w.endsWith("கிழமை")) return w;
  return `${w}க்கிழமை`;
}

export function DailyQuoteCard({
  onOpenMuruganCalendar,
}: {
  onOpenMuruganCalendar?: () => void;
}) {
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const trackedQuoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const todayIso = toISODateLocal(new Date());
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/quotes/today?date=${encodeURIComponent(todayIso)}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          setIsLoaded(true);
          return;
        }
        const data = await resp.json().catch(() => null);
        const next = data?.data;
        if (next && typeof next.text === "string") {
          setQuote({
            id: next.id,
            text: next.text,
            background_url: next.background_url ?? null,
          });
        }
        setIsLoaded(true);
      } catch (e) {
        setIsLoaded(true);
        return;
      }
    })();

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!quote?.id) return;
    if (trackedQuoteIdRef.current === quote.id) return;
    trackedQuoteIdRef.current = quote.id;

    const ctrl = new AbortController();

    (async () => {
      try {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/track`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module_name: "quote",
            item_id: quote.id,
            event_type: "view",
            metadata: { source: "dashboard" },
          }),
          signal: ctrl.signal,
        });
      } catch {
        return;
      }
    })();

    return () => ctrl.abort();
  }, [quote?.id]);

  const DATE_FONT_SIZE_PX = 22;
  const DETAILS_FONT_SIZE_PX = 18;

  const todayIso = useMemo(() => toISODateLocal(new Date()), []);
  const panchang = useMemo(() => {
    const year = Number(todayIso.slice(0, 4));
    const list = (year >= 2026 ? (panchangMobile2026 as PanchangEntry[]) : (panchangMobile2025 as PanchangEntry[])) || [];
    const found = list.find((e) => e.date === todayIso);
    return found || list[0] || null;
  }, [todayIso]);

  const bgSrc = quote?.background_url || quotesBanner;

  const handleClick = async () => {
    try {
      if (quote?.id) {
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/analytics/track`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module_name: "quote",
            item_id: quote.id,
            event_type: "click",
            metadata: { source: "dashboard", target: "panchang" },
          }),
        });
      }
    } catch {
      // ignore
    }

    onOpenMuruganCalendar?.();
  };

  if (!isLoaded) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white"
        style={{ height: 176 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse" />
        <div className="relative h-full w-full p-4 flex flex-col justify-between">
          <div className="space-y-3" style={{ maxWidth: "72%" }}>
            <div className="h-7 w-40 rounded-lg bg-gray-200" />
            <div className="h-5 w-56 rounded-lg bg-gray-200" />
            <div className="h-5 w-32 rounded-lg bg-gray-200" />
          </div>
          <div className="h-5 w-36 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-black/5" style={{ height: 176 }}>
      <img
        src={bgSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0">
        <div className="h-full w-full flex items-center">
          <div className="p-4" style={{ maxWidth: "72%" }}>
            <style>
              {`@keyframes muruganCtaArrowNudge { 0%, 100% { transform: translateX(0); opacity: 0.9; } 50% { transform: translateX(6px); opacity: 1; } }`}
            </style>
            <div
              style={{
                fontFamily: "var(--font-english)",
                fontSize: DATE_FONT_SIZE_PX,
                fontWeight: 800,
                lineHeight: 1.1,
                color: "#FB5387",
              }}
            >
              {formatDateDDMMYYYY(todayIso)}
            </div>

            <div
              className="mt-2"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: DETAILS_FONT_SIZE_PX,
                lineHeight: 1.2,
                color: "#2c2c2c",
                whiteSpace: "pre-line",
              }}
            >
              {panchang
                ? `${formatTamilWeekday(panchang.weekday_ta)}\n${panchang.tamil_month} ${panchang.tamil_day}`
                : formatDateTaLong(todayIso)}
            </div>

            {panchang && (
              <div
                className="mt-2"
                style={{
                  fontFamily: "var(--font-tamil-bold)",
                  fontSize: DETAILS_FONT_SIZE_PX,
                  lineHeight: 1.2,
                  color: "#2c2c2c",
                }}
              >
                {safeIndexName(NAKSHATRA_TAMIL, panchang.nakshatra)}
              </div>
            )}

            <button
              type="button"
              onClick={handleClick}
              className="mt-3 inline-flex items-center gap-2"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: DETAILS_FONT_SIZE_PX,
                lineHeight: 1.15,
                color: "#2563eb",
              }}
            >
              இன்றைய பஞ்சாங்கம்
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  animation: "muruganCtaArrowNudge 1.1s ease-in-out infinite",
                }}
              >
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
