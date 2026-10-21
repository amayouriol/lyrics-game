import { keyedStore } from "./storage.ts";

/** A song you kept, with what's needed to list it without asking Spotify. */
export interface SavedSong {
  id: string;
  title: string;
  artist: string;
  primaryArtist: string;
  album: string;
  durationMs: number;
  duration: string;
  cover: string | null;
  /** epoch ms */
  addedAt: number;
}

export type SavedListName = "favorites" | "later";

export type SavedLists = Record<SavedListName, SavedSong[]>;

const emptyLists = (): SavedLists => ({ favorites: [], later: [] });

// Favorites and Play later, per user id. Kept newest first.
const store = keyedStore<SavedLists>("saved", emptyLists);

export async function getSaved(userId: string): Promise<SavedLists> {
  return store.read(userId);
}

/**
 * Adds a song to a list or takes it off. Adding a song already there, or
 * removing one that isn't, changes nothing.
 */
export function setSaved(
  userId: string,
  list: SavedListName,
  song: Omit<SavedSong, "addedAt">,
  on: boolean
): Promise<SavedLists> {
  return store.update(userId, (lists) => {
    const has = lists[list].some((s) => s.id === song.id);
    if (has === on) return { next: lists, result: lists };
    const nextList = on
      ? [{ ...song, addedAt: Date.now() }, ...lists[list]]
      : lists[list].filter((s) => s.id !== song.id);
    const nextLists = { ...lists, [list]: nextList };
    return { next: nextLists, result: nextLists };
  });
}

/** Takes a finished song off Play later. */
export function finishedSong(userId: string, trackId: string): Promise<void> {
  return store.update(userId, (lists) => {
    if (!lists.later.some((s) => s.id === trackId)) return { next: lists, result: undefined };
    return { next: { ...lists, later: lists.later.filter((s) => s.id !== trackId) }, result: undefined };
  });
}
