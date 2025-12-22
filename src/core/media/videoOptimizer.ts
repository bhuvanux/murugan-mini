import { getState } from "../network/networkState";
import { DEFAULT_MEDIA_POLICIES, type MediaPolicies, type VideoQualityLevel } from "./mediaPolicies";

export type VideoSourcesByQuality = Partial<Record<VideoQualityLevel, string>> & { original: string };

export type VideoPlan = {
  thumbnail_url?: string;
  initial_quality: VideoQualityLevel;
  initial_source_url: string;
  allow_autoplay: boolean;
};

export type VideoPlanInput = {
  sources: VideoSourcesByQuality;
  thumbnail_url?: string;
  policies?: MediaPolicies;
  prefer_low_data?: boolean;
};

function pickVideoSource(sources: VideoSourcesByQuality, q: VideoQualityLevel): string {
  return sources[q] || sources.original;
}

function inferVideoQualityLevel(params: {
  policies: MediaPolicies;
  networkState: "online" | "offline" | "unknown";
  preferLowData: boolean;
}): VideoQualityLevel {
  const { networkState, preferLowData } = params;

  if (networkState === "offline") return "low";
  if (preferLowData) return "low";
  return "high";
}

export function buildVideoPlan(input: VideoPlanInput): VideoPlan {
  const policies = input.policies ?? DEFAULT_MEDIA_POLICIES;
  const snap = getState();

  const initial_quality = inferVideoQualityLevel({
    policies,
    networkState: snap.state,
    preferLowData: !!input.prefer_low_data,
  });

  const initial_source_url = pickVideoSource(input.sources, initial_quality);

  const allow_autoplay = policies.autoPlayRules.allow && (policies.autoPlayRules.wifiOnly ? false : true);

  return {
    thumbnail_url: input.thumbnail_url,
    initial_quality,
    initial_source_url,
    allow_autoplay,
  };
}

export function shouldPauseOnBackground(): boolean {
  return true;
}

export function shouldReleaseOnExit(): boolean {
  return true;
}
