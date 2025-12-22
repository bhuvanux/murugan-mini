import { useEffect } from "react";
import { trackEvent } from "./trackEvent";

export function usePageAnalytics(pageName: string) {
  useEffect(() => {
    trackEvent("page_enter", { page: pageName, route: pageName });
    return () => {
      trackEvent("page_exit", { page: pageName, route: pageName });
    };
  }, [pageName]);
}
