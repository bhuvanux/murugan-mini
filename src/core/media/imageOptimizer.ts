import { getState } from "../network/networkState";
import { DEFAULT_MEDIA_POLICIES, type ImageQualityBucket, type MediaPolicies } from "./mediaPolicies";
import { recordImageDownscale } from "./mediaMetrics";

export type ImageAssetSources = Partial<Record<ImageQualityBucket, string>> & { original: string };

export type ImagePlan = {
  selected_url: string;
  quality_bucket: ImageQualityBucket;
  lazy: boolean;
  placeholder_scale: number;
  decoded: "async" | "sync";
};

export type ImagePlanInput = {
  sources: ImageAssetSources;
  display_width_px: number;
  device_pixel_ratio?: number;
  priority?: "high" | "low";
  distance_to_viewport_px?: number;
  policies?: MediaPolicies;
  asset_id?: string;
  feature_key?: string;
  screen?: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function inferQualityBucket(params: {
  policies: MediaPolicies;
  displayWidthPx: number;
  dpr: number;
  networkState: "online" | "offline" | "unknown";
}): ImageQualityBucket {
  const { policies, displayWidthPx, dpr, networkState } = params;

  if (networkState === "offline") return "low";

  const target = Math.max(1, Math.round(displayWidthPx * clamp(dpr, 1, 3)));
  if (target <= policies.imageQualityBuckets.low.maxWidthPx) return "low";
  if (target <= policies.imageQualityBuckets.medium.maxWidthPx) return "medium";
  return "high";
}

function pickUrl(sources: ImageAssetSources, bucket: ImageQualityBucket): string {
  return sources[bucket] || sources.original;
}

export function buildImagePlan(input: ImagePlanInput): ImagePlan {
  const policies = input.policies ?? DEFAULT_MEDIA_POLICIES;
  const snap = getState();

  const dpr = typeof input.device_pixel_ratio === "number" && Number.isFinite(input.device_pixel_ratio)
    ? input.device_pixel_ratio
    : 1;

  const quality_bucket = inferQualityBucket({
    policies,
    displayWidthPx: input.display_width_px,
    dpr,
    networkState: snap.state,
  });

  const selected_url = pickUrl(input.sources, quality_bucket);

  const priority = input.priority ?? "low";
  const distance = typeof input.distance_to_viewport_px === "number" ? input.distance_to_viewport_px : undefined;

  const lazy =
    priority !== "high" &&
    (distance == null ? true : distance > policies.lazyLoadThresholdPx);

  const placeholder_scale = policies.imageQualityBuckets[quality_bucket].placeholderScale;

  return {
    selected_url,
    quality_bucket,
    lazy,
    placeholder_scale,
    decoded: "async",
  };
}

export function reportImageDownscale(params: {
  asset_id?: string;
  asset_url?: string;
  screen?: string;
  feature_key?: string;
  original_width_px?: number;
  delivered_width_px?: number;
  quality_bucket?: ImageQualityBucket;
  reason?: "bucket" | "memory" | "unknown";
}) {
  const ow = params.original_width_px;
  const dw = params.delivered_width_px;
  const ratio =
    typeof ow === "number" && typeof dw === "number" && ow > 0 ? dw / ow : undefined;

  recordImageDownscale({
    asset_id: params.asset_id,
    asset_url: params.asset_url,
    screen: params.screen,
    feature_key: params.feature_key,
    original_width_px: ow,
    delivered_width_px: dw,
    downscale_ratio: ratio,
    quality_bucket: params.quality_bucket,
    reason: params.reason,
    network_state: getState().state,
  });
}
