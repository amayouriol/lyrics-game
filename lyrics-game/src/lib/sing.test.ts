/** Rule checks for Sing mode: run with `npm test`. Cases from the step 0 test (Output/phase-8-spec.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { TimedLine } from "./game.ts";
import { isLineOver, matchSung, singLines, singStats, type HeardWord } from "./sing.ts";

// Lines 4 s apart; the song ends 4 s after the last one.
const lines = (...texts: string[]): TimedLine[] =>
  texts.map((text, i) => ({ timeMs: i * 4000, text }));
const songEnd = (l: TimedLine[]) => l.length * 4000;

/** Words heard one after another, 300 ms apart, starting at `fromMs`. */
const sing = (fromMs: number, text: string): HeardWord[] =>
  text.split(" ").map((w, i) => ({ text: w, atMs: fromMs + i * 300 }));

const run = (l: TimedLine[], heard: HeardWord[], level: "easy" | "medium" | "hard" = "medium") =>
  matchSung(l, singLines(l, level), heard, songEnd(l));

const got = (r: { heardAt: (number | null)[] }) => r.heardAt.filter((t) => t !== null).length;

// --- Which lines you sing ---

test("easy sings every other line with words, medium and hard every line with words", () => {
  const song = lines("one line here", "♪", "two line here", "three line", "four line");
  assert.deepEqual(singLines(song, "easy"), [0, 3]);
  assert.deepEqual(singLines(song, "medium"), [0, 2, 3, 4]);
  assert.deepEqual(singLines(song, "hard"), [0, 2, 3, 4]);
});

// --- What counts as heard ---

test("words count in any order, each once, the forgiving way typing does", () => {
  const song = lines("Nadie piensa en ti como lo hago yo");
  const [r] = run(song, sing(100, "YO nadie piénsa en ti como lo hago hago"));
  assert.equal(got(r), 8);
  assert.deepEqual(r.words, ["Nadie", "piensa", "en", "ti", "como", "lo", "hago", "yo"]);
});

test("a repeated word must be heard as many times as it's sung", () => {
  const [r] = run(lines("love love love me"), sing(100, "love me"));
  assert.equal(got(r), 2);
});

test("silence scores nothing", () => {
  const song = lines("Who knows how long I've loved you", "You know I love you still");
  const sung = run(song, []);
  assert.deepEqual(singStats(sung, Infinity, "medium"), {
    total: 13,
    correct: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    accuracy: 0,
  });
});

test("words from another line don't count", () => {
  const song = lines("No sé preparar café", "Y no entiendo de fútbol");
  // "fútbol" sung in the middle of the first line, far from the second.
  const [first, second] = run(song, [{ text: "fútbol", atMs: 1500 }]);
  assert.equal(got(first), 0);
  assert.equal(got(second), 0);
});

test("the first word of a line sung a little early still counts for that line", () => {
  // Step 0: "y" was heard just before "Y no entiendo de fútbol" started.
  const song = lines("No sé preparar café", "Y no entiendo de fútbol");
  const [first, second] = run(song, [
    ...sing(200, "no se preparar cafe"),
    ...sing(3600, "y no entiendo de futbol"),
  ]);
  assert.equal(got(first), 4);
  assert.equal(got(second), 5);
});

test("a word heard just after its line ends still counts", () => {
  const song = lines("La lluvia caer", "Parecido a ayer");
  const [first] = run(song, [...sing(200, "la lluvia"), { text: "caer", atMs: 4700 }]);
  assert.equal(got(first), 3);
});

test("a word sung more than a second outside its line doesn't count", () => {
  const song = lines("La lluvia caer", "Parecido a ayer");
  const [first] = run(song, [{ text: "caer", atMs: 5200 }]);
  assert.equal(got(first), 0);
});

test("near-misses: one letter off at the end counts", () => {
  // Step 0: "parque" for "parqués".
  const [r] = run(lines("Juego mal hasta el parqués"), sing(100, "juego mal hasta el parque"));
  assert.equal(got(r), 5);
});

test("near-misses: two words heard in a row can make one", () => {
  // Step 0: "amando te" for "amándote".
  const [r] = run(
    lines("Seguir amándote es inevitable"),
    sing(100, "seguir amando te es inevitable")
  );
  assert.equal(got(r), 4);
});

test("anything looser than that doesn't count", () => {
  // Step 0: "and dear" for "endear", and plain mishearing.
  const [a] = run(lines("For the things you do endear me to you"), sing(100, "and dear"));
  assert.equal(got(a), 0);
  const [b] = run(lines("Conmigo nada es fácil"), sing(100, "comi una vez"));
  assert.equal(got(b), 0);
  // Short words need an exact match: "a" isn't "al".
  const [c] = run(lines("Lloro una vez al mes"), sing(100, "a"));
  assert.equal(got(c), 0);
});

// --- Score and streaks ---

test("points per word heard, by level", () => {
  const song = lines("one two three four", "five six seven eight");
  const heard = [...sing(100, "one two three four"), ...sing(4100, "five six")];
  const medium = singStats(run(song, heard), Infinity, "medium");
  assert.equal(medium.correct, 6);
  assert.equal(medium.total, 8);
  assert.equal(medium.score, 900);
  assert.equal(medium.accuracy, 75);
  assert.equal(singStats(run(song, heard, "hard"), Infinity, "hard").score, 1200);
  // Easy sings only the first line.
  const easy = singStats(run(song, heard, "easy"), Infinity, "easy");
  assert.deepEqual([easy.total, easy.correct, easy.score], [4, 4, 400]);
});

test("the streak counts full lines in a row, once each line is over", () => {
  const song = lines("one two", "three four", "five six", "seven eight");
  const heard = [
    ...sing(100, "one two"),
    ...sing(4100, "three four"),
    ...sing(8100, "five"),
    ...sing(12100, "seven eight"),
  ];
  const sung = run(song, heard);
  // Mid-way through line 2 (index 1): only line 1 is over.
  assert.equal(singStats(sung, 6000, "medium").streak, 1);
  const end = singStats(sung, Infinity, "medium");
  assert.equal(end.bestStreak, 2);
  assert.equal(end.streak, 1);
});

test("a line is over once its grace second has passed", () => {
  const [r] = run(lines("one two", "three"), []);
  assert.equal(isLineOver(r, 4999), false);
  assert.equal(isLineOver(r, 5000), true);
});
