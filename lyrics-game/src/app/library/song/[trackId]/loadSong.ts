import type { Blank, Difficulty, TimedLine } from "@/lib/game";
import type { Language } from "@/lib/language";
import type { PlayMode } from "./singPrefs";

export interface TrackSummary {
  title: string;
  artist: string;
  primaryArtist: string;
  album: string;
  cover: string | null;
  duration: string;
  durationMs: number;
}

export type SongResult =
  | {
      kind: "ready";
      track: TrackSummary;
      status: "available" | "unavailable";
      /** From the lyrics; null if unclear. Sing mode listens for it. */
      language: Language | null;
      lineCount: number;
      lines: TimedLine[];
      /** The hidden words per level, picked on the server against the dictionaries. */
      blanks: Record<Difficulty, Blank[]>;
      /** Sing mode: per line, which words are sung for points (worked out on the server). */
      singable: boolean[][];
    }
  | { kind: "lyrics_error"; track: TrackSummary }
  | { kind: "error" }
  | { kind: "not_found" };

/** Song data for the song and play screens, including the timed lyrics. */
export async function loadSong(trackId: string): Promise<SongResult | "expired"> {
  try {
    const res = await fetch(`/api/lyrics/${encodeURIComponent(trackId)}`);
    if (res.status === 401) return "expired";
    if (res.status === 404) return { kind: "not_found" };
    const body = await res.json();
    if (res.status === 503 && body.track) return { kind: "lyrics_error", track: body.track };
    if (!res.ok) return { kind: "error" };
    return {
      kind: "ready",
      track: body.track,
      status: body.status,
      language: body.language ?? null,
      lineCount: body.lineCount,
      lines: body.lines,
      blanks: body.blanks,
      singable: body.singable,
    };
  } catch {
    return { kind: "error" };
  }
}

export function songHref(trackId: string, from: string | null): string {
  return `/library/song/${trackId}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
}

export function playHref(
  trackId: string,
  from: string | null,
  level: Difficulty,
  mode: PlayMode = "type"
): string {
  const params = new URLSearchParams({ level });
  if (mode === "sing") params.set("mode", "sing");
  if (from) params.set("from", from);
  return `/library/song/${trackId}/play?${params}`;
}
