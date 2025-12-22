export interface OfflineCacheEntryMeta {
  endpoint?: string;
  url?: string;
  status?: number;
}

export interface OfflineCacheEntry<T = any> {
  data: T;
  stored_at_ms: number;
  stored_at_iso: string;
  meta?: OfflineCacheEntryMeta;
}

const MEMORY_CACHE = new Map<string, OfflineCacheEntry<any>>();
const STORAGE_PREFIX = "offline_cache:";

function safeNowMs(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function safeNowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

function canUseLocalStorage(): boolean {
  try {
    const ls = (globalThis as any)?.localStorage;
    return !!ls && typeof ls.getItem === "function" && typeof ls.setItem === "function";
  } catch {
    return false;
  }
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function stableUrlParts(url: string): { pathname: string; query: string } {
  try {
    const u = new URL(url);
    const pairs: Array<[string, string]> = [];
    u.searchParams.forEach((value, k) => pairs.push([k, value]));
    pairs.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
    const query = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return { pathname: u.pathname, query };
  } catch {
    const idx = url.indexOf("?");
    if (idx >= 0) return { pathname: url.slice(0, idx), query: url.slice(idx + 1) };
    return { pathname: url, query: "" };
  }
}

export function buildCacheKey(params: { method: string; url: string }): string {
  const method = (params.method || "GET").toUpperCase();
  const { pathname, query } = stableUrlParts(params.url);
  return query ? `${method} ${pathname}?${query}` : `${method} ${pathname}`;
}

export function has(key: string): boolean {
  if (MEMORY_CACHE.has(key)) return true;

  if (!canUseLocalStorage()) return false;
  try {
    const ls = (globalThis as any).localStorage;
    return !!ls.getItem(storageKey(key));
  } catch {
    return false;
  }
}

export function getEntry<T = any>(key: string): OfflineCacheEntry<T> | null {
  const inMem = MEMORY_CACHE.get(key);
  if (inMem) return inMem as OfflineCacheEntry<T>;

  if (!canUseLocalStorage()) return null;

  try {
    const ls = (globalThis as any).localStorage;
    const raw = ls.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineCacheEntry<T>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.stored_at_ms !== "number") return null;
    if (typeof parsed.stored_at_iso !== "string") return null;
    if (!("data" in parsed)) return null;

    MEMORY_CACHE.set(key, parsed as any);
    return parsed;
  } catch {
    return null;
  }
}

export function get<T = any>(key: string): T | null {
  const e = getEntry<T>(key);
  return e ? e.data : null;
}

export function set<T = any>(key: string, data: T, meta?: OfflineCacheEntryMeta): void {
  const entry: OfflineCacheEntry<T> = {
    data,
    stored_at_ms: safeNowMs(),
    stored_at_iso: safeNowIso(),
    meta,
  };

  MEMORY_CACHE.set(key, entry as any);

  if (!canUseLocalStorage()) return;
  try {
    const ls = (globalThis as any).localStorage;
    ls.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function clear(key?: string): void {
  if (typeof key === "string" && key.length > 0) {
    MEMORY_CACHE.delete(key);
    if (canUseLocalStorage()) {
      try {
        const ls = (globalThis as any).localStorage;
        ls.removeItem(storageKey(key));
      } catch {
        // ignore
      }
    }
    return;
  }

  MEMORY_CACHE.clear();

  if (!canUseLocalStorage()) return;
  try {
    const ls = (globalThis as any).localStorage;
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => ls.removeItem(k));
  } catch {
    // ignore
  }
}
