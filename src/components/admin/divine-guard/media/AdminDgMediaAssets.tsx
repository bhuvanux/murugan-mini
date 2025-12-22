import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import * as adminAPI from "../../../../utils/adminAPI";

type AssetsResponse = {
  success: boolean;
  data: {
    rows: Array<{
      asset_key: string;
      asset_id: string | null;
      asset_url: string | null;
      avg_load_ms: number | null;
      image_loads: number;
      downscales: number;
      failures: number;
      bufferings: number;
      releases: number;
      screens: string[];
      feature_keys: string[];
    }>;
    dimensions: {
      app_versions: string[];
      screens: string[];
      feature_keys: string[];
      network_states: string[];
    };
  };
};

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return n.toFixed(0);
}

export function AdminDgMediaAssets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AssetsResponse["data"] | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [screen, setScreen] = useState<string>("");
  const [featureKey, setFeatureKey] = useState<string>("");
  const [networkState, setNetworkState] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = (await adminAPI.getDivineGuardMediaAssets({
        from: from || undefined,
        to: to || undefined,
        app_version: appVersion || undefined,
        screen: screen || undefined,
        feature_key: featureKey || undefined,
        network_state: networkState || undefined,
        limit,
      })) as AssetsResponse;

      if (!res?.success) throw new Error((res as any)?.error || "Failed to load" );
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

  const rows = useMemo(() => {
    return payload?.rows || [];
  }, [payload]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">Heavy Asset Explorer</div>
            <div className="text-xs text-gray-500 mt-1">Grouped by asset_id or asset_url from DG-MEDIA payload</div>
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

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
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

          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value || "50", 10) || 50)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            min={10}
            max={200}
            placeholder="limit"
          />
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg load (ms)</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Downscale</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fail</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Buffer</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Release</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Screens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.asset_key}>
                  <td className="px-3 py-2 text-sm text-gray-800">
                    <div className="font-mono text-xs text-gray-600">{r.asset_key}</div>
                    {r.asset_url && (
                      <div className="text-xs text-gray-500 truncate max-w-[420px]">{r.asset_url}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmt(r.avg_load_ms)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{r.downscales}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{r.failures}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{r.bufferings}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{r.releases}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {(r.screens || []).slice(0, 3).join(", ")}
                    {(r.screens || []).length > 3 ? "…" : ""}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                    No DG-MEDIA assets found for current filters.
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
