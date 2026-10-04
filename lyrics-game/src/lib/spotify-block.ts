import { promises as fs } from "fs";
import path from "path";

// When Spotify tells the app to stop (429 with a long Retry-After), asking
// again before then can stretch the block. The end time is kept on disk so
// a restart doesn't forget it and ask again.
const FILE = path.join(process.cwd(), ".data", "spotify-block.json");

let until: number | null = null;

/** When Spotify said requests may resume (epoch ms); 0 if not blocked. */
export async function spotifyBlockedUntil(): Promise<number> {
  if (until === null) {
    try {
      until = Number(JSON.parse(await fs.readFile(FILE, "utf8")).until) || 0;
    } catch {
      until = 0; // no file, or unreadable: not blocked
    }
  }
  return until;
}

export async function blockSpotifyUntil(time: number): Promise<void> {
  until = Math.max(await spotifyBlockedUntil(), time);
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ until }), "utf8");
  } catch (error) {
    console.error("[spotify-block] couldn't save the block", error);
  }
}
