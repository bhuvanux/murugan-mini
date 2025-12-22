import { useEffect, useMemo, useState } from "react";
import * as adminAPI from "../../utils/adminAPI";

type OverviewSummary = {
  sessions_today: number;
  sessions_7d: number;
  sessions_30d: number;
  total_events: number;
  avg_active_time_seconds: number;
  most_used_feature_key: string | null;
  most_used_feature_name: string | null;
};

type InsightRow = {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  related_feature_key: string | null;
  related_page: string | null;
  metric_snapshot: Record<string, any> | null;
  created_at: string;
  acknowledged: boolean;
};

function fmtSeconds(seconds: number) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function AdminAnalyticsOverview() {
  const now = useMemo(() => new Date(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [insights, setInsights] = useState<InsightRow[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ title: string; row: InsightRow } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const to = now.toISOString();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [overviewRes, insightsRes] = await Promise.all([
        adminAPI.getUniversalAnalyticsOverview({ from, to }),
        adminAPI.getAdminAnalyticsInsights({ acknowledged: false, limit: 100 }),
      ]);

      setSummary((overviewRes?.data?.summary || null) as OverviewSummary | null);
      setInsights((insightsRes?.data || []) as InsightRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openInsightsCount = insights.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">
            {summary ? `${summary.sessions_today} / ${summary.sessions_7d} / ${summary.sessions_30d}` : "—"}
          </h3>
          <p className="text-sm text-gray-500">DAU / WAU / MAU</p>
          {/* TODO: Compute true DAU/WAU/MAU from analytics_session_stats.unique_users once user identity strategy is finalized for anonymous sessions. */}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">—</h3>
          <p className="text-sm text-gray-500">New Installs (Last 7 days)</p>
          {/* TODO: Derive installs from first_open events once client emits first_open and backend exposes installs aggregation endpoint. */}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">
            {summary ? fmtSeconds(summary.avg_active_time_seconds) : "—"}
          </h3>
          <p className="text-sm text-gray-500">Avg Active Time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">—</h3>
          <p className="text-sm text-gray-500">Retention (D1)</p>
          {/* TODO: Implement cohort retention (D1/D7/D30) using first_open + subsequent sessions. */}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{summary?.most_used_feature_name || "—"}</h3>
          <p className="text-sm text-gray-500">Most Used Feature (Last 7 days)</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">
            {loading ? "…" : openInsightsCount.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-500">Alerts / Insights</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">What Needs Attention</h3>
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {insights.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{r.insight_type}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.severity}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{r.recommendation}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setDrawer({ title: r.title, row: r });
                        setDrawerOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                    >
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}

              {insights.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-gray-500">
                    தரவு இல்லை
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-xl bg-white h-full shadow-xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{drawer.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{new Date(drawer.row.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase">Type</div>
                <div className="text-sm text-gray-800">{drawer.row.insight_type}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 uppercase">Severity</div>
                <div className="text-sm text-gray-800">{drawer.row.severity}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 uppercase">Description</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{drawer.row.description}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 uppercase">Recommendation</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{drawer.row.recommendation}</div>
              </div>

              {(drawer.row.related_feature_key || drawer.row.related_page) && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Related</div>
                  <div className="text-sm text-gray-800">
                    {drawer.row.related_feature_key ? `Feature: ${drawer.row.related_feature_key}` : ""}
                    {drawer.row.related_feature_key && drawer.row.related_page ? " · " : ""}
                    {drawer.row.related_page ? `Page: ${drawer.row.related_page}` : ""}
                  </div>
                </div>
              )}

              {drawer.row.metric_snapshot && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase">Metric snapshot</div>
                  <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(drawer.row.metric_snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
