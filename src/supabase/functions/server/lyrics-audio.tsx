import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { uploadFile, getPublicUrl } from "./storage-init.tsx";
import * as kv from "./kv_store.tsx";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

const STATUS_KEY = (audioId: string) => `audio:status:${audioId}`;

function generateFilename(originalName: string, prefix: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const ext = originalName.split(".").pop();
  return `${prefix}/${timestamp}-${random}.${ext}`;
}

type LyricBlockInput = {
  index: number;
  start: number;
  end: number;
  text: string;
};

function validateAndNormalizeBlocks(blocks: LyricBlockInput[]) {
  const sorted = blocks
    .slice()
    .map((b) => ({
      index: Number(b.index) || 0,
      start: Number(b.start) || 0,
      end: Number(b.end) || 0,
      text: String(b.text || ""),
    }))
    .sort((a, b) => a.start - b.start);

  let prevStart = -Infinity;
  let prevEnd = -Infinity;

  for (let i = 0; i < sorted.length; i += 1) {
    const b = sorted[i];
    const start = Number(b.start) || 0;
    const end = Number(b.end) || 0;
    if (!(start > 0)) return { isValid: false as const, message: `Line ${i + 1}: startTime must be > 0`, sorted };
    if (!(end > start)) return { isValid: false as const, message: `Line ${i + 1}: endTime must be > startTime`, sorted };
    if (!(start > prevStart)) return { isValid: false as const, message: `Line ${i + 1}: startTime must be strictly increasing`, sorted };
    if (i > 0 && start < prevEnd) return { isValid: false as const, message: `Line ${i + 1}: overlaps previous line`, sorted };
    prevStart = start;
    prevEnd = end;
  }

  return { isValid: true as const, message: "", sorted };
}

function normalizeTamil(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ab = bigrams(a);
  const bb = bigrams(b);
  if (ab.length === 0 || bb.length === 0) return 0;
  const map = new Map<string, number>();
  for (const x of ab) map.set(x, (map.get(x) || 0) + 1);
  let matches = 0;
  for (const x of bb) {
    const c = map.get(x) || 0;
    if (c > 0) {
      matches += 1;
      map.set(x, c - 1);
    }
  }
  return (2 * matches) / (ab.length + bb.length);
}

async function setStatus(audioId: string, status: any) {
  await kv.set(STATUS_KEY(audioId), status);
}

