export type ImageQualityBucket = "low" | "medium" | "high";
export type VideoQualityLevel = "low" | "medium" | "high";

export type AutoPlayRule = {
  allow: boolean;
  wifiOnly: boolean;
};

export type ImageQualityBucketConfig = {
  maxWidthPx: number;
  jpegQuality: number;
  placeholderScale: number;
};

export type VideoQualityLevelConfig = {
  label: VideoQualityLevel;
  maxHeightPx: number;
  maxBitrateKbps: number;
};

export type MediaPolicies = {
  imageQualityBuckets: Record<ImageQualityBucket, ImageQualityBucketConfig>;
  lazyLoadThresholdPx: number;
  maxConcurrentImages: number;
  videoQualityLevels: Record<VideoQualityLevel, VideoQualityLevelConfig>;
  autoPlayRules: AutoPlayRule;
};

export const DEFAULT_MEDIA_POLICIES: MediaPolicies = {
  imageQualityBuckets: {
    low: { maxWidthPx: 480, jpegQuality: 55, placeholderScale: 0.12 },
    medium: { maxWidthPx: 960, jpegQuality: 70, placeholderScale: 0.12 },
    high: { maxWidthPx: 1600, jpegQuality: 82, placeholderScale: 0.12 },
  },
  lazyLoadThresholdPx: 800,
  maxConcurrentImages: 6,
  videoQualityLevels: {
    low: { label: "low", maxHeightPx: 360, maxBitrateKbps: 700 },
    medium: { label: "medium", maxHeightPx: 720, maxBitrateKbps: 1800 },
    high: { label: "high", maxHeightPx: 1080, maxBitrateKbps: 3500 },
  },
  autoPlayRules: {
    allow: true,
    wifiOnly: true,
  },
};
