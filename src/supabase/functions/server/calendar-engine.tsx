import * as Astronomy from "https://esm.sh/astronomy-engine@2.0.4";
import {
  CHENNAI,
  IST_OFFSET_MINUTES,
  KULIGAI_SEGMENT_BY_JS_DAY,
  NAKSHATRA_NAMES_TA,
  RAHU_SEGMENT_BY_JS_DAY,
  TAMIL_MONTH_BOUNDARIES,
  TAMIL_WEEKDAYS,
  TITHI_NAMES_TA,
  YAMA_SEGMENT_BY_JS_DAY,
} from "./calendar-constants.tsx";

export type CalendarDayRow = {
  gregorian_date: string;
  tamil_month: string | null;
  tamil_day: number | null;
  tamil_year: number | null;
  weekday_tamil: string | null;
  paksham: "Valar" | "Thei" | null;
  is_today: boolean;
  festival_name?: string | null;
};

export type PanchangComputedRow = {
  tithi_name: string | null;
  tithi_number?: number | null;
  tithi_start: string | null;
  tithi_end: string | null;
  nakshatra_name: string | null;
  nakshatra_number?: number | null;
  nakshatra_start: string | null;
  nakshatra_end: string | null;
  yogam: string | null;
  karanam: string | null;
  is_sashti: boolean;
  is_skanda_sashti: boolean;
  is_ashtami?: boolean;
  is_navami?: boolean;
  is_ekadashi?: boolean;
  is_pradosham?: boolean;
  is_amavasai: boolean;
  is_pournami: boolean;
  computation_source: "engine" | "admin_override" | "fallback";
};

export type TimingsRow = {
  sunrise: string | null;
  sunset: string | null;
  nalla_neram_morning: string | null;
  nalla_neram_evening: string | null;
  rahu_kalam: string | null;
  yamagandam: string | null;
  kuligai: string | null;
  abhijit: string | null;
};

export type ComputedDay = {
  calendar: CalendarDayRow;
  panchang: PanchangComputedRow;
  timings: TimingsRow;
};

function normalizeAngle360(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

function unwrapSequence(values: number[]): number[] {
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i += 1) {
    let v = values[i];
    while (v - prev > 180) v -= 360;
    while (v - prev < -180) v += 360;
    out.push(v);
    prev = v;
  }
  return out;
}

function chooseUnwrappedTarget(targetRaw: number, minUnwrapped: number, maxUnwrapped: number): number {
  const k = Math.round((minUnwrapped - targetRaw) / 360);
  let t = targetRaw + 360 * k;
  while (t < minUnwrapped) t += 360;
  while (t > maxUnwrapped) t -= 360;
  if (t < minUnwrapped) t += 360;
  return t;
}

