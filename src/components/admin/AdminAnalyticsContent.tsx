import { useEffect, useMemo, useState } from "react";
import { AdminAnalytics } from "./AdminAnalytics";
import * as adminAPI from "../../utils/adminAPI";

export function AdminAnalyticsContent() {
  const now = useMemo(() => new Date(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pages, setPages] = useState<
    Array<{ page_name: string; views: number; avg_time_seconds: number; scroll_100_pct: number; bounce_pct: number }>
  >([]);

  const [calendarUsage, setCalendarUsage] = useState<{
    totals: { views: number; calendar_date_selects: number };
    daily: Array<{ date: string; views: number; calendar_date_selects: number }>;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const to = now.toISOString();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [pagesRes, calRes] = await Promise.all([
        adminAPI.getUniversalAnalyticsPages({ from, to }),
        adminAPI.getAdminContentCalendarUsage({ page: "murugan-calendar", from, to }),
      ]);

      setPages((pagesRes?.data || []) as any[]);
      setCalendarUsage((calRes?.data || null) as any);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const templePages = useMemo(() => {
    // App tab ids include: "popular-temples" and "temple-detail" (see App.tsx).
    // These become page/route in universal analytics.
    const keys = new Set(["popular-temples", "temple-detail"]);
    return pages.filter((p) => keys.has(String(p.page_name || "")));
  }, [pages]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Songs</h3>
        <p className="text-sm text-gray-500 mt-1">Completion and repeat matter more than views</p>
        {/* TODO: Wire song metrics from analytics_events once universal events exist: play, watch_complete, repeat_play. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Plays</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Completion rate</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Repeat plays</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Avg listening time</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Videos</h3>
        <p className="text-sm text-gray-500 mt-1">Watch time and drop-off</p>
        {/* TODO: Wire video metrics from analytics_events once universal video watch events exist (watch time + drop-off). */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Watch time</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Drop-off %</div>
            <div className="text-xl font-bold text-gray-800">—</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Temple Pages</h3>
        <p className="text-sm text-gray-500 mt-1">Views and region (country/state)</p>
        {/* TODO: Add region breakdown (country/state only) once server captures and exposes geo aggregation. */}

        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Scroll 100%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templePages.map((r) => (
                <tr key={r.page_name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r.page_name}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.views}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{Math.round(r.avg_time_seconds || 0)}s</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{((r.scroll_100_pct || 0) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {templePages.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-gray-500">
                    {loading ? "Loading…" : "தரவு இல்லை"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Calendar Usage</h3>
        <p className="text-sm text-gray-500 mt-1">Sashti days, festival spikes, daily usage patterns</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Date selects (30d)</div>
            <div className="text-xl font-bold text-gray-800">
              {calendarUsage ? calendarUsage.totals.calendar_date_selects.toLocaleString() : loading ? "…" : "—"}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Calendar page views (30d)</div>
            <div className="text-xl font-bold text-gray-800">
              {calendarUsage ? calendarUsage.totals.views.toLocaleString() : loading ? "…" : "—"}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase">Sashti day usage</div>
            <div className="text-xl font-bold text-gray-800">—</div>
            {/* TODO: Sashti usage requires joining date selects with calendar day attributes (is_sashti) from calendar engine output. No reliable signal yet in analytics tables. */}
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Date selects</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(calendarUsage?.daily || []).slice(-14).map((r) => (
                <tr key={r.date} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r.date}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.calendar_date_selects}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.views}</td>
                </tr>
              ))}
              {(!calendarUsage || (calendarUsage.daily || []).length === 0) && (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                    {loading ? "Loading…" : "தரவு இல்லை"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-gray-500 mt-4">
          {/* TODO: Festival spikes require mapping dates to festival metadata from Murugan calendar dataset; no server-side join/aggregation exists yet. */}
          {/* TODO: Daily usage patterns (time-of-day) is Growth scope, not Content. */}
        </div>
      </div>

      <AdminAnalytics title="Content" subtitle="Page engagement" defaultTab="pages" allowedTabs={["pages"]} />
    </div>
  );
}
