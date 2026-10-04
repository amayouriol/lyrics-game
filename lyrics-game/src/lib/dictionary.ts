import { promises as fs } from "fs";
import path from "path";
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
    languages.set(trackId, languageOf(lines, (await load()).listsOf));
  }
  return languages.get(trackId)!;
}
