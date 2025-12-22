import { markIdleEnd, markIdleStart } from "./analyticsSession";

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let idleThresholdMs = 15000;

export function setIdleThresholdMs(ms: number) {
  idleThresholdMs = ms;
}

export function registerUserActivity() {
  try {
    if (idleTimer) clearTimeout(idleTimer);

    // If we were idle, end it now
    markIdleEnd();

    idleTimer = setTimeout(() => {
      markIdleStart();
    }, idleThresholdMs);
  } catch {
    // ignore
  }
}

export function stopIdleTracker() {
  try {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  } catch {
    // ignore
  }
}
