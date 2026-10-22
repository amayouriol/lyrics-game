import { keyedStore } from "./storage.ts";
import type { Track } from "./spotify";

/**
 * Songs and lists that live in the app, not on Spotify: songs added from
 * YouTube (a link, or a title and artist) and YouTube playlists you import.
 * A song here has the same fields as a Spotify song, so the library, the
 * lyrics and your saved games treat both alike.
 */
export interface OwnSong extends Track {
  /** epoch ms */
  addedAt: number;
}

export interface OwnList {
  /** "added" for songs added one by one, else "pl-<YouTube playlist id>". */
  id: string;
  name: string;
  cover: string | null;
  /** In the order given when added; later additions go first. */
  songIds: string[];
  addedAt: number;
}

interface OwnData {
  songs: Record<string, OwnSong>;
  lists: OwnList[];
}

/** What the library page shows for a list. */
export interface OwnSource {
  /** "own:" + the list's id, so it can't be mistaken for a Spotify playlist id. */
  id: string;
  name: string;
  count: number;
  cover: string | null;
}

export const ADDED_LIST = "added";
export const SOURCE_PREFIX = "own:";

// Written by the add routes and read by other routes: read fresh each time.
// One person's data; in the file, your own copy is just you.
const store = keyedStore<OwnData>("own-library", () => ({ songs: {}, lists: [] }), {
  fresh: true,
  singleFile: true,
});

const toTrack = (s: OwnSong): Track => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  primaryArtist: s.primaryArtist,
  album: s.album,
  durationMs: s.durationMs,
  duration: s.duration,
  cover: s.cover,
});

export async function getOwnSong(userId: string, id: string): Promise<Track | null> {
  const song = (await store.read(userId)).songs[id];
  return song ? toTrack(song) : null;
}

export async function getOwnSources(userId: string): Promise<OwnSource[]> {
  const { lists } = await store.read(userId);
  return lists.map((l) => ({
    id: `${SOURCE_PREFIX}${l.id}`,
    name: l.name,
    count: l.songIds.length,
    cover: l.cover,
  }));
}

/** One list's songs, newest first; null if there's no such list. */
export async function getOwnTracks(userId: string, listId: string): Promise<Track[] | null> {
  const data = await store.read(userId);
  const list = data.lists.find((l) => l.id === listId);
  if (!list) return null;
  return list.songIds.flatMap((id) => (data.songs[id] ? [toTrack(data.songs[id])] : []));
}

/** Every added song, newest first, for searching the whole library. */
export async function getAllOwnTracks(userId: string): Promise<Track[]> {
  const { songs } = await store.read(userId);
  return Object.values(songs)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map(toTrack);
}

/** Adds a song, to "Added songs" unless a list is named. Adding it again keeps it as it is. */
export function addOwnSong(
  userId: string,
  song: Track,
  list: { id: string; name: string; cover: string | null } = {
    id: ADDED_LIST,
    name: "Added songs",
    cover: null,
  }
): Promise<{ added: boolean }> {
  return addOwnSongs(userId, [song], list).then(({ added }) => ({ added: added > 0 }));
}

/** Adds songs to a list (creating it), skipping any already in it. Counts the new ones. */
export function addOwnSongs(
  userId: string,
  songs: Track[],
  list: { id: string; name: string; cover: string | null }
): Promise<{ added: number }> {
  return store.update(userId, (data) => {
    const now = Date.now();
    const known = data.lists.find((l) => l.id === list.id);
    const inList = new Set(known?.songIds ?? []);
    const fresh = songs.filter((s, i) => !inList.has(s.id) && songs.findIndex((x) => x.id === s.id) === i);
    if (fresh.length === 0 && known) return { next: data, result: { added: 0 } };

    const nextSongs = { ...data.songs };
    for (const s of fresh) nextSongs[s.id] ??= { ...s, addedAt: now };
    const songIds = [...fresh.map((s) => s.id), ...(known?.songIds ?? [])];
    const nextList: OwnList = known
      ? { ...known, songIds }
      : { id: list.id, name: list.name, cover: list.cover, songIds, addedAt: now };
    const lists = known
      ? data.lists.map((l) => (l.id === list.id ? nextList : l))
      : [nextList, ...data.lists];
    return { next: { songs: nextSongs, lists }, result: { added: fresh.length } };
  });
}

/** The longest name a list can have. */
export const MAX_LIST_NAME = 60;

