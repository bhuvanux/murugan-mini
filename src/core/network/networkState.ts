export type NetworkStateValue = "online" | "offline" | "unknown";

export interface NetworkStateSnapshot {
  state: NetworkStateValue;
  last_changed_at: string | null;
  last_known_online_at: string | null;
}

function safeNowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

function emitNetworkStateChangeEvent(previous: NetworkStateValue, next: NetworkStateValue) {
  try {
    const dg = (globalThis as any)?.DivineGuard;
    if (dg && typeof dg.capture === "function") {
      dg.capture({
        event_code: "DG-NET-0001",
        message: "Network state changed",
        payload: {
          previous_state: previous,
          new_state: next,
        },
      });
    }
  } catch {
    // swallow
  }
}

let currentState: NetworkStateValue = "unknown";
let lastChangedAt: string | null = null;
let lastKnownOnlineAt: string | null = null;
let initialized = false;

function detectInitialState(): NetworkStateValue {
  try {
    if (typeof window !== "undefined" && typeof window.navigator !== "undefined") {
      if (typeof window.navigator.onLine === "boolean") {
        return window.navigator.onLine ? "online" : "offline";
      }
    }
  } catch {
    // ignore
  }
  return "unknown";
}

function setState(next: NetworkStateValue) {
  if (next === currentState) return;

  const prev = currentState;
  currentState = next;
  lastChangedAt = safeNowIso() || null;
  if (next === "online") {
    lastKnownOnlineAt = lastChangedAt;
  }

  emitNetworkStateChangeEvent(prev, next);
}

function init() {
  if (initialized) return;
  initialized = true;

  const initial = detectInitialState();
  currentState = initial;
  if (initial !== "unknown") {
    lastChangedAt = safeNowIso() || null;
    if (initial === "online") lastKnownOnlineAt = lastChangedAt;
  }

  try {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("online", () => setState("online"));
      window.addEventListener("offline", () => setState("offline"));
    }
  } catch {
    // ignore
  }
}

init();

export function isOnline(): boolean {
  init();
  return currentState === "online";
}

export function getState(): Readonly<NetworkStateSnapshot> {
  init();
  return {
    state: currentState,
    last_changed_at: lastChangedAt,
    last_known_online_at: lastKnownOnlineAt,
  };
}
