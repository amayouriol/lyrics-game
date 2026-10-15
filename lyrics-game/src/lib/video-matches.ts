import { promises as fs } from "fs";
import path from "path";
import { jsonFile } from "./json-file";

/** The YouTube video chosen for a song. Kept for good; changing it replaces it. */
export interface VideoMatch {
  videoId: string;
  title: string;
  channel: string;
  /** epoch ms */
  savedAt: number;
}

const FILE = "video-matches.json";

// By song id, not by user: the same song gets the same video for everyone.
const store = jsonFile<Record<string, VideoMatch>>(FILE, () => ({}));

/**
 * Read from the file every time, not from the store's memory. The play page
 * and the save route can each hold their own copy of this module while the
 * dev server runs; a saved choice then never reached the play page, which
 * played the song on Spotify instead (seen 2026-10-14). The file is small.
 */
export async function getMatch(trackId: string): Promise<VideoMatch | null> {
  try {
    const all = JSON.parse(await fs.readFile(path.join(process.cwd(), ".data", FILE), "utf8"));
    return all[trackId] ?? null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function setMatch(trackId: string, match: Omit<VideoMatch, "savedAt">): Promise<VideoMatch> {
  const saved = { ...match, savedAt: Date.now() };
  return store.update((all) => ({ next: { ...all, [trackId]: saved }, result: saved }));
}
