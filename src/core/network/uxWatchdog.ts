import { getState } from "./networkState";

export interface UXWatchdogPolicy {
  thresholdMs: number;
}

export const DEFAULT_UX_WATCHDOG_POLICY: UXWatchdogPolicy = {
  thresholdMs: 10000,
};

export interface UXWatchdogMeta {
  endpoint?: string;
  method?: string;
}

type WatchdogRecord = {
  key: string;
  started_at_ms: number;
  endpoint?: string;
  method?: string;
  timer: ReturnType<typeof setTimeout> | null;
};

const ACTIVE = new Map<string, WatchdogRecord>();

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function emitUxEvent(params: { event_code: string; message: string; payload: Record<string, any> }) {
  try {
    const dg = (globalThis as any)?.DivineGuard;
    if (dg && typeof dg.capture === "function") {
      dg.capture({
        event_code: params.event_code,
        message: params.message,
        payload: params.payload,
      });
    }
  } catch {
    // swallow
  }
}

function clearTimer(rec: WatchdogRecord) {
  if (!rec.timer) return;
  try {
    clearTimeout(rec.timer);
  } catch {
    // ignore
  }
  rec.timer = null;
}

export function start(key: string, meta: UXWatchdogMeta = {}, policy: UXWatchdogPolicy = DEFAULT_UX_WATCHDOG_POLICY) {
  if (!key) return;

  const existing = ACTIVE.get(key);
  if (existing) {
    clearTimer(existing);
    ACTIVE.delete(key);
  }

  const startedAt = safeNowMs();
  const rec: WatchdogRecord = {
    key,
    started_at_ms: startedAt,
    endpoint: meta.endpoint,
    method: meta.method,
    timer: null,
  };

  const threshold = Math.max(0, policy.thresholdMs);

  try {
    rec.timer = setTimeout(() => {
      const snap = getState();
      const duration = Math.max(0, safeNowMs() - startedAt);

      emitUxEvent({
        event_code: "DG-UX-0001",
        message: "Possible infinite loading / no-response UX",
        payload: {
          key,
          endpoint: rec.endpoint,
          duration_ms: duration,
          network_state: snap.state,
        },
      });

      ACTIVE.delete(key);
    }, threshold);
  } catch {
    // ignore
  }

  ACTIVE.set(key, rec);
}

export function resolve(key: string) {
  const rec = ACTIVE.get(key);
  if (!rec) return;
  clearTimer(rec);
  ACTIVE.delete(key);
}

export function cancel(key: string) {
  const rec = ACTIVE.get(key);
  if (!rec) return;
  clearTimer(rec);
  ACTIVE.delete(key);
}
