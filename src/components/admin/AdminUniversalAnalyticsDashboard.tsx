import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Search } from "lucide-react";
import * as adminAPI from "../../utils/adminAPI";

type FeatureStat = {
  feature_key: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

type RouteStat = {
  route: string;
  enters: number;
  exits: number;
  dashboard_views: number;
};

type EventRow = {
  id: string;
  event_name: string;
  feature_key: string | null;
  page: string | null;
  route: string | null;
  user_id: string | null;
  session_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

export function AdminUniversalAnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featureStats, setFeatureStats] = useState<FeatureStat[]>([]);
  const [routeStats, setRouteStats] = useState<RouteStat[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [eventName, setEventName] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [route, setRoute] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [limit, setLimit] = useState<number>(200);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [fs, rs, ev] = await Promise.all([
        adminAPI.getUniversalFeatureStats({ from: from || undefined, to: to || undefined }),
        adminAPI.getUniversalRouteStats({ from: from || undefined, to: to || undefined }),
        adminAPI.getUniversalAnalyticsEvents({
          event_name: eventName || undefined,
          feature_key: featureKey || undefined,
          route: route || undefined,
          from: from || undefined,
          to: to || undefined,
          limit,
        }),
      ]);

      setFeatureStats((fs?.data || []) as FeatureStat[]);
      setRouteStats((rs?.data || []) as RouteStat[]);
      setEvents((ev?.data || []) as EventRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const topFeatures = useMemo(() => {
    return [...featureStats].slice(0, 20);
  }, [featureStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Universal Analytics</h2>
          <p className="text-sm text-gray-500">Mixpanel-style raw events + quick aggregates.</p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Feature Cards</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Impr</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topFeatures.map((r) => (
                  <tr key={r.feature_key}>
                    <td className="px-3 py-2 text-sm text-gray-800 font-mono">{r.feature_key}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.impressions}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.clicks}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {(r.ctr * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {topFeatures.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                      No feature analytics yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="font-semibold text-gray-900">Routes / Pages</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Enter</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Dash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {routeStats.slice(0, 20).map((r) => (
                  <tr key={r.route}>
                    <td className="px-3 py-2 text-sm text-gray-800 font-mono">{r.route}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.enters}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.exits}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.dashboard_views}</td>
                  </tr>
                ))}
                {routeStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                      No route analytics yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Event Explorer</h3>
            <p className="text-xs text-gray-500">Most recent universal events (limit 200).</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                placeholder="from (ISO)"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-sm outline-none w-44"
              />
              <input
                placeholder="to (ISO)"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-sm outline-none w-44"
              />
              <input
                placeholder="event_name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="bg-transparent text-sm outline-none w-36"
              />
              <input
                placeholder="feature_key"
                value={featureKey}
                onChange={(e) => setFeatureKey(e.target.value)}
                className="bg-transparent text-sm outline-none w-44"
              />
              <input
                placeholder="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="bg-transparent text-sm outline-none w-36"
              />
              <input
                type="number"
                min={50}
                max={500}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value || "200", 10) || 200)}
                className="bg-transparent text-sm outline-none w-20"
                title="limit"
              />
            </div>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  await adminAPI.aggregateUniversalPageStats({ from: from || undefined, to: to || undefined });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Aggregate</span>
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Apply</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{e.event_name}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 font-mono">{e.feature_key || ""}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 font-mono">{e.route || ""}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    <pre className="max-w-[520px] whitespace-pre-wrap break-words">
                      {JSON.stringify(e.metadata || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500">
                    No events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
