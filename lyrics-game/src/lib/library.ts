import { promises as fs } from "fs";
import path from "path";
import { playedTrackIds } from "./games";
import type { Language } from "./language";
import { getCachedInfo, type LyricsStatus } from "./lyrics";
import { getUserId } from "./session";
import { listSources, listTracks, SpotifyApiError, type Source, type Track } from "./spotify";

/**
 * Your playlist list and each playlist's songs are kept on disk and reused
 * for this long, even across restarts. Loading the whole library takes ~60
 * Spotify requests, and Spotify blocked the app for 22 hours after too many
 * (2026-10-04). "Refresh from Spotify" reloads sooner.
 */
const FRESH_MS = 6 * 60 * 60_000;
const CACHE_FILE = path.join(process.cwd(), ".data", "library-cache.json");

interface Stored {
  /** When it was loaded from Spotify (epoch ms); 0 once refreshed by you. */
  at: number;
  data: unknown;
}

/** Per Spotify user id: "sources", and "tracks:<list id>" for each list. */
type LibraryCache = Record<string, Record<string, Stored>>;

let cache: LibraryCache | null = null;
let writes: Promise<void> = Promise.resolve();
const loading = new Map<string, Promise<unknown>>();

async function readCache(): Promise<LibraryCache> {
  if (!cache) {
    try {
      cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8")) as LibraryCache;
    } catch (error) {
      // Only a copy: missing or unreadable just means loading from Spotify.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("[library] couldn't read the saved library, starting fresh", error);
      }
      cache = {};
    }
  }
  return cache;
}

function writeCache(): Promise<void> {
  writes = writes.then(async () => {
    try {
      await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
      await fs.writeFile(`${CACHE_FILE}.tmp`, JSON.stringify(cache), "utf8");
      await fs.rename(`${CACHE_FILE}.tmp`, CACHE_FILE);
    } catch (error) {
      console.error("[library] couldn't save the library copy", error);
    }
  });
  return writes;
}

export interface FromSpotify<T> {
  data: T;
  /** When it was loaded from Spotify (epoch ms). */
  updatedAt: number;
  /** Set when Spotify refused and an older copy was used instead: when it may be asked again. */
  blockedUntil?: number;
}

/**
 * The saved copy if it's recent enough, else a fresh load from Spotify
 * (shared by requests made at the same time). If Spotify refuses for too
 * many requests, an older copy is better than nothing.
 */
async function fromSpotify<T>(
  slot: string,
  load: () => Promise<T>,
  force = false
): Promise<FromSpotify<T>> {
  const userId = await getUserId();
  const all = await readCache();
  const saved = all[userId]?.[slot];
  if (saved && !force && Date.now() - saved.at < FRESH_MS) {
    return { data: saved.data as T, updatedAt: saved.at };
  }

  const key = `${userId}|${slot}`;
  let pending = loading.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = load().finally(() => loading.delete(key));
    loading.set(key, pending);
  }
  try {
    const data = await pending;
    const updatedAt = Date.now();
    all[userId] = { ...all[userId], [slot]: { at: updatedAt, data } };
    await writeCache();
    return { data, updatedAt };
  } catch (error) {
    if (saved && error instanceof SpotifyApiError && error.rateLimited) {
      return { data: saved.data as T, updatedAt: saved.at, blockedUntil: error.retryAt };
    }
    throw error;
  }
}

/** Liked Songs and the playlists you own. `refresh` reloads them from Spotify now. */
export function getSources(accessToken: string, refresh = false) {
  return fromSpotify<Source[]>("sources", () => listSources(accessToken), refresh);
}

/** One list's songs. */
export function getTracks(accessToken: string, sourceId: string) {
  return fromSpotify<Track[]>(`tracks:${sourceId}`, () => listTracks(accessToken, sourceId));
}

/**
 * After "Refresh from Spotify": every list's songs reload the next time
 * they're opened or searched. The old copies stay for when Spotify refuses.
 */
export async function markListsOutdated(): Promise<void> {
  const mine = (await readCache())[await getUserId()];
  if (!mine) return;
  for (const [slot, stored] of Object.entries(mine)) {
    if (slot.startsWith("tracks:")) stored.at = 0;
  }
  await writeCache();
}

/** A song as the library shows it: with what the filters need. */
export type LibraryTrack = Track & {
  lyricsStatus: LyricsStatus;
  language: Language | null;
  /** Finished at least once (from your saved games). */
  played: boolean;
};

/**
 * Adds each song's cached lyrics status and language, and whether you've
 * played it. Your games failing to load only leaves "played" empty: it's
 * no reason to hide your library.
 */
export async function describeTracks(tracks: Track[]): Promise<LibraryTrack[]> {
  const userId = await getUserId();
  const [info, played] = await Promise.all([
    getCachedInfo(tracks.map((t) => t.id)),
    playedTrackIds(userId).catch((error) => {
      console.error("[library] couldn't read your games", error);
      return new Set<string>();
    }),
  ]);
  return tracks.map((t) => ({
    ...t,
    lyricsStatus: info[t.id].status,
    language: info[t.id].language,
    played: played.has(t.id),
  }));
}
