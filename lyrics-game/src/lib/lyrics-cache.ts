import { promises as fs } from "fs";
import path from "path";
import { isWebMode } from "./app-mode.ts";
import { getDatabase } from "./database.ts";
import type { LyricLine } from "./lyrics";

export interface CacheEntry {
  status: "available" | "unavailable";
  title: string;
  primaryArtist: string;
  album: string;
  durationMs: number;
  checkedAt: number;
  /** Only for available songs. Never sent to the browser in Phase 2. */
  lines?: LyricLine[];
}

const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "lyrics-cache.json");

let cache: Map<string, CacheEntry> | null = null;
let loading: Promise<Map<string, CacheEntry>> | null = null;
let writes: Promise<void> = Promise.resolve();

async function load(): Promise<Map<string, CacheEntry>> {
  if (cache) return cache;
  loading ??= (async () => {
    try {
      const raw = await fs.readFile(CACHE_FILE, "utf8");
      cache = new Map(Object.entries(JSON.parse(raw) as Record<string, CacheEntry>));
    } catch (error) {
      // A missing or unreadable cache just means songs get checked again.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("[lyrics-cache] could not read cache, starting empty:", error);
      }
      cache = new Map();
    }
    return cache;
  })();
  return loading;
}

// In the web version: one database entry per song, shared by everyone.
const entryKey = (id: string) => `lyrics:${id}`;

async function getFromDatabase(ids: string[]): Promise<Map<string, CacheEntry>> {
  const found = new Map<string, CacheEntry>();
  try {
    const raws = await getDatabase().getMany(ids.map(entryKey));
    raws.forEach((raw, i) => {
      if (raw !== null) found.set(ids[i], JSON.parse(raw) as CacheEntry);
    });
  } catch (error) {
    // Like an unreadable file: the songs just get checked again.
    console.warn("[lyrics-cache] could not read the database:", error);
  }
  return found;
}

export async function getCacheEntries(ids: string[]): Promise<Map<string, CacheEntry>> {
  if (isWebMode()) return getFromDatabase(ids);
  const all = await load();
  const found = new Map<string, CacheEntry>();
  for (const id of ids) {
    const entry = all.get(id);
    if (entry) found.set(id, entry);
  }
  return found;
}

export async function saveCacheEntries(entries: [string, CacheEntry][]): Promise<void> {
  if (isWebMode()) {
    try {
      await getDatabase().setMany(entries.map(([id, entry]) => [entryKey(id), JSON.stringify(entry)]));
    } catch (error) {
      console.error("[lyrics-cache] could not write to the database:", error);
    }
    return;
  }
  const all = await load();
  for (const [id, entry] of entries) all.set(id, entry);
  // Writes are chained so two batches finishing together can't interleave
  // and corrupt the file.
  writes = writes.then(async () => {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(all)), "utf8");
    } catch (error) {
      console.error("[lyrics-cache] could not write cache:", error);
    }
  });
  await writes;
}
