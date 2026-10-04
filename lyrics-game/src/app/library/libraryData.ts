import { normalize } from "@/lib/game";
import type { LibraryTrack } from "@/lib/library";

export type LoadState = "loading" | "ready" | "error";
export type FetchResult<T> = { status: "ok"; data: T } | { status: "expired" } | { status: "error" };
export type { LibraryTrack };

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

/** Whether a song's title or artist contains the search, ignoring capitals and accents. */
export function matchesSearch(track: { title: string; artist: string }, search: string): boolean {
  const s = normalize(search);
  return !s || normalize(`${track.title} ${track.artist}`).includes(s);
}
