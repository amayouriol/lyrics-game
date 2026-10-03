/** Pure game rules, shared by the song screen, the play screen and tests. */

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; points: number; description: string }
> = {
  easy: { label: "Easy", points: 100, description: "One word every other line. 100 points each." },
  medium: { label: "Medium", points: 150, description: "One word on every line. 150 points each." },
  hard: {
    label: "Hard",
    points: 200,
    description: "Two words on every line. 200 points each. Good luck.",
  },
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && value in DIFFICULTIES;
}

export function nextDifficulty(level: Difficulty): Difficulty | null {
  return DIFFICULTY_ORDER[DIFFICULTY_ORDER.indexOf(level) + 1] ?? null;
}

export interface TimedLine {
  timeMs: number;
  text: string;
}

/** Lower case, no accents (ñ counts as n), no punctuation. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function isMatch(guess: string, answer: string): boolean {
  const g = normalize(guess);
  return g !== "" && g === normalize(answer);
}

/** Wrong tries allowed per word; the next wrong one after this is a miss. */
export const MAX_TRIES = 3;

/**
 * A guess that's already wrong without pressing Enter: as long as the word
 * (or longer) and not a match. Counts as a try on its own.
 */
export function isFullLengthMiss(guess: string, answer: string): boolean {
  return normalize(guess).length >= normalize(answer).length && !isMatch(guess, answer);
}

/** Points for a word, halved for each wrong try before getting it. */
export function pointsFor(level: Difficulty, wrongTries: number): number {
  return Math.round(DIFFICULTIES[level].points / 2 ** wrongTries);
}

export interface Token {
  /** The word exactly as written, punctuation included. */
  raw: string;
  lead: string;
  /** The word itself (letters, digits, inner apostrophes/hyphens); "" if none. */
  core: string;
  trail: string;
}

const WORD = /^([^\p{L}\p{N}]*)([\p{L}\p{N}](?:[\p{L}\p{N}'’-]*[\p{L}\p{N}])?)(.*)$/u;

export function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(WORD);
      return m ? { raw, lead: m[1], core: m[2], trail: m[3] } : { raw, lead: raw, core: "", trail: "" };
    });
}

// Words never hidden: too common to be worth guessing. English from the
// design prototype, plus Spanish since many of the songs are in Spanish.
const FILLER = new Set(
  [
    // English
    "that", "with", "your", "what", "where", "than", "ever", "like", "still", "since", "some",
    "only", "until", "past", "over", "from", "here", "they", "this", "every", "dont", "its",
    "ill", "into", "when", "want", "told", "nothing", "anything", "somewhere", "underneath",
    "have", "been", "were", "will", "would", "could", "should", "there", "their", "them", "then",
    "just", "about", "because", "theyre", "youre", "yeah", "gonna", "wanna", "gotta", "these",
    "those", "which", "while", "aint", "cant", "wont", "didnt", "doesnt", "isnt", "thats",
    // Spanish
    "para", "pero", "como", "cuando", "donde", "porque", "pues", "esta", "este", "esto",
    "estas", "estos", "esos", "esas", "todo", "toda", "todos", "todas", "nada", "algo",
    "solo", "tambien", "entre", "hasta", "desde", "sobre", "mientras", "aunque", "estoy",
    "eres", "eras", "sera", "hace", "menos", "otro", "otra", "otros", "otras", "cada",
    "mismo", "misma", "ella", "ellos", "ellas", "nosotros", "usted", "ustedes", "tuyo",
    "tuya", "suyo", "suya", "nuestro", "nuestra", "quien", "cual", "aqui", "alla",
    "ahora", "entonces", "asi", "sino",
  ].map(normalize)
);

function isEligible(core: string): boolean {
  const n = normalize(core);
  return n.length >= 4 && !/\d/.test(n) && !FILLER.has(n);
}

export interface Blank {
  id: string;
  line: number;
  word: number;
  answer: string;
}

/**
 * The hidden words for a song at a level. Deterministic, so replaying a
 * song at the same level hides the same words and scores compare fairly.
 */
export function pickBlanks(lines: TimedLine[], level: Difficulty): Blank[] {
  const blanks: Blank[] = [];
  lines.forEach((line, li) => {
    const count = level === "hard" ? 2 : level === "medium" ? 1 : li % 2 === 0 ? 1 : 0;
    if (count === 0) return;
    tokenize(line.text)
      .map((token, wi) => ({ token, wi }))
      .filter(({ token }) => token.core && isEligible(token.core))
      .sort((a, b) => normalize(b.token.core).length - normalize(a.token.core).length || a.wi - b.wi)
      .slice(0, count)
      .sort((a, b) => a.wi - b.wi)
      .forEach(({ token, wi }) =>
        blanks.push({ id: `${li}-${wi}`, line: li, word: wi, answer: token.core })
      );
  });
  return blanks;
}

export interface Answer {
  value: string;
  /** "missed": out of tries. */
  status: "typing" | "correct" | "skipped" | "missed";
  wrongTries: number;
}

function isResolvedByYou(answer: Answer | undefined): boolean {
  return answer?.status === "correct" || answer?.status === "skipped" || answer?.status === "missed";
}

export type BlankState = "future" | "waiting" | "active" | "correct" | "wrong" | "revealed";

/** The first unresolved blank on the current line: the one being typed. */
export function activeBlankId(
  blanks: Blank[],
  answers: Record<string, Answer>,
  currentLine: number
): string | null {
  const open = blanks.find((b) => b.line === currentLine && !isResolvedByYou(answers[b.id]));
  return open?.id ?? null;
}

/** A blank's state, derived from its answer and where the song is. */
export function blankState(
  blank: Blank,
  answer: Answer | undefined,
  currentLine: number,
  activeId: string | null
): BlankState {
  if (answer?.status === "correct") return "correct";
  if (answer?.status === "skipped") return "revealed";
  if (answer?.status === "missed") return "wrong";
  if (blank.line < currentLine) return answer?.value ? "wrong" : "revealed";
  if (blank.line === currentLine) return blank.id === activeId ? "active" : "waiting";
  return "future";
}

export interface Stats {
  total: number;
  correct: number;
  score: number;
  streak: number;
  bestStreak: number;
  /** 0–100, rounded. */
  accuracy: number;
}

/**
 * Score and streaks so far. A blank counts once it's resolved: guessed,
 * skipped, out of tries, or its line has passed. Pass Infinity at the end
 * of the song. The streak only counts words right on the first try.
 */
export function computeStats(
  blanks: Blank[],
  answers: Record<string, Answer>,
  currentLine: number,
  level: Difficulty
): Stats {
  let correct = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const blank of blanks) {
    const answer = answers[blank.id];
    const state = blankState(blank, answer, currentLine, null);
    const wrongTries = answer?.wrongTries ?? 0;
    if (state === "correct") {
      correct++;
      score += pointsFor(level, wrongTries);
      streak = wrongTries === 0 ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
    } else if (state === "wrong" || state === "revealed" || wrongTries > 0) {
      // A wrong try breaks the streak even while the word is still open.
      streak = 0;
    }
  }
  return {
    total: blanks.length,
    correct,
    score,
    streak,
    bestStreak,
    accuracy: blanks.length ? Math.round((correct / blanks.length) * 100) : 0,
  };
}

export function verdict(accuracy: number): string {
  if (accuracy === 100) return "Flawless. Are you in the band?";
  if (accuracy >= 80) return "You actually listen. Respect.";
  if (accuracy >= 50) return "Decent. The chorus carried you.";
  if (accuracy > 0) return "Were you even listening?";
  return "Nothing. Humming doesn't count.";
}