function findCrossingUnwrapped(
  angleFn: (t: Date) => number,
  targetRaw: number,
  tStart: Date,
  tEnd: Date,
): Date | null {
  const steps = 96;
  const times: Date[] = [];
  const values: number[] = [];

  const startMs = tStart.getTime();
  const endMs = tEnd.getTime();

  for (let i = 0; i <= steps; i += 1) {
    const ms = startMs + (endMs - startMs) * (i / steps);
    const dt = new Date(ms);
    times.push(dt);
    values.push(angleFn(dt));
  }

  const unwrapped = unwrapSequence(values);
  let minU = unwrapped[0];
  let maxU = unwrapped[0];
  for (const v of unwrapped) {
    minU = Math.min(minU, v);
    maxU = Math.max(maxU, v);
  }

  const target = chooseUnwrappedTarget(targetRaw, minU - 1, maxU + 1);

  for (let i = 0; i < unwrapped.length - 1; i += 1) {
    const a = unwrapped[i] - target;
    const b = unwrapped[i + 1] - target;

    if (a === 0) return times[i];

    if (a < 0 && b >= 0) {
      let lo = times[i].getTime();
      let hi = times[i + 1].getTime();
      for (let iter = 0; iter < 50; iter += 1) {
        const mid = Math.floor((lo + hi) / 2);
        const loVal = angleFn(new Date(lo));
        const midVal = angleFn(new Date(mid));

        const loArr = unwrapSequence([loVal, midVal]);
        const loDiff = loArr[0] - target;
        const midDiff = loArr[1] - target;

        if (loDiff < 0 && midDiff >= 0) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return new Date(hi);
    }
  }

  return null;
}

function parseIst(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}+05:30`);
}

function todayIstDateString(now = new Date()): string {
  const t = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRangeIst(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export function getTamilMonthAndDay(dateStr: string): { tamil_month: string; tamil_day: number; weekday_tamil: string } {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const y = Number(m?.[1]);
  const mo = Number(m?.[2]);
  const da = Number(m?.[3]);
  const year = Number.isFinite(y) ? y : new Date().getUTCFullYear();
  const monthIndex = Number.isFinite(mo) ? Math.max(0, Math.min(11, mo - 1)) : 0;
  const dayOfMonth = Number.isFinite(da) ? Math.max(1, Math.min(31, da)) : 1;

  const candidates: Array<{ month: string; startUtc: Date }> = [];
  for (const b of TAMIL_MONTH_BOUNDARIES) {
    candidates.push({ month: b.month, startUtc: new Date(Date.UTC(year - 1, b.gMonth - 1, b.gDay)) });
    candidates.push({ month: b.month, startUtc: new Date(Date.UTC(year, b.gMonth - 1, b.gDay)) });
  }

  // IMPORTANT: Use the provided ISO date as-is (no IST->UTC shift). Using
  // new Date(`${dateStr}T00:00:00+05:30`) would land on previous UTC day.
  const dUtc = new Date(Date.UTC(year, monthIndex, dayOfMonth));
  const eligible = candidates.filter((c) => c.startUtc.getTime() <= dUtc.getTime());
  eligible.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  const picked = eligible.length > 0 ? eligible[eligible.length - 1] : { month: "சித்திரை", startUtc: new Date(Date.UTC(year, 3, 14)) };
  const tamil_day = Math.max(1, Math.floor((dUtc.getTime() - picked.startUtc.getTime()) / 86_400_000) + 1);

  // Midday IST avoids any DST/offset edge and ensures correct weekday for the ISO date.
  const jsDay = new Date(`${dateStr}T12:00:00+05:30`).getDay();
  const weekday_tamil = TAMIL_WEEKDAYS[(jsDay + 6) % 7] || "";

  return { tamil_month: picked.month, tamil_day, weekday_tamil };
}

function diffSunMoon(time: Astronomy.FlexibleDateTime): number {
  // NOTE: Avoid Astronomy.EclipticLongitude(Body.Sun, ...) because it can throw
  // in Edge runtimes ("Cannot calculate heliocentric longitude of the Sun.").
  // MoonPhase returns the Moon–Sun elongation angle in degrees.
  return normalizeAngle360(Astronomy.MoonPhase(time) as number);
}

function moonLon(time: Astronomy.FlexibleDateTime): number {
  return normalizeAngle360(Astronomy.EclipticLongitude(Astronomy.Body.Moon, time));
}

function computeSunriseSunset(dateStr: string): { sunrise: Date | null; sunset: Date | null } {
  const observer = new Astronomy.Observer(CHENNAI.lat, CHENNAI.lon, CHENNAI.heightMeters);
  const start = parseIst(dateStr, "00:00:00");
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, start, 1, 0) as Astronomy.AstroTime | null;
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, start, 1, 0) as Astronomy.AstroTime | null;
  return {
    sunrise: sunrise ? new Date(sunrise.toString()) : null,
    sunset: sunset ? new Date(sunset.toString()) : null,
  };
}

function computeRahuYamaKuligai(sunrise: Date | null, sunset: Date | null, dateStr: string): {
  rahu_kalam: string | null;
  yamagandam: string | null;
  kuligai: string | null;
} {
  if (!sunrise || !sunset) {
    return { rahu_kalam: null, yamagandam: null, kuligai: null };
  }

  const dayMs = sunset.getTime() - sunrise.getTime();
  if (dayMs <= 0) {
    return { rahu_kalam: null, yamagandam: null, kuligai: null };
  }

  const part = dayMs / 8;
  const jsDay = parseIst(dateStr, "00:00:00").getDay();

  const rahuSeg = RAHU_SEGMENT_BY_JS_DAY[jsDay];
  const yamaSeg = YAMA_SEGMENT_BY_JS_DAY[jsDay];
  const kuligaiSeg = KULIGAI_SEGMENT_BY_JS_DAY[jsDay];

  const segRange = (seg: number): { start: Date; end: Date } => {
    const start = new Date(sunrise.getTime() + (seg - 1) * part);
    const end = new Date(start.getTime() + part);
    return { start, end };
  };

  const r = segRange(rahuSeg);
  const y = segRange(yamaSeg);
  const k = segRange(kuligaiSeg);

  return {
    rahu_kalam: formatRangeIst(r.start, r.end),
    yamagandam: formatRangeIst(y.start, y.end),
    kuligai: formatRangeIst(k.start, k.end),
  };
}

function computeAbhijit(sunrise: Date | null, sunset: Date | null): string | null {
  if (!sunrise || !sunset) return null;
  const mid = (sunrise.getTime() + sunset.getTime()) / 2;
  const start = new Date(mid - 24 * 60_000);
  const end = new Date(mid + 24 * 60_000);
  return formatRangeIst(start, end);
}

function computeTithi(dateStr: string): {
  tithi_number: number;
  tithi_name: string;
  tithi_start: Date | null;
  tithi_end: Date | null;
  paksham: "Valar" | "Thei";
} {
  const probe = parseIst(dateStr, "12:00:00");
  const diff = diffSunMoon(probe);
  const tithi_number = Math.floor(diff / 12) + 1;
  const tithi_name = TITHI_NAMES_TA[tithi_number] || String(tithi_number);
  const paksham = tithi_number <= 15 ? "Valar" : "Thei";

  const dayStart = parseIst(dateStr, "00:00:00");
  const searchStart = new Date(dayStart.getTime() - 36 * 60 * 60_000);
  const searchEnd = new Date(dayStart.getTime() + 60 * 60 * 60_000);

  const startTarget = normalizeAngle360((tithi_number - 1) * 12);
  const endTarget = normalizeAngle360(tithi_number * 12);

  const tithi_start = findCrossingUnwrapped((t) => diffSunMoon(t), startTarget, searchStart, searchEnd);
  const tithi_end = findCrossingUnwrapped((t) => diffSunMoon(t), endTarget, searchStart, searchEnd);

  return { tithi_number, tithi_name, tithi_start, tithi_end, paksham };
}

function tithiNumberAtInstant(dt: Date): number {
  const diff = diffSunMoon(dt);
  return Math.floor(diff / 12) + 1;
}

function computeTithiNumbersCoveringDate(dateStr: string): Set<number> {
  const startProbe = parseIst(dateStr, "00:00:00");
  const endProbe = parseIst(dateStr, "23:59:59");
  return new Set([tithiNumberAtInstant(startProbe), tithiNumberAtInstant(endProbe)]);
}

function computeFestivalName(tamilMonth: string, nakshatraNumber: number): string | null {
  // Deterministic, rule-based mapping (no string parsing).
  // Order matters: Murugan/major festivals should win.
  if (tamilMonth === "தை" && nakshatraNumber === 8) return "தைப்பூசம்";
  if (tamilMonth === "வைகாசி" && nakshatraNumber === 16) return "வைகாசி விசாகம்";
  if (tamilMonth === "பங்குனி" && nakshatraNumber === 12) return "பங்குனி உத்திரம்";
  if (nakshatraNumber === 3) return "கார்த்திகை";
  return null;
}

export function computeFlagsAndFestival(dateStr: string): {
  is_sashti: boolean;
  is_skanda_sashti: boolean;
  is_ashtami: boolean;
  is_navami: boolean;
  is_ekadashi: boolean;
  is_pradosham: boolean;
  is_amavasai: boolean;
  is_pournami: boolean;
  festival_name: string | null;
} {
  const { tamil_month } = getTamilMonthAndDay(dateStr);
  const nak = computeNakshatra(dateStr);
  const tithis = computeTithiNumbersCoveringDate(dateStr);

  const has = (n: number) => tithis.has(n);

  const is_sashti = has(6) || has(21);
  const is_skanda_sashti = has(6);
  const is_ashtami = has(8) || has(23);
  const is_navami = has(9) || has(24);
  const is_ekadashi = has(11) || has(26);
  const is_pradosham = has(13) || has(28);
  const is_pournami = has(15);
  const is_amavasai = has(30);

  const festival_name = computeFestivalName(tamil_month, nak.nakshatra_number);

  return {
    is_sashti,
    is_skanda_sashti,
    is_ashtami,
    is_navami,
    is_ekadashi,
    is_pradosham,
    is_amavasai,
    is_pournami,
    festival_name,
  };
}

function computeNakshatra(dateStr: string): {
  nakshatra_number: number;
  nakshatra_name: string;
  nakshatra_start: Date | null;
  nakshatra_end: Date | null;
} {
  const seg = 360 / 27;
  const probe = parseIst(dateStr, "12:00:00");
  const lon = moonLon(probe);
  const nakshatra_number = Math.floor(lon / seg) + 1;
  const nakshatra_name = NAKSHATRA_NAMES_TA[nakshatra_number] || String(nakshatra_number);

  const dayStart = parseIst(dateStr, "00:00:00");
  const searchStart = new Date(dayStart.getTime() - 36 * 60 * 60_000);
  const searchEnd = new Date(dayStart.getTime() + 60 * 60 * 60_000);

  const startTarget = normalizeAngle360((nakshatra_number - 1) * seg);
  const endTarget = normalizeAngle360(nakshatra_number * seg);

  const nakshatra_start = findCrossingUnwrapped((t) => moonLon(t), startTarget, searchStart, searchEnd);
  const nakshatra_end = findCrossingUnwrapped((t) => moonLon(t), endTarget, searchStart, searchEnd);

  return { nakshatra_number, nakshatra_name, nakshatra_start, nakshatra_end };
}

export function computeDay(dateStr: string): ComputedDay {
  const istToday = todayIstDateString();
  const { tamil_month, tamil_day, weekday_tamil } = getTamilMonthAndDay(dateStr);

  const { sunrise, sunset } = computeSunriseSunset(dateStr);
  const { rahu_kalam, yamagandam, kuligai } = computeRahuYamaKuligai(sunrise, sunset, dateStr);
  const abhijit = computeAbhijit(sunrise, sunset);

  const tithi = computeTithi(dateStr);
  const nakshatra = computeNakshatra(dateStr);

  const flags = computeFlagsAndFestival(dateStr);

  return {
    calendar: {
      gregorian_date: dateStr,
      tamil_month,
      tamil_day,
      tamil_year: null,
      weekday_tamil,
      paksham: tithi.paksham,
      is_today: dateStr === istToday,
      festival_name: flags.festival_name,
    },
    panchang: {
      tithi_name: tithi.tithi_name,
      tithi_number: tithi.tithi_number,
      tithi_start: tithi.tithi_start ? tithi.tithi_start.toISOString() : null,
      tithi_end: tithi.tithi_end ? tithi.tithi_end.toISOString() : null,
      nakshatra_name: nakshatra.nakshatra_name,
      nakshatra_number: nakshatra.nakshatra_number,
      nakshatra_start: nakshatra.nakshatra_start ? nakshatra.nakshatra_start.toISOString() : null,
      nakshatra_end: nakshatra.nakshatra_end ? nakshatra.nakshatra_end.toISOString() : null,
      yogam: null,
      karanam: null,
      is_sashti: flags.is_sashti,
      is_skanda_sashti: flags.is_skanda_sashti,
      is_ashtami: flags.is_ashtami,
      is_navami: flags.is_navami,
      is_ekadashi: flags.is_ekadashi,
      is_pradosham: flags.is_pradosham,
      is_amavasai: flags.is_amavasai,
      is_pournami: flags.is_pournami,
      computation_source: "engine",
    },
    timings: {
      sunrise: sunrise ? sunrise.toISOString() : null,
      sunset: sunset ? sunset.toISOString() : null,
      nalla_neram_morning: null,
      nalla_neram_evening: null,
      rahu_kalam,
      yamagandam,
      kuligai,
      abhijit,
    },
  };
}
