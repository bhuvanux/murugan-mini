import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, RefreshCw, X } from "lucide-react";
import { DateRangeFilter } from "./DateRangeFilter";
import * as adminAPI from "../../utils/adminAPI";

type TabKey = "overview" | "features" | "pages" | "events" | "sessions";

type OverviewSummary = {
  sessions_today: number;
  sessions_7d: number;
  sessions_30d: number;
  total_events: number;
  avg_active_time_seconds: number;
  most_used_feature_key: string | null;
  most_used_feature_name: string | null;
};

type TopFeatureRow = {
  feature_key: string;
  feature_name: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_time_spent_seconds: number;
};

type FeatureRow = {
  feature_key: string;
  feature_name: string;
  visible: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_time_seconds: number;
  last_clicked: string | null;
};

type FeatureDetail = {
  feature_key: string;
  feature_name: string;
  summary: {
    total_views: number;
    total_clicks: number;
    ctr: number;
    avg_active_time_seconds: number;
  };
  overview?: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    avg_time_spent_seconds: number;
    last_active_date: string | null;
    last_clicked_at: string | null;
    hourly: Array<{ hour: string; impressions: number; clicks: number }>;
  };
  entry_sources: Array<{ source: string; count: number; pct: number }>;
  entry_routes?: Array<{ route: string; count: number; pct: number }>;
  entry_pages?: Array<{ page: string; count: number; pct: number }>;
  funnel: Array<{ step: string; users: number; drop_off_pct: number }>;
};

type PageRow = {
  page_name: string;
  views: number;
  avg_time_seconds: number;
  scroll_100_pct: number;
  bounce_pct: number;
};

type PageDetail = {
  page_name: string;
  summary: {
    views: number;
    avg_time_seconds: number;
    scroll_100_pct: number;
    bounce_pct: number;
  };
  scroll_breakdown: Array<{ percent: number; users: number }>;
  top_interactions: Array<{ event_name: string; count: number }>;
};

type EventRow = {
  id: string;
  created_at: string;
  event_name: string;
  feature_key: string | null;
  page: string | null;
  route: string | null;
  metadata: Record<string, any> | null;
};

type SessionRow = {
  id: string;
  user_id: string | null;
  device: string | null;
  total_duration_seconds: number;
  active_duration_seconds: number;
  idle_duration_seconds: number;
  pages_visited: number;
  started_at: string | null;
  ended_at: string | null;
};

type SessionDetail = {
  session: SessionRow | null;
  timeline: Array<{
    id: string;
    created_at: string;
    event_name: string;
    feature_key: string | null;
    page: string | null;
    route: string | null;
    metadata: Record<string, any> | null;
  }>;
  pages_visited: string[];
  exit_reason: string | null;
};

function fmtSeconds(seconds: number) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

type AdminAnalyticsProps = {
  defaultTab?: TabKey;
  allowedTabs?: TabKey[];
  title?: string;
  subtitle?: string;
};

