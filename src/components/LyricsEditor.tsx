import React from "react";
import { Minus, Plus, Save } from "lucide-react";
import { userAPI, LyricsBlock } from "@/utils/api/client";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function validateBlocks(blocks: Array<Pick<LyricsBlock, "id" | "start" | "end" | "text" | "index">>) {
  const indexed = blocks.map((b, i) => ({ b, i }));
  const sorted = indexed.slice().sort((a, c) => (Number(a.b.start) || 0) - (Number(c.b.start) || 0));

  const invalid = new Set<number>();
  const reasons: string[] = [];

  let prevStart = -Infinity;
  let prevEnd = -Infinity;
  for (let si = 0; si < sorted.length; si += 1) {
    const { b, i } = sorted[si];
    const start = Number(b.start) || 0;
    const end = Number(b.end) || 0;

    if (!(start > 0)) {
      invalid.add(i);
      reasons.push(`Line ${si + 1}: startTime must be > 0`);
      continue;
    }
    if (!(end > start)) {
      invalid.add(i);
      reasons.push(`Line ${si + 1}: endTime must be > startTime`);
      continue;
    }
    if (!(start > prevStart)) {
      invalid.add(i);
      reasons.push(`Line ${si + 1}: startTime must be strictly increasing`);
      continue;
    }
    if (si > 0 && start < prevEnd) {
      invalid.add(i);
      reasons.push(`Line ${si + 1}: overlaps previous line`);
      continue;
    }

    prevStart = start;
    prevEnd = end;
  }

  return {
    isValid: invalid.size === 0,
    invalidIndices: invalid,
    message: reasons[0] || "",
    sortedBlocks: sorted.map(({ b }) => b),
  };
}

export function LyricsEditor({
  audioId,
  audioUrl,
  editedBy,
}: {
  audioId: string;
  audioUrl: string;
  editedBy?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [blocks, setBlocks] = React.useState<LyricsBlock[]>([]);
  const [duration, setDuration] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await userAPI.getLyrics(audioId);
    setBlocks(res.data || []);
  }, [audioId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const nudge = (idx: number, field: "start" | "end", delta: number) => {
    setBlocks((prev) => {
      const next = prev.slice();
      const b = { ...next[idx] };
      const v = (field === "start" ? b.start : b.end) + delta;
      if (field === "start") {
        b.start = clamp(v, 0, duration || Number.MAX_SAFE_INTEGER);
        if (b.end < b.start) b.end = b.start;
      } else {
        b.end = clamp(v, 0, duration || Number.MAX_SAFE_INTEGER);
        if (b.end < b.start) b.start = b.end;
      }
      next[idx] = b;
      return next;
    });
  };

  const setFromAudio = (idx: number, field: "start" | "end") => {
    const el = audioRef.current;
    if (!el) return;
    const t = Math.max(0, Math.min(duration || el.duration || 0, el.currentTime || 0));
    setBlocks((prev) => {
      const next = prev.slice();
      const b = { ...next[idx] };
      if (field === "start") {
        b.start = t;
        if (!(b.end > b.start)) {
          b.end = clamp(b.start + 0.5, 0, duration || el.duration || Number.MAX_SAFE_INTEGER);
        }
      } else {
        b.end = t;
        if (!(b.end > b.start)) {
          b.end = clamp(b.start + 0.5, 0, duration || el.duration || Number.MAX_SAFE_INTEGER);
        }
      }
      next[idx] = b;
      return next;
    });
  };

  const playFrom = async (t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration || el.duration || 0, t));
    try {
      await el.play();
    } catch {
      // ignore
    }
  };

  const save = async () => {
    const v = validateBlocks(blocks);
    if (!v.isValid) return;
    setSaving(true);
    try {
      const sorted = v.sortedBlocks;
      await userAPI.saveLyricsBlocks(audioId, {
        edited_by: editedBy,
        blocks: sorted.map((b, i) => ({
          index: i,
          start: Number(b.start) || 0,
          end: Number(b.end) || 0,
          text: b.text,
        })),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const validation = React.useMemo(() => validateBlocks(blocks), [blocks]);

  return (
    <div className="bg-white rounded-xl border border-black/10 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="text-gray-900" style={{ fontFamily: "var(--font-english)", fontWeight: 700 }}>
          Lyrics Editor
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !validation.isValid}
          className="px-3 py-2 rounded-lg bg-[#0d5e38] text-white flex items-center gap-2"
          style={{ fontFamily: "var(--font-english)", opacity: saving || !validation.isValid ? 0.6 : 1 }}
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      {!validation.isValid && (
        <div
          className="px-4 pb-4"
          style={{ fontFamily: "var(--font-english)", color: "#7f1d1d" }}
        >
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200">
            Lyrics timings are invalid. Fix in editor to enable Save and Player Sync.
            {validation.message ? ` (${validation.message})` : ""}
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)} controls className="w-full" />
      </div>

      <div className="max-h-[60vh] overflow-y-auto border-t border-black/10">
        {blocks.map((b, i) => (
          <div
            key={b.id}
            className="p-4 border-b border-black/5"
            style={
              validation.invalidIndices.has(i)
                ? {
                    backgroundColor: "rgba(254, 226, 226, 0.55)",
                    borderLeft: "4px solid rgba(239, 68, 68, 0.9)",
                  }
                : undefined
            }
          >
            <div className="text-gray-900" style={{ fontFamily: "var(--font-tamil-bold)", fontSize: 16, lineHeight: 1.25 }}>
              {b.text}
            </div>

            <div className="mt-3 flex items-center gap-2" style={{ fontFamily: "var(--font-english)" }}>
              <button type="button" className="px-3 py-2 rounded-lg bg-gray-100" onClick={() => playFrom(b.start)}>
                Play
              </button>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">Start</div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => setFromAudio(i, "start")}
                >
                  Set Start
                </button>
                <button type="button" className="p-2 rounded-lg bg-gray-100" onClick={() => nudge(i, "start", -0.25)}>
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-sm w-[64px] text-center">{b.start.toFixed(2)}</div>
                <button type="button" className="p-2 rounded-lg bg-gray-100" onClick={() => nudge(i, "start", 0.25)}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">End</div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => setFromAudio(i, "end")}
                >
                  Set End
                </button>
                <button type="button" className="p-2 rounded-lg bg-gray-100" onClick={() => nudge(i, "end", -0.25)}>
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-sm w-[64px] text-center">{b.end.toFixed(2)}</div>
                <button type="button" className="p-2 rounded-lg bg-gray-100" onClick={() => nudge(i, "end", 0.25)}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
