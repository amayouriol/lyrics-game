/** Sing mode's rules: which lines you sing, what counts as heard, the score. Pure, like game.ts. */

import {
  DIFFICULTIES,
  normalize,
  tokenize,
  type Difficulty,
  type IsWord,
  type TimedLine,
} from "./game.ts";

/** What each level means in Sing mode, for the song screen. */
export const SING_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "One line in three is hidden. Sing it; the song waits up to 10 seconds for you to finish. 100 points a word.",
  medium:
    "Every other line is hidden. Sing it; the song waits up to 10 seconds for you to finish. 150 points a word.",
  hard: "Every line is hidden, and the song doesn't wait. 200 points a word.",
};

/** Easy and Medium: how long the song waits at the end of a sung line for its missing words. */
export const SING_WAIT_MS = 10_000;

/** Whether the song waits for you at the end of a sung line. */
export function singWaits(level: Difficulty): boolean {
  return level !== "hard";
}

/** A word heard this long before its line starts, or after it ends, still counts for it. */
export const SING_GRACE_MS = 1000;

/** Two words heard further apart than this aren't joined into one ("amando" + "te"). */
const JOIN_WITHIN_MS = 1500;

/** The words of a line as written, without punctuation. */
export function lineWords(text: string): string[] {
  return tokenize(text)
    .map((t) => t.core)
    .filter(Boolean);
}

// Sounds, not words: never sung for points, even when a dictionary lists them.
const SOUNDS = new Set(
  [
    "oh",
    "ohh",
    "ooh",
    "oooh",
    "uh",
    "uhh",
    "uuh",
    "um",
    "uhm",
    "ah",
    "ahh",
    "aah",
    "ay",
    "ayy",
    "ey",
    "eh",
    "hey",
    "yeah",
    "yeh",
    "yea",
    "ya",
    "yah",
    "yo",
    "la",
    "na",
    "nah",
    "da",
    "mm",
    "mmm",
    "hmm",
    "huh",
    "woah",
    "whoa",
    "wo",
    "uy",
    "ja",
    "je",
    "oye",
    "ole",
    "wuh",
    "brr",
  ].map(normalize)
);

/**
 * Which words of a line you sing for points: real words (in the English or
 * Spanish word lists) that aren't sounds like "oh" or "yeah". Most names
 * ("Shakira", "J Balvin") aren't in the lists, so they're left out too. Left
 * out words stay visible and don't count.
 */
export function singableWords(text: string, isWord: IsWord): boolean[] {
  return lineWords(text).map((word) => isWord(word) && !SOUNDS.has(normalize(word)));
}

/** Every word counts, when the server hasn't said which to leave out. */
function allWords(lines: TimedLine[]): boolean[][] {
  return lines.map((line) => lineWords(line.text).map(() => true));
}

/**
 * The lines you sing at a level, by index: lines with at least one word to
 * sing (so not instrumental gaps, "♪" or "Ooh, yeah"). Easy hides one in
 * three, Medium every other one, Hard every one.
 */
export function singLines(
  lines: TimedLine[],
  level: Difficulty,
  singable: boolean[][] = allWords(lines)
): number[] {
  const withWords = lines.flatMap((_, i) => (singable[i]?.some(Boolean) ? [i] : []));
  const every = level === "easy" ? 3 : level === "medium" ? 2 : 1;
  return withWords.filter((_, k) => k % every === 0);
}

/** A word the browser heard, and when (ms into the song). */
export interface HeardWord {
  text: string;
  atMs: number;
}

/** How a sung line went so far. */
export interface SungLine {
  line: number;
  startMs: number;
  endMs: number;
  /** The words as written in the lyrics. */
  words: string[];
  /** For each word, whether it's sung for points (not "oh", not a name). */
  sing: boolean[];
  /** For each word, when it was heard (ms into the song), or null. */
  heardAt: (number | null)[];
}

/** Words sung for points on a line, and how many of them were heard. */
export function lineCounts(line: SungLine): { heard: number; total: number } {
  let heard = 0;
  let total = 0;
  line.sing.forEach((sing, i) => {
    if (!sing) return;
    total++;
    if (line.heardAt[i] !== null) heard++;
  });
  return { heard, total };
}

