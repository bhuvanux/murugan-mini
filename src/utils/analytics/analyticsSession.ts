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

type AnalyticsTransport = {
  trackEvent: (eventName: string, payload?: Record<string, any>) => void;
  upsertSession: (session: AnalyticsSession) => void;
  setSessionId: (sessionId: string) => void;
  flush?: (useBeacon?: boolean) => Promise<void> | void;
};

let transport: AnalyticsTransport | null = null;

let sessionId: string | null = null;
let sessionStartTime = Date.now();
let idleStartTime: number | null = null;
let idleDurationSeconds = 0;

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
    const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${rnd()}${rnd()}-${rnd()}-4${rnd().slice(1)}-8${rnd().slice(1)}-${rnd()}${rnd()}${rnd()}`;
  }
}

export function setAnalyticsTransport(t: AnalyticsTransport) {
  transport = t;
}

export function getSessionId() {
  return sessionId;
}

export function startSession() {
  const id = safeRandomUUID();
  sessionId = id;
  sessionStartTime = Date.now();
  idleStartTime = null;
  idleDurationSeconds = 0;

  transport?.setSessionId(id);
  transport?.upsertSession({ id, started_at: new Date().toISOString() });
  transport?.trackEvent("session_start", {});
}

export function markIdleStart() {
  if (idleStartTime != null) return;
  idleStartTime = Date.now();
  transport?.trackEvent("idle_start", {});
}

export function markIdleEnd() {
  if (idleStartTime == null) return;
  const end = Date.now();
  const seconds = Math.max(0, Math.floor((end - idleStartTime) / 1000));
  idleDurationSeconds += seconds;
  idleStartTime = null;
  transport?.trackEvent("idle_end", { idle_seconds: seconds });
}

export function endSession() {
  if (!sessionId) return;

  // If we are idle at the time of ending the session, close the idle window
  markIdleEnd();

  const totalDurationSeconds = Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000));
  const activeDurationSeconds = Math.max(0, totalDurationSeconds - idleDurationSeconds);

  transport?.trackEvent("session_end", {
    total_duration_seconds: totalDurationSeconds,
    idle_duration_seconds: idleDurationSeconds,
    active_duration_seconds: activeDurationSeconds,
  });

  transport?.upsertSession({
    id: sessionId,
    ended_at: new Date().toISOString(),
    total_duration_seconds: totalDurationSeconds,
    idle_duration_seconds: idleDurationSeconds,
    active_duration_seconds: activeDurationSeconds,
  });

  // Try to flush immediately (best effort)
  try {
    transport?.flush?.(true);
  } catch {
    // ignore
  }

  sessionId = null;
}
