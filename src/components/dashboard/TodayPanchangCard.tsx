import React from "react";
import { Calendar, Sunrise, Sunset, Star } from "lucide-react";
import panchangData from "@/assets/data/panchang_mobile_2025.json";

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

const TITHI_TAMIL: string[] = [
  "",
  "பிரதமை",
  "துவிதியை",
  "திரிதியை",
  "சதுர்த்தி",
  "பஞ்சமி",
  "ஷஷ்டி",
  "ஸப்தமி",
  "அஷ்டமி",
  "நவமி",
  "தசமி",
  "ஏகாதசி",
  "துவாதசி",
  "திரயோதசி",
  "சதுர்த்தசி",
  "பௌர்ணமி",
  "பிரதமை",
  "துவிதியை",
  "திரிதியை",
  "சதுர்த்தி",
  "பஞ்சமி",
  "ஷஷ்டி",
  "ஸப்தமி",
  "அஷ்டமி",
  "நவமி",
  "தசமி",
  "ஏகாதசி",
  "துவாதசி",
  "திரயோதசி",
  "சதுர்த்தசி",
  "அமாவாசை",
];

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

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pakshaTamil(paksha: string) {
  const p = paksha.toLowerCase();
  if (p.includes("shukla")) return "சுக்ல";
  if (p.includes("krishna")) return "கிருஷ்ண";
  return paksha;
}

function safeIndexName(list: string[], idx: number) {
  return list[idx] || String(idx);
}

function formatTamilWeekday(weekdayTa: string) {
  const w = String(weekdayTa || "").trim();
  if (!w) return "";
  if (w.endsWith("கிழமை")) return w;
  return `${w}க்கிழமை`;
}

const RAHU_TABLE: string[] = [
  "07:30–09:00",
  "15:00–16:30",
  "12:00–13:30",
  "13:30–15:00",
  "10:30–12:00",
  "09:00–10:30",
  "16:30–18:00",
];

const YAMA_TABLE: string[] = [
  "06:00–07:30",
  "10:30–12:00",
  "09:00–10:30",
  "06:00–07:30",
  "15:00–16:30",
  "12:00–13:30",
  "13:30–15:00",
];

const KULIGAI_TABLE: string[] = [
  "15:00–16:30",
  "12:00–13:30",
  "07:30–09:00",
  "10:30–12:00",
  "09:00–10:30",
  "06:00–07:30",
  "07:30–09:00",
];

function getPythonWeekdayIndex(isoDate: string) {
  const jsDay = new Date(`${isoDate}T00:00:00`).getDay();
  return (jsDay + 6) % 7;
}

