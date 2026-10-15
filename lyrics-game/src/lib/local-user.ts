import { promises as fs } from "fs";
import path from "path";
import { freshJsonFile } from "./json-file";

/**
 * Who you are when you use the app without Spotify. Your games, saved lists
 * and saved library copy are kept under your Spotify user id, so the app
 * remembers that id (and your name and picture) from the last time you were
 * logged in. Before it has been remembered, it's the only id the saved
 * files hold, if there is just one. This is a single-user app.
 */
export interface KnownUser {
  id: string;
  name: string | null;
  picture: string | null;
}

const store = freshJsonFile<Partial<KnownUser>>("last-user.json", () => ({}));

const DATA_DIR = path.join(process.cwd(), ".data");

/** The ids your saved data is kept under, from the files that key by user. */
async function savedUserIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const file of ["games.json", "saved.json", "library-cache.json"]) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8"));
      for (const key of Object.keys(data)) ids.add(key);
    } catch {
      // A missing or unreadable file just adds nothing.
    }
  }
  return ids;
}

/** Keeps who you are, when logged in, for the times you aren't. Writes only when it changed. */
export function rememberUser(user: KnownUser): Promise<void> {
  return store.update((current) =>
    current.id === user.id && current.name === user.name && current.picture === user.picture
      ? { next: current, result: undefined }
      : { next: { id: user.id, name: user.name, picture: user.picture }, result: undefined }
  );
}

export async function knownUser(): Promise<KnownUser> {
  const stored = await store.read();
  if (stored.id) return { id: stored.id, name: stored.name ?? null, picture: stored.picture ?? null };
  const ids = await savedUserIds();
  if (ids.size === 1) {
    const [id] = ids;
    await rememberUser({ id, name: null, picture: null });
    return { id, name: null, picture: null };
  }
  return { id: "local", name: null, picture: null };
}
