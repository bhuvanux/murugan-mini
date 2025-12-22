import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { getState as getNetworkState } from "../network/networkState";

export type ControlSnapshot = {
  version: number;
  context: {
    app_version: string | null;
    feature_key: string | null;
    network_state: string | null;
  };
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
  applied: any[];
  compiled_at: string;
  ttl_seconds: number;
};

type SnapshotEnvelope = { success: boolean; data?: ControlSnapshot };

type Subscriber = (snap: ControlSnapshot) => void;

function getAppVersion(): string {
  const v = (import.meta as any)?.env?.VITE_APP_VERSION;
  return typeof v === "string" && v.length > 0 ? v : "0.1.0";
}

function buildDefaultSnapshot(): ControlSnapshot {
  return {
    version: 1,
    context: {
      app_version: getAppVersion(),
      feature_key: null,
      network_state: getNetworkState().state,
    },
    global: { safe_mode: false },
    media: {
      force_image_quality: "auto",
      disable_video_autoplay: false,
      disable_video: false,
      disable_preloading: false,
      max_concurrent_media_loads: null,
    },
    network: {
      disable_retries: false,
      retry_count: null,
      timeout_ms: null,
    },
    ux: {
      skeleton_only: false,
      reduce_animations: false,
      ux_watchdog_threshold_ms: null,
    },
    ai: { disable_ai: false },
    applied: [],
    compiled_at: new Date().toISOString(),
    ttl_seconds: 45,
  };
}

let current: ControlSnapshot = buildDefaultSnapshot();
const subs = new Set<Subscriber>();
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function setDatasetFlags(snap: ControlSnapshot) {
  try {
    const doc = (globalThis as any)?.document;
    if (!doc?.documentElement) return;
    const el = doc.documentElement as any;
    el.dataset.dgSafeMode = snap.global.safe_mode ? "true" : "false";
    el.dataset.dgSkeletonOnly = snap.ux.skeleton_only ? "true" : "false";
    el.dataset.dgReduceAnimations = snap.ux.reduce_animations ? "true" : "false";
  } catch {
    // ignore
  }
}

function notify(snap: ControlSnapshot) {
  setDatasetFlags(snap);
  for (const fn of subs) {
    try {
      fn(snap);
    } catch {
      // ignore
    }
  }
}

async function fetchSnapshot(): Promise<ControlSnapshot | null> {
  const appVersion = getAppVersion();
  const net = getNetworkState().state;

  const qs = new URLSearchParams();
  qs.set("app_version", appVersion);
  qs.set("network_state", net);

  const base = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;
  const url = `${base}/api/divine-guard/control-snapshot?${qs.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const json = (await res.json().catch(() => null)) as SnapshotEnvelope | null;
    if (!res.ok) return null;
    if (!json?.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

function scheduleNext(ms: number) {
  if (timer) {
    try {
      clearTimeout(timer);
    } catch {
      // ignore
    }
  }

  timer = setTimeout(async () => {
    const next = await fetchSnapshot();
    if (next) {
      current = next;
      notify(current);
    }

    const ttlMs =
      typeof current.ttl_seconds === "number" && Number.isFinite(current.ttl_seconds) && current.ttl_seconds > 0
        ? current.ttl_seconds * 1000
        : 45000;
    const interval = current.global.safe_mode ? 5000 : Math.max(10000, Math.min(60000, ttlMs));
    scheduleNext(interval);
  }, Math.max(0, ms));
}

export function ensureControlPollingStarted() {
  if (started) return;
  started = true;
  notify(current);
  scheduleNext(0);
}

export function getControlSnapshot(): ControlSnapshot {
  return current;
}

export function subscribeControlSnapshot(fn: Subscriber) {
  subs.add(fn);
  ensureControlPollingStarted();
  try {
    fn(current);
  } catch {
    // ignore
  }

  return () => {
    subs.delete(fn);
  };
}
