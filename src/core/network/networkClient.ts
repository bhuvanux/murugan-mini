import { getState, isOnline } from "./networkState";
import {
  DEFAULT_NETWORK_POLICY,
  type NetworkFailureType,
  type NetworkPolicy,
  getRetryDelayMs,
  shouldRetry,
} from "./networkPolicies";
import * as offlineCache from "./offlineCache";
import * as uxWatchdog from "./uxWatchdog";
import { getControlSnapshot } from "../control/controlSnapshot";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface NetworkRequestConfig {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  policy?: NetworkPolicy;
  parseAs?: "json" | "text" | "arrayBuffer";
}

export interface NetworkSuccess<T> {
  ok: true;
  status: number;
  data: T;
  attempt_count: number;
}

export interface NetworkFailure {
  ok: false;
  failure_type: NetworkFailureType;
  message: string;
  status?: number;
  attempt_count: number;
}

export type NetworkResult<T> = NetworkSuccess<T> | NetworkFailure;

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function safeSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      setTimeout(resolve, Math.max(0, ms));
    } catch {
      resolve();
    }
  });
}

function emitNetEvent(params: {
  event_code: string;
  message: string;
  payload: Record<string, any>;
}) {
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

function normalizeMethod(method?: string): HttpMethod {
  const m = (method || "GET").toUpperCase();
  if (
    m === "GET" ||
    m === "POST" ||
    m === "PUT" ||
    m === "PATCH" ||
    m === "DELETE" ||
    m === "HEAD" ||
    m === "OPTIONS"
  ) {
    return m;
  }
  return "GET";
}

function classifyHttpFailure(status: number): NetworkFailureType {
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  return "unknown";
}

function buildEndpointForPayload(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return { res };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { err };
  }
}

async function parseResponse<T>(res: Response, parseAs: NetworkRequestConfig["parseAs"]): Promise<T> {
  const mode = parseAs ?? "json";

  if (mode === "text") {
    return (await res.text()) as any;
  }

  if (mode === "arrayBuffer") {
    return (await res.arrayBuffer()) as any;
  }

  return (await res.json()) as any;
}