export async function getAudioStatus(c: Context) {
  try {
    const audioId = c.req.param("id");
    const status = await kv.get(STATUS_KEY(audioId));
    return c.json({ success: true, status: status || { state: "idle" } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

export async function uploadAudio(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const uploadedBy = (formData.get("uploaded_by") as string) || null;

    if (!file || !title) {
      return c.json({ error: "file and title are required" }, 400);
    }

    const filename = generateFilename(file.name, "audios");
    const uploadResult = await uploadFile("media", filename, file, {
      contentType: file.type || "audio/mpeg",
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const url = getPublicUrl("media", filename);

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("audios")
      .insert({
        title,
        filename,
        url,
        duration_seconds: null,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await setStatus(data.id, { state: "uploaded", progress: 5, updated_at: new Date().toISOString() });

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function importAudioFromUrl(c: Context) {
  try {
    const body = await c.req.json();
    const url = (body?.url || "").toString();
    const title = (body?.title || "").toString();
    const uploadedBy = body?.uploaded_by ? String(body.uploaded_by) : null;

    if (!url || !title) {
      return c.json({ error: "url and title are required" }, 400);
    }

    const res = await fetch(url);
    if (!res.ok) {
      return c.json({ error: `failed to download audio (${res.status})` }, 400);
    }

    const contentType = res.headers.get("content-type") || "audio/mpeg";
    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType });

    const filename = generateFilename("import.mp3", "audios");
    const uploadResult = await uploadFile("media", filename, blob, {
      contentType,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const storedUrl = getPublicUrl("media", filename);

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("audios")
      .insert({
        title,
        filename,
        url: storedUrl,
        duration_seconds: null,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await setStatus(data.id, { state: "uploaded", progress: 5, updated_at: new Date().toISOString() });

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function getAudio(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();
    const { data, error } = await supabase.from("audios").select("*").eq("id", id).single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function getLyrics(c: Context) {
  try {
    const audioId = c.req.param("id");
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("lyrics_blocks")
      .select("*")
      .eq("audio_id", audioId)
      .order("index", { ascending: true });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function ingestLyricsFromText(c: Context) {
  try {
    const audioId = c.req.param("id");
    const body = await c.req.json();
    const text = (body?.text || "").toString();
    const editedBy = body?.edited_by ? String(body.edited_by) : null;

    const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return c.json({ error: "no lyrics lines provided" }, 400);
    }

    const supabase = supabaseClient();
    await supabase.from("lyrics_blocks").delete().eq("audio_id", audioId);

    const payload = lines.map((t: string, idx: number) => ({
      audio_id: audioId,
      index: idx,
      start: 0,
      end: 0,
      text: t,
      edited_by: editedBy,
    }));

    const { error } = await supabase.from("lyrics_blocks").insert(payload);
    if (error) return c.json({ error: error.message }, 500);

    await setStatus(audioId, { state: "lyrics_ingested", progress: 15, updated_at: new Date().toISOString() });

    return c.json({ success: true, count: payload.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function saveLyricsBlocks(c: Context) {
  try {
    const audioId = c.req.param("id");
    const body = await c.req.json();
    const blocks = (body?.blocks || []) as LyricBlockInput[];
    const editedBy = body?.edited_by ? String(body.edited_by) : null;

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return c.json({ error: "blocks is required" }, 400);
    }

    const v = validateAndNormalizeBlocks(blocks);
    if (!v.isValid) {
      return c.json({ error: `invalid lyrics timings: ${v.message}` }, 400);
    }

    const supabase = supabaseClient();
    await supabase.from("lyrics_blocks").delete().eq("audio_id", audioId);

    const payload = v.sorted.map((b, i) => ({
        audio_id: audioId,
        index: i,
        start: Number(b.start) || 0,
        end: Number(b.end) || 0,
        text: String(b.text || ""),
        edited_by: editedBy,
      }));

    const { error } = await supabase.from("lyrics_blocks").insert(payload);
    if (error) return c.json({ error: error.message }, 500);

    await setStatus(audioId, { state: "ready", progress: 100, updated_at: new Date().toISOString() });

    return c.json({ success: true, count: payload.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

type WhisperSegment = { start: number; end: number; text: string };

async function transcribeWithWhisper(audioUrl: string): Promise<WhisperSegment[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return [];

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) return [];

  const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
  const file = new File([audioBytes], "audio.mp3", { type: audioRes.headers.get("content-type") || "audio/mpeg" });

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const segments = Array.isArray(data?.segments) ? data.segments : [];
  return segments
    .map((s: any) => ({
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      text: String(s.text || ""),
    }))
    .filter((s: WhisperSegment) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start);
}

function alignLyricsToSegments(lyrics: string[], segments: WhisperSegment[]): Array<{ start: number; end: number }> {
  if (lyrics.length === 0) return [];
  if (segments.length === 0) {
    const out: Array<{ start: number; end: number }> = [];
    let t = 0;
    for (let i = 0; i < lyrics.length; i += 1) {
      const dur = Math.max(2.5, Math.min(8, lyrics[i].length / 12));
      out.push({ start: t, end: t + dur });
      t += dur;
    }
    return out;
  }

  const segNorm = segments.map((s) => normalizeTamil(s.text));
  const out: Array<{ start: number; end: number }> = [];

  let segCursor = 0;
  for (let i = 0; i < lyrics.length; i += 1) {
    const target = normalizeTamil(lyrics[i]);

    let bestIdx = segCursor;
    let bestScore = 0;
    const startSearch = segCursor;
    const endSearch = Math.min(segments.length - 1, segCursor + 25);

    for (let j = startSearch; j <= endSearch; j += 1) {
      const score = diceCoefficient(target, segNorm[j]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }

    if (bestScore < 0.12) {
      const prev = out[out.length - 1];
      const start = prev ? prev.end : segments[0].start;
      const end = Math.max(start + 2.5, Math.min(start + 6, segments[segments.length - 1].end));
      out.push({ start, end });
      continue;
    }

    const start = segments[bestIdx].start;
    const end = Math.max(start + 0.2, segments[bestIdx].end);
    out.push({ start, end });
    segCursor = Math.min(segments.length - 1, bestIdx + 1);
  }

  for (let i = 0; i < out.length - 1; i += 1) {
    if (out[i].end > out[i + 1].start) {
      out[i].end = Math.max(out[i].start, out[i + 1].start - 0.05);
    }
  }

  return out;
}

export async function processAudio(c: Context) {
  try {
    const audioId = c.req.param("id");
    const supabase = supabaseClient();

    await setStatus(audioId, { state: "processing", progress: 20, updated_at: new Date().toISOString() });

    const { data: audio, error: audioErr } = await supabase.from("audios").select("*").eq("id", audioId).single();
    if (audioErr) return c.json({ error: audioErr.message }, 500);

    const { data: blocks, error: blocksErr } = await supabase
      .from("lyrics_blocks")
      .select("*")
      .eq("audio_id", audioId)
      .order("index", { ascending: true });

    if (blocksErr) return c.json({ error: blocksErr.message }, 500);

    const lines = (blocks || []).map((b: any) => String(b.text || ""));
    if (lines.length === 0) {
      return c.json({ error: "lyrics_blocks not found; ingest lyrics first" }, 400);
    }

    await setStatus(audioId, { state: "transcribing", progress: 35, updated_at: new Date().toISOString() });

    const segments = await transcribeWithWhisper(audio.url);

    await setStatus(audioId, { state: "aligning", progress: segments.length ? 70 : 55, updated_at: new Date().toISOString(), segments: segments.length });

    const aligned = alignLyricsToSegments(lines, segments);

    const payload = lines.map((text: string, idx: number) => ({
      audio_id: audioId,
      index: idx,
      start: Number(aligned[idx]?.start) || 0,
      end: Number(aligned[idx]?.end) || 0,
      text,
      edited_by: null,
    }));

    await supabase.from("lyrics_blocks").delete().eq("audio_id", audioId);
    const { error: insertErr } = await supabase.from("lyrics_blocks").insert(payload);
    if (insertErr) return c.json({ error: insertErr.message }, 500);

    await setStatus(audioId, { state: "ready", progress: 100, updated_at: new Date().toISOString(), segments: segments.length });

    return c.json({ success: true, audio_id: audioId, segments: segments.length });
  } catch (error: any) {
    try {
      const audioId = c.req.param("id");
      await setStatus(audioId, { state: "failed", progress: 0, error: error.message, updated_at: new Date().toISOString() });
    } catch {
      // ignore
    }
    return c.json({ error: error.message }, 500);
  }
}
