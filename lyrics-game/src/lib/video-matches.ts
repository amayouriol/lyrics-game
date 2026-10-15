import { jsonFile } from "./json-file";

/** The YouTube video chosen for a song. Kept for good; changing it replaces it. */
export interface VideoMatch {
  videoId: string;
  title: string;
  channel: string;
  /** epoch ms */
  savedAt: number;
}

// By song id, not by user: the same song gets the same video for everyone.
const store = jsonFile<Record<string, VideoMatch>>("video-matches.json", () => ({}));

export async function getMatch(trackId: string): Promise<VideoMatch | null> {
  return (await store.read())[trackId] ?? null;
}

export function setMatch(trackId: string, match: Omit<VideoMatch, "savedAt">): Promise<VideoMatch> {
  const saved = { ...match, savedAt: Date.now() };
  return store.update((all) => ({ next: { ...all, [trackId]: saved }, result: saved }));
}
