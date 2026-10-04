import { NextResponse } from "next/server";
import { isDifficulty, MAX_TRIES } from "@/lib/game";
import { saveGame } from "@/lib/games";
import { summarizeGame, type Game, type GameSong, type WordResult } from "@/lib/progress";
import { getSession, getUserId } from "@/lib/session";
import { SpotifySessionExpiredError } from "@/lib/spotify";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const GAME_ID = /^[A-Za-z0-9-]{8,64}$/;
const RESULTS = new Set(["right", "wrong", "revealed"]);
/** Far more blanks than any song has, just to bound the body. */
const MAX_WORDS = 2_000;

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function parseWord(value: unknown): WordResult | null {
  const w = value as Record<string, unknown> | null;
  if (!w || typeof w !== "object") return null;
  const { answer, result, wrongTries, guess } = w;
  if (!isText(answer, 100) || !answer) return null;
  if (typeof result !== "string" || !RESULTS.has(result)) return null;
  if (!Number.isInteger(wrongTries) || (wrongTries as number) < 0) return null;
  if ((wrongTries as number) > MAX_TRIES) return null;
  if (!isText(guess, 200)) return null;
  return { answer, result: result as WordResult["result"], wrongTries: wrongTries as number, guess };
}

/** A finished game from the results screen; the numbers are worked out here, not trusted. */
function parseGame(body: unknown) {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return null;
  const { id, level, song, words } = b;
  if (typeof id !== "string" || !GAME_ID.test(id) || !isDifficulty(level)) return null;

  const s = song as Record<string, unknown> | null;
  if (!s || typeof s !== "object") return null;
  const { trackId, title, artist, cover, durationMs } = s;
  if (typeof trackId !== "string" || !SPOTIFY_ID.test(trackId)) return null;
  if (!isText(title, 500) || !isText(artist, 500)) return null;
  if (cover !== null && !isText(cover, 2_000)) return null;
  if (typeof durationMs !== "number" || !(durationMs >= 0)) return null;
  const gameSong: GameSong = { trackId, title, artist, cover, durationMs };

  if (!Array.isArray(words) || words.length > MAX_WORDS) return null;
  const parsed = words.map(parseWord);
  if (parsed.some((w) => w === null)) return null;

  return { id, level, song: gameSong, words: parsed as WordResult[] };
}

/** Saves a finished game to your progress. Saving the same game twice is harmless. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }
  const parsed = parseGame(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }

  try {
    const userId = await getUserId();
    const game: Game = {
      ...parsed,
      playedAt: Date.now(),
      ...summarizeGame(parsed.words, parsed.level),
    };
    const status = await saveGame(userId, game);
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    console.error("[/api/games]", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
