export interface TrackSummary {
  title: string;
  artist: string;
  cover: string | null;
  duration: string;
  durationMs: number;
}

export type SongResult =
  | {
      kind: "ready";
      track: TrackSummary;
      status: "available" | "unavailable";
      lineCount: number;
      lineTimesMs: number[];
    }
  | { kind: "lyrics_error"; track: TrackSummary }
  | { kind: "error" }
  | { kind: "not_found" };

/** Song summary for the song and play screens (line times only, never lyrics text). */
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
      lineCount: body.lineCount,
      lineTimesMs: body.lineTimesMs,
    };
  } catch {
    return { kind: "error" };
  }
}

export function songHref(trackId: string, from: string | null): string {
  return `/library/song/${trackId}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
}
