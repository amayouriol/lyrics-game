import { promises as fs } from "fs";
import path from "path";
import { makeIsWord, normalize, type IsWord } from "./game";

// MIT-licensed word lists (github.com/words): ~275k English and ~636k
// Spanish words, Spanish including verb conjugations. Read from disk at
// runtime rather than bundled, since together they're about 11 MB.
const LISTS = ["an-array-of-english-words", "an-array-of-spanish-words"];
/** Short words are kept too: "dar" is the base of "darte". */
const MIN_LENGTH = 2;

let loading: Promise<IsWord> | null = null;

/** Loads both dictionaries once per server. */
export function getDictionary(): Promise<IsWord> {
  loading ??= (async () => {
    const words = new Set<string>();
    for (const list of LISTS) {
      const file = path.join(process.cwd(), "node_modules", list, "index.json");
      const entries = JSON.parse(await fs.readFile(file, "utf8")) as string[];
      for (const entry of entries) {
        const word = normalize(entry);
        if (word.length >= MIN_LENGTH) words.add(word);
      }
    }
    return makeIsWord(words);
  })().catch((error) => {
    loading = null; // let the next request try again
    throw error;
  });
  return loading;
}
