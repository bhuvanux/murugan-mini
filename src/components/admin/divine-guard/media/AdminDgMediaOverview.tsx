import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import * as adminAPI from "../../../../utils/adminAPI";

type OverviewResponse = {
  success: boolean;
  data: {
    kpis: {
      avg_image_load_ms: number | null;
      image_load_count: number;
      image_downscale_pct: number | null;
      image_failure_rate: number | null;
      video_buffering_count: number;
      video_buffering_rate: number | null;
      video_release_count: number;
    };
    trends: {
      image_load_time_ms: Array<{ date: string; value: number | null }>;
      downscale_pct: Array<{ date: string; value: number | null }>;
      video_buffering_count: Array<{ date: string; value: number }>;
    };
    dimensions: {
      app_versions: string[];
      screens: string[];
      feature_keys: string[];
      network_states: string[];
    };
    range: { from: string; to: string };
  };
};

function fmtNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "--";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return `${(n * 100).toFixed(1)}%`;
}

export function AdminDgMediaOverview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<OverviewResponse["data"] | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [screen, setScreen] = useState<string>("");
  const [featureKey, setFeatureKey] = useState<string>("");
  const [networkState, setNetworkState] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = (await adminAPI.getDivineGuardMediaOverview({
        from: from || undefined,
        to: to || undefined,
        app_version: appVersion || undefined,
        screen: screen || undefined,
        feature_key: featureKey || undefined,
        network_state: networkState || undefined,
      })) as OverviewResponse;

      if (!res?.success) {
        throw new Error((res as any)?.error || "Failed to load" );
      }

      setPayload(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load" );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dims = payload?.dimensions;

  const charts = useMemo(() => {
    return {
      loadTime: payload?.trends?.image_load_time_ms || [],
      downscale: payload?.trends?.downscale_pct || [],
      buffering: payload?.trends?.video_buffering_count || [],
    };
  }, [payload]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-600">
            <div className="font-semibold text-gray-900">Media Health Overview</div>
            <div className="text-xs text-gray-500 mt-1">
              Definitions: Avg Image Load Time = avg(payload.duration_ms) where event_code=DG-MEDIA-0001
            </div>
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

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            placeholder="from (ISO)"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="to (ISO)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />

          <select
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">app_version (all)</option>
            {(dims?.app_versions || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">screen (all)</option>
            {(dims?.screens || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">feature_key (all)</option>
            {(dims?.feature_keys || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={networkState}
            onChange={(e) => setNetworkState(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">network_state (all)</option>
            {(dims?.network_states || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Apply Filters
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Avg Image Load Time (ms)</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {fmtNumber(payload?.kpis?.avg_image_load_ms, 0)}
          </div>
          <div className="mt-1 text-xs text-gray-500">avg(duration_ms) for DG-MEDIA-0001</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">% Images Downscaled</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {fmtPct(payload?.kpis?.image_downscale_pct)}
          </div>
          <div className="mt-1 text-xs text-gray-500">DG-MEDIA-0002 / DG-MEDIA-0001</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Image Failure Rate</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {fmtPct(payload?.kpis?.image_failure_rate)}
          </div>
          <div className="mt-1 text-xs text-gray-500">DG-MEDIA-0003 / DG-MEDIA-0001</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Video Buffering</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {fmtNumber(payload?.kpis?.video_buffering_count, 0)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            DG-MEDIA-0004 count (rate pending video_started)
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500">Video Releases</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {fmtNumber(payload?.kpis?.video_release_count, 0)}
          </div>
          <div className="mt-1 text-xs text-gray-500">DG-MEDIA-0005 count</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-900">Image load time trend</div>
          <div className="text-xs text-gray-500 mt-1">Daily avg(duration_ms) for DG-MEDIA-0001</div>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.loadTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-900">Downscale % trend</div>
          <div className="text-xs text-gray-500 mt-1">DG-MEDIA-0002 / DG-MEDIA-0001 per day</div>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.downscale}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-900">Video buffering over time</div>
          <div className="text-xs text-gray-500 mt-1">DG-MEDIA-0004 count per day</div>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.buffering}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
