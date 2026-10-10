/** Rule checks for saved games and progress: run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestSongs,
  currentStreak,
  missedWords,
  overallByMode,
  summarizeGame,
  type Game,
  type WordResult,
} from "./progress.ts";

const typed = (result: WordResult["result"], wrongTries = 0): WordResult => ({
  answer: "love",
  result,
  wrongTries,
  guess: "",
});

const sung = (line: number, heard: boolean): WordResult => ({
  answer: "love",
  result: heard ? "right" : "revealed",
  wrongTries: 0,
  guess: "",
  line,
});

test("typed games: points halve per wrong try, streak counts first-try words", () => {
  const words = [typed("right"), typed("right", 1), typed("right"), typed("wrong", 3)];
  assert.deepEqual(summarizeGame(words, "medium"), {
    score: 150 + 75 + 150,
    accuracy: 75,
    correct: 3,
    total: 4,
    bestStreak: 1,
  });
});

test("sung games: points per word heard, streak counts full lines", () => {
  const words = [
    sung(0, true),
    sung(0, true), // line 0 full
    sung(2, true),
    sung(2, true), // line 2 full
    sung(4, true),
    sung(4, false), // line 4 not full
    sung(6, true), // line 6 full
  ];
  assert.deepEqual(summarizeGame(words, "hard", "sing"), {
    score: 6 * 200,
    accuracy: 86,
    correct: 6,
    total: 7,
    bestStreak: 2,
  });
});

test("sung games: lines count in song order, however the words were sent", () => {
  const words = [sung(4, true), sung(0, true), sung(2, false), sung(6, true)];
  assert.equal(summarizeGame(words, "easy", "sing").bestStreak, 2); // lines 4 and 6
});

test("an empty game is 0%, not a crash", () => {
  assert.equal(summarizeGame([], "easy", "sing").accuracy, 0);
  assert.equal(summarizeGame([], "easy").accuracy, 0);
});

// --- Typed and sung games side by side (Phase 8) ---

let nextId = 0;
const game = (
  trackId: string,
  accuracy: number,
  mode?: "sing",
  words: WordResult[] = [typed("revealed")]
): Game => ({
  id: `g${nextId++}`,
  playedAt: nextId,
  song: { trackId, title: trackId, artist: "a", cover: null, durationMs: 1 },
  level: "medium",
  ...(mode ? { mode } : {}),
  words,
  score: accuracy,
  accuracy,
  correct: accuracy,
  total: 100,
  bestStreak: 0,
});

test("best songs keep typed and sung games apart", () => {
  const games = [game("a", 90), game("a", 60, "sing"), game("a", 70, "sing"), game("b", 80)];
  const best = bestSongs(games, 5);
  assert.deepEqual(
    best.map((g) => [g.song.trackId, g.mode ?? "type", g.accuracy]),
    [
      ["a", "type", 90],
      ["b", "type", 80],
      ["a", "sing", 70],
    ]
  );
});

test("words you keep missing count typed games only", () => {
  const miss = (answer: string): WordResult => ({ ...typed("revealed"), answer });
  const games = [
    game("a", 0, undefined, [miss("noche")]),
    game("b", 0, "sing", [miss("noche"), miss("noche")]),
  ];
  assert.deepEqual(missedWords(games, 10), []);
  games.push(game("c", 0, undefined, [miss("noche")]));
  assert.deepEqual(
    missedWords(games, 10).map((w) => [w.word, w.misses]),
    [["noche", 2]]
  );
});

test("overall stats: typed games, and sung ones only once there are any", () => {
  const typedOnly = overallByMode([game("a", 80), game("b", 60)]);
  assert.equal(typedOnly.typed.songsPlayed, 2);
  assert.equal(typedOnly.typed.accuracy, 70);
  assert.equal(typedOnly.sung, null);
  const both = overallByMode([game("a", 80), game("b", 40, "sing")]);
  assert.equal(both.typed.songsPlayed, 1);
  assert.equal(both.sung?.songsPlayed, 1);
  assert.equal(both.sung?.accuracy, 40);
});

test("games saved before Sing mode count as typed", () => {
  const old = game("a", 75);
  delete (old as { mode?: string }).mode;
  assert.equal(overallByMode([old]).typed.songsPlayed, 1);
});

test("current streak: songs in a row at 80% or more, counting back from the latest", () => {
  assert.equal(currentStreak([]), 0);
  // Played in this order; the oldest one under 80% doesn't matter.
  const games = [game("a", 50), game("b", 90), game("c", 80), game("d", 100)];
  assert.equal(currentStreak(games), 3); // 80% exactly counts
  assert.equal(currentStreak([...games].reverse()), 3); // play order, not list order
  assert.equal(currentStreak([...games, game("e", 79)]), 0); // latest under 80%
  assert.equal(currentStreak([game("f", 85), game("g", 95)]), 2); // all count
});

test("current streak: typed and sung songs both count", () => {
  const games = [game("a", 60, "sing"), game("b", 88), game("c", 82, "sing"), game("d", 90)];
  assert.equal(currentStreak(games), 3);
  assert.equal(currentStreak([...games, game("e", 70, "sing")]), 0);
});
