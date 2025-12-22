export type NetworkFailureType = "offline" | "timeout" | "5xx" | "4xx" | "unknown";

export type NetworkRetryOn = "timeout" | "5xx";

export interface NetworkPolicy {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number[];
  retryOn: NetworkRetryOn[];
  neverRetry: Array<"offline" | "4xx">;
}

export const DEFAULT_NETWORK_POLICY: NetworkPolicy = {
  timeoutMs: 10000,
  maxRetries: 2,
  retryDelayMs: [500, 1500],
  retryOn: ["timeout", "5xx"],
  neverRetry: ["offline", "4xx"],
};

export function getRetryDelayMs(policy: NetworkPolicy, retryIndex: number): number {
  const v = policy.retryDelayMs[retryIndex];
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  const last = policy.retryDelayMs[policy.retryDelayMs.length - 1];
  if (typeof last === "number" && Number.isFinite(last) && last >= 0) return last;
  return 0;
}

export function shouldRetry(params: {
  policy: NetworkPolicy;
  failureType: NetworkFailureType;
  status?: number;
  attempt: number;
}): boolean {
  const { policy, failureType, attempt } = params;

  if (attempt > 1 + policy.maxRetries) return false;

  if (failureType === "offline") return false;
  if (failureType === "4xx") return false;

  if (failureType === "timeout") return policy.retryOn.includes("timeout");
  if (failureType === "5xx") return policy.retryOn.includes("5xx");

  return false;
}
