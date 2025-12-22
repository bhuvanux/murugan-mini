import React from "react";
import { Pause, Play } from "lucide-react";
import { userAPI } from "@/utils/api/client";
import { GreenHeader } from "@/components/GreenHeader";

export type SyncedLyricLine = {
  start: number;
  end: number;
  text: string;
};

type FontSizeMode = "sm" | "md" | "lg";

const FONT_SIZE_KEY = "synced_lyrics_font_size";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function nextFontSize(mode: FontSizeMode): FontSizeMode {
  if (mode === "sm") return "md";
  if (mode === "md") return "lg";
  return "sm";
}

function getFontSizePx(mode: FontSizeMode): number {
  if (mode === "sm") return 20;
  if (mode === "md") return 24;
  return 28;
}

function findActiveIndex(lines: SyncedLyricLine[], t: number): number {
  if (lines.length === 0) return 0;

  // Upper-bound: first index with start > t
  let lo = 0;
  let hi = lines.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (t >= lines[mid].start) lo = mid + 1;
    else hi = mid;
  }

  let idx = Math.max(0, lo - 1);
  const at = lines[idx]?.start ?? 0;
  while (idx > 0 && lines[idx - 1].start === at) idx -= 1;
  const from = Math.max(0, idx - 40);
  const to = Math.min(lines.length - 1, idx + 40);

  // Prefer the earliest line (closest to top) that still contains t.
  let best = idx;
  for (let i = idx; i >= from; i -= 1) {
    if (t >= lines[i].start && t < lines[i].end) best = i;
  }
  if (t >= lines[best].start && t < lines[best].end) return best;

  for (let i = idx + 1; i <= to; i += 1) {
    if (t >= lines[i].start && t < lines[i].end) return i;
  }

  return idx;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function tokensWithWhitespace(text: string): string[] {
  return text.split(/(\s+)/g).filter((t) => t.length > 0);
}

function validateLyricLines(lines: SyncedLyricLine[]) {
  const invalidReasons: string[] = [];
  const sorted = lines
    .map((l) => ({ ...l, start: Number(l.start) || 0, end: Number(l.end) || 0, text: String(l.text || "") }))
    .sort((a, b) => a.start - b.start);

  let prevStart = -Infinity;
  let prevEnd = -Infinity;
  for (let i = 0; i < sorted.length; i += 1) {
    const l = sorted[i];
    const start = Number(l.start) || 0;
    const end = Number(l.end) || 0;

    if (!(start > 0)) {
      invalidReasons.push(`Line ${i + 1}: startTime must be > 0`);
      continue;
    }
    if (!(end > start)) {
      invalidReasons.push(`Line ${i + 1}: endTime must be > startTime`);
      continue;
    }
    if (!(start > prevStart)) {
      invalidReasons.push(`Line ${i + 1}: startTime must be strictly increasing`);
      continue;
    }
    if (i > 0 && start < prevEnd) {
      invalidReasons.push(`Line ${i + 1}: overlaps previous line`);
      continue;
    }

    prevStart = start;
    prevEnd = end;
  }

  return {
    isValid: invalidReasons.length === 0,
    message: invalidReasons[0] || "",
    sorted,
  };
}

type TextSegment = { text: string; isWordLike: boolean };

function chunkGraphemes(text: string, chunkSize: number): TextSegment[] {
  const out: TextSegment[] = [];
  const size = Math.max(1, Math.floor(chunkSize));
  let buf = "";

  const flush = () => {
    if (!buf) return;
    out.push({ text: buf, isWordLike: buf.trim().length > 0 });
    buf = "";
  };

  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) {
      flush();
      out.push({ text: ch, isWordLike: false });
      continue;
    }

    buf += ch;
    if (Array.from(buf).length >= size) {
      flush();
    }
  }

  flush();
  return out;
}

function segmentText(text: string): TextSegment[] {
  if (!text) return [];

  try {
    const Segmenter = (Intl as any)?.Segmenter;
    if (typeof Segmenter === "function") {
      const seg = new Segmenter(undefined, { granularity: "word" });
      const out: TextSegment[] = [];
      for (const part of seg.segment(text)) {
        out.push({
          text: String(part.segment ?? ""),
          isWordLike: Boolean(part.isWordLike) && String(part.segment ?? "").trim().length > 0,
        });
      }

      const wc = out.reduce((acc, p) => (p.isWordLike ? acc + 1 : acc), 0);
      if (wc > 1) return out;
    }
  } catch {
    // ignore
  }

  const wsTokens = tokensWithWhitespace(text).map((t) => ({ text: t, isWordLike: t.trim().length > 0 }));
  const wsCount = wsTokens.reduce((acc, p) => (p.isWordLike ? acc + 1 : acc), 0);
  if (wsCount > 1) return wsTokens;

  return chunkGraphemes(text, 6);
}

