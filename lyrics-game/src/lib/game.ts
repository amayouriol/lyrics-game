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

/**
 * The forgiving parts of matching: case, accents (ñ counts as n) and
 * apostrophes ("dont" for "don't"). Everything else, including other
 * symbols and digits, stays, so "know!" is not "know".
 */
export function normalize(text: string): string {
  return text
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’‘ʼ`´]/g, "");
}

export function isMatch(guess: string, answer: string): boolean {
  const g = normalize(guess);
  return g !== "" && g === normalize(answer);
}

/** Wrong tries allowed per word; the next wrong one after this is a miss. */
export const MAX_TRIES = 3;

/** A hidden word isn't hidden again until this many lines have passed. */
export const SPACING_LINES = 8;

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
    // Interjections that dictionaries list as words but carry no meaning to learn
    "whoa", "woah", "okay", "ahem", "oops", "hooray", "yippee", "shush", "guau",
  ].map(normalize)
);

/** Whether a word, as written in the lyrics, is a real word. */
export type IsWord = (word: string) => boolean;

// Spanish pronouns that attach to the end of verbs ("hacerte", "quédate").
const ENCLITICS = ["nos", "los", "las", "les", "me", "te", "se", "lo", "la", "le"];

/**
 * Builds the real-word check from a dictionary of normalized words. Beyond
 * exact entries, it accepts forms dictionaries leave out but lyrics are
 * full of: Spanish verbs with attached pronouns, and English words with a
 * dropped "g" ("fallin").
 */
export function makeIsWord(dictionary: Set<string>): IsWord {
  // A verb that takes an attached pronoun is an infinitive (-r), a gerund
  // (-ndo) or an imperative, which then gets a written accent ("mírala").
  // Requiring one of those keeps sounds like "lele" (le + le) out.
  const hasEnclitic = (word: string, accented: boolean, depth: number): boolean =>
    ENCLITICS.some((pronoun) => {
      if (!word.endsWith(pronoun)) return false;
      const base = word.slice(0, -pronoun.length);
      if (base.length < 3) return false;
      const verbLike = base.endsWith("r") || base.endsWith("ndo") || accented;
      if (verbLike && dictionary.has(base)) return true;
      return depth < 2 && hasEnclitic(base, accented, depth + 1);
    });

  return (word) => {
    const n = normalize(word);
    if (dictionary.has(n)) return true;
    if (hasEnclitic(n, /[áéíóú]/i.test(word), 1)) return true;
    return n.endsWith("in") && dictionary.has(`${n}g`);
  };
}

/**
 * Worth hiding: a real word (so not "doo-dooo", "eehh" or a name) of at
 * least 4 letters that isn't filler. The point is learning vocabulary, not
 * guessing sounds.
 */
function isEligible(core: string, isWord: IsWord): boolean {
  const n = normalize(core);
  return /^\p{L}{4,}$/u.test(n) && !FILLER.has(n) && isWord(core);
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
 * A word hidden on one line isn't hidden again within the next
 * SPACING_LINES lines (choruses would otherwise repeat the same blank);
 * the next-longest word on the line is hidden instead, or none.
 */
export function pickBlanks(lines: TimedLine[], level: Difficulty, isWord: IsWord): Blank[] {
  const blanks: Blank[] = [];
  /** Normalized word → the last line it was hidden on. */
  const lastHidden = new Map<string, number>();
  lines.forEach((line, li) => {
    const count = level === "hard" ? 2 : level === "medium" ? 1 : li % 2 === 0 ? 1 : 0;
    if (count === 0) return;
    const picked: { core: string; wi: number }[] = [];
    tokenize(line.text)
      .map((token, wi) => ({ core: token.core, wi }))
      .filter(({ core }) => core && isEligible(core, isWord))
      .sort((a, b) => normalize(b.core).length - normalize(a.core).length || a.wi - b.wi)
      .forEach((candidate) => {
        const n = normalize(candidate.core);
        const last = lastHidden.get(n);
        if (picked.length >= count || (last !== undefined && li - last <= SPACING_LINES)) return;
        picked.push(candidate);
        lastHidden.set(n, li);
      });
    picked
      .sort((a, b) => a.wi - b.wi)
      .forEach(({ core, wi }) => blanks.push({ id: `${li}-${wi}`, line: li, word: wi, answer: core }));
  });
  return blanks;
}

export interface Answer {
  value: string;
  /** "missed": out of tries, or out of time while the song waited. */
  status: "typing" | "correct" | "skipped" | "missed";
  wrongTries: number;
  /** Missed because the wait ran out, not because of tries. */
  timedOut?: boolean;
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
  // Missed with nothing typed (out of time) has no guess to cross out.
  if (answer?.status === "missed") return answer.value ? "wrong" : "revealed";
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
