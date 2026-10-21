import { keyedStore } from "./storage.ts";

/** The YouTube video chosen for a song. Kept for good; changing it replaces it. */
export interface VideoMatch {
  videoId: string;
  title: string;
  channel: string;
  /** epoch ms */
  savedAt: number;
}

// By song id, not by user: the same song gets the same video for everyone.
// Read fresh each time: see freshJsonFile.
const store = keyedStore<VideoMatch | null>("video-matches", () => null, { fresh: true });

export async function getMatch(trackId: string): Promise<VideoMatch | null> {
  return store.read(trackId);
}

export function setMatch(trackId: string, match: Omit<VideoMatch, "savedAt">): Promise<VideoMatch> {
  const saved = { ...match, savedAt: Date.now() };
  return store.update(trackId, () => ({ next: saved, result: saved }));
}

/** Saves many choices in one write (an imported playlist), keeping any song's existing choice. */
export function setMatchesIfMissing(
  matches: Record<string, Omit<VideoMatch, "savedAt">>
): Promise<void> {
  return store.updateMany(Object.keys(matches), (current) => {
    const now = Date.now();
    const changed: Record<string, VideoMatch> = {};
    for (const [trackId, match] of Object.entries(matches)) {
      if (!current[trackId]) changed[trackId] = { ...match, savedAt: now };
    }
    return { changed, result: undefined };
  });
}
