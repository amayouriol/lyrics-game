import { playedTrackIds } from "./games";
import type { Language } from "./language";
import { getCachedInfo, type LyricsStatus } from "./lyrics";
import { getUserId } from "./session";
import type { Track } from "./spotify";

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