export const networkClient = {
  async request<T = any>(config: NetworkRequestConfig): Promise<NetworkResult<T>> {
    const snap = getControlSnapshot();
    const basePolicy = config.policy ?? DEFAULT_NETWORK_POLICY;

    const policy: NetworkPolicy = {
      ...basePolicy,
      maxRetries:
        snap.global.safe_mode || snap.network.disable_retries
          ? 0
          : typeof snap.network.retry_count === "number"
            ? Math.max(0, Math.min(10, snap.network.retry_count))
            : basePolicy.maxRetries,
      timeoutMs:
        typeof snap.network.timeout_ms === "number" && snap.network.timeout_ms > 0
          ? Math.max(1000, Math.min(120000, snap.network.timeout_ms))
          : basePolicy.timeoutMs,
    };
    const method = normalizeMethod(config.method);
    const endpoint = buildEndpointForPayload(config.url);
    const cacheKey = offlineCache.buildCacheKey({ method, url: config.url });
    const watchdogKey = `net:${cacheKey}`;

    const timeoutMs =
      typeof config.timeoutMs === "number" && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
        ? config.timeoutMs
        : policy.timeoutMs;

    uxWatchdog.start(
      watchdogKey,
      {
        endpoint,
        method,
      },
      {
        thresholdMs:
          typeof snap.ux.ux_watchdog_threshold_ms === "number" && snap.ux.ux_watchdog_threshold_ms > 0
            ? Math.max(0, Math.min(120000, snap.ux.ux_watchdog_threshold_ms))
            : Math.max(0, Math.min(12000, Math.max(8000, timeoutMs))),
      },
    );

    const tryOfflineFallback = (reason: "offline" | "timeout" | "5xx"): NetworkResult<T> | null => {
      if (method !== "GET") return null;
      const entry = offlineCache.getEntry<T>(cacheKey);
      if (!entry) return null;

      const cacheAgeMs = Math.max(0, safeNowMs() - entry.stored_at_ms);
      emitNetEvent({
        event_code: "DG-UX-0002",
        message: "Offline fallback used",
        payload: {
          endpoint,
          method,
          cache_age_ms: cacheAgeMs,
          reason,
        },
      });

      return {
        ok: true,
        status: typeof entry.meta?.status === "number" ? entry.meta.status : 200,
        data: entry.data,
        attempt_count: 0,
      };
    };

    // 1) Offline block
    if (!isOnline()) {
      const fallback = tryOfflineFallback("offline");
      if (fallback) {
        uxWatchdog.resolve(watchdogKey);
        return fallback;
      }

      const snap = getState();
      emitNetEvent({
        event_code: "DG-NET-0002",
        message: "Request blocked: offline",
        payload: {
          endpoint,
          method,
          attempt_count: 0,
          timeout_ms: timeoutMs,
          network_state: snap.state,
        },
      });

      uxWatchdog.cancel(watchdogKey);
      return {
        ok: false,
        failure_type: "offline",
        message: "Offline: request blocked",
        attempt_count: 0,
      };
    }

    // 2..5) Execute with timeout + retry policy + classification
    const maxAttempts = 1 + policy.maxRetries;
    let lastFailure: NetworkFailure | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const headers: Record<string, string> = {
          ...(config.headers || {}),
        };

        const init: RequestInit = {
          method,
          headers,
          body: config.body,
        };

        const { res, err } = await fetchWithTimeout(config.url, init, timeoutMs);

        if (err) {
          const isTimeout = err?.name === "AbortError";
          const failure_type: NetworkFailureType = isTimeout ? "timeout" : "unknown";

          if (isTimeout) {
            emitNetEvent({
              event_code: "DG-NET-0003",
              message: "Request timeout",
              payload: {
                endpoint,
                method,
                attempt_count: attempt,
                timeout_ms: timeoutMs,
              },
            });
          }

          lastFailure = {
            ok: false,
            failure_type,
            message: isTimeout ? "Request timed out" : "Network request failed",
            attempt_count: attempt,
          };

          if (shouldRetry({ policy, failureType: failure_type, attempt })) {
            const retryIndex = attempt - 1;
            await safeSleep(getRetryDelayMs(policy, retryIndex));
            continue;
          }

          break;
        }

        if (!res) {
          lastFailure = {
            ok: false,
            failure_type: "unknown",
            message: "Network request failed",
            attempt_count: attempt,
          };
          break;
        }

        if (!res.ok) {
          const failure_type = classifyHttpFailure(res.status);

          if (failure_type === "5xx") {
            emitNetEvent({
              event_code: "DG-NET-0004",
              message: "Server 5xx error",
              payload: {
                endpoint,
                method,
                attempt_count: attempt,
                status: res.status,
                timeout_ms: timeoutMs,
              },
            });
          }

          lastFailure = {
            ok: false,
            failure_type,
            message: `HTTP ${res.status}`,
            status: res.status,
            attempt_count: attempt,
          };

          if (shouldRetry({ policy, failureType: failure_type, status: res.status, attempt })) {
            const retryIndex = attempt - 1;
            await safeSleep(getRetryDelayMs(policy, retryIndex));
            continue;
          }

          break;
        }

        const data = await parseResponse<T>(res, config.parseAs);

        if (method === "GET") {
          offlineCache.set(cacheKey, data, {
            endpoint,
            url: config.url,
            status: res.status,
          });
        }

        uxWatchdog.resolve(watchdogKey);
        return {
          ok: true,
          status: res.status,
          data,
          attempt_count: attempt,
        };
      } catch {
        lastFailure = {
          ok: false,
          failure_type: "unknown",
          message: "Network request failed",
          attempt_count: attempt,
        };
        break;
      }
    }

    // 5) Retry exhausted (only if we had retries configured and used)
    if (policy.maxRetries > 0 && lastFailure && lastFailure.attempt_count >= 1 + policy.maxRetries) {
      const exhaustionType = lastFailure.failure_type;
      if (exhaustionType === "timeout" || exhaustionType === "5xx") {
        emitNetEvent({
          event_code: "DG-NET-0005",
          message: "Retry attempts exhausted",
          payload: {
            endpoint,
            method,
            attempt_count: lastFailure.attempt_count,
            timeout_ms: timeoutMs,
            status: lastFailure.status,
            failure_type: lastFailure.failure_type,
          },
        });
      }
    }

    if (lastFailure?.failure_type === "timeout" || lastFailure?.failure_type === "5xx") {
      const fallback = tryOfflineFallback(lastFailure.failure_type);
      if (fallback) {
        uxWatchdog.resolve(watchdogKey);
        return fallback;
      }
    }

    uxWatchdog.cancel(watchdogKey);

    return (
      lastFailure || {
        ok: false,
        failure_type: "unknown",
        message: "Network request failed",
        attempt_count: 0,
      }
    );
  },
};

/*
Minimal usage example (do not wire into features in this step):

import { networkClient } from "../core/network/networkClient";

const res = await networkClient.request({
  url: "https://example.com/api/ping",
  method: "GET",
});

if (res.ok) {
  console.log(res.data);
} else {
  console.log(res.failure_type, res.message);
}
*/
