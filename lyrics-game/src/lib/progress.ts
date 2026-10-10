/** Saved games and the progress worked out from them. Pure, so the rules can be checked. */

import { normalize, pointsFor, type Difficulty } from "./game.ts";

/** How one hidden word went. "revealed": missed without a guess to show. */
export interface WordResult {
  answer: string;
  result: "right" | "wrong" | "revealed";
  wrongTries: number;
  /** What was in the box at the end ("" if nothing). */
  guess: string;
  /** Sing mode: the line the word was sung on (for full-line streaks). */
  line?: number;
}

export interface GameSong {
  trackId: string;
  title: string;
  artist: string;
  cover: string | null;
  durationMs: number;
}

export interface GameSummary {
  score: number;
  /** 0–100, rounded. */
  accuracy: number;
  correct: number;
  total: number;
  bestStreak: number;
}

/** One finished song. */
export interface Game extends GameSummary {
  id: string;
  /** epoch ms */
  playedAt: number;
  song: GameSong;
  level: Difficulty;
  /** "sing" for Sing mode; typed games (and every game before Phase 8) have none. */
  mode?: "sing";
  words: WordResult[];
}

/**
 * A game's numbers from its word results, by the game's own rules: points
 * halve per wrong try, and the streak only counts words right on the first try.
 * Sung games: points per word heard, and the streak counts full lines.
 */
export function summarizeGame(words: WordResult[], level: Difficulty, mode?: "sing"): GameSummary {
  if (mode === "sing") return summarizeSung(words, level);
  let score = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const word of words) {
    if (word.result === "right") {
      correct++;
      score += pointsFor(level, word.wrongTries);
      streak = word.wrongTries === 0 ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }
  return {
    score,
    accuracy: words.length ? Math.round((correct / words.length) * 100) : 0,
    correct,
    total: words.length,
    bestStreak,
  };
}

function summarizeSung(words: WordResult[], level: Difficulty): GameSummary {
  const correct = words.filter((w) => w.result === "right").length;
  const lines = new Map<number, boolean>();
  for (const word of words) {
    const line = word.line ?? -1;
    lines.set(line, (lines.get(line) ?? true) && word.result === "right");
  }
  let streak = 0;
  let bestStreak = 0;
  for (const full of [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, f]) => f)) {
    streak = full ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    score: correct * pointsFor(level, 0),
    accuracy: words.length ? Math.round((correct / words.length) * 100) : 0,
    correct,
    total: words.length,
    bestStreak,
  };
}

export interface OverallStats {
  songsPlayed: number;
  wordsGuessed: number;
  /** Right answers out of all hidden words across every game, 0–100. */
  accuracy: number;
  bestStreak: number;
}

export function overallStats(games: Game[]): OverallStats {
  const correct = games.reduce((n, g) => n + g.correct, 0);
  const total = games.reduce((n, g) => n + g.total, 0);
  return {
    songsPlayed: games.length,
    wordsGuessed: correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    bestStreak: games.reduce((n, g) => Math.max(n, g.bestStreak), 0),
  };
}

/** Overall stats for typed games, and for sung ones once there are any. */
export function overallByMode(games: Game[]): { typed: OverallStats; sung: OverallStats | null } {
  const sung = games.filter((g) => g.mode === "sing");
  return {
    typed: overallStats(games.filter((g) => g.mode !== "sing")),
    sung: sung.length ? overallStats(sung) : null,
  };
}

export function recentGames(games: Game[], count: number): Game[] {
  return [...games].sort((a, b) => b.playedAt - a.playedAt).slice(0, count);
}

/** Higher accuracy first, then higher score, then the more recent. */
function better(a: Game, b: Game): number {
  return b.accuracy - a.accuracy || b.score - a.score || b.playedAt - a.playedAt;
}

/**
 * Each song's best game, at whichever level, best first. Typed and sung games
 * aren't compared: a song can be listed once for each.
 */
export function bestSongs(games: Game[], count: number): Game[] {
  const best = new Map<string, Game>();
  for (const game of games) {
    const key = `${game.mode ?? "type"}:${game.song.trackId}`;
    const current = best.get(key);
    if (!current || better(game, current) < 0) best.set(key, game);
  }
  return [...best.values()].sort(better).slice(0, count);
}

export interface MissedWord {
  /** As it's most often written in the lyrics. */
  word: string;
  misses: number;
  /** Times it was hidden. */
  seen: number;
  /** Titles of the songs it was missed in. */
  songs: string[];
}

/** A word is listed once it's been missed this many times. */
export const MISSED_WORD_MIN = 2;

/**
 * The words you miss most. "Corazón" and "corazon" are one word. A miss is
 * anything but right: wrong, skipped, out of tries or out of time. Typed
 * games only: a sung miss is often the app mishearing, not you forgetting.
 */
export function missedWords(games: Game[], count: number): MissedWord[] {
  const byWord = new Map<
    string,
    { spellings: Map<string, number>; misses: number; seen: number; songs: Set<string> }
  >();
  for (const game of games) {
    if (game.mode === "sing") continue;
    for (const word of game.words) {
      const key = normalize(word.answer);
      let entry = byWord.get(key);
      if (!entry) {
        entry = { spellings: new Map(), misses: 0, seen: 0, songs: new Set() };
        byWord.set(key, entry);
      }
      entry.seen++;
      entry.spellings.set(word.answer, (entry.spellings.get(word.answer) ?? 0) + 1);
      if (word.result !== "right") {
        entry.misses++;
        entry.songs.add(game.song.title);
      }
    }
  }
  return [...byWord.values()]
    .filter((e) => e.misses >= MISSED_WORD_MIN)
    .map((e) => ({
      word: [...e.spellings].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      misses: e.misses,
      seen: e.seen,
      songs: [...e.songs],
    }))
    .sort(
      (a, b) =>
        b.misses - a.misses || b.misses / b.seen - a.misses / a.seen || a.word.localeCompare(b.word)
    )
    .slice(0, count);
}
