import { playedTrackIds } from "./games";
import type { Language } from "./language";
import { getCachedInfo, type LyricsStatus } from "./lyrics";
import { getUserId } from "./session";
import { listSources, listTracks, type Source, type Track } from "./spotify";

/**
 * How long your playlist list and each playlist's songs are remembered.
 * Spotify rate-limits apps like this one, and the library page needs every
 * playlist; without this, a few reloads in a row got "too many requests".
 * A change you make in Spotify shows up here within this time.
 */
const REMEMBER_MS = 5 * 60_000;

const remembered = new Map<string, { at: number; value: Promise<unknown> }>();

/** One answer per key for REMEMBER_MS, shared by requests made at the same time. Failures aren't kept. */
function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = remembered.get(key);
  if (hit && Date.now() - hit.at < REMEMBER_MS) return hit.value as Promise<T>;
  const value = load();
  remembered.set(key, { at: Date.now(), value });
  value.catch(() => {
    if (remembered.get(key)?.value === value) remembered.delete(key);
  });
  return value;
}

/** Liked Songs and the playlists you own, from Spotify (remembered for a few minutes). */
export async function getSources(accessToken: string): Promise<Source[]> {
  return remember(`${await getUserId()}|sources`, () => listSources(accessToken));
}

/** One list's songs, from Spotify (remembered for a few minutes). */
export async function getTracks(accessToken: string, sourceId: string): Promise<Track[]> {
  return remember(`${await getUserId()}|tracks|${sourceId}`, () =>
    listTracks(accessToken, sourceId)
  );
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
