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
  const when = retryAt ? `Try again after ${moment(retryAt)}.` : "Try again in a minute.";
  return { title: "Spotify asked us to slow down.", body: `Too many requests. ${when}` };
}

/** "1:15 PM", "tomorrow at 1:15 PM" or "Oct 7 at 1:15 PM". */
export function moment(time: number): string {
  const d = new Date(time);
  const clock = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() + offset);
    return x.toDateString();
  };
  if (d.toDateString() === day(0)) return clock;
  if (d.toDateString() === day(1)) return `tomorrow at ${clock}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${clock}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "2 hours ago", "yesterday". */
export function ago(time: number, now: number): string {
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.floor(hours / 24), "day");
}

export function playlistHref(sourceId: string): string {
  return `/library?source=${encodeURIComponent(sourceId)}`;
}

/** Whether a song's title or artist contains the search, ignoring capitals and accents. */
export function matchesSearch(track: { title: string; artist: string }, search: string): boolean {
  const s = normalize(search);
  return !s || normalize(`${track.title} ${track.artist}`).includes(s);
}
