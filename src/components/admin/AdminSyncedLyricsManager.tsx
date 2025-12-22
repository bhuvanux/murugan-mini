import React from "react";
import { userAPI } from "@/utils/api/client";
import { SyncedLyricsPlayer } from "@/components/SyncedLyricsPlayer";
import { LyricsEditor } from "@/components/LyricsEditor";

const DEFAULT_IMPORT_URL = "https://koneswaram.com/upload/music/mp3s/2/Kantha_Sasdi_Kavasam.mp3";

function validateLyricsTimings(lines: Array<{ start: number; end: number; text: string }>) {
  const sorted = lines
    .map((l) => ({ ...l, start: Number(l.start) || 0, end: Number(l.end) || 0, text: String(l.text || "") }))
    .sort((a, b) => a.start - b.start);

  let prevStart = -Infinity;
  let prevEnd = -Infinity;
  for (let i = 0; i < sorted.length; i += 1) {
    const l = sorted[i];
    const start = Number(l.start) || 0;
    const end = Number(l.end) || 0;

    if (!(start > 0)) return { isValid: false, message: `Line ${i + 1}: startTime must be > 0`, sorted };
    if (!(end > start)) return { isValid: false, message: `Line ${i + 1}: endTime must be > startTime`, sorted };
    if (!(start > prevStart)) return { isValid: false, message: `Line ${i + 1}: startTime must be strictly increasing`, sorted };
    if (i > 0 && start < prevEnd) return { isValid: false, message: `Line ${i + 1}: overlaps previous line`, sorted };

    prevStart = start;
    prevEnd = end;
  }

  return { isValid: true, message: "", sorted };
}

