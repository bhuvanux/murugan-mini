import React from "react";
import { buildVideoPlan, shouldPauseOnBackground, shouldReleaseOnExit } from "../../core/media/videoOptimizer";
import { recordVideoBuffer, recordVideoRelease } from "../../core/media/mediaMetrics";
import { useControlSnapshot } from "../../core/control/useControlSnapshot";
import { releaseMediaSlot, tryAcquireMediaSlot } from "../../core/control/mediaLoadLimiter";

type ExtraProps = {
  screen?: string;
  feature_key?: string;
  asset_id?: string;
  sources?: Partial<Record<"low" | "medium" | "high", string>> & { original: string };
  thumbnail_url?: string;
  prefer_low_data?: boolean;
};

export type OptimizedVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & ExtraProps;

let activeVideoEl: HTMLVideoElement | null = null;

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

export function OptimizedVideo(props: OptimizedVideoProps) {
  const snap = useControlSnapshot();
  const {
    sources,
    thumbnail_url,
    prefer_low_data,
    screen,
    feature_key,
    asset_id,
    src,
    poster,
    autoPlay,
    onPlay,
    onPause,
    onWaiting,
    onPlaying,
    onEnded,
    ...rest
  } = props;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const bufferingStartMsRef = React.useRef<number | null>(null);
  const acquiredRef = React.useRef<boolean>(false);
  const [, forceRerender] = React.useState(0);

  const plan = React.useMemo(() => {
    const s = sources || (src ? { original: src } : { original: "" });
    return buildVideoPlan({
      sources: s,
      thumbnail_url: thumbnail_url || poster,
      prefer_low_data: !!prefer_low_data,
    });
  }, [poster, prefer_low_data, sources, src, thumbnail_url]);

  const resolvedSrc = sources ? plan.initial_source_url : src;
  const resolvedPoster = poster || plan.thumbnail_url;

  const effectiveAutoPlay =
    !!autoPlay &&
    plan.allow_autoplay &&
    !snap.global.safe_mode &&
    !snap.media.disable_video_autoplay &&
    !snap.media.disable_video;

  const disableVideo = snap.global.safe_mode || snap.media.disable_video || snap.ux.skeleton_only;

  React.useEffect(() => {
    if (disableVideo) {
      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseMediaSlot();
      }
      return;
    }

    if (!acquiredRef.current) {
      const ok = tryAcquireMediaSlot(snap.media.max_concurrent_media_loads);
      if (!ok) {
        const t = setTimeout(() => forceRerender((x) => x + 1), 450);
        return () => clearTimeout(t);
      }
      acquiredRef.current = true;
    }

    return () => {
      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseMediaSlot();
      }
    };
  }, [disableVideo, snap.media.max_concurrent_media_loads, resolvedSrc]);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleVisibility = () => {
      if (!shouldPauseOnBackground()) return;

      try {
        const doc = (globalThis as any)?.document;
        if (doc && doc.visibilityState === "hidden") {
          el.pause();
        }
      } catch {
        // ignore
      }
    };

    try {
      const doc = (globalThis as any)?.document;
      if (doc && typeof doc.addEventListener === "function") {
        doc.addEventListener("visibilitychange", handleVisibility);
      }
    } catch {
      // ignore
    }

    return () => {
      try {
        const doc = (globalThis as any)?.document;
        if (doc && typeof doc.removeEventListener === "function") {
          doc.removeEventListener("visibilitychange", handleVisibility);
        }
      } catch {
        // ignore
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (!el) return;

      try {
        el.pause();
      } catch {
        // ignore
      }

      if (shouldReleaseOnExit()) {
        try {
          el.removeAttribute("src");
          el.load();
        } catch {
          // ignore
        }

        recordVideoRelease({
          asset_id,
          asset_url: resolvedSrc || undefined,
          screen,
          feature_key,
          quality_level: plan.initial_quality,
          reason: "unmount",
        } as any);
      }

      if (activeVideoEl === el) {
        activeVideoEl = null;
      }

      if (acquiredRef.current) {
        acquiredRef.current = false;
        releaseMediaSlot();
      }
    };
  }, [asset_id, feature_key, plan.initial_quality, resolvedSrc, screen]);

  if (disableVideo) {
    const thumb = resolvedPoster || thumbnail_url;
    if (!thumb) return null;
    return (
      <img
        src={thumb}
        alt={typeof (rest as any)?.title === "string" ? String((rest as any).title) : "video"}
        className={(rest as any)?.className}
        style={(rest as any)?.style}
        width={(rest as any)?.width}
        height={(rest as any)?.height}
        loading="lazy"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={resolvedSrc}
      poster={resolvedPoster}
      autoPlay={effectiveAutoPlay}
      preload={snap.global.safe_mode || snap.media.disable_preloading ? "none" : (rest as any).preload}
      onPlay={(e) => {
        const el = videoRef.current;
        if (el) {
          if (activeVideoEl && activeVideoEl !== el) {
            try {
              activeVideoEl.pause();
            } catch {
              // ignore
            }
          }
          activeVideoEl = el;
        }

        if (typeof onPlay === "function") onPlay(e);
      }}
      onLoadedData={(e) => {
        if (acquiredRef.current) {
          acquiredRef.current = false;
          releaseMediaSlot();
        }
        if (typeof (rest as any)?.onLoadedData === "function") (rest as any).onLoadedData(e);
      }}
      onError={(e) => {
        if (acquiredRef.current) {
          acquiredRef.current = false;
          releaseMediaSlot();
        }
        if (typeof (rest as any)?.onError === "function") (rest as any).onError(e);
      }}
      onPause={(e) => {
        const el = videoRef.current;
        if (el && activeVideoEl === el) {
          activeVideoEl = null;
        }
        if (typeof onPause === "function") onPause(e);
      }}
      onEnded={(e) => {
        const el = videoRef.current;
        if (el && activeVideoEl === el) {
          activeVideoEl = null;
        }
        if (typeof onEnded === "function") onEnded(e);
      }}
      onWaiting={(e) => {
        bufferingStartMsRef.current = safeNowMs();
        if (typeof onWaiting === "function") onWaiting(e);
      }}
      onPlaying={(e) => {
        const started = bufferingStartMsRef.current;
        if (typeof started === "number") {
          const duration = Math.max(0, safeNowMs() - started);
          bufferingStartMsRef.current = null;

          recordVideoBuffer({
            asset_id,
            asset_url: resolvedSrc || undefined,
            screen,
            feature_key,
            duration_ms: duration,
            quality_level: plan.initial_quality,
          } as any);
        }

        if (typeof onPlaying === "function") onPlaying(e);
      }}
      {...rest}
    />
  );
}

/*
Sample usage (do not modify features in this step):

import { OptimizedImage } from "../ui/media/OptimizedImage";
import { OptimizedVideo } from "../ui/media/OptimizedVideo";

<OptimizedImage
  src={wallpaper.image_url}
  alt={wallpaper.title}
  width={360}
  height={480}
  screen="wallpaper_feed"
  feature_key="wallpaper"
/>

<OptimizedVideo
  src={video.url}
  controls
  screen="sparkle"
  feature_key="sparkle"
  poster={video.thumbnail}
/>
*/
