/** Rule checks for saved games and progress: run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeGame, type WordResult } from "./progress.ts";

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