export function AdminSyncedLyricsManager() {
  const [title, setTitle] = React.useState("கந்த சஷ்டி கவசம்");
  const [importUrl, setImportUrl] = React.useState(DEFAULT_IMPORT_URL);
  const [audioId, setAudioId] = React.useState<string | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [lyricsText, setLyricsText] = React.useState("");
  const [status, setStatus] = React.useState<any>(null);
  const [lyrics, setLyrics] = React.useState<Array<{ start: number; end: number; text: string }>>([]);
  const [analyticsStats, setAnalyticsStats] = React.useState<any>(null);
  const [mode, setMode] = React.useState<"setup" | "player" | "editor">("setup");
  const [importing, setImporting] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [ingesting, setIngesting] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const savedAudioId = localStorage.getItem("syncedLyrics.audioId");
      const savedAudioUrl = localStorage.getItem("syncedLyrics.audioUrl");
      if (savedAudioId) setAudioId(savedAudioId);
      if (savedAudioUrl) setAudioUrl(savedAudioUrl);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      if (audioId) localStorage.setItem("syncedLyrics.audioId", audioId);
      else localStorage.removeItem("syncedLyrics.audioId");
      if (audioUrl) localStorage.setItem("syncedLyrics.audioUrl", audioUrl);
      else localStorage.removeItem("syncedLyrics.audioUrl");
    } catch {
      // ignore
    }
  }, [audioId, audioUrl]);

  const refresh = React.useCallback(async () => {
    if (!audioId) return;
    setRefreshing(true);
    setError(null);
    try {
      const s = await userAPI.getAudioStatus(audioId);
      setStatus(s.status);
      const l = await userAPI.getLyrics(audioId);
      const raw = (l.data || []).map((b) => ({ start: b.start, end: b.end, text: b.text }));
      setLyrics(validateLyricsTimings(raw).sorted);
      const a = await userAPI.getAudio(audioId);
      setAudioUrl(a.data.url);

      try {
        const statsRes = await userAPI.getAnalyticsItemStats("song", audioId);
        setAnalyticsStats(statsRes?.stats || null);
      } catch {
        setAnalyticsStats(null);
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [audioId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const importMp3 = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await userAPI.importAudioFromUrl({ url: importUrl, title });
      setAudioId(res.data.id);
      setAudioUrl(res.data.url);
      setMode("setup");
      setStatus(null);
      setLyrics([]);
      await new Promise((r) => setTimeout(r, 100));
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const ingestLyrics = async () => {
    if (!audioId) return;
    setIngesting(true);
    setError(null);
    try {
      await userAPI.ingestLyricsFromText(audioId, { text: lyricsText, edited_by: "admin" });
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Ingest failed");
    } finally {
      setIngesting(false);
    }
  };

  const process = async () => {
    if (!audioId) return;
    setProcessing(true);
    setError(null);
    try {
      await userAPI.processAudio(audioId);
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Process failed");
    } finally {
      setProcessing(false);
    }
  };

  const lyricsValidation = React.useMemo(() => validateLyricsTimings(lyrics), [lyrics]);
  const canPlay = !!audioUrl && lyrics.length > 0 && lyricsValidation.isValid;
  const canIngest = !!audioId && lyricsText.trim().length > 0 && !ingesting;
  const canProcess = !!audioId && !processing;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="text-2xl" style={{ fontFamily: "var(--font-english)", fontWeight: 800 }}>
          Synced Lyrics Audio
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("setup")}
            className="px-3 py-2 rounded-lg bg-gray-100"
            style={{ fontFamily: "var(--font-english)" }}
          >
            Setup
          </button>
          <button
            type="button"
            onClick={() => setMode("editor")}
            disabled={!audioId || !audioUrl}
            className="px-3 py-2 rounded-lg bg-gray-100"
            style={{ fontFamily: "var(--font-english)", opacity: !audioId ? 0.5 : 1 }}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMode("player")}
            disabled={!canPlay}
            className="px-3 py-2 rounded-lg bg-gray-100"
            style={{ fontFamily: "var(--font-english)", opacity: !canPlay ? 0.5 : 1 }}
          >
            Player
          </button>
        </div>
      </div>

      {mode === "setup" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-black/10 p-4">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700" style={{ fontFamily: "var(--font-english)" }}>
                {error}
              </div>
            )}

            {!!audioUrl && lyrics.length > 0 && !lyricsValidation.isValid && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900" style={{ fontFamily: "var(--font-english)" }}>
                Lyrics not synced. Please assign timings in Editor. ({lyricsValidation.message})
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600" style={{ fontFamily: "var(--font-english)" }}>
                  Title
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  style={{ fontFamily: "var(--font-english)" }}
                />
              </div>
              <div>
                <div className="text-sm text-gray-600" style={{ fontFamily: "var(--font-english)" }}>
                  Import URL
                </div>
                <input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  style={{ fontFamily: "var(--font-english)" }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={importMp3}
                disabled={importing}
                className="px-4 py-2 rounded-lg bg-[#0d5e38] text-white"
                style={{ fontFamily: "var(--font-english)", opacity: importing ? 0.6 : 1 }}
              >
                {importing ? "Importing..." : "Import MP3 into DB"}
              </button>
              <button
                type="button"
                onClick={refresh}
                disabled={!audioId || refreshing}
                className="px-4 py-2 rounded-lg bg-gray-100"
                style={{ fontFamily: "var(--font-english)", opacity: !audioId || refreshing ? 0.5 : 1 }}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {audioId && (
              <div className="mt-4 text-sm" style={{ fontFamily: "var(--font-english)" }}>
                <div>
                  <span className="text-gray-600">audio_id:</span> <span className="font-semibold">{audioId}</span>
                </div>
                <div className="mt-1">
                  <span className="text-gray-600">status:</span> <span className="font-semibold">{status?.state || "unknown"}</span>
                </div>
                {analyticsStats && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="px-3 py-2 rounded-lg bg-gray-50 border border-black/5">
                      <div className="text-xs text-gray-500">Unique Plays</div>
                      <div className="text-lg font-semibold">{Number(analyticsStats.play || 0)}</div>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-gray-50 border border-black/5">
                      <div className="text-xs text-gray-500">Unique Clicks</div>
                      <div className="text-lg font-semibold">{Number(analyticsStats.click || 0)}</div>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-gray-50 border border-black/5">
                      <div className="text-xs text-gray-500">Unique Completed</div>
                      <div className="text-lg font-semibold">{Number(analyticsStats.watch_complete || 0)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!audioId && (
              <div className="mt-4 text-sm text-gray-600" style={{ fontFamily: "var(--font-english)" }}>
                Import the MP3 first to generate an <span className="font-semibold">audio_id</span>. Then you can ingest lyrics and process.
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-black/10 p-4">
            <div className="text-sm text-gray-600" style={{ fontFamily: "var(--font-english)" }}>
              Lyrics (Tamil)
            </div>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              className="w-full mt-2 p-3 border rounded-lg min-h-[240px]"
              style={{ fontFamily: "var(--font-tamil-bold)" }}
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={ingestLyrics}
                disabled={!canIngest}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white"
                style={{ fontFamily: "var(--font-english)", opacity: canIngest ? 1 : 0.5 }}
              >
                {ingesting ? "Ingesting..." : "Ingest Lyrics"}
              </button>
              <button
                type="button"
                onClick={process}
                disabled={!canProcess}
                className="px-4 py-2 rounded-lg bg-[#FFC107] text-black"
                style={{ fontFamily: "var(--font-english)", opacity: canProcess ? 1 : 0.5 }}
              >
                {processing ? "Processing..." : "Process (Whisper + Align)"}
              </button>
            </div>

            {!audioId && (
              <div className="mt-2 text-xs text-gray-500" style={{ fontFamily: "var(--font-english)" }}>
                Ingest/Process are disabled until you import an audio and get an audio_id.
              </div>
            )}

            {!!audioId && lyricsText.trim().length === 0 && (
              <div className="mt-2 text-xs text-gray-500" style={{ fontFamily: "var(--font-english)" }}>
                Paste lyrics above to enable Ingest Lyrics.
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500" style={{ fontFamily: "var(--font-english)" }}>
              Processing requires OPENAI_API_KEY set in Supabase Edge Function secrets. Otherwise timings will be rough and you must edit.
            </div>
          </div>
        </div>
      )}

      {mode === "editor" && audioId && audioUrl && (
        <LyricsEditor audioId={audioId} audioUrl={audioUrl} editedBy="admin" />
      )}

      {mode === "player" && canPlay && audioUrl && (
        <div className="rounded-xl overflow-hidden border border-black/10">
          <SyncedLyricsPlayer title={title} audioUrl={audioUrl} lyrics={lyrics} />
        </div>
      )}
    </div>
  );
}
