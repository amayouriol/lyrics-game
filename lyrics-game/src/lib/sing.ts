/** Sing mode's rules: which lines you sing, what counts as heard, the score. Pure, like game.ts. */

import { DIFFICULTIES, normalize, tokenize, type Difficulty, type TimedLine } from "./game.ts";

/** What each level means in Sing mode, for the song screen. */
export const SING_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Every other line is hidden. Sing it. 100 points a word.",
  medium: "Every line is hidden. Sing it. 150 points a word.",
  hard: "Every line is hidden, and you won't see how many words it has. 200 points a word.",
};

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

/**
 * The lines you sing at a level, by index. Lines without words (instrumental
 * gaps, "♪") are never hidden. Easy hides every other line with words.
 */
export function singLines(lines: TimedLine[], level: Difficulty): number[] {
  const withWords = lines.flatMap((line, i) => (lineWords(line.text).length ? [i] : []));
  return level === "easy" ? withWords.filter((_, k) => k % 2 === 0) : withWords;
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
  /** For each word, when it was heard (ms into the song), or null. */
  heardAt: (number | null)[];
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
  songEndMs: number
): SungLine[] {
  const result: SungLine[] = sung.map((i) => {
    const words = lineWords(lines[i].text);
    return {
      line: i,
      startMs: lines[i].timeMs,
      endMs: lines[i + 1]?.timeMs ?? songEndMs,
      words,
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
    const i = lyric[k].findIndex((w, j) => result[k].heardAt[j] === null && matches(w));
    if (i < 0) return false;
    result[k].heardAt[i] = atMs;
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
    const heard = line.heardAt.filter((t) => t !== null).length;
    total += line.words.length;
    correct += heard;
    if (!isLineOver(line, positionMs)) continue;
    streak = heard === line.words.length ? streak + 1 : 0;
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
