import type { ImageQualityBucket, VideoQualityLevel } from "./mediaPolicies";

export type DgMediaEventCode =
  | "DG-MEDIA-0001"
  | "DG-MEDIA-0002"
  | "DG-MEDIA-0003"
  | "DG-MEDIA-0004"
  | "DG-MEDIA-0005";

type NetworkStateValue = "online" | "offline" | "unknown";

type BaseMediaPayload = {
  asset_id?: string;
  asset_url?: string;
  screen?: string;
  feature_key?: string;
  network_state?: NetworkStateValue;
};

type ImageLoadPayload = BaseMediaPayload & {
  duration_ms?: number;
  cached?: boolean;
  placeholder_used?: boolean;
  quality_bucket?: ImageQualityBucket;
  decoded?: "sync" | "async" | "unknown";
};

type ImageDownscalePayload = BaseMediaPayload & {
  original_width_px?: number;
  delivered_width_px?: number;
  downscale_ratio?: number;
  quality_bucket?: ImageQualityBucket;
  reason?: "bucket" | "memory" | "unknown";
};

type ImageFailedPayload = BaseMediaPayload & {
  stage?: "fetch" | "decode" | "render" | "unknown";
};

type VideoBufferPayload = BaseMediaPayload & {
  duration_ms?: number;
  quality_level?: VideoQualityLevel;
};

type VideoReleasePayload = BaseMediaPayload & {
  reason?: "unmount" | "background" | "navigation" | "unknown";
};

export type MediaMetricsSnapshot = {
  counts: Record<DgMediaEventCode, number>;
  last_event_at_ms: number | null;
};

const COUNTS: Record<DgMediaEventCode, number> = {
  "DG-MEDIA-0001": 0,
  "DG-MEDIA-0002": 0,
  "DG-MEDIA-0003": 0,
  "DG-MEDIA-0004": 0,
  "DG-MEDIA-0005": 0,
};

let lastEventAtMs: number | null = null;

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function emit(code: DgMediaEventCode, message: string, payload: Record<string, any>) {
  try {
    COUNTS[code] = (COUNTS[code] || 0) + 1;
    lastEventAtMs = safeNowMs() || lastEventAtMs;

    const dg = (globalThis as any)?.DivineGuard;
    if (dg && typeof dg.capture === "function") {
      dg.capture({
        event_code: code,
        message,
        payload,
      });
    }
  } catch {
    // swallow
  }
}

export function getMediaMetricsSnapshot(): Readonly<MediaMetricsSnapshot> {
  return {
    counts: { ...COUNTS },
    last_event_at_ms: lastEventAtMs,
  };
}

export function recordImageLoad(payload: ImageLoadPayload) {
  emit("DG-MEDIA-0001", "Image loaded", payload);
}

export function recordImageDownscale(payload: ImageDownscalePayload) {
  emit("DG-MEDIA-0002", "Image downscaled", payload);
}

export function recordImageFailed(payload: ImageFailedPayload) {
  emit("DG-MEDIA-0003", "Image failed", payload);
}

export function recordVideoBuffer(payload: VideoBufferPayload) {
  emit("DG-MEDIA-0004", "Video buffering", payload);
}

export function recordVideoRelease(payload: VideoReleasePayload) {
  emit("DG-MEDIA-0005", "Video released", payload);
}