/** A list name as it is kept: spaces trimmed and squeezed; null if empty or too long. */
export function cleanListName(name: string): string | null {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length >= 1 && clean.length <= MAX_LIST_NAME ? clean : null;
}

export type ListFailure = "invalid_name" | "name_taken" | "not_found" | "default_list";

/** What a list change answers: done (with details), or why not. */
export type ListResult<Done extends object = object> =
  | ({ ok: true } & Done)
  | { ok: false; reason: ListFailure };

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Makes an empty list of your own. */
export function createOwnList(
  userId: string,
  name: string
): Promise<ListResult<{ id: string }>> {
  const clean = cleanListName(name);
  if (!clean) return Promise.resolve({ ok: false, reason: "invalid_name" });
  return store.update<ListResult<{ id: string }>>(userId, (data) => {
    if (data.lists.some((l) => sameName(l.name, clean))) {
      return { next: data, result: { ok: false, reason: "name_taken" } };
    }
    const id = `my-${crypto.randomUUID().slice(0, 8)}`;
    const list: OwnList = { id, name: clean, cover: null, songIds: [], addedAt: Date.now() };
    return { next: { ...data, lists: [list, ...data.lists] }, result: { ok: true, id } };
  });
}

/** Gives a list a new name. "Added songs" can be renamed too. */
export function renameOwnList(
  userId: string,
  listId: string,
  name: string
): Promise<ListResult> {
  const clean = cleanListName(name);
  if (!clean) return Promise.resolve({ ok: false, reason: "invalid_name" });
  return store.update<ListResult>(userId, (data) => {
    if (!data.lists.some((l) => l.id === listId)) {
      return { next: data, result: { ok: false, reason: "not_found" } };
    }
    if (data.lists.some((l) => l.id !== listId && sameName(l.name, clean))) {
      return { next: data, result: { ok: false, reason: "name_taken" } };
    }
    const lists = data.lists.map((l) => (l.id === listId ? { ...l, name: clean } : l));
    return { next: { ...data, lists }, result: { ok: true } };
  });
}

/** Deletes a list. Its songs stay in your library. "Added songs" is the default list and stays. */
export function deleteOwnList(
  userId: string,
  listId: string
): Promise<ListResult> {
  if (listId === ADDED_LIST) return Promise.resolve({ ok: false, reason: "default_list" });
  return store.update<ListResult>(userId, (data) => {
    if (!data.lists.some((l) => l.id === listId)) {
      return { next: data, result: { ok: false, reason: "not_found" } };
    }
    return { next: { ...data, lists: data.lists.filter((l) => l.id !== listId) }, result: { ok: true } };
  });
}

/**
 * Puts songs you already have into a list (newest first), skipping any that
 * are there. A song that isn't in your library is left out and counted in `missing`.
 */
export function addToOwnList(
  userId: string,
  listId: string,
  songIds: string[]
): Promise<ListResult<{ added: number; missing: number }>> {
  return store.update<ListResult<{ added: number; missing: number }>>(userId, (data) => {
    const list = data.lists.find((l) => l.id === listId);
    if (!list) return { next: data, result: { ok: false, reason: "not_found" } };
    const unique = [...new Set(songIds)];
    const missing = unique.filter((id) => !data.songs[id]).length;
    const there = new Set(list.songIds);
    const fresh = unique.filter((id) => data.songs[id] && !there.has(id));
    if (fresh.length === 0) return { next: data, result: { ok: true, added: 0, missing } };
    const lists = data.lists.map((l) =>
      l.id === listId ? { ...l, songIds: [...fresh, ...l.songIds] } : l
    );
    return { next: { ...data, lists }, result: { ok: true, added: fresh.length, missing } };
  });
}

/** Takes a song off one list. It stays in your library and in your other lists. */
export function removeFromOwnList(
  userId: string,
  listId: string,
  songId: string
): Promise<ListResult> {
  return store.update<ListResult>(userId, (data) => {
    const list = data.lists.find((l) => l.id === listId);
    if (!list) return { next: data, result: { ok: false, reason: "not_found" } };
    if (!list.songIds.includes(songId)) return { next: data, result: { ok: true } };
    const lists = data.lists.map((l) =>
      l.id === listId ? { ...l, songIds: l.songIds.filter((id) => id !== songId) } : l
    );
    return { next: { ...data, lists }, result: { ok: true } };
  });
}
