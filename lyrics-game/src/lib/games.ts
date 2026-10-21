import { keyedStore } from "./storage.ts";
import type { Game } from "./progress";

// Your finished games, per user id.
const store = keyedStore<Game[]>("games", () => []);

export async function getGames(userId: string): Promise<Game[]> {
  return store.read(userId);
}

/** Ids of the songs you've finished at least once. */
export async function playedTrackIds(userId: string): Promise<Set<string>> {
  return new Set((await getGames(userId)).map((g) => g.song.trackId));
}

/** Saves a finished game. A game id already saved (a retry, a reload) is left alone. */
export function saveGame(userId: string, game: Game): Promise<"saved" | "duplicate"> {
  return store.update(userId, (games) => {
    if (games.some((g) => g.id === game.id)) return { next: games, result: "duplicate" };
    return { next: [...games, game], result: "saved" };
  });
}
