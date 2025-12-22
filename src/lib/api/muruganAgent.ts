import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { ensureControlPollingStarted, getControlSnapshot } from "../../core/control/controlSnapshot";

export interface MuruganAgentSuccess<T = any> {
  status: "success";
  tool: string;
  data: T;
}

export interface MuruganAgentError {
  status: "error";
  tool?: string;
  error: {
    message: string;
    code?: string;
    [key: string]: any;
  };
}

export type MuruganAgentResponse<T = any> = MuruganAgentSuccess<T> | MuruganAgentError;

const DEBUG_MURUGAN_AGENT =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env &&
  Boolean((import.meta as any).env.DEV);

function debugLog(...args: any[]) {
  if (DEBUG_MURUGAN_AGENT) {
    console.log("[murugan_agent][debug]", ...args);
  }
}

export async function callMuruganAgent<T = any>(
  toolName: string,
  args: any,
): Promise<MuruganAgentSuccess<T>> {
  const url = `https://${projectId}.supabase.co/functions/v1/murugan_agent`;

  ensureControlPollingStarted();
  const snap = getControlSnapshot();
  if (snap.global.safe_mode || snap.ai.disable_ai) {
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=DISABLED message=AI disabled by Control Plane`,
    );
  }

  // Basic offline detection before making the request
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=OFFLINE message=Network appears to be offline`,
    );
  }

  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    debugLog("request", { toolName, url, args });
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        tool: toolName,
        arguments: args ?? {},
      }),
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    const message = error?.name === "AbortError"
      ? "Request timed out"
      : error?.message || String(error);
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=NETWORK_ERROR message=${message}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let json: MuruganAgentResponse<T>;
  try {
    json = (await response.json()) as MuruganAgentResponse<T>;
  } catch (error: any) {
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=${response.status} message=Non-JSON response: ${
        error?.message || String(error)
      }`,
    );
  }

  if (!response.ok) {
    const message =
      (json as any)?.error?.message ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=${response.status} message=${message}`,
    );
  }

  if (json.status !== "success") {
    const message =
      (json as any)?.error?.message ||
      `murugan_agent returned status ${json.status}`;
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=ERROR message=${message}`,
    );
  }

  if (!json.data) {
    throw new Error(
      `[murugan_agent] tool=${toolName} url=${url} status=SUCCESS_NO_DATA message=murugan_agent response missing data field`,
    );
  }

  debugLog("response", { toolName, url, data: (json as MuruganAgentSuccess<T>).data });
  return json as MuruganAgentSuccess<T>;
}
