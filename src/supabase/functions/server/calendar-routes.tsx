import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { computeDay, computeFlagsAndFestival, getTamilMonthAndDay } from "./calendar-engine.tsx";

const calendar = new Hono();

const RASI_ORDER = [
  "மேஷம்",
  "ரிஷபம்",
  "மிதுனம்",
  "கடகம்",
  "சிம்மம்",
  "கன்னி",
  "துலாம்",
  "விருச்சிகம்",
  "தனுசு",
  "மகரம்",
  "கும்பம்",
  "மீனம்",
];

const FALLBACK_PALAN_WORDS = [
  "சிந்தனை",
  "பரிசு",
  "நிறைவு",
  "யோகம்",
  "கவனம்",
  "கீர்த்தி",
  "ஓய்வு",
  "பரிவு",
  "ஆதாயம்",
  "இன்பம்",
  "வரவு",
  "எதிர்ப்பு",
];

function isoDayOffset(date: string): number {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return 0;
  return (y * 372 + mo * 31 + d) % 12;
}

function buildFallbackRasiPalan(date: string): Array<{ rasi: string; palan: string }> {
  const off = isoDayOffset(date);
  return RASI_ORDER.map((rasi, i) => ({
    rasi,
    palan: FALLBACK_PALAN_WORDS[(i + off) % FALLBACK_PALAN_WORDS.length] || "",
  }));
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function monthStartEnd(month: string): { start: string; end: string } {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  const fmt = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { start: fmt(start), end: fmt(end) };
}

async function loadCachedDay(supabase: SupabaseClient, date: string) {
  const { data: dayRow, error: dayErr } = await supabase
    .from("calendar_days")
    .select("*")
    .eq("gregorian_date", date)
    .maybeSingle();

  if (dayErr) throw dayErr;
  if (!dayRow) return null;

  const { data: panchangRow, error: pErr } = await supabase
    .from("panchang_computed")
    .select("*")
    .eq("calendar_day_id", dayRow.id)
    .maybeSingle();
  if (pErr) throw pErr;

  const { data: timingsRow, error: tErr } = await supabase
    .from("timings")
    .select("*")
    .eq("calendar_day_id", dayRow.id)
    .maybeSingle();
  if (tErr) throw tErr;

  if (!panchangRow || !timingsRow) return null;

  const derived = computeFlagsAndFestival(date);
  const tamil = getTamilMonthAndDay(date);

  return {
    calendar: {
      gregorian_date: dayRow.gregorian_date,
      // Always compute these from date string to avoid stale cached values.
      tamil_month: tamil.tamil_month,
      tamil_day: tamil.tamil_day,
      tamil_year: dayRow.tamil_year,
      weekday_tamil: tamil.weekday_tamil,
      paksham: dayRow.paksham,
      is_today: dayRow.is_today,
      festival_name: derived.festival_name,
    },
    panchang: {
      tithi_name: panchangRow.tithi_name,
      tithi_number: panchangRow.tithi_number,
      tithi_start: panchangRow.tithi_start,
      tithi_end: panchangRow.tithi_end,
      nakshatra_name: panchangRow.nakshatra_name,
      nakshatra_number: panchangRow.nakshatra_number,
      nakshatra_start: panchangRow.nakshatra_start,
      nakshatra_end: panchangRow.nakshatra_end,
      yogam: panchangRow.yogam,
      karanam: panchangRow.karanam,
      is_sashti: derived.is_sashti,
      is_skanda_sashti: derived.is_skanda_sashti,
      is_ashtami: derived.is_ashtami,
      is_navami: derived.is_navami,
      is_ekadashi: derived.is_ekadashi,
      is_pradosham: derived.is_pradosham,
      is_amavasai: derived.is_amavasai,
      is_pournami: derived.is_pournami,
      computation_source: panchangRow.computation_source,
    },
    timings: {
      sunrise: timingsRow.sunrise,
      sunset: timingsRow.sunset,
      nalla_neram_morning: timingsRow.nalla_neram_morning,
      nalla_neram_evening: timingsRow.nalla_neram_evening,
      rahu_kalam: timingsRow.rahu_kalam,
      yamagandam: timingsRow.yamagandam,
      kuligai: timingsRow.kuligai,
      abhijit: timingsRow.abhijit,
    },
  };
}

async function upsertComputedDay(supabase: SupabaseClient, computed: ReturnType<typeof computeDay>) {
  const { data: dayRows, error: dayErr } = await supabase
    .from("calendar_days")
    .upsert(
      {
        gregorian_date: computed.calendar.gregorian_date,
        tamil_month: computed.calendar.tamil_month,
        tamil_day: computed.calendar.tamil_day,
        tamil_year: computed.calendar.tamil_year,
        weekday_tamil: computed.calendar.weekday_tamil,
        paksham: computed.calendar.paksham,
        is_today: computed.calendar.is_today,
      },
      { onConflict: "gregorian_date" },
    )
    .select("id, gregorian_date")
    .limit(1);

  if (dayErr) throw dayErr;
  const dayId = dayRows?.[0]?.id;
  if (!dayId) throw new Error("calendar_days upsert did not return id");

  const { error: pErr } = await supabase
    .from("panchang_computed")
    .upsert(
      {
        calendar_day_id: dayId,
        tithi_name: computed.panchang.tithi_name,
        tithi_number: computed.panchang.tithi_number,
        tithi_start: computed.panchang.tithi_start,
        tithi_end: computed.panchang.tithi_end,
        nakshatra_name: computed.panchang.nakshatra_name,
        nakshatra_number: computed.panchang.nakshatra_number,
        nakshatra_start: computed.panchang.nakshatra_start,
        nakshatra_end: computed.panchang.nakshatra_end,
        yogam: computed.panchang.yogam,
        karanam: computed.panchang.karanam,
        is_sashti: computed.panchang.is_sashti,
        is_skanda_sashti: computed.panchang.is_skanda_sashti,
        is_amavasai: computed.panchang.is_amavasai,
        is_pournami: computed.panchang.is_pournami,
        computation_source: computed.panchang.computation_source,
      },
      { onConflict: "calendar_day_id" },
    );

  if (pErr) throw pErr;

  const { error: tErr } = await supabase
    .from("timings")
    .upsert(
      {
        calendar_day_id: dayId,
        sunrise: computed.timings.sunrise,
        sunset: computed.timings.sunset,
        nalla_neram_morning: computed.timings.nalla_neram_morning,
        nalla_neram_evening: computed.timings.nalla_neram_evening,
        rahu_kalam: computed.timings.rahu_kalam,
        yamagandam: computed.timings.yamagandam,
        kuligai: computed.timings.kuligai,
        abhijit: computed.timings.abhijit,
      },
      { onConflict: "calendar_day_id" },
    );

  if (tErr) throw tErr;

  return { dayId };
}

async function requireUserId(c: Context, supabase: ReturnType<typeof createClient>): Promise<string> {
  const accessToken = c.req.header("Authorization")?.split(" ")[1] || "";
  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user?.id) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function istDateAtTime(isoDate: string, hhmm: string): string {
  const time = /^\d{2}:\d{2}$/.test(hhmm) ? `${hhmm}:00` : "06:00:00";
  return new Date(`${isoDate}T${time}+05:30`).toISOString();
}

function isSubhaMuhurthamDayComputed(d: any): boolean {
  const rawT = (d?.panchang?.tithi_number ?? null) as unknown;
  const rawN = (d?.panchang?.nakshatra_number ?? null) as unknown;
  const t = typeof rawT === "number" ? rawT : typeof rawT === "string" ? Number(rawT) : NaN;
  const n = typeof rawN === "number" ? rawN : typeof rawN === "string" ? Number(rawN) : NaN;
  if (!Number.isFinite(t) || !Number.isFinite(n)) return false;

  const badTithi = new Set([4, 6, 8, 9, 12, 14, 15, 30]);
  if (badTithi.has(t)) return false;

  const goodNakshatra = new Set([4, 5, 10, 12, 13, 15, 17, 19, 21, 26, 27]);
  return goodNakshatra.has(n);
}

async function ensureComputedAndGetDayId(supabase: SupabaseClient, date: string): Promise<string> {
  const cached = await loadCachedDay(supabase, date);
  if (!cached) {
    const computed = computeDay(date);
    const { dayId } = await upsertComputedDay(supabase, computed);
    return dayId;
  }

  const { data, error } = await supabase
    .from("calendar_days")
    .select("id")
    .eq("gregorian_date", date)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("calendar_days row missing id");
  return data.id;
}

calendar.get("/day", async (c: Context) => {
  const date = c.req.query("date") || "";
  const refresh = c.req.query("refresh") === "1";

  if (!isIsoDate(date)) {
    return c.json({ error: "Invalid date. Expected YYYY-MM-DD" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (!refresh) {
      const cached = await loadCachedDay(supabase, date);
      if (cached) return c.json({ source: "cache", ...cached });
    }

    const computed = computeDay(date);
    await upsertComputedDay(supabase, computed);

    const cached = await loadCachedDay(supabase, date);
    return c.json({ source: "engine", ...(cached || computed) });
  } catch (e) {
    console.error("[calendar/day] error", e);
    return c.json({ error: String(e) }, 500);
  }
});

calendar.get("/rasi-palan", async (c: Context) => {
  const date = c.req.query("date") || "";

  if (!isIsoDate(date)) {
    return c.json({ error: "Invalid date. Expected YYYY-MM-DD" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data, error } = await supabase
      .from("daily_rasi_palan")
      .select("rasi, palan")
      .eq("gregorian_date", date);

    if (error) throw error;

    const rows = (data || []) as Array<{ rasi: string; palan: string }>;
    const cleaned = rows.filter((r) => typeof r?.rasi === "string" && typeof r?.palan === "string");

    const fallback = buildFallbackRasiPalan(date);
    const byRasi = new Map<string, { rasi: string; palan: string }>();
    for (const it of fallback) byRasi.set(it.rasi, it);
    for (const it of cleaned) {
      if (RASI_ORDER.includes(it.rasi)) byRasi.set(it.rasi, { rasi: it.rasi, palan: it.palan });
    }

    const merged = Array.from(byRasi.values());
    const ordered = merged
      .filter((r) => typeof r?.rasi === "string" && typeof r?.palan === "string")
      .sort((a, b) => {
        const ai = RASI_ORDER.indexOf(a.rasi);
        const bi = RASI_ORDER.indexOf(b.rasi);
        const aKey = ai === -1 ? 999 : ai;
        const bKey = bi === -1 ? 999 : bi;
        return aKey - bKey || a.rasi.localeCompare(b.rasi);
      });

    return c.json({ date, items: ordered });
  } catch (e) {
    console.error("[calendar/rasi-palan] error", e);
    return c.json({ error: String(e) }, 500);
  }
});

calendar.get("/daily-extras", async (c: Context) => {
  const date = c.req.query("date") || "";

  if (!isIsoDate(date)) {
    return c.json({ error: "Invalid date. Expected YYYY-MM-DD" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data, error } = await supabase
      .from("daily_calendar_extras")
      .select(
        "gregorian_date, gowri_good_time_morning, gowri_good_time_evening, soolam, pariharam, karanam_time, sam_nokku_naal, chandrashtamam",
      )
      .eq("gregorian_date", date)
      .maybeSingle();

    if (error) throw error;
    if (!data) return c.json({ date, item: null });

    return c.json({ date, item: data });
  } catch (e) {
    console.error("[calendar/daily-extras] error", e);
    return c.json({ error: String(e) }, 500);
  }
});

calendar.get("/month", async (c: Context) => {
  const month = c.req.query("month") || "";
  const refresh = c.req.query("refresh") === "1";

  if (!isIsoMonth(month)) {
    return c.json({ error: "Invalid month. Expected YYYY-MM" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { start, end } = monthStartEnd(month);

  try {
    const days: any[] = [];

    if (!refresh) {
      const { data: existing, error } = await supabase
        .from("calendar_days")
        .select("gregorian_date")
        .gte("gregorian_date", start)
        .lte("gregorian_date", end);
      if (error) throw error;
      const set = new Set((existing || []).map((r: { gregorian_date: string }) => r.gregorian_date));

      let cursor = start;
      while (cursor <= end) {
        if (!set.has(cursor)) {
          const computed = computeDay(cursor);
          await upsertComputedDay(supabase, computed);
        }
        const cached = await loadCachedDay(supabase, cursor);
        days.push(cached || computeDay(cursor));

        const dt = new Date(`${cursor}T00:00:00Z`);
        dt.setUTCDate(dt.getUTCDate() + 1);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dt.getUTCDate()).padStart(2, "0");
        cursor = `${y}-${m}-${d}`;
      }

      return c.json({ source: "cache+engine", month, start, end, days });
    }

    let cursor = start;
    while (cursor <= end) {
      const computed = computeDay(cursor);
      await upsertComputedDay(supabase, computed);
      const cached = await loadCachedDay(supabase, cursor);
      days.push(cached || computed);

      const dt = new Date(`${cursor}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() + 1);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      cursor = `${y}-${m}-${d}`;
    }

    return c.json({ source: "engine", month, start, end, days });
  } catch (e) {
    console.error("[calendar/month] error", e);
    return c.json({ error: String(e) }, 500);
  }
});

calendar.get("/muhurtham/month", async (c: Context) => {
  const month = c.req.query("month") || "";
  const refresh = c.req.query("refresh") === "1";

  if (!isIsoMonth(month)) {
    return c.json({ error: "Invalid month. Expected YYYY-MM" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { start, end } = monthStartEnd(month);

  try {
    const days: any[] = [];
    let cursor = start;

    while (cursor <= end) {
      let computed: any = null;

      if (!refresh) {
        const cached = await loadCachedDay(supabase, cursor);
        computed = cached || null;
      }

      if (!computed) {
        const full = computeDay(cursor);
        await upsertComputedDay(supabase, full);
        const cached = await loadCachedDay(supabase, cursor);
        computed = cached || full;
      }

      if (isSubhaMuhurthamDayComputed(computed)) {
        days.push(computed);
      }

      const dt = new Date(`${cursor}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() + 1);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      cursor = `${y}-${m}-${d}`;
    }

    return c.json({ month, start, end, days });
  } catch (e) {
    console.error("[calendar/muhurtham/month] error", e);
    return c.json({ error: String(e) }, 500);
  }
});

calendar.get("/reminders/preferences", async (c: Context) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const userId = await requireUserId(c, supabase);
    const { data, error } = await supabase
      .from("user_reminder_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return c.json({ user_id: userId, preferences: data || null });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unauthorized")) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ error: msg }, 500);
  }
});

calendar.put("/reminders/preferences", async (c: Context) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const userId = await requireUserId(c, supabase);
    const body = await c.req.json().catch(() => ({} as any));

    const payload = {
      user_id: userId,
      sashti_enabled: Boolean(body.sashti_enabled),
      skanda_sashti_enabled: Boolean(body.skanda_sashti_enabled),
      festival_enabled: Boolean(body.festival_enabled),
      daily_panchang_enabled: Boolean(body.daily_panchang_enabled),
      preferred_time: typeof body.preferred_time === "string" ? body.preferred_time : "06:00",
      notify_previous_day: Boolean(body.notify_previous_day),
    };

    const { data, error } = await supabase
      .from("user_reminder_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return c.json({ user_id: userId, preferences: data || payload });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unauthorized")) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ error: msg }, 500);
  }
});

