export type AnalyticsConsentState = {
  analytics: boolean;
};

const STORAGE_KEY = "murugan_analytics_consent_v1";

export function getAnalyticsConsent(): AnalyticsConsentState {
  try {
    if (typeof window === "undefined") return { analytics: true };
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analytics: true };
    const parsed = JSON.parse(raw);
    return { analytics: parsed?.analytics !== false };
  } catch {
    return { analytics: true };
  }
}

export function hasStoredAnalyticsConsent(): boolean {
  try {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return true;
  }
}

export function setAnalyticsConsent(next: AnalyticsConsentState) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: next.analytics !== false }));
    window.dispatchEvent(new CustomEvent("murugan_analytics_consent_changed", { detail: next }));
  } catch {
    // ignore
  }
}

export function isAnalyticsEnabled(): boolean {
  return getAnalyticsConsent().analytics !== false;
}
