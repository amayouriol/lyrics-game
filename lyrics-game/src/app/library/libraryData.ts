import { normalize } from "@/lib/game";
import type { LibraryTrack } from "@/lib/library";

export type LoadState = "loading" | "ready" | "error";
export type FetchResult<T> =
  | { status: "ok"; data: T }
  | { status: "expired" }
  /** rateLimited: Spotify asked the app to slow down, until retryAt (epoch ms) if it said. */
  | { status: "error"; rateLimited: boolean; retryAt?: number };
export type { LibraryTrack };

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, init);
    if (res.status === 401) return { status: "expired" };
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { retryAt?: number | null };
      return { status: "error", rateLimited: true, retryAt: body.retryAt ?? undefined };
    }
    if (!res.ok) return { status: "error", rateLimited: false };
    return { status: "ok", data: (await res.json()) as T };
  } catch {
    return { status: "error", rateLimited: false };
  }
}

/** The result of a fetch tagged with the request key it answers, so a
 * component can tell "still loading this key" apart from "loaded a stale one". */
export interface KeyedResult<T> {
  key: number;
  status: "ready" | "error";
  data?: T;
  rateLimited?: boolean;
  retryAt?: number;
}

/** What to say when Spotify didn't give us something. */
export function spotifyTrouble(
  rateLimited: boolean | undefined,
  retryAt?: number
): { title: string; body: string } {
  if (!rateLimited) return { title: "Spotify didn't answer.", body: "It's probably a blip." };
  const when = retryAt
    ? `Try again after ${new Date(retryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
    : "Try again in a minute.";
  return { title: "Spotify asked us to slow down.", body: `Too many requests in a short time. ${when}` };
}

export function playlistHref(sourceId: string): string {
  return `/library?source=${encodeURIComponent(sourceId)}`;
}

/** Whether a song's title or artist contains the search, ignoring capitals and accents. */
export function matchesSearch(track: { title: string; artist: string }, search: string): boolean {
  const s = normalize(search);
  return !s || normalize(`${track.title} ${track.artist}`).includes(s);
}
