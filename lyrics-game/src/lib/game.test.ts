/** Rule checks for the game: run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeBlankId,
  blankState,
  computeStats,
  isFullLengthMiss,
  isMatch,
  makeIsWord,
  nextDifficulty,
  pickBlanks,
  pointsFor,
  SPACING_LINES,
  tokenize,
  verdict,
  type Answer,
  type Blank,
  type TimedLine,
} from "./game.ts";

// A small dictionary standing in for the English and Spanish word lists.
const isWord = makeIsWord(
  new Set([
    "love", "tonight", "dance", "heart", "baby", "corazon", "bailar", "hacer", "mira",
    "falling", "music", "morning", "dreams", "forever", "with", "that", "para",
  ])
);

const lines = (...texts: string[]): TimedLine[] => texts.map((text, i) => ({ timeMs: i * 1000, text }));

const answer = (status: Answer["status"], wrongTries = 0, value = "x"): Answer => ({ value, status, wrongTries });

// --- Matching a guess ---

test("a guess matches regardless of case, accents and apostrophes", () => {
  assert.ok(isMatch("CORAZON", "corazón"));
  assert.ok(isMatch("nino", "niño"));
  assert.ok(isMatch("dont", "don't"));
  assert.ok(isMatch("  love ", "love"));
});

test("other symbols, digits and empty guesses don't match", () => {
  assert.ok(!isMatch("know!", "know"));
  assert.ok(!isMatch("lov", "love"));
  assert.ok(!isMatch("", ""));
  assert.ok(!isMatch("   ", "love"));
});

test("a guess as long as the word that doesn't match is a miss before Enter", () => {
  assert.ok(isFullLengthMiss("lave", "love"));
  assert.ok(isFullLengthMiss("lovers", "love"));
  assert.ok(!isFullLengthMiss("lov", "love"));
  assert.ok(!isFullLengthMiss("LOVE", "love"));
  assert.ok(!isFullLengthMiss("corazon", "corazón"));
});

// --- Points and levels ---

test("points halve with each wrong try", () => {
  assert.equal(pointsFor("easy", 0), 100);
  assert.equal(pointsFor("medium", 0), 150);
  assert.equal(pointsFor("hard", 0), 200);
  assert.equal(pointsFor("medium", 1), 75);
  assert.equal(pointsFor("medium", 2), 38);
  assert.equal(pointsFor("hard", 3), 25);
});

test("levels go easy → medium → hard → none", () => {
  assert.equal(nextDifficulty("easy"), "medium");
  assert.equal(nextDifficulty("medium"), "hard");
  assert.equal(nextDifficulty("hard"), null);
});

// --- Splitting lines into words ---

test("punctuation stays outside the word", () => {
  const [a, b] = tokenize('"Baby," (don\'t');
  assert.deepEqual(a, { raw: '"Baby,"', lead: '"', core: "Baby", trail: ',"' });
  assert.deepEqual(b, { raw: "(don't", lead: "(", core: "don't", trail: "" });
  assert.equal(tokenize("...")[0].core, "");
});

// --- Real words ---

test("real-word check: dictionary words, attached Spanish pronouns, dropped g", () => {
  assert.ok(isWord("Corazón"));
  assert.ok(isWord("hacerte")); // hacer + te
  assert.ok(isWord("bailarnos")); // bailar + nos
  assert.ok(isWord("mírala")); // imperative with an accent
  assert.ok(isWord("fallin")); // falling
  assert.ok(!isWord("mirala")); // no accent: not an imperative
  assert.ok(!isWord("lele"));
  assert.ok(!isWord("doo-dooo"));
});

// --- Hiding words ---

test("easy hides a word every other line, medium every line, hard two per line", () => {
  const song = lines("love music", "dreams heart", "baby forever", "morning dance");
  assert.deepEqual(
    pickBlanks(song, "easy", isWord).map((b) => b.line),
    [0, 2]
  );
  assert.deepEqual(
    pickBlanks(song, "medium", isWord).map((b) => b.line),
    [0, 1, 2, 3]
  );
  assert.equal(pickBlanks(song, "hard", isWord).length, 8);
});

test("the longest real word on a line is hidden, with punctuation left out", () => {
  const [blank] = pickBlanks(lines("Oh baby, tonight!"), "medium", isWord);
  assert.deepEqual(blank, { id: "0-2", line: 0, word: 2, answer: "tonight" });
});

test("filler, short words and made-up sounds are never hidden", () => {
  assert.deepEqual(pickBlanks(lines("with that para yeah", "la la doo-dooo eehh", "love"), "hard", isWord).map((b) => b.answer), [
    "love",
  ]);
});

test("the same word isn't hidden again within 8 lines", () => {
  const chorus = Array.from({ length: SPACING_LINES + 2 }, () => "tonight love");
  const blanks = pickBlanks(lines(...chorus), "medium", isWord);
  const tonight = blanks.filter((b) => b.answer === "tonight").map((b) => b.line);
  assert.deepEqual(tonight, [0, SPACING_LINES + 1]);
  // Line 1 falls back to the next-longest word instead.
  assert.equal(blanks.find((b) => b.line === 1)?.answer, "love");
});

test("accent and capital variants count as one word for spacing", () => {
  const blanks = pickBlanks(lines("Corazón", "corazon"), "medium", isWord);
  assert.equal(blanks.length, 1);
});

test("the same song at the same level always hides the same words", () => {
  const song = lines("love music tonight", "dreams heart forever", "baby morning dance");
  assert.deepEqual(pickBlanks(song, "hard", isWord), pickBlanks(song, "hard", isWord));
});

test("hard hides two different words, in the order they're sung", () => {
  const blanks = pickBlanks(lines("tonight tonight love"), "hard", isWord);
  assert.deepEqual(
    blanks.map((b) => b.answer),
    ["tonight", "love"]
  );
});

// --- Blank states while playing ---

const b = (line: number, word: number, answerText = "love"): Blank => ({
  id: `${line}-${word}`,
  line,
  word,
  answer: answerText,
});

test("the active blank is the first unresolved one on the current line", () => {
  const blanks = [b(0, 0), b(1, 0), b(1, 2)];
  assert.equal(activeBlankId(blanks, {}, 1), "1-0");
  assert.equal(activeBlankId(blanks, { "1-0": answer("correct") }, 1), "1-2");
  assert.equal(activeBlankId(blanks, { "1-0": answer("correct"), "1-2": answer("skipped") }, 1), null);
});

test("blank states follow the answer and the song's position", () => {
  const blank = b(2, 0);
  assert.equal(blankState(blank, undefined, 1, null), "future");
  assert.equal(blankState(blank, undefined, 2, "2-0"), "active");
  assert.equal(blankState(blank, undefined, 2, "2-5"), "waiting");
  assert.equal(blankState(blank, answer("correct"), 5, null), "correct");
  assert.equal(blankState(blank, answer("skipped"), 2, null), "revealed");
  assert.equal(blankState(blank, answer("missed", 3, "lave"), 2, null), "wrong");
  assert.equal(blankState(blank, answer("missed", 0, ""), 2, null), "revealed"); // out of time
  assert.equal(blankState(blank, answer("typing", 0, "lo"), 3, null), "wrong"); // line passed
  assert.equal(blankState(blank, undefined, 3, null), "revealed");
});

// --- Score, streaks, accuracy ---

test("score, streak and accuracy at the end of a song", () => {
  const blanks = [b(0, 0), b(1, 0), b(2, 0), b(3, 0), b(4, 0)];
  const answers = {
    "0-0": answer("correct"), // 150, streak 1
    "1-0": answer("correct"), // 150, streak 2
    "2-0": answer("correct", 1), // 75, streak broken
    "3-0": answer("correct"), // 150, streak 1
    // 4-0 never answered: revealed
  };
  assert.deepEqual(computeStats(blanks, answers, Infinity, "medium"), {
    total: 5,
    correct: 4,
    score: 525,
    streak: 0,
    bestStreak: 2,
    accuracy: 80,
  });
});

test("a wrong try breaks the streak even while the word is still open", () => {
  const blanks = [b(0, 0), b(1, 0)];
  const stats = computeStats(blanks, { "0-0": answer("correct"), "1-0": answer("typing", 1) }, 1, "easy");
  assert.equal(stats.streak, 0);
  assert.equal(stats.bestStreak, 1);
  assert.equal(stats.score, 100);
});

test("no blanks means 0% accuracy, not a crash", () => {
  assert.equal(computeStats([], {}, Infinity, "easy").accuracy, 0);
});

test("the verdict follows accuracy", () => {
  assert.equal(verdict(100), "Flawless. Are you in the band?");
  assert.equal(verdict(80), "You actually listen. Respect.");
  assert.equal(verdict(50), "Decent. The chorus carried you.");
  assert.equal(verdict(1), "Were you even listening?");
  assert.equal(verdict(0), "Nothing. Humming doesn't count.");
});
