import { useEffect, useMemo, useState } from "react";

import * as adminAPI from "../../../../utils/adminAPI";

type ControlSnapshot = {
  global: { safe_mode: boolean };
  media: {
    force_image_quality: "auto" | "low" | "medium" | "high";
    disable_video_autoplay: boolean;
    disable_video: boolean;
    disable_preloading: boolean;
    max_concurrent_media_loads: number | null;
  };
  network: {
    disable_retries: boolean;
    retry_count: number | null;
    timeout_ms: number | null;
  };
  ux: {
    skeleton_only: boolean;
    reduce_animations: boolean;
    ux_watchdog_threshold_ms: number | null;
  };
  ai: { disable_ai: boolean };
  applied?: any[];
  compiled_at?: string;
};

type SnapshotResponse = { success: boolean; data: ControlSnapshot };

function toNumberOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function AdminDgControlPlane() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<ControlSnapshot | null>(null);

  const [appVersion, setAppVersion] = useState<string>("");
  const [featureKey, setFeatureKey] = useState<string>("");
  const [networkState, setNetworkState] = useState<string>("");

  const contextLabel = useMemo(() => {
    const parts: string[] = [];
    if (appVersion) parts.push(`app_version=${appVersion}`);
    if (featureKey) parts.push(`feature_key=${featureKey}`);
    if (networkState) parts.push(`network_state=${networkState}`);
    return parts.length > 0 ? parts.join(" ") : "global (no match filters)";
  }, [appVersion, featureKey, networkState]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = (await adminAPI.getDivineGuardControlSnapshot({
        app_version: appVersion || undefined,
        feature_key: featureKey || undefined,
        network_state: networkState || undefined,
      })) as SnapshotResponse;

      if (!res?.success) throw new Error((res as any)?.error || "Failed to load" );
      setSnap(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load" );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upsert = async (payload: { rule_key: string; scope: string; enabled: boolean; priority: number; match?: any; action: any }) => {
    setSaving(true);
    setError(null);

    try {
      await adminAPI.upsertDivineGuardAdminRule(payload);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save" );
    } finally {
      setSaving(false);
    }
  };

  const match = useMemo(() => {
    const m: any = {};
    if (appVersion) m.app_version = [appVersion];
    if (featureKey) m.feature_key = [featureKey];
    if (networkState) m.network_state = [networkState];
    return Object.keys(m).length > 0 ? m : null;
  }, [appVersion, featureKey, networkState]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Divine Guard — Control Plane</h2>
        <p className="text-sm text-gray-500">Remote runtime controls compiled from dg_admin_rules</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-gray-900">Context preview</div>
        <div className="text-xs text-gray-500">Snapshot is compiled for: {contextLabel}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            placeholder="app_version (optional)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            placeholder="feature_key (optional)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={networkState}
            onChange={(e) => setNetworkState(e.target.value)}
            placeholder="network_state (optional)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh Snapshot
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">Emergency Controls</div>
            <div className="text-xs text-gray-500 mt-1">Safe Mode overrides all other rules</div>
          </div>
          <button
            onClick={() =>
              upsert({
                rule_key: "dg_global_safe_mode",
                scope: "global",
                enabled: true,
                priority: 1000,
                match,
                action: { safe_mode: !(snap?.global?.safe_mode || false) },
              })
            }
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              snap?.global?.safe_mode ? "bg-red-600 text-white" : "bg-green-600 text-white"
            } disabled:opacity-50`}
          >
            {snap?.global?.safe_mode ? "Safe Mode: ON" : "Safe Mode: OFF"}
          </button>
        </div>

        <div className="text-xs text-gray-500">Current snapshot compiled_at: {snap?.compiled_at || "--"}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Media Controls</div>
            <div className="text-xs text-gray-500 mt-1">Applies to OptimizedImage/OptimizedVideo</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Force image quality</div>
              <select
                value={snap?.media?.force_image_quality || "auto"}
                onChange={(e) =>
                  upsert({
                    rule_key: "dg_media_force_image_quality",
                    scope: "media",
                    enabled: true,
                    priority: 500,
                    match,
                    action: { force_image_quality: e.target.value },
                  })
                }
                disabled={saving}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
              >
                <option value="auto">auto</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Max concurrent media loads</div>
              <input
                value={snap?.media?.max_concurrent_media_loads == null ? "" : String(snap.media.max_concurrent_media_loads)}
                onChange={(e) =>
                  upsert({
                    rule_key: "dg_media_max_concurrent_loads",
                    scope: "media",
                    enabled: true,
                    priority: 450,
                    match,
                    action: { max_concurrent_media_loads: toNumberOrNull(e.target.value) },
                  })
                }
                disabled={saving}
                placeholder="(empty = unlimited)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Disable video autoplay</span>
            <input
              type="checkbox"
              checked={!!snap?.media?.disable_video_autoplay}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_media_disable_video_autoplay",
                  scope: "media",
                  enabled: true,
                  priority: 480,
                  match,
                  action: { disable_video_autoplay: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Disable video entirely (thumbnail fallback)</span>
            <input
              type="checkbox"
              checked={!!snap?.media?.disable_video}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_media_disable_video",
                  scope: "media",
                  enabled: true,
                  priority: 490,
                  match,
                  action: { disable_video: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Disable media preloading</span>
            <input
              type="checkbox"
              checked={!!snap?.media?.disable_preloading}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_media_disable_preloading",
                  scope: "media",
                  enabled: true,
                  priority: 470,
                  match,
                  action: { disable_preloading: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Network Controls</div>
            <div className="text-xs text-gray-500 mt-1">Applies to networkClient</div>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Disable retries globally</span>
            <input
              type="checkbox"
              checked={!!snap?.network?.disable_retries}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_network_disable_retries",
                  scope: "network",
                  enabled: true,
                  priority: 400,
                  match,
                  action: { disable_retries: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>

          <div>
            <div className="text-xs text-gray-500 mb-1">Retry count</div>
            <input
              value={snap?.network?.retry_count == null ? "" : String(snap.network.retry_count)}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_network_retry_count",
                  scope: "network",
                  enabled: true,
                  priority: 390,
                  match,
                  action: { retry_count: toNumberOrNull(e.target.value) ?? 0 },
                })
              }
              disabled={saving}
              placeholder="(empty = default)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Timeout (ms)</div>
            <input
              value={snap?.network?.timeout_ms == null ? "" : String(snap.network.timeout_ms)}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_network_timeout_ms",
                  scope: "network",
                  enabled: true,
                  priority: 380,
                  match,
                  action: { timeout_ms: toNumberOrNull(e.target.value) },
                })
              }
              disabled={saving}
              placeholder="(empty = default)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">UX Controls</div>
            <div className="text-xs text-gray-500 mt-1">Applies via document dataset + watchdog threshold override</div>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Skeleton-only mode</span>
            <input
              type="checkbox"
              checked={!!snap?.ux?.skeleton_only}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_ux_skeleton_only",
                  scope: "ux",
                  enabled: true,
                  priority: 300,
                  match,
                  action: { skeleton_only: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Reduce animations</span>
            <input
              type="checkbox"
              checked={!!snap?.ux?.reduce_animations}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_ux_reduce_animations",
                  scope: "ux",
                  enabled: true,
                  priority: 290,
                  match,
                  action: { reduce_animations: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>

          <div>
            <div className="text-xs text-gray-500 mb-1">UX watchdog threshold (ms)</div>
            <input
              value={snap?.ux?.ux_watchdog_threshold_ms == null ? "" : String(snap.ux.ux_watchdog_threshold_ms)}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_ux_watchdog_threshold_ms",
                  scope: "ux",
                  enabled: true,
                  priority: 280,
                  match,
                  action: { ux_watchdog_threshold_ms: toNumberOrNull(e.target.value) },
                })
              }
              disabled={saving}
              placeholder="(empty = default)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">AI Controls</div>
            <div className="text-xs text-gray-500 mt-1">Applies to murugan_agent wrapper</div>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">Disable AI calls</span>
            <input
              type="checkbox"
              checked={!!snap?.ai?.disable_ai}
              onChange={(e) =>
                upsert({
                  rule_key: "dg_ai_disable_ai",
                  scope: "ai",
                  enabled: true,
                  priority: 250,
                  match,
                  action: { disable_ai: e.target.checked },
                })
              }
              disabled={saving}
            />
          </label>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-sm font-semibold text-gray-900">Applied Rules</div>
        <div className="text-xs text-gray-500 mt-1">Snapshot indicates what rules contributed to the current state</div>
        <pre className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
          {JSON.stringify(snap?.applied || [], null, 2)}
        </pre>
      </div>
    </div>
  );
}
