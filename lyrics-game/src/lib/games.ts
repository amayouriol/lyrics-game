import { promises as fs } from "fs";
import path from "path";
import type { Game } from "./progress";

// Your finished games, per Spotify user id, in a JSON file next to the
// lyrics cache. Unlike the cache, this is your history: a file that can't
// be read is an error, never treated as empty (saving over it would wipe
// it), and a failed write is reported to the caller.
const DATA_DIR = path.join(process.cwd(), ".data");
const GAMES_FILE = path.join(DATA_DIR, "games.json");

type Store = Record<string, Game[]>;

let store: Store | null = null;
let loading: Promise<Store> | null = null;
let writes: Promise<void> = Promise.resolve();

async function load(): Promise<Store> {
  if (store) return store;
  loading ??= (async () => {
    try {
      store = JSON.parse(await fs.readFile(GAMES_FILE, "utf8")) as Store;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        loading = null; // let the next request try again
        throw error;
      }
      store = {};
    }
    return store;
  })();
  return loading;
}

/** Written to a temporary file first, so a crash mid-write can't corrupt the history. */
async function persist(all: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${GAMES_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(all), "utf8");
  await fs.rename(temp, GAMES_FILE);
}

export async function getGames(userId: string): Promise<Game[]> {
  return (await load())[userId] ?? [];
}

/** Saves a finished game. A game id already saved (a retry, a reload) is left alone. */
export async function saveGame(userId: string, game: Game): Promise<"saved" | "duplicate"> {
  const all = await load();
  const games = (all[userId] ??= []);
  if (games.some((g) => g.id === game.id)) return "duplicate";
  games.push(game);
  // Writes are chained so two saves finishing together can't interleave.
  const write = writes.then(() => persist(all));
  writes = write.catch(() => {});
  try {
    await write;
  } catch (error) {
    // Keep memory in step with the file, so Retry saves it again.
    games.splice(games.indexOf(game), 1);
    throw error;
  }
  return "saved";
}
