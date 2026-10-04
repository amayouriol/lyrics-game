import { getCacheEntries as getAllCacheEntries, saveCacheEntries, type CacheEntry } from "./lyrics-cache";

const LRCLIB_GET_URL = "https://lrclib.net/api/get";
const LRCLIB_SEARCH_URL = "https://lrclib.net/api/search";
const USER_AGENT = "LyricsGame/0.1 (personal project)";
const TIMEOUT_MS = 8_000;
/** Max seconds between Spotify's duration and the lyrics' duration. */
const DURATION_TOLERANCE_S = 2;
const MAX_PARALLEL_LOOKUPS = 3;
const SERVER_ERROR_ATTEMPTS = 2;
const SERVER_ERROR_RETRY_MS = 1_000;
/**
 * Songs marked unavailable before LRCLIB's other versions were searched
 * (2026-10-04) are checked once more, e.g. "Sacrifice" was rejected for a
 * compilation 2.2 s longer while a 305 s version existed.
 */
const RECHECK_UNAVAILABLE_BEFORE = Date.parse("2026-10-04T21:25:00Z");

/** Cached results still worth trusting. */
async function getCacheEntries(ids: string[]): Promise<Map<string, CacheEntry>> {
  const entries = await getAllCacheEntries(ids);
  for (const [id, entry] of entries) {
    if (entry.status === "unavailable" && entry.checkedAt < RECHECK_UNAVAILABLE_BEFORE) {
      entries.delete(id);
    }
  }
  return entries;
}

export type LyricsStatus = "available" | "unavailable" | "unknown";

/** What a lookup needs to know about a song. */
export interface LyricsLookup {
  id: string;
  title: string;
  primaryArtist: string;
  album: string;
  durationMs: number;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

interface LrclibRecord {
  duration: number;
  instrumental: boolean;
  syncedLyrics: string | null;
}

type FetchOutcome =
  | { kind: "found"; record: LrclibRecord }
  | { kind: "not_found" }
  | { kind: "rate_limited" }
  | { kind: "error" };

type LookupResult =
  | { status: "available"; lines: LyricLine[] }
  | { status: "unavailable" }
  | { status: "unknown"; rateLimited: boolean };

type LrclibResponse<T> =
  | { kind: "found"; body: T }
  | { kind: "not_found" }
  | { kind: "rate_limited" }
  | { kind: "error" };

/** One LRCLIB request, retrying its occasional 503s once. */
async function requestLrclib<T>(url: string, label: string): Promise<LrclibResponse<T>> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404) return { kind: "not_found" };
      if (res.status === 429) {
        console.warn(`[lrclib] rate limited (retry-after ${res.headers.get("retry-after")})`);
        return { kind: "rate_limited" };
      }
      if (res.ok) return { kind: "found", body: (await res.json()) as T };

      console.warn(`[lrclib] ${res.status} for "${label}" (attempt ${attempt})`);
      // LRCLIB returns occasional 503s that succeed moments later.
      if (res.status >= 500 && attempt < SERVER_ERROR_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, SERVER_ERROR_RETRY_MS));
        continue;
      }
      return { kind: "error" };
    } catch (error) {
      console.warn(`[lrclib] request failed for "${label}":`, error);
      return { kind: "error" };
    }
  }
}

/** LRCLIB's best match for a song: one record, by title, artist, album and length. */
async function fetchLrclib(
  track: LyricsLookup,
  title: string,
  album: string | null
): Promise<FetchOutcome> {
  const params = new URLSearchParams({
    artist_name: track.primaryArtist,
    track_name: title,
    duration: String(Math.round(track.durationMs / 1000)),
  });
  if (album) params.set("album_name", album);
  const r = await requestLrclib<LrclibRecord>(`${LRCLIB_GET_URL}?${params}`, title);
  return r.kind === "found" ? { kind: "found", record: r.body } : r;
}

/**
 * Every version LRCLIB has of a song (other albums, compilations), for when
 * its best match is a different length or has no timing. Picks the timed
 * version closest in length to Spotify's, if one is close enough.
 */
async function searchLrclib(track: LyricsLookup): Promise<FetchOutcome> {
  const params = new URLSearchParams({
    artist_name: track.primaryArtist,
    track_name: cleanTitle(track.title),
  });
  const r = await requestLrclib<LrclibRecord[]>(`${LRCLIB_SEARCH_URL}?${params}`, track.title);
  if (r.kind !== "found") return r;
  const seconds = track.durationMs / 1000;
  const best = r.body
    .filter((rec) => !rec.instrumental && rec.syncedLyrics?.trim())
    .filter((rec) => Math.abs(rec.duration - seconds) <= DURATION_TOLERANCE_S)
    .sort((x, y) => Math.abs(x.duration - seconds) - Math.abs(y.duration - seconds))[0];
  return best ? { kind: "found", record: best } : { kind: "not_found" };
}

