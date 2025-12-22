import React from "react";
import { buildImagePlan, type ImageAssetSources } from "../../core/media/imageOptimizer";
import { DEFAULT_MEDIA_POLICIES } from "../../core/media/mediaPolicies";
import { recordImageDownscale, recordImageFailed, recordImageLoad } from "../../core/media/mediaMetrics";
import { useControlSnapshot } from "../../core/control/useControlSnapshot";
import { releaseMediaSlot, tryAcquireMediaSlot } from "../../core/control/mediaLoadLimiter";

type ExtraProps = {
  screen?: string;
  feature_key?: string;
  asset_id?: string;
  sources?: ImageAssetSources;
  original_width_px?: number;
  distance_to_viewport_px?: number;
};

export type OptimizedImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
} & ExtraProps;

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function detectCached(assetUrl: string): boolean | undefined {
  try {
    const p = (globalThis as any)?.performance;
    if (!p || typeof p.getEntriesByName !== "function") return undefined;

    const entries = p.getEntriesByName(assetUrl);
    const last = entries && entries.length > 0 ? (entries[entries.length - 1] as any) : null;
    if (!last) return undefined;

    const transferSize = last.transferSize;
    if (typeof transferSize === "number") {
      return transferSize === 0;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function buildPlaceholderSvgDataUrl(width?: number, height?: number): string {
  const w = typeof width === "number" && Number.isFinite(width) && width > 0 ? Math.round(width) : 16;
  const h = typeof height === "number" && Number.isFinite(height) && height > 0 ? Math.round(height) : 16;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#f2f2f2"/>` +
    `</svg>`;

  try {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }
}

export function OptimizedImage(props: OptimizedImageProps) {
  const snap = useControlSnapshot();
  const {
    src,
    sources,
    screen,
    feature_key,
    asset_id,
    original_width_px,
    distance_to_viewport_px,
    width,
    height,
    loading,
    fetchPriority,
    onLoad,
    onError,
    style,
    ...rest
  } = props;

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const [measuredWidth, setMeasuredWidth] = React.useState<number>(() => {
    return typeof width === "number" ? width : 0;
  });

  const [inView, setInView] = React.useState<boolean>(() => {
    return loading === "eager" && !snap.global.safe_mode && !snap.media.disable_preloading && !snap.ux.skeleton_only;
  });

  const [resolvedSrc, setResolvedSrc] = React.useState<string>(() => {
    // Start with a placeholder; swap to real URL when in view.
    return buildPlaceholderSvgDataUrl(
      typeof width === "number" ? width : undefined,
      typeof height === "number" ? height : undefined,
    );
  });

  const requestStartMsRef = React.useRef<number>(0);
  const placeholderUsedRef = React.useRef<boolean>(true);
  const downscaleReportedRef = React.useRef<boolean>(false);

  const priority: "high" | "low" =
    loading === "eager" || fetchPriority === "high" ? "high" : "low";

  const plan = React.useMemo(() => {
    const w = measuredWidth || (typeof width === "number" ? width : 0) || 360;
    const dpr =
      typeof (globalThis as any)?.devicePixelRatio === "number" ? (globalThis as any).devicePixelRatio : 1;

    const basePriority = priority;
    const effectivePriority: "high" | "low" =
      snap.global.safe_mode || snap.media.disable_preloading ? "low" : basePriority;

    const basePlan = buildImagePlan({
      sources: sources || { original: src },
      display_width_px: w,
      device_pixel_ratio: dpr,
      priority: effectivePriority,
      distance_to_viewport_px,
      policies: DEFAULT_MEDIA_POLICIES,
      asset_id,
      feature_key,
      screen,
    });

    const forced = snap.media.force_image_quality;
    if (forced !== "auto") {
      const s = sources || { original: src };
      const selected = (s as any)[forced] || s.original;
      return {
        ...basePlan,
        selected_url: selected,
        quality_bucket: forced,
      };
    }

    return basePlan;
  }, [asset_id, distance_to_viewport_px, feature_key, measuredWidth, priority, screen, snap.global.safe_mode, snap.media.disable_preloading, snap.media.force_image_quality, snap.ux.skeleton_only, sources, src, width]);

  const acquiredRef = React.useRef<boolean>(false);
  const [, forceRerender] = React.useState(0);

  React.useEffect(() => {
    if (snap.global.safe_mode || snap.ux.skeleton_only) {
      setInView(false);
      return;
    }
    if (loading === "eager" && !snap.media.disable_preloading) {
      setInView(true);
    }
  }, [loading, snap.global.safe_mode, snap.media.disable_preloading, snap.ux.skeleton_only]);

  React.useEffect(() => {
    if (downscaleReportedRef.current) return;
    if (typeof original_width_px !== "number" || !Number.isFinite(original_width_px)) return;

    if (plan.quality_bucket !== "high") {
      downscaleReportedRef.current = true;
      recordImageDownscale({
        asset_id,
        asset_url: plan.selected_url,
        screen,
        feature_key,
        original_width_px,
        delivered_width_px: DEFAULT_MEDIA_POLICIES.imageQualityBuckets[plan.quality_bucket].maxWidthPx,
        downscale_ratio:
          original_width_px > 0
            ? DEFAULT_MEDIA_POLICIES.imageQualityBuckets[plan.quality_bucket].maxWidthPx / original_width_px
            : undefined,
        quality_bucket: plan.quality_bucket,
        reason: "bucket",
        network_state: (globalThis as any)?.navigator?.onLine === false ? "offline" : "unknown",
      });
    }
  }, [asset_id, feature_key, original_width_px, plan.quality_bucket, plan.selected_url, screen]);

  React.useEffect(() => {
    // Measure width if not provided.
    if (typeof width === "number" && width > 0) return;

    const el = imgRef.current;
    if (!el) return;

    const update = () => {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width && rect.width > 0) setMeasuredWidth(rect.width);
      } catch {
        // ignore
      }
    };

    update();

    let ro: ResizeObserver | null = null;
    try {
      if (typeof (globalThis as any)?.ResizeObserver === "function") {
        ro = new ResizeObserver(() => update());
        ro.observe(el);
      }
    } catch {
      // ignore
    }

    return () => {
      try {
        ro?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [width]);

  React.useEffect(() => {
    // Lazy loading via IntersectionObserver if allowed.
    if (!plan.lazy) {
      setInView(true);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    if (typeof (globalThis as any)?.IntersectionObserver !== "function") {
      setInView(true);
      return;
    }

    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (e && e.isIntersecting) {
            setInView(true);
          }
        },
        {
          root: null,
          rootMargin: `${DEFAULT_MEDIA_POLICIES.lazyLoadThresholdPx}px`,
          threshold: 0.01,
        },
      );

      observerRef.current.observe(el);
    } catch {
      setInView(true);
    }

    return () => {
      try {
        observerRef.current?.disconnect();
      } catch {
        // ignore
      }
      observerRef.current = null;
    };
  }, [plan.lazy]);

  React.useEffect(() => {
    if (!snap.global.safe_mode && !snap.ux.skeleton_only) return;

    if (acquiredRef.current) {
      acquiredRef.current = false;
      releaseMediaSlot();
    }

    setResolvedSrc(
      buildPlaceholderSvgDataUrl(
        typeof width === "number" ? width : undefined,
        typeof height === "number" ? height : undefined,
      ),
    );

    const el = imgRef.current;
    if (el) {
      try {
        el.src = "";
      } catch {
        // ignore
      }
    }
  }, [height, snap.global.safe_mode, snap.ux.skeleton_only, width]);

  React.useEffect(() => {
    if (!inView) return;

    if (snap.ux.skeleton_only) return;

    if (!acquiredRef.current) {
      const ok = tryAcquireMediaSlot(snap.media.max_concurrent_media_loads);
      if (!ok) {
        const t = setTimeout(() => {
          forceRerender((x) => x + 1);
        }, 450);
        return () => clearTimeout(t);
      }
      acquiredRef.current = true;
    }

    placeholderUsedRef.current = true;
    requestStartMsRef.current = safeNowMs();
    setResolvedSrc(plan.selected_url);
  }, [inView, plan.selected_url, snap.media.max_concurrent_media_loads, snap.ux.skeleton_only, snap.global.safe_mode]);

  React.useEffect(() => {
    return () => {
      try {
        observerRef.current?.disconnect();
      } catch {
        // ignore
      }
      observerRef.current = null;

      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseMediaSlot();
      }

      const el = imgRef.current;
      if (el) {
        try {
          el.src = "";
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={resolvedSrc}
      width={width}
      height={height}
      decoding={plan.decoded}
      loading={plan.lazy ? "lazy" : "eager"}
      onLoad={(e) => {
        const duration = Math.max(0, safeNowMs() - (requestStartMsRef.current || safeNowMs()));
        const cached = detectCached(plan.selected_url);

        recordImageLoad({
          asset_id,
          asset_url: plan.selected_url,
          screen,
          feature_key,
          quality_bucket: plan.quality_bucket,
          duration_ms: duration,
          placeholder_used: placeholderUsedRef.current,
          cached,
          decoded: plan.decoded,
        });

        placeholderUsedRef.current = false;

        if (acquiredRef.current) {
          acquiredRef.current = false;
          releaseMediaSlot();
        }

        if (typeof onLoad === "function") onLoad(e);
      }}
      onError={(e) => {
        recordImageFailed({
          asset_id,
          asset_url: plan.selected_url,
          screen,
          feature_key,
          stage: "render",
        });

        if (typeof onError === "function") onError(e);

        if (acquiredRef.current) {
          acquiredRef.current = false;
          releaseMediaSlot();
        }
      }}
      style={{
        ...style,
        // Placeholder feel: subtle blur until first successful load.
        transition: "filter 200ms ease",
        filter: placeholderUsedRef.current ? `blur(${Math.max(0, 24 * plan.placeholder_scale)}px)` : undefined,
      }}
      {...rest}
    />
  );
}
