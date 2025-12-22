import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import * as adminAPI from "../../../../utils/adminAPI";

type VersionsResponse = { success: boolean; data: { app_versions: string[] } };

type CompareResponse = {
  success: boolean;
  data: {
    version_a: string;
    version_b: string;
    metrics_a: {
      avg_image_load_ms: number | null;
      image_downscale_pct: number | null;
      image_failure_rate: number | null;
      video_buffering_count: number;
      video_release_count: number;
    };
    metrics_b: {
      avg_image_load_ms: number | null;
      image_downscale_pct: number | null;
      image_failure_rate: number | null;
      video_buffering_count: number;
      video_release_count: number;
    };
    delta: {
      avg_image_load_ms_pct: number | null;
      image_downscale_pct_pct: number | null;
      image_failure_rate_pct: number | null;
      video_buffering_count_pct: number | null;
    };
    range: { from: string; to: string };
  };
};

function pctDelta(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null || b == null || a === 0) return "--";
  const d = (b - a) / a;
  const sign = d > 0 ? "+" : "";
  return `${sign}${(d * 100).toFixed(1)}%`;
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "--";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return `${(n * 100).toFixed(1)}%`;
}

export function AdminDgMediaCompare() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [versions, setVersions] = useState<string[]>([]);
  const [versionA, setVersionA] = useState<string>("");
  const [versionB, setVersionB] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [payload, setPayload] = useState<CompareResponse["data"] | null>(null);

  const loadVersions = async () => {
    try {
      const res = (await adminAPI.getDivineGuardReleaseVersions()) as VersionsResponse;
      if (res?.success) {
        const vs = res.data?.app_versions || [];
        setVersions(vs);
        if (!versionA && vs[0]) setVersionA(vs[0]);
        if (!versionB && vs[1]) setVersionB(vs[1]);
      }
    } catch {
      // ignore
    }
  };

  const loadCompare = async () => {
    if (!versionA || !versionB) return;

    setLoading(true);
    setError(null);

    try {
      const res = (await adminAPI.getDivineGuardMediaCompare({
        version_a: versionA,
        version_b: versionB,
        from: from || undefined,
        to: to || undefined,
      })) as CompareResponse;

      if (!res?.success) throw new Error((res as any)?.error || "Failed to load" );
      setPayload(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load" );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">Before vs After</div>
            <div className="text-xs text-gray-500 mt-1">Compare metrics across releases (version-aware)</div>
          </div>
          <button
            onClick={loadCompare}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Compare</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={versionA}
            onChange={(e) => setVersionA(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Version A</option>
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={versionB}
            onChange={(e) => setVersionB(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Version B</option>
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

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
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {payload && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Metrics</div>
            <div className="text-xs text-gray-500 mt-1">
              Range: {payload.range.from} → {payload.range.to}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">A</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">B</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-800">Avg image load (ms)</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmt(payload.metrics_a.avg_image_load_ms)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmt(payload.metrics_b.avg_image_load_ms)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{pctDelta(payload.metrics_a.avg_image_load_ms, payload.metrics_b.avg_image_load_ms)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-800">Downscale %</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmtPct(payload.metrics_a.image_downscale_pct)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmtPct(payload.metrics_b.image_downscale_pct)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{pctDelta(payload.metrics_a.image_downscale_pct, payload.metrics_b.image_downscale_pct)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-800">Image failure rate</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmtPct(payload.metrics_a.image_failure_rate)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{fmtPct(payload.metrics_b.image_failure_rate)}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{pctDelta(payload.metrics_a.image_failure_rate, payload.metrics_b.image_failure_rate)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-800">Video buffering (count)</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{payload.metrics_a.video_buffering_count}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{payload.metrics_b.video_buffering_count}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">{pctDelta(payload.metrics_a.video_buffering_count, payload.metrics_b.video_buffering_count)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
