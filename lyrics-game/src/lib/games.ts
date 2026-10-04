import { jsonFile } from "./json-file";
import type { Game } from "./progress";

// Your finished games, per Spotify user id.
const store = jsonFile<Record<string, Game[]>>("games.json", () => ({}));

export async function getGames(userId: string): Promise<Game[]> {
  return (await store.read())[userId] ?? [];
}

/** Saves a finished game. A game id already saved (a retry, a reload) is left alone. */
export function saveGame(userId: string, game: Game): Promise<"saved" | "duplicate"> {
  return store.update((all) => {
    const games = all[userId] ?? [];
    if (games.some((g) => g.id === game.id)) return { next: all, result: "duplicate" };
    return { next: { ...all, [userId]: [...games, game] }, result: "saved" };
  });
}