export function TodayPanchangCard() {
  const [expanded, setExpanded] = React.useState(false);
  const [isLargePhone, setIsLargePhone] = React.useState(false);

  React.useEffect(() => {
    const update = () => setIsLargePhone(window.innerWidth >= 430);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const todayIso = React.useMemo(() => toISODateLocal(new Date()), []);

  const entry = React.useMemo(() => {
    const list = panchangData as PanchangEntry[];
    const found = list.find((e) => e.date === todayIso);
    return found || list[0];
  }, [todayIso]);

  const tithiName = safeIndexName(TITHI_TAMIL, entry.tithi);
  const nakshatraName = safeIndexName(NAKSHATRA_TAMIL, entry.nakshatra);

  const pyWeekday = React.useMemo(() => getPythonWeekdayIndex(entry.date), [entry.date]);
  const rahuKalam = RAHU_TABLE[pyWeekday];
  const yamaGandam = YAMA_TABLE[pyWeekday];
  const kuligai = KULIGAI_TABLE[pyWeekday];
  const nallaNeramMorning = "07:15–08:15";
  const nallaNeramEvening = "16:45–17:45";

  const titleFontSize = isLargePhone ? 26 : 20;
  const headerDateFontSize = isLargePhone ? 18 : 14;
  const weekdayFontSize = isLargePhone ? 20 : 16;
  const tamilDateFontSize = isLargePhone ? 18 : 15;
  const timeFontSize = isLargePhone ? 18 : 14;
  const labelFontSize = isLargePhone ? 16 : 14;
  const valueFontSize = isLargePhone ? 16 : 14;

  return (
    <div className="bg-white rounded-2xl shadow-[0px_6px_20px_rgba(0,0,0,0.06)] border border-black/5 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-[#0d5e38] to-[#0d7a3e]">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-white" />
          <div
            className="text-white"
            style={{
              fontFamily: "var(--font-tamil-bold)",
              fontSize: titleFontSize,
              lineHeight: 1.15,
            }}
          >
            இன்றைய பஞ்சாங்கம்
          </div>
        </div>
        <div
          className="text-white/95 mt-2"
          style={{
            fontFamily: "var(--font-tamil-bold)",
            fontSize: headerDateFontSize,
            lineHeight: 1.15,
          }}
        >
          {entry.date}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-gray-900"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: weekdayFontSize,
                lineHeight: 1.15,
              }}
            >
              {formatTamilWeekday(entry.weekday_ta)}
            </div>
            <div
              className="text-gray-600 mt-1"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: tamilDateFontSize,
                lineHeight: 1.15,
              }}
            >
              {entry.tamil_day} {entry.tamil_month}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sunrise className="w-5 h-5 text-orange-500" />
              <div
                className="text-gray-800"
                style={{
                  fontFamily: "var(--font-tamil-bold)",
                  fontSize: timeFontSize,
                  lineHeight: 1.15,
                }}
              >
                {entry.sunrise}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sunset className="w-5 h-5 text-orange-500" />
              <div
                className="text-gray-800"
                style={{
                  fontFamily: "var(--font-tamil-bold)",
                  fontSize: timeFontSize,
                  lineHeight: 1.15,
                }}
              >
                {entry.sunset}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div
              className="text-gray-700"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: labelFontSize,
                lineHeight: 1.15,
              }}
            >
              திதி
            </div>
            <div
              className="text-gray-900 mt-2"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: valueFontSize,
                lineHeight: 1.15,
              }}
            >
              {pakshaTamil(entry.paksha)}
              <br />
              {tithiName}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="flex items-start justify-between">
              <div
                className="text-gray-700"
                style={{
                  fontFamily: "var(--font-tamil-bold)",
                  fontSize: labelFontSize,
                  lineHeight: 1.15,
                }}
              >
                நட்சத்திரம்
              </div>
              <Star className="w-5 h-5 text-gray-800" />
            </div>
            <div
              className="text-gray-900 mt-2"
              style={{
                fontFamily: "var(--font-tamil-bold)",
                fontSize: valueFontSize,
                lineHeight: 1.15,
              }}
            >
              {nakshatraName}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 rounded-2xl bg-[#F6FFF8] border border-black/5 p-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}>
                  ராகு காலம்
                </div>
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: valueFontSize, lineHeight: 1.15 }}>
                  {rahuKalam}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}>
                  எமகண்டம்
                </div>
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: valueFontSize, lineHeight: 1.15 }}>
                  {yamaGandam}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}>
                  குளிகை
                </div>
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: valueFontSize, lineHeight: 1.15 }}>
                  {kuligai}
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}>
                  நல்ல நேரம்
                </div>
                <div className="text-right" style={{ fontFamily: "var(--font-tamil-bold)", fontSize: valueFontSize, lineHeight: 1.15 }}>
                  காலை {nallaNeramMorning}
                  <br />
                  மாலை {nallaNeramEvening}
                </div>
              </div>
              {Array.isArray(entry.festivals) && entry.festivals.length > 0 && (
                <div className="flex items-start justify-between">
                  <div style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}>
                    பண்டிகைகள்
                  </div>
                  <div className="text-right" style={{ fontFamily: "var(--font-tamil-bold)", fontSize: valueFontSize, lineHeight: 1.15 }}>
                    {entry.festivals.join(", ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[#0d5e38]"
            style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}
          >
            {expanded ? "குறைவாக காண" : "மேலும் காண"}
          </button>

          <button
            type="button"
            disabled
            className="text-gray-500"
            style={{ fontFamily: "var(--font-tamil-bold)", fontSize: labelFontSize, lineHeight: 1.15 }}
          >
            முழு விவரம் (விரைவில்)
          </button>
        </div>
      </div>
    </div>
  );
}
