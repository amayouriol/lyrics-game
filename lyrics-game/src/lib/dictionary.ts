import { promises as fs } from "fs";
import path from "path";
import { isWebMode } from "./app-mode";
import { getDatabase } from "./database";
import { makeIsWord, normalize, type IsWord } from "./game";
import { IN_ENGLISH, IN_SPANISH, languageOf, type Language } from "./language";

// MIT-licensed word lists (github.com/words): ~275k English and ~636k
// Spanish words, Spanish including verb conjugations. Read from disk at
// runtime rather than bundled, since together they're about 11 MB.
const LISTS: [string, number][] = [
  ["an-array-of-english-words", IN_ENGLISH],
  ["an-array-of-spanish-words", IN_SPANISH],
];
/** Short words are kept too: "dar" is the base of "darte". */
const MIN_LENGTH = 2;

interface Dictionary {
  isWord: IsWord;
  /** Which lists a normalized word is in (IN_ENGLISH | IN_SPANISH), 0 if none. */
  listsOf: (word: string) => number;
}

let loading: Promise<Dictionary> | null = null;

/** Loads both word lists once per server. */
function load(): Promise<Dictionary> {
  loading ??= (async () => {
    const words = new Map<string, number>();
    for (const [list, flag] of LISTS) {
      const file = path.join(process.cwd(), "node_modules", list, "index.json");
      const entries = JSON.parse(await fs.readFile(file, "utf8")) as string[];
      for (const entry of entries) {
        const word = normalize(entry);
        if (word.length >= MIN_LENGTH) words.set(word, (words.get(word) ?? 0) | flag);
      }
    }
    return { isWord: makeIsWord(words), listsOf: (word: string) => words.get(word) ?? 0 };
  })().catch((error) => {
    loading = null; // let the next request try again
    throw error;
  });
  return loading;
}

/** Whether a word is a real English or Spanish word. */
export async function getDictionary(): Promise<IsWord> {
  return (await load()).isWord;
}

/** Lyrics never change once cached, so each song's language is worked out once. */
const languages = new Map<string, Language | null>();

/** A song's language from its lyrics (null if unclear). */
export async function getLanguage(
  trackId: string,
  lines: { text: string }[]
): Promise<Language | null> {
  if (!languages.has(trackId)) {
    const saved = await savedLanguage(trackId);
    languages.set(trackId, saved !== undefined ? saved : await work(trackId, lines));
  }
  return languages.get(trackId)!;
}

/**
 * In the web version the answer is kept in the database, so a server that
 * has just woken up doesn't load 11 MB of word lists to work it out again.
 * Undefined when it isn't saved (or the database didn't answer).
 */
async function savedLanguage(trackId: string): Promise<Language | null | undefined> {
  if (!isWebMode()) return undefined;
  try {
    const raw = await getDatabase().get(`language:${trackId}`);
    return raw === null ? undefined : (JSON.parse(raw) as Language | null);
  } catch (error) {
    console.warn("[dictionary] could not read a saved language:", error);
    return undefined;
  }
}

async function work(trackId: string, lines: { text: string }[]): Promise<Language | null> {
  const language = languageOf(lines, (await load()).listsOf);
  if (isWebMode()) {
    await getDatabase()
      .set(`language:${trackId}`, JSON.stringify(language))
      .catch((error) => console.warn("[dictionary] could not save a language:", error));
  }
  return language;
}