calendar.post("/reminders/schedule", async (c: Context) => {
  const month = c.req.query("month") || "";
  const from = c.req.query("from") || "";
  const to = c.req.query("to") || "";

  const hasMonth = Boolean(month);
  const hasRange = Boolean(from && to);

  if (hasMonth && !isIsoMonth(month)) {
    return c.json({ error: "Invalid month. Expected YYYY-MM" }, 400);
  }
  if (hasRange && (!isIsoDate(from) || !isIsoDate(to))) {
    return c.json({ error: "Invalid range. Expected from/to as YYYY-MM-DD" }, 400);
  }
  if (!hasMonth && !hasRange) {
    return c.json({ error: "Provide either month=YYYY-MM or from/to" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const userId = await requireUserId(c, supabase);

    const { data: prefs, error: prefsErr } = await supabase
      .from("user_reminder_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefsErr) throw prefsErr;

    const preferredTime = (prefs?.preferred_time as string) || "06:00";
    const notifyPreviousDay = Boolean(prefs?.notify_previous_day);

    const range = hasMonth ? monthStartEnd(month) : { start: from, end: to };

    const typesToClear: string[] = [];
    if (prefs?.sashti_enabled) typesToClear.push("sashti");
    if (prefs?.daily_panchang_enabled) typesToClear.push("daily_panchang");

    if (typesToClear.length > 0) {
      await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("user_id", userId)
        .in("type", typesToClear)
        .gte("scheduled_at", `${range.start}T00:00:00Z`)
        .lte("scheduled_at", `${addDaysIso(range.end, 1)}T00:00:00Z`)
        .eq("status", "scheduled");
    }

    let cursor = range.start;
    const rows: any[] = [];

    while (cursor <= range.end) {
      const dayId = await ensureComputedAndGetDayId(supabase, cursor);
      const day = await loadCachedDay(supabase, cursor);
      const panchang = day?.panchang;

      if (prefs?.sashti_enabled && panchang?.is_sashti) {
        const baseIso = panchang.tithi_start || istDateAtTime(cursor, preferredTime);
        const base = new Date(baseIso);
        const scheduleDate = notifyPreviousDay ? addDaysIso(cursor, -1) : cursor;
        const scheduled_at = notifyPreviousDay ? istDateAtTime(scheduleDate, preferredTime) : base.toISOString();

        rows.push({
          user_id: userId,
          calendar_day_id: dayId,
          type: "sashti",
          scheduled_at,
          status: "scheduled",
        });
      }

      if (prefs?.daily_panchang_enabled) {
        rows.push({
          user_id: userId,
          calendar_day_id: dayId,
          type: "daily_panchang",
          scheduled_at: istDateAtTime(cursor, preferredTime),
          status: "scheduled",
        });
      }

      cursor = addDaysIso(cursor, 1);
    }

    if (rows.length === 0) {
      return c.json({ user_id: userId, range, inserted: 0 });
    }

    const { error: insErr } = await supabase.from("scheduled_notifications").insert(rows);
    if (insErr) throw insErr;

    return c.json({ user_id: userId, range, inserted: rows.length });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unauthorized")) return c.json({ error: "Unauthorized" }, 401);
    console.error("[calendar/reminders/schedule] error", e);
    return c.json({ error: msg }, 500);
  }
});

calendar.get("/reminders/scheduled", async (c: Context) => {
  const from = c.req.query("from") || "";
  const to = c.req.query("to") || "";

  if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) {
    return c.json({ error: "Invalid from/to. Expected YYYY-MM-DD" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const userId = await requireUserId(c, supabase);
    let q = supabase.from("scheduled_notifications").select("*").eq("user_id", userId).order("scheduled_at", { ascending: true });
    if (from) q = q.gte("scheduled_at", `${from}T00:00:00Z`);
    if (to) q = q.lte("scheduled_at", `${addDaysIso(to, 1)}T00:00:00Z`);

    const { data, error } = await q;
    if (error) throw error;
    return c.json({ user_id: userId, notifications: data || [] });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unauthorized")) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ error: msg }, 500);
  }
});

export default calendar;
