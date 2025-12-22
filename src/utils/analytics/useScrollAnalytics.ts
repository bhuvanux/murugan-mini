import { useEffect, useRef } from "react";
import { trackEvent } from "./trackEvent";

export function useScrollAnalytics(pageName: string) {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function onScroll() {
      try {
        const scrollTop = window.scrollY || 0;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        if (height <= 0) return;

        const percent = Math.floor((scrollTop / height) * 100);
        [25, 50, 75, 100].forEach((p) => {
          if (percent >= p && !fired.current.has(p)) {
            fired.current.add(p);
            trackEvent(`scroll_${p}`, { page: pageName });
          }
        });
      } catch {
        // ignore
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true } as any);
    return () => window.removeEventListener("scroll", onScroll as any);
  }, [pageName]);
}