export function AdminAnalytics(props: AdminAnalyticsProps = {}) {
  const allTabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "features" as const, label: "Feature Cards" },
      { id: "pages" as const, label: "Pages" },
      { id: "events" as const, label: "Events" },
      { id: "sessions" as const, label: "Sessions" },
    ],
    [],
  );

  const tabs = useMemo(() => {
    if (!props.allowedTabs || props.allowedTabs.length === 0) return allTabs;
    const allowed = new Set(props.allowedTabs);
    return allTabs.filter((t) => allowed.has(t.id));
  }, [allTabs, props.allowedTabs]);

  const [activeTab, setActiveTab] = useState<TabKey>(() => props.defaultTab || tabs[0]?.id || "overview");

  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());

  const from = startDate ? startDate.toISOString() : undefined;
  const to = endDate ? endDate.toISOString() : undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary | null>(null);
  const [topFeatures, setTopFeatures] = useState<TopFeatureRow[]>([]);

  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [featureDetail, setFeatureDetail] = useState<FeatureDetail | null>(null);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string>("");

  const [pages, setPages] = useState<PageRow[]>([]);
  const [pageDetail, setPageDetail] = useState<PageDetail | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventFeatureKey, setEventFeatureKey] = useState("");
  const [eventPage, setEventPage] = useState("");

  const [metadataDrawerOpen, setMetadataDrawerOpen] = useState(false);
  const [metadataDrawer, setMetadataDrawer] = useState<{ title: string; json: any } | null>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);

  const [view, setView] = useState<"root" | "featureDetail" | "pageDetail">("root");

  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getUniversalAnalyticsOverview({ from, to });
      setOverviewSummary((res?.data?.summary || null) as OverviewSummary | null);
      setTopFeatures((res?.data?.top_features_last_7_days || []) as TopFeatureRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  const loadFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getUniversalAnalyticsFeatures({ from, to });
      setFeatures((res?.data || []) as FeatureRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getUniversalAnalyticsPages({ from, to });
      setPages((res?.data || []) as PageRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getUniversalAnalyticsEvents({
        event_name: eventName || undefined,
        feature_key: eventFeatureKey || undefined,
        page: eventPage || undefined,
        from,
        to,
        limit: 200,
      });
      setEvents((res?.data || []) as EventRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getUniversalAnalyticsSessions({ from, to, limit: 100 });
      setSessions((res?.data || []) as SessionRow[]);
    } catch {
      setError("பின்னர் முயற்சிக்கவும்");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view !== "root") return;
    if (activeTab === "overview") loadOverview();
    if (activeTab === "features") loadFeatures();
    if (activeTab === "pages") loadPages();
    if (activeTab === "events") loadEvents();
    if (activeTab === "sessions") loadSessions();
  }, [activeTab, from, to, view]);

  const renderHeader = () => {
    const title =
      view === "featureDetail"
        ? featureDetail?.feature_name || "Feature"
        : view === "pageDetail"
          ? pageDetail?.page_name || "Page"
          : props.title || "Analytics";

    return (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "var(--font-english)" }}>
            {title}
          </h2>
          {view === "root" && (
            <p className="text-gray-500 mt-1 text-sm">{props.subtitle || "Universal analytics overview"}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {view !== "root" ? (
            <button
              onClick={() => {
                setView("root");
                setFeatureDetail(null);
                setPageDetail(null);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <>
              <DateRangeFilter
                onDateRangeChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
              <button
                onClick={() => {
                  if (activeTab === "overview") loadOverview();
                  if (activeTab === "features") loadFeatures();
                  if (activeTab === "pages") loadPages();
                  if (activeTab === "events") loadEvents();
                  if (activeTab === "sessions") loadSessions();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTabs = () => {
    if (view !== "root") return null;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-green-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
        {error}
      </div>
    );
  };

  const renderOverview = () => {
    const s = overviewSummary;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">
              {s ? `${s.sessions_today} / ${s.sessions_7d} / ${s.sessions_30d}` : "—"}
            </h3>
            <p className="text-sm text-gray-500">Total Sessions (Today / 7d / 30d)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{s ? s.total_events.toLocaleString() : "—"}</h3>
            <p className="text-sm text-gray-500">Total Events</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{s ? fmtSeconds(s.avg_active_time_seconds) : "—"}</h3>
            <p className="text-sm text-gray-500">Avg Active Time</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{s?.most_used_feature_name || "—"}</h3>
            <p className="text-sm text-gray-500">Most Used Feature</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Top Features (Last 7 Days)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CTR %</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Time Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topFeatures.map((r) => (
                  <tr
                    key={r.feature_key}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const detail = await adminAPI.getUniversalAnalyticsFeatureDetail(r.feature_key, { from, to });
                        setFeatureDetail((detail?.data || null) as FeatureDetail | null);
                        setView("featureDetail");
                      } catch {
                        setError("பின்னர் முயற்சிக்கவும்");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <td className="px-3 py-2 text-sm text-gray-900">{r.feature_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.impressions}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.clicks}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.ctr * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(r.avg_time_spent_seconds)}</td>
                  </tr>
                ))}
                {topFeatures.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFeatures = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feature</label>
              <select
                value={selectedFeatureKey}
                onChange={async (e) => {
                  const k = e.target.value;
                  setSelectedFeatureKey(k);
                  if (!k) return;
                  try {
                    setLoading(true);
                    const detail = await adminAPI.getUniversalAnalyticsFeatureDetail(k, { from, to });
                    setFeatureDetail((detail?.data || null) as FeatureDetail | null);
                    setView("featureDetail");
                  } catch {
                    setError("பின்னர் முயற்சிக்கவும்");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
              >
                <option value="">Select feature…</option>
                {features.map((f) => (
                  <option key={f.feature_key} value={f.feature_key}>
                    {f.feature_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visible</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Clicked</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {features.map((r) => (
                  <tr key={r.feature_key}>
                    <td className="px-3 py-2 text-sm text-gray-900">{r.feature_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{r.visible ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.impressions}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.clicks}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.ctr * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(r.avg_time_seconds)}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {r.last_clicked ? new Date(r.last_clicked).toLocaleString() : ""}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            const detail = await adminAPI.getUniversalAnalyticsFeatureDetail(r.feature_key, { from, to });
                            setFeatureDetail((detail?.data || null) as FeatureDetail | null);
                            setView("featureDetail");
                          } catch {
                            setError("பின்னர் முயற்சிக்கவும்");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {features.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFeatureDetail = () => {
    const d = featureDetail;
    if (!d) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-500">தரவு இல்லை</p>
        </div>
      );
    }

    type FeatureDetailTab = "overview" | "funnel" | "entry";
    const [detailTab, setDetailTab] = useState<FeatureDetailTab>("overview");

    const tabs = [
      { id: "overview" as const, label: "Overview" },
      { id: "funnel" as const, label: "Funnel" },
      { id: "entry" as const, label: "Entry Sources" },
    ];

    const o = d.overview;
    const totalImpressions = o?.total_impressions ?? d.summary.total_views;
    const totalClicks = o?.total_clicks ?? d.summary.total_clicks;
    const ctr = o?.ctr ?? d.summary.ctr;
    const avgTimeSpentSeconds = o?.avg_time_spent_seconds ?? d.summary.avg_active_time_seconds;
    const lastActive = o?.last_active_date;

    const hourly = (o?.hourly || []) as Array<{ hour: string; impressions: number; clicks: number }>;
    const maxHourly = Math.max(1, ...hourly.map((r) => Number(r.impressions || 0)));

    const renderDetailTabs = () => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setDetailTab(t.id)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              detailTab === t.id ? "bg-green-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );

    const renderOverviewTab = () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{totalImpressions}</h3>
            <p className="text-sm text-gray-500">Total impressions</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{totalClicks}</h3>
            <p className="text-sm text-gray-500">Total clicks</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{(ctr * 100).toFixed(1)}%</h3>
            <p className="text-sm text-gray-500">CTR</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{fmtSeconds(avgTimeSpentSeconds)}</h3>
            <p className="text-sm text-gray-500">Avg time spent</p>
            {/* TODO: analytics_feature_stats.avg_time_seconds is currently 0 in rollup; once populated, this will be fully rollup-derived. */}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{lastActive ? String(lastActive) : "—"}</h3>
            <p className="text-sm text-gray-500">Last active date</p>
          </div>
        </div>

        {hourly.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">Trend</h3>
              <p className="text-xs text-gray-500">Hourly impressions (sparkline)</p>
            </div>
            <div className="flex items-end gap-1 h-16">
              {hourly.map((r) => (
                <div
                  key={r.hour}
                  className="bg-green-600/80 rounded-sm"
                  style={{ height: `${Math.max(2, Math.round((Number(r.impressions || 0) / maxHourly) * 64))}px`, width: 6 }}
                  title={`${r.hour}: ${r.impressions}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );

    const renderFunnelTab = () => (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Funnel (Distinct sessions)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Step</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Drop-off %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {d.funnel.map((r) => (
                <tr key={r.step}>
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r.step}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.users}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.drop_off_pct * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {d.funnel.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                    தரவு இல்லை
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    const renderEntryTab = () => (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">By metadata.source</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {d.entry_sources.map((r) => (
                  <tr key={r.source}>
                    <td className="px-3 py-2 text-sm text-gray-900">{r.source}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.pct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {d.entry_sources.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">By route</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(d.entry_routes || []).map((r) => (
                  <tr key={r.route}>
                    <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r.route}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.pct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {(!d.entry_routes || d.entry_routes.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">By page</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(d.entry_pages || []).map((r) => (
                  <tr key={r.page}>
                    <td className="px-3 py-2 text-sm text-gray-900">{r.page}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.pct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {(!d.entry_pages || d.entry_pages.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {renderDetailTabs()}
        {detailTab === "overview" && renderOverviewTab()}
        {detailTab === "funnel" && renderFunnelTab()}
        {detailTab === "entry" && renderEntryTab()}
      </div>
    );
  };

  const renderPages = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page Name</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Scroll 100%</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bounce %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((r) => (
                <tr
                  key={r.page_name}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const detail = await adminAPI.getUniversalAnalyticsPageDetail(r.page_name, { from, to });
                      setPageDetail((detail?.data || null) as PageDetail | null);
                      setView("pageDetail");
                    } catch {
                      setError("பின்னர் முயற்சிக்கவும்");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r.page_name}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.views}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(r.avg_time_seconds)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.scroll_100_pct * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{(r.bounce_pct * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {pages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500">
                    தரவு இல்லை
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPageDetail = () => {
    const d = pageDetail;
    if (!d) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-gray-500">தரவு இல்லை</p>
        </div>
      );
    }

    const s = d.summary;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{s.views}</h3>
            <p className="text-sm text-gray-500">Views</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{fmtSeconds(s.avg_time_seconds)}</h3>
            <p className="text-sm text-gray-500">Avg Time</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{(s.scroll_100_pct * 100).toFixed(1)}%</h3>
            <p className="text-sm text-gray-500">Scroll 100%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-gray-800 mb-1">{(s.bounce_pct * 100).toFixed(1)}%</h3>
            <p className="text-sm text-gray-500">Bounce %</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Scroll Depth Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percent</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {d.scroll_breakdown.map((r) => (
                  <tr key={r.percent}>
                    <td className="px-3 py-2 text-sm text-gray-900">{r.percent}%</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.users}</td>
                  </tr>
                ))}
                {d.scroll_breakdown.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Interactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {d.top_interactions.map((r) => (
                  <tr key={r.event_name}>
                    <td className="px-3 py-2 text-sm text-gray-900">{r.event_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">{r.count}</td>
                  </tr>
                ))}
                {d.top_interactions.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <input
                placeholder="Event name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="bg-transparent text-sm outline-none w-40"
              />
              <input
                placeholder="Feature"
                value={eventFeatureKey}
                onChange={(e) => setEventFeatureKey(e.target.value)}
                className="bg-transparent text-sm outline-none w-40"
              />
              <input
                placeholder="Page"
                value={eventPage}
                onChange={(e) => setEventPage(e.target.value)}
                className="bg-transparent text-sm outline-none w-56"
              />
            </div>
            <button
              onClick={loadEvents}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Apply</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Feature Key</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 font-mono">{e.event_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 font-mono">{e.feature_key || ""}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 font-mono">{e.page || e.route || ""}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      <button
                        onClick={() => {
                          setMetadataDrawer({ title: `${e.event_name}`, json: e.metadata || {} });
                          setMetadataDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                        title="View JSON"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-500">
                      தரவு இல்லை
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSessions = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Active Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Idle Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pages Visited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const detail = await adminAPI.getUniversalAnalyticsSessionDetail(s.id);
                      setSessionDetail((detail?.data || null) as SessionDetail | null);
                      setSessionDrawerOpen(true);
                    } catch {
                      setError("பின்னர் முயற்சிக்கவும்");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <td className="px-3 py-2 text-sm text-gray-900 font-mono">{s.id}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 font-mono">{s.user_id || ""}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">{s.device || ""}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(s.total_duration_seconds)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(s.active_duration_seconds)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{fmtSeconds(s.idle_duration_seconds)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right">{s.pages_visited}</td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                    தரவு இல்லை
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMetadataDrawer = () => {
    if (!metadataDrawerOpen || !metadataDrawer) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMetadataDrawerOpen(false)} />
        <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Metadata</h3>
                <p className="text-sm text-gray-500">{metadataDrawer.title}</p>
              </div>
              <button
                onClick={() => setMetadataDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-4">
              {JSON.stringify(metadataDrawer.json || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionDrawer = () => {
    if (!sessionDrawerOpen) return null;
    const d = sessionDetail;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-end">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSessionDrawerOpen(false)} />
        <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Session Detail</h3>
                <p className="text-sm text-gray-500">{d?.session?.id || ""}</p>
              </div>
              <button
                onClick={() => setSessionDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Session Summary</h4>
              {d?.session ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">User</p>
                    <p className="text-gray-800 font-mono">{d.session.user_id || ""}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Device</p>
                    <p className="text-gray-800">{d.session.device || ""}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Time</p>
                    <p className="text-gray-800">{fmtSeconds(d.session.total_duration_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active Time</p>
                    <p className="text-gray-800">{fmtSeconds(d.session.active_duration_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Idle Time</p>
                    <p className="text-gray-800">{fmtSeconds(d.session.idle_duration_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Exit Reason</p>
                    <p className="text-gray-800">{d.exit_reason || ""}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">தரவு இல்லை</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Timeline</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(d?.timeline || []).map((e) => (
                      <tr key={e.id}>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono">{e.event_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 font-mono">{e.route || e.page || ""}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">
                          <button
                            onClick={() => {
                              setMetadataDrawer({ title: `${e.event_name}`, json: e.metadata || {} });
                              setMetadataDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(d?.timeline || []).length === 0 && (
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

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h4 className="text-lg font-bold text-gray-800 mb-4">Pages Visited</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(d?.pages_visited || []).map((r) => (
                      <tr key={r}>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono">{r}</td>
                      </tr>
                    ))}
                    {(d?.pages_visited || []).length === 0 && (
                      <tr>
                        <td className="px-3 py-10 text-center text-sm text-gray-500">
                          தரவு இல்லை
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const body = () => {
    if (view === "featureDetail") return renderFeatureDetail();
    if (view === "pageDetail") return renderPageDetail();

    if (activeTab === "overview") return renderOverview();
    if (activeTab === "features") return renderFeatures();
    if (activeTab === "pages") return renderPages();
    if (activeTab === "events") return renderEvents();
    if (activeTab === "sessions") return renderSessions();

    return null;
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderTabs()}
      {renderError()}
      {body()}
      {renderMetadataDrawer()}
      {renderSessionDrawer()}
    </div>
  );
}