/** Strips Spotify title suffixes that LRCLIB often doesn't have. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*[([](?:feat\.?|ft\.?|with)\s[^)\]]*[)\]]/gi, "")
    .replace(/\s*[([][^)\]]*remaster[^)\]]*[)\]]/gi, "")
    .replace(/\s+-\s+[^-]*remaster.*$/i, "")
    .trim();
}

const TIMESTAMP = /\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** Parses LRC text (`[mm:ss.xx] line`) into timed lines, skipping empty ones. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(TIMESTAMP)];
    if (stamps.length === 0) continue;
    const text = raw.replace(TIMESTAMP, "").trim();
    if (!text) continue;
    // A repeated chorus can be written once with several timestamps.
    for (const [, min, sec, frac] of stamps) {
      const ms = frac ? Number(frac.padEnd(3, "0")) : 0;
      lines.push({ timeMs: Number(min) * 60_000 + Number(sec) * 1_000 + ms, text });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

function classify(record: LrclibRecord, track: LyricsLookup): LookupResult {
  if (record.instrumental || !record.syncedLyrics?.trim()) return { status: "unavailable" };
  // Wrong-version protection: lyrics for a live cut or radio edit would play out of sync.
  if (Math.abs(record.duration - track.durationMs / 1000) > DURATION_TOLERANCE_S) {
    return { status: "unavailable" };
  }
  const lines = parseLrc(record.syncedLyrics);
  return lines.length > 0 ? { status: "available", lines } : { status: "unavailable" };
}

function unknown(outcome: FetchOutcome): LookupResult {
  return { status: "unknown", rateLimited: outcome.kind === "rate_limited" };
}

async function lookupLyrics(track: LyricsLookup): Promise<LookupResult> {
  let outcome = await fetchLrclib(track, track.title, track.album);
  if (outcome.kind === "not_found") {
    // Album names often differ between Spotify and LRCLIB (deluxe editions,
    // remasters), and the album is optional, so retry without it.
    outcome = await fetchLrclib(track, cleanTitle(track.title), null);
  }
  if (outcome.kind === "rate_limited" || outcome.kind === "error") return unknown(outcome);
  if (outcome.kind === "found") {
    const result = classify(outcome.record, track);
    if (result.status === "available" || outcome.record.instrumental) return result;
  }

  // No match, or the match is another version (a different length) or has
  // no timing: LRCLIB often has the same song timed on another album.
  const other = await searchLrclib(track);
  if (other.kind === "found") return classify(other.record, track);
  if (other.kind === "rate_limited" || other.kind === "error") return unknown(other);
  return { status: "unavailable" };
}

function toCacheEntry(track: LyricsLookup, result: LookupResult): CacheEntry | null {
  if (result.status === "unknown") return null; // temporary failures are never remembered
  return {
    status: result.status,
    title: track.title,
    primaryArtist: track.primaryArtist,
    album: track.album,
    durationMs: track.durationMs,
    checkedAt: Date.now(),
    ...(result.status === "available" ? { lines: result.lines } : {}),
  };
}

/** Cached statuses for these ids; anything never checked is "unknown". */
export async function getCachedStatuses(ids: string[]): Promise<Record<string, LyricsStatus>> {
  const cached = await getCacheEntries(ids);
  return Object.fromEntries(ids.map((id) => [id, cached.get(id)?.status ?? "unknown"]));
}

/**
 * Checks a batch of songs, cache first, at most a few LRCLIB requests at a
 * time. A single failed lookup is skipped (LRCLIB returns occasional
 * temporary 503s), but it stops early on a rate limit or when a whole group
 * fails, since that looks like an outage; skipped songs come back "unknown".
 */
export async function checkTracks(tracks: LyricsLookup[]): Promise<Record<string, LyricsStatus>> {
  const cached = await getCacheEntries(tracks.map((t) => t.id));
  const statuses: Record<string, LyricsStatus> = {};
  const misses: LyricsLookup[] = [];
  for (const track of tracks) {
    const entry = cached.get(track.id);
    if (entry) statuses[track.id] = entry.status;
    else misses.push(track);
  }

  const fresh: [string, CacheEntry][] = [];
  let stopped = false;
  for (let i = 0; i < misses.length; i += MAX_PARALLEL_LOOKUPS) {
    const group = misses.slice(i, i + MAX_PARALLEL_LOOKUPS);
    if (stopped) {
      for (const track of group) statuses[track.id] = "unknown";
      continue;
    }
    const results = await Promise.all(group.map(lookupLyrics));
    group.forEach((track, j) => {
      const result = results[j];
      statuses[track.id] = result.status;
      const entry = toCacheEntry(track, result);
      if (entry) fresh.push([track.id, entry]);
    });
    const rateLimited = results.some((r) => r.status === "unknown" && r.rateLimited);
    const allFailed = results.every((r) => r.status === "unknown");
    if (rateLimited || allFailed) stopped = true;
  }

  if (fresh.length > 0) await saveCacheEntries(fresh);
  return statuses;
}

/** Lyrics for one song, cache first. */
export async function getLyrics(
  track: LyricsLookup
): Promise<{ status: LyricsStatus; lines: LyricLine[] }> {
  const entry = (await getCacheEntries([track.id])).get(track.id);
  if (entry) return { status: entry.status, lines: entry.lines ?? [] };

  const result = await lookupLyrics(track);
  const fresh = toCacheEntry(track, result);
  if (fresh) await saveCacheEntries([[track.id, fresh]]);
  return { status: result.status, lines: result.status === "available" ? result.lines : [] };
}
