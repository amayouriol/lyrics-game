import { jsonFile } from "./json-file";

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

// Favorites and Play later, per Spotify user id. Kept newest first.
const store = jsonFile<Record<string, SavedLists>>("saved.json", () => ({}));

const emptyLists = (): SavedLists => ({ favorites: [], later: [] });

export async function getSaved(userId: string): Promise<SavedLists> {
  return (await store.read())[userId] ?? emptyLists();
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
  return store.update((all) => {
    const lists = all[userId] ?? emptyLists();
    const has = lists[list].some((s) => s.id === song.id);
    if (has === on) return { next: all, result: lists };
    const nextList = on
      ? [{ ...song, addedAt: Date.now() }, ...lists[list]]
      : lists[list].filter((s) => s.id !== song.id);
    const nextLists = { ...lists, [list]: nextList };
    return { next: { ...all, [userId]: nextLists }, result: nextLists };
  });
}

/** Takes a finished song off Play later. */
export function finishedSong(userId: string, trackId: string): Promise<void> {
  return store.update((all) => {
    const lists = all[userId];
    if (!lists?.later.some((s) => s.id === trackId)) return { next: all, result: undefined };
    const nextLists = { ...lists, later: lists.later.filter((s) => s.id !== trackId) };
    return { next: { ...all, [userId]: nextLists }, result: undefined };
  });
}
