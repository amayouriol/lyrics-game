import { NextResponse } from "next/server";
import { getGames } from "@/lib/games";
import { getCacheEntries } from "@/lib/lyrics-cache";
import {
  bestSongs,
  missedWords,
  overallStats,
  recentGames,
  type Game,
} from "@/lib/progress";
import { getSaved, type SavedLists, type SavedSong } from "@/lib/saved";
import { getSession, getUserId } from "@/lib/session";
import { SpotifySessionExpiredError } from "@/lib/spotify";

/** Counts from the Phase 6 spec. */
const RECENT_COUNT = 5;
const BEST_COUNT = 5;
const MISSED_COUNT = 10;
/** Saved songs shown per section (Phase 7 spec). */
const SAVED_COUNT = 5;

/** A game as the home page shows it: without the word-by-word results. */
function brief(game: Game): Omit<Game, "words"> {
  const { id, playedAt, song, level, score, accuracy, correct, total, bestStreak } = game;
  return { id, playedAt, song, level, score, accuracy, correct, total, bestStreak };
}

/** Your progress for the home page, worked out from your saved games. */
export async function GET() {
  try {
    const userId = await getUserId();
    const games = await getGames(userId);
    const recent = recentGames(games, RECENT_COUNT);
    const best = bestSongs(games, BEST_COUNT);

    // Songs whose lyrics are now known to be unavailable can't be played
    // again. (Songs removed from Spotify show their error on the song
    // screen instead; see the Phase 6 plan.)
    const ids = [...new Set([...recent, ...best].map((g) => g.song.trackId))];
    const cached = await getCacheEntries(ids);
    const unavailable = ids.filter((id) => cached.get(id)?.status === "unavailable");

    // Favorites and Play later, each with the level you last finished the
    // song at (Play starts there; Medium if never played). A problem reading
    // them only hides those sections.
    const lists = await getSaved(userId).catch((error): SavedLists => {
      console.error("[/api/progress] couldn't read saved songs", error);
      return { favorites: [], later: [] };
    });
    const lastLevel = new Map<string, Game["level"]>();
    for (const g of [...games].sort((a, b) => a.playedAt - b.playedAt)) {
      lastLevel.set(g.song.trackId, g.level);
    }
    const section = (songs: SavedSong[]) => ({
      count: songs.length,
      songs: songs.slice(0, SAVED_COUNT).map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cover: s.cover,
        level: lastLevel.get(s.id) ?? "medium",
      })),
    });

    return NextResponse.json({
      overall: overallStats(games),
      recent: recent.map(brief),
      best: best.map(brief),
      missed: missedWords(games, MISSED_COUNT),
      unavailable,
      saved: { favorites: section(lists.favorites), later: section(lists.later) },
    });
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    console.error("[/api/progress]", error);
    return NextResponse.json({ error: "progress_unavailable" }, { status: 500 });
  }
}