/** A heard word as the browser wrote it, compared the forgiving way typing is. */
function clean(text: string): string {
  return normalize(text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
}

/**
 * Clearly the same word, heard a little off: one letter more or less at the
 * end ("parque" for "parqués"). Nothing looser, so mumbling can't score.
 */
function isNearMiss(heard: string, lyric: string): boolean {
  const [short, long] = heard.length < lyric.length ? [heard, lyric] : [lyric, heard];
  return short.length >= 3 && long.length === short.length + 1 && long.startsWith(short);
}

/**
 * Matches what was heard to the sung lines. A word counts for the line it was
 * heard in, or for a line starting or ending within SING_GRACE_MS of it, if
 * that line still needs it: each lyric word once, in any order. Two words
 * heard in a row can make one lyric word ("amando te" for "amándote").
 */
export function matchSung(
  lines: TimedLine[],
  sung: number[],
  heard: HeardWord[],
  songEndMs: number,
  singable: boolean[][] = allWords(lines)
): SungLine[] {
  const result: SungLine[] = sung.map((i) => {
    const words = lineWords(lines[i].text);
    return {
      line: i,
      startMs: lines[i].timeMs,
      endMs: lines[i + 1]?.timeMs ?? songEndMs,
      words,
      sing: words.map((_, j) => singable[i]?.[j] ?? true),
      heardAt: words.map(() => null),
    };
  });
  const lyric = result.map((r) => r.words.map(normalize));
  const words = [...heard]
    .sort((a, b) => a.atMs - b.atMs)
    .map((h) => ({ word: clean(h.text), atMs: h.atMs }))
    .filter((h) => h.word);

  /** The lines a word heard then could belong to: its own line first, then the nearest. */
  const candidates = (atMs: number) =>
    result
      .map((r, k) => ({ k, r }))
      .filter(({ r }) => atMs >= r.startMs - SING_GRACE_MS && atMs < r.endMs + SING_GRACE_MS)
      .sort((a, b) => distance(a.r, atMs) - distance(b.r, atMs))
      .map(({ k }) => k);

  const take = (k: number, matches: (w: string) => boolean, atMs: number): boolean => {
    const r = result[k];
    const i = lyric[k].findIndex((w, j) => r.sing[j] && r.heardAt[j] === null && matches(w));
    if (i < 0) return false;
    r.heardAt[i] = atMs;
    return true;
  };

  for (let h = 0; h < words.length; h++) {
    const { word, atMs } = words[h];
    const next = words[h + 1];
    const joined = next && next.atMs - atMs <= JOIN_WITHIN_MS ? word + next.word : null;
    for (const k of candidates(atMs)) {
      if (take(k, (w) => w === word, atMs)) break;
      if (joined && take(k, (w) => w === joined, atMs)) {
        h++;
        break;
      }
      if (take(k, (w) => isNearMiss(word, w), atMs)) break;
    }
  }
  return result;
}

function distance(line: SungLine, atMs: number): number {
  if (atMs < line.startMs) return line.startMs - atMs;
  if (atMs >= line.endMs) return atMs - line.endMs + 1;
  return 0;
}

/** A sung line is over once its grace time has passed. */
export function isLineOver(line: SungLine, positionMs: number): boolean {
  return positionMs >= line.endMs + SING_GRACE_MS;
}

export interface SingStats {
  total: number;
  correct: number;
  score: number;
  /** Full lines (every word heard) in a row, counting only lines that are over. */
  streak: number;
  bestStreak: number;
  /** 0–100, rounded. */
  accuracy: number;
}

/**
 * Score so far: points for every word heard, at the level's value. Pass
 * Infinity at the end of the song. A line breaks the streak once it's over
 * with a word missing.
 */
export function singStats(sung: SungLine[], positionMs: number, level: Difficulty): SingStats {
  let total = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const line of sung) {
    const counts = lineCounts(line);
    total += counts.total;
    correct += counts.heard;
    if (!isLineOver(line, positionMs)) continue;
    streak = counts.heard === counts.total ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    total,
    correct,
    score: correct * DIFFICULTIES[level].points,
    streak,
    bestStreak,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
  };
}
