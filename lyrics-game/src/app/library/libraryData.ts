import type { LyricsStatus } from "@/lib/lyrics";
import type { Track } from "@/lib/spotify";

export type LoadState = "loading" | "ready" | "error";
export type FetchResult<T> = { status: "ok"; data: T } | { status: "expired" } | { status: "error" };
export type LibraryTrack = Track & { lyricsStatus: LyricsStatus };

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, init);
    if (res.status === 401) return { status: "expired" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data: (await res.json()) as T };
  } catch {
    return { status: "error" };
  }
}

/** The result of a fetch tagged with the request key it answers, so a
 * component can tell "still loading this key" apart from "loaded a stale one". */
export interface KeyedResult<T> {
  key: number;
  status: "ready" | "error";
  data?: T;
}

export function playlistHref(sourceId: string): string {
  return `/library?source=${encodeURIComponent(sourceId)}`;
}
