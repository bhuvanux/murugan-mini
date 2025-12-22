import { publicAnonKey } from "../supabase/info";
import { setAnalyticsTransport } from "./analyticsSession";
import { fetchAdminResponseWith404Fallback } from "../adminAPI";
import { isAnalyticsEnabled } from "./consent";

type AnalyticsEvent = {
  event_name: string;
  feature_key?: string;
  page?: string;
  route?: string;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
};

type AnalyticsSession = {
  id: string;
  user_id?: string | null;
  device?: string | null;
  platform?: string | null;
  app_version?: string | null;
  started_at?: string;
  ended_at?: string | null;
  total_duration_seconds?: number;
  idle_duration_seconds?: number;
  active_duration_seconds?: number;
};

let routeOverride: string | null = null;
let memorySessionId: string | null = null;

function safeRandomUUID(): string {
  try {
    const c = (globalThis as any)?.crypto;
    if (c?.randomUUID) return c.randomUUID();
    const grv = c?.getRandomValues?.bind(c);
    const bytes = new Uint8Array(16);
    if (grv) {
      grv(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }

    // RFC4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    // Very last resort (still UUID-shaped)
    const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${rnd()}${rnd()}-${rnd()}-4${rnd().slice(1)}-8${rnd().slice(1)}-${rnd()}${rnd()}${rnd()}`;
  }
}

export function setAnalyticsRoute(route: string | null) {
  routeOverride = route;
}

function getSessionId(): string {
  const key = "universal_analytics_session_id";
  try {
    const storage = (globalThis as any)?.sessionStorage;
    if (storage?.getItem) {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const id = safeRandomUUID();
      storage.setItem(key, id);
      return id;
    }
  } catch {
    // ignore
  }

  if (memorySessionId) return memorySessionId;
  memorySessionId = safeRandomUUID();
  return memorySessionId;
}

function getAppVersion(): string {
  const v = (import.meta as any)?.env?.VITE_APP_VERSION;
  return typeof v === "string" && v.length > 0 ? v : "0.1.0";
}

class UniversalAnalytics {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private sessionSent: boolean = false;
  private pendingSession: AnalyticsSession | null = null;

  constructor() {
    this.sessionId = getSessionId();

    // Periodic flush should work in both Web and React Native runtimes
    try {
      if (typeof setInterval === "function") {
        this.flushTimer = setInterval(() => {
          this.flush();
        }, 5000);
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("universal_analytics_user_id");
      if (storedUserId) this.userId = storedUserId;

      // If consent changes to OFF, immediately drop any queued events.
      window.addEventListener("murugan_analytics_consent_changed", () => {
        if (!isAnalyticsEnabled()) {
          this.queue = [];
          this.pendingSession = null;
        }
      });

      window.addEventListener("beforeunload", () => {
        this.destroy();
        this.flush(true);
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush(true);
        }
      });
    }
  }

  destroy() {
    if (this.flushTimer != null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  setUserId(userId: string | null) {
    this.userId = userId;
    if (typeof window !== "undefined") {
      if (userId) localStorage.setItem("universal_analytics_user_id", userId);
      else localStorage.removeItem("universal_analytics_user_id");
    }
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    this.sessionSent = false;
    this.pendingSession = null;

    const key = "universal_analytics_session_id";
    try {
      const storage = (globalThis as any)?.sessionStorage;
      if (storage?.setItem) storage.setItem(key, sessionId);
    } catch {
      // ignore
    }
    memorySessionId = sessionId;
  }

  upsertSession(session: AnalyticsSession) {
    if (!session?.id) return;
    this.pendingSession = {
      ...(this.pendingSession || {}),
      ...session,
      id: session.id,
      user_id: session.user_id ?? this.userId ?? undefined,
      device: session.device ?? (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
      platform: session.platform ?? (typeof navigator !== "undefined" ? navigator.platform : undefined),
      app_version: session.app_version ?? getAppVersion(),
    };
  }

  track(event_name: string, payload: Record<string, any> = {}) {
    if (!isAnalyticsEnabled()) return;

    const inferredRoute =
      routeOverride ?? (typeof window !== "undefined" ? window.location.pathname : undefined);
    const route = payload.route ?? inferredRoute;
    const page = payload.page ?? inferredRoute;

    const { feature_key, metadata, user_id, session_id, ...rest } = payload || {};

    const ev: AnalyticsEvent = {
      event_name,
      feature_key,
      page,
      route,
      user_id: user_id ?? this.userId ?? undefined,
      session_id: session_id ?? this.sessionId,
      metadata: {
        ...(metadata || {}),
        ...rest,
        timestamp: new Date().toISOString(),
        app_version: getAppVersion(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
      },
    };

    this.queue.push(ev);

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  private buildSessionPayload(): AnalyticsSession {
    return {
      id: this.sessionId,
      user_id: this.userId ?? undefined,
      device: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
      app_version: getAppVersion(),
      started_at: new Date().toISOString(),
    };
  }

  async flush(useBeacon = false) {
    if (!isAnalyticsEnabled()) {
      this.queue = [];
      this.pendingSession = null;
      return;
    }

    if (this.queue.length === 0 && this.sessionSent && !this.pendingSession) return;

    const events = this.queue.splice(0, 50);
    const session = this.pendingSession || (this.sessionSent ? undefined : this.buildSessionPayload());

    const body = JSON.stringify({
      session,
      events,
      consent: { analytics: isAnalyticsEnabled() },
    });

    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body,
        keepalive: useBeacon,
      });

      if (res.ok) {
        this.sessionSent = true;
        this.pendingSession = null;
      }
    } catch {
      if (events.length > 0) {
        this.queue.unshift(...events);
      }
    }
  }
}

const universalAnalytics = new UniversalAnalytics();

setAnalyticsTransport({
  trackEvent: (eventName: string, payload: Record<string, any> = {}) => {
    universalAnalytics.track(eventName, payload);
  },
  upsertSession: (session) => {
    if (!isAnalyticsEnabled()) return;
    universalAnalytics.upsertSession(session);
  },
  setSessionId: (sessionId: string) => {
    if (!isAnalyticsEnabled()) return;
    universalAnalytics.setSessionId(sessionId);
  },
  flush: async (useBeacon?: boolean) => {
    await universalAnalytics.flush(!!useBeacon);
  },
});

export function setAnalyticsUserId(userId: string | null) {
  universalAnalytics.setUserId(userId);
}

export function trackEvent(event_name: string, payload: Record<string, any> = {}) {
  universalAnalytics.track(event_name, payload);
}

export async function flushAnalytics() {
  await universalAnalytics.flush();
}
