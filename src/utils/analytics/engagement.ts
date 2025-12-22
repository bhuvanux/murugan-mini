import { trackEvent } from "./trackEvent";
import { registerUserActivity } from "./idleTracker";

type EngagementOptions = {
  getRoute: () => string;
  idleMs?: number;
};

export function startEngagementTracking(options: EngagementOptions) {
  let activeRoute = options.getRoute();
  let lastRouteAt = Date.now();

  const scrollMarks = new Set<number>();

  const setRoute = (route: string) => {
    const prev = activeRoute;
    const now = Date.now();

    if (prev && prev !== route) {
      const seconds = Math.max(0, Math.round((now - lastRouteAt) / 1000));
      trackEvent("time_spent", { route: prev, seconds });
      scrollMarks.clear();
    }

    activeRoute = route;
    lastRouteAt = now;
  };

  const onScroll = () => {
    try {
      const el = document.scrollingElement || document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 0) return;
      const pct = (scrollTop / scrollHeight) * 100;

      const marks = [25, 50, 75, 100];
      for (const m of marks) {
        if (pct >= m && !scrollMarks.has(m)) {
          scrollMarks.add(m);
          trackEvent(`scroll_${m}`, { route: activeRoute });
        }
      }
    } catch {
      // ignore
    }
  };

  const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

  const onActivity = () => {
    registerUserActivity();
  };

  activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true } as any));
  window.addEventListener("scroll", onScroll, { passive: true } as any);
  registerUserActivity();

  const stop = () => {
    const now = Date.now();
    const seconds = Math.max(0, Math.round((now - lastRouteAt) / 1000));
    trackEvent("time_spent", { route: activeRoute, seconds });

    activityEvents.forEach((e) => window.removeEventListener(e, onActivity as any));
    window.removeEventListener("scroll", onScroll as any);
  };

  return { stop, setRoute };
}