export function SyncedLyricsPlayer({
  title,
  audioUrl,
  lyrics,
  onBack,
  analyticsItemId,
  analyticsModuleName = "song",
}: {
  title: string;
  audioUrl: string;
  lyrics: SyncedLyricLine[];
  onBack?: () => void;
  analyticsItemId?: string;
  analyticsModuleName?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const lineRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = React.useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [fontSize, setFontSize] = React.useState<FontSizeMode>("md");

  const track = React.useCallback(
    async (event_type: string, metadata?: Record<string, any>) => {
      if (!analyticsItemId) return;
      try {
        await userAPI.trackAnalyticsEvent({
          module_name: analyticsModuleName,
          item_id: analyticsItemId,
          event_type,
          metadata: {
            title,
            ...metadata,
          },
        });
      } catch {
        // ignore
      }
    },
    [analyticsItemId, analyticsModuleName, title],
  );

  const normalized = React.useMemo(() => {
    if (!lyrics || lyrics.length === 0) return { lines: [] as SyncedLyricLine[], mode: "empty" as const, message: "" };

    const v = validateLyricLines(lyrics);
    if (v.isValid) return { lines: v.sorted, mode: "valid" as const, message: "" };

    return { lines: v.sorted, mode: "invalid" as const, message: v.message || "" };
  }, [lyrics]);

  const canPlay = normalized.mode === "valid";

  React.useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY) as FontSizeMode | null;
    if (saved === "sm" || saved === "md" || saved === "lg") {
      setFontSize(saved);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const tick = React.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    setCurrentTime(el.currentTime || 0);

    if (!el.paused) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, []);

  const ensureTicking = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(tick);
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;

    if (!canPlay) return;

    if (el.paused) {
      try {
        await el.play();
        setIsPlaying(true);
        ensureTicking();
      } catch {
        setIsPlaying(false);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (value: number, opts?: { play?: boolean }) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(duration || el.duration || 0, value));
    el.currentTime = next;
    setCurrentTime(next);
    ensureTicking();

    if (opts?.play && canPlay) {
      try {
        el.play()
          .then(() => {
            setIsPlaying(true);
            ensureTicking();
          })
          .catch(() => {
            // ignore
          });
      } catch {
        // ignore
      }
    }
  };

  const onSeekRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
  };

  const activeIndex = React.useMemo(() => {
    return findActiveIndex(normalized.lines, currentTime);
  }, [normalized.lines, currentTime]);

  const activeWordIndex = React.useMemo(() => {
    const line = normalized.lines[activeIndex];
    if (!line) return 0;
    const segments = segmentText(line.text);
    const wordCount = segments.reduce((acc, p) => (p.isWordLike ? acc + 1 : acc), 0);
    if (wordCount <= 0) return 0;
    const span = Math.max(0.001, (line.end || 0) - (line.start || 0));
    const p = clamp01(((currentTime || 0) - (line.start || 0)) / span);
    return Math.min(wordCount - 1, Math.floor(p * wordCount));
  }, [activeIndex, currentTime, normalized.lines]);

  React.useEffect(() => {
    const container = listRef.current;
    const el = lineRefs.current[activeIndex];
    if (!container || !el) return;

    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      const targetTop = el.offsetTop - container.clientHeight * 0.38;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [activeIndex]);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bodyFontSize = getFontSizePx(fontSize);
  const headerBg = "#084C28";
  const accent = "#FFBF00";

  return (
    <div
      data-synced-lyrics-player="1"
      data-synced-lyrics-player-build="word-highlight-v2"
      data-active-index={String(activeIndex)}
      data-active-word-index={String(activeWordIndex)}
      data-current-time={String(currentTime)}
      data-duration={String(duration)}
      className="min-h-screen"
      style={{ backgroundColor: "#0b6b3a" }}
    >
      <GreenHeader
        title={title}
        onBack={onBack}
        backgroundColor={headerBg}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              const next = nextFontSize(fontSize);
              setFontSize(next);
              localStorage.setItem(FONT_SIZE_KEY, next);
            }}
            className="rounded-full"
            style={{
              backgroundColor: "#FFFFFF",
              color: headerBg,
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 6,
              paddingBottom: 6,
              fontFamily: "var(--font-tamil-bold)",
              fontSize: 14,
              lineHeight: 1.15,
            }}
            aria-label="Toggle font size"
          >
            Aa
          </button>
        }
      />

      <div
        ref={listRef}
        className="px-6 overflow-y-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 96px)", paddingBottom: "calc(240px + env(safe-area-inset-bottom))", backgroundColor: "#0b6b3a" }}
      >
        {!canPlay && (
          <div
            className="mb-4 px-4 py-3 rounded-lg"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)", color: "#FFFFFF", fontFamily: "var(--font-english)" }}
          >
            Lyrics not synced. Please assign timings in editor.
            {normalized.message ? ` (${normalized.message})` : ""}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {normalized.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const segments = segmentText(line.text);
            let wordSeen = -1;
            return (
              <div
                key={`${line.start}-${idx}`}
                data-lyric-line-active={isActive ? "1" : "0"}
                ref={(node) => {
                  lineRefs.current[idx] = node;
                }}
                onClick={() => {
                  track("click", { kind: "lyric_line", index: idx, start: line.start });
                  seekTo(line.start, { play: true });
                }}
                style={{
                  fontFamily: "var(--font-tamil-bold)",
                  fontSize: isActive ? bodyFontSize + 2 : bodyFontSize,
                  lineHeight: 1.25,
                  color: "#FFFFFF",
                  opacity: isActive ? 1 : 0.62,
                  cursor: "pointer",
                  whiteSpace: "pre-wrap",
                  backgroundColor: isActive ? "rgba(255,191,0,0.32)" : undefined,
                  borderRadius: isActive ? 12 : undefined,
                  paddingLeft: isActive ? 10 : undefined,
                  paddingRight: isActive ? 10 : undefined,
                  paddingTop: isActive ? 8 : undefined,
                  paddingBottom: isActive ? 8 : undefined,
                  borderLeft: isActive ? `6px solid ${accent}` : undefined,
                  boxShadow: isActive
                    ? "0 0 0 2px rgba(255,191,0,0.9), 0 10px 24px rgba(0,0,0,0.18)"
                    : undefined,
                  transition:
                    "color 120ms linear, font-size 120ms linear, opacity 120ms linear, background-color 120ms linear, box-shadow 120ms linear",
                }}
              >
                {segments.map((seg, i) => {
                  if (seg.isWordLike) wordSeen += 1;
                  const isActiveWord = isActive && seg.isWordLike && wordSeen === activeWordIndex;
                  return (
                    <span
                      key={i}
                      data-lyric-seg={seg.isWordLike ? "word" : "sep"}
                      data-active-word={isActiveWord ? "1" : "0"}
                      style={
                        isActiveWord
                          ? {
                              fontFamily: "var(--font-tamil-bold)",
                              backgroundColor: accent,
                              color: headerBg,
                              borderRadius: 8,
                              paddingLeft: 6,
                              paddingRight: 6,
                              paddingTop: 2,
                              paddingBottom: 2,
                              display: "inline-block",
                              lineHeight: 1.25,
                              boxShadow: "0 0 0 2px rgba(255,255,255,0.65)",
                            }
                          : { fontFamily: "var(--font-tamil-bold)" }
                      }
                    >
                      {seg.text}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="fixed left-0 right-0 z-40"
        style={{ bottom: 0, backgroundColor: "transparent", padding: 0 }}
      >
        <div
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(13,94,56,0.92) 0%, rgba(8,76,40,0.98) 60%, rgba(6,45,24,1) 100%)",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            boxShadow: "0 -12px 30px rgba(0,0,0,0.18)",
            padding: "14px 16px calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex items-center justify-between" style={{ color: "#FFFFFF" }}>
            <div style={{ fontFamily: "var(--font-english)", fontSize: 14, lineHeight: 1.15, opacity: 0.95 }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontFamily: "var(--font-english)", fontSize: 14, lineHeight: 1.15, opacity: 0.95 }}>
              {formatTime(duration)}
            </div>
          </div>

          <div className="mt-2" style={{ position: "relative" }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.28)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={onSeekRange}
              disabled={duration === 0}
              className="absolute inset-0 w-full h-full opacity-0"
              aria-label="Seek"
            />
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full"
              style={{
                width: 68,
                height: 68,
                backgroundColor: accent,
                color: headerBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: duration === 0 || !canPlay ? 0.55 : 1,
                boxShadow: "0 10px 22px rgba(0,0,0,0.28)",
              }}
              aria-disabled={!canPlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
            </button>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
          onTimeUpdate={(e) => {
            const t = (e.target as HTMLAudioElement).currentTime || 0;
            setCurrentTime(t);
          }}
          onSeeked={(e) => {
            const t = (e.target as HTMLAudioElement).currentTime || 0;
            setCurrentTime(t);
          }}
          onPlay={() => {
            setIsPlaying(true);
            ensureTicking();
            track("play", { kind: "audio" });
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            track("watch_complete", { kind: "audio" });
          }}
        />
      </div>
    </div>
  );
}
